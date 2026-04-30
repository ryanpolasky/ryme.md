import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize, truncateToWidth } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Small drafting registration mark (cross). */
function regMark(cx: number, cy: number, len: number, color: string): string {
  return `<g>
    <line x1="${cx - len}" y1="${cy}" x2="${cx + len}" y2="${cy}" stroke="${color}" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - len}" x2="${cx}" y2="${cy + len}" stroke="${color}" stroke-width="1"/>
  </g>`;
}

const W = 800;
const PAD = 24;
const COLS = 2;
const COL_GAP = 18;
const HEADER_H = 18;
const ROW_H = 18;
const TITLE_STRIP_H = 20;
// Extra breathing space between the column-header underline and the first
// row's baseline so the first part doesn't crowd the rule above it.
const HEADER_TO_FIRST_ROW = 18;

function computeLayout(info: ProfileInfo) {
  const skills = info.skills.filter(Boolean);

  // The sheet wraps inside PAD; the table area starts below the title strip.
  const sheetW = W - PAD * 2;
  const tableW = sheetW - 24;
  const colW = Math.floor((tableW - COL_GAP * (COLS - 1)) / COLS);

  // Per-column inner geometry. With the TYPE column dropped, the
  // designation column gets the freed width.
  const refColW = 36;
  const desigColW = colW - refColW - 8; // 8 px right gutter

  // 2-column row count: how many rows in the *taller* column.
  const rowsTall = Math.ceil(skills.length / COLS);

  // Auto-size designation labels uniformly so all rows render at the same
  // font size.
  const desigSizes = [12, 11, 10, 9];
  const labels = skills.map((s) => s.toUpperCase());
  const fit = fitUniformFontSize(labels, desigColW, desigSizes, "mono");
  const desigSize = fit.size;
  const desigLabels = fit.texts;

  // Total height: title strip + breathing space + table header + rows +
  // bottom strip + sheet padding.
  const TOP_PAD = 8;          // sheetY = PAD + TOP_PAD
  const TITLE_TO_TABLE = 18;  // gap between title strip bottom and table top
  const BOTTOM_STRIP = 24;    // height of the drafted credit area
  const minTableRows = 1;     // never collapse the table to 0 rows
  const renderRows = Math.max(minTableRows, rowsTall);
  const tableH =
    HEADER_H + (HEADER_TO_FIRST_ROW - 12) + renderRows * ROW_H + 14;
  const sheetH = TOP_PAD + TITLE_STRIP_H + TITLE_TO_TABLE + tableH + BOTTOM_STRIP;
  const H = PAD * 2 + sheetH;

  return {
    W,
    H,
    sheetW,
    sheetH,
    tableW,
    colW,
    refColW,
    desigColW,
    desigSize,
    desigLabels,
    skills,
    rowsTall,
    renderRows,
    TOP_PAD,
    TITLE_TO_TABLE,
    BOTTOM_STRIP,
  };
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  // Blueprint is calm: no text-fade animation. Args kept for shape parity.
  void loopDuration;
  void options;

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  const {
    H,
    sheetH,
    tableW,
    colW,
    refColW,
    desigSize,
    desigLabels,
    skills,
    rowsTall,
    renderRows,
    TOP_PAD,
    TITLE_TO_TABLE,
    BOTTOM_STRIP,
  } = computeLayout(info);

  const sheetX = PAD;
  const sheetY = PAD;
  const sheetRight = sheetX + (W - PAD * 2);
  const sheetBottom = sheetY + sheetH;
  void sheetH;

  const titleStripY = sheetY + TOP_PAD;
  const tableX = sheetX + 12;
  const tableY = titleStripY + TITLE_STRIP_H + TITLE_TO_TABLE;
  const tableBottom = sheetBottom - BOTTOM_STRIP;
  void tableBottom;

  // Per-column origin xs.
  const cols = Array.from({ length: COLS }, (_, c) => ({
    x: tableX + c * (colW + COL_GAP),
    rows: [] as { idx: number; text: string }[],
  }));
  // Distribute skills column-major: first half down column 1, second half
  // down column 2. This reads top-down per column rather than left-right
  // per row, which matches an engineering parts list.
  for (let i = 0; i < skills.length; i++) {
    const c = i < rowsTall ? 0 : 1;
    cols[c].rows.push({ idx: i, text: desigLabels[i] });
  }

  // Header row SVG per column (REF | DESIGNATION).
  const headersSvg = cols
    .map(({ x }) => {
      const refLx = x + 6;
      const desigLx = x + refColW;
      return `<g>
    <text x="${refLx}" y="${tableY + 12}" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.4">REF</text>
    <text x="${desigLx}" y="${tableY + 12}" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.4">DESIGNATION</text>
    <line x1="${x}" y1="${tableY + HEADER_H}" x2="${x + colW}" y2="${tableY + HEADER_H}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.55"/>
  </g>`;
    })
    .join("\n  ");

  // Body rows SVG per column.
  const bodySvg = cols
    .map(({ x, rows }) => {
      return rows
        .map(({ idx, text }, rowI) => {
          const y = tableY + HEADER_H + HEADER_TO_FIRST_ROW + rowI * ROW_H;
          const refNum = String(idx + 1).padStart(2, "0");
          const refLx = x + 6;
          const desigLx = x + refColW;
          // Left-edge tick mark (accent), drafting flair.
          return `<g>
        <line x1="${x - 6}" y1="${y - 4}" x2="${x - 2}" y2="${y - 4}" stroke="${accent}" stroke-width="1" stroke-opacity="0.7"/>
        <text x="${refLx}" y="${y}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1">${refNum}</text>
        <text x="${desigLx}" y="${y}" fill="${fg}" font-family="ui-monospace, monospace" font-size="${desigSize}" letter-spacing="0.8">${escapeXml(text)}</text>
      </g>`;
        })
        .join("\n      ");
    })
    .join("\n  ");

  const emptySvg =
    skills.length === 0
      ? `<text x="${tableX + tableW / 2}" y="${tableY + HEADER_H + 28}" fill="${muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.2" text-anchor="middle">— NO PARTS ON FILE —</text>`
      : "";

  const titleLabel = truncateToWidth(
    "PARTS LIST — DEVELOPMENT STACK",
    (W - PAD * 2) - 220,
    11,
    "mono",
  );

  // Suppress unused warning on rowsTall (already consumed via cols).
  void rowsTall;
  void renderRows;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="bp-skills-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="${bg}"/>
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${muted}" stroke-width="0.4" stroke-opacity="0.18"/>
    </pattern>
  </defs>

  <!-- Cyanotype paper -->
  <rect width="100%" height="100%" fill="${bg}" rx="14" ry="14"/>
  <rect width="100%" height="100%" fill="url(#bp-skills-grid)" rx="14" ry="14"/>

  <!-- Sheet border + corner registration marks -->
  <rect x="${sheetX}" y="${sheetY}" width="${W - PAD * 2}" height="${sheetH}" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.35"/>
  ${regMark(sheetX, sheetY, 6, accent)}
  ${regMark(sheetRight, sheetY, 6, accent)}
  ${regMark(sheetX, sheetBottom, 6, accent)}
  ${regMark(sheetRight, sheetBottom, 6, accent)}

  <!-- Title strip -->
  <line x1="${sheetX + 8}" y1="${titleStripY + TITLE_STRIP_H}" x2="${sheetRight - 8}" y2="${titleStripY + TITLE_STRIP_H}" stroke="${muted}" stroke-width="0.6" stroke-opacity="0.55"/>
  <text x="${sheetX + 14}" y="${titleStripY + 14}" fill="${fg}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2.2">${escapeXml(titleLabel)}</text>
  <text x="${sheetRight - 14}" y="${titleStripY + 14}" text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.4">SHEET 02 · QTY ${skills.length.toString().padStart(2, "0")}</text>

  <!-- BOM table -->
  ${headersSvg}
  ${bodySvg}
  ${emptySvg}

  <!-- Bottom drafting credit line -->
  <line x1="${sheetX + 8}" y1="${sheetBottom - 14}" x2="${sheetRight - 8}" y2="${sheetBottom - 14}" stroke="${muted}" stroke-width="0.4" stroke-opacity="0.4"/>
  <text x="${sheetX + 14}" y="${sheetBottom - 4}" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2">DRAFTED ON RYME.MD</text>
</svg>`;
}

const template: SvgTemplate = {
  id: "blueprint-skills",
  name: "Blueprint Parts List",
  description:
    "Engineering bill-of-materials: cyanotype paper, dimensioned table, REF / DESIGNATION columns. Sheet grows to fit every part.",
  kind: "svg",
  category: "skills",
  family: "blueprint",
  width: 800,
  height: 240,
  duration: 4,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
