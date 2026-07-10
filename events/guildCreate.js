import { REST, Routes } from "discord.js";
import { env } from "../config/constants.js";
import { commands } from "../commands/index.js";
import { logger } from "../utils/logger.js";
import { ensureGuildConfig } from "../models/GuildConfig.js";

export default async function onGuildCreate(guild) {
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  ensureGuildConfig(guild.id);

  const rest = new REST({ version: "10" }).setToken(env.token);
  const body = commands.map((command) => command.data.toJSON());

  try {
    await rest.put(Routes.applicationGuildCommands(env.clientId, guild.id), {
      body,
    });
    logger.info(`Deployed ${body.length} commands to guild ${guild.id}`);
  } catch (error) {
    logger.error(`Failed to deploy commands to guild ${guild.id}`, error?.message || error);
  }
}
