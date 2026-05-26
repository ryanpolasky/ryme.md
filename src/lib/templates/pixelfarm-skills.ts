import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize } from "../text-utils";
import {
  PALETTE,
  escapeXml,
  frameInner,
  slimFrame,
  woodFrame,
} from "./pixelfarm-shared";
import {
  PIXEL_FONT_H,
  measurePixelText,
  pixelText,
} from "./pixelfarm-font";

/**
 * Quaint skills (inventory grid).
 *
 * Wood-framed parchment with a pixel-font "INVENTORY" header up top and
 * a slim-framed mini-card per skill below, arranged into a 6-column
 * grid that auto-wraps to additional rows.
 *
 * Each card is a Stardew-style item slot:
 *   - big pixel-font letter icon in a colored swatch up top (cycles
 *     through 4 earthy accents so the row reads as variety, not flat),
 *   - skill name in monospace below, auto-shrunk to fit the slot.
 *
 * Height grows via `intrinsicHeight` based on the number of rows the
 * skill list needs.
 */

const W = 800;
const PAD = 28;

const HEADER_TEXT = "INVENTORY";
const HEADER_SCALE = 4;
const HEADER_H = PIXEL_FONT_H * HEADER_SCALE;

const COLS = 6;
const TILE_GAP = 14;
const TILE_H = 60;
const TILE_ROW_GAP = 16;
const MAX_SKILLS = 18; // 3 rows of 6; anything more truncates

// Layout gaps.
const PAD_TOP = 24;
const HEADER_TO_UNDERLINE = 8;
const UNDERLINE_H = 3;
const UNDERLINE_TO_GRID = 20;
const GRID_BOTTOM_PAD = 24;

// Letter-icon palette: cycle through 4 earthy accents so successive
// tiles read as variety rather than a uniform row.
const ICON_COLORS = [
  PALETTE.apple,
  PALETTE.leafLight,
  PALETTE.gold,
  PALETTE.sky,
];

function computeLayout(info: ProfileInfo) {
  const skills = info.skills.filter(Boolean).slice(0, MAX_SKILLS);
  const inner = frameInner(0, 0, W, 0);
  const gridAvailW = inner.w - PAD * 2;
  const tileW = Math.floor((gridAvailW - (COLS - 1) * TILE_GAP) / COLS);

  // Row count for the actual filled tiles. Always at least 1 row so the
  // grid never collapses to zero height even when the skill list is
  // empty (we render a friendly empty-state message in that case).
  const rowsNeeded = Math.max(1, Math.ceil(skills.length / COLS));

  const gridH = rowsNeeded * TILE_H + (rowsNeeded - 1) * TILE_ROW_GAP;
  const contentH =
    HEADER_H +
    HEADER_TO_UNDERLINE +
    UNDERLINE_H +
    UNDERLINE_TO_GRID +
    gridH;
  const H = PAD_TOP + contentH + GRID_BOTTOM_PAD;

  return { H, skills, tileW, rowsNeeded };
}

function renderSvg(
  info: ProfileInfo,
  _theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const { H, skills, tileW, rowsNeeded } = computeLayout(info);
  const inner = frameInner(0, 0, W, H);

  // -- Header ------------------------------------------------------------
  const HEADER_X = inner.x + PAD;
  const HEADER_Y = inner.y + PAD_TOP;
  const headerPixels = pixelText(
    HEADER_TEXT,
    HEADER_SCALE,
    HEADER_X,
    HEADER_Y,
    PALETTE.ink,
  ).svg;
  const HEADER_W_PX = measurePixelText(HEADER_TEXT, HEADER_SCALE);

  // Subtle counter on the right: "12 / 18" pixel-font count of how many
  // skills filled the inventory. Stardew-style "X / Y" tooltip.
  const counterText = `${skills.length} / ${MAX_SKILLS}`;
  const COUNTER_SCALE = 2;
  const counterW = measurePixelText(counterText, COUNTER_SCALE);
  const counterX = inner.x + inner.w - PAD - counterW;
  const counterY = HEADER_Y + Math.round((HEADER_H - PIXEL_FONT_H * COUNTER_SCALE) / 2);
  const counterPixels = pixelText(
    counterText,
    COUNTER_SCALE,
    counterX,
    counterY,
    PALETTE.woodMid,
  ).svg;

  // -- Underline ---------------------------------------------------------
  const UNDERLINE_X = HEADER_X;
  const UNDERLINE_Y = HEADER_Y + HEADER_H + HEADER_TO_UNDERLINE;
  const UNDERLINE_W = HEADER_W_PX;

  // -- Tile grid ---------------------------------------------------------
  // Center the grid as a block inside the inner area so partial last
  // rows have a natural axis to center on. Previously the grid was
  // PAD-anchored which left ~4px of left/right asymmetry and made a
  // partial second row look left-flushed instead of nested.
  const rowsTotal = Math.max(1, Math.ceil(skills.length / COLS));
  const lastRowCount =
    skills.length === 0 ? 0 : skills.length - (rowsTotal - 1) * COLS;
  const gridFullW = COLS * tileW + (COLS - 1) * TILE_GAP;
  const GRID_X = Math.round(inner.x + (inner.w - gridFullW) / 2);
  const GRID_Y = UNDERLINE_Y + UNDERLINE_H + UNDERLINE_TO_GRID;

  // Per-row starting x: full rows sit flush at GRID_X; a partial last
  // row is centered within the full grid width so an 8-skill layout
  // (6 + 2) puts the lonely pair under the middle of the row above.
  function rowStartX(row: number): number {
    const colsInRow = row === rowsTotal - 1 ? lastRowCount : COLS;
    const rowW = colsInRow * tileW + (colsInRow - 1) * TILE_GAP;
    return GRID_X + Math.round((gridFullW - rowW) / 2);
  }

  // Auto-shrink skill labels uniformly so the grid stays visually even.
  // Capped to the tile inner width minus 12px of side padding.
  const labelBudget = tileW - 12;
  const labels = skills.map((s) => s.toUpperCase());
  const labelFit = fitUniformFontSize(
    labels,
    labelBudget,
    [12, 11, 10, 9],
    "mono",
  );
  const labelSize = labelFit.size;

  // Letter-icon at scale 3: 5*3=15w x 7*3=21h. Sits in the upper portion
  // of the tile inside a colored swatch. Previously rendered at scale 4
  // but that pushed the swatch right up against the skill label below it
  // -- with scale 3 there's actual breathing room between monogram and
  // text.
  const ICON_SCALE = 3;
  const ICON_W = 5 * ICON_SCALE;
  const ICON_H = PIXEL_FONT_H * ICON_SCALE;
  const SWATCH_PAD = 5;
  const SWATCH_W = ICON_W + SWATCH_PAD * 2;
  const SWATCH_H = ICON_H + SWATCH_PAD * 2;
  // Vertical layout inside the tile (TILE_H = 60):
  //   y+5  .. y+36  -- swatch (31h with default pads)
  //   y+36 .. y+43  -- 7px breathing gap (was 13px which felt like the
  //                    label was floating away from the monogram)
  //   y+43 .. y+52  -- skill label glyph (font ~12, baseline y+52)
  //   y+52 .. y+60  -- 8px bottom pad for visual margin
  const SWATCH_TOP = 5;
  const LABEL_BASELINE_FROM_BOTTOM = 8;

  const tileNodes = skills
    .map((skill, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const x = rowStartX(row) + col * (tileW + TILE_GAP);
      const y = GRID_Y + row * (TILE_H + TILE_ROW_GAP);

      const swatchColor = ICON_COLORS[i % ICON_COLORS.length];
      const swatchX = x + Math.round((tileW - SWATCH_W) / 2);
      const swatchY = y + SWATCH_TOP;
      const iconX = swatchX + SWATCH_PAD;
      const iconY = swatchY + SWATCH_PAD;
      const firstChar = (skill[0] || "?").toUpperCase();

      // The letter renders in the parchment color so it pops against the
      // colored swatch -- this matches how Stardew item icons work
      // (light glyph on saturated tile background).
      const iconPixels = pixelText(
        firstChar,
        ICON_SCALE,
        iconX,
        iconY,
        PALETTE.parchment,
      ).svg;

      const labelText = labelFit.texts[i];
      const labelY = y + TILE_H - LABEL_BASELINE_FROM_BOTTOM;

      return `<g class="pf-tile pf-tile-${i}">
    ${slimFrame(x, y, tileW, TILE_H)}
    <rect x="${swatchX}" y="${swatchY}" width="${SWATCH_W}" height="${SWATCH_H}" fill="${swatchColor}"/>
    <rect x="${swatchX}" y="${swatchY}" width="${SWATCH_W}" height="2" fill="${PALETTE.parchmentDim}" opacity="0.5"/>
    ${iconPixels}
    <text x="${x + tileW / 2}" y="${labelY}" text-anchor="middle" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="${labelSize}" font-weight="700" letter-spacing="1">${escapeXml(labelText)}</text>
  </g>`;
    })
    .join("\n  ");

  // Empty-state message when there's no skills to render. Keeps the
  // template from rendering as a giant blank slab.
  const emptySvg =
    skills.length === 0
      ? `<text x="${inner.x + inner.w / 2}" y="${GRID_Y + TILE_H / 2 + 4}" text-anchor="middle" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="13" letter-spacing="2">-- INVENTORY EMPTY --</text>`
      : "";

  // -- Animations --------------------------------------------------------
  const tileDelays = skills
    .map(
      (_, i) =>
        `.pf-tile-${i} { animation-delay: ${(loopDuration * (0.08 + i * 0.015)).toFixed(2)}s; }`,
    )
    .join("\n    ");

  const css = `
    ${
      loopText
        ? `
    .pf-header { animation: pf-pop ${DUR} ease-out infinite; }
    .pf-underline { animation: pf-wipe ${DUR} ease-out infinite; transform-origin: ${UNDERLINE_X}px center; }
    .pf-counter { animation: pf-pop ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.05).toFixed(2)}s; }
    .pf-tile { animation: pf-pop ${DUR} ease-out infinite; }
    ${tileDelays}
    `
        : `
    .pf-underline { transform-origin: ${UNDERLINE_X}px center; }
    `
    }
    @keyframes pf-pop {
      0%, 6%   { opacity: 0; transform: translateY(-4px); }
      18%, 88% { opacity: 1; transform: translateY(0); }
      100%     { opacity: 0; transform: translateY(0); }
    }
    @keyframes pf-wipe {
      0%, 10%  { transform: scaleX(0); }
      28%, 88% { transform: scaleX(1); }
      100%     { transform: scaleX(1); }
    }
  `;

  // Suppress unused warning on rowsNeeded -- consumed only by the
  // layout calculation, but kept exposed so future code can do row-aware
  // staggering.
  void rowsNeeded;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${woodFrame(0, 0, W, H)}

  <!-- header + counter -->
  <g class="pf-header">${headerPixels}</g>
  <g class="pf-counter">${counterPixels}</g>

  <!-- wood-tone underline -->
  <g class="pf-underline">
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="3" fill="${PALETTE.woodMid}"/>
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="1" fill="${PALETTE.woodLight}"/>
  </g>

  <!-- inventory grid -->
  ${tileNodes}
  ${emptySvg}
</svg>`;
}

const template: SvgTemplate = {
  id: "pixelfarm-skills",
  name: "Quaint Inventory",
  description:
    "Cozy skills grid: wood-framed parchment, slim-framed inventory tiles with colored letter-icons, monospace labels, and a Stardew-style item counter.",
  kind: "svg",
  category: "skills",
  family: "pixelfarm",
  width: W,
  height: 280,
  duration: 6,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
