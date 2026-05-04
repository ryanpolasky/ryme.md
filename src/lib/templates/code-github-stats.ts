import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize } from "../text-utils";
import {
  compactNumber,
  contributionTotal,
  displayHandle,
  escapeXml,
  languageBuckets,
} from "./github-stats-utils";
import { resolveCodeSidebar } from "./code-shared";

// VS Code Dark+ syntax colors -- matches the rest of the code-* family.
const KEY_COLOR = "#79c0ff";
const STR_COLOR = "#a5d6ff";
const NUM_COLOR = "#ffa657";
const PUNCT_COLOR = "#d4d4d4";

/** Lighten a #rrggbb hex toward white by `amount` (0-1). Mirrors code-header. */
function lightenHex(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lerp = (c: number) => Math.round(c + (255 - c) * amount);
  const out = (lerp(r) << 16) | (lerp(g) << 8) | lerp(b);
  return `#${out.toString(16).padStart(6, "0")}`;
}

// One renderable segment of a JSON line. Each segment becomes its own
// <text> element with an explicit x, so leading whitespace never gets
// collapsed by SVG's default text-rendering rules.
type Seg = { fill: string; text: string };
type Line = Seg[];

const k = (text: string): Seg => ({ fill: KEY_COLOR, text });
const s = (text: string): Seg => ({ fill: STR_COLOR, text });
const n = (text: string): Seg => ({ fill: NUM_COLOR, text });
const p = (text: string): Seg => ({ fill: PUNCT_COLOR, text });

/**
 * Build the github.json document. Returns one entry per visible line; each
 * line is the ordered segment list. The structure is intentionally compact
 * (no comment, two languages max) so it fits in a 300px-tall editor with
 * a 13px font without overflowing horizontally or vertically.
 */
function buildLines(info: ProfileInfo): Line[] {
  const stats = info.githubStats;
  const handle = displayHandle(info);
  const langs = languageBuckets(stats);
  const langArr = langs.slice(0, 2).map((l) => l.name);

  const indent2: Seg = { fill: PUNCT_COLOR, text: "  " };
  const indent4: Seg = { fill: PUNCT_COLOR, text: "    " };

  const lines: Line[] = [];
  lines.push([p("{")]);
  lines.push([indent2, k(`"user"`), p(": "), s(`"${handle}"`), p(",")]);
  lines.push([indent2, k(`"stats"`), p(": {")]);
  lines.push([
    indent4,
    k(`"repos"`),
    p(": "),
    n(compactNumber(stats?.profile.publicRepos ?? null)),
    p(","),
  ]);
  lines.push([
    indent4,
    k(`"commits"`),
    p(": "),
    n(compactNumber(stats?.totals.commitsThisYear ?? null)),
    p(","),
  ]);
  lines.push([
    indent4,
    k(`"prs"`),
    p(": "),
    n(compactNumber(stats?.totals.prsAuthored ?? null)),
    p(","),
  ]);
  lines.push([
    indent4,
    k(`"reviews"`),
    p(": "),
    n(compactNumber(stats?.totals.reviewsThisYear ?? null)),
  ]);
  lines.push([indent2, p("},")]);
  // languages: ["a", "b"]
  if (langArr.length) {
    const lang: Line = [indent2, k(`"languages"`), p(": "), p("[")];
    langArr.forEach((name, i) => {
      lang.push(s(`"${name}"`));
      if (i < langArr.length - 1) lang.push(p(", "));
    });
    lang.push(p("],"));
    lines.push(lang);
  } else {
    lines.push([indent2, k(`"languages"`), p(": "), p("[],")]);
  }
  lines.push([
    indent2,
    k(`"contributions"`),
    p(": "),
    n(contributionTotal(stats)),
  ]);
  lines.push([p("}")]);
  return lines;
}

function lineToString(line: Line): string {
  return line.map((seg) => seg.text).join("");
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  // bumped to 320 so vertical-centering leaves more breathing room beneath
  // the closing brace + cursor (300 left only ~9px of bottom pad).
  const H = 320;
  const DUR = `${loopDuration}s`;

  // Same chrome geometry as code-header / code-about so the stack reads
  // as one window when arranged together.
  const TITLE_H = 30;
  const TAB_H = 32;
  const SIDEBAR_W = 156;
  const GUTTER_W = 38;

  const editorTop = TITLE_H + TAB_H;
  const editorH = H - editorTop;
  const editorX = SIDEBAR_W;
  const editorContentX = editorX + GUTTER_W;

  const lines = buildLines(info);
  const lineCount = lines.length;

  // Pick a uniform font size that lets every line fit horizontally inside
  // the editor body. Mirrors code-header's measurement strategy.
  const RIGHT_PAD = 16;
  const editorBodyW = W - editorX - GUTTER_W - RIGHT_PAD;
  const rawLines = lines.map(lineToString);
  const fitInfo = fitUniformFontSize(
    rawLines,
    editorBodyW,
    [14, 13, 12, 11],
    "mono",
  );
  const FONT_SIZE = fitInfo.size;
  const cw = FONT_SIZE * 0.6;
  const LINE_H = Math.max(20, Math.round(FONT_SIZE * 1.55));

  // Vertically center the JSON block inside the editor zone.
  const blockH = lineCount * LINE_H;
  const editorPaddingY = Math.round((editorH - blockH) / 2);
  const firstLineY = editorTop + editorPaddingY + Math.round(FONT_SIZE * 0.85);

  // Build editor body: gutter line numbers + per-segment positioned text.
  const editorLines = lines
    .map((segs, i) => {
      const y = firstLineY + i * LINE_H;
      const lineNo = i + 1;

      let xc = 0; // running character offset inside the line
      const segSvg = segs
        .map((seg) => {
          const x = Math.round(xc * cw);
          xc += seg.text.length;
          // Trim leading whitespace for the rendered text but keep its width via x.
          // We DO want to render the spaces visually too, otherwise the punctuation
          // char that follows will sit at the wrong x. The escapeXml path emits a
          // plain-text span; SVG would normally collapse runs of whitespace, so we
          // explicitly keep the text but rely on the explicit `x` of the *next*
          // segment to rescue the line. Indent segments still emit their spaces.
          return `<text x="${x}" fill="${seg.fill}" xml:space="preserve">${escapeXml(seg.text)}</text>`;
        })
        .join("");
      return `<g class="cl${i}">
    <text x="${editorX + GUTTER_W - 10}" y="${y}" fill="${theme.muted}" text-anchor="end" font-size="${Math.max(11, FONT_SIZE - 2)}">${lineNo}</text>
    <g transform="translate(${editorContentX} ${y})">${segSvg}</g>
  </g>`;
    })
    .join("\n  ");

  // Cursor at end-of-last-line.
  const lastLine = lines[lines.length - 1];
  const cursorChars = lineToString(lastLine).length;
  const cursorY =
    firstLineY + (lineCount - 1) * LINE_H - Math.round(FONT_SIZE * 0.85);
  const cursorX = editorContentX + Math.round(cursorChars * cw);

  // Animation: matches code-header staggered fade-in.
  let lineKfs = "";
  let lineRules = "";
  if (loopText) {
    const kfs: string[] = [];
    const rules: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      const start = i * 4;
      const visStart = start + 2;
      const visEnd = 88;
      const fadeOut = 95;
      kfs.push(
        `@keyframes cl${i} { 0%,${start}% { opacity: 0 } ${visStart}%,${visEnd}% { opacity: 1 } ${fadeOut}%,100% { opacity: 0 } }`,
      );
      rules.push(`.cl${i} { animation: cl${i} ${DUR} ease-in-out infinite }`);
    }
    lineKfs = kfs.join("\n    ");
    lineRules = rules.join("\n    ");
  }
  const cursorKf = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;

  const css = `
    text { font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; font-size: ${FONT_SIZE}px; dominant-baseline: middle; }
    ${lineKfs}
    ${cursorKf}
    ${lineRules}
  `;

  // Theme-derived chrome (same lerp factors as code-header).
  const chromeBg = lightenHex(theme.bg, 0.06);
  const sidebarBg = lightenHex(theme.bg, 0.03);
  const tabActiveBg = theme.bg;
  const tabBorder = lightenHex(theme.bg, 0.1);

  // Sidebar entries -- driven by the live section list when present, else
  // the family fallback (with this template's category marked active).
  const sidebarItemH = 22;
  const sidebarMax = Math.max(1, Math.floor((editorH - 38) / sidebarItemH));
  const sidebarEntries = resolveCodeSidebar(options, "stats", sidebarMax);
  const sidebarItems = sidebarEntries
    .map((entry, i) => {
      const y = editorTop + 38 + i * sidebarItemH;
      const fill = entry.active ? theme.fg : theme.muted;
      const highlight = entry.active
        ? `<rect x="0" y="${y - 14}" width="${SIDEBAR_W}" height="${sidebarItemH}" fill="${theme.fg}" fill-opacity="0.06"/>`
        : "";
      return `${highlight}<text x="20" y="${y}" fill="${fill}" font-size="12" dominant-baseline="middle">${escapeXml(entry.name)}</text>`;
    })
    .join("\n  ");

  const accent = theme.accent;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>

  <!-- Title bar -->
  <rect x="0" y="0" width="${W}" height="${TITLE_H}" fill="${chromeBg}" rx="14" ry="14"/>
  <rect x="0" y="${TITLE_H - 14}" width="${W}" height="14" fill="${chromeBg}"/>
  <g opacity="0.55">
    <circle cx="22" cy="${TITLE_H / 2}" r="5.5" fill="#ff5f57"/>
    <circle cx="40" cy="${TITLE_H / 2}" r="5.5" fill="#febc2e"/>
    <circle cx="58" cy="${TITLE_H / 2}" r="5.5" fill="#28c840"/>
  </g>
  <text x="${W / 2}" y="${TITLE_H / 2 + 1}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle" dominant-baseline="middle">github.json</text>

  <!-- Tab bar -->
  <rect x="0" y="${TITLE_H}" width="${W}" height="${TAB_H}" fill="${chromeBg}"/>
  <rect x="0" y="${TITLE_H}" width="${SIDEBAR_W}" height="${TAB_H}" fill="${sidebarBg}"/>
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="${TAB_H}" fill="${tabActiveBg}"/>
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="2" fill="${accent}"/>
  <text x="${SIDEBAR_W + 16}" y="${TITLE_H + TAB_H / 2}" fill="${theme.fg}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">github.json</text>
  <text x="${SIDEBAR_W + 144}" y="${TITLE_H + TAB_H / 2}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">×</text>

  <!-- Sidebar -->
  <rect x="0" y="${editorTop}" width="${SIDEBAR_W}" height="${editorH}" fill="${sidebarBg}"/>
  <text x="20" y="${editorTop + 12}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2" dominant-baseline="middle">EXPLORER</text>
  ${sidebarItems}
  <line x1="${SIDEBAR_W}" y1="${editorTop}" x2="${SIDEBAR_W}" y2="${H}" stroke="${tabBorder}" stroke-width="1"/>

  <!-- Editor body -->
  ${editorLines}

  <!-- Blinking cursor at end of last line -->
  <rect x="${cursorX}" y="${cursorY}" width="2" height="${Math.round(FONT_SIZE * 1.2)}" fill="${theme.fg}" style="animation: blink 1s steps(1) infinite"/>
</svg>`;
}

const template: SvgTemplate = {
  id: "code-github-stats",
  name: "Code GitHub",
  description:
    "github.json open in a VS Code window: keys, strings, and numbers syntax-highlighted; lines fade in like they're being typed.",
  kind: "svg",
  category: "stats",
  family: "code",
  width: 800,
  height: 320,
  duration: 12,
  fields: ["github"],
  renderSvg,
};

export default template;
