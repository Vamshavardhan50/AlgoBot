import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";
import { getGuildConfig } from "../../models/GuildConfig.js";
import { createResource } from "../../models/Resource.js";
import { buildResourceEmbed } from "../../utils/embedUtils.js";
import { safeReply } from "../../utils/interaction.js";
import { isValidUrl, parseTags } from "../../utils/validation.js";

function collectAttachments(interaction) {
  const attachments = [
    interaction.options.getAttachment("attachment"),
    interaction.options.getAttachment("attachment2"),
    interaction.options.getAttachment("attachment3"),
  ].filter(Boolean);

  const files = attachments.map(
    (att) => new AttachmentBuilder(att.url, { name: att.name }),
  );

  const meta = attachments.map((att) => ({
    url: att.url,
    name: att.name,
    contentType: att.contentType || "",
  }));

  return { files, meta, attachments };
}

export default {
  data: new SlashCommandBuilder()
    .setName("resource-share")
    .setDescription("Share a resource")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Resource title")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("link").setDescription("Resource link").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("Resource description")
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName("attachment")
        .setDescription("Attach a file (PDF, ZIP, image)")
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName("attachment2")
        .setDescription("Second attachment")
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName("attachment3")
        .setDescription("Third attachment")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("thumbnail")
        .setDescription("Thumbnail URL")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("image").setDescription("Image URL").setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("tags")
        .setDescription("Comma-separated tags")
        .setRequired(false),
    ),
  async execute(interaction) {
    const title = interaction.options.getString("title");
    const description = (interaction.options.getString("content") || "").replace(/\\n/g, "\n");
    const link = interaction.options.getString("link");
    const thumbnail = interaction.options.getString("thumbnail") || "";
    const image = interaction.options.getString("image") || "";
    const tags = parseTags(interaction.options.getString("tags"));

    if (!isValidUrl(link)) {
      return safeReply(interaction, {
        content: "Please provide a valid resource link.",
        ephemeral: true,
      });
    }

    if (thumbnail && !isValidUrl(thumbnail)) {
      return safeReply(interaction, {
        content: "Thumbnail must be a valid URL.",
        ephemeral: true,
      });
    }

    if (image && !isValidUrl(image)) {
      return safeReply(interaction, {
        content: "Image must be a valid URL.",
        ephemeral: true,
      });
    }

    const { files, meta, attachments } = collectAttachments(interaction);
    const imageAttachment = attachments.find((att) =>
      att.contentType?.startsWith("image/"),
    );

    const embed = buildResourceEmbed({
      title,
      description,
      link,
      tags,
      attachmentsCount: meta.length,
      authorId: interaction.user.id,
      thumbnail,
      image: image || imageAttachment?.url || "",
    });

    const config = getGuildConfig(interaction.guildId);
    let targetChannel = interaction.channel;
    if (config?.resourceChannelId) {
      const configured = await interaction.client.channels
        .fetch(config.resourceChannelId)
        .catch(() => null);
      if (configured?.isTextBased()) targetChannel = configured;
    }

    if (!targetChannel || !targetChannel.isTextBased()) {
      return safeReply(interaction, {
        content: "No valid resource channel configured.",
        ephemeral: true,
      });
    }

    const components = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Open Resource")
          .setStyle(ButtonStyle.Link)
          .setURL(link),
      ),
    ];

    await targetChannel.send({ embeds: [embed], files, components });

    const resource = createResource({
      title,
      description,
      link,
      attachments: meta,
      thumbnail,
      authorId: interaction.user.id,
      tags,
    });

    return safeReply(interaction, {
      content: `Resource shared. ID: ${resource.id}.`,
      ephemeral: true,
    });
  },
};
