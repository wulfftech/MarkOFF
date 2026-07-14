// MarkOFF — popup script

// ── Elements ──────────────────────────────────────────────────────────────────
const globalToggle     = document.getElementById("globalToggle");
const modeToggle       = document.getElementById("modeToggle");
const modeHighlight    = document.getElementById("modeHighlight");
const currentSiteSec   = document.getElementById("currentSiteSection");
const currentSiteName  = document.getElementById("currentSiteName");
const currentSiteToggle= document.getElementById("currentSiteToggle");
const inspectedWarning = document.getElementById("inspectedWarning");
const siteList         = document.getElementById("siteList");
const aboutVersion     = document.getElementById("aboutVersion");
const aboutSiteGrid    = document.getElementById("aboutSiteGrid");

let activeSite = null;
let prefs = {};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = tab?.url ? new URL(tab.url).hostname : "";

  activeSite = window.MARKOFF_SITES?.find(
    (s) => s.active !== false && hostname.endsWith(s.domain)
  ) ?? null;

  const activeSites = window.MARKOFF_SITES.filter((s) => s.active !== false);
  const keys = ["globalEnabled", "filterMode", ...activeSites.map((s) => `site_${s.id}`)];
  prefs = await chrome.storage.sync.get(keys);

  if (prefs.globalEnabled === undefined) prefs.globalEnabled = true;
  if (prefs.filterMode   === undefined) prefs.filterMode   = "toggle";
  activeSites.forEach((s) => {
    if (prefs[`site_${s.id}`] === undefined) prefs[`site_${s.id}`] = true;
  });

  renderGlobal();
  renderCurrentSite();
  renderSiteList();
  renderAbout();
  initTabs();
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderGlobal() {
  globalToggle.checked = prefs.globalEnabled;
  document.body.classList.toggle("disabled", !prefs.globalEnabled);
  (prefs.filterMode === "highlight" ? modeHighlight : modeToggle).checked = true;
}

function renderCurrentSite() {
  if (!activeSite) { currentSiteSec.hidden = true; return; }
  currentSiteSec.hidden = false;
  currentSiteName.textContent = activeSite.name;
  currentSiteToggle.checked = !!prefs[`site_${activeSite.id}`];
  inspectedWarning.hidden = !!activeSite.inspected;
}

function renderSiteList() {
  siteList.innerHTML = "";
  window.MARKOFF_SITES.forEach((site) => {
    const li = document.createElement("li");
    li.className = "site-row" + (site.active === false ? " site-inactive" : "");

    const nameSpan = document.createElement("span");
    nameSpan.className = "site-name";
    nameSpan.textContent = site.name.replace(/ \(.*\)$/, ""); // trim parenthetical

    // Show capability tag
    if (site.active !== false && !site.selectors?.badge && site.selectors?.detail) {
      const tag = document.createElement("span");
      tag.className = "tag-detail-only";
      tag.title = "Filters on detail pages only — listing pages show no seller badge";
      tag.textContent = "detail only";
      nameSpan.appendChild(tag);
    } else if (site.active !== false && !site.inspected) {
      const tag = document.createElement("span");
      tag.className = "tag-unverified";
      tag.textContent = "unverified";
      nameSpan.appendChild(tag);
    }

    const label = document.createElement("label");
    label.className = "toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = site.active !== false && !!prefs[`site_${site.id}`];
    input.disabled = site.active === false;
    input.dataset.siteId = site.id;
    if (site.active !== false) input.addEventListener("change", onSiteToggle);
    const slider = document.createElement("span");
    slider.className = "slider";
    label.appendChild(input);
    label.appendChild(slider);

    li.appendChild(nameSpan);
    li.appendChild(label);
    siteList.appendChild(li);
  });
}

function renderAbout() {
  // Version
  const manifest = chrome.runtime.getManifest();
  if (aboutVersion) aboutVersion.textContent = `v${manifest.version}`;

  // Site chips
  if (aboutSiteGrid) {
    aboutSiteGrid.innerHTML = "";
    window.MARKOFF_SITES.forEach((s) => {
      const chip = document.createElement("span");
      chip.className = "about-site-chip" + (s.active === false ? " inactive" : "");
      chip.textContent = s.name.replace(/ \(.*\)$/, "");
      aboutSiteGrid.appendChild(chip);
    });
  }
}

// ── Tab navigation ─────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => { p.hidden = true; });
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).hidden = false;
    });
  });
}

// ── Event handlers ─────────────────────────────────────────────────────────────
[modeToggle, modeHighlight].forEach((radio) => {
  radio.addEventListener("change", async () => {
    prefs.filterMode = radio.value;
    await chrome.storage.sync.set({ filterMode: prefs.filterMode });
    broadcastMessage({ type: "MARKOFF_MODE", mode: prefs.filterMode });
  });
});

globalToggle.addEventListener("change", async () => {
  prefs.globalEnabled = globalToggle.checked;
  await chrome.storage.sync.set({ globalEnabled: prefs.globalEnabled });
  document.body.classList.toggle("disabled", !prefs.globalEnabled);
  broadcastMessage({ type: "MARKOFF_TOGGLE", enabled: prefs.globalEnabled && (activeSite ? !!prefs[`site_${activeSite.id}`] : true) });
});

currentSiteToggle.addEventListener("change", async () => {
  if (!activeSite) return;
  const key = `site_${activeSite.id}`;
  prefs[key] = currentSiteToggle.checked;
  await chrome.storage.sync.set({ [key]: prefs[key] });
  // Sync list toggle
  const listInput = siteList.querySelector(`input[data-site-id="${activeSite.id}"]`);
  if (listInput) listInput.checked = prefs[key];
  broadcastToggle();
});

async function onSiteToggle(e) {
  const siteId = e.target.dataset.siteId;
  const key = `site_${siteId}`;
  prefs[key] = e.target.checked;
  await chrome.storage.sync.set({ [key]: prefs[key] });
  if (activeSite?.id === siteId) currentSiteToggle.checked = prefs[key];
  broadcastToggle();
}

// ── Messaging ──────────────────────────────────────────────────────────────────
function broadcastToggle() {
  const enabled = prefs.globalEnabled &&
    (activeSite ? !!prefs[`site_${activeSite.id}`] : true);
  broadcastMessage({ type: "MARKOFF_TOGGLE", enabled });
}

function broadcastMessage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  });
}

init();
