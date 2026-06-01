import { SlashCommandBuilder } from "discord.js";
import { connectHandle, disconnectHandle, listUserHandles } from "../../models/UserHandle.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("handle")
    .setDescription("Link or unlink your CP usernames")
    .addSubcommand((sub) =>
      sub
        .setName("connect")
        .setDescription("Link a competitive programming handle to your profile")
        .addStringOption((opt) =>
          opt
            .setName("platform")
            .setDescription("Platform name")
            .setRequired(true)
            .addChoices(
              { name: "LeetCode", value: "LeetCode" },
              { name: "Codeforces", value: "Codeforces" },
              { name: "GeeksforGeeks", value: "GeeksforGeeks" }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName("username")
            .setDescription("Platform username")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("disconnect")
        .setDescription("Unlink a competitive programming handle")
        .addStringOption((opt) =>
          opt
            .setName("platform")
            .setDescription("Platform name")
            .setRequired(true)
            .addChoices(
              { name: "LeetCode", value: "LeetCode" },
              { name: "Codeforces", value: "Codeforces" },
              { name: "GeeksforGeeks", value: "GeeksforGeeks" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List your connected handles")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (!guildId) {
      return safeReply(interaction, {
        content: "This command can only be used within a server.",
        ephemeral: true,
      });
    }

    if (sub === "connect") {
      const platform = interaction.options.getString("platform");
      const username = interaction.options.getString("username").trim();

      connectHandle(guildId, userId, platform, username);

      return safeReply(interaction, {
        content: `✅ Successfully linked your **${platform}** handle to \`${username}\`.`,
        ephemeral: true,
      });
    } else if (sub === "disconnect") {
      const platform = interaction.options.getString("platform");
      const removed = disconnectHandle(guildId, userId, platform);

      if (!removed) {
        return safeReply(interaction, {
          content: `❌ You do not have a linked handle for **${platform}**.`,
          ephemeral: true,
        });
      }

      return safeReply(interaction, {
        content: `✅ Successfully unlinked your **${platform}** handle (\`${removed.handle}\`).`,
        ephemeral: true,
      });
    } else if (sub === "list") {
      const handles = listUserHandles(guildId, userId);

      if (!handles.length) {
        return safeReply(interaction, {
          content: "You have no linked handles yet. Use \`/handle connect\` to link one!",
          ephemeral: true,
        });
      }

      const listStr = handles
        .map((h) => `• **${h.platform}**: \`${h.handle}\``)
        .join("\n");

      return safeReply(interaction, {
        content: `👤 **Your Linked Handles:**\n${listStr}`,
        ephemeral: true,
      });
    }
  },
};
