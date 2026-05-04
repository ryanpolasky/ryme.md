import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import {
  compactNumber,
  contributionTotal,
  displayHandle,
  escapeXml,
  languageBuckets,
  statCards,
} from "./github-stats-utils";

/** L-shaped corner bracket primitive (matches neon-about). */
function cornerBracket(
  x: number,
  y: number,
  size: number,
  thickness: number,
  color: string,
  flipX: boolean,
  flipY: boolean,
): string {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">
    <rect x="0" y="0" width="${size}" height="${thickness}" fill="${color}" filter="drop-shadow(0 0 4px ${color})"/>
    <rect x="0" y="0" width="${thickness}" height="${size}" fill="${color}" filter="drop-shadow(0 0 4px ${color})"/>
  </g>`;
}

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

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  const stats = info.githubStats;
  const handle = displayHandle(info);
  const cards = statCards(stats);
  const langs = languageBuckets(stats);

  // --- Frame geometry (matches neon-about) ---
  const FRAME_X = PAD;
  const FRAME_Y = 28;
  const FRAME_W = W - PAD * 2;
  const FRAME_H = H - 50;
  const frameRight = FRAME_X + FRAME_W;
  const frameBottom = FRAME_Y + FRAME_H;
  const titleY = FRAME_Y + 22;
  const statusY = frameBottom - 16;

  // --- Stat tiles: 4 across, neon outlined, alternating cyan/magenta ---
  const TILE_GAP = 14;
  const TILES_X = FRAME_X + 18;
  const TILES_W = FRAME_W - 36;
  const TILE_W = (TILES_W - TILE_GAP * 3) / 4;
  const TILE_H = 96;
  const TILES_Y = FRAME_Y + 56;

  const tilesSvg = cards
    .map((c, i) => {
      const x = TILES_X + i * (TILE_W + TILE_GAP);
      const stroke = i % 2 === 0 ? accent : muted;
      return `<g class="tile t${i}">
      <rect x="${x}" y="${TILES_Y}" width="${TILE_W}" height="${TILE_H}" rx="8" fill="${bg}" fill-opacity="0.5" stroke="${stroke}" stroke-width="1" filter="drop-shadow(0 0 6px ${stroke})"/>
      <text x="${x + 14}" y="${TILES_Y + 22}" fill="${stroke}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${escapeXml(c.label.toUpperCase())}</text>
      <text x="${x + 14}" y="${TILES_Y + 64}" fill="${fg}" font-family='"Inter", system-ui, sans-serif' font-size="32" font-weight="700" letter-spacing="-0.5">${escapeXml(c.value)}</text>
      <text x="${x + 14}" y="${TILES_Y + 84}" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2">${escapeXml(c.hint.toUpperCase())}</text>
    </g>`;
    })
    .join("\n  ");

  // --- Language chips: neon-outlined pills, centered below the tiles ---
  const CHIPS_Y = TILES_Y + TILE_H + 30;
  const CHIP_H = 28;
  // generous side padding so the chip border doesn't crowd the label,
  // even at smaller font sizes when many languages are present.
  const CHIP_PAD = 18;
  const CHIP_GAP = 12;
  const CHIP_FONT = 12;
  const chipItems = langs.length
    ? langs.slice(0, 4)
    : [{ name: "load github", percentage: 0, color: muted }];
  const chips = chipItems.map((l, i) => {
    const label = `${l.name.toUpperCase()} ${l.percentage ? `${l.percentage.toFixed(0)}%` : ""}`.trim();
    const w = label.length * (CHIP_FONT * 0.6) + CHIP_PAD * 2;
    return {
      text: label,
      w,
      stroke: l.color || (i % 2 === 0 ? accent : muted),
    };
  });
  const chipsTotalW =
    chips.reduce((sum, c) => sum + c.w, 0) +
    Math.max(0, chips.length - 1) * CHIP_GAP;
  let chipX = Math.round((W - chipsTotalW) / 2);
  const chipsSvg = chips
    .map((c, i) => {
      const x = chipX;
      chipX += c.w + CHIP_GAP;
      return `<g class="chip c${i}">
      <rect x="${x}" y="${CHIPS_Y - CHIP_H / 2}" width="${c.w}" height="${CHIP_H}" rx="${CHIP_H / 2}" fill="${bg}" fill-opacity="0.6" stroke="${c.stroke}" stroke-width="1" filter="drop-shadow(0 0 4px ${c.stroke})"/>
      <text x="${x + c.w / 2}" y="${CHIPS_Y + 4}" text-anchor="middle" fill="${c.stroke}" font-family="ui-monospace, monospace" font-size="${CHIP_FONT}" letter-spacing="1.5">${escapeXml(c.text)}</text>
    </g>`;
    })
    .join("\n  ");

  // --- CSS / animation (matches neon-about: no fade-out for content) ---
  const css = loopText
    ? `
    .corner { animation: cornerPulse ${DUR} ease-in-out infinite; }
    .frame { animation: framePulse ${DUR} ease-in-out infinite; }
    .status-dot { animation: statusPulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .scan { animation: scanDrift ${DUR} linear infinite; }
    .tile { animation: tileFlicker ${DUR} ease-in-out infinite; }
    ${cards.map((_, i) => `.t${i} { animation-delay: ${i * 0.1}s }`).join("\n    ")}

    @keyframes cornerPulse {
      0%, 100% { opacity: 0.85; }
      50% { opacity: 1; }
    }
    @keyframes framePulse {
      0%, 100% { stroke-opacity: 0.35; }
      50% { stroke-opacity: 0.6; }
    }
    @keyframes statusPulse {
      0%, 70%, 100% { opacity: 1; transform: scale(1); }
      80% { opacity: 0.4; transform: scale(0.7); }
    }
    @keyframes scanDrift {
      from { transform: translateY(0); }
      to { transform: translateY(8px); }
    }
    @keyframes tileFlicker {
      0%, 90%, 100% { opacity: 1; }
      94% { opacity: 0.6; }
    }
  `
    : `
    /* loopText off: everything static. */
  `;

  // Corner brackets at each frame corner
  const BR = 14;
  const BT = 2;
  const corners = [
    cornerBracket(FRAME_X, FRAME_Y, BR, BT, accent, false, false),
    cornerBracket(frameRight, FRAME_Y, BR, BT, accent, true, false),
    cornerBracket(FRAME_X, frameBottom, BR, BT, accent, false, true),
    cornerBracket(frameRight, frameBottom, BR, BT, accent, true, true),
  ].join("\n  ");

  const totalContribs = contributionTotal(stats);
  void compactNumber;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="neon-stats-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.1"/>
    </linearGradient>
    <pattern id="scan-stats" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#ffffff" fill-opacity="0.025"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#neon-stats-bg)" rx="14" ry="14"/>

  <!-- Holographic frame: dashed neon border with corner brackets layered on top -->
  <g class="frame">
    <rect x="${FRAME_X}" y="${FRAME_Y}" width="${FRAME_W}" height="${FRAME_H}" rx="6" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.45" stroke-dasharray="4 6"/>
  </g>
  <g class="corner">
    ${corners}
  </g>

  <!-- Title (upper-left) and frame index (upper-right) -->
  <text x="${FRAME_X + 14}" y="${titleY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2.5">// GITHUB.STATS</text>
  <text x="${frameRight - 14}" y="${titleY}" text-anchor="end" fill="${muted}" fill-opacity="0.6" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">[ FRAME // 04:7C ]</text>

  <!-- Stat tiles -->
  ${tilesSvg}

  <!-- Language chips -->
  ${chipsSvg}

  <!-- Bottom strip: handle on left, status dot on right -->
  <text x="${FRAME_X + 14}" y="${statusY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">@${escapeXml(handle.toUpperCase())}  ·  ${escapeXml(totalContribs)} CONTRIBS</text>
  <g transform="translate(${frameRight - 14} ${statusY})">
    <text x="-12" y="3" text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">STATUS: ENGAGED</text>
    <circle class="status-dot" cx="-4" cy="0" r="3" fill="${accent}" filter="drop-shadow(0 0 5px ${accent})"/>
  </g>

  <!-- Scanlines overlay -->
  <g class="scan">
    <rect width="${W}" height="${H + 8}" fill="url(#scan-stats)" pointer-events="none"/>
  </g>
</svg>`;
}

const template: SvgTemplate = {
  id: "neon-github-stats",
  name: "Neon Holo-Telemetry",
  description:
    "Holographic frame with neon-outlined stat tiles, language chips, and a STATUS: ENGAGED indicator.",
  kind: "svg",
  category: "stats",
  family: "neon",
  width: 800,
  height: 320,
  duration: 10,
  fields: ["github"],
  renderSvg,
};

export default template;
