import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { listStarboard } from "../../models/Starboard.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("View the server duel leaderboard standings"),

  async execute(interaction) {
    const guildId = interaction.guildId;

    if (!guildId) {
      return safeReply(interaction, {
        content: "❌ This command can only be used within a server.",
        ephemeral: true,
      });
    }

    const leaderboard = listStarboard(guildId, 10);

    if (!leaderboard.length) {
      return safeReply(interaction, {
        content: "⭐ No dueling statistics found for this server yet. Challenge someone using \`/duel challenge\` to get started!",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("⭐ AlgoBot Duel Leaderboard")
      .setColor(0xffd700) // Gold
      .setDescription("Rankings of competitive programming duelists in this server.")
      .setTimestamp();

    const lines = leaderboard.map((row, idx) => {
      let rankPrefix = `\`#${idx + 1}\``;
      if (idx === 0) rankPrefix = "🥇";
      else if (idx === 1) rankPrefix = "🥈";
      else if (idx === 2) rankPrefix = "🥉";

      return `${rankPrefix} <@${row.userId}> — **${row.score}** pts (\`${row.wins}W - ${row.losses}L\`)`;
    });

    embed.setDescription(
      `Rankings of competitive programming duelists in this server.\n\n` +
      lines.join("\n")
    );

    return safeReply(interaction, { embeds: [embed] });
  },
};
