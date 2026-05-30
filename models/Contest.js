import { getDb, toIso } from "./db.js";

function rowToContest(row) {
  if (!row) return null;
  return {
    id: row.id,
    platform: row.platform,
    contestName: row.contest_name,
    contestLink: row.contest_link,
    contestTime: row.contest_time,
    duration: row.duration,
    createdBy: row.created_by,
    reminderSentAt: row.reminder_sent_at || "",
    createdAt: row.created_at,
  };
}

export function createContest(data) {
  const db = getDb();
  const info = db
    .prepare(
      `
      INSERT OR IGNORE INTO contests
      (platform, contest_name, contest_link, contest_time, duration, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      data.platform,
      data.contestName,
      data.contestLink,
      data.contestTime,
      data.duration || 0,
      data.createdBy || "",
    );

  const contest = getContestByUnique(
    data.platform,
    data.contestName,
    data.contestTime,
  );
  return { contest, inserted: info.changes > 0 };
}

export function getContestById(id) {
  const db = getDb();
  return rowToContest(
    db.prepare("SELECT * FROM contests WHERE id = ?").get(id),
  );
}

export function getContestByUnique(platform, contestName, contestTime) {
  const db = getDb();
  return rowToContest(
    db
      .prepare(
        "SELECT * FROM contests WHERE platform = ? AND contest_name = ? AND contest_time = ?",
      )
      .get(platform, contestName, contestTime),
  );
}

export function removeContest(id) {
  const db = getDb();
  const existing = getContestById(id);
  if (!existing) return null;
  db.prepare("DELETE FROM contests WHERE id = ?").run(id);
  return existing;
}

export function listUpcoming({ limit = 10 } = {}) {
  const db = getDb();
  const now = toIso(new Date());
  return db
    .prepare(
      "SELECT * FROM contests WHERE contest_time >= ? ORDER BY contest_time ASC LIMIT ?",
    )
    .all(now, limit)
    .map(rowToContest);
}

export function listAll({ limit = 50 } = {}) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM contests ORDER BY contest_time DESC LIMIT ?")
    .all(limit)
    .map(rowToContest);
}

export function listStartingWithin(minutes) {
  const db = getDb();
  const now = new Date();
  const until = new Date(now.getTime() + minutes * 60 * 1000);
  return db
    .prepare(
      "SELECT * FROM contests WHERE contest_time >= ? AND contest_time <= ? AND (reminder_sent_at IS NULL OR reminder_sent_at = '') ORDER BY contest_time ASC",
    )
    .all(toIso(now), toIso(until))
    .map(rowToContest);
}

export function markReminderSent(id) {
  const db = getDb();
  db.prepare("UPDATE contests SET reminder_sent_at = ? WHERE id = ?").run(
    toIso(new Date()),
    id,
  );
}

export function upsertContests(contests = [], createdBy = "") {
  let inserted = 0;
  for (const contest of contests) {
    const result = createContest({ ...contest, createdBy });
    if (result.inserted) inserted += 1;
  }
  return inserted;
}
