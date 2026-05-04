import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize, wrapByChars } from "../text-utils";
import { resolveCodeSidebar } from "./code-shared";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Markdown source-view colors. Heading hash and emphasis use the accent
// color; quote markers and list bullets use a derivative; plain text uses fg.
const QUOTE_COLOR = "#ce9178";
const PUNCT_COLOR = "#d4d4d4";

type MdLine =
  | { kind: "blank" }
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; text: string }
  | { kind: "para"; text: string };

function buildMdLines(info: ProfileInfo, maxChars: number): MdLine[] {
  const lines: MdLine[] = [];
  const name = info.name || "Your Name";
  lines.push({ kind: "h1", text: `Hi, I'm ${name}` });
  lines.push({ kind: "blank" });

  // Bio as a blockquote (each wrapped line gets its own `> ` prefix line).
  const bio = info.bio || info.tagline;
  if (bio) {
    // Quote prefix is "> " (2 chars); wrap budget shrinks accordingly.
    const wrapBudget = Math.max(20, maxChars - 2);
    const wrapped = wrapByChars(bio, wrapBudget, 3);
    for (const w of wrapped) lines.push({ kind: "quote", text: w });
    lines.push({ kind: "blank" });
  }

  const tags: string[] = [];
  if (info.role) tags.push(info.role);
  if (info.org) tags.push(info.org);
  if (info.location) tags.push(info.location);
  if (tags.length) {
    lines.push({ kind: "h2", text: "tags" });
    for (const t of tags) lines.push({ kind: "list", text: t });
  }

  return lines;
}

/** Materialize a markdown line as a raw text string (used for measurement). */
function mdLineToString(ln: MdLine): string {
  switch (ln.kind) {
    case "blank":
      return "";
    case "h1":
      return `# ${ln.text}`;
    case "h2":
      return `## ${ln.text}`;
    case "quote":
      return `> ${ln.text}`;
    case "list":
      return `- ${ln.text}`;
    case "para":
      return ln.text;
  }
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
  const DUR = `${loopDuration}s`;

  const TITLE_H = 30;
  const TAB_H = 32;
  const SIDEBAR_W = 156;
  const GUTTER_W = 38;
  const editorTop = TITLE_H + TAB_H;
  const editorH = H - editorTop;
  const editorX = SIDEBAR_W;
  const editorContentX = editorX + GUTTER_W;
  const RIGHT_PAD = 16;
  const editorBodyW = W - editorX - GUTTER_W - RIGHT_PAD;

  // Build markdown lines using a generous initial char budget; we'll re-fit
  // after measuring at the chosen font size.
  const initialMaxChars = 70;
  let mdLines = buildMdLines(info, initialMaxChars);

  // Pick the largest font size at which every line fits the editor body
  // width. After we know the size, re-wrap quote text for the actual budget.
  const rawLines = mdLines.map(mdLineToString);
  const fitInfo = fitUniformFontSize(
    rawLines,
    editorBodyW,
    [14, 13, 12, 11],
    "mono",
  );
  const FONT_SIZE = fitInfo.size;
  const cw = FONT_SIZE * 0.6;
  const LINE_H = Math.max(20, Math.round(FONT_SIZE * 1.55));

  // Re-wrap quote (bio) lines now that we know the size. At smaller sizes
  // we can fit more chars per line, which means the bio uses fewer lines.
  const charsPerLine = Math.floor(editorBodyW / cw);
  mdLines = buildMdLines(info, charsPerLine);
  const lineCount = mdLines.length;

  // Vertically center.
  const blockH = lineCount * LINE_H;
  const editorPaddingY = Math.max(
    8,
    Math.round((editorH - blockH) / 2),
  );
  const firstLineY = editorTop + editorPaddingY + Math.round(FONT_SIZE * 0.85);

  // Render each line as a positioned `<g>` with class `.cl${i}`. Hash, quote,
  // list markers are colored differently from the body text.
  type RenderedLine = { svg: string };
  const rendered: RenderedLine[] = mdLines.map((ln) => {
    if (ln.kind === "blank") return { svg: "" };
    if (ln.kind === "h1") {
      return {
        svg:
          `<text x="0" fill="${theme.accent}" font-weight="700">#</text>` +
          `<text x="${cw * 2}" fill="${theme.fg}" font-weight="700">${escapeXml(ln.text)}</text>`,
      };
    }
    if (ln.kind === "h2") {
      return {
        svg:
          `<text x="0" fill="${theme.accent}" font-weight="600">##</text>` +
          `<text x="${cw * 3}" fill="${theme.fg}" font-weight="600">${escapeXml(ln.text)}</text>`,
      };
    }
    if (ln.kind === "quote") {
      return {
        svg:
          `<text x="0" fill="${QUOTE_COLOR}">&gt;</text>` +
          `<text x="${cw * 2}" fill="${theme.fg}">${escapeXml(ln.text)}</text>`,
      };
    }
    if (ln.kind === "list") {
      return {
        svg:
          `<text x="0" fill="${PUNCT_COLOR}">-</text>` +
          `<text x="${cw * 2}" fill="${theme.fg}">${escapeXml(ln.text)}</text>`,
      };
    }
    return {
      svg: `<text x="0" fill="${theme.fg}">${escapeXml(ln.text)}</text>`,
    };
  });

  // Animations
  const cursorKf = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;
  let lineKfs = "";
  let lineRules = "";
  if (loopText) {
    const kfs: string[] = [];
    const rules: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      const start = Math.max(0, i * 4);
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

  // Editor lines
  const editorLines = rendered
    .map((ln, i) => {
      const y = firstLineY + i * LINE_H;
      const lineNo = i + 1;
      return `<g class="cl${i}">
    <text x="${editorX + GUTTER_W - 10}" y="${y}" fill="${theme.muted}" text-anchor="end" font-size="${Math.max(11, FONT_SIZE - 2)}">${lineNo}</text>
    ${ln.svg ? `<g transform="translate(${editorContentX} ${y})">${ln.svg}</g>` : ""}
  </g>`;
    })
    .join("\n  ");

  // Cursor at end of last non-blank line
  let lastNonBlankIdx = lineCount - 1;
  while (lastNonBlankIdx >= 0 && mdLines[lastNonBlankIdx].kind === "blank") {
    lastNonBlankIdx--;
  }
  const cursorChars =
    lastNonBlankIdx >= 0 ? mdLineToString(mdLines[lastNonBlankIdx]).length : 0;
  const cursorY =
    firstLineY +
    (lastNonBlankIdx >= 0 ? lastNonBlankIdx : 0) * LINE_H -
    Math.round(FONT_SIZE * 0.85);

  // Sidebar (file tree). First file's text-middle Y sits at editorTop + 38
  // so it clears the EXPLORER header above it. when the editor passes the
  // live section list via options, that list drives the explorer; otherwise
  // we fall back to the family's static roster.
  const sidebarItemH = 22;
  const sidebarMax = Math.max(1, Math.floor((editorH - 38) / sidebarItemH));
  const sidebarEntries = resolveCodeSidebar(options, "about", sidebarMax);
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

  // Suppress fitInfo unused warning - it was used for sizing.
  void fitInfo;

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
  <text x="${W / 2}" y="${TITLE_H / 2 + 1}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle" dominant-baseline="middle">README.md</text>

  <!-- Tab bar -->
  <rect x="0" y="${TITLE_H}" width="${W}" height="${TAB_H}" fill="${chromeBg}"/>
  <rect x="0" y="${TITLE_H}" width="${SIDEBAR_W}" height="${TAB_H}" fill="${sidebarBg}"/>
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="${TAB_H}" fill="${tabActiveBg}"/>
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="2" fill="${theme.accent}"/>
  <text x="${SIDEBAR_W + 16}" y="${TITLE_H + TAB_H / 2}" fill="${theme.fg}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">README.md</text>
  <text x="${SIDEBAR_W + 144}" y="${TITLE_H + TAB_H / 2}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">×</text>

  <!-- Sidebar -->
  <rect x="0" y="${editorTop}" width="${SIDEBAR_W}" height="${editorH}" fill="${sidebarBg}"/>
  <text x="20" y="${editorTop + 12}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2" dominant-baseline="middle">EXPLORER</text>
  ${sidebarItems}
  <line x1="${SIDEBAR_W}" y1="${editorTop}" x2="${SIDEBAR_W}" y2="${H}" stroke="${tabBorder}" stroke-width="1"/>

  <!-- Editor body -->
  ${editorLines}

  <!-- Blinking cursor at end of last non-blank line -->
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
  id: "code-about",
  name: "Code Markdown",
  description:
    "VS Code window with README.md source. Heading hashes, quote markers, and list bullets are syntax-highlighted; lines fade in like they're being typed.",
  kind: "svg",
  category: "about",
  family: "code",
  width: 800,
  height: 320,
  duration: 12,
  fields: ["name", "role", "org", "location", "bio", "tagline"],
  renderSvg,
};

export default template;
