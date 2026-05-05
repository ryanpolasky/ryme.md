/**
 * Shared SVG building blocks for the glass family.
 *
 * The glass family was originally a canvas-rendered GIF family -- mesh
 * gradient background drifting behind a frosted card. This module is the
 * SVG port: same look, baked into a single static SVG document with CSS
 * keyframe animations so it stays animated when embedded as `<img>` in a
 * markdown file.
 *
 * Render contract -- every glass-family `renderSvg` follows the same
 * skeleton:
 *
 *   <svg ...>
 *     <style>${glassStyles(loopDuration, loopText)}</style>
 *     <defs>${glassDefs(theme)}</defs>
 *     ${glassBackground(W, H, theme)}    <!-- base + blobs + vignette + particles -->
 *     ${glassCard(...)}                  <!-- frosted panel -->
 *     <!-- template-specific content -->
 *     ${glassFrame(W, H)}                <!-- outer hairline border -->
 *   </svg>
 *
 * Camo / GitHub renderer compatibility:
 *   - `<feGaussianBlur>` is broadly supported. Camo lets it through.
 *   - `<feDropShadow>` is SVG 2; some renderers strip it, in which case
 *     the card simply loses its shadow but stays visible. Acceptable
 *     fidelity loss.
 *   - CSS animations on transforms / opacity inside `<style>` blocks
 *     work in every modern viewer (verified via the existing terminal,
 *     sleek, code, neon, blueprint families).
 */
import type { TemplateTheme } from "./types";

// Fixed text colors. Glass templates use a near-white body and a slightly
// dimmer secondary tone on top of the mesh background, so theme.fg /
// theme.muted drive blob colors instead of text. (Same convention as the
// canvas original.)
export const GLASS_TEXT = "#f5f5f7";
export const GLASS_TEXT_MUTED = "#a8a8b3";

// ---------------------------------------------------------------------------
// <defs>

/**
 * `<defs>` body. Drops the filters + radial gradients used by every glass
 * template. Emit exactly once per SVG -- ids are global to the document.
 */
export function glassDefs(theme: TemplateTheme): string {
  return `
    <filter id="g-blur" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="60"/>
    </filter>
    <filter id="g-card-shadow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <filter id="g-mini-shadow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <radialGradient id="g-blob1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="${theme.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-blob2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.fg}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="${theme.fg}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${theme.fg}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-blob3" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.muted}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="${theme.muted}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${theme.muted}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-vignette" cx="50%" cy="50%" r="65%">
      <stop offset="50%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
      <stop offset="100%" stop-color="rgb(0,0,0)" stop-opacity="0.45"/>
    </radialGradient>
  `;
}

// ---------------------------------------------------------------------------
// Background

/**
 * Solid base colour + three blurred mesh blobs (animated via CSS) +
 * vignette + a sprinkling of slowly-pulsing particle dots. Blob positions
 * mirror the canvas original (28%/55%, 72%/45%, 50%/105%) so the new SVG
 * reads as the same family at a glance.
 *
 * Particle positions are deterministic per (W, H) so identical inputs
 * produce byte-identical SVGs -- important for edge caching of
 * `/api/render` URLs.
 */
export function glassBackground(
  W: number,
  H: number,
  theme: TemplateTheme,
): string {
  const b1cx = W * 0.28;
  const b1cy = H * 0.55;
  const b2cx = W * 0.72;
  const b2cy = H * 0.45;
  const b3cx = W * 0.5;
  const b3cy = H * 1.05;

  // Particle field. Density target matches the canvas original (~one
  // particle per 12,000 pixels). Positions seed from the index so the same
  // (W, H) renders the same constellation every time.
  const count = Math.max(8, Math.floor((W * H) / 12000));
  const particles: string[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 12.9898;
    // mod-1 of a large-magnitude sin gives a deterministic 0..1 in a
    // hash-like distribution. The +1)*0.5 maps -1..1 to 0..1 cleanly.
    const fx = (((Math.sin(seed) * 43758.5453) % 1) + 1) * 0.5;
    const fy = (((Math.sin(seed * 1.7) * 12345.678) % 1) + 1) * 0.5;
    const px = Math.round(fx * W * 100) / 100;
    const py = Math.round(fy * H * 100) / 100;
    // Five staggered animation-delay buckets keep the pulsing varied
    // without exploding the CSS body length.
    const bucket = i % 5;
    particles.push(
      `<circle class="g-p p${bucket}" cx="${px}" cy="${py}" r="1.2" fill="#ffffff" opacity="0.2"/>`,
    );
  }

  return `
  <rect width="${W}" height="${H}" fill="${theme.bg}"/>
  <g filter="url(#g-blur)" class="g-blobs">
    <circle class="g-blob1" cx="${b1cx}" cy="${b1cy}" r="220" fill="url(#g-blob1)"/>
    <circle class="g-blob2" cx="${b2cx}" cy="${b2cy}" r="240" fill="url(#g-blob2)"/>
    <circle class="g-blob3" cx="${b3cx}" cy="${b3cy}" r="200" fill="url(#g-blob3)"/>
  </g>
  <rect width="${W}" height="${H}" fill="url(#g-vignette)"/>
  <g class="g-particles">${particles.join("")}</g>
  `;
}

// ---------------------------------------------------------------------------
// Card surfaces

/**
 * Frosted glass panel: drop-shadowed translucent rectangle + a 1 px outer
 * highlight + an inner 1 px highlight. Mirrors the canvas helper exactly.
 */
export function glassCard(
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 18,
): string {
  return `
  <g filter="url(#g-card-shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="rgba(255,255,255,0.04)"/>
  </g>
  <rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${radius}" ry="${radius}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" rx="${radius - 1}" ry="${radius - 1}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  `;
}

/**
 * Smaller, lighter glass panel for nested treatments (the metric tiles
 * inside `glass-github-stats`). One outline only -- the recursive
 * highlight-on-highlight effect from the larger card would compete with
 * the labels at this size.
 */
export function glassMiniCard(
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 12,
): string {
  return `
  <g filter="url(#g-mini-shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="rgba(255,255,255,0.06)"/>
  </g>
  <rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${radius}" ry="${radius}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
  `;
}

/**
 * Outer hairline frame -- always drawn last so it sits on top of any
 * blur halo that might bleed past the canvas edge.
 */
export function glassFrame(W: number, H: number, radius = 14): string {
  return `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${radius}" ry="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
}

// ---------------------------------------------------------------------------
// CSS

/**
 * The full CSS body for a glass SVG: blob drift, particle pulse. The
 * loopDuration sets the blob cycle so a slower banner has a calmer
 * background; particles always pulse on a fixed 3 s rhythm so the
 * "ambient sparkle" feels independent of the template's text cadence.
 *
 * `loopText=false` kills every animation -- the SVG renders as a single
 * still frame (matching the editor's "loop text off" preview).
 */
export function glassStyles(loopDuration: number, loopText: boolean): string {
  if (!loopText) {
    return `/* glass family: animations disabled (loopText off). */`;
  }
  const dur = `${loopDuration}s`;
  return `
    .g-blob1 { animation: g-drift1 ${dur} ease-in-out infinite; }
    .g-blob2 { animation: g-drift2 ${dur} ease-in-out infinite; }
    .g-blob3 { animation: g-drift3 ${dur} ease-in-out infinite; }
    @keyframes g-drift1 {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(40px, -25px); }
      50% { transform: translate(0, -50px); }
      75% { transform: translate(-40px, -25px); }
    }
    @keyframes g-drift2 {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(-30px, 25px); }
      50% { transform: translate(0, 50px); }
      75% { transform: translate(30px, 25px); }
    }
    @keyframes g-drift3 {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(25px, -40px); }
      50% { transform: translate(-40px, 0); }
      75% { transform: translate(25px, 40px); }
    }
    .g-p { animation: g-pulse 3s ease-in-out infinite; }
    .p1 { animation-delay: -0.6s; }
    .p2 { animation-delay: -1.2s; }
    .p3 { animation-delay: -1.8s; }
    .p4 { animation-delay: -2.4s; }
    @keyframes g-pulse {
      0%, 100% { opacity: 0.15; }
      50% { opacity: 0.32; }
    }
  `;
}

// ---------------------------------------------------------------------------
// Tiny helpers

export const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
