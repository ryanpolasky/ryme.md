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

type Line = { label: string; value: string };

function buildLines(info: ProfileInfo): Line[] {
  // Header template intentionally omits socials - those live only in the footer.
  const lines: Line[] = [
    { label: "name", value: info.name || "-" },
    { label: "role", value: info.role || "-" },
  ];
  if (info.org) lines.push({ label: "org", value: info.org });
  if (info.location) lines.push({ label: "location", value: info.location });
  if (info.tagline) lines.push({ label: "tagline", value: info.tagline });
  return lines;
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
  const PAD_X = 40;
  const LINE_H = 22;
  const LABEL_X = PAD_X + 20;
  const VALUE_X = LABEL_X + 160;
  const DURATION = `${loopDuration}s`;

  const lines = buildLines(info);

  // All values share the same width budget, so find the largest font size
  // that lets every value fit. The whole template renders at this size for
  // visual consistency (a terminal with mixed font sizes looks busted).
  const VALUE_MAX_W = W - VALUE_X - PAD_X;
  const valueFit = fitUniformFontSize(
    lines.map((l) => l.value),
    VALUE_MAX_W,
    [14, 13, 12, 11],
    "mono",
  );
  const FONT_SIZE = valueFit.size;
  const fittedValues = valueFit.texts;

  // Layout: prompt + blank + N data lines + blank + ready prompt + cursor.
  // Vertically center the whole stack inside the area BELOW the menu chrome
  // (otherwise the first prompt line sits right under the title bar).
  const totalRows = 1 + 1 + lines.length + 1 + 1;
  const MENU_BAR_BOTTOM = 40;
  const BOTTOM_PAD = 16;
  const usableMid = (MENU_BAR_BOTTOM + (H - BOTTOM_PAD)) / 2;
  const TOP = Math.round(usableMid - ((totalRows - 1) * LINE_H) / 2);
  // When loopText is off, skip text fade-in entirely so the SVG renders with
  // text already on screen at frame 0. The cursor (separate keyframe below)
  // keeps blinking either way.
  const keyframes: string[] = [];
  const rowStyles: string[] = [];
  if (loopText) {
    for (let i = 0; i < totalRows; i++) {
      const start = Math.max(0, i * 3);
      const visStart = start + 2;
      const visEnd = 88;
      const fadeOut = 95;
      keyframes.push(
        `@keyframes ln${i} { 0%,${start}% { opacity: 0 } ${visStart}%,${visEnd}% { opacity: 1 } ${fadeOut}%,100% { opacity: 0 } }`,
      );
      rowStyles.push(
        `.ln${i} { animation: ln${i} ${DURATION} ease-in-out infinite }`,
      );
    }
  }

  // Cursor blink (always running, 1Hz)
  const cursorKeyframes = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;

  // Build text rows
  const rows: string[] = [];
  const promptColor = theme.accent;
  const labelColor = theme.muted;
  const valueColor = theme.fg;
  const dimColor = theme.muted;

  // Row 0: $ ./identity --reveal
  rows.push(
    `<g class="ln0" transform="translate(${PAD_X} ${TOP})">` +
      `<text fill="${promptColor}">$</text>` +
      `<text x="20" fill="${valueColor}">./identity --reveal</text>` +
      `</g>`,
  );

  // Row 1: blank (skip render but counted in stagger)
  // We'll just not emit anything for row 1; but we still need its keyframe (no-op visually).

  // Rows 2..2+lines.length-1: data lines. All rows share the uniform
  // FONT_SIZE computed above so visual consistency is preserved when the
  // longest value forces a smaller size.
  const VALUE_OFFSET = VALUE_X - LABEL_X;
  let rowIdx = 2;
  let y = TOP + LINE_H * 2;
  lines.forEach((ln, i) => {
    const prefix =
      `<text fill="${dimColor}">[</text>` +
      `<text x="6" fill="${promptColor}">→</text>` +
      `<text x="20" fill="${dimColor}">]</text>` +
      `<text x="40" fill="${labelColor}">${escapeXml(ln.label)}</text>`;

    rows.push(
      `<g class="ln${rowIdx}" transform="translate(${LABEL_X} ${y})">` +
        prefix +
        `<text x="${VALUE_OFFSET}" fill="${valueColor}">${escapeXml(fittedValues[i])}</text>` +
        `</g>`,
    );
    rowIdx++;
    y += LINE_H;
  });

  // Skip a row index for the blank, then ready prompt
  const readyIdx = rowIdx + 1;
  const readyY = y + LINE_H;
  rows.push(
    `<g class="ln${readyIdx}" transform="translate(${PAD_X} ${readyY})">` +
      `<text fill="${promptColor}">$</text>` +
      `<text x="20" fill="${valueColor}">ready</text>` +
      `<rect x="78" y="-7" width="9" height="14" fill="${valueColor}" style="animation: blink 1s steps(1) infinite" />` +
      `</g>`,
  );

  const css = `
    text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: ${FONT_SIZE}px; dominant-baseline: middle; }
    ${keyframes.join("\n    ")}
    ${cursorKeyframes}
    ${rowStyles.join("\n    ")}
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>
  <g opacity="0.5">
    <circle cx="24" cy="24" r="6" fill="#ff5f57"/>
    <circle cx="44" cy="24" r="6" fill="#febc2e"/>
    <circle cx="64" cy="24" r="6" fill="#28c840"/>
  </g>
  <text x="${W / 2}" y="28" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle">~ / readme</text>
  ${rows.join("\n  ")}
</svg>`;
}

const template: SvgTemplate = {
  id: "terminal-header",
  name: "Terminal Boot",
  description:
    "Mac-window terminal that reveals your identity field by field, then waits at a blinking prompt.",
  kind: "svg",
  category: "header",
  family: "terminal",
  width: 800,
  height: 300,
  duration: 12,
  fields: ["name", "role", "org", "location", "tagline"],
  renderSvg,
};

export default template;
