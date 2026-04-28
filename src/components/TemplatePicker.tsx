import type { Template } from "../lib/types";
import { templates } from "../lib/templates";

type Props = {
  selected: string;
  onSelect: (id: string) => void;
};

const KindBadge = ({ kind }: { kind: Template["kind"] }) => (
  <span
    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${
      kind === "svg"
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-violet-500/15 text-violet-300"
    }`}
  >
    {kind}
  </span>
);

export function TemplatePicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {templates.map((t) => {
        const active = t.id === selected;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`text-left p-4 rounded-lg border transition-all cursor-pointer ${
              active
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-sm font-semibold text-[var(--color-text)]">
                {t.name}
              </h4>
              <KindBadge kind={t.kind} />
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              {t.description}
            </p>
            <div className="mt-2 flex gap-3 text-[10px] font-mono text-[var(--color-text-dim)]">
              <span>
                {t.width}×{t.height}
              </span>
              <span>{t.duration}s</span>
              {t.kind === "canvas" && <span>{t.fps}fps</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
