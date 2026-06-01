import { getDb, toIso } from "./db.js";
import { triggerBackup } from "../services/backupService.js";

function rowToConfig(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    contestChannelId: row.contest_channel_id,
    contestRoleId: row.contest_role_id,
    potdChannelId: row.potd_channel_id,
    potdRoleId: row.potd_role_id,
    resourceChannelId: row.resource_channel_id,
    lastContestAlertAt: row.last_contest_alert_at || "",
    lastPotdSentAt: row.last_potd_sent_at || "",
  };
}

const COLUMN_MAP = {
  contestChannelId: "contest_channel_id",
  contestRoleId: "contest_role_id",
  potdChannelId: "potd_channel_id",
  potdRoleId: "potd_role_id",
  resourceChannelId: "resource_channel_id",
  lastContestAlertAt: "last_contest_alert_at",
  lastPotdSentAt: "last_potd_sent_at",
};

export function ensureGuildConfig(guildId) {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)").run(
    guildId,
  );
  triggerBackup();
  return getGuildConfig(guildId);
}

export function getGuildConfig(guildId) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM guild_configs WHERE guild_id = ?")
    .get(guildId);
  return rowToConfig(row);
}

export function listGuildConfigs() {
  const db = getDb();
  return db.prepare("SELECT * FROM guild_configs").all().map(rowToConfig);
}

export function updateGuildConfig(guildId, updates = {}) {
  ensureGuildConfig(guildId);
  const db = getDb();
  const entries = Object.entries(updates).filter(
    ([, value]) => value !== undefined,
  );
  if (!entries.length) return getGuildConfig(guildId);

  const sets = [];
  const values = [];

  for (const [key, value] of entries) {
    const column = COLUMN_MAP[key];
    if (!column) continue;
    sets.push(`${column} = ?`);
    values.push(value);
  }

  if (!sets.length) return getGuildConfig(guildId);

  sets.push("updated_at = ?");
  values.push(toIso(new Date()));
  values.push(guildId);

  db.prepare(
    `UPDATE guild_configs SET ${sets.join(", ")} WHERE guild_id = ?`,
  ).run(...values);

  triggerBackup();
  return getGuildConfig(guildId);
}
