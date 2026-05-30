import { Client, GatewayIntentBits, Partials } from "discord.js";
import express from "express";
import { env } from "./config/constants.js";
import { initDatabase } from "./models/db.js";
import { commands } from "./commands/index.js";
import { registerEvents } from "./events/index.js";
import { startScheduler } from "./services/scheduler.js";
import { logger } from "./utils/logger.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

client.commands = new Map(
  commands.map((command) => [command.data.name, command]),
);
client.context = {
  cooldowns: new Map(),
  embedDrafts: new Map(),
};

async function start() {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason?.message || reason);
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error?.message || error);
  });

  initDatabase();
  registerEvents(client);

  if (!env.token) {
    logger.error("DISCORD_TOKEN is not set.");
    return;
  }

  await client.login(env.token);
  startScheduler(client);

  if (env.enableHealth) {
    const app = express();
    app.get("/health", (_req, res) => {
      res.json({ ok: true, status: "healthy" });
    });
    app.listen(env.port, () => {
      logger.info(`Health endpoint running on port ${env.port}`);
    });
  }
}

start();
