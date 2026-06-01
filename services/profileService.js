import axios from "axios";
import { logger } from "../utils/logger.js";

/**
 * Fetch LeetCode statistics for a given username.
 */
export async function fetchLeetCodeStats(username) {
  const query = `
    query userProblemsSolved($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;
  try {
    const res = await axios.post(
      "https://leetcode.com/graphql",
      {
        query,
        variables: { username }
      },
      { timeout: 10000 }
    );
    const data = res.data?.data;
    if (!data || !data.matchedUser) return null;
    const stats = data.matchedUser.submitStatsGlobal.acSubmissionNum;
    const total = stats.find(s => s.difficulty === "All")?.count || 0;
    const easy = stats.find(s => s.difficulty === "Easy")?.count || 0;
    const medium = stats.find(s => s.difficulty === "Medium")?.count || 0;
    const hard = stats.find(s => s.difficulty === "Hard")?.count || 0;
    return {
      username,
      profileLink: `https://leetcode.com/u/${username}/`,
      totalSolved: total,
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,
    };
  } catch (error) {
    logger.warn(`LeetCode profile fetch failed for ${username}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch Codeforces statistics for a given username.
 */
export async function fetchCodeforcesStats(username) {
  try {
    const infoUrl = `https://codeforces.com/api/user.info?handles=${username}`;
    const statusUrl = `https://codeforces.com/api/user.status?handle=${username}`;

    const [infoRes, statusRes] = await Promise.all([
      axios.get(infoUrl, { timeout: 10000 }),
      axios.get(statusUrl, { timeout: 15000 })
    ]);

    if (infoRes.data?.status !== "OK" || statusRes.data?.status !== "OK") {
      return null;
    }

    const info = infoRes.data.result[0];
    const submissions = statusRes.data.result || [];

    const solvedProblems = new Set();
    for (const sub of submissions) {
      if (sub.verdict === "OK" && sub.problem?.contestId && sub.problem?.index) {
        solvedProblems.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    }

    return {
      username,
      profileLink: `https://codeforces.com/profile/${username}`,
      rating: info.rating || 0,
      rank: info.rank || "unrated",
      maxRating: info.maxRating || 0,
      maxRank: info.maxRank || "unrated",
      totalSolved: solvedProblems.size,
    };
  } catch (error) {
    logger.warn(`Codeforces profile fetch failed for ${username}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch GeeksforGeeks statistics for a given username.
 */
export async function fetchGfgStats(username) {
  try {
    // 1. Try Vercel API
    const url = `https://geeks-for-geeks-stats-api.vercel.app/?userName=${username}`;
    const res = await axios.get(url, { timeout: 8000 }).catch(() => null);
    
    if (res && res.data) {
      const data = res.data;
      if (data.totalProblemsSolved !== undefined) {
        return {
          username,
          profileLink: `https://www.geeksforgeeks.org/user/${username}/`,
          totalSolved: data.totalProblemsSolved || 0,
          difficulty: {
            easy: data.difficultyBreakDown?.easy || 0,
            medium: data.difficultyBreakDown?.medium || 0,
            hard: data.difficultyBreakDown?.hard || 0,
          }
        };
      }
    }
  } catch (err) {
    logger.warn(`GFG Vercel API failed for ${username}: ${err.message}`);
  }

  // 2. Fallback to direct scraping of the GFG user page
  try {
    const profileUrl = `https://www.geeksforgeeks.org/user/${username}/`;
    const res = await axios.get(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      timeout: 10000
    });
    const html = res.data || "";
    
    let totalSolved = 0;
    // Look for Problems Solved pattern
    const solvedSection = html.match(/Problems Solved[\s\S]{0,100}score_card_value">(\d+)</i) ||
                          html.match(/score_card_value">(\d+)<[\s\S]{0,100}Problems Solved/i);
    
    if (solvedSection) {
      totalSolved = parseInt(solvedSection[1], 10);
    } else {
      const genericMatch = html.match(/Problems Solved:?\s*<\/span>\s*<span[^>]*>(\d+)/i) ||
                           html.match(/(\d+)\s+problems?\s+solved/i) ||
                           html.match(/<span>Problems Solved:<\/span>.*?<span>(\d+)<\/span>/is) ||
                           html.match(/"totalProblemsSolved"\s*:\s*(\d+)/i);
      if (genericMatch) {
        totalSolved = parseInt(genericMatch[1], 10);
      }
    }

    let easy = 0, medium = 0, hard = 0;
    const stateMatch = html.match(/const\s+state\s*=\s*(\{[\s\S]*?\});/);
    if (stateMatch) {
      try {
        const parsed = JSON.parse(stateMatch[1]);
        if (parsed.totalProblemsSolved !== undefined) {
          totalSolved = parsed.totalProblemsSolved;
          easy = parsed.difficultyBreakDown?.easy || 0;
          medium = parsed.difficultyBreakDown?.medium || 0;
          hard = parsed.difficultyBreakDown?.hard || 0;
        }
      } catch {
        // ignore
      }
    }

    return {
      username,
      profileLink: profileUrl,
      totalSolved,
      difficulty: {
        easy,
        medium,
        hard,
      }
    };
  } catch (error) {
    logger.warn(`GFG direct scrape failed for ${username}: ${error.message}`);
    return null;
  }
}
