import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize, wrapByChars } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Render an L-shaped corner bracket at the given (x, y). `flipX` and `flipY`
 * mirror the bracket so the same primitive serves all four corners.
 */
function cornerBracket(
  x: number,
  y: number,
  size: number,
  thickness: number,
  color: string,
  flipX: boolean,
  flipY: boolean,
): string {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">
    <rect x="0" y="0" width="${size}" height="${thickness}" fill="${color}" filter="drop-shadow(0 0 4px ${color})"/>
    <rect x="0" y="0" width="${thickness}" height="${size}" fill="${color}" filter="drop-shadow(0 0 4px ${color})"/>
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
  const PAD = 48;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  // Tags from role/org/location, rendered as neon-outline pills.
  const tags = [info.role, info.org, info.location].filter(Boolean) as string[];

  // Title in the upper-left of the holo frame: small mono caps, cyan.
  const titleText = "USER.PROFILE";

  // Bio gets wrapped to fit the frame interior. We start at 18px and
  // shrink to 16/14 if the wrapped text would overflow vertically.
  const FRAME_INNER_W = W - PAD * 2 - 32; // 16 px inset from frame edges
  const BIO_MAX_LINES = 3;
  const bioRaw = info.bio ||
    "I build things that turn data into something you can read at a glance. Lately: design systems, devtools, and small magic.";

  // Pick a font size + char-width target that fits BIO_MAX_LINES lines
  // within FRAME_INNER_W. Char width ~0.55em for Inter sans-serif.
  const sizeOptions: Array<{ size: number; charW: number }> = [
    { size: 20, charW: 11 },
    { size: 18, charW: 10 },
    { size: 16, charW: 9 },
  ];
  let bioSize = 16;
  let bioLines: string[] = [];
  for (const { size, charW } of sizeOptions) {
    const maxChars = Math.floor(FRAME_INNER_W / charW);
    const candidate = wrapByChars(bioRaw, maxChars, BIO_MAX_LINES);
    // Accept this size if every line actually fits within the visual budget.
    const fitsAll = candidate.every((ln) => ln.length * charW <= FRAME_INNER_W);
    if (fitsAll) {
      bioSize = size;
      bioLines = candidate;
      break;
    }
  }
  if (bioLines.length === 0) {
    // Fallback: smallest size, force-wrap.
    const { size, charW } = sizeOptions[sizeOptions.length - 1];
    bioSize = size;
    bioLines = wrapByChars(
      bioRaw,
      Math.floor(FRAME_INNER_W / charW),
      BIO_MAX_LINES,
    );
  }

  // Pill geometry: each pill auto-shrinks its label to fit a per-pill cap of
  // the current row budget. Pills sit on a single row centered horizontally;
  // per-pill caps are derived from row width so the full row fits.
  const PILL_H = 26;
  const PILL_PAD = 12;
  const PILL_GAP = 10;
  const PILL_FONT = 12;
  const PILL_ROW_W = W - PAD * 2 - 24;
  const perPillCap = tags.length
    ? Math.max(
        80,
        Math.floor((PILL_ROW_W - (tags.length - 1) * PILL_GAP) / tags.length),
      )
    : 220;
  const pills = tags.map((t) => {
    const fitted = fitFontSize(t, perPillCap, [PILL_FONT, 11, 10], "mono");
    const labelW = fitted.text.length * (fitted.size * 0.6); // mono ~0.6em
    const pillW = Math.max(50, labelW + PILL_PAD * 2);
    return { text: fitted.text, size: fitted.size, w: pillW };
  });
  const pillsTotalW =
    pills.reduce((sum, p) => sum + p.w, 0) +
    Math.max(0, pills.length - 1) * PILL_GAP;
  const pillsStartX = Math.round((W - pillsTotalW) / 2);

  // Vertical layout inside the frame:
  //   title row    -> pinned top-left  (chrome)
  //   status row   -> pinned bottom-right (chrome)
  //   [bio + pills] -> grouped as a single content block, centered
  //                    vertically in the full frame height with a fixed
  //                    breathing gap between the two.
  const FRAME_X = PAD;
  const FRAME_Y = 28;
  const FRAME_W = W - PAD * 2;
  const FRAME_H = H - 50;
  const frameRight = FRAME_X + FRAME_W;
  const frameBottom = FRAME_Y + FRAME_H;

  const titleY = FRAME_Y + 22;

  const bioLineH = bioSize + 8;
  const bioBlockH = bioLines.length * bioLineH;

  // Group [bio block] + [optional pills row] and center the union vertically.
  // The gap is measured between the bottom of the bio block and the top of
  // the pills row; if there are no pills, the group collapses to just bio.
  const BIO_PILLS_GAP = 28;
  const hasPills = pills.length > 0;
  const groupH = bioBlockH + (hasPills ? BIO_PILLS_GAP + PILL_H : 0);
  const groupTop = FRAME_Y + (FRAME_H - groupH) / 2;

  // Bio: SVG text y is the baseline, so first line's visible top sits at
  // ~groupTop when we set baseline = groupTop + bioSize.
  const bioStartY = Math.round(groupTop + bioSize);

  // Pills: pillsY is treated as the row's vertical CENTER (rects use
  // `pillsY - PILL_H/2` for y, labels use `pillsY + 4` for baseline).
  const pillsY = Math.round(groupTop + bioBlockH + BIO_PILLS_GAP + PILL_H / 2);

  const statusY = frameBottom - 16;

  // Animations follow `loopText`. When ON, decorative effects (frame/corner
  // pulse, status dot, scanline drift, chromatic glitch flash) play. When
  // OFF, everything renders statically.
  //
  // Note: title/bio/pills NEVER fade to opacity 0. Their entrance keyframes
  // were removed. The chromatic glitch ghosts provide the "alive" feel via
  // brief flashes; the main bio text stays visible the entire time.
  const css = loopText
    ? `
    .corner { animation: cornerPulse ${DUR} ease-in-out infinite; }
    .frame { animation: framePulse ${DUR} ease-in-out infinite; }
    .status-dot { animation: statusPulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .scan { animation: scanDrift ${DUR} linear infinite; }
    .glitch-r { animation: glitchR ${DUR} ease-out infinite; }
    .glitch-c { animation: glitchC ${DUR} ease-out infinite; }

    @keyframes cornerPulse {
      0%, 100% { opacity: 0.85; }
      50% { opacity: 1; }
    }
    @keyframes framePulse {
      0%, 100% { stroke-opacity: 0.35; }
      50% { stroke-opacity: 0.6; }
    }
    @keyframes statusPulse {
      0%, 70%, 100% { opacity: 1; transform: scale(1); }
      80% { opacity: 0.4; transform: scale(0.7); }
    }
    @keyframes scanDrift {
      from { transform: translateY(0); }
      to { transform: translateY(8px); }
    }
    @keyframes glitchR {
      0%, 4%, 8%, 92%, 96%, 100% { opacity: 0; transform: translate(0, 0); }
      6%, 94% { opacity: 0.7; transform: translate(-3px, 1px); }
    }
    @keyframes glitchC {
      0%, 4%, 8%, 92%, 96%, 100% { opacity: 0; transform: translate(0, 0); }
      6%, 94% { opacity: 0.7; transform: translate(3px, -1px); }
    }
  `
    : `
    /* loopText off: everything static. Bio chromatic ghosts hold their
       inline opacity (0) so they don't appear in the snapshot. */
  `;

  // Bio rendering: each line gets two faint chromatic ghosts plus the main
  // line. Ghosts share a single class so one keyframe drives the whole
  // bio block's glitch.
  const bioSvg = bioLines
    .map((line, i) => {
      const y = bioStartY + i * bioLineH;
      const cls = `bio${i}`;
      return `<g class="${cls}">
      <text class="glitch-r" x="${W / 2}" y="${y}" text-anchor="middle" fill="#ff0080" font-family='"Inter", system-ui, sans-serif' font-size="${bioSize}" font-weight="500" opacity="0" style="mix-blend-mode:screen">${escapeXml(line)}</text>
      <text class="glitch-c" x="${W / 2}" y="${y}" text-anchor="middle" fill="#00ffff" font-family='"Inter", system-ui, sans-serif' font-size="${bioSize}" font-weight="500" opacity="0" style="mix-blend-mode:screen">${escapeXml(line)}</text>
      <text x="${W / 2}" y="${y}" text-anchor="middle" fill="${fg}" font-family='"Inter", system-ui, sans-serif' font-size="${bioSize}" font-weight="500">${escapeXml(line)}</text>
    </g>`;
    })
    .join("\n  ");

  // Pills: outlined rectangle with cyan/magenta alternating outlines.
  let pillX = pillsStartX;
  const pillsSvg = pills
    .map((p, i) => {
      const stroke = i % 2 === 0 ? muted : accent;
      const x = pillX;
      pillX += p.w + PILL_GAP;
      return `<g class="pill${i}">
      <rect x="${x}" y="${pillsY - PILL_H / 2}" width="${p.w}" height="${PILL_H}" rx="${PILL_H / 2}" fill="${bg}" fill-opacity="0.6" stroke="${stroke}" stroke-width="1" filter="drop-shadow(0 0 4px ${stroke})"/>
      <text x="${x + p.w / 2}" y="${pillsY + 4}" text-anchor="middle" fill="${stroke}" font-family="ui-monospace, monospace" font-size="${p.size}" letter-spacing="1">${escapeXml(p.text.toUpperCase())}</text>
    </g>`;
    })
    .join("\n  ");

  // Corner brackets (4 corners of the frame), each at 14px size.
  const BR = 14;
  const BT = 2;
  const corners = [
    cornerBracket(FRAME_X, FRAME_Y, BR, BT, accent, false, false),
    cornerBracket(frameRight, FRAME_Y, BR, BT, accent, true, false),
    cornerBracket(FRAME_X, frameBottom, BR, BT, accent, false, true),
    cornerBracket(frameRight, frameBottom, BR, BT, accent, true, true),
  ].join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="neon-about-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.1"/>
    </linearGradient>
    <pattern id="scan-about" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#ffffff" fill-opacity="0.025"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#neon-about-bg)" rx="14" ry="14"/>

  <!-- Holographic frame: dashed neon border with corner brackets layered on top -->
  <g class="frame">
    <rect x="${FRAME_X}" y="${FRAME_Y}" width="${FRAME_W}" height="${FRAME_H}" rx="6" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.45" stroke-dasharray="4 6"/>
  </g>
  <g class="corner">
    ${corners}
  </g>

  <!-- Title in upper-left of frame -->
  <text class="title" x="${FRAME_X + 14}" y="${titleY}" fill="${muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2.5">// ${titleText}</text>
  <!-- Frame index/timestamp callout in upper-right (static) -->
  <text x="${frameRight - 14}" y="${titleY}" text-anchor="end" fill="${muted}" fill-opacity="0.6" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">[ FRAME // 00:1A ]</text>

  <!-- Bio (3 lines max, glitchy chromatic ghosts) -->
  ${bioSvg}

  <!-- Skill pills, neon-outlined, alternating cyan/magenta -->
  ${pillsSvg}

  <!-- Status indicator (bottom right of frame) -->
  <g transform="translate(${frameRight - 14} ${statusY})">
    <text x="-12" y="3" text-anchor="end" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">STATUS: ENGAGED</text>
    <circle class="status-dot" cx="-4" cy="0" r="3" fill="${accent}" filter="drop-shadow(0 0 5px ${accent})"/>
  </g>

  <!-- Scanlines overlay -->
  <g class="scan">
    <rect width="${W}" height="${H + 8}" fill="url(#scan-about)" pointer-events="none"/>
  </g>
</svg>`;
}

const template: SvgTemplate = {
  id: "neon-about",
  name: "Neon Holo-Card",
  description:
    "Holographic frame with corner brackets, glitch-flickering bio, and neon-outline skill pills.",
  kind: "svg",
  category: "about",
  family: "neon",
  width: 800,
  height: 300,
  duration: 10,
  fields: ["bio", "role", "org", "location"],
  renderSvg,
};

export default template;
