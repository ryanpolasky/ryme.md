import { useState } from "react";
import { Input } from "./ui";

type Props = {
  skills: string[];
  onChange: (next: string[]) => void;
};

/**
 * Chip editor for the `skills` ProfileInfo field.
 *
 * Behavior:
 * - Type a label and press Enter (or Tab, or `,`) to commit it as a chip.
 * - Backspace on an empty input removes the last chip.
 * - Click the × on any chip to remove it individually.
 * - Pasting a comma- or newline-delimited list splits it across chips.
 * - De-dupes case-insensitively against the existing list at commit time.
 */
export function SkillsEditor({ skills, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const lower = new Set(skills.map((s) => s.toLowerCase()));
    const additions = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .filter((s) => {
        const k = s.toLowerCase();
        if (lower.has(k)) return false;
        lower.add(k);
        return true;
      });
    if (additions.length) onChange([...skills, ...additions]);
    setDraft("");
  };

  const removeAt = (idx: number) => {
    onChange(skills.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5 min-w-0">
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-[12px] font-mono"
            >
              {s}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${s}`}
                className="size-5 rounded text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] flex items-center justify-center cursor-pointer leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        placeholder="TypeScript"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
            if (draft.trim()) {
              e.preventDefault();
              commit(draft);
            }
          } else if (
            e.key === "Backspace" &&
            draft.length === 0 &&
            skills.length > 0
          ) {
            e.preventDefault();
            removeAt(skills.length - 1);
          }
        }}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[,\n]/.test(text)) {
            e.preventDefault();
            commit(`${draft}${draft ? "," : ""}${text}`);
          }
        }}
      />
      <p className="text-[10px] text-[var(--color-text-dim)] leading-snug">
        Press <span className="font-mono">Enter</span> or{" "}
        <span className="font-mono">,</span> to add. Paste a list to add many.
      </p>
    </div>
  );
}
