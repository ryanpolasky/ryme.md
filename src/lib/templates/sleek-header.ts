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

  const rawName = info.name || "Your Name";
  const meta = [info.role, info.org, info.location].filter(Boolean);

  // Auto-shrink the name from 56px through smaller sizes if it would overflow
  // the canvas. At the smallest size, the name gets truncated with an
  // ellipsis. This keeps the editorial hero feel for shorter names while
  // gracefully handling longer ones (e.g. full legal names with hyphens).
  const NAME_BUDGET = W - PAD * 2;
  const fitted = fitFontSize(rawName, NAME_BUDGET, [56, 48, 40, 32], "sans");
  const name = fitted.text;
  const nameSize = fitted.size;

  // Underline width tracks the actual rendered name (using the fitted font
  // size to approximate). Capped at the name budget so it never bleeds out.
  const underlineW = Math.min(NAME_BUDGET, name.length * nameSize * 0.5);
  const underlineX = cx - underlineW / 2;

  // Vertically center the name+underline(+meta) block in the canvas.
  // Visual extents are baseline-relative; cap and underline scale with the
  // fitted name size so smaller names don't leave huge gaps.
  const NAME_CAP = Math.round(nameSize * 0.75);
  const UNDERLINE_OFFSET = Math.round(nameSize * 0.48);
  const META_OFFSET = Math.round(nameSize * 1.1);
  const META_DESCENDER = 5;
  const blockTop = -NAME_CAP;
  const blockBottom = meta.length
    ? META_OFFSET + META_DESCENDER
    : UNDERLINE_OFFSET + 2;
  const nameY = Math.round(H / 2 - (blockTop + blockBottom) / 2);
  const underlineY = nameY + UNDERLINE_OFFSET - 1;
  const metaY = nameY + META_OFFSET;

  // Meta line: role · org · location. Auto-shrink through 13 → 12 → 11 px
  // before truncating; the meta line is uppercase + letter-spaced so it can
  // get visually noisy when long.
  const metaFit = fitFontSize(
    meta.join("   ·   "),
    NAME_BUDGET,
    [13, 12, 11],
    "sans",
  );
  const metaLine = metaFit.text;
  const metaSize = metaFit.size;

  // When loopText is off, render everything statically so the SVG looks
  // identical at every frame (and on every reload). When on, keep the
  // current looping fade-in/fade-out cycle.
  const css = loopText
    ? `
    .name { animation: nameIn ${DUR} ease-out infinite; }
    .underline { animation: underlineDraw ${DUR} ease-out infinite; transform-origin: left center; }
    .meta { animation: fadeUp ${DUR} ease-out infinite; animation-delay: 0.3s; }
    .corner { animation: cornerSlide ${DUR} ease-out infinite; }

    @keyframes nameIn {
      0%, 4% { opacity: 0; transform: translateY(8px); }
      14%, 90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(0); }
    }
    @keyframes underlineDraw {
      0%, 14% { transform: scaleX(0); }
      24%, 88% { transform: scaleX(1); }
      100% { transform: scaleX(1); }
    }
    @keyframes fadeUp {
      0%, 22% { opacity: 0; transform: translateY(6px); }
      32%, 90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(0); }
    }
    @keyframes cornerSlide {
      0%, 8% { opacity: 0; transform: translateX(-8px); }
      18%, 90% { opacity: 1; transform: translateX(0); }
      100% { opacity: 0; transform: translateX(0); }
    }
  `
    : `
    /* loopText off: text/decorations render statically. */
    .underline { transform-origin: left center; }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="hdr-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg}"/>
      <stop offset="100%" stop-color="${theme.bg}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#hdr-bg)" rx="14" ry="14"/>

  <!-- Corner decorations: outer <g> = position, inner <g> = animation -->
  <g class="corner" opacity="0.6">
    <rect x="40" y="42" width="22" height="2" fill="${theme.accent}" />
    <rect x="40" y="42" width="2" height="22" fill="${theme.accent}" />
  </g>
  <g transform="translate(${W} 0) scale(-1 1)">
    <g class="corner" opacity="0.6">
      <rect x="40" y="42" width="22" height="2" fill="${theme.accent}" />
      <rect x="40" y="42" width="2" height="22" fill="${theme.accent}" />
    </g>
  </g>

  <!-- Name -->
  <text class="name" x="${cx}" y="${nameY}" text-anchor="middle" fill="${theme.fg}" font-family='"Inter", system-ui, sans-serif' font-size="${nameSize}" font-weight="700" letter-spacing="-1.5">${escapeXml(name)}</text>

  <!-- Accent underline -->
  <rect class="underline" x="${underlineX}" y="${underlineY}" width="${underlineW}" height="2" fill="${theme.accent}" rx="1"/>

  <!-- Meta line -->
  ${meta.length ? `<text class="meta" x="${cx}" y="${metaY}" text-anchor="middle" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="${metaSize}" letter-spacing="2">${escapeXml(metaLine.toUpperCase())}</text>` : ""}
</svg>`;
}

const template: SvgTemplate = {
  id: "sleek-header",
  name: "Sleek Hero",
  description:
    "Editorial centered name with an accent underline that sweeps in, meta line, and socials.",
  kind: "svg",
  category: "header",
  family: "sleek",
  width: 800,
  height: 300,
  duration: 6,
  fields: ["name", "role", "org", "location"],
  renderSvg,
};

export default template;
