import { SlashCommandBuilder } from "discord.js";
import { safeReply } from "../../utils/interaction.js";
import { fetchJobListings, fetchJobDetail } from "../../services/jobScraper.js";
import { buildJobEmbed } from "../../utils/embedUtils.js";

export default {
  data: new SlashCommandBuilder()
    .setName("job-list")
    .setDescription("View the newest developer & tech job opportunities")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Number of jobs to display (default: 3, max: 5)")
        .setMinValue(1)
        .setMaxValue(5),
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const limit = interaction.options.getInteger("limit") || 3;
    const jobs = await fetchJobListings();

    if (!jobs.length) {
      return safeReply(interaction, {
        content: "No jobs available at this moment. Please check back shortly!",
        ephemeral: true,
      });
    }

    const selected = jobs.slice(0, limit);
    const embeds = [];

    for (const job of selected) {
      const detail = await fetchJobDetail(job.url);
      const dateStr = job.date
        ? new Date(job.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
        : "Recent";

      embeds.push(
        buildJobEmbed({
          title: job.title,
          description: detail.fullDescription || job.description,
          applyLink: detail.applyLink || job.url,
          categories: job.categories?.length ? job.categories : ["Opportunities"],
          date: dateStr,
          url: job.url,
        })
      );
    }

    return safeReply(interaction, {
      content: `🔥 **Top ${selected.length} Latest Tech Job Opportunities**`,
      embeds,
    });
  },
};
