import type {
  CanvasTemplate,
  Ctx2D,
  ProfileInfo,
  TemplateTheme,
} from "../types";
import { drawSocialIcon } from "../social-icons";
import { MONO, SANS, fitFontSize, rgba } from "../canvas-utils";
import {
  drawCanvasFrame,
  drawGlassBackground,
  drawGlassCard,
} from "../glass-shared";

function liveSocials(info: ProfileInfo) {
  return info.socials.filter((s) => s.value.trim());
}

function renderFrame(
  ctx: Ctx2D,
  t: number,
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
) {
  const W = 800;
  const H = 160;

  drawGlassBackground(ctx, t, loopDuration, theme, W, H);

  // Wide thin glass card
  const cardX = 24;
  const cardY = 18;
  const cardW = W - 48;
  const cardH = H - 36;
  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 14);

  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Sign-off line. Auto-shrink the entire composite line through 14 → 13 → 12
  // px so long taglines stay inside the card without ellipsing.
  const name = info.name || "you";
  const right = ` by ${name}${info.tagline ? ` - ${info.tagline}` : ""}`;
  const left = "made with ";
  const heart = "♥";
  const SIGNOFF_BUDGET = cardW - 48;
  const signoffFit = fitFontSize(
    ctx,
    `${left}${heart}${right}`,
    SIGNOFF_BUDGET,
    (s) => `500 ${s}px ${SANS}`,
    [14, 13, 12],
  );
  const signoffSize = signoffFit.size;
  ctx.font = `500 ${signoffSize}px ${SANS}`;
  const lw = ctx.measureText(left).width;
  const hw = ctx.measureText(heart).width;
  const rw = ctx.measureText(right).width;
  const total = lw + hw + rw;
  const startX = cx - total / 2;

  const socials = liveSocials(info);

  // Group signoff + socials, center the group vertically in the card.
  // Signoff cap/descender scale with the fitted size (~0.71em / 0.21em).
  const SIGNOFF_CAP = Math.round(signoffSize * 0.71);
  const SIGNOFF_DESC = Math.round(signoffSize * 0.21);
  const ICON = 14;
  const ICON_GAP = 6;
  const ENTRY_GAP = 22;
  const GROUP_GAP = 14;
  const ROW_GAP = 8;
  const MAX_ROW_W = cardW - 60;

  // Pre-measure socials values to decide single vs two-row layout.
  ctx.font = `500 11px ${MONO}`;
  const widths = socials.map((s) => ctx.measureText(s.value).width);
  const entryWidths = widths.map((w) => ICON + ICON_GAP + w);
  const measureRow = (idxs: number[]): number => {
    if (idxs.length === 0) return 0;
    return (
      idxs.reduce((sum, i) => sum + entryWidths[i], 0) +
      (idxs.length - 1) * ENTRY_GAP
    );
  };
  const allIdx = socials.map((_, i) => i);
  const singleRowW = measureRow(allIdx);
  const wrapSocials = socials.length > 1 && singleRowW > MAX_ROW_W;
  const topCount = wrapSocials ? Math.ceil(socials.length / 2) : socials.length;
  const rowsIdxs: number[][] = wrapSocials
    ? [allIdx.slice(0, topCount), allIdx.slice(topCount)]
    : socials.length
      ? [allIdx]
      : [];

  const socialsBlockH = rowsIdxs.length
    ? rowsIdxs.length * ICON + (rowsIdxs.length - 1) * ROW_GAP
    : 0;
  const groupHeight = rowsIdxs.length
    ? SIGNOFF_CAP + SIGNOFF_DESC + GROUP_GAP + socialsBlockH
    : SIGNOFF_CAP + SIGNOFF_DESC;
  const cardCenterY = cardY + cardH / 2;
  const groupTop = Math.round(cardCenterY - groupHeight / 2);
  const ty = groupTop + SIGNOFF_CAP;

  ctx.font = `500 ${signoffSize}px ${SANS}`;
  ctx.textAlign = "left";
  ctx.fillStyle = rgba(theme.fg, 0.85);
  ctx.fillText(left, startX, ty);
  ctx.fillStyle = theme.accent;
  ctx.fillText(heart, startX + lw, ty);
  ctx.fillStyle = rgba(theme.fg, 0.85);
  ctx.fillText(right, startX + lw + hw, ty);

  // Socials rows (1 or 2), each centered around card centerline
  if (rowsIdxs.length) {
    ctx.font = `500 11px ${MONO}`;
    const firstRowCenter = ty + SIGNOFF_DESC + GROUP_GAP + ICON / 2;
    ctx.textBaseline = "middle";
    rowsIdxs.forEach((rowIdxs, rowI) => {
      const rowW = measureRow(rowIdxs);
      let sx = cx - rowW / 2;
      const sy = firstRowCenter + rowI * (ICON + ROW_GAP);
      for (const i of rowIdxs) {
        drawSocialIcon(ctx, socials[i].kind, sx, sy - ICON / 2, ICON, rgba(theme.fg, 0.85), 2);
        sx += ICON + ICON_GAP;
        ctx.fillStyle = rgba(theme.fg, 0.65);
        ctx.fillText(socials[i].value, sx, sy);
        sx += widths[i] + ENTRY_GAP;
      }
    });
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
  }

  drawCanvasFrame(ctx, W, H, 14);
}

const template: CanvasTemplate = {
  id: "glass-footer",
  name: "Glass Sign-off",
  description:
    "Mesh gradient bg with a wide thin glass card carrying your sign-off and socials.",
  kind: "canvas",
  category: "footer",
  family: "glass",
  width: 800,
  height: 160,
  fps: 24,
  duration: 8,
  fields: ["name", "tagline", "socials"],
  renderFrame,
};

export default template;
