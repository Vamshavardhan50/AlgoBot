import { getDb, toIso } from "./db.js";
import { triggerBackup } from "../services/backupService.js";

function rowToPotd(row) {
  if (!row) return null;
  return {
    id: row.id,
    platform: row.platform,
    problemName: row.problem_name,
    difficulty: row.difficulty,
    problemLink: row.problem_link,
    date: row.date,
    createdAt: row.created_at,
  };
}

export function createPotd(data) {
  const db = getDb();
  db.prepare(
    `
      INSERT OR IGNORE INTO potd
      (platform, problem_name, difficulty, problem_link, date)
      VALUES (?, ?, ?, ?, ?)
    `,
  ).run(
    data.platform,
    data.problemName,
    data.difficulty || "Unknown",
    data.problemLink,
    data.date,
  );

  triggerBackup();
  return getPotdByUnique(data.platform, data.problemName, data.date);
}

export function getPotdByUnique(platform, problemName, date) {
  const db = getDb();
  return rowToPotd(
    db
      .prepare(
        "SELECT * FROM potd WHERE platform = ? AND problem_name = ? AND date = ?",
      )
      .get(platform, problemName, date),
  );
}

export function getPotdByDate(date) {
  const db = getDb();
  return rowToPotd(db.prepare("SELECT * FROM potd WHERE date = ?").get(date));
}

export function getPotdByDateAndPlatform(date, platform) {
  const db = getDb();
  return rowToPotd(
    db
      .prepare("SELECT * FROM potd WHERE date = ? AND platform = ?")
      .get(date, platform),
  );
}

export function listPotdByDate(date) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM potd WHERE date = ?")
    .all(date)
    .map(rowToPotd);
}

export function listPotd({ limit = 20 } = {}) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM potd ORDER BY date DESC LIMIT ?")
    .all(limit)
    .map(rowToPotd);
}

export function removePotd(id) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM potd WHERE id = ?").get(id);
  if (!existing) return null;
  db.prepare("DELETE FROM potd WHERE id = ?").run(id);
  triggerBackup();
  return rowToPotd(existing);
}

export function formatPotdDate(date = new Date()) {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return toIso(new Date()).slice(0, 10);
  return toIso(value).slice(0, 10);
}
