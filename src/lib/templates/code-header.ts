import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize } from "../text-utils";
import { resolveCodeSidebar } from "./code-shared";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// VS Code-style syntax colors. The accent color theme variable controls the
// JSON property color (keys); strings, comments, and punctuation are kept on
// fixed Dark+ palette values so the editor reads correctly regardless of
// what accent the user picks.
const STRING_COLOR = "#ce9178";
const PUNCT_COLOR = "#d4d4d4";

type JsonField = { key: string; value: string };

function buildFields(info: ProfileInfo): JsonField[] {
  const fields: JsonField[] = [];
  fields.push({ key: "name", value: info.name || "Your Name" });
  if (info.role) fields.push({ key: "role", value: info.role });
  if (info.org) fields.push({ key: "org", value: info.org });
  if (info.location) fields.push({ key: "location", value: info.location });
  if (info.tagline) fields.push({ key: "tagline", value: info.tagline });
  return fields;
}

/**
 * Build a single line of the JSON object as positioned `<text>` segments,
 * using mono char width to advance x. `cw` is the per-character width at
 * the current font size.
 */
function renderJsonLine(
  field: JsonField,
  hasComma: boolean,
  cw: number,
  keyColor: string,
): { svg: string; lineLength: number } {
  // Layout: 2 chars indent | "key" | : | space | "value" | comma?
  const segs: string[] = [];
  let xc = 2; // indent
  const keyText = `"${field.key}"`;
  segs.push(
    `<text x="${xc * cw}" fill="${keyColor}">${escapeXml(keyText)}</text>`,
  );
  xc += keyText.length;
  segs.push(
    `<text x="${xc * cw}" fill="${PUNCT_COLOR}">:</text>`,
  );
  xc += 2; // colon + space
  const valueText = `"${field.value}"`;
  segs.push(
    `<text x="${xc * cw}" fill="${STRING_COLOR}">${escapeXml(valueText)}</text>`,
  );
  xc += valueText.length;
  if (hasComma) {
    segs.push(
      `<text x="${xc * cw}" fill="${PUNCT_COLOR}">,</text>`,
    );
    xc += 1;
  }
  return { svg: segs.join(""), lineLength: xc };
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 300;
  const DUR = `${loopDuration}s`;

  // Window chrome heights
  const TITLE_H = 30;
  const TAB_H = 32;

  // Editor zone
  const SIDEBAR_W = 156;
  const GUTTER_W = 38;
  const editorTop = TITLE_H + TAB_H;
  const editorH = H - editorTop;
  const editorX = SIDEBAR_W;
  const editorContentX = editorX + GUTTER_W;

  // Lines: open brace, fields, close brace
  const fields = buildFields(info);
  const lineCount = 1 /* { */ + fields.length + 1 /* } */;

  // Width budget for the longest JSON line (in chars) at the chosen font size.
  // Editor body width: W - SIDEBAR_W - GUTTER_W - small right padding.
  const RIGHT_PAD = 16;
  const editorBodyW = W - editorX - GUTTER_W - RIGHT_PAD;

  // Build raw line-strings for measurement (so fitUniformFontSize can pick the
  // largest size at which every line fits horizontally).
  const rawLines: string[] = ["{"];
  fields.forEach((f, i) => {
    const comma = i < fields.length - 1 ? "," : "";
    rawLines.push(`  "${f.key}": "${f.value}"${comma}`);
  });
  rawLines.push("}");

  const fitInfo = fitUniformFontSize(
    rawLines,
    editorBodyW,
    [14, 13, 12, 11],
    "mono",
  );
  const FONT_SIZE = fitInfo.size;
  const cw = FONT_SIZE * 0.6; // mono em width
  const LINE_H = Math.max(20, Math.round(FONT_SIZE * 1.55));

  // Vertically place the JSON block inside the editor zone. The chrome
  // (title + tab bars) at the top adds visual weight, so a true centered
  // layout leaves an empty band below the close brace. Bias the placement
  // downward by EXTRA_TOP so the JSON visually balances against the chrome
  // and the bottom feels less padded.
  const EXTRA_TOP = 16;
  const blockH = lineCount * LINE_H;
  const editorPaddingY = Math.max(
    12,
    Math.round((editorH - blockH) / 2) + EXTRA_TOP,
  );
  const firstLineY = editorTop + editorPaddingY + Math.round(FONT_SIZE * 0.85);

  // Rebuild fields from the (possibly truncated) raw lines so values that
  // were trimmed at min size render correctly. We rebuild by parsing — but
  // since fitUniformFontSize only truncates at min size, in practice rawLines
  // matches what we want unless inputs are truly absurd. To stay robust,
  // re-derive fields' values from the trimmed raw lines.
  const fittedFields: JsonField[] = fields.map((f, i) => {
    const trimmed = fitInfo.texts[i + 1]; // skip "{"
    // Extract value between : "..." pattern. If it doesn't parse cleanly
    // (truncation may have cut quotes), fall back to original.
    const m = /^\s*"[^"]*":\s*"([^"]*)"?,?\s*$/.exec(trimmed);
    return { key: f.key, value: m ? m[1] : f.value };
  });

  // Build editor lines as SVG groups, each with class `.cl${i}` for animation.
  type Line = { svg: string; cssClass: string };
  const lines: Line[] = [];
  // Open brace
  lines.push({
    svg: `<text x="0" fill="${PUNCT_COLOR}">{</text>`,
    cssClass: "cl0",
  });
  // Fields
  fittedFields.forEach((f, i) => {
    const hasComma = i < fittedFields.length - 1;
    const r = renderJsonLine(f, hasComma, cw, theme.accent);
    lines.push({ svg: r.svg, cssClass: `cl${i + 1}` });
  });
  // Close brace
  lines.push({
    svg: `<text x="0" fill="${PUNCT_COLOR}">}</text>`,
    cssClass: `cl${lineCount - 1}`,
  });

  // Cursor: positioned at the end of the last *value* line (just past the
  // closing quote of the last field's value, after any comma). Looks like the
  // user just finished typing the last field.
  const lastFieldIdx = fittedFields.length - 1;
  const lastRawLine =
    lastFieldIdx >= 0 ? rawLines[lastFieldIdx + 1] : rawLines[0];
  const cursorXOffset = lastRawLine.length;
  const cursorLineIdx = lastFieldIdx >= 0 ? lastFieldIdx + 1 : 0;
  const cursorY =
    firstLineY + cursorLineIdx * LINE_H - Math.round(FONT_SIZE * 0.85);

  // Sidebar files (file tree). The active file ("profile.json") gets the
  // accent color and a subtle highlight bar.
  // sidebarTopY = first file's text-middle Y. EXPLORER label sits at
  // editorTop + 12 (text-middle) with 9px font, so its visual bottom is at
  // ~editorTop + 17. Start files at editorTop + 38 for ~16px breathing room.
  // when the editor passes the live section list via options, that list
  // drives the explorer and this template's section is marked active;
  // otherwise we fall back to the family's static roster.
  const sidebarTopY = editorTop + 38;
  const sidebarItemH = 22;
  const sidebarFontSize = 12;
  const sidebarMax = Math.max(1, Math.floor((editorH - 38) / sidebarItemH));
  const sidebarEntries = resolveCodeSidebar(options, "header", sidebarMax);
  const sidebarItems = sidebarEntries
    .map((entry, i) => {
      const y = sidebarTopY + i * sidebarItemH;
      const fill = entry.active ? theme.fg : theme.muted;
      const highlight = entry.active
        ? `<rect x="0" y="${y - 14}" width="${SIDEBAR_W}" height="${sidebarItemH}" fill="${theme.fg}" fill-opacity="0.06"/>`
        : "";
      return `${highlight}<text x="20" y="${y}" fill="${fill}" font-size="${sidebarFontSize}" dominant-baseline="middle">${escapeXml(entry.name)}</text>`;
    })
    .join("\n  ");

  // Animation CSS. When loopText is on, each JSON line fades in with a stagger
  // so it looks like the file is being typed top-to-bottom. When off, all
  // lines render statically and only the cursor blinks.
  const cursorKf = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;
  let lineKfs = "";
  let lineRules = "";
  if (loopText) {
    const kfs: string[] = [];
    const rules: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      const start = Math.max(0, i * 5);
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

  const css = `
    text { font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; font-size: ${FONT_SIZE}px; dominant-baseline: middle; }
    ${lineKfs}
    ${cursorKf}
    ${lineRules}
  `;

  // Theme-derived chrome colors. Title/tab bar uses a slightly lighter shade
  // of the bg for visual separation.
  const chromeBg = lightenHex(theme.bg, 0.06);
  const sidebarBg = lightenHex(theme.bg, 0.03);
  const tabActiveBg = theme.bg;
  const tabBorder = lightenHex(theme.bg, 0.1);

  // Editor body lines composed at firstLineY, advancing by LINE_H. Line
  // numbers in the gutter use the muted color.
  const editorLines = lines
    .map((ln, i) => {
      const y = firstLineY + i * LINE_H;
      const lineNo = i + 1;
      return `<g class="${ln.cssClass}">
    <text x="${editorX + GUTTER_W - 10}" y="${y}" fill="${theme.muted}" text-anchor="end" font-size="${Math.max(11, FONT_SIZE - 2)}">${lineNo}</text>
    <g transform="translate(${editorContentX} ${y})">${ln.svg}</g>
  </g>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <!-- Window background -->
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>

  <!-- Title bar -->
  <rect x="0" y="0" width="${W}" height="${TITLE_H}" fill="${chromeBg}" rx="14" ry="14"/>
  <rect x="0" y="${TITLE_H - 14}" width="${W}" height="14" fill="${chromeBg}"/>
  <g opacity="0.55">
    <circle cx="22" cy="${TITLE_H / 2}" r="5.5" fill="#ff5f57"/>
    <circle cx="40" cy="${TITLE_H / 2}" r="5.5" fill="#febc2e"/>
    <circle cx="58" cy="${TITLE_H / 2}" r="5.5" fill="#28c840"/>
  </g>
  <text x="${W / 2}" y="${TITLE_H / 2 + 1}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle" dominant-baseline="middle">profile.json</text>

  <!-- Tab bar -->
  <rect x="0" y="${TITLE_H}" width="${W}" height="${TAB_H}" fill="${chromeBg}"/>
  <rect x="0" y="${TITLE_H}" width="${SIDEBAR_W}" height="${TAB_H}" fill="${sidebarBg}"/>
  <!-- Active tab pill -->
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="${TAB_H}" fill="${tabActiveBg}"/>
  <rect x="${SIDEBAR_W}" y="${TITLE_H}" width="160" height="2" fill="${theme.accent}"/>
  <text x="${SIDEBAR_W + 16}" y="${TITLE_H + TAB_H / 2}" fill="${theme.fg}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">profile.json</text>
  <text x="${SIDEBAR_W + 144}" y="${TITLE_H + TAB_H / 2}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" dominant-baseline="middle">×</text>

  <!-- Sidebar -->
  <rect x="0" y="${editorTop}" width="${SIDEBAR_W}" height="${editorH}" fill="${sidebarBg}"/>
  <text x="20" y="${editorTop + 12}" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2" dominant-baseline="middle">EXPLORER</text>
  ${sidebarItems}
  <!-- Vertical divider between sidebar and editor -->
  <line x1="${SIDEBAR_W}" y1="${editorTop}" x2="${SIDEBAR_W}" y2="${H}" stroke="${tabBorder}" stroke-width="1"/>

  <!-- Editor body -->
  ${editorLines}

  <!-- Blinking cursor at end of last value line -->
  <rect x="${editorContentX + cursorXOffset * cw}" y="${cursorY}" width="2" height="${Math.round(FONT_SIZE * 1.2)}" fill="${theme.fg}" style="animation: blink 1s steps(1) infinite"/>
</svg>`;
}

/**
 * Lighten a #rrggbb hex by `amount` (0-1) toward white. Used for the chrome
 * shades. If parsing fails, returns the input unchanged.
 */
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
  id: "code-header",
  name: "Code Editor",
  description:
    "VS Code window with profile.json. JSON keys, strings, and punctuation are syntax-highlighted; lines fade in like they're being typed.",
  kind: "svg",
  category: "header",
  family: "code",
  width: 800,
  height: 300,
  duration: 12,
  fields: ["name", "role", "org", "location", "tagline"],
  renderSvg,
};

export default template;
