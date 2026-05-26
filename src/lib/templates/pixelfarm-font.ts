/**
 * 5x7 bitmap pixel font for the Pixel Harvest family.
 *
 * Each glyph is a 7-row x 5-col grid where "X" = filled pixel, "." = empty.
 * Rendered as a stream of `<rect>` elements -- one per filled pixel --
 * which is the SAME technique used by `renderPixelGrid` for the sprite
 * art in `pixelfarm-shared.ts`. That means text and decorative sprites
 * are visually made of the same "pixels" at the same scale, which is
 * what makes the family read coherently as pixel-art at a glance.
 *
 * Why a custom bitmap font instead of a web font?
 *   - These SVGs get embedded in GitHub README files, where external
 *     `@font-face` URLs are sandboxed out and Google Fonts won't load.
 *     So Press Start 2P / VT323 / Silkscreen aren't viable.
 *   - System monospace fonts don't read as pixel-art, just as code.
 *   - Inlining a web font as base64 would bloat the SVG by 30-100kB.
 *   - Bitmap rendering with rects is small (~1-3kB for a header's worth
 *     of text), perfectly crisp at any DPI, and is genuinely pixel art
 *     instead of a smoothed approximation.
 *
 * Tracking (gap between glyphs) is 1 logical pixel, so each glyph slot
 * is 6 wide. At scale=4, that's 24 CSS px per character.
 *
 * Coverage: uppercase A-Z, digits 0-9, space, and the punctuation that
 * shows up in names + greetings + labels: ' . , - ! : ? / & middle dot.
 * Any unsupported character falls back to "?" so the renderer never
 * crashes on weird input.
 */

export const PIXEL_FONT_W = 5;
export const PIXEL_FONT_H = 7;
export const PIXEL_FONT_TRACKING = 1; // pixels of space between glyphs
export const PIXEL_FONT_CELL_W = PIXEL_FONT_W + PIXEL_FONT_TRACKING; // 6

export const PIXEL_FONT: Record<string, readonly string[]> = {
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  B: ["XXXX.", "X...X", "X...X", "XXXX.", "X...X", "X...X", "XXXX."],
  C: [".XXXX", "X....", "X....", "X....", "X....", "X....", ".XXXX"],
  D: ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
  F: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "X...."],
  G: [".XXXX", "X....", "X....", "X..XX", "X...X", "X...X", ".XXX."],
  H: ["X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  I: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "XXXXX"],
  J: ["..XXX", "...X.", "...X.", "...X.", "...X.", "X..X.", ".XX.."],
  K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
  L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
  M: ["X...X", "XX.XX", "X.X.X", "X.X.X", "X...X", "X...X", "X...X"],
  N: ["X...X", "XX..X", "X.X.X", "X.X.X", "X.X.X", "X..XX", "X...X"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  P: ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
  Q: [".XXX.", "X...X", "X...X", "X...X", "X.X.X", "X..XX", ".XX.X"],
  R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
  S: [".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."],
  T: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."],
  U: ["X...X", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  V: ["X...X", "X...X", "X...X", "X...X", "X...X", ".X.X.", "..X.."],
  W: ["X...X", "X...X", "X...X", "X.X.X", "X.X.X", "XX.XX", "X...X"],
  X: ["X...X", "X...X", ".X.X.", "..X..", ".X.X.", "X...X", "X...X"],
  Y: ["X...X", "X...X", ".X.X.", "..X..", "..X..", "..X..", "..X.."],
  Z: ["XXXXX", "....X", "...X.", "..X..", ".X...", "X....", "XXXXX"],

  "0": [".XXX.", "X...X", "X..XX", "X.X.X", "XX..X", "X...X", ".XXX."],
  "1": ["..X..", ".XX..", "..X..", "..X..", "..X..", "..X..", ".XXX."],
  "2": [".XXX.", "X...X", "....X", "...X.", "..X..", ".X...", "XXXXX"],
  "3": ["XXXX.", "....X", "....X", ".XXX.", "....X", "....X", "XXXX."],
  "4": ["...X.", "..XX.", ".X.X.", "X..X.", "XXXXX", "...X.", "...X."],
  "5": ["XXXXX", "X....", "XXXX.", "....X", "....X", "....X", "XXXX."],
  "6": [".XXX.", "X....", "X....", "XXXX.", "X...X", "X...X", ".XXX."],
  "7": ["XXXXX", "....X", "...X.", "..X..", ".X...", ".X...", ".X..."],
  "8": [".XXX.", "X...X", "X...X", ".XXX.", "X...X", "X...X", ".XXX."],
  "9": [".XXX.", "X...X", "X...X", ".XXXX", "....X", "....X", ".XXX."],

  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", "..XX.", "..XX."],
  ",": [".....", ".....", ".....", ".....", "..XX.", "..XX.", ".X..."],
  "'": ["..X..", "..X..", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", ".XXX.", ".....", ".....", "....."],
  "!": ["..X..", "..X..", "..X..", "..X..", "..X..", ".....", "..X.."],
  ":": [".....", "..XX.", "..XX.", ".....", "..XX.", "..XX.", "....."],
  "?": [".XXX.", "X...X", "....X", "..XX.", "..X..", ".....", "..X.."],
  "/": ["....X", "...X.", "...X.", "..X..", ".X...", ".X...", "X...."],
  "&": [".XX..", "X..X.", "X.X..", ".X...", "X.X.X", "X..X.", ".XX.X"],
  // U+00B7 MIDDLE DOT (·)
  "\u00B7": [".....", ".....", ".....", "..XX.", "..XX.", ".....", "....."],
};

const FALLBACK_GLYPH = PIXEL_FONT["?"];

/**
 * Render text using the 5x7 bitmap font as a string of `<rect>`
 * elements. Each filled glyph pixel becomes a `scale x scale` rect.
 *
 * `text` is uppercased internally (the font has no lowercase glyphs).
 * Unknown characters fall back to "?" so unexpected input still renders.
 */
export function pixelText(
  text: string,
  scale: number,
  x: number,
  y: number,
  color: string,
): { svg: string; width: number; height: number } {
  const parts: string[] = [];
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = PIXEL_FONT[ch] ?? FALLBACK_GLYPH;
    const glyphX = x + i * PIXEL_FONT_CELL_W * scale;
    for (let row = 0; row < PIXEL_FONT_H; row++) {
      const line = glyph[row];
      for (let col = 0; col < PIXEL_FONT_W; col++) {
        if (line[col] === "X") {
          parts.push(
            `<rect x="${glyphX + col * scale}" y="${y + row * scale}" width="${scale}" height="${scale}" fill="${color}"/>`,
          );
        }
      }
    }
  }
  // Total width excludes the trailing tracking that would have followed
  // the last glyph -- the row ends at the right edge of the last glyph.
  const width =
    upper.length === 0
      ? 0
      : upper.length * PIXEL_FONT_CELL_W * scale - PIXEL_FONT_TRACKING * scale;
  return {
    svg: parts.join(""),
    width,
    height: PIXEL_FONT_H * scale,
  };
}

/**
 * Compute the rendered width of `text` at a given scale without actually
 * emitting any SVG. Useful for centering and auto-fit logic.
 */
export function measurePixelText(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * PIXEL_FONT_CELL_W * scale - PIXEL_FONT_TRACKING * scale;
}

/**
 * Pick the largest scale in `scales` (highest first) at which `text`
 * renders within `maxWidth`. Falls through to the smallest scale if
 * none fit, so the text gets clipped rather than crashing.
 */
export function fitPixelScale(
  text: string,
  maxWidth: number,
  scales: number[],
): number {
  for (const s of scales) {
    if (measurePixelText(text, s) <= maxWidth) return s;
  }
  return scales[scales.length - 1];
}
