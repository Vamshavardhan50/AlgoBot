import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { updateGuildConfig } from "../../models/GuildConfig.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("contest-role")
    .setDescription("Set contest alert role")
    .addRoleOption((option) =>
      option.setName("role").setDescription("Role").setRequired(true),
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

    const role = interaction.options.getRole("role");
    updateGuildConfig(interaction.guildId, { contestRoleId: role.id });

    return safeReply(interaction, {
      content: `Contest role set to ${role}.`,
      ephemeral: true,
    });
  },
};
