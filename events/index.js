import onReady from "./ready.js";
import onInteraction from "./interactionCreate.js";
import onMessage from "./messageCreate.js";
import onGuildCreate from "./guildCreate.js";

export function registerEvents(client) {
  client.on("ready", () => onReady(client));
  client.on("interactionCreate", (interaction) => onInteraction(interaction));
  client.on("messageCreate", (message) => onMessage(message));
  client.on("guildCreate", (guild) => onGuildCreate(guild));
}
