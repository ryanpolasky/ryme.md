/**
 * Pixel-farm family shared helpers.
 *
 * The family aims for a cozy 2D-farming-sim aesthetic (think parchment
 * dialog boxes with wood borders, chunky pixel-art icons, warm earthy
 * palette). Every visual element is composed from SVG `<rect>` elements
 * arranged on an integer grid, so the SVGs render crisp at any scale
 * without anti-aliasing fuzz on the "pixels".
 *
 * Templates in this family should:
 *   - source colors from `PALETTE` (eight earthy tones + a few skin/cloth
 *     accents for the avatar);
 *   - draw their outermost box via `woodFrame(...)` so the layered wood
 *     border stays consistent across sections;
 *   - place icons via `renderPixelGrid(...)` rather than inline rect
 *     blocks so authoring new icons is a matter of editing a string-grid
 *     literal rather than rect coordinates.
 *
 * Sprites are stored as readonly string arrays where each character maps
 * to a palette key. `'.'` is transparent; everything else is looked up in
 * the palette object passed to `renderPixelGrid`. This format reads as
 * actual pixel art in the source file so tweaks are obvious at a glance.
 */

// Eight-ish-color earthy palette. Stays tight on purpose: a small palette
// is most of what reads as "Stardew" before you ever see a font or icon.
export const PALETTE = {
  // wood frame: outer dark, mid brown band, light highlight bevel
  woodDark: "#3a2a14",
  woodMid: "#7a4a23",
  woodLight: "#a06832",
  // parchment + ink for dialog-box surfaces and body copy
  parchment: "#f4e4bc",
  parchmentDim: "#e6d3a4",
  ink: "#3d2818",
  // nature accents
  leaf: "#3e7a30",
  leafLight: "#5fa847",
  // hot accent + gold for hearts, flowers, coins
  apple: "#d04a30",
  gold: "#e8bc60",
  goldDeep: "#b88c2e",
  // sky / water cool accent
  sky: "#4a90c8",
  skyDeep: "#2f6a98",
  cloud: "#f0eee0",
  // avatar palette (skin, hair, shirt) -- only used by the farmer bust
  // sprite but lives here so all sprite authoring goes through one map
  skin: "#f1c290",
  skinShade: "#c89466",
  hair: "#5c3a1c",
  shirt: "#3d6b8c",
  shirtShade: "#2a4d68",
} as const;

export type PixelPalette = Partial<Record<string, string>>;

// Character -> palette-key map. Keeps icon source files readable: an 'R'
// in the grid string maps to PALETTE.apple, 'G' to PALETTE.leaf, etc.
// Templates can build their own palette map by spreading this and
// overriding individual keys if a sprite needs a one-off color.
export const PIXEL_PALETTE: PixelPalette = {
  K: PALETTE.woodDark,
  B: PALETTE.woodMid,
  b: PALETTE.woodLight,
  P: PALETTE.parchment,
  p: PALETTE.parchmentDim,
  I: PALETTE.ink,
  G: PALETTE.leaf,
  g: PALETTE.leafLight,
  R: PALETTE.apple,
  Y: PALETTE.gold,
  y: PALETTE.goldDeep,
  S: PALETTE.sky,
  s: PALETTE.skyDeep,
  W: PALETTE.cloud,
  F: PALETTE.skin,
  f: PALETTE.skinShade,
  H: PALETTE.hair,
  C: PALETTE.shirt,
  c: PALETTE.shirtShade,
};

export const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Render a string-grid sprite as a block of SVG `<rect>` elements.
 *
 * `grid` is one row of pixels per array entry; each character is looked
 * up in `palette` to find its fill color. `'.'` (and any unmapped char)
 * is treated as transparent.
 *
 * `scale` controls how many SVG units each "pixel" occupies (use 3-4 for
 * inline icons, 5-6 for hero sprites). `x`/`y` is the top-left of the
 * sprite in the parent SVG coordinate space.
 *
 * We deliberately emit one rect per visible pixel rather than coalescing
 * runs: it keeps the output predictable and the SVG diff-friendly when
 * icons get tweaked. Sprite sizes here are tiny (at most ~16x20) so the
 * cost is negligible.
 */
export function renderPixelGrid(
  grid: readonly string[],
  palette: PixelPalette,
  scale: number,
  x: number,
  y: number,
): string {
  const rects: string[] = [];
  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const color = palette[ch];
      if (!color) continue;
      rects.push(
        `<rect x="${x + col * scale}" y="${y + row * scale}" width="${scale}" height="${scale}" fill="${color}"/>`,
      );
    }
  }
  return rects.join("");
}

/**
 * Compute the inner content rectangle that lives inside a `woodFrame` of
 * the same outer dimensions. The frame is 8px thick on every side, so
 * content should be positioned/sized relative to this rectangle to stay
 * clear of the wood band.
 */
export function frameInner(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  return { x: x + 8, y: y + 8, w: w - 16, h: h - 16 };
}

/**
 * Compute the inner content rectangle that lives inside a `slimFrame`.
 * Mirrors `frameInner` for the thinner 3px-border helper used for nested
 * cards (stat tiles, inventory slots, etc.).
 */
export function slimFrameInner(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  return { x: x + 3, y: y + 3, w: w - 6, h: h - 6 };
}

/**
 * Nested wood card with a thinner 3px border, intended for stat tiles
 * and inventory slots that live INSIDE a `woodFrame` panel. Uses the
 * full 8px `woodFrame` here would eat too much of a 60px-tall card.
 *
 * Layers: 1px outer dark, 1px wood band, 1px inner dark, parchment-dim
 * fill. The parchment-dim shade (slightly darker than the main parchment)
 * visually separates the card from its container without needing a drop
 * shadow.
 */
export function slimFrame(
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const { woodDark, woodMid, parchmentDim } = PALETTE;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${woodDark}"/>`,
    `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" fill="${woodMid}"/>`,
    `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="${woodDark}"/>`,
    `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" fill="${parchmentDim}"/>`,
  ].join("");
}

/**
 * Stardew-style wooden dialog-box frame:
 *   - 2px outer dark border (woodDark)
 *   - 4px wood band (woodMid)
 *   - 2px inner dark border (woodDark)
 *   - parchment fill
 *
 * Total border thickness is 8px on each side; place content via
 * `frameInner(...)` to get the matching inner rect.
 *
 * The frame intentionally renders sharp corners (no rx/ry) so it reads
 * as pixel art rather than glassy/rounded UI. The very outermost pixels
 * at each corner are nibbled to bg-cream to suggest a 9-slice bevel.
 */
export function woodFrame(
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const { woodDark, woodMid, woodLight, parchment } = PALETTE;
  // Layered bands, drawn outer to inner so the inner ones cover the
  // outer fills inside the visible interior.
  const layers = [
    // outer dark border
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${woodDark}"/>`,
    // wood band
    `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="${woodMid}"/>`,
    // 1px top + left highlight on the wood band for a light-from-NW bevel
    `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="1" fill="${woodLight}"/>`,
    `<rect x="${x + 2}" y="${y + 2}" width="1" height="${h - 4}" fill="${woodLight}"/>`,
    // inner dark border
    `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="${woodDark}"/>`,
    // parchment fill
    `<rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" fill="${parchment}"/>`,
  ];
  return layers.join("");
}

// ---------------------------------------------------------------------------
// Sprite library
//
// Each sprite is a `readonly string[]` so the source file reads as pixel
// art (one row per array entry, one char per pixel). Lookup via the
// `PIXEL_PALETTE` map -- see the legend at the top of this file for the
// char -> color binding.

// Glowing sun, 9x9. Spikes alternate with the body so we have somewhere
// to attach a pulse animation if a template wants one.
export const SPRITE_SUN: readonly string[] = [
  "....Y....",
  "....Y....",
  "..y.y.y..",
  "...YYY...",
  "YYYYYYYYY",
  "...YYY...",
  "..y.y.y..",
  "....Y....",
  "....Y....",
];

// Small fluffy cloud, 13x5.
export const SPRITE_CLOUD: readonly string[] = [
  "...WWWW......",
  ".WWWWWWWW....",
  "WWWWWWWWWWW..",
  "WWWWWWWWWWWWW",
  ".WWWWWWWWWWW.",
];

// Single leaf, 7x7. Pairs nicely with the flower or as a decorative
// accent next to skill labels.
export const SPRITE_LEAF: readonly string[] = [
  "....g..",
  "...gG..",
  "..gGGG.",
  ".gGGGGG",
  "GGGGGGg",
  "GGGGg..",
  "I......",
];

// 5x6 flower with a short stem; uses apple + gold + leaf so it pops on
// parchment without being a Mario powerup level of saturation.
export const SPRITE_FLOWER: readonly string[] = [
  ".R.R.",
  "RyRyR",
  ".RYR.",
  "..G..",
  ".G.G.",
  "..G..",
];

// 7x6 heart (filled). Used as the language-affinity readout in stats
// (filled-vs-empty heart rows mimic Stardew's friendship UI).
export const SPRITE_HEART: readonly string[] = [
  ".RR.RR.",
  "RRRRRRR",
  "RRRRRRR",
  ".RRRRR.",
  "..RRR..",
  "...R...",
];

// 7x6 empty heart (outline) for the unfilled half of a heart row.
export const SPRITE_HEART_EMPTY: readonly string[] = [
  ".II.II.",
  "I.I.I.I",
  "I.....I",
  ".I...I.",
  "..I.I..",
  "...I...",
];

// 5x5 gold coin. Looks like a circle through pixel-art rounding.
export const SPRITE_COIN: readonly string[] = [
  ".YYY.",
  "YyYyY",
  "YYYYY",
  "YyYyY",
  ".YYY.",
];

// 16x20 farmer/dev bust: straw hat, smiling face, blue overalls.
// Generic enough to read as "person on the cover of a farming game"
// without standing in for any specific character.
export const SPRITE_FARMER: readonly string[] = [
  "................",
  ".....YYYYYY.....",
  "....YyYYYYyY....",
  "...YyyYYYYyyY...",
  "..YYYYYYYYYYYY..",
  ".YYYYYYYYYYYYYY.",
  "...FFFFFFFFFF...",
  "..FFFfffffffFF..",
  "..FFIIFFFFIIFF..",
  "..FFffFFFFffFF..",
  "..FFFFFRRFFFFFF.",
  "...FFFFFFFFFF...",
  "....FfFFFFfF....",
  "...CCCFFFFCCC...",
  "..CCCCCCCCCCCC..",
  ".CCCCCCCCCCCCCC.",
  "CCCCCCCCCCCCCCCC",
  "CcccCCCCCCCCcccC",
  "Ccc..CCCCCC..ccC",
  "Ccc..cCCCCc..ccC",
];

// 3x4 fence post. Used as a row decoration along the bottom of panels
// when a template wants a "garden bed" feel.
export const SPRITE_FENCE_POST: readonly string[] = [
  "BBB",
  "BbB",
  "BbB",
  "BBB",
];

/**
 * Lightweight "coming soon" placeholder used by the not-yet-implemented
 * sections in this family. Renders a wood-framed parchment with a short
 * category label centered inside. Keeps the family visible in the editor
 * (so users can preview the planned five-section stack) without
 * pretending the section is done.
 *
 * Replace each section's `renderSvg` with a real implementation as it
 * gets built; the call to this helper goes away naturally then.
 */
export function placeholderSvg(
  categoryLabel: string,
  width = 800,
  height = 200,
): string {
  const cx = width / 2;
  const cy = height / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${woodFrame(0, 0, width, height)}
  <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="${PALETTE.ink}" font-family="ui-monospace, monospace" font-size="20" font-weight="700" letter-spacing="3">COMING SOON</text>
  <text x="${cx}" y="${cy + 22}" text-anchor="middle" fill="${PALETTE.woodMid}" font-family="ui-monospace, monospace" font-size="12" font-weight="500" letter-spacing="3">QUAINT &middot; ${categoryLabel.toUpperCase()}</text>
</svg>`;
}
