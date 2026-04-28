import { useState } from "react";
import {
  CATEGORY_META,
  type ProfileInfo,
  type Section,
  type TemplateTheme,
} from "../lib/types";
import { getTemplate } from "../lib/templates";
import { encodeGif, type EncodeProgress } from "../lib/encoder/encode";
import { Preview } from "./Preview";
import { TemplatePicker } from "./TemplatePicker";
import { Button } from "./ui";

type Props = {
  section: Section;
  index: number;
  total: number;
  info: ProfileInfo;
  filename: string;
  onChange: (next: Section) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function SectionEditor({
  section,
  index,
  total,
  info,
  filename,
  onChange,
  onRemove,
  onMove,
}: Props) {
  const template = getTemplate(section.templateId);
  if (!template) {
    return (
      <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-red-400 font-mono">
          Unknown template: {section.templateId}
        </p>
        <Button variant="ghost" onClick={onRemove} className="mt-2">
          Remove
        </Button>
      </article>
    );
  }

  const theme: TemplateTheme = { ...template.defaultTheme, ...section.themeOverride };
  const meta = CATEGORY_META[template.category];

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<EncodeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showTheme, setShowTheme] = useState(false);

  const setTemplate = (id: string) =>
    onChange({ ...section, templateId: id, themeOverride: {} });
  const setThemeOverride = (next: Partial<TemplateTheme>) =>
    onChange({ ...section, themeOverride: next });

  const themeKeys: (keyof TemplateTheme)[] = ["bg", "fg", "accent", "muted"];
  const themeIsDirty = themeKeys.some(
    (k) => section.themeOverride[k] !== undefined,
  );

  const ext = template.kind === "canvas" ? "gif" : "svg";
  const fullFilename = `${filename}.${ext}`;

  const handleDownload = async () => {
    if (template.kind === "svg") {
      const svg = template.renderSvg(info, theme);
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), fullFilename);
      return;
    }
    setBusy(true);
    setError(null);
    setProgress({ phase: "render", current: 0, total: 1 });
    try {
      const blob = await encodeGif({
        template,
        info,
        theme,
        onProgress: setProgress,
      });
      downloadBlob(blob, fullFilename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "encoding failed");
    } finally {
      setBusy(false);
    }
  };

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 overflow-hidden min-w-0">
      {/* Header strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 min-w-0">
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0">
          {meta.label}
        </span>
        <h3 className="text-sm font-semibold text-[var(--color-text)] truncate min-w-0">
          {template.name}
        </h3>
        <span className="text-[11px] font-mono text-[var(--color-text-dim)] truncate hidden md:inline">
          {fullFilename}
        </span>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="move up"
            className="size-7 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="move down"
            className="size-7 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            aria-label="remove section"
            className="size-7 rounded text-[var(--color-text-dim)] hover:text-red-400 hover:bg-[var(--color-surface-2)] cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 min-w-0">
        {/* Toolbar — collapse picker/theme to keep noise down */}
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)] cursor-pointer transition-colors"
          >
            {showPicker ? "✓ Template" : "Change template"}
          </button>
          <button
            onClick={() => setShowTheme((v) => !v)}
            className={`px-2 py-1 rounded border cursor-pointer transition-colors ${
              themeIsDirty
                ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            {showTheme ? "✓ Theme" : themeIsDirty ? "Theme · custom" : "Theme"}
          </button>
          <span className="ml-auto text-[var(--color-text-dim)] font-mono">
            {template.kind === "canvas"
              ? `${Math.round(template.duration * template.fps)} frames · ${template.fps}fps`
              : `${template.duration}s loop · SVG`}
          </span>
        </div>

        {showPicker && (
          <TemplatePicker
            selected={section.templateId}
            onSelect={(id) => {
              setTemplate(id);
              setShowPicker(false);
            }}
            category={template.category}
          />
        )}

        {/* Preview */}
        <Preview template={template} info={info} theme={theme} />

        {showTheme && (
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            {themeKeys.map((k) => (
              <label
                key={k}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="color"
                  value={toHex(theme[k])}
                  onChange={(e) =>
                    setThemeOverride({
                      ...section.themeOverride,
                      [k]: e.target.value,
                    })
                  }
                  className="size-5 rounded cursor-pointer bg-transparent border border-[var(--color-border)]"
                />
                <span className="text-[var(--color-text-muted)] font-mono">
                  {k}
                </span>
              </label>
            ))}
            {themeIsDirty && (
              <button
                onClick={() => setThemeOverride({})}
                className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline-offset-2 hover:underline cursor-pointer"
              >
                reset to default
              </button>
            )}
          </div>
        )}

        {/* Export */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[var(--color-border)]">
          <Button
            variant="primary"
            onClick={handleDownload}
            disabled={busy}
          >
            {busy
              ? `${progress?.phase === "encode" ? "Encoding" : "Rendering"} ${pct}%`
              : `Download ${ext.toUpperCase()}`}
          </Button>
          {busy && (
            <div className="flex-1 min-w-[8rem] h-1 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-[width] duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {error && (
            <p className="text-xs text-red-400 font-mono break-words">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function toHex(c: string): string {
  if (c.startsWith("#") && (c.length === 7 || c.length === 4)) return c;
  return "#000000";
}
