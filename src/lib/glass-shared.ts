import type { Ctx2D, TemplateTheme } from "./types";
import { rgba, roundRect } from "./canvas-utils";

// Fixed text colors for the glass family. Glass templates use a mesh-gradient
// background with a dark vignette, so a near-white body text and a slightly
// dimmer secondary tone read consistently on top regardless of which mesh
// colors the user picks. Text colors are intentionally NOT routed through
// theme.fg / theme.muted -- those control mesh blobs (see drawGlassBackground).
export const GLASS_TEXT = "#f5f5f7";
export const GLASS_TEXT_MUTED = "#a8a8b3";

// Shared background renderer for all "glass" family canvas templates.
// Draws: solid base, blurred mesh blobs (animated), vignette, subtle particles.
//
// The three mesh blobs are driven by:
//   blob 1 -> theme.accent
//   blob 2 -> theme.fg
//   blob 3 -> theme.muted
// This lets the user dial in every "spacy" color through the editor's color
// pickers. The fg/muted swatches no longer affect text rendering in glass.
export function drawGlassBackground(
  ctx: Ctx2D,
  t: number,
  dur: number,
  theme: TemplateTheme,
  W: number,
  H: number,
) {
  const phase = (t / dur) * Math.PI * 2;

  // Solid base
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // Mesh gradient blobs
  ctx.save();
  ctx.filter = "blur(60px)";
  const blobs: { color: string; bx: number; by: number; r: number; spd: number }[] = [
    { color: theme.accent, bx: W * 0.28, by: H * 0.55, r: 220, spd: 1 },
    { color: theme.fg, bx: W * 0.72, by: H * 0.45, r: 240, spd: 0.8 },
    { color: theme.muted, bx: W * 0.5, by: H * 1.05, r: 200, spd: 1.2 },
  ];
  for (const b of blobs) {
    const x = b.bx + Math.cos(phase * b.spd) * 60;
    const y = b.by + Math.sin(phase * b.spd * 0.9) * 40;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r);
    grad.addColorStop(0, rgba(b.color, 0.55));
    grad.addColorStop(0.6, rgba(b.color, 0.18));
    grad.addColorStop(1, rgba(b.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Vignette
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.4,
    W / 2,
    H / 2,
    H * 0.9,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Particles
  const particleCount = Math.max(8, Math.floor((W * H) / 12000));
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 12.9898;
    const baseX = ((Math.sin(seed) * 43758.5453) % 1) * W;
    const baseY = ((Math.sin(seed * 1.7) * 12345.678) % 1) * H;
    const px = (((baseX + 1) * 0.5) * W + Math.cos(phase + i) * 12) % W;
    const py = (((baseY + 1) * 0.5) * H + Math.sin(phase * 0.7 + i) * 8) % H;
    const alpha = 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(phase * 1.3 + i));
    ctx.fillStyle = rgba("#ffffff", alpha);
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Glass card: shadowed translucent panel with rounded corners + border + inner highlight.
export function drawGlassCard(
  ctx: Ctx2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 18,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, radius - 1);
  ctx.stroke();
}

// Outer canvas border (drawn last)
export function drawCanvasFrame(ctx: Ctx2D, W: number, H: number, radius = 14) {
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, radius);
  ctx.stroke();
}
