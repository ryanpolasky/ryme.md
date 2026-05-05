import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize } from "../text-utils";
import {
  GLASS_TEXT,
  escapeXml,
  glassBackground,
  glassCard,
  glassDefs,
  glassFrame,
  glassMiniCard,
  glassStyles,
} from "../glass-svg-shared";
import {
  contributionTotal,
  displayHandle,
  languageBarSvg,
  languageBuckets,
  sourceLabel,
  statCards,
} from "./github-stats-utils";

/**
 * Glass GitHub -- live-ish stats card. The only template that's still
 * worth re-rendering server-side per pageview, since its content (commit
 * counts, language mix, contribution total) drifts with the user's
 * GitHub activity. The combined README snippet wires this template's
 * URL through `/api/render/<id>?u=<handle>` so a viewer's first hit on
 * the README pulls the freshest stats our 6h KV cache holds.
 *
 * Layout matches the canvas original tile-for-tile: heading + meta line
 * across the top, four metric mini-cards on a single row underneath, and
 * a thin language rail with up to four legend entries pinned to the
 * bottom of the card.
 */
function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 320;

  // Card geometry: 30 px inset (matches glass-about so a stack of glass
  // sections has a consistent rhythm).
  const PAD = 30;
  const cardX = PAD;
  const cardY = PAD;
  const cardW = W - PAD * 2;
  const cardH = H - PAD * 2;

  const innerX = cardX + 32;
  const innerW = cardW - 64;

  const stats = info.githubStats;
  const handle = displayHandle(info);
  const cards = statCards(stats);
  const langs = languageBuckets(stats);

  // ---- Heading + meta line ------------------------------------------------
  const headingFit = fitFontSize(
    `@${handle}`,
    innerW,
    [32, 28, 24, 20],
    "sans",
  );
  const headingY = cardY + 36 + Math.round(headingFit.size * 0.74);
  const headingNode = `<text x="${innerX}" y="${headingY}" fill="${GLASS_TEXT}" font-family='"Inter", system-ui, sans-serif' font-size="${headingFit.size}" font-weight="700">${escapeXml(headingFit.text)}</text>`;

  const metaText = `${contributionTotal(stats)} CONTRIBUTIONS  ·  ${sourceLabel(stats).toUpperCase()}`;
  const metaNode = `<text x="${innerX}" y="${headingY + 22}" fill="${GLASS_TEXT}" opacity="0.7" font-family="ui-monospace, SFMono-Regular, monospace" font-size="11" font-weight="500">${escapeXml(metaText)}</text>`;

  // ---- Four metric tiles --------------------------------------------------
  const cardsY = cardY + 96;
  const tileH = 92;
  const tileGap = 14;
  const tileW = (innerW - tileGap * 3) / 4;

  const tileNodes = cards
    .map((c, i) => {
      const x = innerX + i * (tileW + tileGap);

      const valueFit = fitFontSize(
        c.value,
        tileW - 28,
        [30, 26, 22, 18],
        "sans",
      );
      const hintFit = fitFontSize(
        c.hint,
        tileW - 28,
        [11, 10, 9],
        "sans",
      );

      return `${glassMiniCard(x, cardsY, tileW, tileH, 12)}
  <text x="${x + 14}" y="${cardsY + 22}" fill="${GLASS_TEXT}" opacity="0.55" font-family="ui-monospace, SFMono-Regular, monospace" font-size="10" font-weight="500" letter-spacing="1">${escapeXml(c.label.toUpperCase())}</text>
  <text x="${x + 14}" y="${cardsY + 60}" fill="${GLASS_TEXT}" font-family='"Inter", system-ui, sans-serif' font-size="${valueFit.size}" font-weight="700" letter-spacing="-1">${escapeXml(valueFit.text)}</text>
  <text x="${x + 14}" y="${cardsY + tileH - 14}" fill="${GLASS_TEXT}" opacity="0.55" font-family='"Inter", system-ui, sans-serif' font-size="${hintFit.size}" font-weight="400">${escapeXml(hintFit.text)}</text>`;
    })
    .join("\n  ");

  // ---- Language strip + legend --------------------------------------------
  const stripTop = cardY + cardH - 56;
  const barX = innerX;
  const barW = innerW;
  const barH = 8;
  const barY = stripTop;

  // Track behind the colored fill so an empty-stats render still shows
  // a thin glass-tone rail (matches canvas original).
  const langTrack = `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${GLASS_TEXT}" fill-opacity="0.1"/>`;
  const langFill = languageBarSvg(langs, barX, barY, barW, barH, theme.accent);

  // Legend: dots + labels. Up to 4 evenly-spaced slots; falls back to a
  // single muted "load github stats" line when no languages are known.
  const legendY = barY + barH + 18;
  const legendItems = langs.length ? langs.slice(0, 4) : [];
  const legendStep = legendItems.length
    ? Math.floor(innerW / legendItems.length)
    : 0;

  const legendNodes = legendItems.length
    ? legendItems
        .map((l, i) => {
          const lx = innerX + i * legendStep;
          return `<circle cx="${lx + 4}" cy="${legendY - 3}" r="4" fill="${l.color ?? theme.accent}"/>
  <text x="${lx + 14}" y="${legendY}" fill="${GLASS_TEXT}" opacity="0.7" font-family="ui-monospace, SFMono-Regular, monospace" font-size="10" font-weight="500">${escapeXml(`${l.name.toUpperCase()} ${l.percentage.toFixed(0)}%`)}</text>`;
        })
        .join("\n  ")
    : `<text x="${innerX}" y="${legendY}" fill="${GLASS_TEXT}" opacity="0.5" font-family="ui-monospace, SFMono-Regular, monospace" font-size="10" font-weight="500">LOAD GITHUB STATS TO POPULATE</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${glassStyles(loopDuration, loopText)}</style>
  <defs>${glassDefs(theme)}</defs>
  ${glassBackground(W, H, theme)}
  ${glassCard(cardX, cardY, cardW, cardH, 18)}
  ${headingNode}
  ${metaNode}
  ${tileNodes}
  ${langTrack}
  ${langFill}
  ${legendNodes}
  ${glassFrame(W, H, 14)}
</svg>`;
}

const template: SvgTemplate = {
  id: "glass-github-stats",
  name: "Glass GitHub",
  description:
    "Glass card carrying your GitHub year: four metric tiles and a language rail. Live-rendered as your stats change.",
  kind: "svg",
  category: "stats",
  family: "glass",
  width: 800,
  height: 320,
  duration: 10,
  fields: ["github"],
  renderSvg,
};

export default template;
