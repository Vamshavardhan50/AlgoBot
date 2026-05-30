import onReady from "./ready.js";
import onInteraction from "./interactionCreate.js";

export function registerEvents(client) {
  client.on("ready", () => onReady(client));
  client.on("interactionCreate", (interaction) => onInteraction(interaction));
}
