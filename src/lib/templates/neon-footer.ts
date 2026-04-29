import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { socialIconSvg } from "../social-icons";
import { fitFontSize } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 180;
  const cx = W / 2;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  const SOCIAL_LIMIT = 4;
  const socials = info.socials.filter((s) => s.value.trim()).slice(0, SOCIAL_LIMIT);
  const SOCIAL_MAX_CHARS = 36;
  const shownSocials = socials.map((s) => ({
    ...s,
    value:
      s.value.length > SOCIAL_MAX_CHARS
        ? s.value.slice(0, SOCIAL_MAX_CHARS - 1) + "…"
        : s.value,
  }));
  const tagline =
    info.tagline || (info.name ? `transmission_complete // ${info.name}` : "transmission_complete");

  // Sign-off in mono caps with letter-spacing — "// END_TRANSMISSION".
  // Auto-shrink the tagline through 13 → 12 → 11 px with the prefix
  // included in the budget.
  const headerText = "// END_TRANSMISSION";
  const TAG_BUDGET = W - 100;
  const tagFit = fitFontSize(tagline, TAG_BUDGET, [13, 12, 11], "mono");
  const tagText = tagFit.text;
  const tagSize = tagFit.size;

  // Vertical layout: the header strip (above) and data-stream bars (below)
  // are chrome — they pin to their fixed positions. The content trio
  // [TX heading / tagline / socials] is treated as a single block, grouped
  // with tight row gaps and vertically centered between the chrome bands so
  // the footer reads as "chrome · content · chrome" instead of "four things
  // scattered across the canvas".
  const HEADER_Y = 22;
  const STREAM_Y = 152;
  // Available vertical zone for the content group (below header strip,
  // above the tallest data-stream bar).
  const CONTENT_TOP = 36;
  const CONTENT_BOTTOM = 140;
  // Baseline-to-baseline gaps inside the group. Tighter than the prior
  // layout (was 26 / 36) so tagline and socials read as a unit.
  const GAP_TX_TAG = 22;
  const GAP_TAG_SOC = 20;
  // Approx visual overshoot above the TX baseline (ascender of a 20 px cap)
  // and below the socials baseline (icon dominates; 12 px text sits mostly
  // above its baseline).
  const TX_ABOVE = 15;
  const SOC_BELOW = 8;
  // Total height of the group, measured from TX's visual top to socials'
  // visual bottom, and the baseline of each row derived from it.
  const groupVisualH = TX_ABOVE + GAP_TX_TAG + GAP_TAG_SOC + SOC_BELOW;
  const groupCenterY = (CONTENT_TOP + CONTENT_BOTTOM) / 2;
  const groupVisualTop = groupCenterY - groupVisualH / 2;
  // TX gets a small manual lift (-6 px) above its strict group-center
  // baseline. With the tagline sitting close to the centered position,
  // having TX at the exact top of the group reads a touch low; lifting it
  // restores air between the header strip and the heading. Tagline and
  // socials keep their centered baselines.
  const TX_Y = Math.round(groupVisualTop + TX_ABOVE) - 6;
  const TAG_Y = Math.round(groupVisualTop + TX_ABOVE) + GAP_TX_TAG;
  const SOCIALS_Y = TAG_Y + GAP_TAG_SOC;

  // Socials layout: each entry is `<icon> <value>`, mono spacing. Use a
  // two-row fallback when needed so long values don't clip off-canvas.
  const ICON = 14;
  const ICON_GAP = 6;
  const ENTRY_GAP = 22;
  const ROW_GAP = 18;
  const MAX_ROW_W = W - 100;
  const entryWidths = shownSocials.map(
    (s) => ICON + ICON_GAP + Math.round(s.value.length * 7.2),
  );

  const rowWidth = (idxs: number[]) =>
    idxs.length
      ? idxs.reduce((sum, i) => sum + entryWidths[i], 0) +
        (idxs.length - 1) * ENTRY_GAP
      : 0;
  const rowIdxs: number[][] = [];
  if (shownSocials.length) {
    let cur: number[] = [];
    let curW = 0;
    shownSocials.forEach((_, i) => {
      const nextW =
        cur.length === 0
          ? entryWidths[i]
          : curW + ENTRY_GAP + entryWidths[i];
      if (cur.length > 0 && nextW > MAX_ROW_W) {
        rowIdxs.push(cur);
        cur = [i];
        curW = entryWidths[i];
      } else {
        cur.push(i);
        curW = nextW;
      }
    });
    if (cur.length) rowIdxs.push(cur);
  }
  const firstRowY =
    rowIdxs.length === 1 ? SOCIALS_Y : SOCIALS_Y - Math.round(ROW_GAP / 2);

  const socialsSvg = rowIdxs
    .map((idxs, rowI) => {
      const y = firstRowY + rowI * ROW_GAP;
      const w = rowWidth(idxs);
      let socX = Math.round(cx - w / 2);
      return idxs
        .map((i) => {
          const s = shownSocials[i];
          const xStart = socX;
          socX += entryWidths[i] + ENTRY_GAP;
          const stroke = i % 2 === 0 ? accent : muted;
          return `<g transform="translate(${xStart} ${y})" class="soc sf${i}">
      <g transform="translate(0 ${-ICON / 2})">${socialIconSvg(s.kind, ICON, stroke)}</g>
      <text x="${ICON + ICON_GAP}" y="0" fill="${stroke}" font-family="ui-monospace, monospace" font-size="12" dominant-baseline="middle" letter-spacing="0.5">${escapeXml(s.value)}</text>
    </g>`;
        })
        .join("\n  ");
    })
    .join("\n  ");

  // Data-stream bars: 24 small horizontal bars laid out in a row, each with
  // its own pulse animation offset by an index-based delay. The varying
  // heights are pre-computed (deterministic via i * golden ratio) so the
  // pattern looks organic without RNG.
  const BAR_COUNT = 32;
  const BAR_W = 14;
  const BAR_GAP = 4;
  const BAR_AREA_W = BAR_COUNT * BAR_W + (BAR_COUNT - 1) * BAR_GAP;
  const BAR_X0 = Math.round((W - BAR_AREA_W) / 2);
  const STREAM_MAX_H = 14;
  const STREAM_BASE_H = 3;
  const golden = 0.61803398875;

  const barsSvg = Array.from({ length: BAR_COUNT }, (_, i) => {
    const x = BAR_X0 + i * (BAR_W + BAR_GAP);
    const phase = (i * golden) % 1; // pseudo-random in [0, 1)
    const baseH = STREAM_BASE_H + Math.round(phase * STREAM_MAX_H);
    const color = i % 3 === 0 ? accent : muted;
    return `<rect class="bar b${i}" x="${x}" y="${STREAM_Y - baseH}" width="${BAR_W}" height="${baseH}" fill="${color}" fill-opacity="0.5" filter="drop-shadow(0 0 2px ${color})"/>`;
  }).join("\n  ");

  // Bar animations: each bar gets its own keyframe via individual delay so
  // the row pulses like a spectrum analyzer.
  const barAnimations = Array.from({ length: BAR_COUNT }, (_, i) => {
    const delay = ((i * golden * loopDuration) % loopDuration).toFixed(2);
    return `.b${i} { animation: barPulse ${DUR} ease-in-out infinite; animation-delay: -${delay}s; }`;
  }).join("\n    ");

  // Animations follow `loopText`. When ON, decorative effects play (top
  // hairline flash, status dot pulse, scanline drift, spectrum-analyzer
  // bars). When OFF, everything renders statically.
  //
  // Note: header text / tagline / pill / socials NEVER fade to opacity 0.
  // Their entrance keyframes were removed. The bars and pulse dot provide
  // the "alive" feel; the readable text holds steady the whole time.
  const css = loopText
    ? `
    .stream-line { animation: streamFlash ${DUR} ease-in-out infinite; }
    .status-dot { animation: statusPulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .scan { animation: scanDrift ${DUR} linear infinite; }
    ${barAnimations}

    @keyframes barPulse {
      0%, 100% { transform: scaleY(0.4); transform-box: fill-box; transform-origin: bottom; }
      50% { transform: scaleY(1.4); transform-box: fill-box; transform-origin: bottom; }
    }
    @keyframes streamFlash {
      0%, 100% { stroke-opacity: 0.5; }
      50% { stroke-opacity: 0.9; }
    }
    @keyframes statusPulse {
      0%, 70%, 100% { opacity: 1; transform: scale(1); }
      80% { opacity: 0.4; transform: scale(0.7); }
    }
    @keyframes scanDrift {
      from { transform: translateY(0); }
      to { transform: translateY(8px); }
    }
  `
    : `
    /* loopText off: everything static. Bars hold their pre-computed
       heights, dot stays at full opacity, scanlines are pinned at y=0. */
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="neon-foot-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="50%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${bg}"/>
    </linearGradient>
    <pattern id="scan-foot" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#ffffff" fill-opacity="0.025"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#neon-foot-bg)" rx="14" ry="14"/>

  <!-- Top hairline divider, glowing -->
  <line class="stream-line" x1="40" y1="6" x2="${W - 40}" y2="6" stroke="${accent}" stroke-width="1" stroke-opacity="0.6" filter="drop-shadow(0 0 4px ${accent})"/>

  <!-- Header strip: status pill on left, frame counter on right -->
  <g class="header-pill" transform="translate(40 ${HEADER_Y})">
    <rect x="-8" y="-12" width="118" height="20" rx="4" fill="${bg}" stroke="${muted}" stroke-width="1" stroke-opacity="0.6"/>
    <circle class="status-dot" cx="2" cy="-2" r="2.5" fill="${muted}" filter="drop-shadow(0 0 3px ${muted})"/>
    <text x="12" y="2" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">CONNECTED</text>
  </g>
  <text x="${W - 40}" y="${HEADER_Y + 2}" text-anchor="end" fill="${muted}" fill-opacity="0.6" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">[ ${(loopDuration).toFixed(0)}s LOOP // EOF ]</text>

  <!-- Big "// END_TRANSMISSION" header -->
  <text class="tx" x="${cx}" y="${TX_Y}" text-anchor="middle" fill="${fg}" font-family="ui-monospace, monospace" font-size="20" font-weight="700" letter-spacing="2" filter="drop-shadow(0 0 6px ${accent})">${escapeXml(headerText)}</text>

  <!-- Tagline / sign-off subline -->
  <text class="tag-line" x="${cx}" y="${TAG_Y}" text-anchor="middle" fill="${muted}" font-family="ui-monospace, monospace" font-size="${tagSize}" letter-spacing="1">${escapeXml(tagText)}</text>

  <!-- Socials row, alternating cyan/magenta -->
  ${socialsSvg}

  <!-- Data-stream bars (spectrum-analyzer style) -->
  ${barsSvg}

  <!-- Bottom watermark, very faint -->
  <text x="${W - 18}" y="${H - 8}" text-anchor="end" fill="${muted}" fill-opacity="0.35" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1">// MADE WITH RYME.MD</text>

  <!-- Scanlines overlay -->
  <g class="scan">
    <rect width="${W}" height="${H + 8}" fill="url(#scan-foot)" pointer-events="none"/>
  </g>
</svg>`;
}

const template: SvgTemplate = {
  id: "neon-footer",
  name: "Neon Transmission",
  description:
    "// END_TRANSMISSION sign-off with status pill, neon socials, and a pulsing data-stream spectrum.",
  kind: "svg",
  category: "footer",
  family: "neon",
  width: 800,
  height: 180,
  duration: 6,
  fields: ["name", "tagline", "socials"],
  renderSvg,
};

export default template;
