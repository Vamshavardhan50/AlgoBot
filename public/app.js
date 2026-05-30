const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

document.addEventListener("DOMContentLoaded", () => {
  fetchInviteLink();
  fetchStats();
  fetchServers();
  fetchContests();
  fetchPotd();
});

// Helper: Format large numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 1. Fetch Invite Link
async function fetchInviteLink() {
  try {
    const res = await fetch(`${API_BASE}/api/bot-invite`);
    const data = await res.json();
    if (data.url) {
      document.getElementById("nav-invite-btn").href = data.url;
      document.getElementById("hero-invite-btn").href = data.url;
      document.getElementById("section-invite-btn").href = data.url;
    }
  } catch (error) {
    console.error("Failed to fetch bot invite link:", error);
  }
}

// 2. Fetch Dashboard Statistics
async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
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

// 3. Fetch Active Communities (Servers)
async function fetchServers() {
  const grid = document.getElementById("communities-grid");
  try {
    const res = await fetch(`${API_BASE}/api/servers`);
    const servers = await res.json();
    
    if (!servers || servers.length === 0) {
      grid.innerHTML = `
        <div class="no-potd-msg" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-circle-info" style="font-size: 2rem; margin-bottom: 12px; color: var(--color-primary);"></i>
          <p>No active communities yet. Invite AlgoBot to your server to see it here!</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = servers.map(server => {
      // Create server icon initials if no icon URL
      const initials = server.name ? server.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase() : "CFG";
      const iconHTML = server.iconUrl 
        ? `<img class="server-icon" src="${server.iconUrl}" alt="${server.name}" onerror="this.outerHTML='<div class=&quot;server-icon&quot;>${initials}</div>'">`
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
              <h4>${server.name}</h4>
              <div class="member-count">
                <i class="fa-solid fa-user-group"></i>
                <span>${formatNumber(server.memberCount)} members</span>
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
    grid.innerHTML = `<p class="no-potd-msg" style="grid-column: 1 / -1;">Failed to load active communities.</p>`;
  }
}

// 4. Fetch Upcoming Contests
async function fetchContests() {
  const container = document.getElementById("contests-list");
  try {
    const res = await fetch(`${API_BASE}/api/contests`);
    const contests = await res.json();
    
    if (!contests || contests.length === 0) {
      container.innerHTML = `<p class="no-potd-msg">No upcoming contests scheduled.</p>`;
      return;
    }
    
    container.innerHTML = contests.map(contest => {
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
  } catch (error) {
    console.error("Failed to fetch contests:", error);
    container.innerHTML = `<p class="no-potd-msg">Failed to load upcoming contests.</p>`;
  }
}

// 5. Fetch Problem of the Day
async function fetchPotd() {
  const container = document.getElementById("potd-container");
  try {
    const res = await fetch(`${API_BASE}/api/potd`);
    const potd = await res.json();
    
    if (!potd || !potd.problemName) {
      container.innerHTML = `
        <div class="no-potd-msg">
          <i class="fa-regular fa-circle-question" style="font-size: 2rem; margin-bottom: 8px;"></i>
          <p>No problem of the day has been generated yet for today.</p>
        </div>
      `;
      return;
    }
    
    const diffClass = `difficulty-${potd.difficulty.toLowerCase()}`;
    const platformClass = `platform-${potd.platform.toLowerCase()}`;
    
    container.innerHTML = `
      <div class="potd-card-inner">
        <h4 class="potd-title">${potd.problemName}</h4>
        <div class="potd-meta">
          <span class="platform-pill ${platformClass}">${potd.platform}</span>
          <span class="difficulty-badge ${diffClass}">${potd.difficulty}</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">
          Today's daily challenge is from <strong>${potd.platform}</strong>. Click below to tackle the problem and submit your solution!
        </p>
        <a href="${potd.problemLink}" target="_blank" class="btn btn-primary" style="margin-top: 8px; justify-content: center;">
          Solve Challenge <i class="fa-solid fa-rocket"></i>
        </a>
      </div>
    `;
  } catch (error) {
    console.error("Failed to fetch POTD:", error);
    container.innerHTML = `<p class="no-potd-msg">Failed to load problem of the day.</p>`;
  }
}
