// Produces dist/markoff-chrome-{version}.zip and dist/markoff-firefox-{version}.zip
// Run: node dev/build.js
// No dependencies beyond Node built-ins.

const fs   = require("fs");
const path = require("path");

const ROOT    = path.resolve(__dirname, "..");
const DIST    = path.join(ROOT, "dist");
const SOURCES = [
  "manifest.json",
  "background.js",
  "sites.js",
  "content/filter.js",
  "popup/popup.html",
  "popup/popup.js",
  "popup/popup.css",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

// ── Minimal ZIP writer ────────────────────────────────────────────────────────
// Entry names use forward slashes (from SOURCES) — required by the ZIP spec and AMO.

function u16le(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32le(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  let c = 0xFFFFFFFF;
  for (const byte of buf) c = table[(c ^ byte) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(entries) {
  const localHeaders = [], centralHeaders = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nb  = Buffer.from(name); // forward slashes preserved from SOURCES
    const crc = crc32(data);
    const sz  = data.length;
    const local = Buffer.concat([
      Buffer.from([0x50,0x4B,0x03,0x04]),
      u16le(20), u16le(0), u16le(0), u16le(0), u16le(0),
      u32le(crc), u32le(sz), u32le(sz),
      u16le(nb.length), u16le(0), nb, data,
    ]);
    centralHeaders.push(Buffer.concat([
      Buffer.from([0x50,0x4B,0x01,0x02]),
      u16le(20), u16le(20), u16le(0), u16le(0), u16le(0), u16le(0),
      u32le(crc), u32le(sz), u32le(sz),
      u16le(nb.length), u16le(0), u16le(0), u16le(0), u16le(0),
      u32le(0), u32le(offset), nb,
    ]));
    localHeaders.push(local);
    offset += local.length;
  }
  const cd   = Buffer.concat(centralHeaders);
  const eocd = Buffer.concat([
    Buffer.from([0x50,0x4B,0x05,0x06]),
    u16le(0), u16le(0),
    u16le(entries.length), u16le(entries.length),
    u32le(cd.length), u32le(offset), u16le(0),
  ]);
  return Buffer.concat([...localHeaders, cd, eocd]);
}

// ── Build ─────────────────────────────────────────────────────────────────────

function buildVariant(label, transformManifest) {
  const entries = [];
  for (const rel of SOURCES) {
    let data = fs.readFileSync(path.join(ROOT, rel));
    if (rel === "manifest.json") {
      const json = JSON.parse(data.toString("utf8"));
      transformManifest(json);
      data = Buffer.from(JSON.stringify(json, null, 2));
    }
    entries.push({ name: rel, data });
  }
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).version;
  const outFile = path.join(DIST, `markoff-${label}-${version}.zip`);
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(outFile, buildZip(entries));
  console.log(`✓ ${path.relative(ROOT, outFile)}  (${entries.length} files)`);
}

buildVariant("chrome", (json) => {
  delete json.browser_specific_settings;
});

buildVariant("firefox", (json) => {
  // Firefox still requires MV2 for service-worker backgrounds to work without flags.
  // AMO accepts MV2; the chrome.* compat layer means all JS files are unchanged.
  json.manifest_version = 2;

  // MV2 uses browser_action instead of action
  json.browser_action = json.action;
  delete json.action;

  // MV2 uses background.scripts instead of service_worker
  json.background = { scripts: ["background.js"] };

  // Required since Firefox 140 — declare what user data the extension collects.
  // Lives under browser_specific_settings.gecko, and "no collection" must be the
  // explicit ["none"] keyword (an empty array reads to the validator as missing).
  // MarkOFF collects nothing; all storage is local user prefs only.
  json.browser_specific_settings.gecko.data_collection_permissions = { required: ["none"] };
});

console.log("done.");
