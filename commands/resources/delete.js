import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { deleteResource } from "../../models/Resource.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resource-delete")
    .setDescription("Delete a resource")
    .addIntegerOption((option) =>
      option
        .setName("resource_id")
        .setDescription("Resource ID")
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

    const resourceId = interaction.options.getInteger("resource_id");
    const removed = deleteResource(resourceId);

    if (!removed) {
      return safeReply(interaction, {
        content: "Resource not found.",
        ephemeral: true,
      });
    }

    return safeReply(interaction, {
      content: `Resource ${removed.title} deleted.`,
      ephemeral: true,
    });
  },
};
