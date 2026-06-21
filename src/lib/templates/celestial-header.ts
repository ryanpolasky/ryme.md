import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize, wrapByChars } from "../text-utils";
import { cePalette, esc, mulberry32, SERIF } from "./celestial-shared";

/**
 * "Celestial" header -- a night-sky star chart.
 *
 * Fills the elegant-dark void (Neon owns "loud glow," not "refined"): a deep
 * graduated night sky, a stable twinkling starfield, a constellation that
 * draws in star-by-star, and the name in airy serif with a
 * gold star-divider. Built to exploit the looping format -- stars twinkle and
 * the constellation traces every cycle.
 *
 * Palette + starfield helpers live in celestial-shared.ts, shared across the
 * full celestial family (header / about / skills / stats / footer).
 */

const W = 800;
const H = 320;

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;
  const M = 48;
  const P = cePalette(theme);

  const name = (info.name || "Your Name").trim();
  const role = (info.role || "Independent Maker").trim();
  const org = (info.org || "").trim();
  const location = (info.location || "").trim();
  const tagline = (info.tagline || "").trim();

  // --- Starfield (seeded) ---------------------------------------------
  const rng = mulberry32(0x9e3779b9);
  const stars: string[] = [];
  for (let i = 0; i < 44; i++) {
    const x = Math.round(rng() * W);
    const y = Math.round(rng() * H);
    const r = (rng() * 1.3 + 0.4).toFixed(2);
    const baseOp = (rng() * 0.5 + 0.35).toFixed(2);
    const dur = (rng() * 2.5 + 2).toFixed(2);
    const delay = (rng() * 3).toFixed(2);
    const col = rng() > 0.85 ? P.accent : P.star;
    stars.push(
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${baseOp}" style="animation: ceTwinkle ${dur}s ease-in-out ${delay}s infinite"/>`,
    );
  }

  // A few bright stars with cross glints.
  const brightPts = [
    [120, 70],
    [690, 90],
    [560, 240],
    [80, 230],
  ];
  const bright = brightPts
    .map(([x, y], i) => {
      const d = (2.6 + (i % 2) * 0.6).toFixed(1);
      return `<g style="animation: ceTwinkle ${(2.4 + i * 0.4).toFixed(1)}s ease-in-out ${(i * 0.5).toFixed(1)}s infinite">
    <circle cx="${x}" cy="${y}" r="${d}" fill="${P.star}"/>
    <path d="M ${x} ${y - 7} L ${x} ${y + 7} M ${x - 7} ${y} L ${x + 7} ${y}" stroke="${P.star}" stroke-width="0.8" opacity="0.6"/>
  </g>`;
    })
    .join("\n  ");

  // --- Constellation (right side), draws in line by line ----------------
  const cst = [
    [600, 90],
    [660, 140],
    [620, 200],
    [690, 230],
    [720, 170],
  ];
  const cstLines: string[] = [];
  for (let i = 0; i < cst.length - 1; i++) {
    const [x1, y1] = cst[i];
    const [x2, y2] = cst[i + 1];
    const len = Math.round(Math.hypot(x2 - x1, y2 - y1));
    const delay = (loopDuration * (0.18 + i * 0.08)).toFixed(2);
    const drawn = loopText
      ? `stroke-dasharray="${len}" stroke-dashoffset="${len}" style="--l:${len}; animation: ceDraw ${DUR} ease-out ${delay}s infinite"`
      : "";
    cstLines.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${P.accent}" stroke-width="1.2" opacity="0.85" ${drawn}/>`,
    );
  }
  const cstDots = cst
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="2.6" fill="${P.accentLight}" style="animation: ceTwinkle ${(2 + i * 0.3).toFixed(1)}s ease-in-out ${(i * 0.25).toFixed(2)}s infinite"/>`,
    )
    .join("\n  ");

  // --- Text block (left) ----------------------------------------------
  const textW = 420;
  const nameFit = fitFontSize(name, textW, [44, 37, 31, 26], "sans");
  const deckLines = tagline ? wrapByChars(tagline, Math.floor(textW / (14 * 0.5)), 2) : [];
  const metaItems = [role, [org, location].filter(Boolean).join(" \u00B7 ")].filter(Boolean);

  const eyebrowY = 128;
  const nameY = 168;
  const divY = 186;
  const deckY = 212;
  const metaY = 268;

  const deckNodes = deckLines
    .map(
      (l, i) =>
        `<text class="ce-deck ce-deck-${i}" x="${M}" y="${deckY + i * 19}" fill="${P.starDim}" font-family="${SERIF}" font-size="14" font-style="italic">${esc(l)}</text>`,
    )
    .join("\n  ");

  const css = `
    @keyframes ceTwinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
    @keyframes ceDraw { 0%, 12% { stroke-dashoffset: var(--l, 100); } 34%, 90% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; } }
    .ce-star-div { transform-box: fill-box; transform-origin: center; animation: ceStar ${Math.max(6, loopDuration)}s linear infinite; }
    @keyframes ceStar { to { transform: rotate(360deg); } }
    ${
      loopText
        ? `
    .ce-eyebrow { animation: ceReveal ${DUR} ease-out infinite; }
    .ce-name { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.08).toFixed(2)}s; }
    .ce-div { animation: ceWipe ${DUR} ease-out infinite; transform-box: fill-box; transform-origin: left center; animation-delay: ${(loopDuration * 0.14).toFixed(2)}s; }
    .ce-deck { animation: ceReveal ${DUR} ease-out infinite; }
    .ce-deck-0 { animation-delay: ${(loopDuration * 0.2).toFixed(2)}s; }
    .ce-deck-1 { animation-delay: ${(loopDuration * 0.24).toFixed(2)}s; }
    .ce-meta { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.3).toFixed(2)}s; }
    `
        : `
    .ce-div { transform-box: fill-box; transform-origin: left center; }
    `
    }
    @keyframes ceReveal { 0%, 5% { opacity: 0; transform: translateY(5px); } 18%, 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; } }
    @keyframes ceWipe { 0%, 8% { transform: scaleX(0); } 24%, 90% { transform: scaleX(1); } 100% { transform: scaleX(1); } }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="ceSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.skyTop}"/>
      <stop offset="0.55" stop-color="${P.skyMid}"/>
      <stop offset="1" stop-color="${P.skyBottom}"/>
    </linearGradient>
    <radialGradient id="ceVig" cx="0.5" cy="0.4" r="0.75">
      <stop offset="0.6" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
  </defs>
  <style>${css}</style>

  <rect width="${W}" height="${H}" fill="url(#ceSky)"/>

  <!-- starfield -->
  ${stars.join("\n  ")}
  ${bright}

  <!-- constellation -->
  ${cstLines.join("\n  ")}
  ${cstDots}

  <rect width="${W}" height="${H}" fill="url(#ceVig)"/>

  <!-- text -->
  <text class="ce-eyebrow" x="${M}" y="${eyebrowY}" fill="${P.accent}" font-family="${SERIF}" font-size="12" letter-spacing="4">${esc((role || "PROFILE").toUpperCase())}</text>
  <text class="ce-name" x="${M}" y="${nameY}" fill="${P.star}" font-family="${SERIF}" font-size="${nameFit.size}" letter-spacing="1">${esc(nameFit.text)}</text>

  <!-- gold star divider -->
  <g class="ce-div">
    <line x1="${M}" y1="${divY}" x2="${M + 150}" y2="${divY}" stroke="${P.accent}" stroke-width="1"/>
    <path class="ce-star-div" d="M ${M + 168} ${divY - 6} L ${M + 170.5} ${divY - 1} L ${M + 176} ${divY} L ${M + 170.5} ${divY + 1} L ${M + 168} ${divY + 6} L ${M + 165.5} ${divY + 1} L ${M + 160} ${divY} L ${M + 165.5} ${divY - 1} Z" fill="${P.accentLight}"/>
  </g>

  <!-- deck -->
  ${deckNodes}

  <!-- meta -->
  ${
    metaItems.length
      ? `<text class="ce-meta" x="${M}" y="${metaY}" fill="${P.starDim}" font-family="${SERIF}" font-size="12" letter-spacing="1.5">${esc(metaItems.map((m) => m.toUpperCase()).join("    \u2726    "))}</text>`
      : ""
  }
</svg>`;
}

const template: SvgTemplate = {
  id: "celestial-header",
  name: "Celestial Chart",
  description:
    "Night-sky star chart header: graduated sky, a stable twinkling starfield, a constellation that draws in star-by-star, and the name in airy serif with a gold star-divider.",
  kind: "svg",
  category: "header",
  family: "celestial",
  width: W,
  height: H,
  duration: 6,
  fields: ["name", "role", "org", "location", "tagline"],
  renderSvg,
};

export default template;
