import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import {
  contributionTotal,
  displayHandle,
  escapeXml,
  languageBarSvg,
  languageBuckets,
  sourceLabel,
  statCards,
} from "./github-stats-utils";

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 320;
  const PAD = 48;
  const DUR = `${loopDuration}s`;

  const fg = theme.fg;
  const muted = theme.muted;
  const accent = theme.accent;
  const bg = theme.bg;

  const stats = info.githubStats;
  const handle = displayHandle(info);
  const cards = statCards(stats);
  const langs = languageBuckets(stats);

  // -- heading: editorial sans-serif title with a sweeping accent underline.
  // sleek-header uses 0.5em average char width for its underline; for inter
  // 700 at 36px the real average is closer to 0.56em, so we compute the
  // underline width with a slightly tighter ratio to match the visible run.
  const HEADING = "Activity.";
  const HEADING_SIZE = 36;
  const HEADING_X = PAD;
  const HEADING_Y = PAD + 36;
  const HEADING_CHAR_RATIO = 0.56;
  const UNDERLINE_W = Math.min(
    W - PAD * 2,
    Math.round(HEADING.length * HEADING_SIZE * HEADING_CHAR_RATIO),
  );
  const UNDERLINE_Y = HEADING_Y + 12;

  // meta line: uppercased mono dotted list, sits below the underline.
  const META_Y = HEADING_Y + 36;
  const metaParts = [
    `@${handle}`,
    `${contributionTotal(stats)} contributions`,
    sourceLabel(stats),
  ];
  const metaLine = metaParts.join("   ·   ");

  // -- stats grid: 4 columns, label / big value / hint stacked top-to-bottom.
  // each column gets the same width; the value is a big sans number, the
  // label is a tracked uppercase mono caption above it, the hint is a
  // smaller muted sans line below it.
  const STATS_TOP = 156;
  const STATS_GAP = 24;
  const STATS_COL_W = (W - PAD * 2 - STATS_GAP * 3) / 4;
  const statSvg = cards
    .map((c, i) => {
      const x = PAD + i * (STATS_COL_W + STATS_GAP);
      // The outer `<g>` carries the SVG `transform` attribute that puts
      // the tile at its grid slot; the inner `<g>` carries the
      // `.stat`/`.s{i}` classes whose `fadeUp` animation manipulates
      // CSS `transform`. They have to live on different elements: a CSS
      // `transform` on an SVG element fully *replaces* any `transform`
      // attribute already on that element (it doesn't compose), so when
      // both lived on the same `<g>` the animation snapped every tile
      // back to (0, 0) and they stacked in the top-left corner.
      return `<g transform="translate(${x} ${STATS_TOP})">
      <g class="stat s${i}">
        <text x="0" y="0" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${escapeXml(c.label.toUpperCase())}</text>
        <text x="0" y="38" fill="${fg}" font-family='"Inter", system-ui, sans-serif' font-size="34" font-weight="700" letter-spacing="-1">${escapeXml(c.value)}</text>
        <text x="0" y="60" fill="${muted}" font-family='"Inter", system-ui, sans-serif' font-size="11" font-weight="400">${escapeXml(c.hint)}</text>
      </g>
    </g>`;
    })
    .join("\n  ");

  // -- language strip: thin colored rail with auto-fit dot-and-label legend
  // beneath. legend entries split the inner width evenly and truncate via
  // letter-spacing only (no overlap with neighbors).
  const LANG_BAR_X = PAD;
  const LANG_BAR_W = W - PAD * 2;
  const LANG_BAR_Y = 254;
  const LANG_BAR_H = 6;
  const langTrack = `<rect x="${LANG_BAR_X}" y="${LANG_BAR_Y}" width="${LANG_BAR_W}" height="${LANG_BAR_H}" rx="${LANG_BAR_H / 2}" fill="${muted}" fill-opacity="0.2"/>`;
  const langFill = languageBarSvg(
    langs,
    LANG_BAR_X,
    LANG_BAR_Y,
    LANG_BAR_W,
    LANG_BAR_H,
    accent,
  );

  // legend layout: each item gets an equal slot; within a slot we render
  // a 8x8 colored swatch + 8 px gap + label. labels are auto-clamped to a
  // character cap derived from the slot width (mono ~0.6em).
  const LEGEND_Y = LANG_BAR_Y + LANG_BAR_H + 26;
  const LEGEND_FONT = 10;
  const LEGEND_CHAR_PX = LEGEND_FONT * 0.6;
  const SWATCH_SIZE = 8;
  const SWATCH_GAP = 8;
  const legendItems = langs.length ? langs.slice(0, 4) : [];
  const legendCount = Math.max(1, legendItems.length);
  const slotW = (W - PAD * 2) / legendCount;
  const labelBudgetPx = slotW - SWATCH_SIZE - SWATCH_GAP - 8;
  const labelMaxChars = Math.max(6, Math.floor(labelBudgetPx / LEGEND_CHAR_PX));
  const truncate = (s: string) =>
    s.length <= labelMaxChars ? s : `${s.slice(0, labelMaxChars - 1)}…`;

  const legendSvg = legendItems.length
    ? legendItems
        .map((l, i) => {
          const slotX = PAD + i * slotW;
          const swatchX = slotX;
          const swatchY = LEGEND_Y - SWATCH_SIZE + 1;
          const labelX = slotX + SWATCH_SIZE + SWATCH_GAP;
          // build full label, truncate if needed.
          const fullLabel = `${l.name.toUpperCase()}  ${l.percentage.toFixed(0)}%`;
          const label = truncate(fullLabel);
          return `<g>
        <rect x="${swatchX}" y="${swatchY}" width="${SWATCH_SIZE}" height="${SWATCH_SIZE}" rx="2" fill="${l.color ?? accent}"/>
        <text x="${labelX}" y="${LEGEND_Y}" fill="${muted}" font-family="ui-monospace, monospace" font-size="${LEGEND_FONT}" letter-spacing="1.4">${escapeXml(label)}</text>
      </g>`;
        })
        .join("\n  ")
    : `<text x="${PAD}" y="${LEGEND_Y}" fill="${muted}" font-family="ui-monospace, monospace" font-size="${LEGEND_FONT}" letter-spacing="1.4" fill-opacity="0.7">LOAD GITHUB STATS TO POPULATE</text>`;

  // animation cadence mirrors sleek-header: heading slides in, underline
  // sweeps across, content fades up, accent corners slide.
  const css = loopText
    ? `
    .heading { animation: slidein ${DUR} ease-out infinite; }
    .underline { animation: bar ${DUR} ease-out infinite; transform-origin: left center; }
    .meta { animation: fade ${DUR} ease-in-out infinite; }
    .corner { animation: cornerSlide ${DUR} ease-out infinite; }
    .stat { animation: fadeUp ${DUR} ease-out infinite; }
    ${cards.map((_, i) => `.s${i} { animation-delay: ${0.3 + i * 0.1}s }`).join("\n    ")}
    .lang-bar { animation: bar ${DUR} ease-out infinite; transform-origin: left center; }

    @keyframes slidein {
      0% { opacity: 0; transform: translateX(-12px) }
      8% { opacity: 1; transform: translateX(0) }
      90% { opacity: 1; transform: translateX(0) }
      100% { opacity: 0; transform: translateX(0) }
    }
    @keyframes bar {
      0%, 14% { transform: scaleX(0) }
      24%, 88% { transform: scaleX(1) }
      100% { transform: scaleX(1) }
    }
    @keyframes fade {
      0%, 22% { opacity: 0 }
      32%, 90% { opacity: 1 }
      100% { opacity: 0 }
    }
    @keyframes fadeUp {
      0%, 22% { opacity: 0; transform: translateY(8px) }
      36%, 90% { opacity: 1; transform: translateY(0) }
      100% { opacity: 0; transform: translateY(0) }
    }
    @keyframes cornerSlide {
      0%, 8% { opacity: 0; transform: translateX(-8px) }
      18%, 90% { opacity: 0.6; transform: translateX(0) }
      100% { opacity: 0; transform: translateX(0) }
    }
  `
    : `
    .underline, .lang-bar { transform-origin: left center; }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="sleek-stats-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#sleek-stats-bg)" rx="14" ry="14"/>

  <!-- corner decorations (mirrors sleek-header) -->
  <g class="corner" opacity="0.6">
    <rect x="40" y="42" width="22" height="2" fill="${accent}"/>
    <rect x="40" y="42" width="2" height="22" fill="${accent}"/>
  </g>
  <g transform="translate(${W} 0) scale(-1 1)">
    <g class="corner" opacity="0.6">
      <rect x="40" y="42" width="22" height="2" fill="${accent}"/>
      <rect x="40" y="42" width="2" height="22" fill="${accent}"/>
    </g>
  </g>

  <!-- heading + accent underline -->
  <text class="heading" x="${HEADING_X}" y="${HEADING_Y}" fill="${fg}" font-family='"Inter", system-ui, sans-serif' font-size="${HEADING_SIZE}" font-weight="700" letter-spacing="-1.2">${escapeXml(HEADING)}</text>
  <rect class="underline" x="${HEADING_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="2" fill="${accent}" rx="1"/>

  <!-- meta line -->
  <text class="meta" x="${HEADING_X}" y="${META_Y}" fill="${muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">${escapeXml(metaLine.toUpperCase())}</text>

  <!-- stat blocks -->
  ${statSvg}

  <!-- language strip -->
  ${langTrack}
  <g class="lang-bar">${langFill}</g>
  ${legendSvg}
</svg>`;
}

const template: SvgTemplate = {
  id: "sleek-github-stats",
  name: "Sleek GitHub",
  description:
    "Editorial GitHub year: oversized headline, four big numbers, and a single colour-coded language rail.",
  kind: "svg",
  category: "stats",
  family: "sleek",
  width: 800,
  height: 320,
  duration: 6,
  fields: ["github"],
  renderSvg,
};

export default template;
