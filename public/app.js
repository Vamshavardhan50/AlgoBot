const API_BASE = window.location.protocol === "file:" ? "http://localhost:3005" : "";
const FALLBACK_INVITE = "https://discord.com/api/oauth2/authorize?client_id=1502741879211425792&permissions=8&scope=bot%20applications.commands";

let cachedContests = [];
let activeContestFilter = "All";

document.addEventListener("DOMContentLoaded", () => {
  setInviteUrls(FALLBACK_INVITE);
  fetchInviteLink();
  fetchStats();
  fetchServers();
  fetchContests();
  fetchPotd();
  fetchStarboard();
  fetchJobs();
  handleHashTab();
});

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
  ["nav-invite-btn", "hero-invite-btn", "section-invite-btn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = url;
  });
}

// ── Tabs ────────────────────────────────────────────────
window.switchTab = function(tabId) {
  document.querySelectorAll(".tab").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById("tab-" + tabId);
  if (panel) panel.classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("onclick")?.includes(tabId)) {
      btn.classList.add("active");
    }
  });

  window.location.hash = tabId;
};

function handleHashTab() {
  const hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById("tab-" + hash)) {
    window.switchTab(hash);
  }
}

// ── Invite Link ─────────────────────────────────────────
async function fetchInviteLink() {
  try {
    const res = await fetch(`${API_BASE}/api/bot-invite`);
    const data = await res.json();
    if (data && data.url) setInviteUrls(data.url);
  } catch (e) { console.warn("Using fallback invite link"); }
}

// ── Stats ───────────────────────────────────────────────
async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    document.getElementById("stat-servers").innerText = formatNumber(data.servers || 0);
    document.getElementById("stat-members").innerText = formatNumber(data.members || 0);
    document.getElementById("stat-contests").innerText = formatNumber(data.contestsTracked || 0);
    document.getElementById("console-servers").innerText = data.servers || 0;
    document.getElementById("console-members").innerText = formatNumber(data.members || 0);
  } catch (e) { console.error("Stats fetch failed:", e); }
}

// ── Servers ─────────────────────────────────────────────
async function fetchServers() {
  const grid = document.getElementById("servers-grid");
  try {
    const res = await fetch(`${API_BASE}/api/servers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const servers = await res.json();
    if (!Array.isArray(servers)) throw new Error("Invalid response");

    if (servers.length === 0) {
      grid.innerHTML = `<div class="empty"><i class="fa-solid fa-circle-info" style="font-size:1.5rem;margin-bottom:8px;display:block"></i>No active servers yet. Invite AlgoBot to your server!</div>`;
      return;
    }

    grid.innerHTML = servers.map(s => {
      if (!s) return "";
      const name = s.name || "Unnamed Server";
      const members = s.memberCount || 0;
      const initials = name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
      const icon = s.iconUrl
        ? `<img class="server-icon" src="${s.iconUrl}" alt="${name}" onerror="this.outerHTML='<div class=\\'server-icon\\'>${initials}</div>'">`
        : `<div class="server-icon">${initials}</div>`;

      return `<div class="server-card">
        <div class="server-head">
          ${icon}
          <div><h4>${name}</h4><p><i class="fa-solid fa-user-group"></i> ${formatNumber(members)} members</p></div>
        </div>
      </div>`;
    }).join("");
  } catch (e) {
    console.error("Servers fetch failed:", e);
    grid.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;margin-bottom:6px;display:block"></i>Failed to load servers.<br><span style="font-size:.8rem">${getFriendlyErrorMessage(e)}</span></div>`;
  }
}

// ── Contests ────────────────────────────────────────────
async function fetchContests() {
  const container = document.getElementById("contests-list");
  try {
    const res = await fetch(`${API_BASE}/api/contests`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid response");
    cachedContests = data;
    renderContestGrid();
  } catch (e) {
    console.error("Contests fetch failed:", e);
    container.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;margin-bottom:6px;display:block"></i>Failed to load contests.<br><span style="font-size:.8rem">${getFriendlyErrorMessage(e)}</span></div>`;
  }
}

function renderContestGrid() {
  const container = document.getElementById("contests-list");
  let list = cachedContests;
  if (activeContestFilter !== "All") {
    list = cachedContests.filter(c => c.platform === activeContestFilter);
  }
  if (!list || list.length === 0) {
    container.innerHTML = `<div class="empty">No ${activeContestFilter !== "All" ? activeContestFilter + " " : ""}contests scheduled.</div>`;
    return;
  }
  container.innerHTML = list.map(c => `<div class="contest-card">
    <div class="contest-row">
      <div>
        <div class="contest-name" title="${c.contestName}">${c.contestName}</div>
        <div class="contest-meta">
          <span class="platform-tag">${c.platform}</span>
          <span><i class="fa-regular fa-clock"></i> ${c.contestTime}</span>
        </div>
      </div>
      <a href="${c.contestLink}" target="_blank" class="contest-link" title="View"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
    </div>
  </div>`).join("");
}

window.filterContests = function(platform) {
  activeContestFilter = platform;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.innerText === platform || (platform === "LeetCode" && btn.innerText === "LC") ||
        (platform === "Codeforces" && btn.innerText === "CF") ||
        (platform === "CodeChef" && btn.innerText === "CC") ||
        (platform === "AtCoder" && btn.innerText === "AC")) {
      btn.classList.add("active");
    }
  });
  renderContestGrid();
};

// ── POTD ────────────────────────────────────────────────
async function fetchPotd() {
  const container = document.getElementById("potd-container");
  try {
    const res = await fetch(`${API_BASE}/api/potd`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const potds = await res.json();
    if (!Array.isArray(potds) || potds.length === 0) {
      container.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fa-regular fa-circle-question" style="font-size:2rem;margin-bottom:8px;display:block"></i>No problems today yet.</div>`;
      return;
    }
    container.innerHTML = potds.map(p => {
      let diff = p.difficulty.toLowerCase();
      if (!isNaN(p.difficulty)) {
        const r = Number(p.difficulty);
        diff = r < 1200 ? "easy" : r < 1600 ? "medium" : "hard";
      }
      return `<div class="potd-card">
        <h4>${p.problemName}</h4>
        <div class="potd-tags">
          <span class="platform-tag">${p.platform}</span>
          <span class="diff-tag">${diff}</span>
        </div>
        <p style="color:var(--text-secondary);font-size:.85rem;line-height:1.6">Today's challenge from <strong>${p.platform}</strong>.</p>
        <a href="${p.problemLink}" target="_blank" class="btn btn-primary btn-sm" style="align-self:flex-start">Solve <i class="fa-solid fa-rocket"></i></a>
      </div>`;
    }).join("");
  } catch (e) {
    console.error("POTD fetch failed:", e);
    container.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;margin-bottom:6px;display:block"></i>Failed to load POTD.<br><span style="font-size:.8rem">${getFriendlyErrorMessage(e)}</span></div>`;
  }
}

// ── Jobs ────────────────────────────────────────────────
async function fetchJobs() {
  const container = document.getElementById("jobs-container");
  try {
    const res = await fetch(`${API_BASE}/api/jobs`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const jobs = await res.json();
    if (!Array.isArray(jobs) || jobs.length === 0) {
      container.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fa-regular fa-circle-question" style="font-size:2rem;margin-bottom:8px;display:block"></i>No jobs available right now.</div>`;
      return;
    }
    container.innerHTML = jobs.map(j => {
      const cats = (j.categories || []).map(c => `<span class="platform-tag">${c}</span>`).join(" ");
      const desc = (j.description || "").length > 180 ? j.description.slice(0, 180) + "…" : (j.description || "");
      return `<div class="job-card">
        <div class="job-cats">${cats}</div>
        <h4>${j.title}</h4>
        <p>${desc}</p>
        <div class="job-actions">
          ${j.applyLink ? `<a href="${j.applyLink}" target="_blank" class="btn btn-primary btn-sm">Apply <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}
          <a href="${j.url}" target="_blank" class="btn btn-secondary btn-sm">Details <i class="fa-solid fa-info-circle"></i></a>
        </div>
        ${j.date ? `<div class="job-date"><i class="fa-regular fa-calendar"></i> ${new Date(j.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</div>` : ""}
      </div>`;
    }).join("");
  } catch (e) {
    console.error("Jobs fetch failed:", e);
    container.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;margin-bottom:6px;display:block"></i>Failed to load jobs.<br><span style="font-size:.8rem">${getFriendlyErrorMessage(e)}</span></div>`;
  }
}

// ── Starboard ───────────────────────────────────────────
async function fetchStarboard() {
  const tbody = document.getElementById("starboard-list");
  try {
    const res = await fetch(`${API_BASE}/api/starboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const leaderboard = await res.json();
    if (!Array.isArray(leaderboard)) throw new Error("Invalid response");

    if (leaderboard.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><i class="fa-solid fa-ranking-star" style="font-size:2rem;margin-bottom:8px;display:block"></i>No duel stats yet. Use <code>/duel challenge</code> to start!</div></td></tr>`;
      return;
    }

    tbody.innerHTML = leaderboard.map((row, idx) => {
      const rank = idx === 0 ? "\u{1F947}" : idx === 1 ? "\u{1F948}" : idx === 2 ? "\u{1F949}" : `${idx + 1}`;
      const total = (row.wins || 0) + (row.losses || 0);
      const rate = total > 0 ? `${Math.round((row.wins / total) * 100)}%` : "0%";
      return `<tr>
        <td class="rank">${rank}</td>
        <td class="coder"><img src="${row.avatar}" alt=""><span>${row.username}</span></td>
        <td class="score">${row.score}</td>
        <td>${row.wins}</td>
        <td>${row.losses}</td>
        <td>${rate}</td>
      </tr>`;
    }).join("");
  } catch (e) {
    console.error("Starboard fetch failed:", e);
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;margin-bottom:6px;display:block"></i>Failed to load leaderboard.</div></td></tr>`;
  }
}
