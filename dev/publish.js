// Publishes dist zips to Chrome Web Store + AMO.
// Run: node dev/publish.js [--chrome] [--amo] [--list]
// No dependencies beyond Node built-ins.
// Credentials live in dev/publish.config.json (gitignored) — see publish.config.example.json.

const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "dev", "publish.config.json");

// ── config ───────────────────────────────────────────────────────────────────

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("✗ dev/publish.config.json not found.");
    console.error("  Copy dev/publish.config.example.json → dev/publish.config.json and fill in credentials.");
    process.exit(1);
  }
  // strip BOM if present (PowerShell Set-Content UTF8 adds one)
  const raw = fs.readFileSync(CONFIG_PATH, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function findZip(store) {
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).version;
  const zip = path.join(ROOT, "dist", `markoff-${store}-${version}.zip`);
  if (!fs.existsSync(zip)) {
    console.error(`✗ ${path.relative(ROOT, zip)} not found — run "node dev/build.js" first.`);
    process.exit(1);
  }
  return { zip, version };
}

// ── Chrome Web Store ─────────────────────────────────────────────────────────
// API V2 (v1.1 was scheduled to shut down 2026-10-15): upload → publish.
// Auth is a service account when serviceAccountKeyFile is set — no consent
// screen and no 7-day token expiry. The refresh-token flow is the fallback.

const CWS_SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const CWS_API   = "https://chromewebstore.googleapis.com";

async function exchangeToken(body, tokenUri = "https://oauth2.googleapis.com/token") {
  const res = await fetch(tokenUri, { method: "POST", body });
  const tok = await res.json();
  if (tok.error) throw new Error(`token exchange failed: ${tok.error} — ${tok.error_description ?? ""}`);
  return tok.access_token;
}

function serviceAccountToken(keyFile) {
  const key = JSON.parse(fs.readFileSync(path.resolve(ROOT, "dev", keyFile), "utf8").replace(/^﻿/, ""));
  const b64url = (s) => Buffer.from(s).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({ iss: key.client_email, scope: CWS_SCOPE, aud: key.token_uri, iat: now, exp: now + 3600 }));
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  return exchangeToken(new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${unsigned}.${sig}`,
  }), key.token_uri);
}

function chromeAccessToken(cfg) {
  if (cfg.serviceAccountKeyFile) return serviceAccountToken(cfg.serviceAccountKeyFile);
  return exchangeToken(new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: cfg.refreshToken,
    grant_type: "refresh_token",
  }));
}

function chromeItemName(cfg) {
  if (!cfg.publisherId) throw new Error("chrome.publisherId missing from dev/publish.config.json (Developer Dashboard → Publisher → Settings)");
  return `publishers/${cfg.publisherId}/items/${cfg.itemId}`;
}

async function chromeFetchStatus(name, headers) {
  const res = await fetch(`${CWS_API}/v2/${name}:fetchStatus`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(`fetchStatus failed (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 500)}`);
  return json;
}

async function publishChrome(dryRun) {
  const cfg = loadConfig().chrome;
  const { zip, version } = findZip("chrome");
  const name = chromeItemName(cfg);
  const headers = { Authorization: `Bearer ${await chromeAccessToken(cfg)}` };

  // 1. upload the zip — fails if the manifest version wasn't increased
  console.log(`→ Chrome: uploading v${version} (${(fs.statSync(zip).size / 1024).toFixed(0)} KB)...`);
  const up = await fetch(`${CWS_API}/upload/v2/${name}:upload`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/zip" },
    body: fs.readFileSync(zip),
  });
  const upJson = await up.json();
  if (!up.ok) throw new Error(`upload failed (HTTP ${up.status}): ${JSON.stringify(upJson).slice(0, 500)}`);

  // large uploads finish asynchronously — fetchStatus reports the outcome
  let state = upJson.uploadState;
  for (let i = 0; /PROGRESS/.test(state ?? "") && i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    state = (await chromeFetchStatus(name, headers)).lastAsyncUploadState;
  }
  if (!/SUCCE/.test(state ?? "")) throw new Error(`upload did not succeed: ${state} ${JSON.stringify(upJson).slice(0, 500)}`);
  console.log(`  uploadState: ${state}`);

  if (dryRun) { console.log("  (dry run — skipping publish)"); return; }

  // 2. submit for review, using the visibility saved on the listing
  const pub = await fetch(`${CWS_API}/v2/${name}:publish`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  });
  const pubJson = await pub.json();
  if (!pub.ok) throw new Error(`publish failed (HTTP ${pub.status}): ${JSON.stringify(pubJson).slice(0, 500)}`);
  console.log(`  publish state: ${pubJson.state}`);
  (pubJson.warningInfo?.warnings ?? []).forEach(w => console.log(`  warning: ${w.reason} — ${w.description}`));
  console.log(`✓ Chrome Web Store: v${version} submitted for review`);
}

// ── AMO (Firefox) ────────────────────────────────────────────────────────────
// API key auth = HS256-signed JWT per request. PUT the xpi; AMO auto-submits
// for review unless the addon is set to manual approval.

function amoJwt(apiKey, apiSecret) {
  const b64url = (buf) => Buffer.from(buf).toString("base64url");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ iss: apiKey, iat: now, exp: now + 300 }));
  const sig = crypto.createHmac("sha256", apiSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

async function publishAmo(dryRun) {
  const cfg = loadConfig().amo;
  const { zip, version } = findZip("firefox");
  const jwt = amoJwt(cfg.apiKey, cfg.apiSecret);

  // two-step flow: POST the file to /addons/upload/ → get a UUID,
  // then POST that UUID to the addon's versions endpoint
  console.log(`→ AMO: uploading v${version} (${(fs.statSync(zip).size / 1024).toFixed(0)} KB)...`);
  if (dryRun) { console.log("  (dry run — skipping upload)"); return; }

  // step 1 — upload the file, poll until validation finishes
  const uploadUrl = `https://addons.mozilla.org/api/v5/addons/upload/`;
  const form = new FormData();
  form.append("upload", new Blob([fs.readFileSync(zip)]), `markoff-firefox-${version}.zip`);
  form.append("channel", "listed");

  let up = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `JWT ${jwt}` },
    body: form,
  });
  let upJson = await up.json();
  if (!up.ok) throw new Error(`AMO file upload failed (HTTP ${up.status}): ${JSON.stringify(upJson).slice(0, 500)}`);

  // validation is async — poll until processed
  while (!upJson.processed) {
    await new Promise(r => setTimeout(r, 2000));
    up = await fetch(`${uploadUrl}${upJson.uuid}/`, { headers: { Authorization: `JWT ${jwt}` } });
    upJson = await up.json();
    if (!up.ok) throw new Error(`AMO validation poll failed (HTTP ${up.status}): ${JSON.stringify(upJson).slice(0, 500)}`);
  }
  if (upJson.valid === false) {
    const errs = (upJson.validation?.messages ?? []).map(m => `${m.type}: ${m.message}`).join("; ");
    throw new Error(`AMO validation failed: ${errs.slice(0, 500)}`);
  }
  console.log(`  validation: ${upJson.valid ? "passed" : "warnings only"}, uuid: ${upJson.uuid}`);

  // step 2 — attach the validated upload as a new version
  const verUrl = `https://addons.mozilla.org/api/v5/addons/addon/${cfg.addonSlug}/versions/`;
  const verRes = await fetch(verUrl, {
    method: "POST",
    headers: { Authorization: `JWT ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ upload: upJson.uuid }),
  });
  const verText = await verRes.text();
  let verJson;
  try { verJson = JSON.parse(verText); } catch (_) { verJson = { raw: verText.slice(0, 500) }; }

  if (!verRes.ok) throw new Error(`AMO version create failed (HTTP ${verRes.status}): ${JSON.stringify(verJson).slice(0, 500)}`);
  console.log(`  version: ${verJson.version ?? version}, channel: ${verJson.channel ?? "listed"}`);
  console.log(`✓ AMO: v${version} submitted for review`);
}

// ── listing check (read-only) ────────────────────────────────────────────────

async function listVersions() {
  const cfg = loadConfig();

  // chrome
  const headers = { Authorization: `Bearer ${await chromeAccessToken(cfg.chrome)}` };
  const item = await chromeFetchStatus(chromeItemName(cfg.chrome), headers);
  const describe = (rev) => rev
    ? `v${rev.distributionChannels?.[0]?.crxVersion ?? "?"} (${rev.state})`
    : "none";
  console.log(`Chrome: published ${describe(item.publishedItemRevisionStatus)}, submitted ${describe(item.submittedItemRevisionStatus)}`);

  // amo
  const jwt = amoJwt(cfg.amo.apiKey, cfg.amo.apiSecret);
  const a = await fetch(`https://addons.mozilla.org/api/v5/addons/addon/${cfg.amo.addonSlug}/`, {
    headers: { Authorization: `JWT ${jwt}` },
  });
  const addon = await a.json();
  console.log(`AMO:    v${addon.current_version?.version} (status: ${addon.status})`);
}

// ── cli ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

(async () => {
  try {
    if (args.includes("--list")) {
      await listVersions();
    } else if (args.includes("--chrome")) {
      await publishChrome(dryRun);
    } else if (args.includes("--amo")) {
      await publishAmo(dryRun);
    } else {
      await publishChrome(dryRun);
      await publishAmo(dryRun);
    }
  } catch (e) {
    console.error(`✗ ${e.message}`);
    // exitCode, not exit(): exiting while fetch's sockets close trips a libuv assertion on Windows
    process.exitCode = 1;
  }
})();
