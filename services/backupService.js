import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import axios from "axios";
import { env } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import { closeDatabase, initDatabase } from "../models/db.js";

const BACKUP_CHANNEL_NAME = "algobot-db-backup";
let backupTimeout = null;
let discordClient = null;

export function initBackupService(client) {
  discordClient = client;
}

export async function restoreDatabaseFromDiscord(client) {
  try {
    logger.info("BackupService: Attempting to restore database from Discord...");
    let backupChannel = null;

    // Search all guilds for the backup channel by fetching channels to bypass startup cache limits
    for (const guild of client.guilds.cache.values()) {
      const channels = await guild.channels.fetch().catch(() => null);
      if (!channels) continue;
      const channel = channels.find(
        (c) => c.name === BACKUP_CHANNEL_NAME && c.isTextBased()
      );
      if (channel) {
        backupChannel = channel;
        break;
      }
    }

    if (!backupChannel) {
      logger.info("BackupService: No backup channel found on Discord.");
      initDatabase();
      return;
    }

    // Fetch the last few messages in the backup channel
    const messages = await backupChannel.messages.fetch({ limit: 10 }).catch(() => []);
    const backupMessage = messages.find((m) =>
      m.attachments.some((a) => a.name === "algobot.db")
    );

    if (!backupMessage) {
      logger.info("BackupService: Backup channel exists but no database attachment was found.");
      initDatabase();
      return;
    }

    const dbPath = path.resolve(env.dbPath);
    const backupTime = new Date(backupMessage.createdAt).getTime();

    // Check if local database exists and has meaningful data
    if (fs.existsSync(dbPath)) {
      let localTime = 0;
      try {
        const tempDb = new Database(dbPath);
        tempDb.pragma("journal_mode = WAL");
        const row = tempDb.prepare("SELECT COUNT(*) as count, MAX(updated_at) as latest FROM guild_configs").get();
        tempDb.close();

        if ((row?.count || 0) > 0) {
          localTime = row.latest ? new Date(row.latest).getTime() : 0;

          if (localTime >= backupTime) {
            logger.info("BackupService: Local database is up-to-date or newer than backup. Skipping restore.");
            initDatabase();
            return;
          }

          logger.info(`BackupService: Backup (${new Date(backupTime).toISOString()}) is newer than local (${new Date(localTime).toISOString()}). Restoring...`);
        } else {
          logger.info("BackupService: Local database is empty. Restoring from backup...");
        }
      } catch {
        logger.info("BackupService: Could not read local database. Restoring from backup...");
      }
    } else {
      logger.info("BackupService: No local database found. Restoring from backup...");
    }

    const attachment = backupMessage.attachments.find((a) => a.name === "algobot.db");
    logger.info(`BackupService: Downloading backup from ${backupMessage.createdAt}...`);

    // Download the attachment using axios
    const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
    
    // Close active DB, overwrite file, and re-initialize DB
    closeDatabase();
    
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, Buffer.from(response.data));
    
    initDatabase();
    logger.info("BackupService: Database restored successfully from Discord attachment!");
  } catch (error) {
    logger.error("BackupService: Failed to restore database", error?.message || error);
    // Ensure DB is initialized anyway
    initDatabase();
  }
}

export function triggerBackup() {
  if (!discordClient) return;

  if (backupTimeout) {
    clearTimeout(backupTimeout);
  }

  // Debounce backup by 5 seconds to prevent rate-limiting on multiple rapid writes
  backupTimeout = setTimeout(() => {
    runBackup(discordClient).catch((err) => {
      logger.error("BackupService: Scheduled backup failed", err?.message || err);
    });
  }, 5000);
}

async function runBackup(client) {
  try {
    logger.info("BackupService: Running database backup to Discord...");
    let backupChannel = null;

    // Search all guilds for the backup channel by fetching channels to bypass cache limits
    for (const guild of client.guilds.cache.values()) {
      const channels = await guild.channels.fetch().catch(() => null);
      if (!channels) continue;
      const channel = channels.find(
        (c) => c.name === BACKUP_CHANNEL_NAME && c.isTextBased()
      );
      if (channel) {
        backupChannel = channel;
        break;
      }
    }

    // If no backup channel exists, create one in the first guild where we have permissions
    if (!backupChannel) {
      const firstGuild = client.guilds.cache.first();
      if (!firstGuild) {
        logger.warn("BackupService: No guilds available to create backup channel.");
        return;
      }

      logger.info(`BackupService: Creating private backup channel in guild "${firstGuild.name}"...`);
      backupChannel = await firstGuild.channels.create({
        name: BACKUP_CHANNEL_NAME,
        type: 0, // Text channel
        topic: "AlgoBot SQLite Database Backup Channel (DO NOT DELETE)",
        permissionOverwrites: [
          {
            id: firstGuild.roles.everyone.id,
            deny: ["ViewChannel"], // Hide from everyone
          },
          {
            id: client.user.id,
            allow: ["ViewChannel", "SendMessages", "AttachFiles", "ReadMessageHistory"],
          }
        ]
      }).catch((err) => {
        logger.error(`BackupService: Failed to create backup channel in guild "${firstGuild.name}"`, err);
        return null;
      });
    }

    if (!backupChannel) {
      logger.warn("BackupService: Could not find or create a backup channel. Skipping backup.");
      return;
    }

    const dbPath = path.resolve(env.dbPath);
    if (!fs.existsSync(dbPath)) {
      logger.warn("BackupService: Local database file does not exist. Skipping backup.");
      return;
    }

    // Fetch existing messages to clean up old backups
    const messages = await backupChannel.messages.fetch({ limit: 20 }).catch(() => []);
    const oldBackups = messages.filter((m) => m.author.id === client.user.id);

    // Upload the file
    logger.info("BackupService: Uploading database file...");
    await backupChannel.send({
      content: `🔄 **AlgoBot DB Backup** | Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      files: [dbPath]
    });

    // Delete old backup messages to keep the channel clean
    for (const msg of oldBackups.values()) {
      await msg.delete().catch(() => null);
    }

    logger.info("BackupService: Backup completed successfully and old backups cleaned up!");
  } catch (error) {
    logger.error("BackupService: Backup failed", error?.message || error);
  }
}
