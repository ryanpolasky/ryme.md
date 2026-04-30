/**
 * Shared layout helpers for chip / pill rows used by skills templates.
 *
 * The pattern across all skills templates is the same:
 *   1. Compute per-chip widths (proportional to text length + padding).
 *   2. Greedy first-fit pack into rows that don't exceed `maxWidth`.
 *   3. Cap at `maxRows` and report any overflow chips so the template can
 *      append a "+N more" indicator.
 *
 * Templates own visual styling (colors, animations, labels). This module
 * is purely numeric so it can be shared between SVG and canvas templates.
 */

import { CHAR_WIDTH_EM, type FontKind } from "./text-utils";

/** Width of a chip given its label, font size, and horizontal padding. */
export function chipWidth(
  label: string,
  fontSize: number,
  paddingX: number,
  kind: FontKind = "mono",
): number {
  return Math.round(label.length * fontSize * CHAR_WIDTH_EM[kind] + paddingX * 2);
}

/** Width of a row of chips given their widths and the inter-chip gap. */
export function rowWidth(widths: number[], gap: number): number {
  if (widths.length === 0) return 0;
  return widths.reduce((s, w) => s + w, 0) + (widths.length - 1) * gap;
}

export type PackResult = {
  /** Indices into the original widths array, grouped per row. */
  rows: number[][];
  /** How many chips at the end didn't fit within `maxRows`. */
  overflow: number;
};

/**
 * Greedy first-fit row packing. Each row's total width (including gaps)
 * stays ≤ `maxWidth`; oversized single chips still go on their own row
 * (the caller is responsible for shrinking the font size if a single chip
 * exceeds `maxWidth` on its own).
 *
 * If `maxRows` is provided and the input doesn't fit, the leftover chip
 * count is returned in `overflow` and those chips are dropped from the
 * row layout. When `maxRows` is undefined the input is packed onto as
 * many rows as needed and `overflow` is always 0.
 */
export function packChipsIntoRows(
  widths: number[],
  maxWidth: number,
  gap: number,
  maxRows?: number,
): PackResult {
  if (widths.length === 0) return { rows: [], overflow: 0 };

  const rows: number[][] = [];
  let cur: number[] = [];
  let curW = 0;

  for (let i = 0; i < widths.length; i++) {
    const nextW =
      cur.length === 0 ? widths[i] : curW + gap + widths[i];
    if (cur.length > 0 && nextW > maxWidth) {
      rows.push(cur);
      if (maxRows !== undefined && rows.length >= maxRows) {
        return { rows, overflow: widths.length - i };
      }
      cur = [i];
      curW = widths[i];
    } else {
      cur.push(i);
      curW = nextW;
    }
  }
  if (cur.length) rows.push(cur);

  if (maxRows !== undefined && rows.length > maxRows) {
    const kept = rows.slice(0, maxRows);
    const droppedChips = rows
      .slice(maxRows)
      .reduce((sum, r) => sum + r.length, 0);
    return { rows: kept, overflow: droppedChips };
  }
  return { rows, overflow: 0 };
}

/**
 * Find the largest font size at which the chip set fits into at most
 * `maxRows` rows of width `maxWidth`. Iterates `sizes` largest-first and
 * returns the first size that satisfies the constraint. Falls back to the
 * smallest size if nothing fits cleanly (overflow chips will be reported
 * by the caller via `packChipsIntoRows`).
 */
export function fitChipFontSize(
  labels: string[],
  maxWidth: number,
  gap: number,
  paddingXFor: (size: number) => number,
  sizes: number[],
  maxRows: number,
  kind: FontKind = "mono",
): number {
  for (const size of sizes) {
    const widths = labels.map((l) => chipWidth(l, size, paddingXFor(size), kind));
    // Every individual chip must fit on a row by itself; otherwise a single
    // very long skill silently overflows the panel.
    const widestChip = widths.length ? Math.max(...widths) : 0;
    if (widestChip > maxWidth) continue;
    const { rows, overflow } = packChipsIntoRows(widths, maxWidth, gap, maxRows);
    if (overflow === 0 && rows.length <= maxRows) return size;
  }
  return sizes[sizes.length - 1];
}
