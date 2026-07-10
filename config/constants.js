import dotenv from "dotenv";

dotenv.config();

export const env = {
  token: process.env.DISCORD_TOKEN || "",
  clientId: process.env.DISCORD_CLIENT_ID || "",
  guildId: process.env.DISCORD_GUILD_ID || "",
  timezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata",
  contestAlertTime: process.env.CONTEST_ALERT_TIME || "08:00",
  potdAlertTime: process.env.POTD_ALERT_TIME || "09:00",
  reminderWindowMinutes: Number(process.env.CONTEST_REMINDER_WINDOW || 30),
  cooldownSeconds: Number(process.env.COOLDOWN_SECONDS || 3),
  dbPath: process.env.DB_PATH || "data/algobot.db",
  port: Number(process.env.PORT || 3000),
  enableHealth:
    (process.env.HEALTH_ENDPOINT || "true").toLowerCase() === "true",
  clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  groqApiKey: process.env.GROQ_API_KEY || process.env.GROK_API_KEY || "",
};

export const embedColors = {
  contest: 0xe74c3c,
  potd: 0xf39c12,
  resource: 0x3498db,
  system: 0x2ecc71,
  warning: 0xf1c40f,
  error: 0xe74c3c,
};

export const setupDefaults = {
  channels: {
    contest: "contest-alerts",
    potd: "potd",
    resources: "resources",
  },
  roles: {
    contest: "ContestAlerts",
    potd: "POTD",
  },
};
