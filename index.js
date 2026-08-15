import { Client, GatewayIntentBits, Partials, InteractionType, InteractionResponseType } from "discord.js";
import express from "express";
import nacl from "tweetnacl";
import { env } from "./config/constants.js";
import { initDatabase } from "./models/db.js";
import { commands } from "./commands/index.js";
import { registerEvents } from "./events/index.js";
import { startScheduler } from "./services/scheduler.js";
import { logger } from "./utils/logger.js";
import { getDb } from "./models/db.js";
import { listUpcoming } from "./models/Contest.js";
import { ensureTodayPotd } from "./services/potdService.js";
import { fetchJobListings, fetchJobDetail } from "./services/jobScraper.js";
import { formatDateTime } from "./utils/validation.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Map(
  commands.map((command) => [command.data.name, command]),
);
client.context = {
  cooldowns: new Map(),
  embedDrafts: new Map(),
};

function legalPage(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — AlgoBot</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0b0b10; color: #eee; font-family: 'Outfit', sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    .page { max-width: 720px; margin: 0 auto; padding: 60px 24px; }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 4px; }
    .meta { color: #555; font-size: 0.85rem; margin-bottom: 40px; }
    h2 { font-size: 1.15rem; font-weight: 600; margin: 28px 0 10px; color: #eee; }
    p { color: #888; font-size: 0.95rem; line-height: 1.7; margin-bottom: 12px; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,.06); margin: 32px 0; }
    .footer-link { color: #555; font-size: 0.85rem; text-decoration: none; }
    .footer-link:hover { color: #888; }
    strong { color: #ccc; }
  </style>
</head>
<body>
  <div class="page">
    ${content}
    <hr>
    <a href="/" class="footer-link">&larr; Back to Dashboard</a>
  </div>
</body>
</html>`;
}

async function start() {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason?.message || reason);
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error?.message || error);
  });

  initDatabase();
  registerEvents(client);

  // Login to Discord asynchronously so that the web server can still start independently
  client.login(env.token)
    .then(() => {
      startScheduler(client);
    })
    .catch((error) => {
      logger.error(`Discord login failed: ${error.message}`);
    });

  const app = express();

  // Parse raw body for Discord signature verification
  app.use(express.json({
    verify: (req, _res, buf) => { req.rawBody = buf; },
  }));

  // Enable CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve static files from public directory
  app.use(express.static("public"));

  // ── Interactions Endpoint ──────────────────────────────────────────────
  app.post("/interactions", (req, res) => {
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");
    const rawBody = req.rawBody;

    if (!signature || !timestamp || !rawBody) {
      return res.status(401).send("Bad request signature");
    }

    // Verify Discord's Ed25519 signature
    const verified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(env.clientId.padEnd(64, "0").slice(0, 64), "hex"),
    );

    if (!verified) {
      return res.status(401).send("Invalid signature");
    }

    const interaction = req.body;

    // PING (type 1) → respond with PONG
    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    // For other interactions, acknowledge with DEFERRED
    // (Full command handling via Gateway; this endpoint passes Discord's
    //  endpoint verification and allows future migration to webhooks.)
    logger.info(`Interactions endpoint received type ${interaction.type} (${interaction.data?.name || "unknown"})`);
    res.json({ type: 5 }); // DEFERRED_UPDATE_MESSAGE
  });

  // ── Health ─────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ ok: true, status: "healthy" });
  });

  // ── Terms of Service ───────────────────────────────────────────────────
  app.get("/terms", (_req, res) => {
    res.type("html").send(legalPage("Terms of Service", `
      <h1>Terms of Service</h1>
      <p class="meta">Last updated: July 2026</p>
      <p>By inviting AlgoBot to your Discord server, you agree to the following terms.</p>
      <h2>1. Service</h2>
      <p>AlgoBot provides competitive programming alerts, duels, problem tracking, and related features. The service is provided "as is" without any warranty, express or implied.</p>
      <h2>2. Acceptable Use</h2>
      <p>You may not use AlgoBot for spam, harassment, or any illegal activity. We reserve the right to restrict access for any server or user that violates these terms.</p>
      <h2>3. Data</h2>
      <p>AlgoBot stores guild configuration (channel and role IDs), Discord user IDs linked to coding platform handles, duel scores and history, contest schedules, and Problem of the Day records. No personal data is shared with third parties.</p>
      <h2>4. Limitation of Liability</h2>
      <p>AlgoBot is not responsible for any damages arising from the use or inability to use the service, including but not limited to missed contest registrations or incorrect alert timing.</p>
      <h2>5. Changes</h2>
      <p>These terms may be updated at any time. Continued use of the bot after changes constitutes acceptance of the revised terms.</p>
      <h2>6. Contact</h2>
      <p>For inquiries regarding these terms, please reach out via the bot's official Discord support server.</p>
    `));
  });

  // ── Privacy Policy ─────────────────────────────────────────────────────
  app.get("/privacy", (_req, res) => {
    res.type("html").send(legalPage("Privacy Policy", `
      <h1>Privacy Policy</h1>
      <p class="meta">Last updated: July 2026</p>
      <h2>What We Collect</h2>
      <p>AlgoBot stores the following data in a local SQLite database:</p>
      <p><strong>Guild Configuration:</strong> Channel and role IDs for contest alerts, POTD, and resource notifications.</p>
      <p><strong>User Data:</strong> Discord user IDs linked to competitive programming platform handles (Codeforces, LeetCode, etc.).</p>
      <p><strong>Engagement Data:</strong> Duel scores, win/loss records, starboard points, and contest reminder history.</p>
      <p><strong>Content Data:</strong> Contest schedules scraped from public APIs, Problem of the Day records, and shared resource links.</p>
      <h2>How We Store It</h2>
      <p>All data is stored locally in a SQLite database file. Encrypted database backups may be uploaded to a private Discord channel for disaster recovery purposes.</p>
      <h2>Data Sharing</h2>
      <p>We do not sell, trade, or share your data with third parties. Data is used solely to operate the bot's features.</p>
      <h2>Data Deletion</h2>
      <p>Removing AlgoBot from your server stops all data collection for that guild. To request deletion of existing data, contact the bot maintainer through the official support server.</p>
      <h2>Contact</h2>
      <p>For privacy-related concerns, reach out via the bot's Discord support server.</p>
    `));
  });

  // ── Linked Roles ───────────────────────────────────────────────────────
  app.get("/linked-role", (_req, res) => {
    const redirectUri = `${_req.protocol}://${_req.get("host")}/linked-role/callback`;
    const authorizeUrl = `https://discord.com/api/oauth2/authorize?client_id=${env.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=role_connections.write&prompt=consent`;
    res.redirect(authorizeUrl);
  });

  app.get("/linked-role/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.type("html").send(legalPage("Linked Roles", `
        <h1>Authorization Failed</h1>
        <p>No authorization code was provided. Please try linking your account from Discord's <strong>Connected Roles</strong> settings.</p>
      `));
    }

    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/linked-role/callback`;
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.clientId,
          client_secret: env.clientSecret || "",
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Token exchange failed: ${tokenRes.status}`);
      }

      const tokens = await tokenRes.json();

      // Fetch user info
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const user = await userRes.json();

      // Push role connection metadata
      const metadata = {
        platform_name: "Competitive Programming",
        metadata: {
          linked: "true",
        },
      };

      await fetch(
        `https://discord.com/api/v10/users/@me/applications/${env.clientId}/role-connection`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metadata),
        },
      );

      res.type("html").send(legalPage("Linked!", `
        <h1>Account Linked</h1>
        <p>Your Discord account <strong>${user.username}</strong> has been successfully linked to AlgoBot.</p>
        <p>You can now go back to Discord and check your <strong>Connected Roles</strong> settings.</p>
        <p style="margin-top:24px"><a href="/" class="footer-link">&larr; Back to Dashboard</a></p>
      `));
    } catch (error) {
      logger.error("Linked Roles callback failed", error?.message || error);
      res.type("html").send(legalPage("Error", `
        <h1>Something went wrong</h1>
        <p>Failed to link your account. Please try again from Discord's Connected Roles settings.</p>
        <p style="margin-top:24px"><a href="/" class="footer-link">&larr; Back to Dashboard</a></p>
      `));
    }
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
      const guildsList = client.guilds.cache.map((guild) => ({
        id: guild.id,
        name: guild.name,
        iconUrl: guild.iconURL() || "",
        memberCount: guild.memberCount || 0,
      }));
      res.json(guildsList);
    } catch (error) {
      logger.error("API Servers error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Contests API
  app.get("/api/contests", (_req, res) => {
    try {
      const list = listUpcoming({ limit: 12 });
      res.json(
        list.map((c) => {
          const d = new Date(c.contestTime);
          const unix = !Number.isNaN(d.getTime()) ? Math.floor(d.getTime() / 1000) : null;
          return {
            id: c.id,
            platform: c.platform,
            contestName: c.contestName,
            contestLink: c.contestLink,
            contestTime: formatDateTime(c.contestTime, env.timezone),
            contestTimeRaw: c.contestTime,
            contestTimeUnix: unix,
            duration: c.duration,
          };
        }),
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
      res.json(potd || []);
    } catch (error) {
      logger.error("API POTD error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Jobs API
  app.get("/api/jobs", async (_req, res) => {
    try {
      const jobs = await fetchJobListings();
      const enriched = await Promise.all(
        jobs.slice(0, 15).map(async (job) => {
          const detail = await fetchJobDetail(job.url);
          return { ...job, ...detail };
        }),
      );
      res.json(enriched);
    } catch (error) {
      logger.error("API Jobs error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Starboard Leaderboard API
  app.get("/api/starboard", (_req, res) => {
    try {
      const db = getDb();
      const leaderboard = db.prepare("SELECT * FROM starboard ORDER BY score DESC, wins DESC LIMIT 10").all();
      const resolved = leaderboard.map(row => {
        const user = client.users.cache.get(row.user_id);
        return {
          userId: row.user_id,
          username: user ? user.username : `User (${row.user_id.slice(-4)})`,
          avatar: user ? user.displayAvatarURL() : "https://cdn.discordapp.com/embed/avatars/0.png",
          wins: row.wins,
          losses: row.losses,
          score: row.score,
        };
      });
      res.json(resolved);
    } catch (error) {
      logger.error("API Starboard error", error?.message || error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.listen(env.port, () => {
    logger.info(`Web server running on port ${env.port}`);
  });
}

start();
