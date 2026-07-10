import { ActivityType, REST, Routes } from "discord.js";
import { logger } from "../utils/logger.js";
import { initBackupService, restoreDatabaseFromDiscord } from "../services/backupService.js";
import { commands } from "../commands/index.js";
import { env } from "../config/constants.js";

export default async function onReady(client) {
  logger.info(`Logged in as ${client.user?.tag}`);
  client.user?.setActivity("CP alerts", { type: ActivityType.Watching });

  // Deploy commands globally so all guilds (existing + new) get them
  const rest = new REST({ version: "10" }).setToken(env.token);
  try {
    const body = commands.map((c) => c.data.toJSON());
    await rest.put(Routes.applicationCommands(env.clientId), { body });
    logger.info(`Deployed ${body.length} global commands (may take ~1h to propagate to all guilds)`);
  } catch (error) {
    logger.error("Failed to deploy global commands", error?.message || error);
  }

  // Initialize backup and restore DB from Discord
  initBackupService(client);
  await restoreDatabaseFromDiscord(client);
}
