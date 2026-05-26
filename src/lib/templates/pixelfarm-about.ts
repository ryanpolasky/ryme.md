import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { wrapByChars } from "../text-utils";
import {
  PALETTE,
  PIXEL_PALETTE,
  SPRITE_FLOWER,
  SPRITE_LEAF,
  escapeXml,
  frameInner,
  renderPixelGrid,
  woodFrame,
} from "./pixelfarm-shared";
import {
  PIXEL_FONT_H,
  measurePixelText,
  pixelText,
} from "./pixelfarm-font";

/**
 * Quaint about-card.
 *
 * Single wood-framed parchment panel. Pixel-font "ABOUT" header on the
 * left with a wood-tone underline, then the bio body wrapped to several
 * monospace lines. A leaf accent sits in the top-right corner; a small
 * flower decoration row anchors the bottom.
 *
 * Height grows to fit the wrapped bio via `intrinsicHeight` so a longer
 * blurb doesn't get clipped or run into the bottom edge.
 *
 * Font choice mirrors the header: pixel-font for the section heading
 * (high impact, low character count), monospace for the body so the
 * actual prose stays readable.
 */

const W = 800;
const PAD = 28;

// Header settings -- scale 4 is roughly the visual weight of a 28px sans
// heading and centers nicely on a 200-ish-tall card.
const HEADER_TEXT = "ABOUT";
const HEADER_SCALE = 4;
const HEADER_H = PIXEL_FONT_H * HEADER_SCALE; // 28
const HEADER_W = measurePixelText(HEADER_TEXT, HEADER_SCALE);

// Body settings.
const BIO_SIZE = 14;
const BIO_LINE_H = 22;
const BIO_MAX_LINES = 4;

// Layout gaps.
const PAD_TOP = 24;
const HEADER_TO_UNDERLINE = 8;
const UNDERLINE_H = 3;
const UNDERLINE_TO_BODY = 16;
const BODY_BOTTOM_PAD = 24;

function computeLayout(info: ProfileInfo) {
  const bioRaw = (info.bio || "").trim();
  const inner = frameInner(0, 0, W, 0); // height irrelevant for x/w
  // ui-monospace char width is ~0.62 of the font size in practice, and
  // we apply `letter-spacing="0.5"` on the body text which adds another
  // 0.5px per glyph. The old 0.6 estimate undercounted and let long
  // words drift past the right edge. SAFE_RIGHT_PAD keeps a small
  // cushion so a final glyph never quite kisses the frame.
  const SAFE_RIGHT_PAD = 12;
  const bioBudget = inner.w - PAD * 2 - SAFE_RIGHT_PAD;
  const charPx = BIO_SIZE * 0.62 + 0.5;
  const bioCharsPerLine = Math.max(
    20,
    Math.floor(bioBudget / charPx),
  );
  const bioLines = bioRaw
    ? wrapByChars(bioRaw, bioCharsPerLine, BIO_MAX_LINES)
    : ["No bio yet -- pin one in the editor to fill this space."];

  const contentH =
    HEADER_H +
    HEADER_TO_UNDERLINE +
    UNDERLINE_H +
    UNDERLINE_TO_BODY +
    bioLines.length * BIO_LINE_H;
  const H = PAD_TOP + contentH + BODY_BOTTOM_PAD;

  return { H, bioLines };
}

function renderSvg(
  info: ProfileInfo,
  _theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const { H, bioLines } = computeLayout(info);
  const inner = frameInner(0, 0, W, H);

  // Header: pixel-font ABOUT, anchored top-left inside the parchment.
  const HEADER_X = inner.x + PAD;
  const HEADER_Y = inner.y + PAD_TOP;
  const headerPixels = pixelText(
    HEADER_TEXT,
    HEADER_SCALE,
    HEADER_X,
    HEADER_Y,
    PALETTE.ink,
  ).svg;

  // Underline: short wood-tone bar tracking the header width exactly.
  const UNDERLINE_X = HEADER_X;
  const UNDERLINE_Y = HEADER_Y + HEADER_H + HEADER_TO_UNDERLINE;
  const UNDERLINE_W = HEADER_W;

  // Body: each wrapped line is its own `<text>` so we can stagger fade-ins.
  const BODY_TOP =
    UNDERLINE_Y + UNDERLINE_H + UNDERLINE_TO_BODY + Math.round(BIO_SIZE * 0.82);
  const bodyNodes = bioLines
    .map((line, i) => {
      const y = BODY_TOP + i * BIO_LINE_H;
      return `<text class="pf-line pf-line-${i}" x="${HEADER_X}" y="${y}" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="${BIO_SIZE}" font-weight="500" letter-spacing="0.5">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  // Top-right leaf accent -- breaks up the otherwise-empty top-right
  // corner without competing with the heading.
  const LEAF_SCALE = 3;
  const LEAF_W = SPRITE_LEAF[0].length * LEAF_SCALE;
  const LEAF_H = SPRITE_LEAF.length * LEAF_SCALE;
  const LEAF_X = inner.x + inner.w - PAD - LEAF_W;
  const LEAF_Y = inner.y + PAD_TOP - 2;
  const leafSvg = renderPixelGrid(
    SPRITE_LEAF,
    PIXEL_PALETTE,
    LEAF_SCALE,
    LEAF_X,
    LEAF_Y,
  );

  // Bottom-right flower accent (mirror of the leaf, sized smaller).
  const FLOWER_SCALE = 2;
  const FLOWER_W = SPRITE_FLOWER[0].length * FLOWER_SCALE;
  const FLOWER_H = SPRITE_FLOWER.length * FLOWER_SCALE;
  const FLOWER_X = inner.x + inner.w - PAD - FLOWER_W;
  const FLOWER_Y = inner.y + inner.h - BODY_BOTTOM_PAD + 6 - FLOWER_H;
  const flowerSvg = renderPixelGrid(
    SPRITE_FLOWER,
    PIXEL_PALETTE,
    FLOWER_SCALE,
    FLOWER_X,
    FLOWER_Y,
  );

  // Animations: smooth ease-out for content reveal. The leaf gets a
  // gentle idle bob so the corner isn't dead.
  const lineDelays = bioLines
    .map(
      (_, i) =>
        `.pf-line-${i} { animation-delay: ${(loopDuration * (0.15 + i * 0.05)).toFixed(2)}s; }`,
    )
    .join("\n    ");

  const css = `
    .pf-leaf { transform-origin: ${LEAF_X + LEAF_W / 2}px ${LEAF_Y + LEAF_H / 2}px; animation: pf-bob ${Math.max(2, Math.round(loopDuration / 2))}s ease-in-out infinite; }
    ${
      loopText
        ? `
    .pf-header { animation: pf-pop ${DUR} ease-out infinite; }
    .pf-underline { animation: pf-wipe ${DUR} ease-out infinite; transform-origin: ${UNDERLINE_X}px center; }
    .pf-line { animation: pf-pop ${DUR} ease-out infinite; }
    ${lineDelays}
    `
        : `
    .pf-underline { transform-origin: ${UNDERLINE_X}px center; }
    `
    }
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
    @keyframes pf-bob {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-2px); }
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${woodFrame(0, 0, W, H)}

  <!-- header -->
  <g class="pf-header">${headerPixels}</g>

  <!-- wood-tone underline -->
  <g class="pf-underline">
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="3" fill="${PALETTE.woodMid}"/>
    <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="1" fill="${PALETTE.woodLight}"/>
  </g>

  <!-- body (wrapped bio) -->
  ${bodyNodes}

  <!-- top-right leaf accent -->
  <g class="pf-leaf">${leafSvg}</g>

  <!-- bottom-right flower accent -->
  ${flowerSvg}
</svg>`;
}

const template: SvgTemplate = {
  id: "pixelfarm-about",
  name: "Quaint About",
  description:
    "Cozy about-card: wood-framed parchment, pixel-font ABOUT heading, monospace wrapped bio, leaf and flower corner accents.",
  kind: "svg",
  category: "about",
  family: "pixelfarm",
  width: W,
  height: 220,
  duration: 6,
  fields: ["bio"],
  intrinsicHeight: (info) => computeLayout(info).H,
  renderSvg,
};

export default template;
