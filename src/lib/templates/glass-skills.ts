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
} from "../chip-layout";
import {
  GLASS_TEXT,
  escapeXml,
  glassBackground,
  glassCard,
  glassDefs,
  glassFrame,
  glassStyles,
} from "../glass-svg-shared";

/**
 * Glass Stack -- skills SVG.
 *
 * Heading + sub-line + an unbounded chip rail. The card grows in height
 * to accommodate every skill in `info.skills`; sibling consumers
 * (Preview img sizing, the editor's render-area, /api/render) read the
 * effective height through `intrinsicHeight`, which calls into the same
 * `computeLayout` used by `renderSvg`. Both paths must agree exactly.
 */

const W = 800;
const PAD = 30;
const HEADING_TOP = 50;
const SUB_TOP = 70;
const ROWS_TOP = 92;
const PILL_GAP = 8;
const ROW_GAP = 8;

function computeLayout(info: ProfileInfo) {
  const skills = info.skills.filter(Boolean);
  const cardW = W - PAD * 2;
  const cardInnerW = cardW - 64;

  const sizes = [13, 12, 11, 10, 9];
  const chipPad = (s: number) => Math.max(8, Math.round(s * 0.85));

  const pillSize = fitChipFontSize(
    skills,
    cardInnerW,
    PILL_GAP,
    chipPad,
    sizes,
    Number.MAX_SAFE_INTEGER,
    "mono",
  );
  const PILL_HEIGHT = Math.max(20, Math.round(pillSize * 1.95));
  const widths = skills.map((s) =>
    chipWidth(s, pillSize, chipPad(pillSize), "mono"),
  );
  const { rows } = packChipsIntoRows(
    widths,
    cardInnerW,
    PILL_GAP,
    Number.MAX_SAFE_INTEGER,
  );

  const rowCount = Math.max(0, rows.length);
  const blockH =
    rowCount === 0 ? 0 : rowCount * PILL_HEIGHT + (rowCount - 1) * ROW_GAP;

  const HEADING_AREA = ROWS_TOP - 28;
  const BOTTOM_INNER_PAD = 30;
  const cardH = Math.max(
    140,
    HEADING_AREA + 28 + blockH + BOTTOM_INNER_PAD,
  );
  const H = cardH + PAD * 2;

  return {
    H,
    cardW,
    cardInnerW,
    pillSize,
    PILL_HEIGHT,
    widths,
    rows,
    skills,
    chipPad: chipPad(pillSize),
  };
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const layout = computeLayout(info);
  const { H, cardW, pillSize, PILL_HEIGHT, widths, rows, skills, chipPad } =
    layout;

  const cardX = PAD;
  const cardY = PAD;
  const cardH = H - PAD * 2;
  const innerX = cardX + 32;

  // ---- Heading + sub-line --------------------------------------------------
  const headingNode = `<text x="${innerX}" y="${cardY + HEADING_TOP}" fill="${GLASS_TEXT}" font-family='"Inter", system-ui, sans-serif' font-size="28" font-weight="700">Stack</text>`;

  const sub =
    skills.length === 0
      ? "No skills yet."
      : `${skills.length} ${skills.length === 1 ? "tool" : "tools"} I reach for`;
  const subNode = `<text x="${innerX}" y="${cardY + SUB_TOP}" fill="${GLASS_TEXT}" opacity="0.55" font-family='"Inter", system-ui, sans-serif' font-size="13" font-weight="400">${escapeXml(sub)}</text>`;

  // ---- Chips ---------------------------------------------------------------
  let chipNodes = "";
  if (skills.length) {
    const radius = PILL_HEIGHT / 2;
    const parts: string[] = [];
    for (let rowI = 0; rowI < rows.length; rowI++) {
      const idxs = rows[rowI];
      const yTop = cardY + ROWS_TOP + rowI * (PILL_HEIGHT + ROW_GAP);
      let xCursor = innerX;
      for (const i of idxs) {
        const w = widths[i];
        // Vertical centering: the canvas version aligned the baseline at
        // yTop + PILL_HEIGHT/2 + pillSize/3. We replicate the same offset
        // so chip text reads at the optical center of the pill.
        const textY = yTop + PILL_HEIGHT / 2 + pillSize / 3;
        parts.push(
          `<rect x="${xCursor}" y="${yTop}" width="${w}" height="${PILL_HEIGHT}" rx="${radius}" ry="${radius}" fill="${theme.accent}" fill-opacity="0.18" stroke="${theme.accent}" stroke-opacity="0.5" stroke-width="1"/>`,
          `<text x="${xCursor + chipPad}" y="${textY}" fill="${GLASS_TEXT}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="${pillSize}" font-weight="500">${escapeXml(skills[i])}</text>`,
        );
        xCursor += w + PILL_GAP;
      }
    }
    chipNodes = parts.join("\n  ");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${glassStyles(loopDuration, loopText)}</style>
  <defs>${glassDefs(theme)}</defs>
  ${glassBackground(W, H, theme)}
  ${glassCard(cardX, cardY, cardW, cardH, 18)}
  ${headingNode}
  ${subNode}
  ${chipNodes}
  ${glassFrame(W, H, 14)}
</svg>`;
}

const template: SvgTemplate = {
  id: "glass-skills",
  name: "Glass Stack",
  description:
    "Glass card with frosted pill tags. The card grows in height to fit every tool you list.",
  kind: "svg",
  category: "skills",
  family: "glass",
  width: 800,
  height: 240,
  duration: 10,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
