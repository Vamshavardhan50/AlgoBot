import {
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { setupDefaults } from "../../config/constants.js";
import {
  ensureGuildConfig,
  updateGuildConfig,
} from "../../models/GuildConfig.js";
import { safeReply } from "../../utils/interaction.js";
import { logger } from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Create default channels and roles"),
  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return safeReply(interaction, {
        content: "You need Manage Server permissions to run setup.",
        ephemeral: true,
      });
    }

    if (!interaction.guild) {
      return safeReply(interaction, {
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    ensureGuildConfig(guildId);

    const createdChannels = [];
    const createdRoles = [];

    for (const [key, name] of Object.entries(setupDefaults.channels)) {
      let channel = interaction.guild.channels.cache.find(
        (c) => c.name === name,
      );
      
      if (!channel) {
        try {
          channel = await interaction.guild.channels.create({
            name,
            type: ChannelType.GuildText,
          });
          createdChannels.push(channel.name);
        } catch (error) {
          logger.error("Failed to create channel", error?.message || error);
        }
      }

      if (channel) {
        if (key === "contest") {
          updateGuildConfig(guildId, { contestChannelId: channel.id });
        }
        if (key === "potd") {
          updateGuildConfig(guildId, { potdChannelId: channel.id });
        }
        if (key === "resources") {
          updateGuildConfig(guildId, { resourceChannelId: channel.id });
        }
      }
    }

    for (const [key, name] of Object.entries(setupDefaults.roles)) {
      let role = interaction.guild.roles.cache.find(
        (r) => r.name === name,
      );

      if (!role) {
        try {
          role = await interaction.guild.roles.create({
            name,
            mentionable: true,
          });
          createdRoles.push(role.name);
        } catch (error) {
          logger.error("Failed to create role", error?.message || error);
        }
      }

      if (role) {
        if (key === "contest") {
          updateGuildConfig(guildId, { contestRoleId: role.id });
        }
        if (key === "potd") {
          updateGuildConfig(guildId, { potdRoleId: role.id });
        }
      }
    }

    return safeReply(interaction, {
      content: `Setup complete. Channels created: ${createdChannels.join(", ") || "None"}. Roles created: ${createdRoles.join(", ") || "None"}.`,
      ephemeral: true,
    });
  },
};
