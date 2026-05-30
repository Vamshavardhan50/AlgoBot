import cron from "node-cron";
import { env } from "../config/constants.js";
import {
  sendContestReminders,
  sendDailyContestAlerts,
  storeFetchedContests,
} from "./contestService.js";
import { sendDailyPotd, ensureTodayPotd } from "./potdService.js";
import { logger } from "../utils/logger.js";

export function startScheduler(client) {
  // 1. Daily Scraping Job at 04:50 AM
  cron.schedule(
    "50 4 * * *",
    async () => {
      try {
        logger.info("Scheduler: Starting morning scrape for contests and POTD...");
        const contestResult = await storeFetchedContests("system");
        logger.info(`Scheduler: Scraped and stored ${contestResult.total} contests (${contestResult.inserted} new).`);
        
        const potdResult = await ensureTodayPotd();
        if (potdResult) {
          logger.info(`Scheduler: Scraped and stored POTD: ${potdResult.problemName} (${potdResult.platform}).`);
        } else {
          logger.warn("Scheduler: Failed to scrape today's POTD or none available.");
        }
      } catch (error) {
        logger.error("Scheduler: Morning scrape job failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 2. Daily Morning Alerts at 05:00 AM
  cron.schedule(
    "0 5 * * *",
    async () => {
      try {
        logger.info("Scheduler: Sending morning alerts...");
        await sendDailyContestAlerts(client);
        await sendDailyPotd(client, "morning");
      } catch (error) {
        logger.error("Scheduler: Morning alerts job failed", error?.message || error);
      }
    },
    { timezone: env.timezone },
  );

  // 3. Daily Evening POTD Alert at 08:00 PM (20:00)
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

  // 4. Contest Reminders Check Every 5 Minutes
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

  logger.info("Schedulers initialized: 04:50 AM scraping, 05:00 AM alerts, 08:00 PM evening alerts, 5-minute pings.");
}
