import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Crosshair registration mark used at the four corners of the sheet, the
 * way real drafting paper has fiducial alignment ticks. `len` controls the
 * arm length of the cross (full length is 2 * len each direction).
 */
function regMark(cx: number, cy: number, len: number, color: string): string {
  return `<g>
    <line x1="${cx - len}" y1="${cy}" x2="${cx + len}" y2="${cy}" stroke="${color}" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - len}" x2="${cx}" y2="${cy + len}" stroke="${color}" stroke-width="1"/>
  </g>`;
}

/**
 * A "drawn-by-hand" initials string for the title block. `Jane Doe` -> `J.D.`
 * Falls back to the first 2 chars uppercased if there's no clear word break.
 */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[parts.length - 1][0]}.`.toUpperCase();
  }
  return (name.trim().slice(0, 2) || "??").toUpperCase();
}

/**
 * Single cell in the title block (lower-right of every blueprint sheet).
 * Top row is the small uppercase LABEL, bottom row is the VALUE in mono.
 */
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

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 300;
  const cx = W / 2;
  const PAD = 24;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent; // high-emphasis (dimension arrows, leader heads)
  const muted = theme.muted; // low-emphasis (grid, table rules, secondary text)
  const fg = theme.fg; // paper-white body text
  const bg = theme.bg; // blueprint cyan-blue paper

  // --- Hero name: tracked-out uppercase caps, auto-fitted ---
  // Real drafting drawings letter their titles in a heavy condensed sans
  // with wide tracking. `letter-spacing: 0.12em` approximates that look.
  // Budget leaves room on each side for the extension lines and a small
  // breathing margin from the sheet border.
  const rawName = (info.name || "Your Name").toUpperCase();
  // Keep this conservative — tracked uppercase text tends to run wider than
  // our rough estimate, and a little extra side margin avoids clipping for
  // long names.
  const NAME_BUDGET = W - PAD * 2 - 140;
  const nameFit = fitFontSize(
    rawName,
    NAME_BUDGET,
    [50, 44, 38, 32, 28, 24],
    "sans",
  );
  const name = nameFit.text;
  const nameSize = nameFit.size;
  const nameTrack = Math.max(2, Math.round(nameSize * 0.12));
  // Visual width with tracking baked in. The 0.62 multiplier is a touch
  // wider than `sans` default (0.55) because uppercase + bold runs wide.
  const nameW = Math.min(
    NAME_BUDGET,
    Math.round(name.length * nameSize * 0.62 + (name.length - 1) * nameTrack),
  );
  const nameLeft = Math.round(cx - nameW / 2);
  const nameRight = nameLeft + nameW;

  // --- Numbered callouts: up to 3 of role / org / location ---
  // Each callout has a small ring with a number plus a label to its right.
  // We render them as a single horizontal strip below the name; the strip
  // is centered as a whole. Labels truncate per-item to keep the row compact.
  const calloutItems = [
    info.role,
    info.org,
    info.location,
  ].filter(Boolean) as string[];
  const CALLOUT_FONT = 12;
  const CALLOUT_RING = 9;
  const CALLOUT_GAP = 18;
  const CALLOUT_LABEL_TRACK = 1.2;
  const CALLOUT_LABEL_PAD_R = 14;
  const calloutFitted = calloutItems.slice(0, 3).map((label, i) => {
    const fit = fitFontSize(
      label.toUpperCase(),
      140,
      [CALLOUT_FONT, 11, 10],
      "mono",
    );
    return { n: i + 1, text: fit.text, size: fit.size };
  });
  // Per-item visual width = ring (2*r + small gap) + label width.
  const calloutWidths = calloutFitted.map((c) => {
    const labelW =
      c.text.length * c.size * 0.6 +
      Math.max(0, c.text.length - 1) * CALLOUT_LABEL_TRACK +
      CALLOUT_LABEL_PAD_R;
    return CALLOUT_RING * 2 + 8 + labelW;
  });
  const calloutTotalW =
    calloutWidths.reduce((sum, w) => sum + w, 0) +
    Math.max(0, calloutFitted.length - 1) * CALLOUT_GAP;
  const calloutStartX = Math.round(cx - calloutTotalW / 2);

  // --- Layout y-positions ---
  // Sheet area:                 PAD..H-PAD       (24..276)
  //   Top strip (sheet header): PAD..52
  //   Drawing region:           60..230
  //     Dimension annotation:   ~88
  //     Name baseline:          ~150
  //     Callouts row:           ~196
  //   Title block:              236..H-PAD       (236..276, h=40)
  const topStripY = PAD + 16;
  const dimY = 84;
  const nameBaselineY = 152;
  const calloutY = 196;
  const titleBlockY = 236;
  const titleBlockH = H - PAD - titleBlockY;

  // Title block: 5 cells of equal width spanning the inner sheet width.
  const titleBlockX = PAD;
  const titleBlockW = W - PAD * 2;
  const cellW = Math.floor(titleBlockW / 5);
  const drawer = initialsFor(info.name || "");
  const titleCells = [
    { label: "DRAWN BY", value: drawer },
    { label: "DATE", value: "26.10" },
    { label: "SCALE", value: "1:1" },
    { label: "REV", value: "1.0" },
    { label: "SHEET", value: "01 / 03" },
  ]
    .map((c, i) => {
      const x = titleBlockX + i * cellW;
      // Last cell stretches to fill any rounding remainder.
      const w =
        i === 4 ? titleBlockW - cellW * 4 : cellW;
      return titleCell(x, titleBlockY, w, titleBlockH, c.label, c.value, fg, muted);
    })
    .join("\n  ");

  // --- CSS / animations ---
  // The blueprint family is calm. Two gated animations:
  //   - `.dim` (extension lines + dimension line): a slow stroke-dashoffset
  //     trace that re-draws the annotation each loop, like a draftsman's
  //     pencil moving across paper.
  //   - `.live` (the small registration tick at top-right): subtle blink so
  //     a static-looking sheet still feels "wired in".
  // Grid + sheet outline + title block are intentionally NOT animated; they
  // are paper, and paper doesn't move.
  const css = loopText
    ? `
    .dim { stroke-dasharray: 360; stroke-dashoffset: 360; animation: dimDraw ${DUR} ease-out infinite; }
    .live { animation: livePulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

    @keyframes dimDraw {
      0% { stroke-dashoffset: 360; }
      28%, 88% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: 360; }
    }
    @keyframes livePulse {
      0%, 60%, 100% { opacity: 0.85; }
      70% { opacity: 0.25; }
    }
  `
    : `
    /* loopText off: sheet renders as a flat freeze-frame. Dimension line
       is fully drawn (no dashoffset), live tick sits at full opacity. */
  `;

  // --- Geometry helpers ---
  // Arrow heads on dimension lines: small filled triangles pointing inward.
  const ARROW = 5;
  const leftArrow = `M ${nameLeft - 16} ${dimY} l ${ARROW} -${ARROW * 0.6} l 0 ${ARROW * 1.2} Z`;
  const rightArrow = `M ${nameRight + 16} ${dimY} l -${ARROW} -${ARROW * 0.6} l 0 ${ARROW * 1.2} Z`;

  // Callouts SVG: one circle (with index) + one label per item.
  let calloutCursorX = calloutStartX;
  const calloutsSvg = calloutFitted
    .map((c, i) => {
      const ringCx = calloutCursorX + CALLOUT_RING;
      const ringCy = calloutY;
      const labelX = ringCx + CALLOUT_RING + 8;
      const labelBaselineY = calloutY + 4;
      const out = `<g>
      <circle cx="${ringCx}" cy="${ringCy}" r="${CALLOUT_RING}" fill="none" stroke="${accent}" stroke-width="1.25"/>
      <text x="${ringCx}" y="${ringCy + 3}" text-anchor="middle" fill="${accent}" font-family="ui-monospace, monospace" font-size="10" font-weight="700">${c.n}</text>
      <text x="${labelX}" y="${labelBaselineY}" fill="${fg}" font-family="ui-monospace, monospace" font-size="${c.size}" letter-spacing="1.2">${escapeXml(c.text)}</text>
    </g>`;
      calloutCursorX += calloutWidths[i] + CALLOUT_GAP;
      return out;
    })
    .join("\n  ");

  // Top strip text: figure index on the left, sheet count on the right.
  // The figure label conventionally pairs with the kind of drawing — for a
  // header chrome this is FIG. 01 PROFILE.
  const topLeftLabel = "FIG. 01    PROFILE";
  const topRightLabel = "SHEET 01 / 03";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <!-- Cyanotype paper: subtle vertical fall-off so the top reads slightly
         lighter than the bottom, like sun-bleached print. -->
    <linearGradient id="bp-paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}" stop-opacity="0.94"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </linearGradient>
    <!-- Light grid (every 20px). Faint enough to read as paper texture and
         not compete with foreground text. -->
    <pattern id="bp-grid" x="${PAD}" y="${PAD}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.22"/>
    </pattern>
    <!-- Heavier grid every 100px (every 5 cells) for a "section line" feel. -->
    <pattern id="bp-grid-major" x="${PAD}" y="${PAD}" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="${muted}" stroke-width="0.75" stroke-opacity="0.32"/>
    </pattern>
  </defs>

  <!-- Paper -->
  <rect width="100%" height="100%" fill="url(#bp-paper)" rx="4" ry="4"/>

  <!-- Grid (clipped to inside the sheet border) -->
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid)"/>
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid-major)"/>

  <!-- Sheet border + corner registration marks -->
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="none" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
  ${regMark(PAD, PAD, 5, fg)}
  ${regMark(W - PAD, PAD, 5, fg)}
  ${regMark(PAD, H - PAD, 5, fg)}
  ${regMark(W - PAD, H - PAD, 5, fg)}

  <!-- Top strip: figure label + sheet count + 'live' indicator -->
  <text x="${PAD + 12}" y="${topStripY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${topLeftLabel}</text>
  <g transform="translate(${W - PAD - 12} ${topStripY - 4})">
    <text text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${topRightLabel}</text>
    <circle class="live" cx="6" cy="-3" r="2" fill="${accent}" opacity="0.85"/>
  </g>
  <!-- Hairline divider under the top strip -->
  <line x1="${PAD + 8}" y1="${topStripY + 8}" x2="${W - PAD - 8}" y2="${topStripY + 8}" stroke="${muted}" stroke-width="0.75" stroke-opacity="0.4"/>

  <!-- Dimension annotation above the name (W = NN) -->
  <g class="dim">
    <!-- Extension lines descending from the dimension line toward the name -->
    <line x1="${nameLeft}" y1="${dimY + 6}" x2="${nameLeft}" y2="${nameBaselineY - nameSize - 6}" stroke="${accent}" stroke-width="1"/>
    <line x1="${nameRight}" y1="${dimY + 6}" x2="${nameRight}" y2="${nameBaselineY - nameSize - 6}" stroke="${accent}" stroke-width="1"/>
    <!-- Dimension line itself -->
    <line x1="${nameLeft - 12}" y1="${dimY}" x2="${nameRight + 12}" y2="${dimY}" stroke="${accent}" stroke-width="1"/>
  </g>
  <!-- Arrow heads (filled triangles, NOT inside .dim so they don't dasharray-blink) -->
  <path d="${leftArrow}" fill="${accent}"/>
  <path d="${rightArrow}" fill="${accent}"/>
  <!-- Dimension value text (breaks the dimension line) -->
  <rect x="${cx - 38}" y="${dimY - 8}" width="76" height="16" fill="${bg}"/>
  <text x="${cx}" y="${dimY + 4}" text-anchor="middle" fill="${accent}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5">L = ${name.length}</text>

  <!-- Hero name: tracked-out uppercase caps -->
  <text x="${cx}" y="${nameBaselineY}" text-anchor="middle" fill="${fg}" font-family='"Inter", system-ui, sans-serif' font-size="${nameSize}" font-weight="800" letter-spacing="${nameTrack}">${escapeXml(name)}</text>
  <!-- Baseline rule (extends past the name on both sides) -->
  <line x1="${nameLeft - 16}" y1="${nameBaselineY + 6}" x2="${nameRight + 16}" y2="${nameBaselineY + 6}" stroke="${fg}" stroke-width="1" stroke-opacity="0.85"/>

  <!-- Numbered callouts row (role / org / location) -->
  ${calloutsSvg}

  <!-- Bottom title block (5 cells: DRAWN BY / DATE / SCALE / REV / SHEET) -->
  ${titleCells}
</svg>`;
}

const template: SvgTemplate = {
  id: "blueprint-header",
  name: "Blueprint Title Block",
  description:
    "Engineering drawing chrome: sheet border, registration marks, dimensioned name, numbered callouts, and a 5-cell title block.",
  kind: "svg",
  category: "header",
  family: "blueprint",
  width: 800,
  height: 300,
  duration: 8,
  fields: ["name", "role", "org", "location"],
  renderSvg,
};

export default template;
