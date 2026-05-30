import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { listPotd } from "../../models/POTD.js";
import { embedColors } from "../../config/constants.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("potd-list")
    .setDescription("List recent POTDs")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("How many POTDs to show")
        .setRequired(false),
    ),
  async execute(interaction) {
    const limit = interaction.options.getInteger("limit") || 10;
    const potds = listPotd({ limit });

    const embed = new EmbedBuilder()
      .setColor(embedColors.potd)
      .setTitle("Recent POTDs");

    if (!potds.length) {
      embed.setDescription("No POTDs available.");
    } else {
      embed.setDescription(
        potds
          .map(
            (potd) =>
              `**${potd.problemName}** (${potd.platform})\nDifficulty: ${potd.difficulty}\nDate: ${potd.date}\nID: ${potd.id}`,
          )
          .join("\n\n"),
      );
    }

    return safeReply(interaction, { embeds: [embed] });
  },
};
