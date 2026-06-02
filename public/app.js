const API_BASE = window.location.protocol === "file:" ? "http://localhost:3005" : "";
const FALLBACK_INVITE = "https://discord.com/api/oauth2/authorize?client_id=1502741879211425792&permissions=8&scope=bot%20applications.commands";

// Global cache for dynamic filtering
let cachedContests = [];
let activeContestFilter = "All";

document.addEventListener("DOMContentLoaded", () => {
  // Set initial fallback invite URLs
  setInviteUrls(FALLBACK_INVITE);
  
  // Fetch initial APIs
  fetchInviteLink();
  fetchStats();
  fetchServers();
  fetchContests();
  fetchPotd();
  fetchStarboard();

  // Handle URL hashes if users navigate directly
  handleHashTab();
});

// Helper: Format large numbers with commas safely
function formatNumber(num) {
  if (num === undefined || num === null) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getFriendlyErrorMessage(error) {
  let msg = error.message || String(error);
  if (window.location.protocol === "file:") {
    msg += " (CORS restriction or server offline. Try loading http://localhost:3005 in your browser instead)";
  }
  return msg;
}

function setInviteUrls(url) {
  const btnIds = ["nav-invite-btn", "hero-invite-btn", "section-invite-btn"];
  btnIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = url;
  });
}

// 1. Tab Switching Logic
window.switchTab = function(tabId) {
  // Hide all panels
  const panels = document.querySelectorAll(".tab-panel");
  panels.forEach(p => p.classList.remove("active"));

  // Show selected panel
  const targetPanel = document.getElementById(tabId);
  if (targetPanel) targetPanel.classList.add("active");

  // Update navbar active state
  const tabBtns = document.querySelectorAll(".nav-tab-btn");
  tabBtns.forEach(btn => {
    btn.classList.remove("active");
    // Match based on button function arguments
    if (btn.getAttribute("onclick")?.includes(tabId)) {
      btn.classList.add("active");
    }
  });

  // Track tab hash in browser URL
  window.location.hash = tabId.replace("tab-", "");
};

function handleHashTab() {
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    const panelId = `tab-${hash}`;
    if (document.getElementById(panelId)) {
      window.switchTab(panelId);
    }
  }
}

// 2. Fetch Invite Link
async function fetchInviteLink() {
  try {
    const res = await fetch(`${API_BASE}/api/bot-invite`);
    const data = await res.json();
    if (data && data.url) {
      setInviteUrls(data.url);
    }
  } catch (error) {
    console.warn("Using fallback invite link due to fetch issue:", error);
  }
}

// 3. Fetch Dashboard Statistics
async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    document.getElementById("stat-servers").innerText = formatNumber(data.servers || 0);
    document.getElementById("stat-members").innerText = formatNumber(data.members || 0);
    document.getElementById("stat-contests").innerText = formatNumber(data.contestsTracked || 0);
    
    // Console visual counts
    document.getElementById("console-server-count").innerText = data.servers || 0;
    document.getElementById("console-member-count").innerText = formatNumber(data.members || 0);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
  }
}

// 4. Fetch Active Communities (Servers)
async function fetchServers() {
  const grid = document.getElementById("communities-grid");
  try {
    const res = await fetch(`${API_BASE}/api/servers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const servers = await res.json();
    if (!Array.isArray(servers)) throw new Error("Invalid response format");
    
    if (servers.length === 0) {
      grid.innerHTML = `
        <div class="no-potd-msg" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-circle-info" style="font-size: 2rem; margin-bottom: 12px; color: var(--color-primary);"></i>
          <p>No active communities yet. Invite AlgoBot to your server to see it here!</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = servers.map(server => {
      if (!server) return "";
      const serverName = server.name || "Unnamed Server";
      const memberCount = server.memberCount || 0;
      const initials = serverName.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
      
      const iconHTML = server.iconUrl 
        ? `<img class="server-icon" src="${server.iconUrl}" alt="${serverName}" onerror="this.outerHTML='<div class=&quot;server-icon&quot;>${initials}</div>'">`
        : `<div class="server-icon">${initials}</div>`;
      
      const contestBadge = server.contestChannel && server.contestChannel !== "Not Configured"
        ? `<span class="badge badge-active"><i class="fa-solid fa-hashtag"></i> ${server.contestChannel}</span>`
        : `<span class="badge badge-disabled">Disabled</span>`;
        
      const potdBadge = server.potdChannel && server.potdChannel !== "Not Configured"
        ? `<span class="badge badge-active"><i class="fa-solid fa-hashtag"></i> ${server.potdChannel}</span>`
        : `<span class="badge badge-disabled">Disabled</span>`;
 
      const resourceBadge = server.resourceChannel && server.resourceChannel !== "Not Configured"
        ? `<span class="badge badge-active"><i class="fa-solid fa-hashtag"></i> ${server.resourceChannel}</span>`
        : `<span class="badge badge-disabled">Disabled</span>`;
 
      return `
        <div class="community-card">
          <div class="community-header">
            ${iconHTML}
            <div class="server-info">
              <h4>${serverName}</h4>
              <div class="member-count">
                <i class="fa-solid fa-user-group"></i>
                <span>${formatNumber(memberCount)} members</span>
              </div>
            </div>
          </div>
          <div class="channel-configs">
            <div class="config-item">
              <span class="config-label"><i class="fa-solid fa-trophy"></i> Contests</span>
              ${contestBadge}
            </div>
            <div class="config-item">
              <span class="config-label"><i class="fa-solid fa-calendar-day"></i> POTD</span>
              ${potdBadge}
            </div>
            <div class="config-item">
              <span class="config-label"><i class="fa-solid fa-book"></i> Resources</span>
              ${resourceBadge}
            </div>
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Failed to fetch communities list:", error);
    grid.innerHTML = `
      <div class="no-potd-msg" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: var(--color-error); margin-bottom: 12px;"></i>
        <p style="font-weight: 600; margin-bottom: 4px;">Failed to load active communities.</p>
        <span style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">${getFriendlyErrorMessage(error)}</span>
      </div>
    `;
  }
}

// 5. Fetch Upcoming Contests
async function fetchContests() {
  const container = document.getElementById("contests-list");
  try {
    const res = await fetch(`${API_BASE}/api/contests`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    cachedContests = data;
    renderContestGrid();
  } catch (error) {
    console.error("Failed to fetch contests:", error);
    container.innerHTML = `
      <div class="no-potd-msg" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: var(--color-error); margin-bottom: 12px;"></i>
        <p style="font-weight: 600; margin-bottom: 4px;">Failed to load upcoming contests.</p>
        <span style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">${getFriendlyErrorMessage(error)}</span>
      </div>
    `;
  }
}

// Helper: Render filtered contests
function renderContestGrid() {
  const container = document.getElementById("contests-list");
  let list = cachedContests;
  
  if (activeContestFilter !== "All") {
    list = cachedContests.filter(c => c.platform === activeContestFilter);
  }

  if (!list || list.length === 0) {
    container.innerHTML = `<p class="no-potd-msg" style="grid-column: 1 / -1;">No upcoming ${activeContestFilter !== "All" ? activeContestFilter : ""} contests scheduled.</p>`;
    return;
  }

  container.innerHTML = list.map(contest => {
    const platformClass = `platform-${contest.platform.toLowerCase()}`;
    return `
      <div class="contest-item">
        <div class="contest-meta">
          <div class="contest-name" title="${contest.contestName}">${contest.contestName}</div>
          <div class="contest-sub">
            <span class="platform-pill ${platformClass}">${contest.platform}</span>
            <span class="contest-time"><i class="fa-regular fa-clock"></i> ${contest.contestTime}</span>
          </div>
        </div>
        <a href="${contest.contestLink}" target="_blank" class="btn-icon-link" title="View details/register">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      </div>
    `;
  }).join("");
}

// Interactive filter tab actions
window.filterContests = function(platform) {
  activeContestFilter = platform;
  
  // Update button active state
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.classList.remove("active");
    if (btn.innerText === platform) {
      btn.classList.add("active");
    }
  });

  renderContestGrid();
};

// 6. Fetch Problem of the Day
async function fetchPotd() {
  const container = document.getElementById("potd-container");
  try {
    const res = await fetch(`${API_BASE}/api/potd`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const potds = await res.json();
    
    if (!Array.isArray(potds) || potds.length === 0) {
      container.innerHTML = `
        <div class="no-potd-msg" style="grid-column: 1 / -1;">
          <i class="fa-regular fa-circle-question" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--text-muted);"></i>
          <p>No problems of the day have been generated yet for today.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = potds.map((potd) => {
      let diffClass = `difficulty-${potd.difficulty.toLowerCase()}`;
      if (!isNaN(potd.difficulty)) {
        const r = Number(potd.difficulty);
        if (r < 1200) diffClass = "difficulty-easy";
        else if (r < 1600) diffClass = "difficulty-medium";
        else diffClass = "difficulty-hard";
      }
      const platformClass = `platform-${potd.platform.toLowerCase()}`;
      
      return `
        <div class="potd-card-inner">
          <h4 class="potd-title">${potd.problemName}</h4>
          <div class="potd-meta">
            <span class="platform-pill ${platformClass}">${potd.platform}</span>
            <span class="difficulty-badge ${diffClass}">${potd.difficulty}</span>
          </div>
          <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;">
            Today's daily challenge is from <strong>${potd.platform}</strong>. Click below to tackle the problem and submit your solution!
          </p>
          <a href="${potd.problemLink}" target="_blank" class="btn btn-primary" style="margin-top: 8px; justify-content: center;">
            Solve Challenge <i class="fa-solid fa-rocket"></i>
          </a>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Failed to fetch POTD:", error);
    container.innerHTML = `
      <div class="no-potd-msg" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: var(--color-error); margin-bottom: 12px;"></i>
        <p style="font-weight: 600; margin-bottom: 4px;">Failed to load problem of the day.</p>
        <span style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">${getFriendlyErrorMessage(error)}</span>
      </div>
    `;
  }
}

// 7. Fetch Leaderboard / Starboard Standings
async function fetchStarboard() {
  const tableBody = document.getElementById("starboard-list");
  try {
    const res = await fetch(`${API_BASE}/api/starboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const leaderboard = await res.json();
    if (!Array.isArray(leaderboard)) throw new Error("Invalid response format");

    if (leaderboard.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="no-potd-msg">
            <i class="fa-solid fa-ranking-star" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--text-muted);"></i>
            <p>No dueling stats found yet on this server. Challenge someone using <code>/duel challenge</code> to start the scoreboard!</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = leaderboard.map((row, idx) => {
      let rankBadge = `${idx + 1}`;
      if (idx === 0) rankBadge = "🥇";
      else if (idx === 1) rankBadge = "🥈";
      else if (idx === 2) rankBadge = "🥉";

      const totalGames = (row.wins || 0) + (row.losses || 0);
      const winRate = totalGames > 0 ? `${Math.round((row.wins / totalGames) * 100)}%` : "0%";

      return `
        <tr>
          <td class="rank-cell">${rankBadge}</td>
          <td class="coder-cell">
            <img class="coder-avatar" src="${row.avatar}" alt="${row.username}">
            <span class="coder-name">${row.username}</span>
          </td>
          <td class="score-cell font-bold">${row.score}</td>
          <td class="win-cell">${row.wins}</td>
          <td class="loss-cell">${row.losses}</td>
          <td class="rate-cell">${winRate}</td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error("Failed to fetch Starboard:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="no-potd-msg">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; color: var(--color-error); margin-bottom: 8px;"></i>
            <p style="font-weight: 600; margin-bottom: 2px;">Failed to load server duelist leaderboard.</p>
            <span style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">${getFriendlyErrorMessage(error)}</span>
          </div>
        </td>
      </tr>
    `;
  }
}
