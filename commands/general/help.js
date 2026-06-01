import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View AlgoBot commands and documentation"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🤖 AlgoBot Commands & Guide")
      .setColor(0x5865f2) // Blurple
      .setDescription(
        "Welcome to **AlgoBot**, your competitive programming assistant!\n" +
        "You can use either **Slash Commands** (`/`) or **Prefix Commands** (`!`) to interact with the bot."
      )
      .addFields(
        {
          name: "⚙️ Server Configuration (Admin)",
          value:
            "`/setup` — Quick automated wizard to configure the bot\n" +
            "`/contest-channel` — Set target channel for contest alerts\n" +
            "`/contest-role` — Set role to mention for contest alerts\n" +
            "`/potd-channel` — Set target channel for POTD alerts\n" +
            "`/potd-role` — Set role to mention for POTD alerts\n" +
            "`/resource-channel` — Set channel for resource posts",
        },
        {
          name: "🔥 Problems of the Day (POTD)",
          value:
            "`/potd-add` — Manually add a POTD for today\n" +
            "`/potd-remove` — Remove a POTD by ID\n" +
            "`/potd-list` — List recent POTDs\n" +
            "`/potd-send` — Send daily POTD manually",
        },
        {
          name: "🏆 Contest Tracking",
          value:
            "`/contest-add` — Add a custom contest\n" +
            "`/contest-remove` — Remove a contest\n" +
            "`/contest-list` — List upcoming contests\n" +
            "`/contest-send` — Send upcoming contest alert manually\n" +
            "`/contest-fetch` — Manually fetch fresh contest data",
        },
        {
          name: "👤 Handles & CP Profiles",
          value:
            "`/handle connect <platform> <username>` — Link your LeetCode, Codeforces, or GFG account\n" +
            "`/handle disconnect <platform>` — Unlink a platform account\n" +
            "`/handle list` — Show your connected usernames\n" +
            "`/profile [user]` — Fetch live statistics and CP metrics\n" +
            "*(Prefix commands: `!handle`, `!profile`)*",
        },
        {
          name: "⚔️ Duels & Scoreboard",
          value:
            "`/duel challenge <user> <problem> <time_limit>` — Challenge a member to solve a Codeforces problem\n" +
            "`/duel accept` — Accept the pending challenge\n" +
            "`/duel decline` — Decline the pending challenge\n" +
            "`/duel verify` — Verify solution submissions live\n" +
            "`/starboard` — View duelist standings leaderboard\n" +
            "*(Prefix commands: `!duel`, `!starboard`)*",
        }
      )
      .setFooter({
        text: "AlgoBot • Helping you level up your coding skills!",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return safeReply(interaction, { embeds: [embed] });
  },
};
