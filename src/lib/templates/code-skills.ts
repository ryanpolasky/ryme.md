import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// VS Code Dark+ syntax colors. The accent color in family defaults is the
// keyword blue; everything else is fixed for tokenizer clarity.
const STRING_COLOR = "#ce9178";
const PUNCT_COLOR = "#d4d4d4";

type CodeLine =
  | { kind: "decl" } // `const stack = [`
  | { kind: "item"; value: string; trailing: boolean }
  | { kind: "close" }; // `] as const;`

const TITLE_H = 30;
const TAB_H = 32;
const SIDEBAR_W = 156;
const GUTTER_W = 38;
const RIGHT_PAD = 16;

function buildLines(skills: string[]): CodeLine[] {
  const lines: CodeLine[] = [];
  lines.push({ kind: "decl" });
  skills.forEach((s, i) => {
    lines.push({
      kind: "item",
      value: s,
      trailing: i < skills.length - 1,
    });
  });
  lines.push({ kind: "close" });
  return lines;
}

function codeLineToString(ln: CodeLine): string {
  switch (ln.kind) {
    case "decl":
      return "const stack = [";
    case "item":
      return `  "${ln.value}",`;
    case "close":
      return "] as const;";
  }
}

/**
 * Pure layout. Used for both `renderSvg` height and `intrinsicHeight`. The
 * editor body grows linearly with the number of array items: more skills =
 * taller window.
 */
function computeLayout(info: ProfileInfo) {
  const W = 800;
  const editorX = SIDEBAR_W;
  const editorBodyW = W - editorX - GUTTER_W - RIGHT_PAD;

  const skills = info.skills.filter(Boolean);
  const codeLines = buildLines(skills);
  const rawLines = codeLines.map(codeLineToString);

  const fitInfo = fitUniformFontSize(
    rawLines,
    editorBodyW,
    [14, 13, 12, 11],
    "mono",
  );
  const FONT_SIZE = fitInfo.size;
  const LINE_H = Math.max(20, Math.round(FONT_SIZE * 1.55));
  const lineCount = codeLines.length;

  // Editor padding (top + bottom) gives the code breathing room. Minimum
  // body height keeps short stacks (1-2 items) from looking cramped.
  const TOP_PAD = 18;
  const BOTTOM_PAD = 22;
  const blockH = lineCount * LINE_H;
  const minBodyH = Math.max(blockH + TOP_PAD + BOTTOM_PAD, 120);
  const editorTop = TITLE_H + TAB_H;
  const H = editorTop + minBodyH;

  return {
    W,
    H,
    editorTop,
    editorX,
    editorBodyW,
    FONT_SIZE,
    LINE_H,
    codeLines,
    skills,
    TOP_PAD,
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
    editorTop,
    editorX,
    FONT_SIZE,
    LINE_H,
    codeLines,
    TOP_PAD,
  } = computeLayout(info);

  const cw = FONT_SIZE * 0.6;
  const editorContentX = editorX + GUTTER_W;
  const editorH = H - editorTop;
  const lineCount = codeLines.length;

  // Top-anchored layout (no vertical centering -- the panel grows downward
  // as content is added, which keeps the chrome stable across edits).
  const firstLineY = editorTop + TOP_PAD + Math.round(FONT_SIZE * 0.85);

  const rendered = codeLines.map((ln) => {
    if (ln.kind === "decl") {
      return (
        `<text x="0" fill="${theme.accent}" font-weight="600">const</text>` +
        `<text x="${cw * 6}" fill="${theme.fg}">stack</text>` +
        `<text x="${cw * 12}" fill="${PUNCT_COLOR}">=</text>` +
        `<text x="${cw * 14}" fill="${PUNCT_COLOR}">[</text>`
      );
    }
    if (ln.kind === "close") {
      return (
        `<text x="0" fill="${PUNCT_COLOR}">]</text>` +
        `<text x="${cw * 2}" fill="${theme.accent}" font-weight="600">as</text>` +
        `<text x="${cw * 5}" fill="${theme.accent}" font-weight="600">const</text>` +
        `<text x="${cw * 10}" fill="${PUNCT_COLOR}">;</text>`
      );
    }
    // item
    const indent = cw * 2;
    const quoted = `"${ln.value}"`;
    return (
      `<text x="${indent}" fill="${STRING_COLOR}">${escapeXml(quoted)}</text>` +
      (ln.trailing
        ? `<text x="${indent + quoted.length * cw}" fill="${PUNCT_COLOR}">,</text>`
        : "")
    );
  });

  // Per-line stagger keyframes when loopText is on.
  const cursorKf = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;
  let lineKfs = "";
  let lineRules = "";
  if (loopText) {
    const kfs: string[] = [];
    const rules: string[] = [];
    const stagger = lineCount > 1 ? Math.min(4, 60 / Math.max(1, lineCount - 1)) : 0;
    for (let i = 0; i < lineCount; i++) {
      const start = Math.round(i * stagger);
      const visStart = start + 2;
      const visEnd = 90;
      const fadeOut = 96;
      kfs.push(
        `@keyframes cl${i} { 0%,${start}% { opacity: 0 } ${visStart}%,${visEnd}% { opacity: 1 } ${fadeOut}%,100% { opacity: 0 } }`,
      );
      rules.push(`.cl${i} { animation: cl${i} ${DUR} ease-in-out infinite }`);
    }
    lineKfs = kfs.join("\n    ");
    lineRules = rules.join("\n    ");
  }

  const css = `
    text { font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; font-size: ${FONT_SIZE}px; dominant-baseline: middle; }
    ${lineKfs}
    ${cursorKf}
    ${lineRules}
  `;

  // Theme-derived chrome
  const chromeBg = lightenHex(theme.bg, 0.06);
  const sidebarBg = lightenHex(theme.bg, 0.03);
  const tabActiveBg = theme.bg;
  const tabBorder = lightenHex(theme.bg, 0.1);

  const editorLines = rendered
    .map((spans, i) => {
      const y = firstLineY + i * LINE_H;
      const lineNo = i + 1;
      return `<g class="cl${i}">
    <text x="${editorX + GUTTER_W - 10}" y="${y}" fill="${theme.muted}" text-anchor="end" font-size="${Math.max(11, FONT_SIZE - 2)}">${lineNo}</text>
    ${spans ? `<g transform="translate(${editorContentX} ${y})">${spans}</g>` : ""}
  </g>`;
    })
    .join("\n  ");

  const lastIdx = lineCount - 1;
  const cursorChars = codeLineToString(codeLines[lastIdx]).length;
  const cursorY =
    firstLineY + lastIdx * LINE_H - Math.round(FONT_SIZE * 0.85);

  // Sidebar files -- shared list across code-* templates so a 4-section
  // stack reads as one consistent project.
  const sidebarFiles = ["profile.json", "README.md", "stack.ts", "footer.md"];
  const activeIdx = 2; // skills -> stack.ts
  const sidebarItems = sidebarFiles
    .map((name, i) => {
      const y = editorTop + 38 + i * 22;
      const isActive = i === activeIdx;
      const fill = isActive ? theme.fg : theme.muted;
      const highlight = isActive
        ? `<rect x="0" y="${y - 14}" width="${SIDEBAR_W}" height="22" fill="${theme.fg}" fill-opacity="0.06"/>`
        : "";
      return `${highlight}<text x="20" y="${y}" fill="${fill}" font-size="12" dominant-baseline="middle">${escapeXml(name)}</text>`;
    })
    .join("\n  ");

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
  <text x="${W / 2}" y="${TITLE_H / 2 + 1}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle" dominant-baseline="middle">stack.ts</text>

  <!-- Tab bar -->
  <rect x="0" y="${TITLE_H}" width="${W}" height="${TAB_H}" fill="${chromeBg}"/>
  <rect x="0" y="${TITLE_H}" width="${SIDEBAR_W}" height="${TAB_H}" fill="${sidebarBg}"/>
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="${TAB_H}" fill="${tabActiveBg}"/>
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="2" fill="${theme.accent}"/>
  <text x="${SIDEBAR_W + 16}" y="${TITLE_H + TAB_H / 2}" fill="${theme.fg}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">stack.ts</text>
  <text x="${SIDEBAR_W + 144}" y="${TITLE_H + TAB_H / 2}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">×</text>

  <!-- Sidebar -->
  <rect x="0" y="${editorTop}" width="${SIDEBAR_W}" height="${editorH}" fill="${sidebarBg}"/>
  <text x="20" y="${editorTop + 12}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2" dominant-baseline="middle">EXPLORER</text>
  ${sidebarItems}
  <line x1="${SIDEBAR_W}" y1="${editorTop}" x2="${SIDEBAR_W}" y2="${H}" stroke="${tabBorder}" stroke-width="1"/>

  <!-- Editor body -->
  ${editorLines}

  <!-- Blinking cursor at end of last line -->
  <rect x="${editorContentX + cursorChars * cw}" y="${cursorY}" width="2" height="${Math.round(FONT_SIZE * 1.2)}" fill="${theme.fg}" style="animation: blink 1s steps(1) infinite"/>
</svg>`;
}

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

const template: SvgTemplate = {
  id: "code-skills",
  name: "Code Stack",
  description:
    "VS Code window showing stack.ts -- your skills as a syntax-highlighted const tuple. Window grows line by line as your stack grows.",
  kind: "svg",
  category: "skills",
  family: "code",
  width: 800,
  height: 240,
  duration: 12,
  fields: ["skills"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
