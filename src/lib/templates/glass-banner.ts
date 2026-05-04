import type {
  CanvasTemplate,
  Ctx2D,
  ProfileInfo,
  TemplateTheme,
} from "../types";
import { SANS, fitFontSize, rgba } from "../canvas-utils";
import {
  GLASS_TEXT,
  GLASS_TEXT_MUTED,
  drawCanvasFrame,
  drawGlassBackground,
  drawGlassCard,
} from "../glass-shared";

function renderFrame(
  ctx: Ctx2D,
  t: number,
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
) {
  const W = 800;
  const H = 300;

  drawGlassBackground(ctx, t, loopDuration, theme, W, H);

  // Glass card
  const cardW = 660;
  const cardH = 200;
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;
  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 18);

  // Build the list of lines to render so we can center them in the card
  // regardless of which optional fields are present. Each entry carries the
  // visual cap height above and descender below its baseline so we can
  // compute the block's true visual extent.
  type Line = {
    text: string;
    font: string;
    fill: string;
    cap: number;
    desc: number;
    gapBefore: number;
  };
  const lines: Line[] = [];

  // Inner width budget for text inside the glass card (with side padding).
  const TEXT_BUDGET = cardW - 64;

  // Auto-shrink the name through 38 → 32 → 28 → 24 px. At the smallest
  // size the helper will truncate with an ellipsis rather than overflow.
  const nameFit = fitFontSize(
    ctx,
    info.name || "Your Name",
    TEXT_BUDGET,
    (s) => `600 ${s}px ${SANS}`,
    [38, 32, 28, 24],
  );
  // Visual cap height tracks the fitted size (~0.74em for Inter-style).
  const nameCap = Math.round(nameFit.size * 0.74);
  const nameDesc = Math.round(nameFit.size * 0.18);
  lines.push({
    text: nameFit.text,
    font: nameFit.font,
    fill: GLASS_TEXT,
    cap: nameCap,
    desc: nameDesc,
    gapBefore: 0,
  });

  const subtitleParts = [info.role, info.org].filter(Boolean);
  if (subtitleParts.length) {
    const subFit = fitFontSize(
      ctx,
      subtitleParts.join("  ·  "),
      TEXT_BUDGET,
      (s) => `500 ${s}px ${SANS}`,
      [15, 14, 13, 12],
    );
    lines.push({
      text: subFit.text,
      font: subFit.font,
      fill: GLASS_TEXT_MUTED,
      cap: Math.round(subFit.size * 0.74),
      desc: Math.round(subFit.size * 0.22),
      gapBefore: 36,
    });
  }
  if (info.tagline) {
    const tagFit = fitFontSize(
      ctx,
      info.tagline,
      TEXT_BUDGET,
      (s) => `italic 400 ${s}px ${SANS}`,
      [13, 12, 11],
    );
    lines.push({
      text: tagFit.text,
      font: tagFit.font,
      fill: rgba(GLASS_TEXT, 0.7),
      cap: Math.round(tagFit.size * 0.74),
      desc: Math.round(tagFit.size * 0.22),
      gapBefore: 28,
    });
  }

  // Total block extent (top of first cap to bottom of last descender)
  let blockH = lines[0].cap;
  for (let i = 1; i < lines.length; i++) blockH += lines[i].gapBefore;
  blockH += lines[lines.length - 1].desc;

  const cardCenterY = cardY + cardH / 2;
  // First baseline so the block centers vertically inside the card
  let ty = cardCenterY - blockH / 2 + lines[0].cap;

  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ty += lines[i].gapBefore;
    ctx.font = lines[i].font;
    ctx.fillStyle = lines[i].fill;
    ctx.fillText(lines[i].text, cx, ty);
  }

  drawCanvasFrame(ctx, W, H, 14);
}

const template: CanvasTemplate = {
  id: "glass-header",
  name: "Glass Banner",
  description:
    "Animated mesh gradient drifting behind a glassmorphic card. Renders to GIF.",
  kind: "canvas",
  category: "header",
  family: "glass",
  width: 800,
  height: 300,
  fps: 24,
  duration: 8,
  fields: ["name", "role", "org", "tagline"],
  renderFrame,
};

export default template;
