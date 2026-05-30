import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { listResources } from "../../models/Resource.js";
import { embedColors } from "../../config/constants.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resource-list")
    .setDescription("List shared resources")
    .addStringOption((option) =>
      option.setName("tag").setDescription("Filter by tag").setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("How many resources to show")
        .setRequired(false),
    ),
  async execute(interaction) {
    const tag = interaction.options.getString("tag");
    const limit = interaction.options.getInteger("limit") || 10;
    const resources = listResources({ tag, limit });

    const embed = new EmbedBuilder()
      .setColor(embedColors.resource)
      .setTitle("Shared Resources");

    if (!resources.length) {
      embed.setDescription("No resources available.");
    } else {
      embed.setDescription(
        resources
          .map(
            (resource) =>
              `**${resource.title}**\n${resource.link}\nID: ${resource.id}`,
          )
          .join("\n\n"),
      );
    }

    return safeReply(interaction, { embeds: [embed] });
  },
};
