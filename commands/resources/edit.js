import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { updateResource } from "../../models/Resource.js";
import { isValidUrl, parseTags } from "../../utils/validation.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resource-edit")
    .setDescription("Edit a resource")
    .addIntegerOption((option) =>
      option
        .setName("resource_id")
        .setDescription("Resource ID")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("Title").setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("Description")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("link").setDescription("Link").setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("thumbnail")
        .setDescription("Thumbnail URL")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("tags")
        .setDescription("Comma-separated tags")
        .setRequired(false),
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

    const resourceId = interaction.options.getInteger("resource_id");
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("content") ? interaction.options.getString("content").replace(/\\n/g, "\n") : undefined;
    const link = interaction.options.getString("link");
    const thumbnail = interaction.options.getString("thumbnail");
    const tags = interaction.options.getString("tags");

    if (link && !isValidUrl(link)) {
      return safeReply(interaction, {
        content: "Please provide a valid link.",
        ephemeral: true,
      });
    }

    if (thumbnail && !isValidUrl(thumbnail)) {
      return safeReply(interaction, {
        content: "Please provide a valid thumbnail URL.",
        ephemeral: true,
      });
    }

    const updated = updateResource(resourceId, {
      title,
      description,
      link,
      thumbnail,
      tags: tags ? parseTags(tags) : undefined,
    });

    if (!updated) {
      return safeReply(interaction, {
        content: "Resource not found.",
        ephemeral: true,
      });
    }

    return safeReply(interaction, {
      content: `Resource ${updated.id} updated.`,
      ephemeral: true,
    });
  },
};
