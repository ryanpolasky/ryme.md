import type {
  ProfileInfo,
  RenderOptions,
  Social,
  SocialKind,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize, fitUniformFontSize } from "../text-utils";
import {
  PALETTE,
  PIXEL_PALETTE,
  SPRITE_HEART,
  escapeXml,
  frameInner,
  renderPixelGrid,
  slimFrame,
  slimFrameInner,
  woodFrame,
} from "./pixelfarm-shared";
import {
  PIXEL_FONT_H,
  measurePixelText,
  pixelText,
} from "./pixelfarm-font";

/**
 * Quaint footer.
 *
 * Wood-framed parchment with a pixel-font "FRIENDSHIP" heading
 * (Stardew's word for social bonds), a row of slim-framed social-handle
 * cards under it, and a "made with ryme.md" attribution along the
 * bottom. Each social card shows the platform name in the pixel font
 * (menu-chrome feel) plus the user's actual handle in monospace
 * (readability). A small heart sits next to the attribution because
 * cozy.
 *
 * The card row is capped at 4 social entries to keep the row width
 * sensible -- 5+ socials get truncated rather than wrapped to a second
 * row (the visual goal is "a clean signoff", not "all the socials
 * possible").
 */

const W = 800;
const H = 200;
const PAD = 28;
const MAX_SOCIALS = 4;

const HEADER_TEXT = "FRIENDSHIP";
const HEADER_SCALE = 4;
const HEADER_H = PIXEL_FONT_H * HEADER_SCALE;

const PAD_TOP = 22;
const HEADER_TO_UNDERLINE = 8;
const UNDERLINE_H = 3;
const UNDERLINE_TO_TILES = 18;
const TILE_H = 64;
const TILE_GAP = 16;

// User-facing label for each kind. Uppercased at render time so the
// pixel-font glyph map (uppercase-only) doesn't need any extra work.
const PLATFORM_LABEL: Record<SocialKind, string> = {
  github: "GITHUB",
  linkedin: "LINKEDIN",
  email: "EMAIL",
  website: "WEBSITE",
  x: "X",
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
};

function activeSocials(socials: Social[]): Social[] {
  return socials.filter((s) => s.value && s.value.trim().length > 0).slice(0, MAX_SOCIALS);
}

function renderSvg(
  info: ProfileInfo,
  _theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const inner = frameInner(0, 0, W, H);
  const socials = activeSocials(info.socials);
  const hasSocials = socials.length > 0;

  // -- Header ------------------------------------------------------------
  const HEADER_X = inner.x + PAD;
  const HEADER_Y = inner.y + PAD_TOP;
  const headerPixels = pixelText(
    HEADER_TEXT,
    HEADER_SCALE,
    HEADER_X,
    HEADER_Y,
    PALETTE.ink,
  ).svg;
  const HEADER_W_PX = measurePixelText(HEADER_TEXT, HEADER_SCALE);

  // Small "by <name>" caption on the right of the header. Falls through
  // to a generic "by friend" if no name is set so the layout never
  // collapses into a single-column header.
  const captionRaw = info.name ? `BY ${info.name}` : "BY A FRIEND";
  const captionFit = (() => {
    // Auto-shrink the caption if it's too long for the right margin.
    const maxBudget = inner.w - PAD - HEADER_X - HEADER_W_PX - 24;
    const scaleOptions = [2, 1] as const;
    for (const s of scaleOptions) {
      if (measurePixelText(captionRaw, s) <= maxBudget) {
        return { text: captionRaw, scale: s };
      }
    }
    // Final fallback: render at scale 1 and let it potentially clip.
    return { text: captionRaw, scale: 1 as const };
  })();
  const captionW = measurePixelText(captionFit.text, captionFit.scale);
  const captionX = inner.x + inner.w - PAD - captionW;
  const captionY =
    HEADER_Y + Math.round((HEADER_H - PIXEL_FONT_H * captionFit.scale) / 2);
  const captionPixels = pixelText(
    captionFit.text,
    captionFit.scale,
    captionX,
    captionY,
    PALETTE.woodMid,
  ).svg;

  // -- Underline ---------------------------------------------------------
  const UNDERLINE_X = HEADER_X;
  const UNDERLINE_Y = HEADER_Y + HEADER_H + HEADER_TO_UNDERLINE;
  const UNDERLINE_W = HEADER_W_PX;

  // -- Social tile row --------------------------------------------------
  const TILE_ROW_Y = UNDERLINE_Y + UNDERLINE_H + UNDERLINE_TO_TILES;
  const ROW_BUDGET = inner.w - PAD * 2;

  // Each tile gets an equal width slice of the row. With 1 social, the
  // tile is as wide as the whole row; with 4 socials, the tiles are
  // about 170 each.
  const tileCount = Math.max(1, socials.length);
  const TILE_W = hasSocials
    ? Math.floor((ROW_BUDGET - (tileCount - 1) * TILE_GAP) / tileCount)
    : 0;
  const rowTotalW = hasSocials
    ? tileCount * TILE_W + (tileCount - 1) * TILE_GAP
    : 0;
  const TILE_ROW_X = Math.round(inner.x + (inner.w - rowTotalW) / 2);

  // Auto-shrink platform labels uniformly so they all line up nicely.
  // Pixel-font has discrete scales rather than a continuous size, so we
  // pick the largest scale at which every label fits the tile budget.
  const platformLabels = socials.map((s) => PLATFORM_LABEL[s.kind] || s.kind.toUpperCase());
  const PLATFORM_BUDGET = Math.max(40, TILE_W - 20);
  const platformScale = (() => {
    for (const s of [3, 2, 1] as const) {
      if (platformLabels.every((lbl) => measurePixelText(lbl, s) <= PLATFORM_BUDGET)) {
        return s;
      }
    }
    return 1 as const;
  })();

  // Handles use monospace so they're readable. Auto-fit per tile.
  const handleBudget = TILE_W - 16;
  const handleTexts = socials.map((s) => s.value);
  const handleFit = fitUniformFontSize(
    handleTexts,
    handleBudget,
    [13, 12, 11, 10],
    "mono",
  );
  const handleSize = handleFit.size;

  const tileNodes = socials
    .map((_social, i) => {
      const x = TILE_ROW_X + i * (TILE_W + TILE_GAP);
      const y = TILE_ROW_Y;
      const innerTile = slimFrameInner(x, y, TILE_W, TILE_H);

      const platform = platformLabels[i];
      const platformW = measurePixelText(platform, platformScale);
      const platformX = Math.round(innerTile.x + (innerTile.w - platformW) / 2);
      const platformY = innerTile.y + 8;
      const platformPixels = pixelText(
        platform,
        platformScale,
        platformX,
        platformY,
        PALETTE.woodMid,
      ).svg;

      const handleY = innerTile.y + innerTile.h - 10;
      return `<g class="pf-tile pf-tile-${i}">
    ${slimFrame(x, y, TILE_W, TILE_H)}
    ${platformPixels}
    <text x="${innerTile.x + innerTile.w / 2}" y="${handleY}" text-anchor="middle" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="${handleSize}" font-weight="700" letter-spacing="0.5">${escapeXml(handleFit.texts[i])}</text>
  </g>`;
    })
    .join("\n  ");

  const emptySvg = !hasSocials
    ? `<text x="${inner.x + inner.w / 2}" y="${TILE_ROW_Y + TILE_H / 2 + 4}" text-anchor="middle" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="13" letter-spacing="2">-- NO VILLAGERS YET --</text>`
    : "";

  // -- Attribution row --------------------------------------------------
  // "made with <3 by ryme.md" sits just inside the bottom edge. Heart is
  // a sprite (apple-red), the text is monospace italic for the casual
  // signoff feel. Anchored center-bottom so it reads as "page footer".
  const ATTRIB_Y = inner.y + inner.h - 14;
  const ATTRIB_PARTS = ["made with", "by ryme.md"];
  const ATTRIB_FONT = 11;

  // Approximate widths so we can lay out [text] [heart] [text] in a
  // centered row.
  const HEART_SCALE_ATTRIB = 2;
  const HEART_W = 7 * HEART_SCALE_ATTRIB;
  const HEART_H = 6 * HEART_SCALE_ATTRIB;
  const fitAttribLeft = fitFontSize(ATTRIB_PARTS[0], 200, [ATTRIB_FONT], "mono");
  const fitAttribRight = fitFontSize(ATTRIB_PARTS[1], 200, [ATTRIB_FONT], "mono");
  const leftW = fitAttribLeft.text.length * ATTRIB_FONT * 0.6;
  const rightW = fitAttribRight.text.length * ATTRIB_FONT * 0.6;
  const ATTRIB_GAP = 8;
  const attribTotalW = leftW + HEART_W + rightW + ATTRIB_GAP * 2;
  const attribStartX = Math.round(inner.x + (inner.w - attribTotalW) / 2);
  const heartX = attribStartX + leftW + ATTRIB_GAP;
  const heartY = ATTRIB_Y - HEART_H + 2;
  const rightX = heartX + HEART_W + ATTRIB_GAP;

  // -- Animations --------------------------------------------------------
  const tileDelays = socials
    .map(
      (_, i) =>
        `.pf-tile-${i} { animation-delay: ${(loopDuration * (0.12 + i * 0.05)).toFixed(2)}s; }`,
    )
    .join("\n    ");

  const css = `
    ${
      loopText
        ? `
    .pf-header { animation: pf-pop ${DUR} ease-out infinite; }
    .pf-underline { animation: pf-wipe ${DUR} ease-out infinite; transform-origin: ${UNDERLINE_X}px center; }
    .pf-caption { animation: pf-pop ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.05).toFixed(2)}s; }
    .pf-tile { animation: pf-pop ${DUR} ease-out infinite; }
    ${tileDelays}
    `
        : `
    .pf-underline { transform-origin: ${UNDERLINE_X}px center; }
    `
    }
    .pf-heart-beat { transform-origin: ${heartX + HEART_W / 2}px ${heartY + HEART_H / 2}px; animation: pf-heartbeat ${Math.max(2, Math.round(loopDuration / 2))}s ease-in-out infinite; }
    @keyframes pf-pop {
      0%, 6%   { opacity: 0; transform: translateY(-4px); }
      18%, 88% { opacity: 1; transform: translateY(0); }
      100%     { opacity: 0; transform: translateY(0); }
    }
    @keyframes pf-wipe {
      0%, 10%  { transform: scaleX(0); }
      28%, 88% { transform: scaleX(1); }
      100%     { transform: scaleX(1); }
    }
    @keyframes pf-heartbeat {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.15); }
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${woodFrame(0, 0, W, H)}

  <!-- header + caption -->
  <g class="pf-header">${headerPixels}</g>
  <g class="pf-caption">${captionPixels}</g>

  <!-- wood-tone underline -->
  <g class="pf-underline">
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="3" fill="${PALETTE.woodMid}"/>
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="1" fill="${PALETTE.woodLight}"/>
  </g>

  <!-- social tile row -->
  ${tileNodes}
  ${emptySvg}

  <!-- attribution -->
  <text x="${attribStartX}" y="${ATTRIB_Y}" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="${ATTRIB_FONT}" font-style="italic">${escapeXml(fitAttribLeft.text)}</text>
  <g class="pf-heart-beat">${renderPixelGrid(SPRITE_HEART, PIXEL_PALETTE, HEART_SCALE_ATTRIB, heartX, heartY)}</g>
  <text x="${rightX}" y="${ATTRIB_Y}" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="${ATTRIB_FONT}" font-style="italic">${escapeXml(fitAttribRight.text)}</text>
</svg>`;
}

const template: SvgTemplate = {
  id: "pixelfarm-footer",
  name: "Quaint Friendship",
  description:
    "Cozy farming-sim footer: wood-framed parchment, pixel-font FRIENDSHIP heading, slim-framed social tiles (platform name + handle), and a beating-heart ryme.md attribution.",
  kind: "svg",
  category: "footer",
  family: "pixelfarm",
  width: W,
  height: H,
  duration: 6,
  fields: ["name", "socials"],
  renderSvg,
};

export default template;
