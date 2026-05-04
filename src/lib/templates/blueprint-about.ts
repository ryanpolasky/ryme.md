import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { wrapByChars } from "../text-utils";
import { sheetIndexLabel } from "./blueprint-shared";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function regMark(cx: number, cy: number, len: number, color: string): string {
  return `<g>
    <line x1="${cx - len}" y1="${cy}" x2="${cx + len}" y2="${cy}" stroke="${color}" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - len}" x2="${cx}" y2="${cy + len}" stroke="${color}" stroke-width="1"/>
  </g>`;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[parts.length - 1][0]}.`.toUpperCase();
  }
  return (name.trim().slice(0, 2) || "??").toUpperCase();
}

function titleCell(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  fg: string,
  muted: string,
): string {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${muted}" stroke-width="1" stroke-opacity="0.55"/>
    <text x="${x + 8}" y="${y + 12}" fill="${muted}" font-family="ui-monospace, monospace" font-size="8" letter-spacing="1.2">${escapeXml(label)}</text>
    <text x="${x + 8}" y="${y + h - 8}" fill="${fg}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1">${escapeXml(value)}</text>
  </g>`;
}

/**
 * A bordered panel with a "label tab" notched into its top-left corner --
 * the kind of box drafting drawings use for NOTES, REVISION HISTORY, etc.
 *
 * Visually: the outer rect breaks at the top edge to leave room for the
 * tab, and a small label rect sits in that gap. We don't actually break
 * the outer stroke (would require complex paths); instead we draw the
 * tab BG over the outer stroke on the affected segment, then re-draw the
 * tab's own outline on top. Gives the same visual without the path math.
 */
function panel(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  bodySvg: string,
  bg: string,
  fg: string,
  muted: string,
): string {
  const tabW = label.length * 7 + 18;
  const tabH = 14;
  const tabX = x + 12;
  const tabY = y - tabH / 2;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
    <rect x="${tabX}" y="${tabY}" width="${tabW}" height="${tabH}" fill="${bg}" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
    <text x="${tabX + tabW / 2}" y="${tabY + 10}" text-anchor="middle" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.4">${escapeXml(label)}</text>
    ${bodySvg}
  </g>`;
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const sheetLabel = sheetIndexLabel(options, "about");
  const W = 800;
  const H = 300;
  const PAD = 24;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  // --- Vertical layout ---
  // Top strip:    PAD..52
  // Drawing area: 60..228   (NOTES panel + PROPERTIES table)
  // Title block:  236..H-PAD
  const topStripY = PAD + 16;
  const drawingTop = 64;
  const drawingBottom = 228;
  const drawingH = drawingBottom - drawingTop;
  const titleBlockY = 236;
  const titleBlockH = H - PAD - titleBlockY;

  // --- Horizontal split: notes on the left (~58%), properties on the right ---
  const leftX = PAD + 12;
  const leftW = 432;
  const rightX = leftX + leftW + 24;
  const rightW = W - PAD - 12 - rightX;

  // --- NOTES panel: bio text wrapped to fit ---
  // Mono font, 13 px, line-height 22. Body inset 16 px from panel edges.
  // Each line is rendered as `<prefix> <body>` where the prefix ("01:",
  // "02:"...) takes ~28 px on the left; the body starts 28 px inset from
  // NOTES_INNER_X. The wrap budget MUST account for that offset or the
  // body text will spill past the panel's right border.
  const NOTES_FONT = 13;
  const NOTES_LINE_H = 22;
  const NOTES_INNER_X = leftX + 16;
  const NOTES_INNER_W = leftW - 32;
  const NOTES_PREFIX_W = 28;
  // Keep a small right-side safety gutter so text doesn't visually kiss the
  // panel border after letter-spacing. This also encourages wrapping a bit
  // earlier for better readability.
  const NOTES_RIGHT_GUTTER = 12;
  const NOTES_BODY_W = NOTES_INNER_W - NOTES_PREFIX_W - NOTES_RIGHT_GUTTER;
  // Mono char width estimate slightly widened to 0.62em so long words wrap
  // sooner and don't appear to overrun the border at render time.
  const notesMaxChars = Math.floor(NOTES_BODY_W / (NOTES_FONT * 0.62));
  // There is room for 6 lines in this panel geometry (22px line-height,
  // first baseline at +28, panel bottom at y=228). Allowing 6 avoids early
  // ellipsis when space is still available.
  const NOTES_MAX_LINES = 6;
  const bioRaw = info.bio ||
    "Documents the user's professional capacity, organizational affiliation, and operating jurisdiction. Maintained as part of the public record.";
  const bioLines = wrapByChars(bioRaw, notesMaxChars, NOTES_MAX_LINES);

  // First line baseline sits inside the panel with a comfortable top inset.
  const NOTES_TOP_INSET = 28; // distance from panel top to first baseline
  const notesFirstY = drawingTop + NOTES_TOP_INSET;

  // Each line gets a small mono "01:" "02:" prefix, rendered in muted color
  // for that "engineering log entry" feel.
  const notesBodySvg = bioLines
    .map((line, i) => {
      const y = notesFirstY + i * NOTES_LINE_H;
      const num = String(i + 1).padStart(2, "0");
      return `<g>
      <text x="${NOTES_INNER_X}" y="${y}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1">${num}</text>
      <text x="${NOTES_INNER_X + 28}" y="${y}" fill="${fg}" font-family="ui-monospace, monospace" font-size="${NOTES_FONT}" letter-spacing="0.5">${escapeXml(line)}</text>
    </g>`;
    })
    .join("\n  ");

  // --- PROPERTIES table: 4 fixed rows (ROLE / ORG / LOC / TYPE) ---
  // The table sits inside its own panel with a "PROPERTIES" tab label.
  // Row layout: each row is a horizontal strip with a label cell on the
  // left (~80 wide) and a value cell taking the remainder. A 1px hairline
  // separates rows.
  const TABLE_ROW_H = Math.floor((drawingH - 24) / 4); // 35 each at drawingH=164
  const propRows: Array<{ label: string; value: string }> = [
    { label: "ROLE", value: info.role || "—" },
    { label: "ORG", value: info.org || "—" },
    { label: "LOC", value: info.location || "—" },
    { label: "TYPE", value: "PERSON" },
  ];
  const PROP_LABEL_W = 76;
  const propBodySvg = propRows
    .map((r, i) => {
      const rowY = drawingTop + 24 + i * TABLE_ROW_H; // 24 = top inset under tab
      const ruleY = rowY + TABLE_ROW_H;
      const labelX = rightX + 12;
      const valueX = rightX + PROP_LABEL_W + 8;
      // Truncate values to keep the row from overflowing.
      const valueMax = Math.floor((rightW - PROP_LABEL_W - 24) / (12 * 0.6));
      const value =
        r.value.length > valueMax
          ? r.value.slice(0, valueMax - 1) + "…"
          : r.value;
      return `<g>
      <text x="${labelX}" y="${rowY + TABLE_ROW_H / 2 + 4}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.4">${escapeXml(r.label)}</text>
      <text x="${valueX}" y="${rowY + TABLE_ROW_H / 2 + 4}" fill="${fg}" font-family="ui-monospace, monospace" font-size="12" letter-spacing="1">${escapeXml(value.toUpperCase())}</text>
      ${
        i < propRows.length - 1
          ? `<line x1="${rightX + 8}" y1="${ruleY}" x2="${rightX + rightW - 8}" y2="${ruleY}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.4"/>`
          : ""
      }
      <line x1="${rightX + PROP_LABEL_W}" y1="${rowY}" x2="${rightX + PROP_LABEL_W}" y2="${ruleY}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.35"/>
    </g>`;
    })
    .join("\n  ");

  // --- Title block: same 5-cell strip as the header sheet ---
  const titleBlockX = PAD;
  const titleBlockW = W - PAD * 2;
  const cellW = Math.floor(titleBlockW / 5);
  const drawer = initialsFor(info.name || "");
  const titleCells = [
    { label: "DRAWN BY", value: drawer },
    { label: "DATE", value: "26.10" },
    { label: "SCALE", value: "1:1" },
    { label: "REV", value: "1.0" },
    { label: "SHEET", value: sheetLabel },
  ]
    .map((c, i) => {
      const x = titleBlockX + i * cellW;
      const w = i === 4 ? titleBlockW - cellW * 4 : cellW;
      return titleCell(x, titleBlockY, w, titleBlockH, c.label, c.value, fg, muted);
    })
    .join("\n  ");

  // --- CSS / animations (calm; same shape as header) ---
  const css = loopText
    ? `
    .live { animation: livePulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .scribe { stroke-dasharray: 240; stroke-dashoffset: 240; animation: scribeDraw ${DUR} ease-out infinite; }

    @keyframes livePulse {
      0%, 60%, 100% { opacity: 0.85; }
      70% { opacity: 0.25; }
    }
    @keyframes scribeDraw {
      0% { stroke-dashoffset: 240; }
      32%, 88% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: 240; }
    }
  `
    : `
    /* loopText off: panels render fully drawn, live tick at full opacity. */
  `;

  // --- Top strip text ---
  const topLeftLabel = "FIG. 02    BIOGRAPHICAL DATA";
  const topRightLabel = `SHEET ${sheetLabel}`;

  // Build the panel bodies first (string contents), then wrap in panel chrome.
  const notesPanel = panel(
    leftX,
    drawingTop,
    leftW,
    drawingH,
    "NOTES",
    notesBodySvg,
    bg,
    fg,
    muted,
  );
  const propsPanel = panel(
    rightX,
    drawingTop,
    rightW,
    drawingH,
    "PROPERTIES",
    propBodySvg,
    bg,
    fg,
    muted,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="bp-paper-2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}" stop-opacity="0.94"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </linearGradient>
    <pattern id="bp-grid-2" x="${PAD}" y="${PAD}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.22"/>
    </pattern>
    <pattern id="bp-grid-major-2" x="${PAD}" y="${PAD}" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="${muted}" stroke-width="0.75" stroke-opacity="0.32"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#bp-paper-2)" rx="4" ry="4"/>

  <!-- Grid -->
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid-2)"/>
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid-major-2)"/>

  <!-- Sheet border + corner registration marks -->
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="none" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
  ${regMark(PAD, PAD, 5, fg)}
  ${regMark(W - PAD, PAD, 5, fg)}
  ${regMark(PAD, H - PAD, 5, fg)}
  ${regMark(W - PAD, H - PAD, 5, fg)}

  <!-- Top strip -->
  <text x="${PAD + 12}" y="${topStripY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${topLeftLabel}</text>
  <g transform="translate(${W - PAD - 12} ${topStripY - 4})">
    <text text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${topRightLabel}</text>
    <circle class="live" cx="6" cy="-3" r="2" fill="${accent}" opacity="0.85"/>
  </g>
  <line x1="${PAD + 8}" y1="${topStripY + 8}" x2="${W - PAD - 8}" y2="${topStripY + 8}" stroke="${muted}" stroke-width="0.75" stroke-opacity="0.4"/>

  <!-- NOTES panel (bio) -->
  ${notesPanel}

  <!-- PROPERTIES panel (role / org / loc / type) -->
  ${propsPanel}

  <!-- Title block -->
  ${titleCells}
</svg>`;
}

const template: SvgTemplate = {
  id: "blueprint-about",
  name: "Blueprint Notes & Properties",
  description:
    "Bio rendered as numbered NOTES entries beside a PROPERTIES table; both panels share the engineering-drawing chrome.",
  kind: "svg",
  category: "about",
  family: "blueprint",
  width: 800,
  height: 300,
  duration: 8,
  fields: ["bio", "role", "org", "location"],
  renderSvg,
};

export default template;
