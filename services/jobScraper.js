import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../utils/logger.js";
import { buildJobEmbed } from "../utils/embedUtils.js";
import { listGuildConfigs, updateGuildConfig } from "../models/GuildConfig.js";

const BASE = "https://jobcode.in";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchJobListings() {
  try {
    const res = await axios.get(BASE, {
      headers: { "User-Agent": UA },
      timeout: 15000,
    });

    const $ = cheerio.load(res.data);
    const jobs = [];

    $(".gb-query-loop-item").each((_, el) => {
      const $el = $(el);

      const titleEl = $el.find("h3.gb-headline-7b0a4764.gb-headline-text > a");
      const title = titleEl.text().trim();
      const url = titleEl.attr("href");

      if (!title || !url) return;

      const categories = [];
      $el.find("div.gb-container-72bdf932 > a.post-term-item").each((_, catEl) => {
        categories.push($(catEl).text().trim());
      });

      const description = $el.find("p.gb-headline-08774225.gb-headline-text").text().trim();

      const dateEl = $el.find("time.entry-date.published");
      const date = dateEl.attr("datetime") || dateEl.text().trim();

      jobs.push({ title, url, categories, description, date });
    });

    return jobs;
  } catch (error) {
    logger.error("Job scraper: failed to fetch listings", error?.message || error);
    return [];
  }
}

export async function fetchJobDetail(jobUrl) {
  try {
    const res = await axios.get(jobUrl, {
      headers: { "User-Agent": UA },
      timeout: 15000,
    });

    const $ = cheerio.load(res.data);

    const fullText = $("div.dynamic-entry-content").text().trim();

    const applyLink = $("a.wp-block-button__link").attr("href") || "";

    return {
      fullDescription: fullText || "",
      applyLink,
    };
  } catch (error) {
    logger.warn(`Job scraper: failed to fetch detail for ${jobUrl}`, error?.message || error);
    return { fullDescription: "", applyLink: "" };
  }
}

export async function sendJobAlerts(client) {
  const configs = listGuildConfigs();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const jobs = await fetchJobListings();
  if (!jobs.length) {
    logger.info("Job scraper: no jobs found");
    return;
  }

  const todayJobs = jobs.filter((j) => j.date && j.date.slice(0, 10) === todayStr);

  if (!todayJobs.length) {
    logger.info("Job scraper: no new jobs for today");
    return;
  }

  for (const config of configs) {
    if (!config?.jobChannelId) continue;

    const todayKey = `jobs-${todayStr}`;
    if (config.lastJobSentAt === todayKey) {
      continue;
    }

    const channel = await client.channels.fetch(config.jobChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) continue;

    for (const job of todayJobs) {
      const detail = await fetchJobDetail(job.url);

      const dateStr = job.date
        ? new Date(job.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
        : "";
      const embed = buildJobEmbed({
        title: job.title,
        description: detail.fullDescription || job.description,
        applyLink: detail.applyLink,
        categories: job.categories,
        date: dateStr,
        url: job.url,
      });

      await channel.send({ embeds: [embed] }).catch((err) => {
        logger.error(`Job scraper: failed to send job to channel ${config.jobChannelId}`, err?.message || err);
      });
    }

    updateGuildConfig(config.guildId, { lastJobSentAt: todayKey });
  }

  logger.info(`Job scraper: sent ${todayJobs.length} job alerts`);
}
