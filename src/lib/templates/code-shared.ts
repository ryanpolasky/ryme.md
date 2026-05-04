import type { CodeSidebarFile, RenderOptions } from "../types";

// fallback file roster for code-family sidebars when no live section list
// is provided (e.g. the welcome page's isolated previews). includes one
// entry per category that has a code-* template; each consumer marks
// exactly one as active.
export const CODE_DEFAULT_SIDEBAR: { name: string; category: string }[] = [
  { name: "profile.json", category: "header" },
  { name: "README.md", category: "about" },
  { name: "stack.ts", category: "skills" },
  { name: "github.json", category: "stats" },
  { name: "footer.md", category: "footer" },
];

/**
 * Resolve which file list to render in the code sidebar:
 *   - if the editor passed `options.sidebarFiles`, use that list verbatim
 *     (already includes per-section filenames + an `active` flag).
 *   - otherwise fall back to the static roster, marking the entry whose
 *     category matches `activeCategory` as active.
 *
 * The list is capped to `maxItems` so it never overflows the editor pane.
 * When the active entry would fall outside that cap, it is swapped into
 * the last visible slot so the user still sees the highlight.
 */
export function resolveCodeSidebar(
  options: RenderOptions | undefined,
  activeCategory: string,
  maxItems: number,
): CodeSidebarFile[] {
  const entries: CodeSidebarFile[] =
    options?.sidebarFiles && options.sidebarFiles.length > 0
      ? options.sidebarFiles
      : CODE_DEFAULT_SIDEBAR.map((f) => ({
          name: f.name,
          active: f.category === activeCategory,
        }));

  if (entries.length <= maxItems) return entries;

  const visible = entries.slice(0, maxItems);
  const activeIdx = entries.findIndex((e) => e.active);
  if (activeIdx >= 0 && activeIdx >= maxItems) {
    visible[maxItems - 1] = entries[activeIdx];
  }
  return visible;
}
