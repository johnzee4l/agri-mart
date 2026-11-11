/* Generates the PWA icons (designtokens 15). No image dependency: a rounded sprout
   mark is rasterised with 4x supersampling and written as PNG through zlib.

   Run with: node scripts/make-icons.mjs */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = join(here, "..", "public");

const BRAND = [45, 111, 71];
const MARK = [255, 255, 255];

function inEllipse(x, y, cx, cy, a, b, angle = 0) {
  const dx = x - cx;
  const dy = y - cy;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const u = dx * cos - dy * sin;
  const v = dx * sin + dy * cos;
  return (u * u) / (a * a) + (v * v) / (b * b) <= 1;
}

/* Two leaves above a stem, kept inside the maskable safe circle (60% of the canvas). */
function sprout(x, y) {
  return (
    inEllipse(x, y, 0.566, 0.436, 0.118, 0.06, -0.62) ||
    inEllipse(x, y, 0.434, 0.436, 0.118, 0.06, 0.62) ||
    inEllipse(x, y, 0.5, 0.56, 0.03, 0.112)
  );
}

function pixels(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let hits = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          if (sprout(x, y)) hits += 1;
        }
      }

      const coverage = hits / (samples * samples);
      const offset = (py * size + px) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        rgba[offset + channel] = Math.round(
          BRAND[channel] + (MARK[channel] - BRAND[channel]) * coverage,
        );
      }
      rgba[offset + 3] = 255;
    }
  }

  return rgba;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const name = Buffer.from(type, "ascii");
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));

  return Buffer.concat([length, name, data, checksum]);
}

function png(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(outputDir, { recursive: true });

const targets = [
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
  { name: "maskable-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

targets.forEach(({ name, size }) => {
  writeFileSync(join(outputDir, name), png(size, size, pixels(size)));
  process.stdout.write(`wrote public/${name}\n`);
});
