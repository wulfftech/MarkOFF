// Produces dist/markoff-chrome-{version}.zip and dist/markoff-firefox-{version}.zip
// Run: node dev/build.js
// No dependencies beyond Node built-ins.

const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

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

// ── Minimal ZIP writer (store-only, no compression) ───────────────────────────
// Each file is stored uncompressed so the zip is valid without a compression lib.

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
  // entries: [{ name: string, data: Buffer }]
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name);
    const crc       = crc32(data);
    const size      = data.length;

    const local = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]), // sig
      u16le(20),        // version needed
      u16le(0),         // flags
      u16le(0),         // compression: stored
      u16le(0),         // mod time
      u16le(0),         // mod date
      u32le(crc),
      u32le(size),      // compressed size
      u32le(size),      // uncompressed size
      u16le(nameBytes.length),
      u16le(0),         // extra len
      nameBytes,
      data,
    ]);

    const central = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x01, 0x02]), // sig
      u16le(20),        // version made by
      u16le(20),        // version needed
      u16le(0),         // flags
      u16le(0),         // compression: stored
      u16le(0),         // mod time
      u16le(0),         // mod date
      u32le(crc),
      u32le(size),
      u32le(size),
      u16le(nameBytes.length),
      u16le(0),         // extra len
      u16le(0),         // comment len
      u16le(0),         // disk start
      u16le(0),         // internal attr
      u32le(0),         // external attr
      u32le(offset),    // local header offset
      nameBytes,
    ]);

    localHeaders.push(local);
    centralHeaders.push(central);
    offset += local.length;
  }

  const centralDir  = Buffer.concat(centralHeaders);
  const centralSize = centralDir.length;
  const centralOffset = offset;

  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x05, 0x06]), // sig
    u16le(0),                     // disk number
    u16le(0),                     // disk with central dir
    u16le(entries.length),        // entries on this disk
    u16le(entries.length),        // total entries
    u32le(centralSize),
    u32le(centralOffset),
    u16le(0),                     // comment len
  ]);

  return Buffer.concat([...localHeaders, centralDir, eocd]);
}

// ── Build ─────────────────────────────────────────────────────────────────────

function buildVariant(label, transformManifest) {
  const entries = [];

  for (const rel of SOURCES) {
    const full = path.join(ROOT, rel);
    let data = fs.readFileSync(full);

    if (rel === "manifest.json") {
      const json = JSON.parse(data.toString("utf8"));
      transformManifest(json);
      data = Buffer.from(JSON.stringify(json, null, 2));
    }

    entries.push({ name: rel, data });
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  const version  = manifest.version;
  const outFile  = path.join(DIST, `markoff-${label}-${version}.zip`);

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
});

console.log("done.");
