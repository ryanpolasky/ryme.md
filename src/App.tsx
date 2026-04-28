import { useCallback, useState } from "react";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DEFAULT_INFO,
  type ProfileInfo,
  type Section,
  type TemplateCategory,
} from "./lib/types";
import { getTemplate, templatesByCategory } from "./lib/templates";
import { InfoForm } from "./components/InfoForm";
import { SectionEditor } from "./components/SectionEditor";
import { CombinedReadme } from "./components/CombinedReadme";

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function makeSection(templateId: string): Section {
  return { id: uuid(), templateId, themeOverride: {} };
}

function defaultSections(): Section[] {
  return [
    makeSection("glass-banner"),
    makeSection("about-card"),
    makeSection("footer-wave"),
  ];
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

function App() {
  const [info, setInfo] = useState<ProfileInfo>(DEFAULT_INFO);
  const [sections, setSections] = useState<Section[]>(defaultSections);

  const filenameFor = useCallback(
    (section: Section) => computeFilename(section, sections),
    [sections],
  );

  const updateSection = (id: string, next: Section) =>
    setSections((prev) => prev.map((s) => (s.id === id ? next : s)));

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
    const available = templatesByCategory(category);
    if (!available.length) return;
    setSections((prev) => [...prev, makeSection(available[0].id)]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-7 rounded-md bg-gradient-to-br from-[var(--color-accent)] to-fuchsia-500 grid place-items-center text-white font-bold text-xs font-mono shrink-0">
              rr
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-[var(--color-text)] leading-none truncate">
                readme-ryvamper
              </h1>
              <p className="text-[10px] text-[var(--color-text-dim)] mt-0.5 font-mono truncate">
                animated sections for your github profile
              </p>
            </div>
          </div>
          <a
            href="https://github.com/ryanpolasky"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors font-mono shrink-0 hidden sm:inline"
          >
            built by @ryanpolasky
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 lg:gap-8 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        <aside className="lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto scrollbar-thin pb-8 lg:pb-0 min-w-0">
          <InfoForm info={info} onChange={setInfo} />
        </aside>

        <section className="space-y-5 min-w-0">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]">
              Your README
            </h2>
            <p className="text-[11px] text-[var(--color-text-dim)]">
              Stack sections in the order they should appear. Each one renders to its own file.
            </p>
          </div>

          {sections.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-[var(--color-text-dim)]">
              <p className="text-sm">No sections yet — add one below.</p>
            </div>
          )}

          {sections.map((s, i) => (
            <SectionEditor
              key={s.id}
              section={s}
              index={i}
              total={sections.length}
              info={info}
              filename={filenameFor(s)}
              onChange={(next) => updateSection(s.id, next)}
              onRemove={() => removeSection(s.id)}
              onMove={(delta) => moveSection(s.id, delta)}
            />
          ))}

          <AddSectionRow onAdd={addSection} />

          <CombinedReadme
            sections={sections}
            info={info}
            filenameFor={filenameFor}
          />
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 text-[11px] text-[var(--color-text-dim)] font-mono flex flex-wrap items-center justify-between gap-2">
          <span>everything renders in your browser. nothing leaves the tab.</span>
          <span>v0.2</span>
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
    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] mr-1">
          Add section
        </span>
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
                  : "No templates yet — coming soon"
              }
              className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text)] cursor-pointer transition-colors"
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

export default App;
