import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { updateGuildConfig } from "../../models/GuildConfig.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("contest-channel")
    .setDescription("Set contest alert channel")
    .addChannelOption((option) =>
      option.setName("channel").setDescription("Channel").setRequired(true),
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

    const channel = interaction.options.getChannel("channel");
    updateGuildConfig(interaction.guildId, { contestChannelId: channel.id });

    return safeReply(interaction, {
      content: `Contest channel set to ${channel}.`,
      ephemeral: true,
    });
  },
};
