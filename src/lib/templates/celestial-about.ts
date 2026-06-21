import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { wrapByChars } from "../text-utils";
import {
  BASE_KEYFRAMES,
  cePalette,
  esc,
  SERIF,
  skyBackdrop,
  sparkle,
  vignette,
} from "./celestial-shared";

const W = 800;
const H = 300;
const M = 48;

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;
  const P = cePalette(theme);

  const role = (info.role || "").trim();
  const org = (info.org || "").trim();
  const location = (info.location || "").trim();
  const bio = (
    info.bio ||
    "A short orbit through what I build and why. Swap this out for your story -- a couple of sentences on what you make and the problems you like to chase."
  ).trim();

  // Bio paragraph (serif), wrapped to the left ~two-thirds so the decorative
  // mini-constellation on the right has room to breathe.
  const bioW = 540;
  const maxChars = Math.floor(bioW / (15 * 0.52));
  const bioLines = wrapByChars(bio, maxChars, 4);
  const bioNodes = bioLines
    .map(
      (l, i) =>
        `<text class="ce-bio ce-bio-${i}" x="${M}" y="${128 + i * 26}" fill="${P.star}" font-family="${SERIF}" font-size="15">${esc(l)}</text>`,
    )
    .join("\n  ");
  const bioDelays = bioLines
    .map(
      (_, i) =>
        `.ce-bio-${i} { animation-delay: ${(loopDuration * (0.14 + i * 0.04)).toFixed(2)}s; }`,
    )
    .join("\n    ");

  // Meta line (role / org / location) in dim serif caps, like a star label.
  const metaItems = [
    role,
    [org, location].filter(Boolean).join(" \u00B7 "),
  ].filter(Boolean);
  const meta = metaItems.length
    ? `<text class="ce-meta" x="${M}" y="262" fill="${P.starDim}" font-family="${SERIF}" font-size="12" letter-spacing="1.5">${esc(metaItems.map((m) => m.toUpperCase()).join("    \u2726    "))}</text>`
    : "";

  // Decorative mini-constellation, top-right. Static faint lines + twinkling
  // nodes; sits below the vignette so it reads as part of the sky.
  const mc = [
    [636, 84],
    [686, 66],
    [726, 102],
    [700, 142],
    [754, 132],
  ];
  const mcLines = mc
    .slice(0, -1)
    .map((p, i) => {
      const q = mc[i + 1];
      return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${P.accent}" stroke-width="1" opacity="0.4"/>`;
    })
    .join("\n  ");
  const mcDots = mc
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="2.2" fill="${P.accentLight}" opacity="0.85" style="animation: ceTwinkle ${(2 + i * 0.3).toFixed(1)}s ease-in-out ${(i * 0.2).toFixed(2)}s infinite"/>`,
    )
    .join("\n  ");

  const css = `
    ${BASE_KEYFRAMES}
    ${
      loopText
        ? `
    .ce-eyebrow { animation: ceReveal ${DUR} ease-out infinite; }
    .ce-rule { animation: ceWipe ${DUR} ease-out infinite; transform-box: fill-box; transform-origin: left center; animation-delay: ${(loopDuration * 0.06).toFixed(2)}s; }
    .ce-bio { animation: ceReveal ${DUR} ease-out infinite; }
    ${bioDelays}
    .ce-meta { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.34).toFixed(2)}s; }
    `
        : `
    .ce-rule { transform-box: fill-box; transform-origin: left center; }
    `
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${skyBackdrop(P, W, H, 0x5eed01)}

  <!-- decorative mini-constellation -->
  ${mcLines}
  ${mcDots}

  ${vignette(W, H)}

  <!-- eyebrow -->
  <g class="ce-eyebrow">
    ${sparkle(M + 5, 65, 5, P.accent)}
    <text x="${M + 20}" y="70" fill="${P.accent}" font-family="${SERIF}" font-size="12" letter-spacing="4">ABOUT</text>
  </g>
  <rect class="ce-rule" x="${M}" y="82" width="140" height="1.5" fill="${P.accent}" opacity="0.6"/>

  <!-- bio -->
  ${bioNodes}

  <!-- meta -->
  ${meta}
</svg>`;
}

const template: SvgTemplate = {
  id: "celestial-about",
  name: "Celestial Almanac",
  description:
    "Bio rendered as an almanac entry over the night sky: gold eyebrow, serif paragraph, a dim star-label meta line, and a decorative mini-constellation.",
  kind: "svg",
  category: "about",
  family: "celestial",
  width: W,
  height: H,
  duration: 8,
  fields: ["bio", "role", "org", "location"],
  renderSvg,
};

export default template;
