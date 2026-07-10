import { ActivityType, REST, Routes } from "discord.js";
import { logger } from "../utils/logger.js";
import { initBackupService, restoreDatabaseFromDiscord } from "../services/backupService.js";
import { commands } from "../commands/index.js";
import { env } from "../config/constants.js";

export default async function onReady(client) {
  logger.info(`Logged in as ${client.user?.tag}`);
  client.user?.setActivity("CP alerts", { type: ActivityType.Watching });

  const rest = new REST({ version: "10" }).setToken(env.token);
  try {
    const body = commands.map((c) => c.data.toJSON());
    await rest.put(Routes.applicationCommands(env.clientId), { body });
    logger.info(`Deployed ${body.length} global commands`);

    // Clear guild-specific commands to prevent duplicates with global commands
    for (const [guildId] of client.guilds.cache) {
      try {
        await rest.put(Routes.applicationGuildCommands(env.clientId, guildId), { body: [] });
      } catch { /* skip guilds that fail */ }
    }
    logger.info("Cleared guild-specific commands to eliminate duplicates");
  } catch (error) {
    logger.error("Failed to deploy global commands", error?.message || error);
  }

  // Initialize backup and restore DB from Discord
  initBackupService(client);
  await restoreDatabaseFromDiscord(client);
}
