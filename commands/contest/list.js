import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { listUpcoming } from "../../models/Contest.js";
import { env, embedColors } from "../../config/constants.js";
import { formatDateTime } from "../../utils/validation.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("contest-list")
    .setDescription("List upcoming contests")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("How many contests to show")
        .setRequired(false),
    ),
  async execute(interaction) {
    const limit = interaction.options.getInteger("limit") || 10;
    const contests = listUpcoming({ limit });

    const embed = new EmbedBuilder()
      .setColor(embedColors.contest)
      .setTitle("Upcoming Contests");

    if (!contests.length) {
      embed.setDescription("No contests scheduled.");
    } else {
      embed.setDescription(
        contests
          .map(
            (contest) =>
              `**${contest.contestName}** (${contest.platform})\nStarts: ${formatDateTime(
                contest.contestTime,
                env.timezone,
              )}\nID: ${contest.id}`,
          )
          .join("\n\n"),
      );
    }

    return safeReply(interaction, { embeds: [embed] });
  },
};
