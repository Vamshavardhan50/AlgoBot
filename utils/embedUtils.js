import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { embedColors } from "../config/constants.js";

export function buildContestEmbed({
  platform,
  contestName,
  contestTime,
  duration,
  link,
}) {
  return new EmbedBuilder()
    .setColor(embedColors.contest)
    .setTitle("🚨 Contest Alert")
    .addFields(
      { name: "Platform", value: platform || "Unknown", inline: true },
      { name: "Contest", value: contestName || "Unknown", inline: true },
      { name: "Start Time", value: contestTime || "Unknown", inline: true },
      {
        name: "Duration",
        value: duration ? `${duration} mins` : "Unknown",
        inline: true,
      },
      {
        name: "Link",
        value: link ? `[Register](${link})` : "Not available",
        inline: false,
      },
    )
    .setFooter({ text: "AlgoBot" });
}

export function buildPotdEmbed({ platform, problemName, difficulty, link }) {
  return new EmbedBuilder()
    .setColor(embedColors.potd)
    .setTitle("🔥 Problem Of The Day")
    .addFields(
      { name: "Platform", value: platform || "Unknown", inline: true },
      { name: "Problem", value: problemName || "Unknown", inline: false },
      { name: "Difficulty", value: difficulty || "Unknown", inline: true },
      {
        name: "Link",
        value: link ? `[Solve](${link})` : "Not available",
        inline: false,
      },
    )
    .setFooter({ text: "AlgoBot" });
}

export function buildResourceEmbed({
  title,
  description,
  link,
  tags,
  attachmentsCount,
  authorId,
  thumbnail,
  image,
}) {
  const embed = new EmbedBuilder()
    .setColor(embedColors.resource)
    .setTitle(title || "📚 Resource")
    .setDescription(description || "Shared resource")
    .addFields({
      name: "Link",
      value: link ? `[Open Resource](${link})` : "Not available",
      inline: false,
    })
    .setFooter({ text: "Shared via AlgoBot" });

  if (authorId) {
    embed.addFields({
      name: "Shared By",
      value: `<@${authorId}>`,
      inline: true,
    });
  }

  if (tags?.length) {
    embed.addFields({
      name: "Tags",
      value: tags.map((t) => `#${t}`).join(" "),
      inline: false,
    });
  }

  if (attachmentsCount) {
    embed.addFields({
      name: "Attachments",
      value: `${attachmentsCount} file(s)`,
      inline: true,
    });
  }

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  if (image) {
    embed.setImage(image);
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
