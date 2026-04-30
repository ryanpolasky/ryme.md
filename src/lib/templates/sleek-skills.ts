import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize } from "../text-utils";
import {
  chipWidth,
  fitChipFontSize,
  packChipsIntoRows,
  rowWidth,
} from "../chip-layout";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Pure layout computation -- shared by `renderSvg` and `intrinsicHeight` so
 * the SVG output dims and the wrapping <img> aspect ratio always agree.
 *
 * Rows are unbounded: more skills = more rows = a taller panel. A tiny
 * generosity buffer keeps a single-skill panel from looking absurdly short.
 */
function computeLayout(info: ProfileInfo) {
  const W = 800;
  const PAD_X = 56;

  const skills = info.skills.filter(Boolean);
  const labels = skills.map((s) => s.toUpperCase());

  const HEADING_AREA_TOP = 56;
  const SUBHEAD_GAP = 48;
  const ROWS_TOP = HEADING_AREA_TOP + SUBHEAD_GAP + 30;

  const ROW_INNER_W = W - PAD_X * 2;
  const PILL_GAP = 10;
  const PILL_PAD_X = 14;
  const PILL_HEIGHT = 28;
  const ROW_GAP = 10;

  const sizes = [13, 12, 11, 10];
  // No max-rows cap: pick the largest size at which every chip fits its row;
  // any number of resulting rows is acceptable.
  const pillSize = fitChipFontSize(
    labels,
    ROW_INNER_W,
    PILL_GAP,
    () => PILL_PAD_X,
    sizes,
    Number.MAX_SAFE_INTEGER,
    "mono",
  );
  const widths = labels.map((l) => chipWidth(l, pillSize, PILL_PAD_X, "mono"));
  const { rows } = packChipsIntoRows(
    widths,
    ROW_INNER_W,
    PILL_GAP,
    Number.MAX_SAFE_INTEGER,
  );

  const rowCount = Math.max(1, rows.length);
  const blockH = rowCount * PILL_HEIGHT + (rowCount - 1) * ROW_GAP;
  const BOTTOM_PAD = 38;
  const H = ROWS_TOP + blockH + BOTTOM_PAD;

  return {
    W,
    H,
    PAD_X,
    HEADING_AREA_TOP,
    SUBHEAD_GAP,
    ROWS_TOP,
    PILL_GAP,
    PILL_PAD_X,
    PILL_HEIGHT,
    ROW_GAP,
    pillSize,
    widths,
    rows,
    labels,
    skills,
  };
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const {
    W,
    H,
    PAD_X,
    HEADING_AREA_TOP,
    SUBHEAD_GAP,
    ROWS_TOP,
    PILL_GAP,
    PILL_HEIGHT,
    ROW_GAP,
    pillSize,
    widths,
    rows,
    labels,
    skills,
  } = computeLayout(info);

  const HEADING_FONT = 30;
  const SUBHEAD_FONT = 13;

  // Heading: "Stack." with a soft accent dot/period.
  const headingX = PAD_X;
  const headingY = HEADING_AREA_TOP;
  const headingFit = fitUniformFontSize(
    ["Stack."],
    W - PAD_X * 2,
    [HEADING_FONT, 26, 22, 18],
    "sans",
  );
  const headingSize = headingFit.size;

  // Sub-line: count + flavor text.
  const sub =
    skills.length === 0
      ? "No skills yet — add a few above to populate the rail."
      : `${skills.length} ${skills.length === 1 ? "tool" : "tools"} I reach for daily.`;

  // Render rows. Each chip animates in with a per-chip stagger when loopText
  // is on. With no row cap the keyframes are generated per-chip.
  let chipIdx = 0;
  const allChipCount = rows.reduce((sum, r) => sum + r.length, 0);
  const chipsSvg = rows
    .map((idxs, rowI) => {
      const rowWidthsArr = idxs.map((i) => widths[i]);
      const rowW = rowWidth(rowWidthsArr, PILL_GAP);
      let xCursor = Math.max(PAD_X, Math.round((W - rowW) / 2));
      const yTop =
        ROWS_TOP + rowI * (PILL_HEIGHT + ROW_GAP);
      return idxs
        .map((origI, j) => {
          const w = rowWidthsArr[j];
          const cx = xCursor + w / 2;
          const cy = yTop + PILL_HEIGHT / 2;
          const cls = `chip${chipIdx}`;
          chipIdx++;
          xCursor += w + PILL_GAP;
          return `<g class="${cls}">
        <rect x="${xCursor - w - PILL_GAP}" y="${yTop}" width="${w}" height="${PILL_HEIGHT}" rx="${PILL_HEIGHT / 2}" fill="${theme.bg}" stroke="${theme.muted}" stroke-width="1" stroke-opacity="0.55"/>
        <text x="${cx}" y="${cy}" fill="${theme.fg}" font-family="ui-monospace, monospace" font-size="${pillSize}" letter-spacing="0.8" text-anchor="middle" dominant-baseline="middle">${escapeXml(labels[origI])}</text>
      </g>`;
        })
        .join("\n  ");
    })
    .join("\n  ");

  // Per-chip stagger keyframes when loopText is on. Each chip has a tiny
  // pop-in window. With ALL chips eventually showing, we cap stagger so
  // the last chip still gets a long visible window.
  const STAGGER_MAX = 30; // last chip starts at most 30% through the loop
  const perChipStagger =
    allChipCount > 1
      ? Math.min(2.5, STAGGER_MAX / Math.max(1, allChipCount - 1))
      : 0;

  const keyframes: string[] = [];
  const rules: string[] = [];
  if (loopText) {
    for (let i = 0; i < allChipCount; i++) {
      const start = Math.round(i * perChipStagger);
      const visStart = start + 2;
      const visEnd = 92;
      const fadeOut = 97;
      keyframes.push(
        `@keyframes chip${i} { 0%,${start}% { opacity: 0; transform: translateY(6px) } ${visStart}%,${visEnd}% { opacity: 1; transform: translateY(0) } ${fadeOut}%,100% { opacity: 0 } }`,
      );
      rules.push(
        `.chip${i} { animation: chip${i} ${DUR} ease-out infinite; transform-origin: center; transform-box: fill-box; }`,
      );
    }
  }

  const css = `
    text { font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    ${keyframes.join("\n    ")}
    ${rules.join("\n    ")}
  `;

  // Accent rule under the heading.
  const ruleY = headingY + 18;
  const ruleW = 56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>

  <!-- Accent bar -->
  <rect x="${PAD_X}" y="${ruleY}" width="${ruleW}" height="3" rx="1.5" fill="${theme.accent}"/>

  <!-- Heading -->
  <text x="${headingX}" y="${headingY}" fill="${theme.fg}" font-size="${headingSize}" font-weight="700" letter-spacing="-0.02em">${escapeXml(headingFit.texts[0])}</text>

  <!-- Sub-line -->
  <text x="${PAD_X}" y="${HEADING_AREA_TOP + SUBHEAD_GAP}" fill="${theme.muted}" font-size="${SUBHEAD_FONT}" font-weight="500" letter-spacing="0.02em">${escapeXml(sub)}</text>

  <!-- Pill rows -->
  ${chipsSvg}

  <!-- Tiny watermark -->
  <text x="${W - 20}" y="${H - 14}" fill="${theme.muted}" fill-opacity="0.45" font-family="ui-monospace, monospace" font-size="10" text-anchor="end">made with RyMe.md</text>
</svg>`;
}

const template: SvgTemplate = {
  id: "sleek-skills",
  name: "Sleek Stack",
  description:
    "Editorial heading with an accent bar and a freely-flowing grid of pill tags. Resizes to fit your full stack.",
  kind: "svg",
  category: "skills",
  family: "sleek",
  width: 800,
  height: 240,
  duration: 12,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
