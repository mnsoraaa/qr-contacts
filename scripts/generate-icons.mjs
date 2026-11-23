// Generates the PWA / favicon PNGs in public/icons from an inline SVG.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const finder = (x, y) => `
  <rect x="${x}" y="${y}" width="140" height="140" rx="28" fill="#fff"/>
  <rect x="${x + 22}" y="${y + 22}" width="96" height="96" rx="14" fill="#111827"/>
  <rect x="${x + 44}" y="${y + 44}" width="52" height="52" rx="10" fill="#fff"/>`;

// `pad` shrinks the artwork so maskable icons keep content in the safe zone.
const svg = (pad = 0, rounded = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#111827"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    ${finder(76, 76)}
    ${finder(296, 76)}
    ${finder(76, 296)}
    <!-- contact badge in the fourth corner -->
    <circle cx="366" cy="366" r="80" fill="#22c55e"/>
    <circle cx="366" cy="340" r="24" fill="#fff"/>
    <path d="M322 412c4-28 22-42 44-42s40 14 44 42z" fill="#fff"/>
  </g>
</svg>`;

const out = new URL("../public/icons/", import.meta.url);
await mkdir(out, { recursive: true });

const jobs = [
  ["icon-192.png", 192, svg()],
  ["icon-512.png", 512, svg()],
  ["icon-maskable-512.png", 512, svg(64, false)],
  ["apple-touch-icon.png", 180, svg(24, false)],
];

for (const [name, size, src] of jobs) {
  await sharp(Buffer.from(src)).resize(size, size).png().toFile(new URL(name, out).pathname);
}
await writeFile(new URL("icon.svg", out), svg().trim());
console.log("Icons written to public/icons");
