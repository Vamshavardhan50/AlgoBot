import { ActivityType } from "discord.js";
import { logger } from "../utils/logger.js";

export default function onReady(client) {
  logger.info(`Logged in as ${client.user?.tag}`);
  client.user?.setActivity("CP alerts", { type: ActivityType.Watching });
}
