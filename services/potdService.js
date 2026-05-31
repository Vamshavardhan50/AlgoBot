import axios from "axios";
import { env } from "../config/constants.js";
import { buildPotdEmbed } from "../utils/embedUtils.js";
import { formatDateTime, getRoleMention, sendWithTempMention } from "../utils/validation.js";
import { logger } from "../utils/logger.js";
import { generateFlirtyReminder } from "./groqService.js";
import {
  createPotd,
  formatPotdDate,
  getPotdByDate,
  getPotdByDateAndPlatform,
  listPotdByDate,
  listPotd,
} from "../models/POTD.js";
import { listGuildConfigs, updateGuildConfig } from "../models/GuildConfig.js";

// Deterministic hash selection for daily Codeforces problem
function getDeterministicIndex(seedString, arrayLength) {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % arrayLength;
}

export async function fetchLeetCodePotd() {
  try {
    const query = `
      query questionOfToday {
        activeDailyCodingChallengeQuestion {
          date
          link
          question {
            title
            difficulty
          }
        }
      }
    `;
    const res = await axios.post(
      "https://leetcode.com/graphql",
      { query },
      { timeout: 10000 },
    );
    const data = res.data?.data?.activeDailyCodingChallengeQuestion;
    if (!data) return null;
    return {
      platform: "LeetCode",
      problemName: data.question?.title || "Unknown",
      difficulty: data.question?.difficulty || "Unknown",
      problemLink: `https://leetcode.com${data.link}`,
      date: data.date,
    };
  } catch (error) {
    logger.warn("LeetCode POTD fetch failed", error?.message || error);
    return null;
  }
}

export async function fetchGfgPotd() {
  try {
    const url = "https://practiceapi.geeksforgeeks.org/api/v1/problems-of-day/problem/today/";
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      timeout: 10000,
    });
    const data = res.data;
    if (!data || !data.problem_name) return null;
    const apiDate = data.date ? data.date.slice(0, 10) : formatPotdDate(new Date());
    return {
      platform: "GeeksforGeeks",
      problemName: data.problem_name,
      difficulty: data.difficulty || "Unknown",
      problemLink: data.problem_url,
      date: apiDate,
    };
  } catch (error) {
    logger.warn("GeeksforGeeks POTD fetch failed", error?.message || error);
    return null;
  }
}

export async function fetchCodeforcesPotd() {
  try {
    const url = "https://codeforces.com/api/problemset.problems";
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status !== "OK") {
      logger.warn(`Codeforces POTD API returned status: ${res.data?.status}`);
      return null;
    }
    const problems = res.data?.result?.problems || [];
    if (!problems.length) return null;
    
    // Filter problems
    const filtered = problems.filter(
      (p) =>
        p.type === "PROGRAMMING" &&
        p.rating >= 1000 &&
        p.rating <= 1800 &&
        p.contestId &&
        p.index,
    );
    if (!filtered.length) return null;
    
    // Sort to ensure stable order
    filtered.sort((a, b) => {
      if (a.contestId !== b.contestId) {
        return a.contestId - b.contestId;
      }
      return a.index.localeCompare(b.index);
    });
    
    const today = formatPotdDate(new Date());
    const index = getDeterministicIndex(today, filtered.length);
    const selected = filtered[index];
    
    return {
      platform: "Codeforces",
      problemName: selected.name,
      difficulty: selected.rating ? String(selected.rating) : "Unknown",
      problemLink: `https://codeforces.com/problemset/problem/${selected.contestId}/${selected.index}`,
      date: today,
    };
  } catch (error) {
    logger.warn("Codeforces POTD fetch failed", error?.message || error);
    return null;
  }
}

export async function ensureTodayPotd() {
  const today = formatPotdDate(new Date());
  const platforms = ["LeetCode", "GeeksforGeeks", "Codeforces"];
  const results = [];

  for (const platform of platforms) {
    let existing = getPotdByDateAndPlatform(today, platform);
    if (!existing) {
      let fetched = null;
      if (platform === "LeetCode") {
        fetched = await fetchLeetCodePotd();
      } else if (platform === "GeeksforGeeks") {
        fetched = await fetchGfgPotd();
      } else if (platform === "Codeforces") {
        fetched = await fetchCodeforcesPotd();
      }
      
      if (fetched) {
        existing = createPotd({
          platform: fetched.platform,
          problemName: fetched.problemName,
          difficulty: fetched.difficulty,
          problemLink: fetched.problemLink,
          date: fetched.date || today,
        });
      }
    }
    if (existing) {
      results.push(existing);
    }
  }

  return results;
}

export async function sendDailyPotd(client, slot = "") {
  const configs = listGuildConfigs();
  const todayDate = formatPotdDate(new Date());
  const todayKey = slot ? `${todayDate}-${slot}` : todayDate;

  const flirtyText = await generateFlirtyReminder("potd");

  for (const config of configs) {
    if (!config?.potdChannelId) continue;
    if (config.lastPotdSentAt === todayKey) continue;

    const channel = await client.channels
      .fetch(config.potdChannelId)
      .catch(() => null);
    if (!channel || !channel.isTextBased()) continue;

    const potds = await ensureTodayPotd();
    if (!potds || !potds.length) {
      logger.warn("No POTD available to send.");
      continue;
    }

    const embeds = potds.map((potd) =>
      buildPotdEmbed({
        platform: potd.platform,
        problemName: potd.problemName,
        difficulty: potd.difficulty,
        link: potd.problemLink,
      }),
    );

    const mention = getRoleMention(config.potdRoleId, config.guildId);
    const content = mention ? `${flirtyText}\n${mention}` : flirtyText;
    
    await sendWithTempMention(channel, content, embeds, config.potdRoleId);

    updateGuildConfig(config.guildId, { lastPotdSentAt: todayKey });
  }
}

export function listRecentPotd(limit = 10) {
  return listPotd({ limit });
}

export function formatPotdTime(date) {
  return formatDateTime(date, env.timezone);
}

export async function sendPotdReminder(client) {
  const configs = listGuildConfigs();
  const potds = await ensureTodayPotd();
  if (!potds || !potds.length) return;

  const embeds = potds.map((potd) =>
    buildPotdEmbed({
      platform: potd.platform,
      problemName: potd.problemName,
      difficulty: potd.difficulty,
      link: potd.problemLink,
    }),
  );

  const flirtyText = await generateFlirtyReminder("potd");

  for (const config of configs) {
    if (!config?.potdChannelId) continue;

    const channel = await client.channels
      .fetch(config.potdChannelId)
      .catch(() => null);
    if (!channel || !channel.isTextBased()) continue;

    const mention = getRoleMention(config.potdRoleId, config.guildId);
    const content = mention ? `${flirtyText}\n${mention}` : flirtyText;
    
    await sendWithTempMention(channel, content, embeds, config.potdRoleId);
  }
}
