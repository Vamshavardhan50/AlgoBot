import { REST, Routes } from "discord.js";
import { env } from "./config/constants.js";
import { commands } from "./commands/index.js";
import { logger } from "./utils/logger.js";

const rest = new REST({ version: "10" }).setToken(env.token);
const args = process.argv.slice(2);
const shouldClear = args.includes("--clear");
const useGlobal = args.includes("--global");
const guildIndex = args.indexOf("--guild");
const guildArg = guildIndex !== -1 ? args[guildIndex + 1] : "";

async function deploy() {
  if (!env.token || !env.clientId) {
    logger.error("DISCORD_TOKEN or DISCORD_CLIENT_ID is missing.");
    return;
  }

  const body = shouldClear
    ? []
    : commands.map((command) => command.data.toJSON());

  try {
    const targetGuildId = guildArg || env.guildId || "";

    if (!useGlobal && shouldClear && !targetGuildId) {
      logger.error(
        "Provide --guild <id> or set DISCORD_GUILD_ID to clear guild commands.",
      );
      return;
    }

    if (!useGlobal && targetGuildId) {
      await rest.put(
        Routes.applicationGuildCommands(env.clientId, targetGuildId),
        { body },
      );
      logger.info(
        shouldClear ? "Guild commands cleared." : "Guild commands deployed.",
      );
      return;
    }

    await rest.put(Routes.applicationCommands(env.clientId), { body });
    logger.info(
      shouldClear ? "Global commands cleared." : "Global commands deployed.",
    );
  } catch (error) {
    logger.error("Command deployment failed", error?.message || error);
  }
}

deploy();
