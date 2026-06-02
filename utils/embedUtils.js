import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { embedColors, env } from "../config/constants.js";

function getContestSlug(link) {
  if (!link) return "0000";
  try {
    const parts = link.replace(/\/$/, "").split("/");
    return parts[parts.length - 1];
  } catch {
    return "0000";
  }
}

function formatContestDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Unknown Date";
  
  const timezone = env.timezone || "Asia/Kolkata";
  
  try {
    const day = d.toLocaleDateString("en-IN", { timeZone: timezone, day: "numeric" });
    const month = d.toLocaleDateString("en-IN", { timeZone: timezone, month: "short" });
    const year = d.toLocaleDateString("en-IN", { timeZone: timezone, year: "2-digit" });
    const time = d.toLocaleTimeString("en-IN", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
    
    const tzLabel = timezone === "Asia/Kolkata" ? "IST" : "Local";
    return `${day} ${month} ${year}, ${time} ${tzLabel}`;
  } catch {
    return d.toUTCString();
  }
}

function formatDuration(mins) {
  if (!mins) return "Unknown Duration";
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
}

export function buildContestEmbed({
  platform,
  contestName,
  contestTime,
  duration,
  link,
  statusText,
}) {
  const slug = getContestSlug(link);
  const formattedTime = formatContestDate(contestTime);
  const formattedDuration = formatDuration(duration);
  
  const lines = [];
  if (statusText) {
    lines.push(statusText);
    lines.push("");
  }
  lines.push(`**${contestName}**`);
  lines.push(`\`${slug} | ${formattedTime} | ${formattedDuration}\` | [link ↗](${link})`);

  // Beautiful platform-specific embed colors
  let color = embedColors.contest;
  if (platform === "LeetCode") color = 0xffa116; // LeetCode Yellow
  else if (platform === "Codeforces") color = 0xff5555; // Codeforces Red
  else if (platform === "CodeChef") color = 0x7851a9; // CodeChef Purple
  else if (platform === "AtCoder") color = 0x333333; // AtCoder Dark Gray

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(lines.join("\n"));
}

export function buildPotdEmbed({ platform, problemName, difficulty, link }) {
  const lines = [
    "🔥 **Problem Of The Day**",
    "",
    `**${problemName}**`,
    `\`${platform} | Difficulty: ${difficulty}\` | [solve ↗](${link})`,
  ];

  let color = embedColors.potd;
  if (platform === "LeetCode") color = 0xffa116; // LeetCode Yellow
  else if (platform === "GeeksforGeeks") color = 0x2ecc71; // GFG Green
  else if (platform === "Codeforces") color = 0xff5555; // Codeforces Red

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(lines.join("\n"));
}

export function buildResourceEmbed({
  title,
  description,
  link,
  tags,
  attachmentsCount,
  authorId,
}) {
  const lines = [
    "📚 **New Resource Shared**",
    "",
    `**${title}**`,
  ];

  if (description) {
    lines.push(description);
    lines.push("");
  }

  const meta = [];
  if (authorId) meta.push(`Shared by: <@${authorId}>`);
  if (attachmentsCount) meta.push(`Files: ${attachmentsCount}`);

  if (meta.length) {
    lines.push(`\`${meta.join(" | ")}\``);
  }

  if (tags?.length) {
    lines.push(tags.map((t) => `#${t}`).join(" "));
  }

  const embed = new EmbedBuilder()
    .setColor(embedColors.resource)
    .setDescription(lines.join("\n"));

  if (link) {
    embed.setDescription(embed.data.description + ` | [open ↗](${link})`);
  }

  return embed;
}

export function buildCustomEmbed(draft) {
  const embed = new EmbedBuilder()
    .setTitle(draft.title || "Custom Embed")
    .setColor(draft.color || embedColors.system);

  if (draft.description) {
    embed.setDescription(draft.description);
  }

  return embed;
}
