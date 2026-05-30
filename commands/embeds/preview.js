import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { buildCustomEmbed } from "../../utils/embedUtils.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("embed-preview")
    .setDescription("Preview your embed draft"),
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
    const draft = drafts.get(interaction.user.id);

    if (!draft) {
      return safeReply(interaction, {
        content: "You do not have an active embed draft.",
        ephemeral: true,
      });
    }

    const embed = buildCustomEmbed(draft);

    return safeReply(interaction, {
      embeds: [embed],
      ephemeral: true,
    });
  },
};
