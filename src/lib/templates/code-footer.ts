import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { socialIconSvg } from "../social-icons";
import { fitUniformFontSize } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const SUCCESS_COLOR = "#4ade80";
const PUNCT_COLOR = "#d4d4d4";

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 200;
  const DUR = `${loopDuration}s`;

  const PANEL_HEADER_H = 32;
  const STATUS_H = 28;
  const PAD_X = 24;

  // Cap at 4 socials so the output panel doesn't grow past the footer height.
  // Anything beyond gets dropped silently (most users have 2-3 anyway).
  const SOCIAL_LIMIT = 4;
  const socials = info.socials
    .filter((s) => s.value.trim())
    .slice(0, SOCIAL_LIMIT);
  const name = info.name || "you";

  // Body where output lines render. Status bar sits at the bottom; panel
  // header sits at the top.
  const bodyTop = PANEL_HEADER_H;
  const bodyBottom = H - STATUS_H;
  const bodyH = bodyBottom - bodyTop;

  // Compose the output lines as raw strings for measurement.
  // Format: command-style lines that look like build output
  //   $ git push origin main
  //   ✓ pushed - github.com/your-handle
  //   → linkedin.com/in/...
  //   ...etc
  const cmdHeader = `$ ${name} --connect`;
  const successLine = `✓ Build successful (${socials.length} link${socials.length === 1 ? "" : "s"} found)`;

  // Build raw text strings used for sizing. Each social row reserves space
  // for an icon + small gap + value text.
  const ICON_W = 12;
  const ICON_GAP = 6;
  const socialLineRaw = (s: { kind: string; value: string }) =>
    `   ${"".padEnd(0)}→ ${s.value}`;
  const rawLines = [cmdHeader, successLine, ...socials.map(socialLineRaw)];

  const ROW_BUDGET = W - PAD_X * 2;
  const fitInfo = fitUniformFontSize(
    rawLines,
    ROW_BUDGET,
    [13, 12, 11],
    "mono",
  );
  const FONT_SIZE = fitInfo.size;
  const cw = FONT_SIZE * 0.6;
  const LINE_H = Math.max(18, Math.round(FONT_SIZE * 1.65));

  // Vertically center the output block in the body.
  const totalLines = rawLines.length;
  const blockH = totalLines * LINE_H;
  const firstLineY =
    bodyTop +
    Math.max(8, Math.round((bodyH - blockH) / 2)) +
    Math.round(FONT_SIZE * 0.85);

  // Render rows. Index 0 = command, 1 = success, 2..= socials.
  type Row = { svg: string };
  const rows: Row[] = [];

  rows.push({
    svg:
      `<text x="0" fill="${theme.accent}">$</text>` +
      `<text x="${cw * 2}" fill="${theme.fg}">${escapeXml(`${name} --connect`)}</text>`,
  });

  rows.push({
    svg:
      `<text x="0" fill="${SUCCESS_COLOR}">✓</text>` +
      `<text x="${cw * 2}" fill="${theme.muted}">${escapeXml(successLine.slice(2))}</text>`,
  });

  socials.forEach((s) => {
    // Indent 3, then icon, then small gap, then arrow + value.
    const indentX = cw * 3;
    const iconX = indentX;
    const valueX = iconX + ICON_W + ICON_GAP;
    rows.push({
      svg:
        `<g transform="translate(${iconX} ${-ICON_W / 2})">${socialIconSvg(s.kind, ICON_W, theme.muted)}</g>` +
        `<text x="${valueX}" fill="${PUNCT_COLOR}">→</text>` +
        `<text x="${valueX + cw * 2}" fill="${theme.fg}">${escapeXml(s.value)}</text>`,
    });
  });

  // Animations
  const cursorKf = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;
  let lineKfs = "";
  let lineRules = "";
  if (loopText) {
    const kfs: string[] = [];
    const rules: string[] = [];
    for (let i = 0; i < totalLines; i++) {
      const start = Math.max(0, i * 6);
      const visStart = start + 3;
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

  // Theme-derived chrome shades
  const panelBg = lightenHex(theme.bg, 0.04);
  const statusBg = theme.accent;
  const statusFg = textOn(theme.accent);
  const tabBorder = lightenHex(theme.bg, 0.1);

  // Panel header pills (Terminal / Output / Problems / Debug Console). Active
  // = "OUTPUT".
  const pills = [
    { label: "PROBLEMS", active: false },
    { label: "OUTPUT", active: true },
    { label: "DEBUG", active: false },
    { label: "TERMINAL", active: false },
  ];
  let pillX = PAD_X;
  const pillSegs = pills.map((p) => {
    const w = p.label.length * 6.5 + 14;
    const seg = `<g transform="translate(${pillX} ${PANEL_HEADER_H / 2})">
      <text x="0" y="0" fill="${p.active ? theme.fg : theme.muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.2" dominant-baseline="middle">${p.label}</text>
      ${p.active ? `<rect x="-4" y="${PANEL_HEADER_H / 2 - 1}" width="${w}" height="2" fill="${theme.accent}"/>` : ""}
    </g>`;
    pillX += w + 14;
    return seg;
  }).join("\n  ");

  const editorLines = rows
    .map((r, i) => {
      const y = firstLineY + i * LINE_H;
      return `<g class="cl${i}" transform="translate(${PAD_X} ${y})">${r.svg}</g>`;
    })
    .join("\n  ");

  // Cursor on the last social line (or the success line if no socials)
  const cursorRow = totalLines - 1;
  const cursorX = (() => {
    if (socials.length === 0) {
      // After successLine
      return PAD_X + (successLine.length) * cw;
    }
    const last = socials[socials.length - 1];
    return (
      PAD_X +
      cw * 3 +
      ICON_W +
      ICON_GAP +
      cw * 2 +
      last.value.length * cw
    );
  })();
  const cursorY =
    firstLineY + cursorRow * LINE_H - Math.round(FONT_SIZE * 0.85);

  // Suppress fitInfo unused warning
  void fitInfo;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>

  <!-- Panel header -->
  <rect x="0" y="0" width="${W}" height="${PANEL_HEADER_H}" fill="${panelBg}" rx="14" ry="14"/>
  <rect x="0" y="${PANEL_HEADER_H - 14}" width="${W}" height="14" fill="${panelBg}"/>
  <line x1="0" y1="${PANEL_HEADER_H}" x2="${W}" y2="${PANEL_HEADER_H}" stroke="${tabBorder}" stroke-width="1"/>
  ${pillSegs}

  <!-- Output body -->
  ${editorLines}

  <!-- Blinking cursor -->
  <rect x="${cursorX}" y="${cursorY}" width="2" height="${Math.round(FONT_SIZE * 1.2)}" fill="${theme.fg}" style="animation: blink 1s steps(1) infinite"/>

  <!-- Status bar -->
  <rect x="0" y="${H - STATUS_H}" width="${W}" height="${STATUS_H}" fill="${statusBg}"/>
  <rect x="0" y="${H - STATUS_H}" width="${W}" height="${STATUS_H}" fill="${statusBg}" rx="14" ry="14"/>
  <rect x="0" y="${H - STATUS_H}" width="${W}" height="14" fill="${statusBg}"/>
  <g fill="${statusFg}" font-family="ui-monospace, monospace" font-size="11">
    <text x="${PAD_X}" y="${H - STATUS_H / 2 + 1}" dominant-baseline="middle">⎇ main</text>
    <text x="${PAD_X + 64}" y="${H - STATUS_H / 2 + 1}" dominant-baseline="middle" opacity="0.85">⊘ 0   ⚠ 0</text>
    <text x="${W - PAD_X}" y="${H - STATUS_H / 2 + 1}" dominant-baseline="middle" text-anchor="end">UTF-8 · LF · Markdown</text>
  </g>
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

/** Pick black or white as the high-contrast text color for `bg`. */
function textOn(bg: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(bg.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Relative luminance approximation
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#0a0a0b" : "#ffffff";
}

const template: SvgTemplate = {
  id: "code-footer",
  name: "Code Status Bar",
  description:
    "VS Code output panel + status bar. Socials render as command output lines under a `--connect` build, with a tinted status bar at the bottom.",
  kind: "svg",
  category: "footer",
  family: "code",
  width: 800,
  height: 200,
  duration: 10,
  fields: ["name", "socials"],
  renderSvg,
};

export default template;
