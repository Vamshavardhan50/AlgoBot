import { env } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import { safeReply } from "../utils/interaction.js";

export default async function onInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    return safeReply(interaction, {
      content: "Unknown command.",
      ephemeral: true,
    });
  }

  logger.info(`[Command] ${interaction.user.tag} ran /${interaction.commandName}`);

  const cooldowns = interaction.client.context.cooldowns;
  const cooldownMs = Math.max(0, env.cooldownSeconds || 0) * 1000;
  if (cooldownMs > 0) {
    const key = `${interaction.user.id}:${command.data.name}`;
    const expiresAt = cooldowns.get(key) || 0;
    if (Date.now() < expiresAt) {
      return safeReply(interaction, {
        content: "Slow down a bit before using this command again.",
        ephemeral: true,
      });
    }
    cooldowns.set(key, Date.now() + cooldownMs);
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error("Command execution failed", error?.message || error);
    await safeReply(interaction, {
      content: "Something went wrong while running that command.",
      ephemeral: true,
    });
  }
}
