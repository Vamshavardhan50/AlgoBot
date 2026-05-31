import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { listUpcoming } from "../../models/Contest.js";
import { getGuildConfig, updateGuildConfig } from "../../models/GuildConfig.js";
import { env } from "../../config/constants.js";
import { buildContestEmbed } from "../../utils/embedUtils.js";
import { getRoleMention, sendWithTempMention } from "../../utils/validation.js";
import { generateFlirtyReminder } from "../../services/groqService.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("contest-send")
    .setDescription("Send today's contest alert"),
  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return safeReply(interaction, {
        content: "You need Manage Server permissions.",
        ephemeral: true,
      });
    }

    const config = getGuildConfig(interaction.guildId);
    if (!config?.contestChannelId) {
      return safeReply(interaction, {
        content: "Contest channel is not configured.",
        ephemeral: true,
      });
    }

    const channel = await interaction.client.channels
      .fetch(config.contestChannelId)
      .catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return safeReply(interaction, {
        content: "Contest channel is not available.",
        ephemeral: true,
      });
    }

    const contests = listUpcoming({ limit: 10 });
    if (!contests.length) {
      return safeReply(interaction, {
        content: "No upcoming contests to send.",
        ephemeral: true,
      });
    }

    const embeds = contests.map((contest) =>
      buildContestEmbed({
        platform: contest.platform,
        contestName: contest.contestName,
        contestTime: contest.contestTime,
        duration: contest.duration,
        link: contest.contestLink,
        statusText: "Upcoming Contest",
      }),
    );

    const flirtyText = await generateFlirtyReminder("contest");
    const mention = getRoleMention(config.contestRoleId, interaction.guildId);
    const content = mention ? `${flirtyText}\n${mention}` : flirtyText;

    await sendWithTempMention(channel, content, embeds, config.contestRoleId);

    const todayKey = new Date().toLocaleDateString("en-CA", {
      timeZone: env.timezone,
    });
    updateGuildConfig(interaction.guildId, { lastContestAlertAt: todayKey });

    return safeReply(interaction, {
      content: "Contest alerts sent.",
      ephemeral: true,
    });
  },
};
