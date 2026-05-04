import type { RenderOptions } from "../types";

// Canonical 5-section roster used as the standalone-preview fallback when
// no live section list is supplied via options.sidebarFiles.
const FALLBACK_CATEGORY_ORDER = [
  "header",
  "about",
  "skills",
  "stats",
  "footer",
];

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * Build the "NN / TT" sheet index that every blueprint template stamps
 * into its title block (and top-right strip).
 *
 * - When the editor passes the live section list via `options.sidebarFiles`
 *   (full-stack preview / per-section download / zip export), the index
 *   reflects the active section's 1-based position and the actual total
 *   section count -- so a 7-section README shows "03 / 07" etc.
 * - Without that list (isolated preview, e.g. the welcome page card), we
 *   fall back to a fixed 5-category ordering so a single blueprint sheet
 *   still shows a sensible-looking sheet number.
 */
export function sheetIndexLabel(
  options: RenderOptions | undefined,
  fallbackCategory: string,
): string {
  if (options?.sidebarFiles && options.sidebarFiles.length > 0) {
    const idx = options.sidebarFiles.findIndex((f) => f.active);
    const pos = idx >= 0 ? idx + 1 : 1;
    const total = options.sidebarFiles.length;
    return `${pad2(pos)} / ${pad2(total)}`;
  }
  const fallbackIdx = Math.max(
    0,
    FALLBACK_CATEGORY_ORDER.indexOf(fallbackCategory),
  );
  return `${pad2(fallbackIdx + 1)} / ${pad2(FALLBACK_CATEGORY_ORDER.length)}`;
}
