import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProfileInfo, Section } from "../lib/types";
import { getTemplate } from "../lib/templates";

type Props = {
  sections: Section[];
  info: ProfileInfo;
  filenameFor: (section: Section) => string;
};

export function CombinedReadme({ sections, info, filenameFor }: Props) {
  // the snippet handle defaults to the github username already entered in
  // the profile section. the user can still override it locally; once they
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
              Drop your downloaded files at the root of{" "}
              <code className="font-mono">{cleanHandle}/{cleanHandle}</code> and paste this into <code className="font-mono">README.md</code>.
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
            Profile READMEs live at{" "}
            <code className="text-[var(--color-text-muted)]">
              github.com/{cleanHandle}/{cleanHandle}
            </code>
            . Optionally use <code className="text-[var(--color-text-muted)]">{`${info.name ? "/assets" : "/assets"}`}</code> as a subfolder; just adjust the URL above.
          </p>
        </div>
      )}
    </section>
  );
}
