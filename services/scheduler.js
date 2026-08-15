import cron from "node-cron";
import { env } from "../config/constants.js";
import {
  sendContestReminders,
  sendDailyContestAlerts,
  storeFetchedContests,
} from "./contestService.js";
import { sendDailyPotd, ensureTodayPotd, sendPotdReminder } from "./potdService.js";
import { sendJobAlerts } from "./jobScraper.js";
import { logger } from "../utils/logger.js";

function parseTime(str) {
  const parts = (str || "06:00").split(":").map(Number);
  return { hour: parts[0] || 6, minute: parts[1] || 0 };
}

function toCron(minute, hour) {
  return `${minute} ${hour} * * *`;
}

function subtractMinutes(hour, minute, offset) {
  let total = hour * 60 + minute - offset;
  if (total < 0) total += 1440;
  return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
}

export function startScheduler(client) {
  const contestTime = parseTime(env.contestAlertTime);
  const potdTime = parseTime(env.potdAlertTime);
  const scrapeTime = subtractMinutes(contestTime.hour, contestTime.minute, 30);

  // 1. Daily Scraping Job (30 min before contest alert)
  cron.schedule(
    toCron(scrapeTime.minute, scrapeTime.hour),
    async () => {
      try {
        logger.info("Scheduler: Starting morning scrape for contests and POTD...");
        const contestResult = await storeFetchedContests("system");
        logger.info(`Scheduler: Scraped and stored ${contestResult.total} contests (${contestResult.inserted} new).`);

        const potdResult = await ensureTodayPotd();
        if (potdResult && potdResult.length) {
          logger.info(`Scheduler: Scraped and stored ${potdResult.length} POTD challenges.`);
        } else {
          logger.warn("Scheduler: Failed to scrape today's POTD challenges or none available.");
        }
      } catch (error) {
        logger.error("Scheduler: Morning scrape job failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 2. Daily Contest Alerts
  cron.schedule(
    toCron(contestTime.minute, contestTime.hour),
    async () => {
      try {
        logger.info("Scheduler: Sending contest alerts...");
        await sendDailyContestAlerts(client);
      } catch (error) {
        logger.error("Scheduler: Contest alerts job failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 3. Daily Morning POTD Alert
  cron.schedule(
    toCron(potdTime.minute, potdTime.hour),
    async () => {
      try {
        logger.info("Scheduler: Sending morning POTD alerts...");
        await sendDailyPotd(client, "morning");
      } catch (error) {
        logger.error("Scheduler: Morning POTD job failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 4. Daily Evening POTD Alert at 20:00
  cron.schedule(
    "0 20 * * *",
    async () => {
      try {
        logger.info("Scheduler: Sending evening POTD alerts...");
        await sendDailyPotd(client, "evening");
      } catch (error) {
        logger.error("Scheduler: Evening POTD job failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 5. Daily Job Alerts (Morning 10:00 & Afternoon 16:00 IST)
  cron.schedule(
    "0 10 * * *",
    async () => {
      try {
        logger.info("Scheduler: Sending morning 10:00 job alerts...");
        await sendJobAlerts(client, { forceCount: 3 });
      } catch (error) {
        logger.error("Scheduler: Morning job alerts failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  cron.schedule(
    "0 16 * * *",
    async () => {
      try {
        logger.info("Scheduler: Sending afternoon 16:00 job alerts...");
        await sendJobAlerts(client, { forceCount: 3 });
      } catch (error) {
        logger.error("Scheduler: Afternoon job alerts failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 7. Contest Reminders Check Every 5 Minutes
  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        await sendContestReminders(client);
      } catch (error) {
        logger.error("Scheduler: Contest reminder scheduler failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 8. POTD Flirty Reminders every 3 hours
  cron.schedule(
    "0 */3 * * *",
    async () => {
      try {
        logger.info("Scheduler: Sending flirty POTD reminders...");
        await sendPotdReminder(client);
      } catch (error) {
        logger.error("Scheduler: POTD reminder scheduler failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  logger.info(`Scheduler initialized: scrape at ${String(scrapeTime.hour).padStart(2, "0")}:${String(scrapeTime.minute).padStart(2, "0")}, contest alerts at ${env.contestAlertTime}, POTD at ${env.potdAlertTime} and 20:00, job alerts at 12:00, 5-min reminders, 3-hour pings.`);
}
