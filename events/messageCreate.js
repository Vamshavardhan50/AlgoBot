import { logger } from "../utils/logger.js";

export default async function onMessage(message) {
  if (message.author.bot) return;

  const prefix = "!";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();

  const client = message.client;
  const command = client.commands.get(cmdName);
  if (!command) return;

  const guildId = message.guildId;
  if (!guildId) {
    return message.reply("❌ Prefix commands can only be used within a server.").catch(() => null);
  }

  let subcommand = null;
  const optionsMap = {};

  // Parse arguments for handle subcommand
  if (cmdName === "handle") {
    if (!args[0]) {
      return message.reply(
        "💡 **Handle Usage:**\n" +
        "• `!handle connect <LeetCode|Codeforces|GeeksforGeeks> <username>`\n" +
        "• `!handle disconnect <LeetCode|Codeforces|GeeksforGeeks>`\n" +
        "• `!handle list`"
      ).catch(() => null);
    }
    subcommand = args[0].toLowerCase();
    if (subcommand === "connect") {
      const platformInput = args[1];
      const username = args[2];
      if (!platformInput || !username) {
        return message.reply("❌ Missing arguments. Usage: `!handle connect <platform> <username>`").catch(() => null);
      }
      
      let platform = null;
      if (/leetcode/i.test(platformInput)) platform = "LeetCode";
      else if (/codeforces/i.test(platformInput)) platform = "Codeforces";
      else if (/geeksforgeeks/i.test(platformInput) || /gfg/i.test(platformInput)) platform = "GeeksforGeeks";

      if (!platform) {
        return message.reply("❌ Invalid platform. Choose LeetCode, Codeforces, or GeeksforGeeks.").catch(() => null);
      }
      optionsMap["platform"] = platform;
      optionsMap["username"] = username;
    } else if (subcommand === "disconnect") {
      const platformInput = args[1];
      if (!platformInput) {
        return message.reply("❌ Missing platform. Usage: `!handle disconnect <platform>`").catch(() => null);
      }
      
      let platform = null;
      if (/leetcode/i.test(platformInput)) platform = "LeetCode";
      else if (/codeforces/i.test(platformInput)) platform = "Codeforces";
      else if (/geeksforgeeks/i.test(platformInput) || /gfg/i.test(platformInput)) platform = "GeeksforGeeks";

      if (!platform) {
        return message.reply("❌ Invalid platform. Choose LeetCode, Codeforces, or GeeksforGeeks.").catch(() => null);
      }
      optionsMap["platform"] = platform;
    } else if (subcommand !== "list") {
      return message.reply("❌ Unknown subcommand. Choose connect, disconnect, or list.").catch(() => null);
    }
  } 
  
  // Parse arguments for duel subcommand
  else if (cmdName === "duel") {
    if (!args[0]) {
      return message.reply(
        "💡 **Duel Usage:**\n" +
        "• `!duel challenge <@user> <problem_id> <time_limit_mins>`\n" +
        "• `!duel accept`\n" +
        "• `!duel decline`\n" +
        "• `!duel verify`"
      ).catch(() => null);
    }
    subcommand = args[0].toLowerCase();
    if (subcommand === "challenge") {
      const opponent = message.mentions.users.first();
      const problem = args[2];
      const timeLimitStr = args[3];

      if (!opponent || !problem || !timeLimitStr) {
        return message.reply("❌ Missing arguments. Usage: `!duel challenge <@user> <problem> <time_limit_mins>`").catch(() => null);
      }

      const timeLimit = parseInt(timeLimitStr, 10);
      if (Number.isNaN(timeLimit) || timeLimit <= 0) {
        return message.reply("❌ Time limit must be a positive integer in minutes.").catch(() => null);
      }

      optionsMap["user"] = opponent;
      optionsMap["problem"] = problem;
      optionsMap["time_limit"] = timeLimit;
    } else if (subcommand !== "accept" && subcommand !== "decline" && subcommand !== "verify") {
      return message.reply("❌ Unknown subcommand. Choose challenge, accept, decline, or verify.").catch(() => null);
    }
  } 
  
  // Parse arguments for profile command
  else if (cmdName === "profile") {
    const targetUser = message.mentions.users.first() || null;
    optionsMap["user"] = targetUser;
  }

  // Adapter representing the Slash Command interaction object
  let replyMessage = null;
  const mockInteraction = {
    guildId: message.guildId,
    user: message.author,
    member: message.member,
    client: message.client,
    deferred: false,
    replied: false,
    isRepliable: () => true,
    options: {
      getSubcommand: () => subcommand,
      getString: (name) => optionsMap[name] || null,
      getUser: (name) => optionsMap[name] || null,
      getInteger: (name) => optionsMap[name] || null,
    },
    async deferReply() {
      this.deferred = true;
      replyMessage = await message.reply("⌛ *Loading...*").catch(() => null);
    },
    async reply(payload) {
      this.replied = true;
      let content = typeof payload === "string" ? payload : payload.content;
      let embeds = payload.embeds || [];
      replyMessage = await message.reply({ content: content || undefined, embeds }).catch(() => null);
      return replyMessage;
    },
    async editReply(payload) {
      let content = typeof payload === "string" ? payload : payload.content;
      let embeds = payload.embeds || [];
      if (replyMessage) {
        await replyMessage.edit({ content: content || "", embeds }).catch(() => null);
      } else {
        replyMessage = await message.reply({ content: content || undefined, embeds }).catch(() => null);
      }
      return replyMessage;
    },
    async followUp(payload) {
      return this.reply(payload);
    }
  };

  try {
    await command.execute(mockInteraction);
  } catch (err) {
    logger.error(`Error executing prefix command !${cmdName}: ${err.message}`, err);
    message.reply("❌ There was an error trying to execute that command.").catch(() => null);
  }
}
