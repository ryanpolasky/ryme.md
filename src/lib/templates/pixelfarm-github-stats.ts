import type {
  GitHubStats,
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize, truncateToWidth } from "../text-utils";
import {
  PALETTE,
  PIXEL_PALETTE,
  SPRITE_COIN,
  SPRITE_HEART,
  SPRITE_HEART_EMPTY,
  escapeXml,
  frameInner,
  renderPixelGrid,
  slimFrame,
  woodFrame,
} from "./pixelfarm-shared";
import {
  PIXEL_FONT_H,
  measurePixelText,
  pixelText,
} from "./pixelfarm-font";

/**
 * Quaint GitHub stats panel.
 *
 * Two-column body inside a wood-framed parchment:
 *
 *   LEFT  --  "LANGUAGES" sub-header + four heart rows. Each row is the
 *             top-4 languages by usage; the heart count (0-5) is a
 *             quantized read of the bucket percentage so the row reads
 *             like a Stardew NPC friendship meter.
 *
 *   RIGHT --  "METRICS" sub-header + a 2x2 grid of slim-framed cards.
 *             Each card is a coin sprite + big monospace number + small
 *             pixel-font label (STARS / COMMITS / PRS / FOLLOWERS).
 *
 * If no `githubStats` are available (user hasn't fetched yet), the
 * template renders a friendly "go fetch stats" empty state instead of
 * leaving the panel blank.
 */

const W = 800;
const H = 280;
const PAD = 28;

const HEADER_TEXT = "STATS";
const HEADER_SCALE = 4;
const HEADER_H = PIXEL_FONT_H * HEADER_SCALE;

const SUB_SCALE = 2;
const SUB_H = PIXEL_FONT_H * SUB_SCALE;

// Layout gaps.
const PAD_TOP = 22;
const HEADER_TO_UNDERLINE = 8;
const UNDERLINE_H = 3;
const UNDERLINE_TO_BODY = 18;
const SUB_TO_CONTENT = 14;

// Language row: name + 5 hearts. Hearts at scale 3 = 21x18.
const HEART_SCALE = 3;
const HEART_W = 7 * HEART_SCALE; // 21
const HEART_H = 6 * HEART_SCALE; // 18
const HEART_GAP = 4;
const HEART_ROW_W = HEART_W * 5 + HEART_GAP * 4; // 5 hearts + 4 gaps = 121
const LANG_ROW_H = HEART_H + 10; // 28

// Coin sprite scale -- 5x5 -> 15x15 at scale 3.
const COIN_SCALE = 3;
const COIN_W = 5 * COIN_SCALE;
const COIN_H = 5 * COIN_SCALE;

/**
 * Top-N language buckets pulled from githubStats. Returns up to 4 with
 * the highest percentages. If the user hasn't fetched stats yet,
 * returns an empty array.
 */
function topLanguages(stats: GitHubStats | null) {
  if (!stats || !stats.languages || stats.languages.length === 0) return [];
  return stats.languages
    .slice() // never mutate the cached object
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4);
}

/**
 * Quantize a percentage into a Stardew-style 0-5 heart count. The
 * thresholds bias upward so any non-zero usage shows at least one
 * heart -- a language someone touched but uses 1% of the time still
 * reads as part of their toolkit.
 */
function heartsFromPct(pct: number): number {
  if (pct <= 0) return 0;
  if (pct < 5) return 1;
  if (pct < 15) return 2;
  if (pct < 30) return 3;
  if (pct < 55) return 4;
  return 5;
}

/**
 * Format a metric number for the right-column cards. Compacts to k/M
 * suffixes so big follower counts don't overflow a 70px-wide value
 * slot. Returns "--" for null (REST-unauth fallback didn't supply it).
 */
function formatMetric(n: number | null): string {
  if (n === null || n === undefined) return "--";
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1000000) return Math.round(n / 1000) + "k";
  return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
}

function renderSvg(
  info: ProfileInfo,
  _theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const inner = frameInner(0, 0, W, H);
  const stats = info.githubStats;
  const langs = topLanguages(stats);
  const hasStats = stats !== null;

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

  // Right-side username caption (small pixel-font) so a viewer knows
  // whose stats they're looking at. Falls back gracefully when no
  // username is set.
  const username = (info.githubUsername || stats?.username || "").trim();
  const usernameLabel = username ? `@${username.toUpperCase()}` : "";
  const usernameScale = 2;
  const usernameW = measurePixelText(usernameLabel, usernameScale);
  const usernameX = inner.x + inner.w - PAD - usernameW;
  const usernameY = HEADER_Y + Math.round((HEADER_H - PIXEL_FONT_H * usernameScale) / 2);
  const usernamePixels = usernameLabel
    ? pixelText(usernameLabel, usernameScale, usernameX, usernameY, PALETTE.woodMid).svg
    : "";

  // -- Underline ---------------------------------------------------------
  const UNDERLINE_X = HEADER_X;
  const UNDERLINE_Y = HEADER_Y + HEADER_H + HEADER_TO_UNDERLINE;
  const UNDERLINE_W = HEADER_W_PX;

  // -- Body split into left/right columns -------------------------------
  const BODY_TOP = UNDERLINE_Y + UNDERLINE_H + UNDERLINE_TO_BODY;
  const BODY_W = inner.w - PAD * 2;
  const COL_GAP = 28;
  const COL_W = Math.floor((BODY_W - COL_GAP) / 2);
  const LEFT_X = inner.x + PAD;
  const RIGHT_X = LEFT_X + COL_W + COL_GAP;

  // -- Empty state --------------------------------------------------------
  // Render this first so the rest of the body code can assume stats !== null.
  if (!hasStats) {
    const msgY = inner.y + inner.h / 2 + 8;
    const captionY = msgY + 22;
    const css = `
      ${
        loopText
          ? `
      .pf-header { animation: pf-pop ${DUR} ease-out infinite; }
      .pf-underline { animation: pf-wipe ${DUR} ease-out infinite; transform-origin: ${UNDERLINE_X}px center; }
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
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  ${woodFrame(0, 0, W, H)}
  <g class="pf-header">${headerPixels}</g>
  <g class="pf-underline">
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="3" fill="${PALETTE.woodMid}"/>
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="1" fill="${PALETTE.woodLight}"/>
  </g>
  <text x="${inner.x + inner.w / 2}" y="${msgY}" text-anchor="middle" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="16" font-weight="700" letter-spacing="2">-- NO STATS ON FILE --</text>
  <text x="${inner.x + inner.w / 2}" y="${captionY}" text-anchor="middle" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="12" font-weight="500" letter-spacing="1">drop a github username in the editor to fetch</text>
</svg>`;
  }

  // -- Left column: languages -------------------------------------------
  const LEFT_SUB_Y = BODY_TOP;
  const leftSubPixels = pixelText(
    "LANGUAGES",
    SUB_SCALE,
    LEFT_X,
    LEFT_SUB_Y,
    PALETTE.woodMid,
  ).svg;

  // Auto-shrink language names so the longest still fits within the
  // available row width minus the hearts.
  const langNameBudget = COL_W - HEART_ROW_W - 12;
  const langNames = langs.map((l) => l.name.toUpperCase());
  const langFit = fitUniformFontSize(
    langNames,
    langNameBudget,
    [13, 12, 11, 10],
    "mono",
  );
  const langSize = langFit.size;

  const LANG_ROWS_TOP = LEFT_SUB_Y + SUB_H + SUB_TO_CONTENT;
  const langRowNodes = langs
    .map((bucket, i) => {
      const y = LANG_ROWS_TOP + i * LANG_ROW_H;
      const nameY = y + Math.round(HEART_H * 0.7);
      const heartsX = LEFT_X + COL_W - HEART_ROW_W;
      const filled = heartsFromPct(bucket.percentage);
      const heartParts: string[] = [];
      for (let h = 0; h < 5; h++) {
        const hx = heartsX + h * (HEART_W + HEART_GAP);
        const sprite = h < filled ? SPRITE_HEART : SPRITE_HEART_EMPTY;
        heartParts.push(
          renderPixelGrid(sprite, PIXEL_PALETTE, HEART_SCALE, hx, y),
        );
      }
      return `<g class="pf-lang pf-lang-${i}">
    <text x="${LEFT_X}" y="${nameY}" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="${langSize}" font-weight="700" letter-spacing="1">${escapeXml(langFit.texts[i])}</text>
    ${heartParts.join("")}
  </g>`;
    })
    .join("\n  ");

  const emptyLangs =
    langs.length === 0
      ? `<text x="${LEFT_X}" y="${LANG_ROWS_TOP + 18}" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="12" letter-spacing="1">-- no language data --</text>`
      : "";

  // -- Right column: metric cards ---------------------------------------
  const RIGHT_SUB_Y = BODY_TOP;
  const rightSubPixels = pixelText(
    "METRICS",
    SUB_SCALE,
    RIGHT_X,
    RIGHT_SUB_Y,
    PALETTE.woodMid,
  ).svg;

  // 2x2 metric grid: each card 165 x 60 with 10px gap.
  type Metric = { label: string; value: string };
  const metricList: Metric[] = [
    { label: "STARS", value: formatMetric(stats.totals.starsReceived) },
    { label: "COMMITS", value: formatMetric(stats.totals.commitsThisYear) },
    { label: "PRS", value: formatMetric(stats.totals.prsAuthored) },
    { label: "FOLLOWERS", value: formatMetric(stats.profile.followers) },
  ];

  const METRIC_GAP = 10;
  const METRIC_W = Math.floor((COL_W - METRIC_GAP) / 2);
  const METRIC_H = 60;
  const METRICS_TOP = RIGHT_SUB_Y + SUB_H + SUB_TO_CONTENT;

  // Auto-shrink the four metric values uniformly so the column doesn't
  // get a single jumbo value next to three smaller ones.
  const valueBudget = METRIC_W - COIN_W - 18;
  const valueFit = fitUniformFontSize(
    metricList.map((m) => m.value),
    valueBudget,
    [22, 20, 18, 16, 14],
    "mono",
  );

  // Vertical layout inside the 60-tall card:
  //   y+7  .. y+21  -- pixel-font label (scale 2 = 14h)
  //   y+21 .. y+33  -- 12px breathing gap (label glyphs and value glyphs
  //                    were overlapping before -- the value font ascent
  //                    landed right on the label bottom)
  //   y+33 .. y+~52 -- coin sprite + value number row
  //   y+~52 .. y+60 -- ~8px bottom pad for descenders
  const LABEL_TOP = 7;
  const VALUE_BASELINE_FROM_BOTTOM = 12;

  const metricNodes = metricList
    .map((metric, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = RIGHT_X + col * (METRIC_W + METRIC_GAP);
      const y = METRICS_TOP + row * (METRIC_H + METRIC_GAP);

      const labelX = x + 12;
      const labelY = y + LABEL_TOP;
      const labelPixels = pixelText(
        metric.label,
        2,
        labelX,
        labelY,
        PALETTE.woodMid,
      ).svg;

      // Coin + value share the lower row. The value baseline is
      // anchored to the card bottom so it doesn't drift if METRIC_H or
      // the font size changes; the coin is vertically centered on the
      // value's visual midline.
      const valueBaselineY = y + METRIC_H - VALUE_BASELINE_FROM_BOTTOM;
      const coinX = x + 12;
      const coinY = valueBaselineY - COIN_H + 1;
      const valueX = coinX + COIN_W + 8;

      return `<g class="pf-metric pf-metric-${i}">
    ${slimFrame(x, y, METRIC_W, METRIC_H)}
    ${labelPixels}
    ${renderPixelGrid(SPRITE_COIN, PIXEL_PALETTE, COIN_SCALE, coinX, coinY)}
    <text x="${valueX}" y="${valueBaselineY}" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="${valueFit.size}" font-weight="700" letter-spacing="1">${escapeXml(valueFit.texts[i])}</text>
  </g>`;
    })
    .join("\n  ");

  // -- Animations --------------------------------------------------------
  const langDelays = langs
    .map(
      (_, i) =>
        `.pf-lang-${i} { animation-delay: ${(loopDuration * (0.15 + i * 0.05)).toFixed(2)}s; }`,
    )
    .join("\n    ");
  const metricDelays = metricList
    .map(
      (_, i) =>
        `.pf-metric-${i} { animation-delay: ${(loopDuration * (0.2 + i * 0.05)).toFixed(2)}s; }`,
    )
    .join("\n    ");

  const css = `
    ${
      loopText
        ? `
    .pf-header { animation: pf-pop ${DUR} ease-out infinite; }
    .pf-underline { animation: pf-wipe ${DUR} ease-out infinite; transform-origin: ${UNDERLINE_X}px center; }
    .pf-sub { animation: pf-pop ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.08).toFixed(2)}s; }
    .pf-lang { animation: pf-pop ${DUR} ease-out infinite; }
    .pf-metric { animation: pf-pop ${DUR} ease-out infinite; }
    ${langDelays}
    ${metricDelays}
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

  // Truncation hint at the very bottom right -- if the GitHub fetch was
  // REST-unauth, mention it so the user knows why commits/PRs read "--".
  const sourceHint =
    stats.source === "rest-unauth"
      ? truncateToWidth("partial data (add a github token to fetch full stats)", inner.w - PAD * 2, 10, "mono")
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${woodFrame(0, 0, W, H)}

  <!-- header + username caption -->
  <g class="pf-header">${headerPixels}</g>
  ${usernamePixels}

  <!-- wood-tone underline -->
  <g class="pf-underline">
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="3" fill="${PALETTE.woodMid}"/>
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="1" fill="${PALETTE.woodLight}"/>
  </g>

  <!-- left column: languages -->
  <g class="pf-sub">${leftSubPixels}</g>
  ${langRowNodes}
  ${emptyLangs}

  <!-- right column: metrics -->
  <g class="pf-sub">${rightSubPixels}</g>
  ${metricNodes}

  ${
    sourceHint
      ? `<text x="${inner.x + inner.w - PAD}" y="${inner.y + inner.h - 12}" text-anchor="end" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="10" font-style="italic">${escapeXml(sourceHint)}</text>`
      : ""
  }
</svg>`;
}

const template: SvgTemplate = {
  id: "pixelfarm-github-stats",
  name: "Quaint Stats",
  description:
    "Cozy GitHub stats panel: wood-framed parchment, Stardew-style heart-row language affinity (top 4 languages), and a 2x2 grid of coin-counter metric cards (stars, commits, PRs, followers).",
  kind: "svg",
  category: "stats",
  family: "pixelfarm",
  width: W,
  height: H,
  duration: 6,
  fields: ["github"],
  renderSvg,
};

export default template;
