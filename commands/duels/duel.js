import { SlashCommandBuilder, PermissionsBitField } from "discord.js";
import axios from "axios";
import { getHandle } from "../../models/UserHandle.js";
import {
  createDuel,
  getActiveDuelForUser,
  getPendingDuelForUser,
  acceptDuel,
  declineDuel,
  completeDuel,
  expireDuel,
} from "../../models/Duel.js";
import { updateStarboardScore } from "../../models/Starboard.js";
import { safeReply } from "../../utils/interaction.js";
import { logger } from "../../utils/logger.js";

// Helper to parse CF problem code (e.g. 1968A or 1968/A)
function parseCFQuestionId(qId) {
  const clean = qId.trim().replace(/\s+/g, "");
  const match = clean.match(/^(\d+)[\/]?([a-zA-Z]\d*)$/);
  if (!match) return null;
  return {
    contestId: parseInt(match[1], 10),
    problemIndex: match[2].toUpperCase(),
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Competitive programming duels on Codeforces")
    .addSubcommand((sub) =>
      sub
        .setName("challenge")
        .setDescription("Challenge another member to a Codeforces duel")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The member you want to challenge")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("problem")
            .setDescription("Codeforces problem ID (e.g. 1968A)")
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("time_limit")
            .setDescription("Time limit in minutes (e.g. 30, 45, 60)")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("accept")
        .setDescription("Accept your pending duel challenge")
    )
    .addSubcommand((sub) =>
      sub
        .setName("decline")
        .setDescription("Decline your pending duel challenge")
    )
    .addSubcommand((sub) =>
      sub
        .setName("verify")
        .setDescription("Verify the active duel results from Codeforces")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (!guildId) {
      return safeReply(interaction, {
        content: "❌ This command can only be used within a server.",
        ephemeral: true,
      });
    }

    if (sub === "challenge") {
      const opponent = interaction.options.getUser("user");
      const problemRaw = interaction.options.getString("problem");
      const timeLimit = interaction.options.getInteger("time_limit");

      if (opponent.id === userId) {
        return safeReply(interaction, {
          content: "❌ You cannot challenge yourself to a duel!",
          ephemeral: true,
        });
      }

      if (opponent.bot) {
        return safeReply(interaction, {
          content: "❌ You cannot challenge a bot to a duel!",
          ephemeral: true,
        });
      }

      // Parse question ID
      const parsedProblem = parseCFQuestionId(problemRaw);
      if (!parsedProblem) {
        return safeReply(interaction, {
          content: "❌ Invalid Codeforces problem ID format. Use formats like `1968A` or `1968/A`.",
          ephemeral: true,
        });
      }

      // Check handles
      const challengerCf = getHandle(guildId, userId, "Codeforces");
      const opponentCf = getHandle(guildId, opponent.id, "Codeforces");

      if (!challengerCf) {
        return safeReply(interaction, {
          content: "❌ You must link your Codeforces handle first using `/handle connect Codeforces [username]`.",
          ephemeral: true,
        });
      }

      if (!opponentCf) {
        return safeReply(interaction, {
          content: `❌ **${opponent.username}** has not linked their Codeforces handle yet. They must run \`/handle connect Codeforces [username]\` first.`,
          ephemeral: true,
        });
      }

      // Check if either user is in an active ongoing duel
      const activeChallenger = getActiveDuelForUser(guildId, userId);
      const activeOpponent = getActiveDuelForUser(guildId, opponent.id);

      if (activeChallenger) {
        return safeReply(interaction, {
          content: "❌ You are already in an ongoing duel! Finish or verify it first.",
          ephemeral: true,
        });
      }

      if (activeOpponent) {
        return safeReply(interaction, {
          content: `❌ **${opponent.username}** is already in an ongoing duel.`,
          ephemeral: true,
        });
      }

      // Create PENDING duel
      const duel = createDuel(
        guildId,
        userId,
        opponent.id,
        parsedProblem.contestId,
        parsedProblem.problemIndex,
        timeLimit
      );

      return safeReply(interaction, {
        content: `⚔️ <@${opponent.id}>! You have been challenged to a Codeforces duel by <@${userId}>!\n` +
                 `📝 **Problem:** https://codeforces.com/problemset/problem/${parsedProblem.contestId}/${parsedProblem.problemIndex}\n` +
                 `⏱️ **Time Limit:** ${timeLimit} minutes\n` +
                 `Type \`/duel accept\` to accept or \`/duel decline\` to decline. (Expires in 10 minutes)`,
      });

    } else if (sub === "accept") {
      const pending = getPendingDuelForUser(guildId, userId);

      if (!pending) {
        return safeReply(interaction, {
          content: "❌ You do not have any pending duel challenges.",
          ephemeral: true,
        });
      }

      // Check if expired
      const expiresAtTime = new Date(pending.expiresAt).getTime();
      if (Date.now() > expiresAtTime) {
        expireDuel(pending.id);
        return safeReply(interaction, {
          content: "❌ This duel challenge has expired.",
          ephemeral: true,
        });
      }

      // Accept
      acceptDuel(pending.id, pending.timeLimit);

      return safeReply(interaction, {
        content: `⚔️ **Duel Accepted!** <@${pending.challengerId}> vs <@${pending.opponentId}>\n` +
                 `📝 **Problem:** https://codeforces.com/problemset/problem/${pending.contestId}/${pending.problemIndex}\n` +
                 `⏱️ **Time Limit:** ${pending.timeLimit} minutes\n` +
                 `Use \`/duel verify\` once you have successfully solved the problem. Good luck!`,
      });

    } else if (sub === "decline") {
      const pending = getPendingDuelForUser(guildId, userId);

      if (!pending) {
        return safeReply(interaction, {
          content: "❌ You do not have any pending duel challenges.",
          ephemeral: true,
        });
      }

      declineDuel(pending.id);

      return safeReply(interaction, {
        content: `✅ Declined duel challenge from <@${pending.challengerId}>.`,
      });

    } else if (sub === "verify") {
      const active = getActiveDuelForUser(guildId, userId);

      if (!active) {
        return safeReply(interaction, {
          content: "❌ You are not currently in any active duels.",
          ephemeral: true,
        });
      }

      // Check if time is up
      const expiresAtTime = new Date(active.expiresAt).getTime();
      const isExpired = Date.now() > expiresAtTime;

      // Defer because we will fetch from Codeforces API which takes some time
      await interaction.deferReply().catch(() => null);

      const challengerCf = getHandle(guildId, active.challengerId, "Codeforces");
      const opponentCf = getHandle(guildId, active.opponentId, "Codeforces");

      if (!challengerCf || !opponentCf) {
        return interaction.editReply({
          content: "❌ Error: One of the duelist's Codeforces handles is no longer linked.",
        }).catch(() => null);
      }

      let challengerSubmissions = [];
      let opponentSubmissions = [];

      try {
        const [resChal, resOpp] = await Promise.all([
          axios.get(`https://codeforces.com/api/user.status?handle=${challengerCf.handle}`, { timeout: 10000 }),
          axios.get(`https://codeforces.com/api/user.status?handle=${opponentCf.handle}`, { timeout: 10000 })
        ]);

        if (resChal.data?.status === "OK") challengerSubmissions = resChal.data.result || [];
        if (resOpp.data?.status === "OK") opponentSubmissions = resOpp.data.result || [];
      } catch (err) {
        logger.error(`CF Status fetch error during duel verification: ${err.message}`);
        return interaction.editReply({
          content: "❌ Failed to query Codeforces submissions API. Please try again in a few moments.",
        }).catch(() => null);
      }

      const acceptedTimeMs = new Date(active.acceptedAt).getTime();

      // Find first valid submission for challenger
      const chalSolveSub = challengerSubmissions.find(sub =>
        sub.verdict === "OK" &&
        sub.problem?.contestId === active.contestId &&
        sub.problem?.index === active.problemIndex &&
        (sub.creationTimeSeconds * 1000) >= acceptedTimeMs &&
        (sub.creationTimeSeconds * 1000) <= expiresAtTime
      );

      // Find first valid submission for opponent
      const oppSolveSub = opponentSubmissions.find(sub =>
        sub.verdict === "OK" &&
        sub.problem?.contestId === active.contestId &&
        sub.problem?.index === active.problemIndex &&
        (sub.creationTimeSeconds * 1000) >= acceptedTimeMs &&
        (sub.creationTimeSeconds * 1000) <= expiresAtTime
      );

      const chalSolved = !!chalSolveSub;
      const oppSolved = !!oppSolveSub;

      let winnerId = null;
      let loserId = null;

      if (chalSolved && oppSolved) {
        // Both solved it, check who was earlier
        if (chalSolveSub.creationTimeSeconds < oppSolveSub.creationTimeSeconds) {
          winnerId = active.challengerId;
          loserId = active.opponentId;
        } else {
          winnerId = active.opponentId;
          loserId = active.challengerId;
        }
      } else if (chalSolved) {
        winnerId = active.challengerId;
        loserId = active.opponentId;
      } else if (oppSolved) {
        winnerId = active.opponentId;
        loserId = active.challengerId;
      }

      if (winnerId) {
        // We have a winner!
        completeDuel(active.id, winnerId);
        
        // Update scores
        const winnerStats = updateStarboardScore(guildId, winnerId, 1, 0, 10);
        const loserStats = updateStarboardScore(guildId, loserId, 0, 1, -5);

        return interaction.editReply({
          content: `🎉 **Duel Complete!** <@${winnerId}> solved the problem and won the duel! 🏆\n` +
                   `➕ <@${winnerId}>: **+10** points (Total Score: **${winnerStats.score}**, Wins: **${winnerStats.wins}**)\n` +
                   `➖ <@${loserId}>: **-5** points (Total Score: **${loserStats.score}**, Losses: **${loserStats.losses}**)`
        }).catch(() => null);
      }

      if (isExpired) {
        expireDuel(active.id);
        return interaction.editReply({
          content: `⏰ **Duel Expired!** Neither <@${active.challengerId}> nor <@${active.opponentId}> solved the problem within the time limit.`,
        }).catch(() => null);
      }

      // Neither has solved it and not expired yet
      const timeRemainingMs = expiresAtTime - Date.now();
      const timeRemainingMins = Math.ceil(timeRemainingMs / (60 * 1000));

      return interaction.editReply({
        content: `⚔️ **Duel Status:** No solved submissions found yet. Keep working!\n` +
                 `⏱️ **Time Remaining:** ${timeRemainingMins} minutes.`,
      }).catch(() => null);
    }
  },
};
