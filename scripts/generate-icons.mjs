/**
 * Generate raster icons (PNG) from public/favicon.svg.
 *
 * Run with `npm run icons` whenever the SVG changes. Outputs:
 *   - favicon-96x96.png   (Google search results)
 *   - favicon-192x192.png (PWA install)
 *   - favicon-512x512.png (PWA splash + app drawers)
 *   - apple-touch-icon.png (iOS home-screen, 180×180 per Apple HIG)
 *
 * Uses @resvg/resvg-js (WASM, no native compile). System fonts are loaded
 * automatically on first call so the SVG's `.md` text falls back to
 * Menlo / SF Mono on macOS without us bundling JetBrains Mono.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "public", "favicon.svg");
const OUT = join(ROOT, "public");

const TARGETS = [
  { name: "favicon-96x96.png",   size: 96  },
  { name: "favicon-192x192.png", size: 192 },
  { name: "favicon-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

const svg = readFileSync(SOURCE, "utf8");

console.log(`Generating ${TARGETS.length} icons from public/favicon.svg…`);

for (const { name, size } of TARGETS) {
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0, 0, 0, 0)",
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();

  writeFileSync(join(OUT, name), png);
  console.log(`  → ${name.padEnd(24)} ${size}×${size}  (${png.length} bytes)`);
}

console.log("done.");
