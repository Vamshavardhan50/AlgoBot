import { logger } from "../utils/logger.js";
import { ensureGuildConfig } from "../models/GuildConfig.js";

export default async function onGuildCreate(guild) {
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);
  ensureGuildConfig(guild.id);
}
