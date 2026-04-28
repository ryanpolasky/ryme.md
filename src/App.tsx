import { useMemo, useState } from "react";
import { DEFAULT_INFO, type ProfileInfo, type TemplateTheme } from "./lib/types";
import { templates, getTemplate } from "./lib/templates";
import { InfoForm } from "./components/InfoForm";
import { TemplatePicker } from "./components/TemplatePicker";
import { Preview } from "./components/Preview";
import { ExportPanel } from "./components/ExportPanel";

function App() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [info, setInfo] = useState<ProfileInfo>(DEFAULT_INFO);
  const [themeOverride, setThemeOverride] = useState<Partial<TemplateTheme>>({});

  const template = getTemplate(templateId) ?? templates[0];
  const theme: TemplateTheme = useMemo(
    () => ({ ...template.defaultTheme, ...themeOverride }),
    [template, themeOverride],
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-md bg-gradient-to-br from-[var(--color-accent)] to-fuchsia-500 grid place-items-center text-white font-bold text-xs font-mono">
              rr
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--color-text)] leading-none">
                readme-ryvamper
              </h1>
              <p className="text-[10px] text-[var(--color-text-dim)] mt-0.5 font-mono">
                animated banners for your github profile
              </p>
            </div>
          </div>
          <a
            href="https://github.com/ryanpolasky"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors font-mono"
          >
            built by @ryanpolasky
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 lg:gap-8 px-6 py-8">
        <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin pb-8 lg:pb-0">
          <InfoForm info={info} onChange={setInfo} />
        </aside>
        <section className="space-y-6 min-w-0">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)] mb-3">
              Pick a template
            </h2>
            <TemplatePicker selected={templateId} onSelect={setTemplateId} />
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)] mb-3">
              Live preview
            </h2>
            <Preview template={template} info={info} theme={theme} />
            <ThemeRow
              theme={theme}
              defaultTheme={template.defaultTheme}
              onChange={(next) => setThemeOverride(next)}
            />
          </div>

          <ExportPanel template={template} info={info} theme={theme} />
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 text-[11px] text-[var(--color-text-dim)] font-mono flex items-center justify-between">
          <span>
            everything renders in your browser. nothing leaves the tab.
          </span>
          <span>
            v0.1
          </span>
        </div>
      </footer>
    </div>
  );
}

function ThemeRow({
  theme,
  defaultTheme,
  onChange,
}: {
  theme: TemplateTheme;
  defaultTheme: TemplateTheme;
  onChange: (next: Partial<TemplateTheme>) => void;
}) {
  const keys: (keyof TemplateTheme)[] = ["bg", "fg", "accent", "muted"];
  const isDirty = keys.some((k) => theme[k] !== defaultTheme[k]);
  return (
    <div className="mt-3 flex items-center gap-3 text-[11px] flex-wrap">
      <span className="text-[var(--color-text-dim)] uppercase tracking-[0.08em] font-medium">
        Theme
      </span>
      {keys.map((k) => (
        <label key={k} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="color"
            value={toHex(theme[k])}
            onChange={(e) => onChange({ ...theme, [k]: e.target.value })}
            className="size-5 rounded cursor-pointer bg-transparent border border-[var(--color-border)]"
          />
          <span className="text-[var(--color-text-muted)] font-mono">{k}</span>
        </label>
      ))}
      {isDirty && (
        <button
          onClick={() => onChange({})}
          className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline-offset-2 hover:underline cursor-pointer"
        >
          reset
        </button>
      )}
    </div>
  );
}

// Color inputs only accept hex; coerce best-effort.
function toHex(c: string): string {
  if (c.startsWith("#") && (c.length === 7 || c.length === 4)) return c;
  return "#000000";
}

export default App;
