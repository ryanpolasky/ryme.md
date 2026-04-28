import { useMemo, useState } from "react";
import type { ProfileInfo, Section } from "../lib/types";
import { getTemplate } from "../lib/templates";

type Props = {
  sections: Section[];
  info: ProfileInfo;
  filenameFor: (section: Section) => string;
};

export function CombinedReadme({ sections, info, filenameFor }: Props) {
  const [handle, setHandle] = useState("");

  const cleanHandle = handle.trim().replace(/^@/, "") || "USERNAME";
  const base = `https://raw.githubusercontent.com/${cleanHandle}/${cleanHandle}/main`;

  const snippet = useMemo(() => {
    const lines: string[] = [];
    sections.forEach((s, i) => {
      const t = getTemplate(s.templateId);
      if (!t) return;
      const ext = t.kind === "canvas" ? "gif" : "svg";
      const file = `${filenameFor(s)}.${ext}`;
      const heading = i === 0 ? "" : "\n<br/>\n\n";
      lines.push(`${heading}<img src="${base}/${file}" width="100%" alt="${t.name}">`);
    });
    return lines.join("\n");
  }, [sections, base, filenameFor]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // ignore
    }
  };

  if (!sections.length) return null;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            Combined README snippet
          </h3>
          <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5">
            Drop your downloaded files at the root of{" "}
            <code className="font-mono">{cleanHandle}/{cleanHandle}</code> and paste this into <code className="font-mono">README.md</code>.
          </p>
        </div>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
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
        Profile READMEs live at{" "}
        <code className="text-[var(--color-text-muted)]">
          github.com/{cleanHandle}/{cleanHandle}
        </code>
        . Optionally use <code className="text-[var(--color-text-muted)]">{`${info.name ? "/assets" : "/assets"}`}</code> as a subfolder; just adjust the URL above.
      </p>
    </section>
  );
}
