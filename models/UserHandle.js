import { getDb } from "./db.js";
import { triggerBackup } from "../services/backupService.js";

function rowToHandle(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    platform: row.platform,
    handle: row.handle,
    createdAt: row.created_at,
  };
}

export function connectHandle(guildId, userId, platform, handle) {
  const db = getDb();
  db.prepare(
    `
      INSERT OR REPLACE INTO user_handles (guild_id, user_id, platform, handle)
      VALUES (?, ?, ?, ?)
    `
  ).run(guildId, userId, platform, handle);

  triggerBackup();
  return getHandle(guildId, userId, platform);
}

export function disconnectHandle(guildId, userId, platform) {
  const db = getDb();
  const existing = getHandle(guildId, userId, platform);
  if (!existing) return null;

  db.prepare(
    "DELETE FROM user_handles WHERE guild_id = ? AND user_id = ? AND platform = ?"
  ).run(guildId, userId, platform);

  triggerBackup();
  return existing;
}

export function getHandle(guildId, userId, platform) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM user_handles WHERE guild_id = ? AND user_id = ? AND platform = ?")
    .get(guildId, userId, platform);
  return rowToHandle(row);
}

export function listUserHandles(guildId, userId) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM user_handles WHERE guild_id = ? AND user_id = ?")
    .all(guildId, userId)
    .map(rowToHandle);
}
