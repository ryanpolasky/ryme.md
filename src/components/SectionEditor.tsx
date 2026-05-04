import { useMemo, useState } from "react";
import {
  CATEGORY_META,
  FAMILY_DEFAULT_THEME,
  type ProfileInfo,
  type Section,
  type TemplateTheme,
} from "../lib/types";
import { buildSidebarFiles, getTemplate } from "../lib/templates";
import { encodeGif, type EncodeProgress } from "../lib/encoder/encode";
import { cleanInfo } from "../lib/info-utils";
import { SectionInputs } from "./SectionInputs";
import { Button } from "./ui";

type Props = {
  section: Section;
  index: number;
  total: number;
  info: ProfileInfo;
  onInfoChange: (next: ProfileInfo) => void;
  filename: string;
  /** All sections in render order; used to build the code-family sidebar. */
  sections: Section[];
  /** Resolves a section to its base filename (no extension). */
  filenameFor: (section: Section) => string;
  globalTheme: Partial<TemplateTheme>;
  loopDuration: number;
  loopText: boolean;
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
  onInfoChange,
  filename,
  sections,
  filenameFor,
  globalTheme,
  loopDuration,
  loopText,
  onRemove,
  onMove,
}: Props) {
  // sidebar list reflects every selected section's downloaded filename.
  // code-family templates render this in their file explorer; everyone
  // else ignores it.
  const sidebarFiles = useMemo(
    () => buildSidebarFiles(sections, section.id, filenameFor),
    [sections, section.id, filenameFor],
  );
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

  // All sections share the same theme: family default + global override.
  const familyDefault = FAMILY_DEFAULT_THEME[template.family];
  const theme: TemplateTheme = {
    ...familyDefault,
    ...globalTheme,
  };
  const meta = CATEGORY_META[template.category];

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<EncodeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ext = template.kind === "canvas" ? "gif" : "svg";
  const fullFilename = `${filename}.${ext}`;

  const handleDownload = async () => {
    // Clean once at the export boundary so the downloaded artifact never
    // contains stray whitespace, zero-width chars, or control bytes that
    // the live form happens to be holding mid-edit.
    const renderInfo = cleanInfo(info);
    if (template.kind === "svg") {
      const svg = template.renderSvg(renderInfo, theme, loopDuration, {
        loopText,
        sidebarFiles,
      });
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), fullFilename);
      return;
    }
    setBusy(true);
    setError(null);
    setProgress({ phase: "render", current: 0, total: 1 });
    try {
      const blob = await encodeGif({
        template,
        info: renderInfo,
        theme,
        loopDuration,
        loopText,
        sidebarFiles,
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

      <div className="p-4 space-y-3 min-w-0">
        {/* Per-section inputs - only the fields this template renders */}
        <SectionInputs
          fields={template.fields}
          info={info}
          onChange={onInfoChange}
        />

        {/* Export */}
        <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-[var(--color-border)]">
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
          <span className="text-[11px] font-mono text-[var(--color-text-dim)] truncate">
            {fullFilename}
          </span>
          {error && (
            <p className="text-xs text-red-400 font-mono break-words w-full">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
