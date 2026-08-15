import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { createContest } from "../../models/Contest.js";
import { safeReply } from "../../utils/interaction.js";
import { isValidUrl } from "../../utils/validation.js";

function parseContestTime(value) {
  if (!value) return null;
  const trimmed = value.trim();
  // If ISO string with timezone provided
  if (trimmed.includes("Z") || /[\+\-]\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Otherwise default to IST (+05:30) if local time string is provided (e.g. 2026-08-15 20:00)
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const withTz = `${normalized}+05:30`;
  const parsed = new Date(withTz);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName("contest-add")
    .setDescription("Add a contest")
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Contest platform")
        .setRequired(true)
        .addChoices(
          { name: "Codeforces", value: "Codeforces" },
          { name: "LeetCode", value: "LeetCode" },
          { name: "CodeChef", value: "CodeChef" },
          { name: "AtCoder", value: "AtCoder" },
          { name: "Other", value: "Other" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("contest_name")
        .setDescription("Contest name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("contest_link")
        .setDescription("Contest link")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("contest_time")
        .setDescription("Start time (ISO or YYYY-MM-DD HH:mm)")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration in minutes")
        .setRequired(true),
    ),
  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return safeReply(interaction, {
        content: "You need Manage Server permissions.",
        ephemeral: true,
      });
    }

    const platform = interaction.options.getString("platform");
    const contestName = interaction.options.getString("contest_name");
    const contestLink = interaction.options.getString("contest_link");
    const contestTimeRaw = interaction.options.getString("contest_time");
    const duration = interaction.options.getInteger("duration");

    if (!isValidUrl(contestLink)) {
      return safeReply(interaction, {
        content: "Please provide a valid contest link.",
        ephemeral: true,
      });
    }

    const contestTime = parseContestTime(contestTimeRaw);
    if (!contestTime) {
      return safeReply(interaction, {
        content: "Invalid contest time format.",
        ephemeral: true,
      });
    }

    const result = createContest({
      platform,
      contestName,
      contestLink,
      contestTime,
      duration,
      createdBy: interaction.user.id,
    });

    return safeReply(interaction, {
      content: `Contest saved with ID ${result.contest?.id ?? "unknown"}.`,
      ephemeral: true,
    });
  },
};
