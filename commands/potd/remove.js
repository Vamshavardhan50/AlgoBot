import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { removePotd } from "../../models/POTD.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("potd-remove")
    .setDescription("Remove a POTD")
    .addIntegerOption((option) =>
      option.setName("potd_id").setDescription("POTD ID").setRequired(true),
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

    const id = interaction.options.getInteger("potd_id");
    const removed = removePotd(id);

    if (!removed) {
      return safeReply(interaction, {
        content: "POTD not found.",
        ephemeral: true,
      });
    }

    return safeReply(interaction, {
      content: `Removed POTD: ${removed.problemName}.`,
      ephemeral: true,
    });
  },
};
