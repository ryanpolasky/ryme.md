/**
 * Shared text utilities used by both SVG and canvas templates to handle
 * variable-length user input gracefully (truncate with ellipsis, wrap, or
 * auto-shrink font size to fit).
 *
 * SVG templates can't measure rendered text without a DOM, so they use the
 * heuristic widths below. Canvas templates that have access to ctx should
 * prefer the measured helpers in `canvas-utils`.
 */

/**
 * Average per-character width as a fraction of the font size (em).
 * - `mono`: monospace (JetBrains, SF Mono) — every character is fixed at ~0.6em
 * - `sans`: proportional sans (Inter) — average glyph is ~0.55em wide
 *
 * Slightly conservative (leaning wide) so we under-fill rather than overflow.
 */
export const CHAR_WIDTH_EM = {
  mono: 0.6,
  sans: 0.55,
} as const;

export type FontKind = keyof typeof CHAR_WIDTH_EM;

export function approxTextWidth(
  text: string,
  fontSize: number,
  kind: FontKind = "sans",
): number {
  return text.length * fontSize * CHAR_WIDTH_EM[kind];
}

/**
 * Truncate `text` to fit within `maxWidth` at `fontSize`. Adds an ellipsis
 * when truncation occurs. Tries to break at a word boundary if one is
 * reasonably close to the cut point (>60% of the budget) for prettier output.
 */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  kind: FontKind = "sans",
): string {
  if (!text) return text;
  const charPx = fontSize * CHAR_WIDTH_EM[kind];
  const maxChars = Math.floor(maxWidth / charPx);
  if (text.length <= maxChars) return text;
  if (maxChars < 2) return "…";
  let n = maxChars - 1; // reserve a slot for the ellipsis
  // Backtrack to last word boundary if it's reasonably close.
  const sp = text.lastIndexOf(" ", n);
  if (sp > maxChars * 0.6) n = sp;
  return text.slice(0, n).trimEnd() + "…";
}

/**
 * Try a list of font sizes (largest first); return the largest size at which
 * `text` fits within `maxWidth`. If none fit, returns the smallest size and
 * truncates `text` to fit at that size.
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  sizes: number[],
  kind: FontKind = "sans",
): { text: string; size: number } {
  for (const size of sizes) {
    if (approxTextWidth(text, size, kind) <= maxWidth) {
      return { text, size };
    }
  }
  const min = sizes[sizes.length - 1];
  return { text: truncateToWidth(text, maxWidth, min, kind), size: min };
}

/**
 * Find the largest font size at which *every* string in `texts` fits within
 * `maxWidth`. Useful when several text elements share the same width budget
 * and we want them rendered at a uniform size for visual consistency
 * (terminal rows, pill rows, etc.). At the smallest size, any still-overflowing
 * text gets truncated with an ellipsis as a last-resort fallback.
 */
export function fitUniformFontSize(
  texts: string[],
  maxWidth: number,
  sizes: number[],
  kind: FontKind = "sans",
): { texts: string[]; size: number } {
  if (texts.length === 0) {
    return { texts, size: sizes[0] };
  }
  for (const size of sizes) {
    if (
      texts.every((t) => approxTextWidth(t, size, kind) <= maxWidth)
    ) {
      return { texts, size };
    }
  }
  const min = sizes[sizes.length - 1];
  return {
    texts: texts.map((t) => truncateToWidth(t, maxWidth, min, kind)),
    size: min,
  };
}

/**
 * Wrap `text` into at most `maxLines` lines, breaking at word boundaries.
 * Each line is at most `maxChars` characters. If text overflows the last
 * line, it gets truncated with an ellipsis.
 *
 * Used by SVG templates that render in a monospace font where character
 * count is a reliable proxy for width.
 */
export function wrapByChars(
  text: string,
  maxChars: number,
  maxLines: number,
): string[] {
  if (!text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  let consumed = 0;
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= maxChars) {
      cur = next;
      consumed++;
    } else {
      if (cur) {
        lines.push(cur);
        if (lines.length === maxLines) {
          cur = "";
          break;
        }
      }
      cur = w;
      consumed++;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  // Ellipsize if we couldn't fit everything.
  if (lines.length === maxLines && consumed < words.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] =
      last.length > maxChars - 1
        ? last.slice(0, maxChars - 1).trimEnd() + "…"
        : last + "…";
  }
  return lines;
}
