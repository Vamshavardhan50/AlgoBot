import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../utils/logger.js";
import { buildJobEmbed } from "../utils/embedUtils.js";
import { listGuildConfigs } from "../models/GuildConfig.js";
import { isJobSent, markJobSent } from "../models/Job.js";

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

    // gb-query-loop-item or article cards
    $(".gb-query-loop-item, article").each((_, el) => {
      const $el = $(el);

      const titleEl = $el.find("h2.gb-headline-text > a, h3.gb-headline-text > a, h2 a, h3 a, h1 a").first();
      const title = titleEl.text().trim();
      const url = titleEl.attr("href");

      if (!title || !url) return;

      const categories = [];
      $el.find("a.post-term-item, .entry-meta a, .post-category a").each((_, catEl) => {
        const cat = $(catEl).text().trim();
        if (cat && !categories.includes(cat)) categories.push(cat);
      });

      const description = $el.find("p.gb-headline-text, .entry-summary, p").first().text().trim();
      const dateEl = $el.find("time.entry-date, time");
      const date = dateEl.attr("datetime") || dateEl.text().trim() || new Date().toISOString();

      jobs.push({ title, url, categories, description, date });
    });

    // Deduplicate by URL
    const seen = new Set();
    const uniqueJobs = [];
    for (const j of jobs) {
      if (!seen.has(j.url)) {
        seen.add(j.url);
        uniqueJobs.push(j);
      }
    }

    return uniqueJobs;
  } catch (error) {
    logger.error("Job scraper: failed to fetch listings", error?.message || error);
    return [];
  }
}

export async function fetchJobDetail(jobUrl) {
  if (!jobUrl) return { fullDescription: "", applyLink: "" };
  try {
    const res = await axios.get(jobUrl, {
      headers: { "User-Agent": UA },
      timeout: 15000,
    });

    const $ = cheerio.load(res.data);

    // Strip out all scripts, ads, styles, and iframe tags
    $("script, style, iframe, ins, noscript, .adsbygoogle, [class*='ad-'], [id*='ad-'], .advertisement, svg").remove();

    // Extract content and clean whitespace
    let fullText = $("div.dynamic-entry-content, .entry-content, article").first().text().replace(/\s+/g, " ").trim();

    // Strip any lingering ad code strings if present
    if (fullText.includes("googletag") || fullText.includes("window.googletag")) {
      fullText = fullText.replace(/googletag[\s\S]*?\}\);?/gi, "").replace(/window\.googletag[\s\S]*?\}\);?/gi, "").trim();
    }

    // Look for apply button or links
    let applyLink = $("a.wp-block-button__link, a:contains('Apply'), a:contains('Click Here to Apply')").attr("href") || "";
    if (!applyLink || applyLink.startsWith("#") || applyLink === jobUrl) {
      // Find external apply links inside the article
      $("a[href^='http']").each((_, linkEl) => {
        const href = $(linkEl).attr("href");
        const linkText = $(linkEl).text().toLowerCase();
        if (href && !href.includes("jobcode.in") && (linkText.includes("apply") || linkText.includes("link") || linkText.includes("registration") || linkText.includes("form") || linkText.includes("career"))) {
          applyLink = href;
        }
      });
    }

    return {
      fullDescription: fullText || "",
      applyLink: applyLink || jobUrl,
    };
  } catch (error) {
    logger.warn(`Job scraper: failed to fetch detail for ${jobUrl}`, error?.message || error);
    return { fullDescription: "", applyLink: jobUrl };
  }
}

/**
 * Fetch and send 2-3 fresh jobs to all configured guild job channels
 */
export async function sendJobAlerts(client, { forceCount = 3 } = {}) {
  const configs = listGuildConfigs();
  const configuredGuilds = configs.filter((c) => Boolean(c?.jobChannelId));

  if (!configuredGuilds.length) {
    logger.info("Job scraper: no guilds have job channels configured.");
    return { sent: 0, count: 0 };
  }

  const allJobs = await fetchJobListings();
  if (!allJobs.length) {
    logger.info("Job scraper: no job listings retrieved from source.");
    return { sent: 0, count: 0 };
  }

  // Find unsent jobs
  let freshJobs = allJobs.filter((j) => !isJobSent(j.url));

  // If all scraped jobs are already sent, pick the newest ones to satisfy forced manual requests
  if (freshJobs.length === 0) {
    logger.info("Job scraper: all jobs in current batch were previously marked sent. Picking newest 3 listings.");
    freshJobs = allJobs.slice(0, forceCount);
  } else {
    freshJobs = freshJobs.slice(0, forceCount);
  }

  const enrichedJobs = [];
  for (const job of freshJobs) {
    const detail = await fetchJobDetail(job.url);
    enrichedJobs.push({
      ...job,
      fullDescription: detail.fullDescription || job.description,
      applyLink: detail.applyLink || job.url,
    });
  }

  let sentCount = 0;

  for (const config of configuredGuilds) {
    const channel = await client.channels.fetch(config.jobChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) continue;

    for (const job of enrichedJobs) {
      const dateStr = job.date
        ? new Date(job.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
        : "Recent";

      const embed = buildJobEmbed({
        title: job.title,
        description: job.fullDescription || job.description,
        applyLink: job.applyLink,
        categories: job.categories?.length ? job.categories : ["Freshers", "Opportunities"],
        date: dateStr,
        url: job.url,
      });

      await channel.send({ embeds: [embed] }).catch((err) => {
        logger.error(`Job scraper: failed to send to channel ${config.jobChannelId}`, err?.message || err);
      });
      sentCount++;
    }
  }

  // Mark all dispatched fresh jobs in database
  for (const job of enrichedJobs) {
    markJobSent({
      url: job.url,
      title: job.title,
      categories: job.categories,
      applyLink: job.applyLink,
    });
  }

  logger.info(`Job scraper: successfully broadcasted ${enrichedJobs.length} job opportunities (${sentCount} total messages dispatched).`);
  return { sent: sentCount, count: enrichedJobs.length, jobs: enrichedJobs };
}
