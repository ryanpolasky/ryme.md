import type {
  CanvasTemplate,
  Ctx2D,
  ProfileInfo,
  TemplateTheme,
} from "../types";
import { MONO, SANS, fitFontSize, rgba, roundRect } from "../canvas-utils";
import {
  GLASS_TEXT,
  drawCanvasFrame,
  drawGlassBackground,
  drawGlassCard,
} from "../glass-shared";
import {
  contributionTotal,
  displayHandle,
  languageBuckets,
  sourceLabel,
  statCards,
} from "./github-stats-utils";

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

  // ----- Main glass card (matches glass-about geometry: 30 px inset) -----
  const PAD = 30;
  const cardX = PAD;
  const cardY = PAD;
  const cardW = W - PAD * 2;
  const cardH = H - PAD * 2;
  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 18);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const innerX = cardX + 32;
  const innerW = cardW - 64;

  const stats = info.githubStats;
  const handle = displayHandle(info);
  const cards = statCards(stats);
  const langs = languageBuckets(stats);

  // ----- Heading: @handle, oversized sans, fits the card width -----
  const headingFit = fitFontSize(
    ctx,
    `@${handle}`,
    innerW,
    (s) => `700 ${s}px ${SANS}`,
    [32, 28, 24, 20],
  );
  const headingY = cardY + 36 + Math.round(headingFit.size * 0.74);
  ctx.fillStyle = GLASS_TEXT;
  ctx.font = headingFit.font;
  ctx.fillText(headingFit.text, innerX, headingY);

  // Meta line under heading: contribution count + source, mono uppercased
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = rgba(GLASS_TEXT, 0.7);
  const meta = `${contributionTotal(stats)} CONTRIBUTIONS  ·  ${sourceLabel(stats).toUpperCase()}`;
  ctx.fillText(meta, innerX, headingY + 22);

  // ----- 4 metric mini-cards (translucent, recursive glass treatment) -----
  const cardsY = cardY + 96;
  const cardsH = 92;
  const cardGap = 14;
  const cardW2 = (innerW - cardGap * 3) / 4;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const x = innerX + i * (cardW2 + cardGap);
    // Mini glass: same treatment as the main card but smaller.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = rgba("#ffffff", 0.06);
    roundRect(ctx, x, cardsY, cardW2, cardsH, 12);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgba("#ffffff", 0.14);
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, cardsY + 0.5, cardW2 - 1, cardsH - 1, 12);
    ctx.stroke();

    // Label (top, mono muted)
    ctx.fillStyle = rgba(GLASS_TEXT, 0.55);
    ctx.font = `500 10px ${MONO}`;
    ctx.fillText(c.label.toUpperCase(), x + 14, cardsY + 22);

    // Value (large sans, fitted)
    const valueFit = fitFontSize(
      ctx,
      c.value,
      cardW2 - 28,
      (s) => `700 ${s}px ${SANS}`,
      [30, 26, 22, 18],
    );
    ctx.fillStyle = GLASS_TEXT;
    ctx.font = valueFit.font;
    ctx.fillText(valueFit.text, x + 14, cardsY + 22 + 38);

    // Hint (bottom)
    ctx.fillStyle = rgba(GLASS_TEXT, 0.55);
    ctx.font = `400 11px ${SANS}`;
    const hintFit = fitFontSize(
      ctx,
      c.hint,
      cardW2 - 28,
      (s) => `400 ${s}px ${SANS}`,
      [11, 10, 9],
    );
    ctx.font = hintFit.font;
    ctx.fillText(hintFit.text, x + 14, cardsY + cardsH - 14);
  }

  // ----- Language strip: thin segmented bar + dot legend (fixed spacing
  // matching the rest of the glass family's calm rhythm) -----
  const stripTop = cardY + cardH - 56;
  const barX = innerX;
  const barW = innerW;
  const barH = 8;
  const barY = stripTop;

  // Track
  ctx.fillStyle = rgba(GLASS_TEXT, 0.1);
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();

  // Filled segments
  if (langs.length) {
    let cursor = barX;
    for (let i = 0; i < langs.length; i++) {
      const l = langs[i];
      const w =
        i === langs.length - 1
          ? barX + barW - cursor
          : Math.max(2, (barW * l.percentage) / 100);
      ctx.fillStyle = l.color || theme.accent;
      roundRect(ctx, cursor, barY, w, barH, barH / 2);
      ctx.fill();
      cursor += w;
    }
  } else {
    ctx.fillStyle = rgba(theme.accent, 0.2);
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();
  }

  // Legend: dots + labels, evenly spaced
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = rgba(GLASS_TEXT, 0.7);
  const legendY = barY + barH + 18;
  const legendItems = langs.length ? langs.slice(0, 4) : [];
  const legendStep = legendItems.length
    ? Math.floor(innerW / legendItems.length)
    : 0;
  for (let i = 0; i < legendItems.length; i++) {
    const l = legendItems[i];
    const lx = innerX + i * legendStep;
    // Dot
    ctx.beginPath();
    ctx.fillStyle = l.color || theme.accent;
    ctx.arc(lx + 4, legendY - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    // Label
    ctx.fillStyle = rgba(GLASS_TEXT, 0.7);
    ctx.font = `500 10px ${MONO}`;
    const label = `${l.name.toUpperCase()} ${l.percentage.toFixed(0)}%`;
    ctx.fillText(label, lx + 14, legendY);
  }
  if (!legendItems.length) {
    ctx.fillStyle = rgba(GLASS_TEXT, 0.5);
    ctx.fillText("LOAD GITHUB STATS TO POPULATE", innerX, legendY);
  }

  drawCanvasFrame(ctx, W, H, 14);
}

const template: CanvasTemplate = {
  id: "glass-github-stats",
  name: "Glass GitHub",
  description:
    "Animated mesh-gradient glass card carrying your GitHub year: four metric tiles and a language rail.",
  kind: "canvas",
  category: "stats",
  family: "glass",
  width: 800,
  height: 320,
  fps: 24,
  duration: 10,
  fields: ["github"],
  renderFrame,
};

export default template;
