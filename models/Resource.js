import { getDb, toIso } from "./db.js";
import { triggerBackup } from "../services/backupService.js";

function parseJson(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToResource(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    link: row.link,
    attachments: parseJson(row.attachments, []),
    thumbnail: row.thumbnail,
    authorId: row.author_id,
    tags: parseJson(row.tags, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createResource(data) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO resources
      (title, description, link, attachments, thumbnail, author_id, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    data.title,
    data.description || "",
    data.link,
    JSON.stringify(data.attachments || []),
    data.thumbnail || "",
    data.authorId || "",
    JSON.stringify(data.tags || []),
    toIso(new Date()),
    toIso(new Date()),
  );

  const row = db
    .prepare("SELECT * FROM resources ORDER BY id DESC LIMIT 1")
    .get();
  triggerBackup();
  return rowToResource(row);
}

export function updateResource(id, updates) {
  const db = getDb();
  const existing = getResourceById(id);
  if (!existing) return null;

  const payload = {
    title: updates.title ?? existing.title,
    description: updates.description ?? existing.description,
    link: updates.link ?? existing.link,
    attachments: updates.attachments ?? existing.attachments,
    thumbnail: updates.thumbnail ?? existing.thumbnail,
    tags: updates.tags ?? existing.tags,
  };

  db.prepare(
    `
      UPDATE resources SET
        title = ?,
        description = ?,
        link = ?,
        attachments = ?,
        thumbnail = ?,
        tags = ?,
        updated_at = ?
      WHERE id = ?
    `,
  ).run(
    payload.title,
    payload.description,
    payload.link,
    JSON.stringify(payload.attachments || []),
    payload.thumbnail || "",
    JSON.stringify(payload.tags || []),
    toIso(new Date()),
    id,
  );

  triggerBackup();
  return getResourceById(id);
}

export function deleteResource(id) {
  const db = getDb();
  const existing = getResourceById(id);
  if (!existing) return null;
  db.prepare("DELETE FROM resources WHERE id = ?").run(id);
  triggerBackup();
  return existing;
}

export function getResourceById(id) {
  const db = getDb();
  return rowToResource(
    db.prepare("SELECT * FROM resources WHERE id = ?").get(id),
  );
}

export function listResources({ tag, limit = 20 } = {}) {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM resources ORDER BY created_at DESC LIMIT ?")
    .all(limit)
    .map(rowToResource);

  if (!tag) return rows;
  return rows.filter((resource) =>
    resource.tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
  );
}
