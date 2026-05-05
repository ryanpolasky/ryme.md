import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  FAMILY_DEFAULT_THEME,
  type ProfileInfo,
  type Section,
  type TemplateTheme,
} from "../lib/types";
import { getTemplate } from "../lib/templates";
import { buildEmbedUrl } from "../lib/embed-url";
import { cleanInfo } from "../lib/info-utils";

type Props = {
  sections: Section[];
  info: ProfileInfo;
  globalTheme: Partial<TemplateTheme>;
  loopDuration: number;
  loopText: boolean;
  filenameFor: (section: Section) => string;
};

/**
 * The combined snippet drives two embed strategies, picked per section by
 * `template.category`:
 *
 *   - `category === "stats"` -> live URL at `/api/render/:templateId`. These
 *     are the only sections whose contents drift after the user closes the
 *     editor (GitHub commits/PRs/language mix change over time), so they're
 *     worth a function invocation per README pageview. The endpoint reads
 *     from the same KV-cached `/api/github/:u` the editor uses, so the
 *     marginal cost of a render is roughly one KV lookup + ~1 ms of SVG
 *     synthesis on a warm edge.
 *
 *   - everything else (header / about / skills / footer) -> static URL at
 *     `raw.githubusercontent.com/<you>/<you>/main/<file>.svg`. These
 *     sections render the user's own profile copy + theme; the data is
 *     baked at edit time and there's no reason to re-render on every
 *     pageview. The user pulls the SVGs out of the editor's "Download all"
 *     zip, drops them at the root of their profile repo, and the README
 *     references them directly. Zero ongoing traffic on ryme.md for these.
 *
 * Net effect: a typical 4-section README (header + about + skills + stats
 * + footer) makes one function call per pageview, not five.
 */
export function CombinedReadme({
  sections,
  info,
  globalTheme,
  loopDuration,
  loopText,
  filenameFor,
}: Props) {
  // The snippet handle defaults to the github username already entered in
  // the profile section. The user can still override it locally; once they
  // type something different, we stop tracking the profile field (otherwise
  // their override would be clobbered every time profile state updates).
  const profileHandle = info.githubUsername.trim();
  const [handle, setHandle] = useState(profileHandle);
  const [open, setOpen] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) setHandle(profileHandle);
  }, [profileHandle]);

  const onHandleChange = (next: string) => {
    dirtyRef.current = true;
    setHandle(next);
  };

  const cleanHandle = handle.trim().replace(/^@/, "") || "USERNAME";
  const rawBase = `https://raw.githubusercontent.com/${cleanHandle}/${cleanHandle}/main`;

  // The render endpoint lives on whatever origin the editor is running
  // under -- localhost in dev, the Pages domain in prod. Users hand-edit
  // this if they front the site with a custom domain after copying.
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  // Clean once for the whole snippet so trailing whitespace, zero-width
  // chars, and stray control bytes from mid-edit form state never make it
  // into the URL -- they'd just get stripped server-side anyway, but a
  // stable URL is a cacheable URL.
  const renderInfo = useMemo(() => cleanInfo(info), [info]);

  const { snippet, hasLive, hasStatic } = useMemo(() => {
    const lines: string[] = [];
    let live = 0;
    let stat = 0;
    sections.forEach((s, i) => {
      const t = getTemplate(s.templateId);
      if (!t) return;
      const heading = i === 0 ? "" : "\n<br/>\n\n";

      if (t.category === "stats") {
        // Stats sections embed live so a viewer's first hit on the README
        // pulls the freshest cached payload our /api/github KV cache holds.
        const familyDefault = FAMILY_DEFAULT_THEME[t.family];
        const theme: TemplateTheme = { ...familyDefault, ...globalTheme };
        const url = buildEmbedUrl({
          origin,
          template: t,
          info: renderInfo,
          theme,
          loopDuration,
          loopText,
          username: cleanHandle === "USERNAME" ? null : cleanHandle,
        });
        lines.push(
          `${heading}<img src="${url}" width="100%" alt="${t.name}">`,
        );
        live += 1;
      } else {
        // Header / about / skills / footer -> the user downloads the SVG
        // from the editor's "Download all" zip and commits it to their
        // profile repo. The README references it via raw.gh.
        const file = `${filenameFor(s)}.svg`;
        lines.push(
          `${heading}<img src="${rawBase}/${file}" width="100%" alt="${t.name}">`,
        );
        stat += 1;
      }
    });
    return { snippet: lines.join("\n"), hasLive: live > 0, hasStatic: stat > 0 };
  }, [
    sections,
    rawBase,
    origin,
    renderInfo,
    globalTheme,
    loopDuration,
    loopText,
    cleanHandle,
    filenameFor,
  ]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // ignore
    }
  };

  if (!sections.length) return null;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[var(--color-surface-2)]/50 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            Combined README snippet
          </h3>
          <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5 truncate">
            Markdown for your profile repo's <code className="font-mono">README.md</code>.
          </p>
        </div>
        <ChevronDown
          aria-hidden
          size={20}
          strokeWidth={2.25}
          className={`text-[var(--color-text-muted)] transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-[var(--color-text-dim)] leading-relaxed min-w-0">
              {hasLive && hasStatic
                ? <>Stats sections render live from <code className="font-mono">/api/render</code>; download the rest from the section export and commit them to <code className="font-mono">{cleanHandle}/{cleanHandle}/main</code>.</>
                : hasLive && !hasStatic
                ? <>Paste into <code className="font-mono">README.md</code> at <code className="font-mono">{cleanHandle}/{cleanHandle}</code>. Stats stay fresh as your activity changes.</>
                : <>Download each section's SVG, drop them at the root of <code className="font-mono">{cleanHandle}/{cleanHandle}</code>, and paste this into <code className="font-mono">README.md</code>.</>}
            </p>
            <input
              value={handle}
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder="github handle"
              className="text-[11px] font-mono bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-1 w-32 text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="relative group min-w-0">
            <pre className="text-[11px] font-mono leading-relaxed text-[var(--color-text-muted)] bg-[var(--color-surface-2)] rounded-md p-3 whitespace-pre-wrap break-all min-w-0 max-h-72 overflow-y-auto scrollbar-thin">
              {snippet}
            </pre>
            <button
              onClick={onCopy}
              className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-[var(--color-text)] cursor-pointer"
            >
              copy
            </button>
          </div>

          <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">
            {hasLive
              ? <>Live stats URLs encode every theme + content tweak above; re-copy after edits to refresh. Other sections are static -- re-download + re-commit them when you change theme or copy.</>
              : <>Profile READMEs live at <code className="text-[var(--color-text-muted)]">github.com/{cleanHandle}/{cleanHandle}</code>.</>}
          </p>
        </div>
      )}
    </section>
  );
}
