import { AttachmentBuilder, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { buildCustomEmbed } from "../../utils/embedUtils.js";
import { safeReply } from "../../utils/interaction.js";
import { getRoleMention } from "../../utils/validation.js";

function collectAttachments(interaction) {
  const attachments = [
    interaction.options.getAttachment("attachment"),
    interaction.options.getAttachment("attachment2"),
    interaction.options.getAttachment("attachment3"),
  ].filter(Boolean);

  const files = attachments.map(
    (att) => new AttachmentBuilder(att.url, { name: att.name }),
  );

  return { files };
}

export default {
  data: new SlashCommandBuilder()
    .setName("embed-send")
    .setDescription("Send your embed draft to a channel with optional file attachments")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Target channel")
        .setRequired(true),
    )
    .addAttachmentOption((option) =>
      option
        .setName("attachment")
        .setDescription("Attach a file (PDF, ZIP, image, etc.)")
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
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to mention/ping")
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

    const drafts = interaction.client.context.embedDrafts;
    const draft = drafts.get(interaction.user.id);

    if (!draft) {
      return safeReply(interaction, {
        content: "You do not have an active embed draft.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");
    if (!channel?.isTextBased()) {
      return safeReply(interaction, {
        content: "Please choose a text channel.",
        ephemeral: true,
      });
    }

    const { files } = collectAttachments(interaction);
    console.log(`[Embed Send] Sending embed with ${files.length} files`);

    const role = interaction.options.getRole("role");
    const mention = role ? getRoleMention(role.id, interaction.guildId) : "";

    const embed = buildCustomEmbed(draft);
    await channel.send({ 
      content: mention || undefined, 
      embeds: [embed], 
      files,
      allowedMentions: { parse: ["roles", "everyone", "users"] }
    });

    return safeReply(interaction, {
      content: "Embed sent.",
      ephemeral: true,
    });
  },
};
