import { useState } from "react";
import type { ProfileInfo, Template, TemplateTheme } from "../lib/types";
import { encodeGif, type EncodeProgress } from "../lib/encoder/encode";
import { Button } from "./ui";

type Props = {
  template: Template;
  info: ProfileInfo;
  theme: TemplateTheme;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "header";
}

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

export function ExportPanel({ template, info, theme }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<EncodeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<{ url: string; ext: string } | null>(null);
  const [ghHandle, setGhHandle] = useState("");

  const slug = slugify(info.name);

  const handleGif = async () => {
    if (template.kind !== "canvas") return;
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
      const url = URL.createObjectURL(blob);
      setLastBlob({ url, ext: "gif" });
      downloadBlob(blob, `${slug}.gif`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "encoding failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSvg = () => {
    if (template.kind !== "svg") return;
    const svg = template.renderSvg(info, theme);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    downloadBlob(blob, `${slug}.svg`);
  };

  const fileExt = template.kind === "canvas" ? "gif" : "svg";
  const handle = ghHandle.trim().replace(/^@/, "") || "USERNAME";
  const snippet = `<img src="https://raw.githubusercontent.com/${handle}/${handle}/main/${slug}.${fileExt}" width="100%">`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // ignore
    }
  };

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            Export
          </h3>
          <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5">
            {template.kind === "canvas"
              ? `~${Math.round(template.duration * template.fps)} frames · encoded in your browser`
              : "Animated SVG · tiny, sharp, GitHub-renderable"}
          </p>
        </div>
        <div className="flex gap-2">
          {template.kind === "canvas" ? (
            <Button variant="primary" onClick={handleGif} disabled={busy}>
              {busy
                ? `${progress?.phase === "encode" ? "Encoding" : "Rendering"} ${pct}%`
                : "Download GIF"}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSvg}>
              Download SVG
            </Button>
          )}
        </div>
      </div>

      {busy && progress && (
        <div className="h-1 w-full bg-[var(--color-surface-2)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-accent)] transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 font-mono">{error}</p>
      )}

      {lastBlob && template.kind === "canvas" && (
        <div className="rounded-md border border-[var(--color-border)] overflow-hidden">
          <div className="px-3 py-2 text-[11px] text-[var(--color-text-dim)] border-b border-[var(--color-border)] flex items-center justify-between">
            <span>last render</span>
            <a
              href={lastBlob.url}
              download={`${slug}.${lastBlob.ext}`}
              className="text-[var(--color-accent)] hover:underline"
            >
              re-download
            </a>
          </div>
          <img
            src={lastBlob.url}
            alt="Last rendered GIF"
            className="block w-full"
          />
        </div>
      )}

      <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            README snippet
          </label>
          <input
            value={ghHandle}
            onChange={(e) => setGhHandle(e.target.value)}
            placeholder="github handle"
            className="text-[11px] font-mono bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-1 w-32 text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div className="relative group">
          <pre className="text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-2)] rounded-md p-3 overflow-x-auto scrollbar-thin">
            {snippet}
          </pre>
          <button
            onClick={copySnippet}
            className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--color-text)] cursor-pointer"
          >
            copy
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">
          Drop your rendered file at the repo root (or under{" "}
          <code className="text-[var(--color-text-muted)]">/assets</code>) and
          adjust the path. Profile READMEs live at{" "}
          <code className="text-[var(--color-text-muted)]">
            github.com/{handle}/{handle}
          </code>
          .
        </p>
      </div>
    </div>
  );
}
