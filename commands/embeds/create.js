import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { buildCustomEmbed } from "../../utils/embedUtils.js";
import { safeReply } from "../../utils/interaction.js";
import { parseColor } from "../../utils/validation.js";

export default {
  data: new SlashCommandBuilder()
    .setName("embed-create")
    .setDescription("Create a custom embed draft")
    .addStringOption((option) =>
      option.setName("title").setDescription("Title").setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("color").setDescription("Hex color").setRequired(false),
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

    const title = interaction.options.getString("title") || "";
    const description = (interaction.options.getString("description") || "").replace(/\\n/g, "\n");
    const colorInput = interaction.options.getString("color") || "";

    const color = parseColor(colorInput);
    if (colorInput && !color) {
      return safeReply(interaction, {
        content: "Color must be a valid hex value (e.g. #ff9900).",
        ephemeral: true,
      });
    }

    const drafts = interaction.client.context.embedDrafts;
    const draft = {
      title,
      description,
      color,
    };

    drafts.set(interaction.user.id, draft);

    const embed = buildCustomEmbed(draft);

    return safeReply(interaction, {
      content: "Embed draft created. Preview below.",
      embeds: [embed],
      ephemeral: true,
    });
  },
};
