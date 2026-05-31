import axios from "axios";
import { env } from "../config/constants.js";
import { logger } from "../utils/logger.js";

const fallbackFlirtingLinesPotd = [
  "Did you forget to solve the POTD today, or were you just waiting for me to remind you? 😉",
  "Are you ignoring the POTD, or just trying to play hard to get with today's challenge? 💻✨",
  "Code is temporary, but the chemistry of us solving the POTD is forever. Don't forget today's challenge! 🧪💕",
  "Just checking if you solved today's POTD, because you're definitely the solution to my bugs. 🐞❤️",
  "If solving today's POTD is hard, remember I'm here to cheer you on. Go crush it! 🚀😘",
  "Did you forget today's POTD? I promise solving it is almost as rewarding as talking to me. 😏",
  "My console is hot, but not as hot as you solving today's POTD. Don't leave it pending! 💻🔥"
];

const fallbackFlirtingLinesContest = [
  "Are you ready to show off your coding skills in today's contests, or should I just admire you from here? 😏",
  "Don't keep today's contests waiting. You know how much I love seeing you at the top of the leaderboard. 🏆💖",
  "Upcoming contests today! Let's see if your code is as smooth as your charm. 💻✨",
  "Ready to submit some code and capture my heart in today's contests? 🚀💕",
  "Just a sweet reminder about today's contests. I'll be cheering for you with every single submission! 📣❤️"
];

export async function generateFlirtyReminder(type = "potd") {
  if (!env.groqApiKey) {
    logger.debug(`No GROQ_API_KEY set. Using fallback flirting lines for ${type}.`);
    return getRandomFallbackLine(type);
  }

  try {
    const systemPrompt = type === "contest"
      ? "You are a charming, witty, and slightly flirty AI assistant. Write a short, single-sentence flirty reminder for college students/coders asking if they are ready for today's upcoming competitive programming (CP) contests. Keep it fun, lighthearted, and flirty, under 120 characters. Do not use quotes in the output."
      : "You are a charming, witty, and slightly flirty AI assistant. Write a short, single-sentence flirty reminder for college students/coders asking if they forgot to solve today's LeetCode/CP Problem of the Day (POTD). Keep it fun, lighthearted, and flirty, under 120 characters. Do not use quotes in the output.";
    
    const userPrompt = type === "contest"
      ? "Generate one flirty line to remind users about today's upcoming coding contests."
      : "Generate one flirty line to remind users about today's daily POTD.";

    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 60
      },
      {
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 5000
      }
    );

    const text = res.data?.choices?.[0]?.message?.content?.trim();
    if (text) {
      return text.replace(/^["']|["']$/g, "");
    }
  } catch (error) {
    logger.warn(`Groq API flirting line generation failed for ${type}:`, error?.message || error);
  }

  return getRandomFallbackLine(type);
}

function getRandomFallbackLine(type) {
  const list = type === "contest" ? fallbackFlirtingLinesContest : fallbackFlirtingLinesPotd;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
