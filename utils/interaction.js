export async function safeReply(interaction, payload) {
  if (
    typeof interaction.isRepliable === "function" &&
    !interaction.isRepliable()
  ) {
    return null;
  }

  try {
    if (interaction.deferred && !interaction.replied) {
      const { ephemeral, ...rest } = payload || {};
      return await interaction.editReply(rest);
    }
    if (interaction.replied) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch (error) {
    if (
      error?.code === 10062 ||
      error?.message?.includes("Unknown interaction")
    ) {
      return null;
    }
    throw error;
  }
}
