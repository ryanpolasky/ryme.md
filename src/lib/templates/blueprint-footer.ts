import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
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
 * Display label for a social platform. Kept short / uppercased to fit
 * inside the REFERENCES table label column.
 */
const SOCIAL_LABEL: Record<string, string> = {
  github: "GITHUB",
  linkedin: "LINKEDIN",
  email: "EMAIL",
  website: "WEBSITE",
  x: "X",
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
};

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const sheetLabel = sheetIndexLabel(options, "footer");
  const W = 800;
  const H = 300;
  const PAD = 24;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  const socials = info.socials.filter((s) => s.value.trim());

  // --- Vertical layout ---
  const topStripY = PAD + 16;
  const drawingTop = 60;
  const drawingBottom = 228;
  const titleBlockY = 236;
  const titleBlockH = H - PAD - titleBlockY;

  // --- Horizontal split: revision/refs on left, stamp on right ---
  const leftX = PAD + 12;
  const leftW = 480;
  const rightCx = leftX + leftW + (W - PAD - 12 - (leftX + leftW)) / 2;
  const rightCy = (drawingTop + drawingBottom) / 2;

  // ===== REVISION HISTORY (compact mini-table on top of left column) =====
  // Columns: REV (60) | DATE (90) | DESCRIPTION (rest) | INIT (60)
  const revBoxX = leftX;
  const revBoxY = drawingTop;
  const revBoxW = leftW;
  const revBoxH = 56;
  const revHeaderH = 18;
  const revColX = [
    revBoxX,
    revBoxX + 60,
    revBoxX + 60 + 90,
    revBoxX + revBoxW - 60,
  ];
  const revHeaders = ["REV", "DATE", "DESCRIPTION", "INIT"];

  const drawer = initialsFor(info.name || "");
  // Single row of revision data. In a real drafted sheet this grows over time;
  // here we just show the current state.
  const revRows: Array<[string, string, string, string]> = [
    ["1.0", "26.10.26", "INITIAL RELEASE", drawer],
  ];

  const revHeaderSvg = revHeaders
    .map((h, i) => {
      const x = revColX[i] + 10;
      return `<text x="${x}" y="${revBoxY + 12}" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.4">${escapeXml(h)}</text>`;
    })
    .join("\n  ");

  const revRowSvg = revRows
    .map((row, ri) => {
      const rowY = revBoxY + revHeaderH + ri * 20;
      return row
        .map((cell, ci) => {
          const x = revColX[ci] + 10;
          return `<text x="${x}" y="${rowY + 14}" fill="${fg}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="0.8">${escapeXml(cell)}</text>`;
        })
        .join("\n      ");
    })
    .join("\n  ");

  // Vertical rules separating revision-table columns.
  const revRules = revColX
    .slice(1)
    .map(
      (x) =>
        `<line x1="${x}" y1="${revBoxY}" x2="${x}" y2="${revBoxY + revBoxH}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.4"/>`,
    )
    .join("\n  ");

  // ===== REFERENCES (socials list, lower portion of left column) =====
  const refsBoxX = leftX;
  const refsBoxY = revBoxY + revBoxH + 12;
  const refsBoxW = leftW;
  // Up to 4 references shown; a 5th is replaced with a "+ N MORE" entry.
  const REFS_MAX = 4;
  const refsToShow = socials.slice(0, REFS_MAX);
  const refsOverflow = Math.max(0, socials.length - REFS_MAX);
  const refLineH = 20;
  const refStartY = refsBoxY + 22; // first baseline
  const refsLabelColX = refsBoxX + 12; // "REF. 01"
  const refsKindColX = refsBoxX + 88; // "GITHUB"
  const refsValueColX = refsBoxX + 200; // "@username"

  const refsHeaderSvg = `
    <text x="${refsLabelColX}" y="${refsBoxY + 4}" fill="${muted}" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.4">REFERENCES</text>
    <line x1="${refsBoxX}" y1="${refsBoxY + 10}" x2="${refsBoxX + refsBoxW}" y2="${refsBoxY + 10}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.45"/>
  `;

  const refsBodySvg = refsToShow
    .map((s, i) => {
      const num = String(i + 1).padStart(2, "0");
      const kind = SOCIAL_LABEL[s.kind] || s.kind.toUpperCase();
      const y = refStartY + i * refLineH;
      // Truncate value to fit roughly within (refsBoxW - (refsValueColX - refsBoxX) - 12).
      const valueBudgetChars = Math.floor(
        (refsBoxX + refsBoxW - refsValueColX - 12) / (12 * 0.6),
      );
      const value =
        s.value.length > valueBudgetChars
          ? s.value.slice(0, valueBudgetChars - 1) + "…"
          : s.value;
      return `<g>
      <text x="${refsLabelColX}" y="${y}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.2">REF. ${num}</text>
      <text x="${refsKindColX}" y="${y}" fill="${accent}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.2">${escapeXml(kind)}</text>
      <text x="${refsValueColX}" y="${y}" fill="${fg}" font-family="ui-monospace, monospace" font-size="12" letter-spacing="0.5">${escapeXml(value)}</text>
    </g>`;
    })
    .join("\n  ");

  const refsOverflowSvg =
    refsOverflow > 0
      ? `<text x="${refsLabelColX}" y="${refStartY + refsToShow.length * refLineH}" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.2">+ ${refsOverflow} MORE NOT SHOWN</text>`
      : "";

  const refsEmptySvg =
    refsToShow.length === 0
      ? `<text x="${refsLabelColX}" y="${refStartY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1" font-style="italic">— no references on file —</text>`
      : "";

  // ===== APPROVED stamp (right side circular seal) =====
  // Two concentric rings + center text, slightly rotated for a stamped-by-hand
  // feel. The rotation is fixed (not animated) -- "calm" = no wobble.
  const STAMP_R = 56;
  const STAMP_R_INNER = 44;
  const STAMP_ARC_INSET = 10;
  const STAMP_ARC_R = STAMP_R - STAMP_ARC_INSET;
  const STAMP_ARC_FONT = 9;
  const STAMP_ARC_TRACK = 1.6;
  const stampRotate = -5;

  const stamp = `<g class="stamp" transform="translate(${rightCx} ${rightCy}) rotate(${stampRotate})">
    <circle cx="0" cy="0" r="${STAMP_R}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-opacity="0.85"/>
    <circle cx="0" cy="0" r="${STAMP_R_INNER}" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.55" stroke-dasharray="3 3"/>
    <!-- Top arc label "CERTIFIED" using a curved path -->
    <path id="stamp-top-arc" d="M ${-STAMP_ARC_R} 0 A ${STAMP_ARC_R} ${STAMP_ARC_R} 0 0 1 ${STAMP_ARC_R} 0" fill="none"/>
    <text font-family="ui-monospace, monospace" font-size="${STAMP_ARC_FONT}" letter-spacing="${STAMP_ARC_TRACK}" fill="${accent}">
      <textPath href="#stamp-top-arc" startOffset="50%" text-anchor="middle">CERTIFIED ENGINEER</textPath>
    </text>
    <!-- Center stack: APPROVED, line, rev -->
    <text x="0" y="0" text-anchor="middle" fill="${accent}" font-family="ui-monospace, monospace" font-size="13" font-weight="700" letter-spacing="1.6">APPROVED</text>
    <line x1="-30" y1="8" x2="30" y2="8" stroke="${accent}" stroke-width="1" stroke-opacity="0.7"/>
    <text x="0" y="24" text-anchor="middle" fill="${accent}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">REV 1.0</text>
  </g>`;

  // ===== Title block (same 5-cell strip; SHEET reflects this section's
  // position in the live stack, or falls back to 'last sheet' for isolated
  // previews) =====
  const titleBlockX = PAD;
  const titleBlockW = W - PAD * 2;
  const cellW = Math.floor(titleBlockW / 5);
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

  // ===== CSS / animations (calm; gated on loopText) =====
  // Only the live tick blinks; the stamp does NOT wobble (would feel busy).
  const css = loopText
    ? `
    .live { animation: livePulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .stamp-pulse { animation: stampGlow ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

    @keyframes livePulse {
      0%, 60%, 100% { opacity: 0.85; }
      70% { opacity: 0.25; }
    }
    @keyframes stampGlow {
      0%, 100% { stroke-opacity: 0.55; }
      50% { stroke-opacity: 0.85; }
    }
  `
    : `
    /* loopText off: static, including the live tick. */
  `;

  // Top strip
  // Top strip label: use a middle-dot separator instead of an ampersand --
  // raw `&` in SVG text is an unescaped entity reference and makes the
  // whole SVG fail to parse in the browser (the preview renders blank).
  const topLeftLabel = "FIG. 03    REFERENCES \u00B7 CERTIFICATION";
  const topRightLabel = `SHEET ${sheetLabel}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="bp-paper-3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}" stop-opacity="0.94"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </linearGradient>
    <pattern id="bp-grid-3" x="${PAD}" y="${PAD}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.22"/>
    </pattern>
    <pattern id="bp-grid-major-3" x="${PAD}" y="${PAD}" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="${muted}" stroke-width="0.75" stroke-opacity="0.32"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#bp-paper-3)" rx="4" ry="4"/>

  <!-- Grid -->
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid-3)"/>
  <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" fill="url(#bp-grid-major-3)"/>

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

  <!-- REVISION HISTORY box -->
  <rect x="${revBoxX}" y="${revBoxY}" width="${revBoxW}" height="${revBoxH}" fill="none" stroke="${fg}" stroke-width="1" stroke-opacity="0.7"/>
  <line x1="${revBoxX}" y1="${revBoxY + revHeaderH}" x2="${revBoxX + revBoxW}" y2="${revBoxY + revHeaderH}" stroke="${muted}" stroke-width="0.5" stroke-opacity="0.5"/>
  ${revRules}
  ${revHeaderSvg}
  ${revRowSvg}

  <!-- REFERENCES section -->
  ${refsHeaderSvg}
  ${refsBodySvg}
  ${refsOverflowSvg}
  ${refsEmptySvg}

  <!-- APPROVED stamp -->
  <g class="stamp-pulse">${stamp}</g>

  <!-- Title block -->
  ${titleCells}

  <!-- ryme.md attribution: small uppercase mono credit inside the bottom-right
       margin, low-opacity so it reads as drafted-on metadata rather than a logo. -->
  <text x="${W - PAD - 6}" y="${H - 10}" text-anchor="end" fill="${muted}" fill-opacity="0.55" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1.2">DRAFTED ON RYME.MD</text>
</svg>`;
}

const template: SvgTemplate = {
  id: "blueprint-footer",
  name: "Blueprint Approvals",
  description:
    "Revision history table, references list, and a circular APPROVED stamp -- the closing sheet of the engineering set.",
  kind: "svg",
  category: "footer",
  family: "blueprint",
  width: 800,
  height: 300,
  duration: 8,
  fields: ["name", "socials"],
  renderSvg,
};

export default template;
