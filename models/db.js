import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "../config/constants.js";

let db;

export function initDatabase() {
  if (db) return db;

  const dbPath = path.resolve(env.dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_configs (
      guild_id TEXT PRIMARY KEY,
      contest_channel_id TEXT DEFAULT '',
      contest_role_id TEXT DEFAULT '',
      potd_channel_id TEXT DEFAULT '',
      potd_role_id TEXT DEFAULT '',
      resource_channel_id TEXT DEFAULT '',
      job_channel_id TEXT DEFAULT '',
      last_contest_alert_at TEXT DEFAULT '',
      last_potd_sent_at TEXT DEFAULT '',
      last_job_sent_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      contest_name TEXT NOT NULL,
      contest_link TEXT NOT NULL,
      contest_time TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT '',
      reminder_sent_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(platform, contest_name, contest_time)
    );

    CREATE TABLE IF NOT EXISTS potd (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      problem_name TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Unknown',
      problem_link TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(platform, problem_name, date)
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL,
      attachments TEXT NOT NULL DEFAULT '[]',
      thumbnail TEXT NOT NULL DEFAULT '',
      author_id TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_handles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(guild_id, user_id, platform)
    );

    CREATE TABLE IF NOT EXISTS duels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      challenger_id TEXT NOT NULL,
      opponent_id TEXT NOT NULL,
      contest_id INTEGER NOT NULL,
      problem_index TEXT NOT NULL,
      time_limit INTEGER NOT NULL,
      status TEXT NOT NULL,
      winner_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT DEFAULT NULL,
      expires_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS starboard (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  return db;
}

export function getDb() {
  if (!db) return initDatabase();
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

export function toIso(value) {
  return new Date(value).toISOString();
}
