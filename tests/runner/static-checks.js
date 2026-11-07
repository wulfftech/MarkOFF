// tests/runner/static-checks.js
// Runs offline validations: syntax, manifest, selector config, build integrity.
// Run: node tests/runner/static-checks.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const RESULTS = [];

function check(name, fn) {
  try {
    const result = fn();
    RESULTS.push({ name, pass: result.pass !== false, detail: result.detail || "" });
    console.log(`${result.pass !== false ? "✅" : "❌"} ${name}${result.detail ? ` — ${result.detail}` : ""}`);
  } catch (e) {
    RESULTS.push({ name, pass: false, detail: e.message });
    console.error(`❌ ${name} — ${e.message}`);
  }
}

// ── 1. Syntax checks ──────────────────────────────────────────────────────────
check("sites.js Node syntax", () => {
  require("child_process").execSync(`node --check "${path.join(ROOT, "sites.js")}"`, { stdio: "pipe" });
  return { pass: true, detail: "parses cleanly" };
});

check("content/filter.js Node syntax", () => {
  require("child_process").execSync(`node --check "${path.join(ROOT, "content/filter.js")}"`, { stdio: "pipe" });
  return { pass: true, detail: "parses cleanly" };
});

check("popup/popup.js Node syntax", () => {
  require("child_process").execSync(`node --check "${path.join(ROOT, "popup/popup.js")}"`, { stdio: "pipe" });
  return { pass: true, detail: "parses cleanly" };
});

check("background.js Node syntax", () => {
  require("child_process").execSync(`node --check "${path.join(ROOT, "background.js")}"`, { stdio: "pipe" });
  return { pass: true, detail: "parses cleanly" };
});

check("manifest.json valid JSON", () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  return { pass: true, detail: `v${m.version}` };
});

// ── 2. sites.js config integrity ─────────────────────────────────────────────
check("MARKOFF_SITES array loads", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  return { pass: Array.isArray(sites), detail: `${sites.length} entries` };
});

check("Every entry has required keys", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const required = ["id", "name", "domain", "active", "inspected", "selectors", "listingPatterns", "notes"];
  const missing = sites.flatMap((s, i) =>
    required.filter(k => !(k in s)).map(k => `entry[${i}] (${s.id}) missing ${k}`)
  );
  return { pass: missing.length === 0, detail: missing.length ? missing.join(", ") : "all present" };
});

check("Every active entry has domain", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const bad = sites.filter(s => s.active !== false && !s.domain);
  return { pass: bad.length === 0, detail: bad.length ? bad.map(s => s.id).join(", ") : "all have domains" };
});

check("No duplicate domains", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const domains = sites.map(s => s.domain);
  const dupes = domains.filter((d, i) => domains.indexOf(d) !== i);
  return { pass: dupes.length === 0, detail: dupes.length ? dupes.join(", ") : "none" };
});

check("manifest.json matches cover all active domains", () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const manifestDomains = m.content_scripts[0].matches.map(u => u.replace("*://*.", "").replace("/*", ""));
  const activeDomains = sites.filter(s => s.active !== false).map(s => s.domain);
  const missing = activeDomains.filter(d => !manifestDomains.includes(d));
  return { pass: missing.length === 0, detail: missing.length ? missing.join(", ") : "all covered" };
});

check("detailUrlPattern is valid regex where present", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const bad = [];
  for (const s of sites) {
    if (s.detailUrlPattern) {
      try { new RegExp(s.detailUrlPattern); } catch (e) { bad.push(`${s.id}: ${s.detailUrlPattern}`); }
    }
  }
  return { pass: bad.length === 0, detail: bad.length ? bad.join(", ") : "all valid" };
});

check("filterUrlParamPatterns present when filterUrlParam set", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const bad = sites.filter(s => s.filterUrlParam && !s.filterUrlParamPatterns).map(s => s.id);
  return { pass: bad.length === 0, detail: bad.length ? bad.join(", ") : "all have patterns" };
});

check("Empty selectors on URL-param-only sites (jaycar, chemistwarehouse pending)", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const jaycar = sites.find(s => s.id === "jaycar");
  return { pass: jaycar.selectors.card === "", detail: `jaycar.card="${jaycar.selectors.card}"` };
});

check("Kogan card empty to avoid PDP article-rail false-positive", () => {
  const src = fs.readFileSync(path.join(ROOT, "sites.js"), "utf8");
  const arrSrc = src.match(/const MARKOFF_SITES = (\[[\s\S]*\]);/)[1];
  const sites = eval(arrSrc);
  const kogan = sites.find(s => s.id === "kogan");
  return { pass: kogan.selectors.card === "", detail: `kogan.card="${kogan.selectors.card}"` };
});

check("filter.js detail warning block not a stub", () => {
  const filterJs = fs.readFileSync(path.join(ROOT, "content/filter.js"), "utf8");
  const hasStub = filterJs.includes("// ...existing code...");
  // a call site, not just the definition (which takes anchorEl)
  const hasReal = /showDetailWarning\((?!anchorEl)\w+\)/.test(filterJs);
  return { pass: !hasStub && hasReal, detail: hasStub ? "STUB STILL PRESENT" : "real detail warning restored" };
});

// ── 3. Build outputs ─────────────────────────────────────────────────────────
// zip names follow the manifest version, so a version bump without a rebuild fails here
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).version;

check("Chrome zip exists", () => {
  const zip = path.join(ROOT, "dist", `markoff-chrome-${VERSION}.zip`);
  return { pass: fs.existsSync(zip), detail: zip };
});

check("Firefox zip exists", () => {
  const zip = path.join(ROOT, "dist", `markoff-firefox-${VERSION}.zip`);
  return { pass: fs.existsSync(zip), detail: zip };
});

// ── Summary ──────────────────────────────────────────────────────────────────
const passed = RESULTS.filter(r => r.pass).length;
const failed = RESULTS.filter(r => !r.pass).length;
console.log(`\n────────────────────────────────────────────`);
console.log(`Static checks: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
