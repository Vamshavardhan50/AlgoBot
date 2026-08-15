import { getDb } from "./db.js";

export function isJobSent(url) {
  if (!url) return false;
  const db = getDb();
  const row = db.prepare("SELECT id FROM sent_jobs WHERE url = ?").get(url);
  return Boolean(row);
}

export function markJobSent({ url, title, company = "", categories = [], applyLink = "" }) {
  if (!url) return false;
  const db = getDb();
  try {
    const info = db
      .prepare(
        `INSERT OR IGNORE INTO sent_jobs (url, title, company, categories, apply_link) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        url,
        title,
        company,
        JSON.stringify(categories || []),
        applyLink || ""
      );
    return info.changes > 0;
  } catch {
    return false;
  }
}

export function listRecentSentJobs(limit = 20) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sent_jobs ORDER BY sent_at DESC LIMIT ?")
    .all(limit);
}
