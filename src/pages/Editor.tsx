import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DEFAULT_INFO,
  LOOP_DURATION_DEFAULT,
  type ProfileInfo,
  type Section,
  type TemplateCategory,
  type TemplateFamily,
  type TemplateTheme,
} from "../lib/types";
import {
  getTemplate,
  templateFor,
  templatesByCategory,
} from "../lib/templates";
import { ProfileToolbar } from "../components/ProfileToolbar";
import { SectionEditor } from "../components/SectionEditor";
import { CombinedReadme } from "../components/CombinedReadme";
import { GlobalControls } from "../components/GlobalControls";
import { FullStackPreview } from "../components/FullStackPreview";
import { Logo } from "../components/Logo";

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function makeSection(templateId: string): Section {
  return { id: uuid(), templateId };
}

function defaultSections(family: TemplateFamily): Section[] {
  // One section per category that has a template in this family
  const cats: TemplateCategory[] = ["header", "about", "skills", "stats", "footer"];
  return cats
    .map((c) => templateFor(family, c))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => makeSection(t.id));
}

function computeFilename(section: Section, sections: Section[]): string {
  const t = getTemplate(section.templateId);
  if (!t) return "section";
  const sameCat = sections.filter((s) => {
    const st = getTemplate(s.templateId);
    return st?.category === t.category;
  });
  const idx = sameCat.findIndex((s) => s.id === section.id);
  const meta = CATEGORY_META[t.category];
  const suffix = sameCat.length > 1 ? `-${idx + 1}` : "";
  return `${meta.defaultFilename}${suffix}`;
}

function Editor() {
  const [info, setInfo] = useState<ProfileInfo>(DEFAULT_INFO);
  const [globalFamily, setGlobalFamily] = useState<TemplateFamily>("glass");
  const [globalTheme, setGlobalTheme] = useState<Partial<TemplateTheme>>({});
  const [loopDuration, setLoopDuration] = useState<number>(LOOP_DURATION_DEFAULT);
  const [loopText, setLoopText] = useState<boolean>(true);
  const [sections, setSections] = useState<Section[]>(() =>
    defaultSections("glass"),
  );

  const filenameFor = useCallback(
    (section: Section) => computeFilename(section, sections),
    [sections],
  );

  const removeSection = (id: string) =>
    setSections((prev) => prev.filter((s) => s.id !== id));

  const moveSection = (id: string, delta: -1 | 1) =>
    setSections((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addSection = (category: TemplateCategory) => {
    const t = templateFor(globalFamily, category);
    if (!t) return;
    setSections((prev) => [...prev, makeSection(t.id)]);
  };

  // Switching the global family swaps every section to the matching
  // family×category template (per request: all sections always agree).
  // Resets globalTheme since palettes don't translate.
  const handleFamilyChange = (next: TemplateFamily) => {
    setGlobalTheme({});
    setSections((prev) =>
      prev.map((s) => {
        const t = getTemplate(s.templateId);
        if (!t) return s;
        const swapped = templateFor(next, t.category);
        return swapped ? { ...s, templateId: swapped.id } : s;
      }),
    );
    setGlobalFamily(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-3 min-w-0 group"
            aria-label="RyMe.md home"
          >
            <Logo size={32} className="shrink-0" />
            <div className="min-w-0">
              <h1 className="font-mono text-[13px] tracking-tight leading-none truncate text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors flex items-baseline gap-2">
                <span>
                  <span className="text-[var(--color-accent)]">Ry</span>Me<span className="text-[var(--color-text-dim)]">.md</span>
                </span>
                <span className="text-[var(--color-text-dim)] font-normal">|</span>
                <span
                  className="italic text-[var(--color-text-muted)] font-normal"
                  style={{ fontFamily: "var(--font-display)", fontSize: "15px" }}
                >
                  editor
                </span>
              </h1>
            </div>
          </Link>
          <a
            href="https://www.linkedin.com/in/ryan-polasky/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors font-mono shrink-0 hidden sm:inline"
          >
            built by @ryanpolasky
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-6 lg:gap-8 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        {/* LEFT - editor (sticky; scrolls inside its own viewport while the page scrolls the right column) */}
        <section className="lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto scrollbar-auto pb-8 lg:pb-2 lg:pr-2 -mr-2 space-y-5 min-w-0">
          <ProfileToolbar info={info} onChange={setInfo} />

          <GlobalControls
            family={globalFamily}
            onFamilyChange={handleFamilyChange}
            globalTheme={globalTheme}
            onGlobalThemeChange={setGlobalTheme}
            loopDuration={loopDuration}
            onLoopDurationChange={setLoopDuration}
            loopText={loopText}
            onLoopTextChange={setLoopText}
          />

          <div className="space-y-1 pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]">
              Sections
            </h2>
            <p className="text-[11px] text-[var(--color-text-dim)]">
              Stack them in render order. Each section asks only for the info it renders.
            </p>
          </div>

          {sections.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-[var(--color-text-dim)]">
              <p className="text-sm">No sections yet - add one below.</p>
            </div>
          )}

          {sections.map((s, i) => (
            <SectionEditor
              key={s.id}
              section={s}
              index={i}
              total={sections.length}
              info={info}
              onInfoChange={setInfo}
              filename={filenameFor(s)}
              sections={sections}
              filenameFor={filenameFor}
              globalTheme={globalTheme}
              loopDuration={loopDuration}
              loopText={loopText}
              onRemove={() => removeSection(s.id)}
              onMove={(delta) => moveSection(s.id, delta)}
            />
          ))}

          <AddSectionRow onAdd={addSection} />
        </section>

        {/* RIGHT - full-stack preview + readme snippet, scrolls with the page */}
        <aside className="min-w-0 space-y-4">
          <FullStackPreview
            sections={sections}
            info={info}
            globalTheme={globalTheme}
            loopDuration={loopDuration}
            loopText={loopText}
            filenameFor={filenameFor}
          />
          <CombinedReadme
            sections={sections}
            info={info}
            globalTheme={globalTheme}
            loopDuration={loopDuration}
            loopText={loopText}
            filenameFor={filenameFor}
          />
        </aside>
      </main>

      <footer className="border-t border-[var(--color-border)] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 text-[11px] text-[var(--color-text-dim)] font-mono flex flex-wrap items-center justify-between gap-2">
          <span>everything renders in your browser. nothing leaves the tab.</span>
          <span>
            <span className="text-[var(--color-accent)]">Ry</span>Me<span className="text-[var(--color-text-dim)]">.md</span>
            <span className="text-[var(--color-text-dim)]"> · v0.6</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function AddSectionRow({
  onAdd,
}: {
  onAdd: (category: TemplateCategory) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] py-4 px-4 min-w-0 flex flex-col items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        Add section
      </span>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {CATEGORY_ORDER.map((c) => {
          const has = templatesByCategory(c).length > 0;
          return (
            <button
              key={c}
              onClick={() => onAdd(c)}
              disabled={!has}
              title={
                has
                  ? `Add ${CATEGORY_META[c].label.toLowerCase()} section`
                  : "No templates yet - coming soon"
              }
              className="text-xs px-3 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text)] cursor-pointer transition-colors"
            >
              + {CATEGORY_META[c].label}
              {!has && (
                <span className="ml-1 text-[10px] text-[var(--color-text-dim)]">
                  (soon)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Editor;
