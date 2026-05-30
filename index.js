import { Client, GatewayIntentBits, Partials } from "discord.js";
import express from "express";
import { env } from "./config/constants.js";
import { initDatabase } from "./models/db.js";
import { commands } from "./commands/index.js";
import { registerEvents } from "./events/index.js";
import { startScheduler } from "./services/scheduler.js";
import { logger } from "./utils/logger.js";
import { getDb } from "./models/db.js";
import { getGuildConfig } from "./models/GuildConfig.js";
import { listUpcoming } from "./models/Contest.js";
import { ensureTodayPotd } from "./services/potdService.js";
import { formatDateTime } from "./utils/validation.js";

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

  const app = express();

  // Enable CORS for local file preview support
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // Serve static files from public directory
  app.use(express.static("public"));

  // Health endpoint
  app.get("/health", (_req, res) => {
    res.json({ ok: true, status: "healthy" });
  });

  // Bot Invite Link API
  app.get("/api/bot-invite", (_req, res) => {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${env.clientId}&permissions=8&scope=bot%20applications.commands`;
    res.json({ url: inviteUrl });
  });

  // Statistics API
  app.get("/api/stats", (_req, res) => {
    try {
      const db = getDb();
      const contestsCount = db.prepare("SELECT COUNT(*) as count FROM contests").get()?.count || 0;
      const serversCount = client.guilds.cache.size;
      const membersCount = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);

      res.json({
        servers: serversCount,
        members: membersCount,
        contestsTracked: contestsCount,
      });
    } catch (error) {
      logger.error("API Stats error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Servers API
  app.get("/api/servers", (_req, res) => {
    try {
      const guildsList = client.guilds.cache.map((guild) => {
        const config = getGuildConfig(guild.id) || {};
        
        const contestChan = guild.channels.cache.get(config.contestChannelId)?.name 
          || (config.contestChannelId ? "Configured" : "Not Configured");
        const potdChan = guild.channels.cache.get(config.potdChannelId)?.name 
          || (config.potdChannelId ? "Configured" : "Not Configured");
        const resourceChan = guild.channels.cache.get(config.resourceChannelId)?.name 
          || (config.resourceChannelId ? "Configured" : "Not Configured");

        return {
          id: guild.id,
          name: guild.name,
          iconUrl: guild.iconURL() || "",
          memberCount: guild.memberCount || 0,
          contestChannel: contestChan,
          potdChannel: potdChan,
          resourceChannel: resourceChan,
        };
      });
      res.json(guildsList);
    } catch (error) {
      logger.error("API Servers error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Contests API
  app.get("/api/contests", (_req, res) => {
    try {
      const list = listUpcoming({ limit: 6 });
      res.json(
        list.map((c) => ({
          platform: c.platform,
          contestName: c.contestName,
          contestLink: c.contestLink,
          contestTime: formatDateTime(c.contestTime, env.timezone),
          duration: c.duration,
        })),
      );
    } catch (error) {
      logger.error("API Contests error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POTD API
  app.get("/api/potd", async (_req, res) => {
    try {
      const potd = await ensureTodayPotd();
      res.json(potd || {});
    } catch (error) {
      logger.error("API POTD error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.listen(env.port, () => {
    logger.info(`Web server running on port ${env.port}`);
  });
}

start();
