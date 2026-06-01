import { getDb } from "./db.js";
import { triggerBackup } from "../services/backupService.js";

function rowToStarboard(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    wins: row.wins,
    losses: row.losses,
    score: row.score,
  };
}

export function getStarboardUser(guildId, userId) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM starboard WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId);
  
  if (row) return rowToStarboard(row);
  return {
    guildId,
    userId,
    wins: 0,
    losses: 0,
    score: 0,
  };
}

export function updateStarboardScore(guildId, userId, winsDelta, lossesDelta, scoreDelta) {
  const db = getDb();
  
  // Ensure user exists in starboard
  db.prepare(
    `
      INSERT OR IGNORE INTO starboard (guild_id, user_id, wins, losses, score)
      VALUES (?, ?, 0, 0, 0)
    `
  ).run(guildId, userId);

  // Update stats (score can go negative or be capped at 0, let's allow negative scores or cap at 0, usually capping at 0 is nicer or letting it run negative. Let's allow negative but max(0, score) if preferred, or just raw numbers. Let's allow raw numbers).
  db.prepare(
    `
      UPDATE starboard
      SET wins = wins + ?,
          losses = losses + ?,
          score = score + ?
      WHERE guild_id = ? AND user_id = ?
    `
  ).run(winsDelta, lossesDelta, scoreDelta, guildId, userId);

  triggerBackup();
  return getStarboardUser(guildId, userId);
}

export function listStarboard(guildId, limit = 10) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM starboard WHERE guild_id = ? ORDER BY score DESC, wins DESC LIMIT ?")
    .all(guildId, limit)
    .map(rowToStarboard);
}
