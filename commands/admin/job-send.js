import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { safeReply } from "../../utils/interaction.js";
import { sendJobAlerts } from "../../services/jobScraper.js";
import { getGuildConfig } from "../../models/GuildConfig.js";

export default {
  data: new SlashCommandBuilder()
    .setName("job-send")
    .setDescription("Fetch and broadcast fresh job opportunities (2-3 jobs) to the job alerts channel")
    .addIntegerOption((option) =>
      option
        .setName("count")
        .setDescription("Number of jobs to send (default: 3, max: 5)")
        .setMinValue(1)
        .setMaxValue(5),
    ),
  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return safeReply(interaction, {
        content: "You need Manage Server permissions to run this command.",
        ephemeral: true,
      });
    }

    const config = getGuildConfig(interaction.guildId);
    if (!config?.jobChannelId) {
      return safeReply(interaction, {
        content: "No job alerts channel configured yet. Use `/job-channel` first to set one!",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const count = interaction.options.getInteger("count") || 3;
    const result = await sendJobAlerts(interaction.client, { forceCount: count });

    if (result.count === 0) {
      return safeReply(interaction, {
        content: "No job listings could be scraped or retrieved right now. Please try again in a few minutes.",
        ephemeral: true,
      });
    }

    return safeReply(interaction, {
      content: `Dispatched **${result.count}** fresh job opportunities to <#${config.jobChannelId}>!`,
      ephemeral: true,
    });
  },
};
