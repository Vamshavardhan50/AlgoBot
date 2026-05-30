import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("embed-clear")
    .setDescription("Clear your embed draft"),
  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return safeReply(interaction, {
        content: "You need Manage Server permissions.",
        ephemeral: true,
      });
    }

    const drafts = interaction.client.context.embedDrafts;
    drafts.delete(interaction.user.id);

    return safeReply(interaction, {
      content: "Embed draft cleared.",
      ephemeral: true,
    });
  },
};
