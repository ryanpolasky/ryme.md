import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import {
  chipWidth,
  fitChipFontSize,
  packChipsIntoRows,
  rowWidth,
} from "../chip-layout";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** L-shaped corner bracket; mirrored via flipX/flipY. */
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

const W = 800;
const PAD = 48;
const FRAME_X = PAD;
const FRAME_Y = 28;
const FRAME_W = W - PAD * 2;

const PILL_ROW_W = FRAME_W - 32;
const PILL_GAP = 10;
const ROW_GAP = 12;
const PILL_PAD_X = 12;

function computeLayout(info: ProfileInfo) {
  const skills = info.skills.filter(Boolean);
  const labels = skills.map((s) => s.toUpperCase());

  // chip padding accounts for letter-spacing (~1px per char) so widths are
  // an honest measure of the rendered chip.
  const chipPad = (s: number) =>
    PILL_PAD_X + Math.max(2, Math.round(s * 0.35));

  const sizes = [13, 12, 11, 10, 9];
  const pillSize = fitChipFontSize(
    labels,
    PILL_ROW_W,
    PILL_GAP,
    chipPad,
    sizes,
    Number.MAX_SAFE_INTEGER,
    "mono",
  );
  const PILL_H = Math.max(24, Math.round(pillSize * 2.1));
  const widths = labels.map((l) => chipWidth(l, pillSize, chipPad(pillSize), "mono"));
  const { rows } = packChipsIntoRows(
    widths,
    PILL_ROW_W,
    PILL_GAP,
    Number.MAX_SAFE_INTEGER,
  );

  const rowCount = Math.max(0, rows.length);
  const blockH =
    rowCount === 0 ? 0 : rowCount * PILL_H + (rowCount - 1) * ROW_GAP;

  // Frame interior: title (top) + block (centered) + status (bottom).
  // We grow the FRAME by the block size + breathing space.
  const TITLE_AREA = 22 + 18;     // titleY + breathing room above the block
  const STATUS_AREA = 16 + 22;    // status text + breathing room below
  const MIN_INNER = 60;
  const innerH = Math.max(MIN_INNER, TITLE_AREA + blockH + STATUS_AREA);
  const FRAME_H = innerH;
  const H = FRAME_Y + FRAME_H + 22; // bottom padding outside the frame

  return {
    W,
    H,
    FRAME_H,
    pillSize,
    PILL_H,
    widths,
    rows,
    labels,
    skills,
    blockH,
  };
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent;
  const muted = theme.muted;
  const bg = theme.bg;

  const {
    H,
    FRAME_H,
    pillSize,
    PILL_H,
    widths,
    rows,
    labels,
    skills,
    blockH,
  } = computeLayout(info);

  const frameRight = FRAME_X + FRAME_W;
  const frameBottom = FRAME_Y + FRAME_H;
  const titleY = FRAME_Y + 22;
  const statusY = frameBottom - 16;

  // Center the pill block between title and status, vertically.
  const innerTop = titleY + 18;
  const innerBottom = statusY - 22;
  const innerH = innerBottom - innerTop;
  const blockTop = Math.round(innerTop + (innerH - blockH) / 2);

  let chipIdx = 0;
  const pillsSvg = rows
    .map((idxs, rowI) => {
      const rowWidthsArr = idxs.map((i) => widths[i]);
      const rowW = rowWidth(rowWidthsArr, PILL_GAP);
      let xCursor = Math.round(FRAME_X + (FRAME_W - rowW) / 2);
      const yCenter = blockTop + rowI * (PILL_H + ROW_GAP) + PILL_H / 2;
      return idxs
        .map((origI, j) => {
          const w = rowWidthsArr[j];
          const cls = `pill${chipIdx++}`;
          const stroke = (rowI + j) % 2 === 0 ? accent : muted;
          const x = xCursor;
          xCursor += w + PILL_GAP;
          return `<g class="${cls}">
        <rect x="${x}" y="${yCenter - PILL_H / 2}" width="${w}" height="${PILL_H}" rx="${PILL_H / 2}" fill="${bg}" fill-opacity="0.6" stroke="${stroke}" stroke-width="1" filter="drop-shadow(0 0 4px ${stroke})"/>
        <text x="${x + w / 2}" y="${yCenter + 4}" text-anchor="middle" fill="${stroke}" font-family="ui-monospace, monospace" font-size="${pillSize}" letter-spacing="1">${escapeXml(labels[origI])}</text>
      </g>`;
        })
        .join("\n  ");
    })
    .join("\n  ");

  const css = loopText
    ? `
    .corner { animation: cornerPulse ${DUR} ease-in-out infinite; }
    .frame { animation: framePulse ${DUR} ease-in-out infinite; }
    .status-dot { animation: statusPulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .scan { animation: scanDrift ${DUR} linear infinite; }

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
  `
    : "";

  // Corner brackets
  const BR = 14;
  const BT = 2;
  const corners = [
    cornerBracket(FRAME_X, FRAME_Y, BR, BT, accent, false, false),
    cornerBracket(frameRight, FRAME_Y, BR, BT, accent, true, false),
    cornerBracket(FRAME_X, frameBottom, BR, BT, accent, false, true),
    cornerBracket(frameRight, frameBottom, BR, BT, accent, true, true),
  ].join("\n  ");

  const titleText = "// SKILL.MATRIX";
  const emptyMsg =
    skills.length === 0
      ? `<text x="${FRAME_X + FRAME_W / 2}" y="${blockTop + PILL_H}" fill="${muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" text-anchor="middle">— NO NODES ON FILE —</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="neon-skills-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.1"/>
    </linearGradient>
    <pattern id="scan-skills" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#ffffff" fill-opacity="0.025"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#neon-skills-bg)" rx="14" ry="14"/>

  <g class="frame">
    <rect x="${FRAME_X}" y="${FRAME_Y}" width="${FRAME_W}" height="${FRAME_H}" rx="6" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.45" stroke-dasharray="4 6"/>
  </g>
  <g class="corner">
    ${corners}
  </g>

  <text x="${FRAME_X + 14}" y="${titleY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2.5">${escapeXml(titleText)}</text>
  <text x="${frameRight - 14}" y="${titleY}" text-anchor="end" fill="${muted}" fill-opacity="0.6" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">[ ${skills.length.toString().padStart(2, "0")} NODES ONLINE ]</text>

  ${pillsSvg}
  ${emptyMsg}

  <g transform="translate(${frameRight - 14} ${statusY})">
    <text x="-12" y="3" text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">STATUS: ENGAGED</text>
    <circle class="status-dot" cx="-4" cy="0" r="3" fill="${accent}" filter="drop-shadow(0 0 5px ${accent})"/>
  </g>

  <g class="scan">
    <rect width="${W}" height="${H + 8}" fill="url(#scan-skills)" pointer-events="none"/>
  </g>
  <text fill="${muted}" fill-opacity="0.4" font-family="ui-monospace, monospace" font-size="10" x="${FRAME_X + 14}" y="${statusY + 3}">// RYME.MD</text>
</svg>`;
}

const template: SvgTemplate = {
  id: "neon-skills",
  name: "Neon Skill Matrix",
  description:
    "Holo frame with corner brackets and a glowing magenta/cyan grid of skill pills. Frame grows around your stack -- no overflow.",
  kind: "svg",
  category: "skills",
  family: "neon",
  width: 800,
  height: 240,
  duration: 10,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
