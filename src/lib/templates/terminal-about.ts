import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitUniformFontSize, wrapByChars } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 320;
  const PAD_X = 40;
  const TOP = 68;
  const LINE_H = 22;
  const DUR = `${loopDuration}s`;

  const promptColor = theme.accent;
  const fg = theme.fg;
  const dim = theme.muted;

  // Body width less the prompt prefix. The whole template renders at one
  // uniform font size so the heading, bio, and tag line stay visually
  // consistent.
  const ROW_MAX_W = W - PAD_X * 2 - 22;

  const name = info.name || "you";
  const tags: string[] = [];
  if (info.role) tags.push(info.role);
  if (info.org) tags.push(info.org);
  if (info.location) tags.push(info.location);

  // Determine the uniform font size needed by the heading and tag line (the
  // two single-line variable composites). Bio is multi-line and uses
  // wrapByChars at the chosen size's char budget.
  const headingText = `Hi, I'm ${name}`;
  const tagLine = tags.length ? tags.map((t) => `[ ${t} ]`).join("  ") : "";
  const fit = fitUniformFontSize(
    [headingText, tagLine].filter(Boolean) as string[],
    ROW_MAX_W,
    [14, 13, 12, 11],
    "mono",
  );
  const FONT_SIZE = fit.size;
  const fittedHeading = fit.texts[0];
  const fittedTagLine = tagLine ? fit.texts[fit.texts.length - 1] : "";

  // Bio wrap budget scales with font size: at smaller sizes we can fit more
  // chars per line. ~8.4 px/char @ 14px mono → fontSize * 0.6 px/char.
  const bioCharsPerLine = Math.floor(ROW_MAX_W / (FONT_SIZE * 0.6));
  const bioLines = wrapByChars(info.bio || info.tagline || "-", bioCharsPerLine, 4);

  // Build all rows in render order. Each row has its own keyframe.
  type Row = { svg: string };
  const rows: Row[] = [];

  // Row 0: $ cat ~/about.md
  rows.push({
    svg:
      `<g transform="translate(${PAD_X} ${TOP})">` +
      `<text fill="${promptColor}">$</text>` +
      `<text x="20" fill="${fg}">cat ~/about.md</text>` +
      `</g>`,
  });

  // (blank row 1)
  // Row 2: # Hi, I'm {name} - rendered at the fitted FONT_SIZE.
  let y = TOP + LINE_H * 2;
  rows.push({
    svg:
      `<g transform="translate(${PAD_X} ${y})">` +
      `<text fill="${dim}"># </text>` +
      `<text x="22" fill="${fg}">${escapeXml(fittedHeading)}</text>` +
      `</g>`,
  });

  // Bio lines
  for (const line of bioLines) {
    y += LINE_H;
    rows.push({
      svg:
        `<g transform="translate(${PAD_X} ${y})">` +
        `<text fill="${promptColor}">&gt;</text>` +
        `<text x="20" fill="${fg}">${escapeXml(line)}</text>` +
        `</g>`,
    });
  }

  // (blank row)
  y += LINE_H * 2;

  // # tags row
  if (tags.length) {
    rows.push({
      svg:
        `<g transform="translate(${PAD_X} ${y})">` +
        `<text fill="${dim}"># </text>` +
        `<text x="22" fill="${fg}">tags</text>` +
        `</g>`,
    });
    y += LINE_H;

    // Inline pill-ish tag list rendered at the fitted FONT_SIZE.
    rows.push({
      svg:
        `<g transform="translate(${PAD_X} ${y})">` +
        `<text fill="${dim}">${escapeXml(fittedTagLine)}</text>` +
        `</g>`,
    });
    y += LINE_H;
  }

  // Final ready prompt
  y += LINE_H;
  const readyIdx = rows.length;
  rows.push({
    svg:
      `<g transform="translate(${PAD_X} ${y})">` +
      `<text fill="${promptColor}">$</text>` +
      `<rect x="20" y="-7" width="9" height="14" fill="${fg}" style="animation: blink 1s steps(1) infinite" />` +
      `</g>`,
  });

  // Build keyframes per row and inject class
  const keyframes: string[] = [];
  const rowStyles: string[] = [];
  // When loopText is off, skip text fade-in entirely so the SVG renders with
  // text already on screen at frame 0. The cursor keeps blinking either way.
  const animatedRows = rows.map((r, i) => {
    if (!loopText) {
      // Render row as-is, no animation class.
      return r.svg;
    }
    const start = i * 4;
    const visStart = start + 2;
    const visEnd = 88;
    const fadeOut = 95;
    keyframes.push(
      `@keyframes ln${i} { 0%,${start}% { opacity: 0 } ${visStart}%,${visEnd}% { opacity: 1 } ${fadeOut}%,100% { opacity: 0 } }`,
    );
    rowStyles.push(
      `.ln${i} { animation: ln${i} ${DUR} ease-in-out infinite }`,
    );
    return r.svg.replace("<g ", `<g class="ln${i}" `);
  });

  const cursorKey = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;
  void readyIdx; // silence unused warning if added later

  const css = `
    text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: ${FONT_SIZE}px; dominant-baseline: middle; }
    ${keyframes.join("\n    ")}
    ${cursorKey}
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
  <text x="${W / 2}" y="28" fill="${dim}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle">~ / about.md</text>
  ${animatedRows.join("\n  ")}
</svg>`;
}

const template: SvgTemplate = {
  id: "terminal-about",
  name: "Terminal Cat",
  description:
    "$ cat ~/about.md - your bio rendered in a fake mac terminal, pure SVG.",
  kind: "svg",
  category: "about",
  family: "terminal",
  width: 800,
  height: 320,
  duration: 12,
  fields: ["name", "role", "org", "location", "bio", "tagline"],
  renderSvg,
};

export default template;
