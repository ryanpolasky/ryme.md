import type {
  CanvasTemplate,
  Ctx2D,
  ProfileInfo,
  TemplateTheme,
} from "../types";

const SANS = `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const MONO = `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace`;

function roundRect(
  ctx: Ctx2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function socialsLine(info: ProfileInfo): string {
  if (!info.socials.length) return "";
  return info.socials.map((s) => s.value).join("    ");
}

function renderFrame(
  ctx: Ctx2D,
  t: number,
  info: ProfileInfo,
  theme: TemplateTheme,
) {
  const W = 800;
  const H = 300;
  const DUR = 8; // seconds, must match template.duration
  const phase = (t / DUR) * Math.PI * 2;

  // 1. Solid base
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // 2. Mesh gradient blobs (blurred)
  ctx.save();
  // 'filter' is on both Canvas and OffscreenCanvas 2D contexts in modern browsers.
  ctx.filter = "blur(60px)";

  const blobs: { color: string; baseX: number; baseY: number; r: number; spd: number }[] = [
    { color: theme.accent, baseX: W * 0.28, baseY: H * 0.55, r: 220, spd: 1 },
    { color: "#22d3ee", baseX: W * 0.72, baseY: H * 0.45, r: 240, spd: 0.8 },
    { color: "#f472b6", baseX: W * 0.5, baseY: H * 1.05, r: 200, spd: 1.2 },
  ];
  for (const b of blobs) {
    const x = b.baseX + Math.cos(phase * b.spd) * 60;
    const y = b.baseY + Math.sin(phase * b.spd * 0.9) * 40;
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

  // 3. Subtle vignette
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.9);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // 4. Glass card
  const cardW = 660;
  const cardH = 200;
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;
  // Card shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.restore();
  // Card border
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, 18);
  ctx.stroke();
  // Inner highlight
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, cardX + 1.5, cardY + 1.5, cardW - 3, cardH - 3, 17);
  ctx.stroke();

  // 5. Subtle particles
  const particleCount = 18;
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

  // 6. Text content
  const cx = W / 2;
  let ty = cardY + 56;

  // Name
  ctx.fillStyle = theme.fg;
  ctx.font = `600 38px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(info.name || "Your Name", cx, ty);
  ty += 8;

  // Subtitle (role · org)
  const subtitleParts = [info.role, info.org].filter(Boolean);
  if (subtitleParts.length) {
    ty += 28;
    ctx.fillStyle = theme.muted;
    ctx.font = `500 15px ${SANS}`;
    ctx.fillText(subtitleParts.join("  ·  "), cx, ty);
  }

  // Tagline
  if (info.tagline) {
    ty += 28;
    ctx.fillStyle = rgba(theme.fg, 0.7);
    ctx.font = `italic 400 13px ${SANS}`;
    ctx.fillText(info.tagline, cx, ty);
  }

  // Socials
  const socials = socialsLine(info);
  if (socials) {
    ty += 38;
    ctx.fillStyle = theme.muted;
    ctx.font = `500 11px ${MONO}`;
    ctx.fillText(socials, cx, ty);
  }

  // 7. Outer canvas border (rounded)
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 14);
  ctx.stroke();
}

const template: CanvasTemplate = {
  id: "glass-banner",
  name: "Glass Banner",
  description:
    "Animated mesh gradient drifting behind a glassmorphic card. Soft, designed, low-energy. Renders to GIF.",
  kind: "canvas",
  width: 800,
  height: 300,
  fps: 24,
  duration: 8,
  defaultTheme: {
    bg: "#0b0b12",
    fg: "#f7f7fb",
    accent: "#7c3aed",
    muted: "#a5a5b3",
  },
  renderFrame,
};

export default template;
