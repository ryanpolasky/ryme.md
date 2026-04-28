import type { Ctx2D } from "./types";

export const SANS = `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
export const MONO = `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace`;

export function roundRect(
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

export function hexToRgb(hex: string): [number, number, number] {
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

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Truncate `text` to fit within `maxWidth` using the current `ctx.font`.
 * Appends an ellipsis when truncation occurs. Caller is responsible for
 * setting ctx.font before calling.
 */
export function truncateByMeasure(
  ctx: Ctx2D,
  text: string,
  maxWidth: number,
): string {
  if (!text) return text;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s.trimEnd() + "…";
}

/**
 * Try a list of font sizes (largest first); set `ctx.font` to the largest
 * size at which `text` fits within `maxWidth`. If none fit, falls back to
 * the smallest size and truncates `text` with an ellipsis.
 *
 * `fontFn` builds a CSS font shorthand from a px size.
 */
export function fitFontSize(
  ctx: Ctx2D,
  text: string,
  maxWidth: number,
  fontFn: (size: number) => string,
  sizes: number[],
): { text: string; size: number; font: string } {
  for (const size of sizes) {
    const font = fontFn(size);
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) {
      return { text, size, font };
    }
  }
  const min = sizes[sizes.length - 1];
  const font = fontFn(min);
  ctx.font = font;
  return { text: truncateByMeasure(ctx, text, maxWidth), size: min, font };
}

/**
 * Canvas equivalent of fitUniformFontSize. Find the largest size in `sizes`
 * such that every string in `texts` fits within `maxWidth` when rendered
 * with `fontFn(size)`. At the smallest size, still-overflowing entries get
 * truncated with an ellipsis.
 *
 * Side-effect: leaves `ctx.font` set to the chosen size's font shorthand.
 */
export function fitUniformFontSize(
  ctx: Ctx2D,
  texts: string[],
  maxWidth: number,
  fontFn: (size: number) => string,
  sizes: number[],
): { texts: string[]; size: number; font: string } {
  if (texts.length === 0) {
    const size = sizes[0];
    const font = fontFn(size);
    ctx.font = font;
    return { texts, size, font };
  }
  for (const size of sizes) {
    const font = fontFn(size);
    ctx.font = font;
    if (texts.every((t) => ctx.measureText(t).width <= maxWidth)) {
      return { texts, size, font };
    }
  }
  const min = sizes[sizes.length - 1];
  const font = fontFn(min);
  ctx.font = font;
  return {
    texts: texts.map((t) => truncateByMeasure(ctx, t, maxWidth)),
    size: min,
    font,
  };
}

// Wrap text to a max pixel width using current ctx.font. Returns lines + total width.
export function wrapTextByWidth(
  ctx: Ctx2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  if (!text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? current + " " + w : w;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (lines.length >= maxLines) {
        current = "";
        break;
      }
      current = w;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Add ellipsis if truncated
  if (lines.length === maxLines) {
    const used = lines.join(" ").split(/\s+/).length;
    if (used < words.length) {
      const last = lines[lines.length - 1];
      // Trim until "...": fits
      let trimmed = last;
      while (
        ctx.measureText(trimmed + "…").width > maxWidth &&
        trimmed.length > 1
      ) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[lines.length - 1] = trimmed + "…";
    }
  }
  return lines;
}
