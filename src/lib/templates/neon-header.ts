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
 * Build a synthwave-style perspective grid: horizontal lines with
 * accelerating spacing toward the bottom (closer = farther apart on screen),
 * plus a fan of vertical lines radiating from a central vanishing point on
 * the horizon. Lines are emitted as raw SVG strings so a single CSS
 * keyframe can animate the whole `<g>` translate for the "moving forward"
 * effect.
 */
function buildGrid(
  W: number,
  horizonY: number,
  bottomY: number,
  accent: string,
  rowCount: number,
  colCount: number,
): string {
  const cx = W / 2;
  const lines: string[] = [];

  // Horizontal lines, perspective-spaced. Position formula uses (i/N)^2 so
  // lines bunch tightly at the horizon and spread out at the bottom.
  for (let i = 1; i <= rowCount; i++) {
    const t = i / rowCount;
    const y = horizonY + (bottomY - horizonY) * t * t;
    const opacity = 0.18 + 0.5 * t; // dimmer near horizon, brighter near viewer
    lines.push(
      `<line x1="0" y1="${y.toFixed(2)}" x2="${W}" y2="${y.toFixed(2)}" stroke="${accent}" stroke-width="1" stroke-opacity="${opacity.toFixed(2)}"/>`,
    );
  }

  // Vertical lines fan out from the horizon vanishing point. Spread them
  // symmetrically left and right of center; the further-out lines hit the
  // bottom edge at the corners and beyond (we let SVG clip).
  const half = colCount / 2;
  for (let i = -half; i <= half; i++) {
    if (i === 0) {
      // Center line: straight down from vanishing point.
      lines.push(
        `<line x1="${cx}" y1="${horizonY}" x2="${cx}" y2="${bottomY}" stroke="${accent}" stroke-width="1" stroke-opacity="0.55"/>`,
      );
      continue;
    }
    // Each vertical reaches `xSpread * (i/half)` past the canvas edge at the
    // bottom, giving the cone-of-perspective feel.
    const xSpread = W * 1.2;
    const xBottom = cx + (xSpread / 2) * (i / half);
    const opacity = 0.32 + 0.18 * (1 - Math.abs(i) / half);
    lines.push(
      `<line x1="${cx}" y1="${horizonY}" x2="${xBottom.toFixed(2)}" y2="${bottomY}" stroke="${accent}" stroke-width="1" stroke-opacity="${opacity.toFixed(2)}"/>`,
    );
  }

  return lines.join("\n    ");
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
  const PAD = 56;
  const DUR = `${loopDuration}s`;

  const accent = theme.accent;
  const muted = theme.muted;
  const fg = theme.fg;
  const bg = theme.bg;

  const rawName = info.name || "Your Name";
  const meta = [info.role, info.org, info.location].filter(Boolean);

  // Auto-shrink the name. Larger sizes than sleek-header because the bloom
  // makes everything feel heavier; budget is the same.
  const NAME_BUDGET = W - PAD * 2;
  const fitted = fitFontSize(rawName, NAME_BUDGET, [60, 52, 44, 36, 30], "sans");
  const name = fitted.text;
  const nameSize = fitted.size;

  // Hero block sits high in the canvas to leave room for the synthwave
  // horizon + grid in the lower portion. Horizon is at 60% down.
  const horizonY = Math.round(H * 0.6);
  const nameY = Math.round(H * 0.4);

  // Sub-line (role · org · location) renders in mono caps below the name,
  // small and letter-spaced for the "system label" feel.
  const metaFit = fitFontSize(
    meta.join("   //   "),
    NAME_BUDGET - 120,
    [12, 11, 10, 9],
    "sans",
  );
  const metaCharBudget = Math.max(
    12,
    Math.floor((NAME_BUDGET - 120) / (metaFit.size * 0.75)),
  );
  const metaLine =
    metaFit.text.length > metaCharBudget
      ? `${metaFit.text.slice(0, Math.max(1, metaCharBudget - 1)).trimEnd()}…`.toUpperCase()
      : metaFit.text.toUpperCase();
  const metaSize = metaFit.size;

  // Sun disk on the horizon: a circle clipped to peek above the horizon line
  // with horizontal slits cutting through it. Classic synthwave detail.
  const SUN_R = 50;
  const sunCx = cx;
  const sunCy = horizonY;
  // Slits: 4 horizontal bands inside the sun, increasing in thickness
  // toward the bottom (so the sun looks like it's setting through a
  // venetian-blind horizon).
  const slits = [
    { y: sunCy - SUN_R + 14, h: 2 },
    { y: sunCy - SUN_R + 22, h: 3 },
    { y: sunCy - SUN_R + 32, h: 4 },
    { y: sunCy - SUN_R + 44, h: 5 },
  ]
    .map(
      (s) =>
        `<rect x="${sunCx - SUN_R}" y="${s.y}" width="${SUN_R * 2}" height="${s.h}" fill="${bg}"/>`,
    )
    .join("");

  // Animations are controlled by `loopText`. When ON, all decorative effects
  // play (bloom pulse, chromatic-aberration ghost flash, scanline drift,
  // grid scroll, sun pulse, horizon glow). When OFF, everything renders
  // statically — ideal for a one-frame snapshot.
  //
  // Note: text itself NEVER fades to opacity 0. The chromatic ghosts and
  // glow pulse provide the "alive" feel without ever hiding the name. This
  // matters because GIF re-renders and SVG reloads in GitHub markdown
  // would otherwise replay the disappear-then-reappear cycle every visit.
  const css = loopText
    ? `
    .name-glow { animation: nameGlow ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .chrome-r { animation: chromeR ${DUR} ease-out infinite; }
    .chrome-c { animation: chromeC ${DUR} ease-out infinite; }
    .scan { animation: scanDrift ${DUR} linear infinite; }
    .grid { animation: gridMove ${DUR} linear infinite; transform-box: fill-box; }
    .sun { animation: sunPulse ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .horizon { animation: horizonGlow ${DUR} ease-in-out infinite; }

    @keyframes nameGlow {
      0%, 100% { filter: drop-shadow(0 0 10px ${accent}) drop-shadow(0 0 18px ${accent}); }
      50% { filter: drop-shadow(0 0 16px ${accent}) drop-shadow(0 0 28px ${accent}); }
    }
    @keyframes chromeR {
      0%, 4%, 8%, 88%, 92%, 96%, 100% { opacity: 0.45; transform: translate(-2px, 0); }
      6%, 90%, 94% { opacity: 0.95; transform: translate(-5px, 0); }
    }
    @keyframes chromeC {
      0%, 4%, 8%, 88%, 92%, 96%, 100% { opacity: 0.45; transform: translate(2px, 0); }
      6%, 90%, 94% { opacity: 0.95; transform: translate(5px, 0); }
    }
    @keyframes scanDrift {
      from { transform: translateY(0); }
      to { transform: translateY(8px); }
    }
    @keyframes gridMove {
      from { transform: translateY(-32px); }
      to { transform: translateY(0); }
    }
    @keyframes sunPulse {
      0%, 100% { opacity: 0.85; }
      50% { opacity: 1; }
    }
    @keyframes horizonGlow {
      0%, 100% { stroke-opacity: 0.7; }
      50% { stroke-opacity: 1; }
    }
  `
    : `
    /* loopText off: everything renders statically. The chromatic ghosts
       hold their inline opacity (0.45) for a static RGB-split look, and
       the SYSTEM.ONLINE dot animate element below is conditionally
       omitted from the SVG. */
  `;

  // Render order matters (back to front): bg → grid → horizon line → sun
  // disk → scanlines overlay → text (name with chromatic ghosts + meta + tag).
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="neon-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="55%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.18"/>
    </linearGradient>
    <radialGradient id="sun-grad" cx="50%" cy="55%" r="55%">
      <stop offset="0%" stop-color="#ffe066"/>
      <stop offset="40%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#7c1d6f"/>
    </radialGradient>
    <pattern id="scanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#ffffff" fill-opacity="0.03"/>
    </pattern>
    <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0"/>
      <stop offset="40%" stop-color="white" stop-opacity="1"/>
      <stop offset="100%" stop-color="white" stop-opacity="1"/>
    </linearGradient>
    <mask id="grid-mask">
      <rect x="0" y="${horizonY}" width="${W}" height="${H - horizonY}" fill="url(#grid-fade)"/>
    </mask>
    <clipPath id="sun-clip">
      <circle cx="${sunCx}" cy="${sunCy}" r="${SUN_R}"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#neon-bg)" rx="14" ry="14"/>

  <!-- Perspective grid (lower half, fades in near horizon) -->
  <g mask="url(#grid-mask)">
    <g class="grid">
    ${buildGrid(W, horizonY, H + 40, accent, 10, 22)}
    </g>
  </g>

  <!-- Sun disk peeking above the horizon, with horizontal slit cutouts -->
  <g class="sun">
    <circle cx="${sunCx}" cy="${sunCy}" r="${SUN_R}" fill="url(#sun-grad)" clip-path="url(#sun-clip)"/>
    <g clip-path="url(#sun-clip)">${slits}</g>
  </g>

  <!-- Horizon line (the bright bar where ground meets sky) -->
  <line class="horizon" x1="0" y1="${horizonY}" x2="${W}" y2="${horizonY}" stroke="${accent}" stroke-width="2" stroke-opacity="0.85" filter="drop-shadow(0 0 6px ${accent})"/>

  <!-- Tag chip in upper-left: small mono callout -->
  <g class="tag" transform="translate(${PAD} 32)">
    <rect x="-8" y="-12" width="120" height="20" rx="4" fill="${bg}" stroke="${muted}" stroke-width="1" stroke-opacity="0.6"/>
    <circle cx="2" cy="-2" r="2" fill="${muted}" opacity="${loopText ? 1 : 0.7}">
      ${loopText ? `<animate attributeName="opacity" values="0.4;1;0.4" dur="${DUR}" repeatCount="indefinite"/>` : ""}
    </circle>
    <text x="12" y="2" fill="${muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.5">SYSTEM.ONLINE</text>
  </g>

  <!-- Name with RGB chromatic ghosts. Three text layers stacked: cyan
       offset right, magenta offset left, fg on top. The bloom layer
       (.name-glow) wraps the whole group so all ghosts share the pulse. -->
  <g class="name-glow">
    <g class="name">
      <text class="chrome-r" x="${cx}" y="${nameY}" text-anchor="middle" fill="#ff0080" font-family='"Inter", system-ui, sans-serif' font-size="${nameSize}" font-weight="800" letter-spacing="-1.5" opacity="0.45" transform="translate(-2 0)" style="mix-blend-mode:screen">${escapeXml(name)}</text>
      <text class="chrome-c" x="${cx}" y="${nameY}" text-anchor="middle" fill="#00ffff" font-family='"Inter", system-ui, sans-serif' font-size="${nameSize}" font-weight="800" letter-spacing="-1.5" opacity="0.45" transform="translate(2 0)" style="mix-blend-mode:screen">${escapeXml(name)}</text>
      <text x="${cx}" y="${nameY}" text-anchor="middle" fill="${fg}" font-family='"Inter", system-ui, sans-serif' font-size="${nameSize}" font-weight="800" letter-spacing="-1.5">${escapeXml(name)}</text>
    </g>
  </g>

  <!-- Meta line below name -->
  ${meta.length ? `<text class="meta" x="${cx}" y="${nameY + 26}" text-anchor="middle" fill="${muted}" font-family="ui-monospace, monospace" font-size="${metaSize}" letter-spacing="3">${escapeXml(metaLine)}</text>` : ""}

  <!-- Scanlines overlay (very subtle, drifts down) -->
  <g class="scan">
    <rect width="${W}" height="${H + 8}" fill="url(#scanlines)" pointer-events="none"/>
  </g>
</svg>`;
}

const template: SvgTemplate = {
  id: "neon-header",
  name: "Neon Synthwave",
  description:
    "Chromatic-aberration name floating over a perspective grid floor with a slit-sun horizon. Pure synthwave.",
  kind: "svg",
  category: "header",
  family: "neon",
  width: 800,
  height: 300,
  duration: 8,
  fields: ["name", "role", "org", "location"],
  renderSvg,
};

export default template;
