import axios from "axios";
import { env } from "../config/constants.js";
import { buildPotdEmbed } from "../utils/embedUtils.js";
import { formatDateTime, getRoleMention } from "../utils/validation.js";
import { logger } from "../utils/logger.js";
import {
  createPotd,
  formatPotdDate,
  getPotdByDate,
  listPotd,
} from "../models/POTD.js";
import { listGuildConfigs, updateGuildConfig } from "../models/GuildConfig.js";

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

export async function ensureTodayPotd() {
  const today = formatPotdDate(new Date());
  const existing = getPotdByDate(today);
  if (existing) return existing;

  const fetched = await fetchLeetCodePotd();
  if (!fetched) return null;

  return createPotd({
    platform: fetched.platform,
    problemName: fetched.problemName,
    difficulty: fetched.difficulty,
    problemLink: fetched.problemLink,
    date: fetched.date || today,
  });
}

export async function sendDailyPotd(client, slot = "") {
  const configs = listGuildConfigs();
  const todayDate = formatPotdDate(new Date());
  const todayKey = slot ? `${todayDate}-${slot}` : todayDate;

  for (const config of configs) {
    if (!config?.potdChannelId) continue;
    if (config.lastPotdSentAt === todayKey) continue;

    const channel = await client.channels
      .fetch(config.potdChannelId)
      .catch(() => null);
    if (!channel || !channel.isTextBased()) continue;

    const potd = await ensureTodayPotd();
    if (!potd) {
      logger.warn("No POTD available to send.");
      continue;
    }

    const embed = buildPotdEmbed({
      platform: potd.platform,
      problemName: potd.problemName,
      difficulty: potd.difficulty,
      link: potd.problemLink,
    });

    const mention = getRoleMention(config.potdRoleId, config.guildId);
    await channel.send({ content: mention || undefined, embeds: [embed] });

    updateGuildConfig(config.guildId, { lastPotdSentAt: todayKey });
  }
}

export function listRecentPotd(limit = 10) {
  return listPotd({ limit });
}

export function formatPotdTime(date) {
  return formatDateTime(date, env.timezone);
}
