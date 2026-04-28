import type { ProfileInfo, SvgTemplate, TemplateTheme } from "../types";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function socialsLine(info: ProfileInfo): string {
  const live = info.socials.filter((s) => s.value.trim());
  if (!live.length) return "—";
  return live.map((s) => s.kind).join(" · ");
}

function buildLines(info: ProfileInfo): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [
    { label: "name", value: info.name || "—" },
    { label: "role", value: info.role || "—" },
  ];
  if (info.org) lines.push({ label: "org", value: info.org });
  if (info.location) lines.push({ label: "location", value: info.location });
  if (info.tagline) lines.push({ label: "tagline", value: info.tagline });
  lines.push({ label: "links", value: socialsLine(info) });
  return lines;
}

function renderSvg(info: ProfileInfo, theme: TemplateTheme): string {
  const W = 800;
  const H = 300;
  const PAD_X = 40;
  const TOP = 56;
  const LINE_H = 22;
  const LABEL_X = PAD_X + 20;
  const VALUE_X = LABEL_X + 110;

  const lines = buildLines(info);
  // Layout: prompt + blank + N data lines + blank + ready prompt + cursor
  // Stagger: each row appears ~0.24s after previous, total cycle 6s
  const totalRows = 1 + 1 + lines.length + 1 + 1; // header, blank, lines, blank, ready
  // Build keyframes per row
  const keyframes: string[] = [];
  const rowStyles: string[] = [];
  for (let i = 0; i < totalRows; i++) {
    const start = Math.max(0, i * 4); // 4% per row stagger
    const visStart = start + 3;
    const visEnd = 88;
    const fadeOut = 95;
    keyframes.push(
      `@keyframes ln${i} { 0%,${start}% { opacity: 0 } ${visStart}%,${visEnd}% { opacity: 1 } ${fadeOut}%,100% { opacity: 0 } }`,
    );
    rowStyles.push(`.ln${i} { animation: ln${i} 6s ease-in-out infinite }`);
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

  // Rows 2..2+lines.length-1: data lines
  let rowIdx = 2;
  let y = TOP + LINE_H * 2;
  for (const ln of lines) {
    rows.push(
      `<g class="ln${rowIdx}" transform="translate(${LABEL_X} ${y})">` +
        `<text fill="${dimColor}">[</text>` +
        `<text x="6" fill="${promptColor}">→</text>` +
        `<text x="20" fill="${dimColor}">]</text>` +
        `<text x="40" fill="${labelColor}">${escapeXml(ln.label)}</text>` +
        `<text x="${VALUE_X - LABEL_X}" fill="${valueColor}">${escapeXml(ln.value)}</text>` +
        `</g>`,
    );
    rowIdx++;
    y += LINE_H;
  }

  // Skip a row index for the blank, then ready prompt
  const readyIdx = rowIdx + 1;
  const readyY = y + LINE_H;
  rows.push(
    `<g class="ln${readyIdx}" transform="translate(${PAD_X} ${readyY})">` +
      `<text fill="${promptColor}">$</text>` +
      `<text x="20" fill="${valueColor}">ready</text>` +
      `<rect x="78" y="-12" width="9" height="14" fill="${valueColor}" style="animation: blink 1s steps(1) infinite" />` +
      `</g>`,
  );

  const css = `
    text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 14px; dominant-baseline: middle; }
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
  id: "terminal-boot",
  name: "Terminal Boot",
  description:
    "Mac-window terminal that reveals your identity field by field, then waits at a blinking prompt. Pure animated SVG, ships as a tiny file.",
  kind: "svg",
  category: "header",
  width: 800,
  height: 300,
  duration: 6,
  defaultTheme: {
    bg: "#0a0a0b",
    fg: "#e7e7ea",
    accent: "#4ade80",
    muted: "#5a5a64",
  },
  renderSvg,
};

export default template;
