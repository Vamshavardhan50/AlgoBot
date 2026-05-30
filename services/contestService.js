import axios from "axios";
import { listGuildConfigs, updateGuildConfig } from "../models/GuildConfig.js";
import {
  listUpcoming,
  listStartingWithin,
  markReminderSent,
  upsertContests,
} from "../models/Contest.js";
import { env } from "../config/constants.js";
import { buildContestEmbed } from "../utils/embedUtils.js";
import { formatDateTime, getRoleMention } from "../utils/validation.js";
import { logger } from "../utils/logger.js";

function getLocalDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: env.timezone });
}

function withinNextDay(contestTime) {
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const start = new Date(contestTime);
  return start >= now && start <= until;
}

export async function fetchCodeforcesContests() {
  try {
    const res = await axios.get(
      "https://codeforces.com/api/contest.list?gym=false",
      { timeout: 10000 },
    );
    const contests = res.data?.result || [];
    return contests
      .filter((contest) => contest.phase === "BEFORE")
      .slice(0, 10)
      .map((contest) => ({
        platform: "Codeforces",
        contestName: contest.name,
        contestLink: `https://codeforces.com/contest/${contest.id}`,
        contestTime: new Date(contest.startTimeSeconds * 1000).toISOString(),
        duration: Math.round(contest.durationSeconds / 60),
      }));
  } catch (error) {
    logger.warn("Codeforces fetch failed", error?.message || error);
    return [];
  }
}

export async function fetchLeetCodeContests() {
  try {
    const query = `
      query upcomingContests {
        upcomingContests {
          title
          titleSlug
          startTime
          duration
        }
      }
    `;
    const res = await axios.post(
      "https://leetcode.com/graphql",
      { query },
      { timeout: 10000 },
    );
    const contests = res.data?.data?.upcomingContests || [];
    return contests.slice(0, 10).map((contest) => ({
      platform: "LeetCode",
      contestName: contest.title,
      contestLink: `https://leetcode.com/contest/${contest.titleSlug}`,
      contestTime: new Date(contest.startTime * 1000).toISOString(),
      duration: Math.round(contest.duration / 60),
    }));
  } catch (error) {
    logger.warn("LeetCode fetch failed", error?.message || error);
    return [];
  }
}

export async function fetchCodeChefContests() {
  try {
    const res = await axios.get(
      "https://www.codechef.com/api/list/contests/all",
      { timeout: 10000 },
    );
    const contests = res.data?.future_contests || [];
    return contests.slice(0, 10).map((contest) => ({
      platform: "CodeChef",
      contestName: contest.contest_name,
      contestLink: `https://www.codechef.com/${contest.contest_code}`,
      contestTime: new Date(contest.contest_start_date_iso).toISOString(),
      duration: Math.round(Number(contest.contest_duration) || 0),
    }));
  } catch (error) {
    logger.warn("CodeChef fetch failed", error?.message || error);
    return [];
  }
}

export async function fetchAtCoderContests() {
  try {
    const res = await axios.get("https://atcoder.jp/contests/", {
      timeout: 10000,
    });
    const html = res.data || "";
    const sectionMatch = html.match(
      /<h3>Upcoming Contests<\/h3>([\s\S]*?)<\/table>/i,
    );
    if (!sectionMatch) return [];

    const rows = sectionMatch[1].match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
    const contests = [];

    for (const row of rows) {
      const linkMatch = row.match(/href="(\/contests\/[^"]+)"/i);
      const nameMatch = row.match(/<a[^>]*>([^<]+)<\/a>/i);
      const timeMatch = row.match(/<time[^>]*>([^<]+)<\/time>/i);
      const durationMatch = row.match(/<td class="text-center">([^<]+)<\/td>/i);
      if (!linkMatch || !nameMatch || !timeMatch) continue;

      let duration = 0;
      if (durationMatch) {
        const val = durationMatch[1].trim();
        if (val.includes(":")) {
          const [hours, minutes] = val.split(":").map(Number);
          if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
            duration = hours * 60 + minutes;
          }
        } else {
          const num = Number(val);
          if (!Number.isNaN(num)) {
            duration = Math.round(num);
          }
        }
      }

      let contestTime = "";
      try {
        contestTime = new Date(timeMatch[1].trim().replace(" ", "T")).toISOString();
      } catch {
        continue;
      }

      contests.push({
        platform: "AtCoder",
        contestName: nameMatch[1].trim(),
        contestLink: `https://atcoder.jp${linkMatch[1]}`,
        contestTime,
        duration,
      });
    }

    return contests.slice(0, 10);
  } catch (error) {
    logger.warn("AtCoder fetch failed", error?.message || error);
    return [];
  }
}

export async function fetchAllContests() {
  const [cf, lc, cc, at] = await Promise.all([
    fetchCodeforcesContests(),
    fetchLeetCodeContests(),
    fetchCodeChefContests(),
    fetchAtCoderContests(),
  ]);
  return [...cf, ...lc, ...cc, ...at];
}

export async function storeFetchedContests(createdBy = "system") {
  const contests = await fetchAllContests();
  const inserted = upsertContests(contests, createdBy);
  return { inserted, total: contests.length };
}

export async function sendDailyContestAlerts(client) {
  const configs = listGuildConfigs();
  const todayKey = getLocalDateKey();
  const contests = listUpcoming({ limit: 20 }).filter((contest) =>
    withinNextDay(contest.contestTime),
  );

  for (const config of configs) {
    if (!config?.contestChannelId) continue;
    if (config.lastContestAlertAt === todayKey) continue;

    const channel = await client.channels
      .fetch(config.contestChannelId)
      .catch(() => null);
    if (!channel || !channel.isTextBased()) continue;

    const mention = getRoleMention(config.contestRoleId, config.guildId);

    for (const contest of contests) {
      const embed = buildContestEmbed({
        platform: contest.platform,
        contestName: contest.contestName,
        contestTime: formatDateTime(contest.contestTime, env.timezone),
        duration: contest.duration,
        link: contest.contestLink,
      });
      await channel.send({ content: mention || undefined, embeds: [embed] });
    }

    updateGuildConfig(config.guildId, { lastContestAlertAt: todayKey });
  }
}

export async function sendContestReminders(client) {
  const configs = listGuildConfigs();
  const contests = listStartingWithin(env.reminderWindowMinutes || 30);

  if (!contests.length) return;

  for (const contest of contests) {
    for (const config of configs) {
      if (!config?.contestChannelId) continue;
      const channel = await client.channels
        .fetch(config.contestChannelId)
        .catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      const mention = getRoleMention(config.contestRoleId, config.guildId);
      const embed = buildContestEmbed({
        platform: contest.platform,
        contestName: contest.contestName,
        contestTime: formatDateTime(contest.contestTime, env.timezone),
        duration: contest.duration,
        link: contest.contestLink,
      });

      await channel.send({
        content: `${mention ? mention + " " : ""}⚠️ **Contest starting soon!** Please make sure to register if you haven't already! [Register Here](${contest.contestLink})`,
        embeds: [embed],
      });
    }

    markReminderSent(contest.id);
  }
}
