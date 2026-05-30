import { PermissionsBitField } from "discord.js";

export function isValidUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseTags(input) {
  if (!input) return [];
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function parseColor(input) {
  if (!input) return null;
  const cleaned = input.trim().replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return parseInt(cleaned, 16);
  }
  return null;
}

export function requireAdmin(interaction) {
  return interaction.memberPermissions?.has(
    PermissionsBitField.Flags.ManageGuild,
  );
}

export function ensureGuild(interaction) {
  return Boolean(interaction.guildId);
}

export function formatDateTime(date, timeZone) {
  const value = typeof date === "string" ? new Date(date) : date;
  if (!value || Number.isNaN(value.getTime())) return "Unknown";
  return value.toLocaleString("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getRoleMention(roleId, guildId) {
  if (!roleId) return "";
  if (roleId === guildId) return "@everyone";
  return `<@&${roleId}>`;
}
