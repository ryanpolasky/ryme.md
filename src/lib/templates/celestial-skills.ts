import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { truncateToWidth } from "../text-utils";
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
const M = 48;
const COLS = 2;
const COL_GAP = 40;
const ROW_H = 30;
const LIST_TOP = 110;
const BOTTOM_PAD = 36;

/** Sheet grows with the catalogue: height is a function of skill count. */
function computeLayout(info: ProfileInfo) {
  const skills = info.skills.filter(Boolean);
  const colW = Math.floor((W - M * 2 - COL_GAP * (COLS - 1)) / COLS);
  const rowsTall = Math.max(1, Math.ceil(skills.length / COLS));
  const H = LIST_TOP + rowsTall * ROW_H + BOTTOM_PAD;
  return { skills, colW, rowsTall, H };
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;
  const P = cePalette(theme);
  const { skills, colW, H } = computeLayout(info);

  // Each skill is a "catalogued object": sparkle + serif label + a faux
  // stellar magnitude on the right edge of its column.
  const rows = skills
    .map((s, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = M + col * (colW + COL_GAP);
      const y = LIST_TOP + row * ROW_H;
      const label = truncateToWidth(s, colW - 64, 14, "sans");
      const mag = (1.2 + ((i * 7) % 9) * 0.3).toFixed(1);
      return `<g class="ce-row ce-row-${i}">
      ${sparkle(x + 7, y - 4, 4.5, P.accent)}
      <text x="${x + 22}" y="${y}" fill="${P.star}" font-family="${SERIF}" font-size="14">${esc(label)}</text>
      <text x="${x + colW}" y="${y}" text-anchor="end" fill="${P.starDim}" font-family="${SERIF}" font-size="10" letter-spacing="1">m ${mag}</text>
    </g>`;
    })
    .join("\n  ");

  const empty =
    skills.length === 0
      ? `<text x="${W / 2}" y="${LIST_TOP + 16}" text-anchor="middle" fill="${P.starDim}" font-family="${SERIF}" font-size="13" font-style="italic">— no objects catalogued —</text>`
      : "";

  const rowDelays = skills
    .map(
      (_, i) =>
        `.ce-row-${i} { animation-delay: ${(loopDuration * (0.12 + i * 0.03)).toFixed(2)}s; }`,
    )
    .join("\n    ");

  const css = `
    ${BASE_KEYFRAMES}
    ${
      loopText
        ? `
    .ce-eyebrow { animation: ceReveal ${DUR} ease-out infinite; }
    .ce-count { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.1).toFixed(2)}s; }
    .ce-rule { animation: ceWipe ${DUR} ease-out infinite; transform-box: fill-box; transform-origin: left center; animation-delay: ${(loopDuration * 0.06).toFixed(2)}s; }
    .ce-row { animation: ceReveal ${DUR} ease-out infinite; }
    ${rowDelays}
    `
        : `
    .ce-rule { transform-box: fill-box; transform-origin: left center; }
    `
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${skyBackdrop(P, W, H, 0x57a112)}
  ${vignette(W, H)}

  <!-- eyebrow + count -->
  <g class="ce-eyebrow">
    ${sparkle(M + 6, 64, 5, P.accent)}
    <text x="${M + 22}" y="69" fill="${P.accent}" font-family="${SERIF}" font-size="12" letter-spacing="4">STAR CATALOGUE</text>
  </g>
  <text class="ce-count" x="${W - M}" y="69" text-anchor="end" fill="${P.starDim}" font-family="${SERIF}" font-size="11" letter-spacing="1.5">${skills.length.toString().padStart(2, "0")} OBJECTS</text>
  <rect class="ce-rule" x="${M}" y="82" width="${W - M * 2}" height="1" fill="${P.accent}" opacity="0.5"/>

  <!-- catalogue -->
  ${rows}
  ${empty}
</svg>`;
}

const template: SvgTemplate = {
  id: "celestial-skills",
  name: "Celestial Catalogue",
  description:
    "Skills as a star catalogue: two columns of sparkles + serif labels with faux stellar magnitudes. Sheet grows to fit every object.",
  kind: "svg",
  category: "skills",
  family: "celestial",
  width: W,
  height: LIST_TOP + ROW_H + BOTTOM_PAD,
  duration: 6,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
