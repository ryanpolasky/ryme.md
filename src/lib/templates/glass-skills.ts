import type {
  CanvasTemplate,
  Ctx2D,
  ProfileInfo,
  TemplateTheme,
} from "../types";
import { MONO, SANS, rgba, roundRect } from "../canvas-utils";
import {
  GLASS_TEXT,
  drawCanvasFrame,
  drawGlassBackground,
  drawGlassCard,
} from "../glass-shared";
import {
  chipWidth,
  fitChipFontSize,
  packChipsIntoRows,
} from "../chip-layout";

const W = 800;
const PAD = 30;
const HEADING_TOP = 50;
const SUB_TOP = 70;
const ROWS_TOP = 92;

const PILL_GAP = 8;
const ROW_GAP = 8;

/**
 * Pure layout computation. Used by both `renderFrame` and `intrinsicHeight`,
 * so the offscreen canvas (encoder), the live preview, and the Home gallery
 * all agree on the panel's effective height.
 *
 * Width measurement uses the proportional-mono approximation in
 * `chip-layout.ts` rather than `ctx.measureText`, so the layout is
 * deterministic without a 2D context. The visual difference is negligible
 * for monospace labels.
 */
function computeLayout(info: ProfileInfo) {
  const skills = info.skills.filter(Boolean);
  const cardW = W - PAD * 2;
  const cardInnerW = cardW - 64; // 32 px each side inside the card

  const sizes = [13, 12, 11, 10, 9];
  const chipPad = (s: number) => Math.max(8, Math.round(s * 0.85));

  const pillSize = fitChipFontSize(
    skills,
    cardInnerW,
    PILL_GAP,
    chipPad,
    sizes,
    Number.MAX_SAFE_INTEGER,
    "mono",
  );
  const PILL_HEIGHT = Math.max(20, Math.round(pillSize * 1.95));
  const widths = skills.map((s) =>
    chipWidth(s, pillSize, chipPad(pillSize), "mono"),
  );
  const { rows } = packChipsIntoRows(
    widths,
    cardInnerW,
    PILL_GAP,
    Number.MAX_SAFE_INTEGER,
  );

  const rowCount = Math.max(0, rows.length);
  const blockH =
    rowCount === 0 ? 0 : rowCount * PILL_HEIGHT + (rowCount - 1) * ROW_GAP;

  // Card geometry: heading (top) + chips (middle) + bottom padding.
  const HEADING_AREA = ROWS_TOP - 28; // text takes up to ~24 px above ROWS_TOP
  const BOTTOM_INNER_PAD = 30;
  const cardH = Math.max(
    140,
    HEADING_AREA + 28 + blockH + BOTTOM_INNER_PAD,
  );
  const H = cardH + PAD * 2;

  return {
    H,
    cardW,
    cardInnerW,
    pillSize,
    PILL_HEIGHT,
    widths,
    rows,
    skills,
    chipPad: chipPad(pillSize),
  };
}

function renderFrame(
  ctx: Ctx2D,
  t: number,
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
) {
  const layout = computeLayout(info);
  const { H, cardW, pillSize, PILL_HEIGHT, widths, rows, skills, chipPad } =
    layout;

  drawGlassBackground(ctx, t, loopDuration, theme, W, H);

  const cardX = PAD;
  const cardY = PAD;
  const cardH = H - PAD * 2;
  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 18);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const innerX = cardX + 32;

  // Heading
  ctx.fillStyle = GLASS_TEXT;
  ctx.font = `700 28px ${SANS}`;
  ctx.fillText("Stack", innerX, cardY + HEADING_TOP);

  // Sub-line
  ctx.fillStyle = rgba(GLASS_TEXT, 0.55);
  ctx.font = `400 13px ${SANS}`;
  const sub =
    skills.length === 0
      ? "No skills yet."
      : `${skills.length} ${skills.length === 1 ? "tool" : "tools"} I reach for`;
  ctx.fillText(sub, innerX, cardY + SUB_TOP);

  if (skills.length === 0) {
    drawCanvasFrame(ctx, W, H, 14);
    return;
  }

  // Chip rows
  ctx.font = `500 ${pillSize}px ${MONO}`;
  for (let rowI = 0; rowI < rows.length; rowI++) {
    const idxs = rows[rowI];
    let xCursor = innerX;
    const yTop = cardY + ROWS_TOP + rowI * (PILL_HEIGHT + ROW_GAP);
    for (const i of idxs) {
      const w = widths[i];
      roundRect(ctx, xCursor, yTop, w, PILL_HEIGHT, PILL_HEIGHT / 2);
      ctx.fillStyle = rgba(theme.accent, 0.18);
      ctx.fill();
      ctx.strokeStyle = rgba(theme.accent, 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = GLASS_TEXT;
      ctx.fillText(
        skills[i],
        xCursor + chipPad,
        yTop + PILL_HEIGHT / 2 + pillSize / 3,
      );
      xCursor += w + PILL_GAP;
    }
  }

  drawCanvasFrame(ctx, W, H, 14);
}

const template: CanvasTemplate = {
  id: "glass-skills",
  name: "Glass Stack",
  description:
    "Mesh-gradient glass card with frosted pill tags. Card grows in height to fit your full stack.",
  kind: "canvas",
  category: "skills",
  family: "glass",
  width: 800,
  height: 240,
  fps: 24,
  duration: 10,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderFrame,
};

export default template;
