import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { storeFetchedContests } from "../../services/contestService.js";
import { safeReply } from "../../utils/interaction.js";

export default {
  data: new SlashCommandBuilder()
    .setName("contest-fetch")
    .setDescription("Fetch contests from supported platforms"),
  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return safeReply(interaction, {
        content: "You need Manage Server permissions.",
        ephemeral: true,
      });
    }

    await safeReply(interaction, {
      content: "Fetching contests...",
      ephemeral: true,
    });
    const result = await storeFetchedContests(interaction.user.id);

    return safeReply(interaction, {
      content: `Fetched ${result.total} contests. Added ${result.inserted}.`,
      ephemeral: true,
    });
  },
};
