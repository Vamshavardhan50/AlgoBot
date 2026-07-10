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
    const opts = { timeZone: timezone };
    const day = d.toLocaleDateString("en-CA", { ...opts, day: "numeric" });
    const month = d.toLocaleDateString("en-CA", { ...opts, month: "short" });
    const year = d.toLocaleDateString("en-CA", { ...opts, year: "2-digit" });
    const time = d.toLocaleTimeString("en-CA", { ...opts, hour: "2-digit", minute: "2-digit", hour12: false });

    const tzLabel = timezone === "Asia/Kolkata" ? "IST" : timezone.split("/").pop() || "Local";
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

export function buildJobEmbed({ title, description, applyLink, categories, date, url }) {
  const emojiMap = {
    Freshers: "🎓",
    Experienced: "💼",
    Internships: "📋",
    Remote: "🏠",
    Hackathons: "⚡",
    Trainee: "📚",
  };

  const categoryStr = categories
    .map((c) => `${emojiMap[c] || "📌"} ${c}`)
    .join(" | ");

  const lines = ["📢 **New Job Opportunity**", ""];

  if (categoryStr) {
    lines.push(categoryStr);
    lines.push("");
  }

  lines.push(`**${title}**`);
  lines.push("");

  if (description) {
    const clean = description.replace(/<[^>]*>/g, "").trim();
    const truncated = clean.length > 250 ? clean.slice(0, 250) + "…" : clean;
    lines.push(truncated);
    lines.push("");
  }

  if (url) {
    lines.push(`[View Details ↗](${url})`);
  }

  if (applyLink) {
    lines.push(`[Apply Now ↗](${applyLink})`);
  }

  let color = 0x00b894;
  if (categories.includes("Internships")) color = 0x00cec9;
  else if (categories.includes("Experienced")) color = 0x6c5ce7;
  else if (categories.includes("Remote")) color = 0xfdcb6e;
  else if (categories.includes("Hackathons")) color = 0xe17055;
  else if (categories.includes("Trainee")) color = 0x0984e3;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(lines.join("\n"))
    .setTimestamp();

  if (date) {
    embed.setFooter({ text: `Posted: ${date}` });
  }

  return embed;
}
