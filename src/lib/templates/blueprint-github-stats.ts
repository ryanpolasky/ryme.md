import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { sheetIndexLabel } from "./blueprint-shared";
import {
  contributionTotal,
  displayHandle,
  escapeXml,
  fullNumber,
  languageBuckets,
  statCards,
} from "./github-stats-utils";

function regMark(cx: number, cy: number, len: number, color: string): string {
  return `<g>
    <line x1="${cx - len}" y1="${cy}" x2="${cx + len}" y2="${cy}" stroke="${color}" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - len}" x2="${cx}" y2="${cy + len}" stroke="${color}" stroke-width="1"/>
  </g>`;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[parts.length - 1][0]}.`.toUpperCase();
  }
  return (name.trim().slice(0, 2) || "??").toUpperCase();
}

function titleCell(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  fg: string,
  muted: string,
): string {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${muted}" stroke-width="1" stroke-opacity="0.55"/>
    <text x="${x + 8}" y="${y + 12}" fill="${muted}" font-family="ui-monospace, monospace" font-size="8" letter-spacing="1.2">${escapeXml(label)}</text>
    <text x="${x + 8}" y="${y + h - 8}" fill="${fg}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1">${escapeXml(value)}</text>
  </g>`;
}

/**
 * Bordered panel with a "label tab" notched into the top-left corner --
 * the kind drafting drawings use for NOTES, REVISION HISTORY, etc.
 * Mirrors the helper from blueprint-about / blueprint-footer.
 */
function panel(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  bodySvg: string,
  bg: string,
  fg: string,
  muted: string,
): string {
  const tabW = label.length * 7 + 18;
  const tabH = 14;
  const tabX = x + 12;
  const tabY = y - tabH / 2;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
    <rect x="${tabX}" y="${tabY}" width="${tabW}" height="${tabH}" fill="${bg}" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
    <text x="${tabX + tabW / 2}" y="${tabY + 10}" text-anchor="middle" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.4">${escapeXml(label)}</text>
    ${bodySvg}
  </g>`;
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const sheetLabel = sheetIndexLabel(options, "stats");
  const W = 800;
  const H = 320;
  const PAD = 24;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  const stats = info.githubStats;
  const handle = displayHandle(info);
  const cards = statCards(stats);
  const langs = languageBuckets(stats);

  // ----- Vertical layout (same band structure as blueprint-about/footer) -----
  // Top strip:    PAD..52
  // Drawing area: 64..240   (ACTIVITY left + MATERIALS right)
  // Title block:  248..H-PAD
  const topStripY = PAD + 16;
  const drawingTop = 64;
  const drawingBottom = 240;
  const drawingH = drawingBottom - drawingTop;
  const titleBlockY = 252;
  const titleBlockH = H - PAD - titleBlockY;

  // Horizontal split: ACTIVITY ~58%, MATERIALS ~38%
  const leftX = PAD + 12;
  const leftW = 432;
  const rightX = leftX + leftW + 24;
  const rightW = W - PAD - 12 - rightX;

  // ===== ACTIVITY panel: 4 measurement rows + a thin contribution rail =====
  // Each row reads as a drafting "dimension" entry with arrows around the value.
  const ROW_LABEL_W = 110;
  const ROW_GUTTER = 14;
  const ROW_INSET_X = leftX + 16;
  const ROW_INSET_W = leftW - 32;
  const ROW_VALUE_X = ROW_INSET_X + ROW_LABEL_W;
  const ROW_HINT_X = ROW_INSET_W + leftX - 16; // right-aligned

  const ROW_TOP = drawingTop + 26;
  const ROW_H = 22;

  const activityRows = cards
    .map((c, i) => {
      const y = ROW_TOP + i * ROW_H;
      const ruleY = y + 6;
      const isLast = i === cards.length - 1;
      return `<g>
      <text x="${ROW_INSET_X}" y="${y}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.4">${escapeXml(c.label.toUpperCase())}</text>
      <text x="${ROW_VALUE_X - ROW_GUTTER}" y="${y}" text-anchor="end" fill="${fg}" font-family="ui-monospace, monospace" font-size="13" font-weight="700" letter-spacing="0.5">${escapeXml(c.value)}</text>
      <text x="${ROW_HINT_X}" y="${y}" text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2" opacity="0.8">${escapeXml(c.hint.toUpperCase())}</text>
      ${
        !isLast
          ? `<line x1="${ROW_INSET_X}" y1="${ruleY}" x2="${leftX + ROW_INSET_W}" y2="${ruleY}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.4"/>`
          : ""
      }
    </g>`;
    })
    .join("\n  ");

  // Contribution rail at the bottom of the ACTIVITY panel.
  const RAIL_Y = drawingBottom - 30;
  const RAIL_X = ROW_INSET_X;
  const RAIL_W = ROW_INSET_W;
  const railLabel = `TOTAL CONTRIBS  ·  ${contributionTotal(stats).toUpperCase()}`;
  // 12-segment rail; filled segments scale with contribution count up to 1500.
  const total = stats?.contributionCalendar?.totalContributions ?? 0;
  const filledSegs = Math.max(0, Math.min(12, Math.round((total / 1500) * 12)));
  const SEG = 12;
  const SEG_GAP = 4;
  const segW = (RAIL_W - SEG_GAP * (SEG - 1)) / SEG;
  const railSegments = Array.from({ length: SEG })
    .map((_, i) => {
      const x = RAIL_X + i * (segW + SEG_GAP);
      const filled = i < filledSegs;
      return `<rect x="${x}" y="${RAIL_Y}" width="${segW}" height="6" rx="1" fill="${filled ? accent : muted}" fill-opacity="${filled ? 0.85 : 0.18}"/>`;
    })
    .join("\n  ");

  const activityBody = `${activityRows}
    <text x="${RAIL_X}" y="${RAIL_Y - 6}" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.4">${escapeXml(railLabel)}</text>
    ${railSegments}`;

  // ===== MATERIALS panel: top languages as a bill-of-materials table =====
  const MAT_INSET_X = rightX + 12;
  const MAT_INSET_W = rightW - 24;
  const MAT_TOP = drawingTop + 26;
  const MAT_ROW_H = 24;
  const matItems = langs.length
    ? langs.slice(0, 5)
    : [
        { name: "load github", percentage: 0, color: muted },
      ];
  const matRows = matItems
    .map((l, i) => {
      const y = MAT_TOP + i * MAT_ROW_H;
      const swatchColor = l.color || muted;
      const pct = l.percentage > 0 ? `${l.percentage.toFixed(1)}%` : "—";
      const ruleY = y + 8;
      const isLast = i === matItems.length - 1;
      return `<g>
      <rect x="${MAT_INSET_X}" y="${y - 8}" width="10" height="10" fill="${swatchColor}"/>
      <text x="${MAT_INSET_X + 18}" y="${y}" fill="${fg}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="0.8">${escapeXml(l.name.toUpperCase())}</text>
      <text x="${MAT_INSET_X + MAT_INSET_W}" y="${y}" text-anchor="end" fill="${fg}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="0.8">${escapeXml(pct)}</text>
      ${
        !isLast
          ? `<line x1="${MAT_INSET_X}" y1="${ruleY}" x2="${MAT_INSET_X + MAT_INSET_W}" y2="${ruleY}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.4"/>`
          : ""
      }
    </g>`;
    })
    .join("\n  ");

  // ===== Title block (5 cells, mirrors the rest of the blueprint family) =====
  const titleBlockX = PAD;
  const titleBlockW = W - PAD * 2;
  const cellW = Math.floor(titleBlockW / 5);
  const drawer = initialsFor(info.name || handle);
  const titleCells = [
    { label: "DRAWN BY", value: drawer },
    { label: "DATE", value: "26.10" },
    { label: "SCALE", value: "1:1" },
    { label: "REV", value: "1.0" },
    { label: "SHEET", value: sheetLabel },
  ]
    .map((c, i) => {
      const x = titleBlockX + i * cellW;
      const w = i === 4 ? titleBlockW - cellW * 4 : cellW;
      return titleCell(x, titleBlockY, w, titleBlockH, c.label, c.value, fg, muted);
    })
    .join("\n  ");

  // ===== Animations: same calm cadence as the rest of the family =====
  const css = loopText
    ? `
    .live { animation: livePulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

    @keyframes livePulse {
      0%, 60%, 100% { opacity: 0.85; }
      70% { opacity: 0.25; }
    }
  `
    : `
    /* loopText off: panels render fully drawn. */
  `;

  // Top strip text
  const topLeftLabel = `FIG. 04    GITHUB ACTIVITY  \u00B7  @${handle.toUpperCase()}`;
  const topRightLabel = `SHEET ${sheetLabel}`;

  void fullNumber; // helper exported but not needed here

  // Wrap each panel body in panel chrome.
  const activityPanel = panel(
    leftX,
    drawingTop,
    leftW,
    drawingH,
    "ACTIVITY",
    activityBody,
    bg,
    fg,
    muted,
  );
  const materialsPanel = panel(
    rightX,
    drawingTop,
    rightW,
    drawingH,
    "MATERIALS",
    matRows,
    bg,
    fg,
    muted,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="bp-paper-stats" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}" stop-opacity="0.94"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </linearGradient>
    <pattern id="bp-grid-stats" x="${PAD}" y="${PAD}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.22"/>
    </pattern>
    <pattern id="bp-grid-major-stats" x="${PAD}" y="${PAD}" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="${muted}" stroke-width="0.75" stroke-opacity="0.32"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#bp-paper-stats)" rx="4" ry="4"/>

  <!-- Grid -->
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid-stats)"/>
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid-major-stats)"/>

  <!-- Sheet border + corner registration marks -->
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="none" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
  ${regMark(PAD, PAD, 5, fg)}
  ${regMark(W - PAD, PAD, 5, fg)}
  ${regMark(PAD, H - PAD, 5, fg)}
  ${regMark(W - PAD, H - PAD, 5, fg)}

  <!-- Top strip -->
  <text x="${PAD + 12}" y="${topStripY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${escapeXml(topLeftLabel)}</text>
  <g transform="translate(${W - PAD - 12} ${topStripY - 4})">
    <text text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${topRightLabel}</text>
    <circle class="live" cx="6" cy="-3" r="2" fill="${accent}" opacity="0.85"/>
  </g>
  <line x1="${PAD + 8}" y1="${topStripY + 8}" x2="${W - PAD - 8}" y2="${topStripY + 8}" stroke="${muted}" stroke-width="0.75" stroke-opacity="0.4"/>

  <!-- ACTIVITY panel -->
  ${activityPanel}

  <!-- MATERIALS panel -->
  ${materialsPanel}

  <!-- Title block -->
  ${titleCells}
</svg>`;
}

const template: SvgTemplate = {
  id: "blueprint-github-stats",
  name: "Blueprint Activity Sheet",
  description:
    "GitHub year as a drafting sheet: ACTIVITY measurements, MATERIALS legend for languages, and a 5-cell title block.",
  kind: "svg",
  category: "stats",
  family: "blueprint",
  width: 800,
  height: 320,
  duration: 8,
  fields: ["github"],
  renderSvg,
};

export default template;
