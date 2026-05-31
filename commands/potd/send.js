import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../../models/GuildConfig.js";
import { ensureTodayPotd } from "../../services/potdService.js";
import { buildPotdEmbed } from "../../utils/embedUtils.js";
import { safeReply } from "../../utils/interaction.js";
import { formatPotdDate } from "../../models/POTD.js";
import { getRoleMention, sendWithTempMention } from "../../utils/validation.js";
import { generateFlirtyReminder } from "../../services/groqService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("potd-send")
    .setDescription("Send today's POTD"),
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
    if (!config?.potdChannelId) {
      return safeReply(interaction, {
        content: "POTD channel is not configured.",
        ephemeral: true,
      });
    }

    const channel = await interaction.client.channels
      .fetch(config.potdChannelId)
      .catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return safeReply(interaction, {
        content: "POTD channel is not available.",
        ephemeral: true,
      });
    }

    const potds = await ensureTodayPotd();
    if (!potds || !potds.length) {
      return safeReply(interaction, {
        content: "No POTD available to send.",
        ephemeral: true,
      });
    }

    const embeds = potds.map((potd) =>
      buildPotdEmbed({
        platform: potd.platform,
        problemName: potd.problemName,
        difficulty: potd.difficulty,
        link: potd.problemLink,
      }),
    );

    const flirtyText = await generateFlirtyReminder("potd");
    const mention = getRoleMention(config.potdRoleId, interaction.guildId);
    const content = mention ? `${flirtyText}\n${mention}` : flirtyText;

    await sendWithTempMention(channel, content, embeds, config.potdRoleId);

    updateGuildConfig(interaction.guildId, {
      lastPotdSentAt: formatPotdDate(new Date()),
    });

    return safeReply(interaction, {
      content: "POTD sent.",
      ephemeral: true,
    });
  },
};
