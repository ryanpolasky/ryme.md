import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import {
  contributionTotal,
  displayHandle,
  languageBarSvg,
  languageBuckets,
  statCards,
} from "./github-stats-utils";
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

  const stats = info.githubStats;
  const handle = displayHandle(info).slice(0, 16);
  const cards = statCards(stats);
  const langs = languageBuckets(stats);

  // ----- Stat cards: 4 across -----
  const cardW = Math.floor((W - M * 2 - 18 * 3) / 4);
  const cardNodes = cards
    .map((c, i) => {
      const x = M + i * (cardW + 18);
      return `<g class="ce-card ce-card-${i}">
      ${sparkle(x + 3, 96, 3.5, P.accent)}
      <text x="${x}" y="124" fill="${P.star}" font-family="${SERIF}" font-size="30" font-weight="700">${esc(c.value)}</text>
      <text x="${x + 1}" y="144" fill="${P.accent}" font-family="${SERIF}" font-size="11" letter-spacing="2">${esc(c.label.toUpperCase())}</text>
      <text x="${x + 1}" y="160" fill="${P.starDim}" font-family="${SERIF}" font-size="9" letter-spacing="1">${esc(c.hint.toUpperCase())}</text>
    </g>`;
    })
    .join("\n  ");

  // ----- Language spectrum bar + legend -----
  const barY = 206;
  const bar = languageBarSvg(langs, M, barY, W - M * 2, 10, P.accent);
  const legendItems = langs.length
    ? langs.slice(0, 4)
    : [{ name: "load github", percentage: 0, color: P.starDim }];
  const legendW = Math.floor((W - M * 2) / 4);
  const legend = legendItems
    .map((l, i) => {
      const x = M + i * legendW;
      const name = l.name.length > 13 ? l.name.slice(0, 12) + "\u2026" : l.name;
      const pct = l.percentage > 0 ? ` ${l.percentage.toFixed(0)}%` : "";
      return `<g><rect x="${x}" y="${barY + 22}" width="9" height="9" fill="${l.color || P.accent}"/>
      <text x="${x + 15}" y="${barY + 31}" fill="${P.star}" font-family="${SERIF}" font-size="11">${esc(name)}${pct}</text></g>`;
    })
    .join("\n  ");

  // ----- Year's contribution total (replaces the heatmap) -----
  const total = contributionTotal(stats);

  const cardDelays = cards
    .map(
      (_, i) =>
        `.ce-card-${i} { animation-delay: ${(loopDuration * (0.12 + i * 0.04)).toFixed(2)}s; }`,
    )
    .join("\n    ");

  const css = `
    ${BASE_KEYFRAMES}
    ${
      loopText
        ? `
    .ce-eyebrow { animation: ceReveal ${DUR} ease-out infinite; }
    .ce-rule { animation: ceWipe ${DUR} ease-out infinite; transform-box: fill-box; transform-origin: left center; animation-delay: ${(loopDuration * 0.06).toFixed(2)}s; }
    .ce-card { animation: ceReveal ${DUR} ease-out infinite; }
    ${cardDelays}
    .ce-bar { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.28).toFixed(2)}s; }
    .ce-leg { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.32).toFixed(2)}s; }
    .ce-total { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.38).toFixed(2)}s; }
    `
        : `
    .ce-rule { transform-box: fill-box; transform-origin: left center; }
    `
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${skyBackdrop(P, W, H, 0x9b5747)}
  ${vignette(W, H)}

  <!-- eyebrow -->
  <g class="ce-eyebrow">
    ${sparkle(M + 6, 56, 5, P.accent)}
    <text x="${M + 22}" y="61" fill="${P.accent}" font-family="${SERIF}" font-size="12" letter-spacing="3.5">OBSERVATORY LOG</text>
    <text x="${W - M}" y="61" text-anchor="end" fill="${P.starDim}" font-family="${SERIF}" font-size="11" letter-spacing="1.5">@${esc(handle.toUpperCase())}</text>
  </g>
  <rect class="ce-rule" x="${M}" y="74" width="${W - M * 2}" height="1" fill="${P.accent}" opacity="0.5"/>

  <!-- stat cards -->
  ${cardNodes}

  <!-- language spectrum -->
  <text class="ce-bar" x="${M}" y="${barY - 12}" fill="${P.starDim}" font-family="${SERIF}" font-size="10" letter-spacing="2">LANGUAGE SPECTRUM</text>
  <g class="ce-bar">${bar}</g>
  <g class="ce-leg">${legend}</g>

  <!-- contribution total -->
  <g class="ce-total">
    <text x="${W / 2}" y="272" text-anchor="middle" font-family="${SERIF}"><tspan fill="${P.star}" font-size="16" font-weight="700">${esc(total)}</tspan><tspan fill="${P.starDim}" font-size="12" letter-spacing="1"> contributions in the past year</tspan></text>
  </g>
</svg>`;
}

const template: SvgTemplate = {
  id: "celestial-github-stats",
  name: "Celestial Observatory",
  description:
    "GitHub year as an observatory log: four stat readings, a language spectrum bar, and the year's contribution total.",
  kind: "svg",
  category: "stats",
  family: "celestial",
  width: W,
  height: H,
  duration: 8,
  fields: ["github"],
  renderSvg,
};

export default template;
