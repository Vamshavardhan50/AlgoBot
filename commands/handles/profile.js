import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { listUserHandles } from "../../models/UserHandle.js";
import { fetchLeetCodeStats, fetchCodeforcesStats, fetchGfgStats } from "../../services/index.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a member's competitive programming stats")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The user to inspect (defaults to yourself)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guildId;

    if (!guildId) {
      return safeReply(interaction, {
        content: "This command can only be used within a server.",
        ephemeral: true,
      });
    }

    // Defer reply since fetching live stats from multiple APIs can take a few seconds
    await interaction.deferReply().catch(() => null);

    const handles = listUserHandles(guildId, targetUser.id);
    if (!handles || !handles.length) {
      const isSelf = targetUser.id === interaction.user.id;
      const content = isSelf
        ? "❌ You haven't connected any handles yet! Use `/handle connect` to link your LeetCode, Codeforces, or GeeksforGeeks accounts."
        : `❌ **${targetUser.username}** hasn't linked any competitive programming handles yet.`;
      
      return interaction.editReply({ content }).catch(() => null);
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 CP Profile: ${targetUser.username}`)
      .setColor(0x5865f2) // Blurple
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(`All-in-one programming profile and solving metrics for <@${targetUser.id}>.`)
      .setFooter({ text: "Link your profiles using /handle connect", iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    // Fetch stats for each handle
    for (const h of handles) {
      if (h.platform === "LeetCode") {
        const stats = await fetchLeetCodeStats(h.handle);
        if (stats) {
          embed.addFields({
            name: "🟡 LeetCode",
            value: `👤 Handle: [${h.handle}](${stats.profileLink})\n` +
                   `⭐ Total Solved: **${stats.totalSolved}**\n` +
                   `🟢 Easy: \`${stats.easySolved}\` | 🟡 Medium: \`${stats.mediumSolved}\` | 🔴 Hard: \`${stats.hardSolved}\``,
            inline: false,
          });
        } else {
          embed.addFields({
            name: "🟡 LeetCode",
            value: `👤 Handle: \`${h.handle}\` (Unable to fetch stats)`,
            inline: false,
          });
        }
      } else if (h.platform === "Codeforces") {
        const stats = await fetchCodeforcesStats(h.handle);
        if (stats) {
          const rankStr = stats.rank ? `${stats.rank.charAt(0).toUpperCase() + stats.rank.slice(1)}` : "Unrated";
          const maxRankStr = stats.maxRank ? `${stats.maxRank.charAt(0).toUpperCase() + stats.maxRank.slice(1)}` : "Unrated";
          embed.addFields({
            name: "🔴 Codeforces",
            value: `👤 Handle: [${h.handle}](${stats.profileLink})\n` +
                   `⭐ Total Solved: **${stats.totalSolved}**\n` +
                   `📈 Rating: **${stats.rating}** (\`${rankStr}\`) | Max: **${stats.maxRating}** (\`${maxRankStr}\`)`,
            inline: false,
          });
        } else {
          embed.addFields({
            name: "🔴 Codeforces",
            value: `👤 Handle: \`${h.handle}\` (Unable to fetch stats)`,
            inline: false,
          });
        }
      } else if (h.platform === "GeeksforGeeks") {
        const stats = await fetchGfgStats(h.handle);
        if (stats) {
          const breakdown = stats.difficulty;
          const details = breakdown && (breakdown.easy || breakdown.medium || breakdown.hard)
            ? `\n🟢 Easy: \`${breakdown.easy}\` | 🟡 Medium: \`${breakdown.medium}\` | 🔴 Hard: \`${breakdown.hard}\``
            : "";
          embed.addFields({
            name: "🟢 GeeksforGeeks",
            value: `👤 Handle: [${h.handle}](${stats.profileLink})\n` +
                   `⭐ Total Solved: **${stats.totalSolved}**${details}`,
            inline: false,
          });
        } else {
          embed.addFields({
            name: "🟢 GeeksforGeeks",
            value: `👤 Handle: \`${h.handle}\` (Unable to fetch stats)`,
            inline: false,
          });
        }
      }
    }

    return interaction.editReply({ embeds: [embed] }).catch(() => null);
  },
};
