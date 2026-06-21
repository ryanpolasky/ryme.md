// Shared building blocks for the "celestial" family -- a night-sky star chart.
//
// Colors come from the editor's theme pickers via cePalette(theme): fg = bright
// stars + body text, muted = dim stars + secondary text, accent = the "gold"
// constellation / rule / sparkle role, and bg drives the night-sky gradient
// (top/mid/bottom are shaded from it). This mirrors the glass family so the
// four color selectors actually affect the render.

import type { TemplateTheme } from "../types";

export const SERIF = "Georgia, 'Times New Roman', serif";

/** Star-chart palette derived from the four theme slots. */
export interface CePalette {
  star: string;
  starDim: string;
  accent: string;
  accentLight: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
}

/** Lighten (amt > 0) or darken (amt < 0) a #rgb / #rrggbb hex by a 0..1 ratio. */
export function shade(hex: string, amt: number): string {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const num = parseInt(full, 16);
  const f = (c: number) =>
    Math.max(
      0,
      Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))),
    );
  const r = f((num >> 16) & 0xff);
  const g = f((num >> 8) & 0xff);
  const b = f(num & 0xff);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Map the editor theme onto the celestial star-chart palette. */
export function cePalette(theme: TemplateTheme): CePalette {
  return {
    star: theme.fg,
    starDim: theme.muted,
    accent: theme.accent,
    accentLight: shade(theme.accent, 0.34),
    skyTop: shade(theme.bg, 0.1),
    skyMid: shade(theme.bg, -0.04),
    skyBottom: shade(theme.bg, -0.5),
  };
}

export const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Deterministic PRNG so each section's starfield is stable across renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `<defs>` (sky gradient + vignette) + the graduated night-sky fill + a
 * seeded twinkling starfield, all colored from the supplied palette. Place
 * this immediately after the opening `<svg>`; render your content next, then
 * `vignette(W, H)` so the corner darkening sits on top. Reusing the ceSky /
 * ceVig ids across sections is safe because each template renders to its own
 * standalone SVG document.
 *
 * The starfield twinkle is ambient (like a cursor blink), so it animates
 * regardless of the loopText setting.
 */
export function skyBackdrop(
  P: CePalette,
  W: number,
  H: number,
  seed = 0x9e3779b9,
  starCount = 40,
): string {
  const rng = mulberry32(seed);
  const stars: string[] = [];
  for (let i = 0; i < starCount; i++) {
    const x = Math.round(rng() * W);
    const y = Math.round(rng() * H);
    const r = (rng() * 1.2 + 0.4).toFixed(2);
    const baseOp = (rng() * 0.5 + 0.3).toFixed(2);
    const dur = (rng() * 2.5 + 2).toFixed(2);
    const delay = (rng() * 3).toFixed(2);
    const col = rng() > 0.85 ? P.accent : P.star;
    stars.push(
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${baseOp}" style="animation: ceTwinkle ${dur}s ease-in-out ${delay}s infinite"/>`,
    );
  }
  return `<defs>
    <linearGradient id="ceSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.skyTop}"/>
      <stop offset="0.55" stop-color="${P.skyMid}"/>
      <stop offset="1" stop-color="${P.skyBottom}"/>
    </linearGradient>
    <radialGradient id="ceVig" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0.6" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ceSky)"/>
  ${stars.join("\n  ")}`;
}

/** The corner-darkening vignette rect. Draw AFTER the backdrop decorations. */
export function vignette(W: number, H: number): string {
  return `<rect width="${W}" height="${H}" fill="url(#ceVig)"/>`;
}

/** A small 4-point "sparkle" star centered at (cx, cy). */
export function sparkle(
  cx: number,
  cy: number,
  r: number,
  color: string,
): string {
  const k = r * 0.26;
  return `<path d="M ${cx} ${cy - r} L ${cx + k} ${cy - k} L ${cx + r} ${cy} L ${cx + k} ${cy + k} L ${cx} ${cy + r} L ${cx - k} ${cy + k} L ${cx - r} ${cy} L ${cx - k} ${cy - k} Z" fill="${color}"/>`;
}

/**
 * Keyframes every celestial section relies on:
 * - ceTwinkle: starfield + accent-dot pulsing (always on).
 * - ceReveal:  content fade-up, cycled when loopText is on.
 * - ceWipe:    horizontal rule wipe (transform-origin left center).
 */
export const BASE_KEYFRAMES = `
    @keyframes ceTwinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
    @keyframes ceReveal { 0%, 5% { opacity: 0; transform: translateY(6px); } 18%, 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; } }
    @keyframes ceWipe { 0%, 8% { transform: scaleX(0); } 24%, 90% { transform: scaleX(1); } 100% { transform: scaleX(1); } }
`;
