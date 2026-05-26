import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize } from "../text-utils";
import {
  PALETTE,
  PIXEL_PALETTE,
  SPRITE_CLOUD,
  SPRITE_FLOWER,
  SPRITE_LEAF,
  SPRITE_SUN,
  escapeXml,
  frameInner,
  renderPixelGrid,
  slimFrame,
  slimFrameInner,
  woodFrame,
} from "./pixelfarm-shared";
import {
  PIXEL_FONT_H,
  fitPixelScale,
  measurePixelText,
  pixelText,
} from "./pixelfarm-font";

/**
 * Pixel Harvest header.
 *
 * Layout (vertically centered inside the parchment area):
 *   - Outer wood frame around the 800x320 canvas.
 *   - Sky strip (50px) with sun + clouds + pixel-font greeting.
 *   - Parchment area with a centered stack of:
 *       * big name in the 5x7 bitmap font (auto-shrinks scale 5 -> 3)
 *       * wood-tone underline
 *       * optional tagline in monospace italic (readability)
 *       * three OCCUPATION / ORG / LOCATION tiles with pixel-font labels
 *         and monospace values
 *       * centered flower-and-leaf decoration row
 *
 * Text rendering strategy: the bitmap pixel font carries the "this is
 * pixel art" identity, so animations can stay smooth. Earlier versions
 * used stepped `steps(N, end)` timing across the board, which read as
 * dropped-frame jank rather than intentional sprite motion. The pixel
 * font does the visual heavy lifting now; animations are gentle ease-*.
 *
 * Pixel font is reserved for SHORT, high-impact text (name, greeting,
 * labels) where readability holds up at low resolution. Longer body
 * text (tagline, tile values) stays in monospace so the user can
 * actually read it -- a pixel font for "Software Engineering Intern"
 * across 100px gets cramped fast.
 *
 * Theme handling: this family ignores `theme` and pulls colors from the
 * shared `PALETTE`. The theme arg stays in the signature so the
 * SvgTemplate contract is intact.
 */
function renderSvg(
  info: ProfileInfo,
  _theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const W = 800;
  const H = 320;

  const inner = frameInner(0, 0, W, H);
  const innerCx = inner.x + inner.w / 2;

  // -- Sky strip ----------------------------------------------------------
  const SKY_H = 50;
  const skyY = inner.y;
  const horizonY = skyY + SKY_H;

  const SUN_SCALE = 4;
  const SUN_PIX_W = SPRITE_SUN[0].length * SUN_SCALE;
  const SUN_PIX_H = SPRITE_SUN.length * SUN_SCALE;
  const SUN_X = inner.x + inner.w - SUN_PIX_W - 16;
  const SUN_Y = skyY + Math.round((SKY_H - SUN_PIX_H) / 2);

  const CLOUD_SCALE = 2;
  const CLOUD_1_X = inner.x + 220;
  const CLOUD_1_Y = skyY + 12;
  const CLOUD_2_X = inner.x + 460;
  const CLOUD_2_Y = skyY + 26;

  // greeting in the sky strip, rendered in the pixel font at scale 2
  // (so each "pixel" of the greeting matches the 2x scale of the clouds
  // beside it, which keeps the sky strip visually unified).
  const GREETING = "WELCOME, FRIEND!";
  const GREETING_SCALE = 2;
  const GREETING_H = PIXEL_FONT_H * GREETING_SCALE;
  const GREETING_X = inner.x + 16;
  const GREETING_Y = skyY + Math.round((SKY_H - GREETING_H) / 2);

  // -- Parchment content stack -------------------------------------------
  // Single source of truth for vertical rhythm. Tighten/relax these
  // without breaking centering; topPad will absorb the difference.
  const PAD_MIN = 14;
  const GAP_NAME_UNDERLINE = 8;
  const UNDERLINE_H = 3;
  const GAP_UNDERLINE_TAGLINE = 16;
  const GAP_TAGLINE_TILE = 18;
  const GAP_NAMEBLOCK_TILE = 22;
  const TILE_H = 60;
  const GAP_TILE_DECO = 22;
  const DECO_SPRITE_H = 21; // worst-case sprite height at scale 3

  // Big centered name in the pixel font. Auto-shrink scale 5 -> 3 so a
  // long name still fits. The pixel font's effective character cell is
  // 6 logical pixels wide (5 glyph + 1 tracking), so at scale 4 each
  // character is 24 CSS px wide.
  const rawName = (info.name || "Your Name").toUpperCase();
  const NAME_BUDGET = inner.w - 64;
  const NAME_SCALE = fitPixelScale(rawName, NAME_BUDGET, [5, 4, 3]);
  const NAME_W = measurePixelText(rawName, NAME_SCALE);
  const NAME_H = PIXEL_FONT_H * NAME_SCALE;
  const NAME_BLOCK_H = NAME_H;

  // Tagline (optional). Monospace italic, auto-shrunk.
  const tagline = (info.tagline || "").trim();
  const TAGLINE_BUDGET = inner.w - 96;
  const taglineFit = tagline
    ? fitFontSize(tagline, TAGLINE_BUDGET, [16, 15, 14, 13], "sans")
    : null;
  const TAGLINE_BLOCK_H = taglineFit ? taglineFit.size + 4 : 0;

  // Stat tile row.
  type Tile = { label: string; value: string };
  const allTiles: Tile[] = [
    { label: "OCCUPATION", value: info.role || "" },
    { label: "ORG", value: info.org || "" },
    { label: "LOCATION", value: info.location || "" },
  ];
  const tiles = allTiles.filter((t) => t.value.length > 0);
  const hasTiles = tiles.length > 0;

  // Stack-height precompute (so the whole block can be vertically
  // centered inside the parchment).
  const taglineRun = taglineFit
    ? GAP_UNDERLINE_TAGLINE + TAGLINE_BLOCK_H
    : 0;
  const tileRun = hasTiles
    ? (taglineFit ? GAP_TAGLINE_TILE : GAP_NAMEBLOCK_TILE) + TILE_H
    : 0;
  const decoRun = GAP_TILE_DECO + DECO_SPRITE_H;
  const stackH =
    NAME_BLOCK_H + GAP_NAME_UNDERLINE + UNDERLINE_H + taglineRun + tileRun + decoRun;

  const parchH = inner.y + inner.h - horizonY;
  const slack = parchH - stackH;
  const topPad = Math.max(PAD_MIN, Math.round(slack / 2));

  // Cursor-based stack layout.
  let cursor = horizonY + topPad;
  const NAME_TOP = cursor;
  const NAME_X = Math.round(innerCx - NAME_W / 2);
  cursor += NAME_BLOCK_H;

  cursor += GAP_NAME_UNDERLINE;
  const UNDERLINE_Y = cursor;
  cursor += UNDERLINE_H;

  let TAGLINE_BASELINE = 0;
  if (taglineFit) {
    cursor += GAP_UNDERLINE_TAGLINE;
    TAGLINE_BASELINE = cursor + Math.round(taglineFit.size * 0.82);
    cursor += TAGLINE_BLOCK_H;
  }

  let TILE_ROW_Y = 0;
  if (hasTiles) {
    cursor += taglineFit ? GAP_TAGLINE_TILE : GAP_NAMEBLOCK_TILE;
    TILE_ROW_Y = cursor;
    cursor += TILE_H;
  }

  cursor += GAP_TILE_DECO;
  const DECO_Y = cursor;

  // Underline width matches the rendered name width so the bar reads as
  // a deliberate frame around the name rather than an arbitrary line.
  const UNDERLINE_W = NAME_W;
  const UNDERLINE_X = NAME_X;

  // -- Stat tile layout --------------------------------------------------
  // Each tile has a pixel-font label (small, "menu chrome" feel) above a
  // monospace value (larger, readable). Mixing the two fonts keeps the
  // chrome distinctly pixel-art without sacrificing legibility of the
  // actual data.
  const TILE_GAP = 16;
  const TILE_ROW_MAX_W = Math.min(inner.w - 48, 720);
  const TILE_W = hasTiles
    ? Math.floor((TILE_ROW_MAX_W - (tiles.length - 1) * TILE_GAP) / tiles.length)
    : 0;
  const tileRowTotalW = hasTiles
    ? tiles.length * TILE_W + (tiles.length - 1) * TILE_GAP
    : 0;
  const TILE_ROW_X = Math.round(innerCx - tileRowTotalW / 2);
  const TILE_LABEL_SCALE = 2; // pixel-font label scale inside each tile

  const tileNodes = tiles
    .map((tile, i) => {
      const x = TILE_ROW_X + i * (TILE_W + TILE_GAP);
      const y = TILE_ROW_Y;
      const innerTile = slimFrameInner(x, y, TILE_W, TILE_H);

      // Pixel-font label, centered horizontally near the top of the tile.
      const labelW = measurePixelText(tile.label, TILE_LABEL_SCALE);
      const labelX = Math.round(innerTile.x + (innerTile.w - labelW) / 2);
      const labelY = innerTile.y + 8;
      const labelPixels = pixelText(
        tile.label,
        TILE_LABEL_SCALE,
        labelX,
        labelY,
        PALETTE.woodMid,
      ).svg;

      // Monospace value, centered horizontally below the label.
      const valueDisplay = tile.value.toUpperCase();
      const valueFit = fitFontSize(
        valueDisplay,
        innerTile.w - 16,
        [15, 14, 13, 12, 11],
        "mono",
      );
      const valueY = innerTile.y + innerTile.h - 12;
      return `<g class="pf-tile pf-tile-${i}">
    ${slimFrame(x, y, TILE_W, TILE_H)}
    ${labelPixels}
    <text x="${innerTile.x + innerTile.w / 2}" y="${valueY}" text-anchor="middle" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="${valueFit.size}" font-weight="700" letter-spacing="1">${escapeXml(valueFit.text)}</text>
  </g>`;
    })
    .join("\n  ");

  // -- Decoration row ----------------------------------------------------
  const DECO_SCALE = 3;
  const DECO_STEP = 48;
  const decoTemplates = [SPRITE_FLOWER, SPRITE_LEAF];
  const decoAvailW = inner.w - 32;
  const decoStrideMax = Math.max(
    ...decoTemplates.map((s) => s[0].length * DECO_SCALE),
  );
  const effectiveStep = Math.max(DECO_STEP, decoStrideMax + 8);
  const decoCount = Math.max(
    1,
    Math.floor((decoAvailW + effectiveStep - decoStrideMax) / effectiveStep),
  );
  const decoTotalW =
    (decoCount - 1) * effectiveStep +
    decoTemplates[(decoCount - 1) % decoTemplates.length][0].length *
      DECO_SCALE;
  const decoStartX = Math.round(inner.x + (inner.w - decoTotalW) / 2);
  const decoParts: string[] = [];
  for (let i = 0; i < decoCount; i++) {
    const sprite = decoTemplates[i % decoTemplates.length];
    const spriteW = sprite[0].length * DECO_SCALE;
    const slotCenter = decoStartX + i * effectiveStep + decoStrideMax / 2;
    const x = Math.round(slotCenter - spriteW / 2);
    decoParts.push(
      renderPixelGrid(sprite, PIXEL_PALETTE, DECO_SCALE, x, DECO_Y),
    );
  }
  const decoRow = decoParts.join("");

  // -- Pre-render pixel-font text blocks ---------------------------------
  const namePixels = pixelText(rawName, NAME_SCALE, NAME_X, NAME_TOP, PALETTE.ink).svg;
  const greetingPixels = pixelText(
    GREETING,
    GREETING_SCALE,
    GREETING_X,
    GREETING_Y,
    PALETTE.cloud,
  ).svg;

  // -- Animations --------------------------------------------------------
  // All smooth ease-* now. The bitmap pixel font carries the pixel-art
  // identity, so adding stepped motion on top reads as dropped frames
  // rather than reinforcement. Atmospheric motion (sun, clouds) stays
  // gentle and continuous; content reveals use ease-out for a natural
  // settle.
  const css = `
    .pf-sun { transform-origin: ${SUN_X + SUN_PIX_W / 2}px ${SUN_Y + SUN_PIX_H / 2}px; animation: pf-sun-pulse ${DUR} ease-in-out infinite; }
    .pf-cloud-1 { animation: pf-cloud-a ${DUR} ease-in-out infinite; }
    .pf-cloud-2 { animation: pf-cloud-b ${DUR} ease-in-out infinite; }
    ${
      loopText
        ? `
    .pf-name { animation: pf-pop ${DUR} ease-out infinite; }
    .pf-underline { animation: pf-wipe ${DUR} ease-out infinite; transform-origin: ${UNDERLINE_X}px center; }
    .pf-tagline { animation: pf-pop ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.04).toFixed(2)}s; }
    .pf-tile { animation: pf-pop ${DUR} ease-out infinite; }
    ${tiles.map((_, i) => `.pf-tile-${i} { animation-delay: ${(loopDuration * (0.08 + i * 0.03)).toFixed(2)}s; }`).join("\n    ")}
    `
        : `
    .pf-underline { transform-origin: ${UNDERLINE_X}px center; }
    `
    }
    @keyframes pf-sun-pulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.08); }
    }
    @keyframes pf-cloud-a {
      0%   { transform: translateX(-16px); }
      50%  { transform: translateX(16px); }
      100% { transform: translateX(-16px); }
    }
    @keyframes pf-cloud-b {
      0%   { transform: translateX(12px); }
      50%  { transform: translateX(-12px); }
      100% { transform: translateX(12px); }
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${woodFrame(0, 0, W, H)}

  <!-- sky band + horizon trim -->
  <rect x="${inner.x}" y="${skyY}" width="${inner.w}" height="${SKY_H}" fill="${PALETTE.sky}"/>
  <rect x="${inner.x}" y="${horizonY - 2}" width="${inner.w}" height="2" fill="${PALETTE.woodLight}"/>

  <g class="pf-sun">${renderPixelGrid(SPRITE_SUN, PIXEL_PALETTE, SUN_SCALE, SUN_X, SUN_Y)}</g>
  <g class="pf-cloud-1">${renderPixelGrid(SPRITE_CLOUD, PIXEL_PALETTE, CLOUD_SCALE, CLOUD_1_X, CLOUD_1_Y)}</g>
  <g class="pf-cloud-2">${renderPixelGrid(SPRITE_CLOUD, PIXEL_PALETTE, CLOUD_SCALE, CLOUD_2_X, CLOUD_2_Y)}</g>

  <!-- greeting in the pixel font -->
  ${greetingPixels}

  <!-- name in the pixel font -->
  <g class="pf-name">${namePixels}</g>

  <!-- wood-tone accent underline -->
  <g class="pf-underline">
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="3" fill="${PALETTE.woodMid}"/>
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="1" fill="${PALETTE.woodLight}"/>
  </g>

  <!-- tagline (monospace italic) -->
  ${taglineFit ? `<text class="pf-tagline" x="${innerCx}" y="${TAGLINE_BASELINE}" text-anchor="middle" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="${taglineFit.size}" font-weight="500" font-style="italic">${escapeXml(taglineFit.text)}</text>` : ""}

  <!-- stat tiles row -->
  ${tileNodes}

  <!-- bottom decoration row -->
  ${decoRow}
</svg>`;
}

const template: SvgTemplate = {
  id: "pixelfarm-header",
  name: "Quaint",
  description:
    "Cozy farming-sim banner with a custom 5x7 bitmap pixel font: wood-framed parchment, sky strip with sun and clouds, vertically centered name + tagline + OCCUPATION/ORG/LOCATION tiles, centered flower-and-leaf garden row.",
  kind: "svg",
  category: "header",
  family: "pixelfarm",
  width: 800,
  height: 320,
  duration: 6,
  fields: ["name", "tagline", "role", "org", "location"],
  renderSvg,
};

export default template;
