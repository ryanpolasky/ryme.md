import type {
  CanvasTemplate,
  Ctx2D,
  ProfileInfo,
  TemplateTheme,
} from "../types";
import {
  MONO,
  SANS,
  fitFontSize,
  fitUniformFontSize,
  rgba,
  roundRect,
  wrapTextByWidth,
} from "../canvas-utils";
import {
  GLASS_TEXT,
  drawCanvasFrame,
  drawGlassBackground,
  drawGlassCard,
} from "../glass-shared";

function pillRow(info: ProfileInfo): string[] {
  const out: string[] = [];
  if (info.role) out.push(info.role);
  if (info.org) out.push(info.org);
  if (info.location) out.push(info.location);
  return out;
}

function renderFrame(
  ctx: Ctx2D,
  t: number,
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
) {
  const W = 800;
  const H = 320;

  drawGlassBackground(ctx, t, loopDuration, theme, W, H);

  // Glass card
  const PAD = 30;
  const cardW = W - PAD * 2;
  const cardH = H - PAD * 2;
  const cardX = PAD;
  const cardY = PAD;
  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 18);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const innerX = cardX + 32;
  const innerW = cardW - 64;

  // Heading auto-shrinks 28 → 24 → 20 → 16 px to fit innerW. Truncates only
  // at 16 px for absurd inputs.
  const headingFit = fitFontSize(
    ctx,
    info.name ? `Hi, I'm ${info.name}` : "About me",
    innerW,
    (s) => `700 ${s}px ${SANS}`,
    [28, 24, 20, 16],
  );
  const headingText = headingFit.text;
  const headingSize = headingFit.size;
  ctx.font = `400 14px ${SANS}`;
  const bio = info.bio || info.tagline || "";
  const bioLines = wrapTextByWidth(ctx, bio, innerW, 4);
  const pills = pillRow(info);

  // Visual extents — heading metrics scale with the fitted size; bio/pill
  // metrics are fixed at their default sizes (only the heading shrinks
  // dramatically).
  //   bio 14px font line height 22, descender ~5
  //   pill rect height 20 (top ~ baseline-12, bottom ~ baseline+8)
  const HEADING_CAP = Math.round(headingSize * 0.75);
  const HEADING_DESC = Math.round(headingSize * 0.21);
  const HEADING_TO_BIO = 40;        // heading baseline -> first bio baseline
  const BIO_LINE_H = 22;
  const BIO_DESC = 5;
  const BIO_TO_PILL = 30;           // last bio baseline -> pill baseline
  const HEADING_TO_PILL = 50;       // heading baseline -> pill baseline (no bio)
  const PILL_BELOW_BASELINE = 8;

  // Compute block height (top of heading cap to bottom of last element).
  // Block contains:
  //   heading -> [bio lines] -> [pills]
  // Use baseline-to-baseline offsets to keep math consistent with rendering.
  let blockH = HEADING_CAP + HEADING_DESC;
  if (bioLines.length) {
    blockH =
      HEADING_CAP +
      HEADING_TO_BIO +
      (bioLines.length - 1) * BIO_LINE_H +
      BIO_DESC;
  }
  if (pills.length) {
    blockH = bioLines.length
      ? HEADING_CAP +
        HEADING_TO_BIO +
        (bioLines.length - 1) * BIO_LINE_H +
        BIO_TO_PILL +
        PILL_BELOW_BASELINE
      : HEADING_CAP + HEADING_TO_PILL + PILL_BELOW_BASELINE;
  }

  const cardCenterY = cardY + cardH / 2;
  let ty = Math.round(cardCenterY - blockH / 2 + HEADING_CAP);

  // Heading
  ctx.fillStyle = GLASS_TEXT;
  ctx.font = `700 ${headingSize}px ${SANS}`;
  ctx.fillText(headingText, innerX, ty);

  // Bio
  if (bioLines.length) {
    ctx.fillStyle = rgba(GLASS_TEXT, 0.75);
    ctx.font = `400 14px ${SANS}`;
    let bioY = ty + HEADING_TO_BIO;
    for (let i = 0; i < bioLines.length; i++) {
      ctx.fillText(bioLines[i], innerX, bioY);
      bioY += BIO_LINE_H;
    }
    ty = bioY - BIO_LINE_H; // last bio baseline
  }

  // Pill row. Find the largest font size at which all pills fit side-by-side
  // within innerW. Smaller sizes mean narrower pills, which lets us keep
  // every pill visible and readable rather than ellipsing words mid-acronym.
  if (pills.length) {
    const pillY = bioLines.length ? ty + BIO_TO_PILL : ty + HEADING_TO_PILL;
    const PILL_GAP = 8;
    const sizes = [11, 10, 9, 8];
    let pillSize = sizes[sizes.length - 1];
    for (const s of sizes) {
      ctx.font = `500 ${s}px ${MONO}`;
      const padX = Math.max(8, Math.round(s * 0.85));
      const widths = pills.map(
        (p) => Math.round(ctx.measureText(p).width) + padX * 2,
      );
      const total = widths.reduce((sum, w) => sum + w, 0) + (pills.length - 1) * PILL_GAP;
      if (total <= innerW) {
        pillSize = s;
        break;
      }
      pillSize = s;
    }
    const PILL_PAD = Math.max(8, Math.round(pillSize * 0.85));
    const PILL_HEIGHT = Math.max(18, Math.round(pillSize * 1.83));
    // At the chosen size, cap each pill by the per-row budget derived from
    // the number of pills so the whole row remains inside innerW.
    const perPillCap = Math.max(
      80,
      Math.floor((innerW - (pills.length - 1) * PILL_GAP) / pills.length),
    );
    ctx.font = `500 ${pillSize}px ${MONO}`;
    const pillFit = fitUniformFontSize(
      ctx,
      pills,
      perPillCap,
      (s) => `500 ${s}px ${MONO}`,
      [pillSize],
    );
    const pillData = pillFit.texts.map((trimmed) => ({
      text: trimmed,
      width: Math.round(ctx.measureText(trimmed).width) + PILL_PAD * 2,
    }));
    let px = innerX;
    for (const d of pillData) {
      roundRect(ctx, px, pillY - PILL_HEIGHT / 2 - 1, d.width, PILL_HEIGHT, PILL_HEIGHT / 2);
      ctx.fillStyle = rgba(theme.accent, 0.18);
      ctx.fill();
      ctx.strokeStyle = rgba(theme.accent, 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = GLASS_TEXT;
      ctx.fillText(d.text, px + PILL_PAD, pillY + 1);
      px += d.width + PILL_GAP;
    }
  }

  drawCanvasFrame(ctx, W, H, 14);
}

const template: CanvasTemplate = {
  id: "glass-about",
  name: "Glass About",
  description:
    "Mesh gradient bg with a wide glass card carrying your bio, tags, and socials.",
  kind: "canvas",
  category: "about",
  family: "glass",
  width: 800,
  height: 320,
  fps: 24,
  duration: 10,
  fields: ["name", "role", "org", "location", "bio", "tagline"],
  renderFrame,
};

export default template;
