import { useEffect, useState } from "react";
import type { Social, SocialKind } from "../lib/types";
import { SOCIAL_LABELS, SocialIcon } from "../lib/social-icons";
import { Button, Input } from "./ui";

type Props = {
  socials: Social[];
  onChange: (next: Social[]) => void;
};

const SOCIAL_KINDS: SocialKind[] = [
  "github",
  "linkedin",
  "website",
  "email",
  "x",
  "instagram",
  "facebook",
];

function placeholderFor(kind: SocialKind): string {
  switch (kind) {
    case "email":
      return "you@domain.com";
    case "website":
      return "yoursite.com";
    case "x":
      return "@handle";
    case "linkedin":
      return "in/your-handle";
    case "github":
      return "github.com/your-handle";
    case "instagram":
      return "@handle";
    case "facebook":
      return "facebook.com/your-handle";
  }
}

export function SocialsEditor({ socials, onChange }: Props) {
  // Track which row is in "type-picker" mode. We render the picker as an
  // inline second row below the input rather than as a popover so it never
  // gets clipped by ancestors with `overflow: auto` (the sticky editor pane).
  const [openKindIdx, setOpenKindIdx] = useState<number | null>(null);

  useEffect(() => {
    if (openKindIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKindIdx(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openKindIdx]);

  const update = (idx: number, patch: Partial<Social>) =>
    onChange(socials.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const remove = (idx: number) => onChange(socials.filter((_, i) => i !== idx));
  const add = () => onChange([...socials, { kind: "website", value: "" }]);

  return (
    <div className="space-y-1.5 min-w-0">
      {socials.map((s, i) => {
        const empty = !s.value.trim();
        const isOpen = openKindIdx === i;
        return (
          <div key={i} className="space-y-1.5 min-w-0">
            <div
              className={`flex gap-1.5 items-center transition-opacity min-w-0 ${
                empty ? "opacity-55" : "opacity-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenKindIdx(isOpen ? null : i)}
                className={`size-9 shrink-0 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
                  isOpen
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
                }`}
                aria-label={`Change type (currently ${SOCIAL_LABELS[s.kind]})`}
                aria-expanded={isOpen}
                title={`${SOCIAL_LABELS[s.kind]} - click to change`}
              >
                <SocialIcon kind={s.kind} size={14} />
              </button>
              <Input
                value={s.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder={placeholderFor(s.kind)}
                className="min-w-0"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="remove social"
                className="size-9 shrink-0 rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center cursor-pointer"
              >
                ×
              </button>
            </div>
            {isOpen && (
              <div
                role="listbox"
                aria-label="Pick social type"
                className="flex gap-1 p-1 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)]"
              >
                {SOCIAL_KINDS.map((k) => {
                  const active = k === s.kind;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        update(i, { kind: k });
                        setOpenKindIdx(null);
                      }}
                      className={`flex-1 min-w-0 h-8 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-[10px] font-mono ${
                        active
                          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                      }`}
                      title={SOCIAL_LABELS[k]}
                    >
                      <SocialIcon kind={k} size={12} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <Button variant="ghost" onClick={add} className="w-full !mt-2">
        + Add social
      </Button>
    </div>
  );
}
