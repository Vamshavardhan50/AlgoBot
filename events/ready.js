import { ActivityType } from "discord.js";
import { logger } from "../utils/logger.js";
import { initBackupService, restoreDatabaseFromDiscord } from "../services/backupService.js";

export default async function onReady(client) {
  logger.info(`Logged in as ${client.user?.tag}`);
  client.user?.setActivity("CP alerts", { type: ActivityType.Watching });

  // Initialize backup and restore DB from Discord
  initBackupService(client);
  await restoreDatabaseFromDiscord(client);
}
