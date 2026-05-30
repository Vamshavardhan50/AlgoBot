import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { removeContest } from "../../models/Contest.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("contest-remove")
    .setDescription("Remove a contest")
    .addIntegerOption((option) =>
      option
        .setName("contest_id")
        .setDescription("Contest ID")
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

    const contestId = interaction.options.getInteger("contest_id");
    const removed = removeContest(contestId);

    if (!removed) {
      return safeReply(interaction, {
        content: "Contest not found.",
        ephemeral: true,
      });
    }

    return safeReply(interaction, {
      content: `Contest ${removed.contestName} removed.`,
      ephemeral: true,
    });
  },
};
