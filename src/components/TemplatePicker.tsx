import type { Template, TemplateCategory } from "../lib/types";
import { templates } from "../lib/templates";

type Props = {
  selected: string;
  onSelect: (id: string) => void;
  category?: TemplateCategory;
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

export function TemplatePicker({ selected, onSelect, category }: Props) {
  const items = category
    ? templates.filter((t) => t.category === category)
    : templates;
  if (!items.length) {
    return (
      <p className="text-xs text-[var(--color-text-dim)] italic">
        No templates in this category yet — coming soon.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
      {items.map((t) => {
        const active = t.id === selected;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`text-left p-3 rounded-lg border transition-all cursor-pointer min-w-0 ${
              active
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1 gap-2 min-w-0">
              <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">
                {t.name}
              </h4>
              <KindBadge kind={t.kind} />
            </div>
            <p className="text-[11px] leading-snug text-[var(--color-text-muted)] line-clamp-2">
              {t.description}
            </p>
            <div className="mt-1.5 flex gap-3 text-[10px] font-mono text-[var(--color-text-dim)]">
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
