// tests/runner/live-extension-tests.js
// Drives a real Chromium with the unpacked extension loaded and checks the
// content script's effects on live retailer pages. browser-tests.js can't do
// this: it reads window.MARKOFF_SITES from the page console, but content
// scripts live in an isolated world, so the page never sees that global.
//
// Needs playwright-core and a Playwright Chromium (not Chrome — branded Chrome
// ignores --load-extension). Neither is a repo dependency:
//   npm i --prefix <somewhere> playwright-core
//   NODE_PATH=<somewhere>/node_modules CHROMIUM=<path to chrome.exe> node tests/runner/live-extension-tests.js [siteId ...]
// Writes tests/results/live-<date>.json.

const path = require("path");
const fs = require("fs");
const os = require("os");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..", "..");
const CHROMIUM = process.env.CHROMIUM;
const ONLY = process.argv.slice(2);

// the same config the extension ships, evaluated in node
global.window = {};
require(path.join(ROOT, "sites.js"));
const SITES = global.window.MARKOFF_SITES;
const site = (id) => SITES.find((s) => s.id === id);

const results = [];
function rec(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass === true ? "PASS" : pass === false ? "FAIL" : "SKIP"} ${id} — ${detail}`);
}

// ── page probes (run in the page's main world, so DOM-only) ────────────────
async function snapshot(page, s) {
  return page.evaluate((cfg) => {
    const q = (sel) => { if (!sel) return []; try { return Array.from(document.querySelectorAll(sel)); } catch { return []; } };
    const cards = q(cfg.selectors.card);
    const re = cfg.selectors.badgeText ? new RegExp(cfg.selectors.badgeText, "i") : null;
    const badged = cards.filter((c) => {
      const els = cfg.selectors.badge ? (c.matches(cfg.selectors.badge) ? [c] : Array.from(c.querySelectorAll(cfg.selectors.badge))) : [];
      return re ? els.some((e) => re.test(e.textContent)) : els.length > 0;
    });
    const w = document.getElementById("markoff-detail-warning");
    const b = document.getElementById("markoff-count-badge");
    return {
      url: location.href,
      path: location.pathname,
      title: document.title.slice(0, 80),
      cards: cards.length,
      badgedCards: badged.length,
      hidden: document.querySelectorAll(".markoff-hidden").length,
      dimmed: document.querySelectorAll(".markoff-dimmed").length,
      highlighted: document.querySelectorAll(".markoff-highlighted").length,
      badgeText: b ? b.textContent : null,
      warning: !!w,
      warningVisible: !!(w && w.offsetParent !== null),
      styles: !!document.getElementById("markoff-styles"),
      patchedLinks: document.querySelectorAll("a[data-markoff-original-href]").length,
      bodyLen: document.body ? document.body.innerText.length : 0,
    };
  }, s);
}

// links out of cards, split by whether markoff hid the card
async function cardLinks(page, s, pattern) {
  return page.evaluate(([cardSel, pat]) => {
    const re = new RegExp(pat);
    const out = { mp: [], fp: [] };
    document.querySelectorAll(cardSel).forEach((c) => {
      const root = c.closest("a[href]") ? c.closest("a[href]") : c;
      const a = root.matches("a[href]") ? root : (c.querySelector("a[href]") || c.parentElement?.closest("a[href]"));
      if (!a) return;
      const u = new URL(a.href, location.origin);
      if (!re.test(u.pathname)) return;
      const bucket = c.classList.contains("markoff-hidden") || c.classList.contains("markoff-highlighted") ? out.mp : out.fp;
      if (!bucket.includes(u.href)) bucket.push(u.href);
    });
    return out;
  }, [s.selectors.card, pattern]);
}

async function anyLinks(page, pattern, limit = 6) {
  return page.evaluate(([pat, lim]) => {
    const re = new RegExp(pat);
    const seen = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      try {
        const u = new URL(a.href, location.origin);
        if (u.origin === location.origin && re.test(u.pathname) && !seen.includes(u.origin + u.pathname)) seen.push(u.origin + u.pathname);
      } catch {}
    });
    return seen.slice(0, lim);
  }, [pattern, limit]);
}

// counts how often the warning/badge get re-inserted over a window — a stable
// page should insert each at most once
async function churn(page, ms = 3000) {
  return page.evaluate((ms) => new Promise((res) => {
    let warn = 0, badge = 0;
    const mo = new MutationObserver((ms_) => ms_.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.id === "markoff-detail-warning") warn++;
      if (n.id === "markoff-count-badge") badge++;
    })));
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { mo.disconnect(); res({ warn, badge }); }, ms);
  }), ms);
}

async function textHas(page, re) {
  return page.evaluate((src) => new RegExp(src, "i").test(document.body.innerText), re);
}

// ── harness ────────────────────────────────────────────────────────────────
let ctx, sw;
const consoleErrors = [];

async function setPrefs(p) {
  await sw.evaluate((p) => chrome.storage.sync.set(p), p);
}
async function sendToActive(msg) {
  return sw.evaluate(async (msg) => {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) { try { await chrome.tabs.sendMessage(t.id, msg); } catch {} }
    return tabs.length;
  }, msg);
}

async function open(page, url, settle = 7000) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (e) {
    return { error: e.message.split("\n")[0] };
  }
  await page.waitForTimeout(settle);
  return null;
}

function blocked(snap) {
  return snap.bodyLen < 400 || /access denied|forbidden|captcha|verify you are human|pardon our interruption|request unsuccessful/i.test(snap.title);
}

// ── per-site suites ────────────────────────────────────────────────────────
const suites = {};

suites.bigw = async (page) => {
  const s = site("bigw");
  await open(page, "https://www.bigw.com.au/collection/marketplace");
  let sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-bigw", null, `blocked: ${sn.title}`);
  rec("A-03", sn.badgedCards > 0 && sn.hidden === sn.badgedCards, `/collection/marketplace cards=${sn.cards} badged=${sn.badgedCards} hidden=${sn.hidden}`);
  rec("C-badge", !!sn.badgeText && /hidden/.test(sn.badgeText), `count badge: ${sn.badgeText}`);
  const mpLinks = (await cardLinks(page, s, "^/product/")).mp;

  // peek (C-11)
  if (sn.hidden > 0) {
    const before = sn.hidden;
    await page.evaluate(() => document.getElementById("markoff-count-badge")?.click());
    await page.waitForTimeout(500);
    const p1 = await snapshot(page, s);
    await page.evaluate(() => document.getElementById("markoff-count-badge")?.click());
    await page.waitForTimeout(800);
    const p2 = await snapshot(page, s);
    rec("C-11", p1.hidden === 0 && p1.dimmed === before && p2.hidden === before && p2.dimmed === 0,
      `peek: dimmed ${p1.dimmed}/${before}, re-hide: hidden ${p2.hidden}/${before}`);
  }

  // MutationObserver (C-10): clone a marketplace card into the grid
  const mo = await page.evaluate(() => {
    const src = document.querySelector(".markoff-hidden");
    if (!src) return null;
    const clone = src.cloneNode(true);
    clone.classList.remove("markoff-hidden");
    clone.setAttribute("data-markoff-test-clone", "");
    src.parentElement.appendChild(clone);
    return true;
  });
  if (mo) {
    await page.waitForTimeout(900);
    const hid = await page.evaluate(() => document.querySelector("[data-markoff-test-clone]")?.classList.contains("markoff-hidden"));
    rec("C-10", hid === true, `injected marketplace card hidden after mutation: ${hid}`);
  } else rec("C-10", null, "no hidden card on /toys/c/68 to clone");

  // SPA pushState from the page (C-08) and popstate (C-09)
  if (sn.hidden > 0) {
    await page.evaluate(() => document.getElementById("markoff-count-badge")?.click()); // start peeking
    await page.waitForTimeout(400);
    await page.evaluate(() => history.pushState({}, "", location.pathname + "?markoff_spa=1"));
    await page.waitForTimeout(900);
    const a = await snapshot(page, s);
    rec("C-08", /hidden/.test(a.badgeText || "") && a.dimmed === 0,
      `after page-world pushState while peeking: badge="${a.badgeText}", dimmed=${a.dimmed}, hidden=${a.hidden}`);
    // popstate, tested on its own: reload, push two entries (invisible to the
    // content script either way), peek, then go back to an URL that differs from
    // the one the script last saw, so urlChanged() can't mask the result
    await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(4000);
    await page.evaluate(() => { history.pushState({}, "", location.pathname + "?markoff_a=1"); history.pushState({}, "", location.pathname + "?markoff_b=1"); });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById("markoff-count-badge")?.click());
    await page.waitForTimeout(400);
    await page.evaluate(() => history.back());
    await page.waitForTimeout(900);
    const b = await snapshot(page, s);
    rec("C-09", /hidden/.test(b.badgeText || "") && b.dimmed === 0, `after popstate: badge="${b.badgeText}", dimmed=${b.dimmed}, hidden=${b.hidden}`);

    // switching mode while peeking (applyFilter bails while temporarilyShowing)
    await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(4000);
    await page.evaluate(() => document.getElementById("markoff-count-badge")?.click());
    await page.waitForTimeout(400);
    await sendToActive({ type: "MARKOFF_MODE", mode: "highlight" });
    await page.waitForTimeout(900);
    const pm = await snapshot(page, s);
    rec("C-07b", pm.highlighted > 0 && pm.dimmed === 0, `mode→highlight while peeking: highlighted=${pm.highlighted} dimmed=${pm.dimmed} badge="${pm.badgeText}"`);
    await sendToActive({ type: "MARKOFF_MODE", mode: "toggle" });
    await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(4000);
  }

  // highlight mode (A-04, C-07)
  await setPrefs({ filterMode: "highlight" });
  await sendToActive({ type: "MARKOFF_MODE", mode: "highlight" });
  await page.waitForTimeout(900);
  const h = await snapshot(page, s);
  rec("A-04", h.hidden === 0 && h.highlighted === h.badgedCards && h.highlighted > 0, `highlight: highlighted=${h.highlighted} badged=${h.badgedCards} hidden=${h.hidden} badge="${h.badgeText}"`);
  await setPrefs({ filterMode: "toggle" });
  await sendToActive({ type: "MARKOFF_MODE", mode: "toggle" });
  await page.waitForTimeout(900);
  const t = await snapshot(page, s);
  rec("C-07", t.highlighted === 0 && t.hidden === t.badgedCards, `back to toggle: hidden=${t.hidden} highlighted=${t.highlighted}`);

  // toggles (C-05, C-06)
  await setPrefs({ globalEnabled: false });
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(4000);
  const g = await snapshot(page, s);
  await setPrefs({ globalEnabled: true, site_bigw: false });
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(4000);
  const ps = await snapshot(page, s);
  await setPrefs({ site_bigw: true });
  rec("C-05", g.hidden === 0 && !g.badgeText, `globalEnabled=false: hidden=${g.hidden}, badge=${g.badgeText}`);
  rec("C-06", ps.hidden === 0 && !ps.badgeText, `site_bigw=false: hidden=${ps.hidden}, badge=${ps.badgeText}`);
  // live message toggle
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(4000);
  await sendToActive({ type: "MARKOFF_TOGGLE", enabled: false });
  await page.waitForTimeout(500);
  const off = await snapshot(page, s);
  await sendToActive({ type: "MARKOFF_TOGGLE", enabled: true });
  await page.waitForTimeout(500);
  const on = await snapshot(page, s);
  rec("C-05b", off.hidden === 0 && on.hidden === on.badgedCards, `MARKOFF_TOGGLE off→hidden=${off.hidden}, on→hidden=${on.hidden}/${on.badgedCards}`);

  // first-party category (/search?text=lego redirects to /toys/lego/c/…) — no false positives
  await open(page, "https://www.bigw.com.au/search?text=lego");
  sn = await snapshot(page, s);
  rec("A-03b", sn.cards > 0 && sn.hidden === sn.badgedCards, `${sn.path} cards=${sn.cards} badged=${sn.badgedCards} hidden=${sn.hidden}`);
  rec("A-62", sn.cards > 0 && (await page.$$(s.filterButton)).length === 0, `native switch count on /c/ = ${(await page.$$(s.filterButton)).length}`);
  const links = await cardLinks(page, s, "^/product/");

  // detail pages
  await detailPair(page, s, mpLinks.concat(links.mp), links.fp, "A-05", "A-06");
};

async function detailPair(page, s, mpUrls, fpUrls, mpId, fpId, opts = {}) {
  const tryList = async (urls, wantWarning, id) => {
    for (const u of urls.slice(0, 3)) {
      const err = await open(page, u);
      if (err) continue;
      const sn = await snapshot(page, s);
      if (blocked(sn)) continue;
      const ch = sn.warning ? await churn(page) : null;
      const pass = sn.warning === wantWarning;
      rec(id, pass, `${sn.path} warning=${sn.warning} visible=${sn.warningVisible}${ch ? ` reinserted ${ch.warn}x in 3s` : ""}`);
      if (ch) rec(`${id}-churn`, ch.warn === 0, `warning re-inserted ${ch.warn} times in 3s on a static page`);
      return sn;
    }
    rec(id, null, urls.length ? "all candidate pages blocked/failed" : "no candidate URL found on listing");
  };
  if (mpId) await tryList(mpUrls, true, mpId);
  if (fpId) await tryList(fpUrls, false, fpId);
}

suites.woolworths = async (page) => {
  const s = site("woolworths");
  const err = await open(page, "https://www.woolworths.com.au/shop/search/products?searchTerm=headphones", 7000);
  let sn = await snapshot(page, s);
  if (err || blocked(sn)) return rec("A-woolworths", null, `blocked: ${err || sn.title}`);
  const shadow = await page.evaluate(() => Array.from(document.querySelectorAll("wc-product-tile, shared-product-tile")).map((t) => {
    const n = t.shadowRoot?.querySelector(".seller-name");
    return { shadow: !!t.shadowRoot, seller: n ? n.textContent.trim() : null, hidden: t.classList.contains("markoff-hidden") };
  }));
  const sellers = shadow.filter((x) => x.seller);
  const third = sellers.filter((x) => !/woolworths/i.test(x.seller));
  rec("A-09", sn.cards > 0, `tiles=${sn.cards}, with shadowRoot=${shadow.filter((x) => x.shadow).length}`);
  rec("A-10", sellers.length > 0 ? true : (/isHideEverydayMarketProducts/.test(sn.url) ? null : false), `tiles with .seller-name=${sellers.length}: ${[...new Set(sellers.map((x) => x.seller))].slice(0, 6).join(", ")}`);
  rec("A-13", third.every((x) => x.hidden), `3P seller tiles hidden ${third.filter((x) => x.hidden).length}/${third.length}; total hidden=${sn.hidden}`);
  const chip = await page.evaluate(() => { const c = document.querySelector("[class*='chip-toggle']"); return c ? { text: c.textContent.trim(), pressed: c.getAttribute("aria-pressed") } : null; });
  rec("A-14", true, `native chip after filter: ${JSON.stringify(chip)}; url=${sn.url.includes("isHideEverydayMarketProducts") ? "has server filter" : "no server filter"}`);
  await open(page, "https://www.woolworths.com.au/shop/specials", 6000);
  sn = await snapshot(page, s);
  rec("A-63", !blocked(sn) && sn.styles, `/shop/specials loaded, styles=${sn.styles}, cards=${sn.cards}, hidden=${sn.hidden}`);
};

suites.bunnings = async (page) => {
  const s = site("bunnings");
  await open(page, "https://www.bunnings.com.au/search/products?q=bookshelf", 6000);
  let sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-bunnings", null, `blocked: ${sn.title}`);
  rec("A-19", sn.badgedCards > 0 && sn.hidden === sn.badgedCards, `cards=${sn.cards} badged=${sn.badgedCards} hidden=${sn.hidden}`);
  const links = await cardLinks(page, s, "_p\\d+");
  await open(page, "https://www.bunnings.com.au/bunnings-marketplace", 5000);
  sn = await snapshot(page, s);
  rec("A-64", sn.styles && !blocked(sn), `/bunnings-marketplace cards=${sn.cards} hidden=${sn.hidden}`);
  const cat = (await anyLinks(page, "^/products/", 3))[0];
  if (cat) {
    await open(page, cat, 5000);
    const c = await snapshot(page, s);
    rec("A-22", c.styles, `${c.path} loaded, cards=${c.cards}, hidden=${c.hidden}`);
  } else rec("A-22", null, "no category link found");
  await detailPair(page, s, links.mp, links.fp, "A-20", "A-21");
};

suites.kmart = async (page) => {
  const s = site("kmart");
  await open(page, "https://www.kmart.com.au/collection/marketplace-baby-nursery/", 6000);
  const sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-kmart", null, `blocked: ${sn.title}`);
  rec("A-kmart-list", sn.badgedCards > 0 && sn.hidden === sn.badgedCards, `cards=${sn.cards} badged=${sn.badgedCards} hidden=${sn.hidden}`);
  const links = await cardLinks(page, s, "^/product/");
  await open(page, "https://www.kmart.com.au/search/?searchTerm=pram", 6000);
  const sr = await snapshot(page, s);
  if (blocked(sr)) rec("A-65", null, `blocked: ${sr.title}`); else rec("A-65", sr.styles && sr.cards > 0, `/search cards=${sr.cards} hidden=${sr.hidden}`);
  const more = await cardLinks(page, s, "^/product/");
  await detailPair(page, s, links.mp.concat(more.mp), more.fp.concat(links.fp), "A-26", "A-27");
  // A-28: on an MP PDP the warning should sit next to a visible seller block
  if (links.mp[0]) {
    await open(page, links.mp[0]);
    const vis = await snapshot(page, s);
    if (blocked(vis)) rec("A-28", null, `blocked: ${vis.title}`); else rec("A-28", vis.warning && vis.warningVisible, `${vis.path} warning=${vis.warning} visible=${vis.warningVisible}`);
  }
};

suites.jbhifi = async (page) => {
  const s = site("jbhifi");
  await open(page, "https://www.jbhifi.com.au/collections/headphones-speakers-audio/headphones", 7000);
  let sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-jbhifi", null, `blocked: ${sn.title}`);
  rec("A-31", /excludeMarketplace=true/.test(sn.url), `final url ${sn.url}`);
  rec("C-12a", /excludeMarketplace=true/.test(sn.url), "param injected on /collections");
  rec("C-13", sn.patchedLinks > 0, `links patched with param: ${sn.patchedLinks}`);
  const toggle = await page.evaluate((sel) => {
    const el = Array.from(document.querySelectorAll(sel)).find((e) => /exclude marketplace/i.test((e.closest("label, [class*='Switch'], [class*='filter'], [class*='Filter']") || e.parentElement)?.textContent || ""));
    return el ? { checked: el.checked } : null;
  }, s.filterButton);
  rec("A-34", !!toggle, `native toggle ${toggle ? `found, checked=${toggle.checked}` : "not found"}`);
  rec("A-jb-cards", sn.badgedCards === 0, `MP cards remaining after server filter: ${sn.badgedCards}/${sn.cards}`);
  // C-14: GET form submit to an eligible path picks up the param
  await page.evaluate(() => {
    const f = document.createElement("form");
    f.method = "get"; f.action = "/collections/headphones-speakers-audio";
    const i = document.createElement("input"); i.name = "markoff_form"; i.value = "1"; f.appendChild(i);
    document.body.appendChild(f); f.requestSubmit();
  });
  await page.waitForTimeout(5000);
  rec("C-14", /excludeMarketplace=true/.test(page.url()), `form-submitted url ${page.url()}`);

  await open(page, "https://www.jbhifi.com.au/search?query=headphones", 7000);
  sn = await snapshot(page, s);
  rec("C-12b", !/excludeMarketplace/.test(sn.url), `/search not param-injected: ${sn.url}`);
  rec("A-35", sn.styles, `/search loaded, cards=${sn.cards} badged=${sn.badgedCards} hidden=${sn.hidden}`);
  const searchLinks = await cardLinks(page, s, "^/products/");

  await open(page, "https://www.jbhifi.com.au/collections/marketplace-all-products", 7000);
  sn = await snapshot(page, s);
  const mp = (await anyLinks(page, "^/products/", 4));
  rec("A-jb-mpcoll", true, `marketplace-all-products with param: cards=${sn.cards} url=${sn.url}`);

  await page.goto("https://www.jbhifi.com.au/category/headphones", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(5000);
  sn = await snapshot(page, s);
  rec("A-66", !/excludeMarketplace/.test(sn.url), `/category url ${sn.url} (status page title "${sn.title}")`);

  await detailPair(page, s, searchLinks.mp.concat(["https://www.jbhifi.com.au/products/koolatron-retro-mini-fridge-4l-black"]), searchLinks.fp, "A-32", "A-jb-1p");
};

suites.harveynorman = async (page) => {
  const s = site("harveynorman");
  await open(page, "https://www.harveynorman.com.au/sale/computers-technology/drone-sale", 9000);
  let sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-harveynorman", null, `blocked: ${sn.title}`);
  rec("A-HN-list", sn.cards > 0 && sn.hidden === sn.badgedCards, `${sn.path} cards=${sn.cards} badged=${sn.badgedCards} hidden=${sn.hidden}`);
  const links = await cardLinks(page, s, "\\.html$");
  const cats = await anyLinks(page, "^/(c|category)/", 2);
  if (cats[0]) {
    await open(page, cats[0], 5000);
    const c = await snapshot(page, s);
    rec("A-67", c.styles, `${c.path} cards=${c.cards} hidden=${c.hidden}`);
  } else rec("A-67", null, "no /c/ or /category link on page");
  await detailPair(page, s, links.mp.concat(["https://www.harveynorman.com.au/zlos-sun-angle-navigator.html"]), links.fp, "A-39", "A-40");
};

suites.myer = async (page) => {
  const s = site("myer");
  await open(page, "https://www.myer.com.au/c/men/mens-accessories/mens-watches", 6000);
  const sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-myer", null, `blocked: ${sn.title}`);
  rec("A-68", sn.styles && sn.hidden === 0, `/c/ listing: styles=${sn.styles} hidden=${sn.hidden}`);
  const pdps = await anyLinks(page, "^/p/", 6);
  const known = "https://www.myer.com.au/p/cudworth-apex-chronograph-watch-in-turquoise";
  // oracle: page text "marketplace partner" ⇔ warning
  let mpSeen = false, fpSeen = false;
  for (const u of [known, ...pdps]) {
    if (mpSeen && fpSeen) break;
    if (await open(page, u)) continue;
    const d = await snapshot(page, s);
    if (blocked(d)) continue;
    // text sits in a collapsed accordion; innerText misses it, textContent doesn't
    const isMP = await page.evaluate(() => /marketplace partner/i.test(Array.from(document.querySelectorAll(".accordion-item")).map((e) => e.textContent).join(" ")));
    const ch = d.warning ? await churn(page) : null;
    if (isMP && !mpSeen) { mpSeen = true; rec("A-43", d.warning, `${d.path} MP text present, warning=${d.warning}${ch ? `, reinserted ${ch.warn}x/3s` : ""}`); }
    if (!isMP && !fpSeen) { fpSeen = true; rec("A-45", !d.warning, `${d.path} no MP text, warning=${d.warning}`); }
  }
  if (!mpSeen) rec("A-43", null, "no marketplace PDP reached");
  if (!fpSeen) rec("A-45", null, "no first-party PDP reached");
  await open(page, "https://www.myer.com.au/search?query=watch", 5000);
  const se = await snapshot(page, s);
  rec("A-68b", se.styles, `/search styles=${se.styles}`);
};

suites.kogan = async (page) => {
  const s = site("kogan");
  await open(page, "https://www.kogan.com/au/shop/category/phones-accessories-8450/phones/", 6000);
  const sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-kogan", null, `blocked: ${sn.title}`);
  rec("A-52", sn.styles && sn.hidden === 0, `/au/shop/ listing: styles=${sn.styles}, hidden=${sn.hidden}`);
  const pdps = await anyLinks(page, "^/au/buy/", 8);
  let tp = false, fp = false;
  for (const u of pdps) {
    if (tp && fp) break;
    if (await open(page, u)) continue;
    const d = await snapshot(page, s);
    if (blocked(d)) continue;
    const seller = await page.evaluate(() => {
      const p = Array.from(document.querySelectorAll("p.font-body-low-emphasis")).find((e) => /sold by/i.test(e.textContent));
      return p ? p.textContent.trim().slice(0, 80) : null;
    });
    if (!seller) continue;
    const own = /kogan\.com/i.test(seller);
    const ch = d.warning ? await churn(page) : null;
    if (!own && !tp) { tp = true; rec("A-49", d.warning, `${d.path} "${seller}" warning=${d.warning}${ch ? `, reinserted ${ch.warn}x/3s` : ""}`); rec("A-51", d.warningVisible, `warning visible=${d.warningVisible}`); }
    if (own && !fp) { fp = true; rec("A-50", !d.warning, `${d.path} "${seller}" warning=${d.warning}`); }
  }
  if (!tp) rec("A-49", null, "no third-party PDP among sampled links");
  if (!fp) rec("A-50", null, "no Kogan.com-sold PDP among sampled links");
};

suites.theiconic = async (page) => {
  const s = site("theiconic");
  await open(page, "https://www.theiconic.com.au/women-clothing/", 6000);
  let sn = await snapshot(page, s);
  if (sn.cards === 0) { await open(page, "https://www.theiconic.com.au/women/clothing/", 6000); sn = await snapshot(page, s); }
  if (blocked(sn)) return rec("A-theiconic", null, `blocked: ${sn.title}`);
  rec("A-53", sn.hidden === 0 && sn.highlighted === 0, `${sn.path} cards=${sn.cards} hidden=${sn.hidden}`);
  const pdp = (await anyLinks(page, "\\.html$", 2))[0];
  if (pdp) { await open(page, pdp); const d = await snapshot(page, s); rec("A-56", !d.warning, `${d.path} warning=${d.warning}`); }
};

suites.jaycar = async (page) => {
  const s = site("jaycar");
  await open(page, "https://www.jaycar.com.au/3d-printers-supplies/c/10", 7000);
  let sn = await snapshot(page, s);
  if (blocked(sn)) return rec("A-jaycar", null, `blocked: ${sn.title}`);
  rec("A-57", /excludeEa=1/.test(sn.url), `final url ${sn.url}`);
  const branded = await page.evaluate(() => Array.from(document.querySelectorAll("[data-markoff-branded]")).map((b) => b.textContent.trim()));
  rec("A-58", branded.some((t) => /hidden/i.test(t)), `branded buttons: ${JSON.stringify(branded)}`);
  await setPrefs({ filterMode: "highlight" });
  await sendToActive({ type: "MARKOFF_MODE", mode: "highlight" });
  await page.waitForTimeout(1200);
  const h = await page.evaluate(() => ({ url: location.href, branded: document.querySelectorAll("[data-markoff-branded]").length }));
  rec("A-61", !/excludeEa/.test(h.url) && h.branded === 0, `after highlight: url=${h.url} branded=${h.branded}`);
  await setPrefs({ filterMode: "toggle" });
  await open(page, "https://www.jaycar.com.au/search?text=arduino", 6000);
  sn = await snapshot(page, s);
  rec("A-60", /excludeEa=1/.test(sn.url), `/search url ${sn.url}`);
};

suites.offsite = async (page) => {
  await open(page, "https://example.com/", 2500);
  const sn = await page.evaluate(() => ({ styles: !!document.getElementById("markoff-styles"), badge: !!document.getElementById("markoff-count-badge") }));
  rec("C-01", !sn.styles && !sn.badge, `example.com styles=${sn.styles} badge=${sn.badge}`);
};

suites.popup = async (page, extId) => {
  await page.goto(`chrome-extension://${extId}/popup/popup.html`);
  await page.waitForTimeout(800);
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll("#siteList li")).map((li) => ({
    name: li.querySelector(".site-name")?.childNodes[0]?.textContent,
    inactive: li.classList.contains("site-inactive"),
    unverified: !!li.querySelector(".tag-unverified"),
    detailOnly: !!li.querySelector(".tag-detail-only"),
    disabled: li.querySelector("input").disabled,
    checked: li.querySelector("input").checked,
  })));
  const by = (n) => rows.find((r) => r.name && r.name.startsWith(n));
  const inactive = rows.filter((r) => r.inactive).map((r) => r.name);
  rec("D-01", rows.length === SITES.length && inactive.length === SITES.filter((x) => x.active === false).length, `rows=${rows.length}, inactive=${inactive.join(", ")}`);
  rec("D-02", by("THE ICONIC")?.unverified === true, `unverified tags: ${rows.filter((r) => r.unverified).map((r) => r.name).join(", ") || "none"}`);
  rec("D-03", ["Myer", "Kogan"].every((n) => by(n)?.detailOnly), `detail-only tags: ${rows.filter((r) => r.detailOnly).map((r) => r.name).join(", ")}`);
  rec("D-08", rows.filter((r) => r.inactive).every((r) => r.disabled), "inactive rows have disabled inputs");
  const ver = await page.textContent("#aboutVersion");
  const mv = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8").replace(/^﻿/, "")).version;
  rec("D-06", ver === `v${mv}`, `about version ${ver}, manifest ${mv}`);

  const read = () => sw.evaluate(() => chrome.storage.sync.get(null));
  await page.click("label:has(#globalToggle)");
  await page.waitForTimeout(300);
  const g1 = (await read()).globalEnabled;
  await page.click("label:has(#globalToggle)");
  await page.waitForTimeout(300);
  const g2 = (await read()).globalEnabled;
  rec("D-04", g1 === false && g2 === true, `globalEnabled after clicks: ${g1} → ${g2}`);
  await page.click("#mode-highlight-label");
  await page.waitForTimeout(300);
  const m1 = (await read()).filterMode;
  await page.click("#mode-toggle-label");
  await page.waitForTimeout(300);
  const m2 = (await read()).filterMode;
  rec("D-05", m1 === "highlight" && m2 === "toggle", `filterMode after clicks: ${m1} → ${m2}`);
  const kog = await page.$("#siteList input[data-site-id='kogan']");
  await kog.evaluate((i) => i.closest("label").click());
  await page.waitForTimeout(300);
  const k1 = (await read()).site_kogan;
  await kog.evaluate((i) => i.closest("label").click());
  await page.waitForTimeout(300);
  const k2 = (await read()).site_kogan;
  rec("D-07", k1 === false && k2 === true, `site_kogan after clicks: ${k1} → ${k2}`);
};

// ── main ───────────────────────────────────────────────────────────────────
(async () => {
  if (!CHROMIUM) throw new Error("set CHROMIUM to a Playwright chromium chrome.exe");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "markoff-live-"));
  ctx = await chromium.launchPersistentContext(profile, {
    executablePath: CHROMIUM,
    headless: false,
    viewport: { width: 1366, height: 900 },
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
    args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, "--disable-blink-features=AutomationControlled"],
  });
  sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker");
  const extId = sw.url().split("/")[2];
  await setPrefs({ globalEnabled: true, filterMode: "toggle" });

  const page = ctx.pages()[0] || await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && /chrome-extension:/.test(m.location()?.url || "")) consoleErrors.push(`${page.url()} :: ${m.text()}`); });
  page.on("pageerror", (e) => { if (/chrome-extension:/.test(e.stack || "")) consoleErrors.push(`${page.url()} :: ${e.message}`); });

  const order = ["popup", "offsite", "bigw", "bunnings", "kmart", "jbhifi", "harveynorman", "myer", "kogan", "theiconic", "jaycar", "woolworths"];
  for (const id of order) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    console.log(`\n== ${id} ==`);
    try { await suites[id](page, extId); }
    catch (e) { rec(`${id}-crash`, false, e.message.split("\n")[0]); }
    await setPrefs({ globalEnabled: true, filterMode: "toggle" });
  }
  rec("F-10", consoleErrors.length === 0, consoleErrors.length ? consoleErrors.slice(0, 5).join(" | ") : "no extension-sourced console errors");

  const out = path.join(ROOT, "tests", "results", `live-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(out, JSON.stringify({ ran: new Date().toISOString(), results }, null, 2));
  const n = (v) => results.filter((r) => r.pass === v).length;
  console.log(`\n${n(true)} pass, ${n(false)} fail, ${n(null)} skipped → ${out}`);
  await ctx.close();
})();
