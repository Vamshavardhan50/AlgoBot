import axios from "axios";
import { env } from "../config/constants.js";
import { logger } from "../utils/logger.js";

const fallbackFlirtingLinesPotd = [
  "POTD time, cutie! 💻",
  "Your daily problem awaits 💕",
  "Today's POTD is calling 😘",
  "Solve it for me? 🚀",
  "Don't ghost the POTD 💻",
  "POTD reminder, gorgeous ✨",
  "One problem, one smile 😊",
  "POTD is lonely without you",
  "Click, code, conquer 💪",
  "Brain teaser for you 🧠",
];

const fallbackFlirtingLinesContest = [
  "Contest mode: activate! 🏆",
  "Show them what you got 😏",
  "Your fans await, coder! 🚀",
  "Lock in and level up 💻",
  "Time to flex those skills",
  "Dominate today's contest 😎",
  "Coding with style today ✨",
  "Champions start here 🏆",
  "Ready. Set. Code. 💻",
  "Your arena is ready 👑",
];

export async function generateFlirtyReminder(type = "potd") {
  if (!env.groqApiKey) {
    logger.warn("GROQ_API_KEY / GROK_API_KEY not set, using fallback flirty lines.");
    return getRandomFallbackLine(type);
  }

  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const systemPrompt = type === "contest"
    ? "You are a charming, flirty AI. Write ONE short flirty line (max 20 chars) reminding coders about today's contest. No quotes."
    : "You are a charming, flirty AI. Write ONE short flirty line (max 20 chars) reminding about today's POTD. No quotes.";
  
  const userPrompt = (type === "contest"
    ? "Generate one flirty line to remind users about today's upcoming coding contests. (seed: "
    : "Generate one flirty line to remind users about today's daily POTD. (seed: ") + seed + ")";

  const models = ["llama-3.3-70b-versatile", "llama3-8b-8192", "mixtral-8x7b-32768"];

  for (const model of models) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.85,
          max_tokens: 80
        },
        {
          headers: {
            Authorization: `Bearer ${env.groqApiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 8000
        }
      );

      const text = res.data?.choices?.[0]?.message?.content?.trim();
      if (text) {
        logger.info(`Groq API generated flirting line for ${type} using model ${model}.`);
        return text.replace(/^["']|["']$/g, "");
      }
    } catch (error) {
      logger.warn(`Groq API call failed for ${type} using model ${model}: ${error?.message || error}`);
    }
  }

  logger.warn(`All Groq models failed for ${type}, using fallback flirty line.`);
  return getRandomFallbackLine(type);
}

function getRandomFallbackLine(type) {
  const list = type === "contest" ? fallbackFlirtingLinesContest : fallbackFlirtingLinesPotd;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
