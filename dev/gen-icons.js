// Generates icon16.png, icon48.png, icon128.png from scratch using raw PNG encoding.
// No dependencies. Run: node _dev/gen-icons.js
// Produces a purple circle with a red diagonal strike — matching icon.svg concept.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function makePNG(size) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;

  // Build raw RGBA pixel data
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > r) {
        // Transparent outside circle
        pixels[idx] = pixels[idx+1] = pixels[idx+2] = pixels[idx+3] = 0;
        continue;
      }

      // Purple background: #6b21a8
      let R = 0x6b, G = 0x21, B = 0xa8, A = 255;

      // Draw a diagonal red strike line (top-right to bottom-left)
      // Line from (0.22*size, 0.78*size) to (0.78*size, 0.22*size)
      // Perpendicular distance from point to line
      const lw = Math.max(2, size * 0.07); // line width
      // Line direction: (1,-1)/sqrt(2). Perp distance = |dx + dy| / sqrt(2)
      const normDist = Math.abs((x - size * 0.22) + (y - size * 0.78)) / Math.SQRT2;
      const along = ((x - size * 0.22) - (y - size * 0.78)) / Math.SQRT2;
      const lineLen = size * 0.78;
      if (normDist < lw / 2 && along >= 0 && along <= lineLen) {
        R = 0xf8; G = 0x71; B = 0x71; // #f87171 red
      }

      // Tag outline — simplified: just a pentagon-ish shape outline
      // Draw a small dot for the hole at (0.37*size, 0.34*size)
      const holeDist = Math.sqrt((x - size*0.37)**2 + (y - size*0.34)**2);
      if (holeDist < size * 0.055) {
        R = 0xe9; G = 0xd5; B = 0xff; // #e9d5ff light purple
      }

      pixels[idx] = R; pixels[idx+1] = G; pixels[idx+2] = B; pixels[idx+3] = A;
    }
  }

  return encodePNG(size, size, pixels);
}

function encodePNG(width, height, rgba) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB — wait, we need RGBA so color type 6
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data: filter byte (0) + row data
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: None
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, "ascii");
    const crcBuf = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, typeB, data, crc]);
  }

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const outDir = path.join(__dirname, "..", "icons");
for (const size of [16, 48, 128]) {
  const png = makePNG(size);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Written: ${outPath} (${png.length} bytes)`);
}
