import { getDb, toIso } from "./db.js";
import { triggerBackup } from "../services/backupService.js";

function rowToDuel(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    challengerId: row.challenger_id,
    opponentId: row.opponent_id,
    contestId: row.contest_id,
    problemIndex: row.problem_index,
    timeLimit: row.time_limit,
    status: row.status,
    winnerId: row.winner_id,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    expiresAt: row.expires_at,
  };
}

export function createDuel(guildId, challengerId, opponentId, contestId, problemIndex, timeLimit) {
  const db = getDb();
  
  // Set expiration for the challenge acceptance window (e.g., 10 minutes from now)
  const challengeExpires = new Date(Date.now() + 10 * 60 * 1000);

  const result = db.prepare(
    `
      INSERT INTO duels (guild_id, challenger_id, opponent_id, contest_id, problem_index, time_limit, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `
  ).run(guildId, challengerId, opponentId, contestId, problemIndex, timeLimit, toIso(challengeExpires));

  triggerBackup();
  return getDuel(result.lastInsertRowId);
}

export function getDuel(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM duels WHERE id = ?").get(id);
  return rowToDuel(row);
}

export function getActiveDuelForUser(guildId, userId) {
  const db = getDb();
  
  // Check if there is an ONGOING duel where the user is either the challenger or opponent
  const row = db.prepare(
    `
      SELECT * FROM duels 
      WHERE guild_id = ? 
        AND (challenger_id = ? OR opponent_id = ?) 
        AND status = 'ONGOING'
    `
  ).get(guildId, userId, userId);
  
  return rowToDuel(row);
}

export function getPendingDuelForUser(guildId, userId) {
  const db = getDb();
  
  // Check if there is a PENDING duel where the user is the opponent
  const row = db.prepare(
    `
      SELECT * FROM duels 
      WHERE guild_id = ? 
        AND opponent_id = ? 
        AND status = 'PENDING'
      ORDER BY id DESC LIMIT 1
    `
  ).get(guildId, userId);
  
  return rowToDuel(row);
}

export function acceptDuel(id, timeLimitMinutes) {
  const db = getDb();
  const acceptedAt = new Date();
  const expiresAt = new Date(acceptedAt.getTime() + timeLimitMinutes * 60 * 1000);

  db.prepare(
    `
      UPDATE duels
      SET status = 'ONGOING',
          accepted_at = ?,
          expires_at = ?
      WHERE id = ?
    `
  ).run(toIso(acceptedAt), toIso(expiresAt), id);

  triggerBackup();
  return getDuel(id);
}

export function declineDuel(id) {
  const db = getDb();
  db.prepare("UPDATE duels SET status = 'DECLINED' WHERE id = ?").run(id);
  triggerBackup();
  return getDuel(id);
}

export function completeDuel(id, winnerId) {
  const db = getDb();
  db.prepare("UPDATE duels SET status = 'COMPLETED', winner_id = ? WHERE id = ?").run(winnerId, id);
  triggerBackup();
  return getDuel(id);
}

export function expireDuel(id) {
  const db = getDb();
  db.prepare("UPDATE duels SET status = 'EXPIRED' WHERE id = ?").run(id);
  triggerBackup();
  return getDuel(id);
}

export function listRecentDuels(guildId, limit = 10) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM duels WHERE guild_id = ? ORDER BY id DESC LIMIT ?")
    .all(guildId, limit)
    .map(rowToDuel);
}
