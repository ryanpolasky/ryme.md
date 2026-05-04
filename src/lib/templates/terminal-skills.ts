import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize } from "../text-utils";
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

const TITLE_BAR_H = 28;
const TOP = TITLE_BAR_H + 36;
const PAD_X = 40;
const ROW_GAP = 12;

function computeLayout(info: ProfileInfo) {
  const W = 800;
  const skills = info.skills.filter(Boolean);
  // Decorative bracket prefix/suffix on each chip.
  const labels = skills.map((s) => `[ ${s} ]`);
  const ROW_INNER_W = W - PAD_X * 2 - 22; // leave room for the `$ ` prompt

  // Pick the chip font size; chip "padding" here is just inter-chip spacing
  // (the brackets are part of the label string).
  const sizes = [14, 13, 12, 11, 10];
  const pillSize = fitChipFontSize(
    labels,
    ROW_INNER_W,
    /* gap */ 8,
    () => 0,
    sizes,
    Number.MAX_SAFE_INTEGER,
    "mono",
  );
  const widths = labels.map((l) => chipWidth(l, pillSize, 0, "mono"));
  const { rows } = packChipsIntoRows(
    widths,
    ROW_INNER_W,
    /* gap */ 8,
    Number.MAX_SAFE_INTEGER,
  );

  const LINE_H = Math.max(20, Math.round(pillSize * 1.65));
  const rowCount = Math.max(0, rows.length);

  // Vertical layout:
  //   TOP              -> $ which --skills
  //   TOP + LINE_H     -> $_ stdout marker
  //   TOP + 2*LINE_H+G -> first chip row (G = ROW_GAP)
  //   ...              -> chip rows
  //   then prompt line + watermark
  const HEADER_LINES = 2; // command + blank/echo line
  const headerH = HEADER_LINES * LINE_H;
  const chipsH = rowCount === 0 ? 0 : rowCount * LINE_H + (rowCount - 1) * ROW_GAP;
  // FOOTER_H must cover (a) the gap from chips to the prompt baseline (LINE_H + 8),
  // (b) the prompt line itself (LINE_H), and (c) breathing room below the cursor
  // so the blinking caret doesn't kiss the bottom edge.
  const FOOTER_BOTTOM_PAD = 28;
  const FOOTER_H = LINE_H * 2 + 8 + FOOTER_BOTTOM_PAD;
  const H = TOP + headerH + 16 + chipsH + FOOTER_H;

  return {
    W,
    H,
    LINE_H,
    pillSize,
    widths,
    rows,
    labels,
    skills,
    headerH,
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

  const {
    W,
    H,
    LINE_H,
    pillSize,
    widths,
    rows,
    labels,
    skills,
    headerH,
  } = computeLayout(info);

  const fg = theme.fg;
  const accent = theme.accent;
  const dim = theme.muted;

  // Header lines (typed-then-output style).
  const cmdLine = "which --skills";
  const cmdFit = fitUniformFontSize([cmdLine], W - PAD_X * 2 - 22, [pillSize, pillSize - 1], "mono");
  const cmdSize = cmdFit.size;
  const cmdY = TOP;
  const echoY = TOP + LINE_H;

  // Chip rows
  const chipsTop = TOP + headerH + 16;
  let chipIdx = 0;
  const chipsSvg = rows
    .map((idxs, rowI) => {
      const rowWidthsArr = idxs.map((i) => widths[i]);
      const rowW = rowWidth(rowWidthsArr, /* gap */ 8);
      const rowY = chipsTop + rowI * (LINE_H + ROW_GAP);
      let xCursor = PAD_X + 22; // align with content column past `$ `
      // If the row is shorter than the available width we just left-align.
      void rowW;
      return idxs
        .map((origI, j) => {
          const w = rowWidthsArr[j];
          const fill = (rowI + j) % 2 === 0 ? accent : fg;
          const cls = `tchip${chipIdx++}`;
          const xText = xCursor;
          const yText = rowY + LINE_H / 2 + 1;
          xCursor += w + 8;
          return `<text class="${cls}" x="${xText}" y="${yText}" fill="${fill}" font-size="${pillSize}" dominant-baseline="middle">${escapeXml(labels[origI])}</text>`;
        })
        .join("\n  ");
    })
    .join("\n  ");

  // Footer prompt + cursor
  const footerY = chipsTop + (rows.length === 0 ? 0 : rows.length * LINE_H + (rows.length - 1) * ROW_GAP) + LINE_H + 8;

  // Total chips for stagger animation
  const totalChips = rows.reduce((sum, r) => sum + r.length, 0);

  const css = loopText
    ? `
    text { font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; }
    @keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
    .cursor { animation: blink 1s steps(1) infinite }
    ${(() => {
      const stagger = totalChips > 1 ? Math.min(2.5, 30 / Math.max(1, totalChips - 1)) : 0;
      const out: string[] = [];
      for (let i = 0; i < totalChips; i++) {
        const start = Math.round(i * stagger);
        out.push(
          `@keyframes tchip${i} { 0%,${start}% { opacity: 0 } ${start + 2}%,92% { opacity: 1 } 97%,100% { opacity: 0 } }`,
        );
        out.push(`.tchip${i} { animation: tchip${i} ${DUR} ease-out infinite; }`);
      }
      return out.join("\n    ");
    })()}
  `
    : `
    text { font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; }
    @keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
    .cursor { animation: blink 1s steps(1) infinite }
  `;

  // Title bar with mac dots, mirrors terminal-about chrome.
  const titleBar = `
  <rect x="0" y="0" width="${W}" height="${TITLE_BAR_H}" fill="${theme.bg}" rx="14" ry="14"/>
  <rect x="0" y="${TITLE_BAR_H - 14}" width="${W}" height="14" fill="${theme.bg}"/>
  <line x1="0" y1="${TITLE_BAR_H}" x2="${W}" y2="${TITLE_BAR_H}" stroke="${dim}" stroke-width="0.5" stroke-opacity="0.4"/>
  <g opacity="0.55">
    <circle cx="22" cy="${TITLE_BAR_H / 2}" r="5.5" fill="#ff5f57"/>
    <circle cx="40" cy="${TITLE_BAR_H / 2}" r="5.5" fill="#febc2e"/>
    <circle cx="58" cy="${TITLE_BAR_H / 2}" r="5.5" fill="#28c840"/>
  </g>
  <text x="${W / 2}" y="${TITLE_BAR_H / 2 + 1}" fill="${dim}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle" dominant-baseline="middle">~/skills</text>`;

  const emptyMsg =
    skills.length === 0
      ? `<text x="${PAD_X + 22}" y="${chipsTop + LINE_H / 2 + 1}" fill="${dim}" font-style="italic" font-size="${pillSize}" dominant-baseline="middle">no skills on file</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>
  ${titleBar}

  <!-- Command line -->
  <text x="${PAD_X}" y="${cmdY + LINE_H / 2 + 1}" fill="${accent}" font-size="${cmdSize}" dominant-baseline="middle">$</text>
  <text x="${PAD_X + 22}" y="${cmdY + LINE_H / 2 + 1}" fill="${fg}" font-size="${cmdSize}" dominant-baseline="middle">${escapeXml(cmdFit.texts[0])}</text>

  <!-- Output marker -->
  <text x="${PAD_X}" y="${echoY + LINE_H / 2 + 1}" fill="${dim}" font-size="${cmdSize}" dominant-baseline="middle">→</text>
  <text x="${PAD_X + 22}" y="${echoY + LINE_H / 2 + 1}" fill="${dim}" font-size="${cmdSize}" dominant-baseline="middle">${skills.length} ${skills.length === 1 ? "match" : "matches"}</text>

  <!-- Chips -->
  ${chipsSvg}
  ${emptyMsg}

  <!-- Trailing prompt + cursor -->
  <text x="${PAD_X}" y="${footerY + LINE_H / 2 + 1}" fill="${accent}" font-size="${cmdSize}" dominant-baseline="middle">$</text>
  <rect class="cursor" x="${PAD_X + 22}" y="${footerY + 4}" width="${Math.round(cmdSize * 0.55)}" height="${LINE_H - 8}" fill="${fg}"/>
</svg>`;
}

const template: SvgTemplate = {
  id: "terminal-skills",
  name: "Terminal Skills",
  description:
    "Mac terminal window. `$ which --skills` echoes your stack as bracketed chips, line-by-line, with a blinking trailing cursor. Resizes to fit.",
  kind: "svg",
  category: "skills",
  family: "terminal",
  width: 800,
  height: 240,
  duration: 12,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
