import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { createPotd, formatPotdDate } from "../../models/POTD.js";
import { isValidUrl } from "../../utils/validation.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("potd-add")
    .setDescription("Add a Problem of the Day")
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Platform")
        .setRequired(true)
        .addChoices(
          { name: "LeetCode", value: "LeetCode" },
          { name: "Codeforces", value: "Codeforces" },
          { name: "GeeksforGeeks", value: "GeeksforGeeks" },
          { name: "CodeChef", value: "CodeChef" },
          { name: "AtCoder", value: "AtCoder" },
          { name: "Other", value: "Other" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("problem_name")
        .setDescription("Problem name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("problem_link")
        .setDescription("Problem link")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("difficulty")
        .setDescription("Difficulty")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Date (YYYY-MM-DD)")
        .setRequired(false),
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
    const problemName = interaction.options.getString("problem_name");
    const difficulty = interaction.options.getString("difficulty") || "Unknown";
    const problemLink = interaction.options.getString("problem_link");
    const date = interaction.options.getString("date") || formatPotdDate();

    if (!isValidUrl(problemLink)) {
      return safeReply(interaction, {
        content: "Please provide a valid problem link.",
        ephemeral: true,
      });
    }

    const potd = createPotd({
      platform,
      problemName,
      difficulty,
      problemLink,
      date,
    });

    return safeReply(interaction, {
      content: `POTD saved with ID ${potd?.id ?? "unknown"}.`,
      ephemeral: true,
    });
  },
};
