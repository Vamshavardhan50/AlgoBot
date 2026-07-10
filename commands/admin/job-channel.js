import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { updateGuildConfig } from "../../models/GuildConfig.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("job-channel")
    .setDescription("Set job alerts channel (jobcode.in)")
    .addChannelOption((option) =>
      option.setName("channel").setDescription("Channel for job alerts").setRequired(true),
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
    updateGuildConfig(interaction.guildId, { jobChannelId: channel.id });

    return safeReply(interaction, {
      content: `Job alerts channel set to ${channel}. Daily job alerts will be sent at 12:00 PM.`,
      ephemeral: true,
    });
  },
};
