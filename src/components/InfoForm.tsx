import { useEffect, useRef, useState } from "react";
import { EMPTY_INFO, type ProfileInfo, type Social, type SocialKind } from "../lib/types";
import { scrapeGithub } from "../lib/github";
import { SOCIAL_LABELS, SocialIcon } from "../lib/social-icons";
import { Button, Input, Label, Section, Textarea } from "./ui";

type Props = {
  info: ProfileInfo;
  onChange: (next: ProfileInfo) => void;
};

const SOCIAL_KINDS: SocialKind[] = [
  "github",
  "linkedin",
  "website",
  "email",
  "x",
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
  }
}

export function InfoForm({ info, onChange }: Props) {
  const [ghInput, setGhInput] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [openKindIdx, setOpenKindIdx] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close the popover on outside click / Escape
  useEffect(() => {
    if (openKindIdx === null) return;
    const onDocClick = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) {
        setOpenKindIdx(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKindIdx(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openKindIdx]);

  const set = <K extends keyof ProfileInfo>(k: K, v: ProfileInfo[K]) =>
    onChange({ ...info, [k]: v });

  const updateSocial = (idx: number, patch: Partial<Social>) => {
    const next = info.socials.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...info, socials: next });
  };
  const removeSocial = (idx: number) => {
    onChange({ ...info, socials: info.socials.filter((_, i) => i !== idx) });
  };
  const addSocial = () => {
    onChange({
      ...info,
      socials: [...info.socials, { kind: "website", value: "" }],
    });
  };

  const loadGithub = async () => {
    if (!ghInput.trim()) return;
    setGhLoading(true);
    setGhError(null);
    try {
      const data = await scrapeGithub(ghInput);
      onChange({
        ...info,
        ...data,
        socials: data.socials?.length ? data.socials : info.socials,
      });
    } catch (e) {
      setGhError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setGhLoading(false);
    }
  };

  const clearAll = () => {
    const ok = window.confirm(
      "Clear all fields? This wipes name, bio, socials — everything.",
    );
    if (!ok) return;
    onChange(EMPTY_INFO);
  };

  return (
    <div className="space-y-7 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Your info
        </h2>
        <Button
          variant="ghost"
          onClick={clearAll}
          className="text-[11px] !px-2 !py-1"
        >
          Clear all
        </Button>
      </div>

      <Section title="Load from GitHub" hint="Public profile. 60 req/hr per IP.">
        <div className="flex gap-2 min-w-0">
          <Input
            placeholder="username or github.com/user"
            value={ghInput}
            onChange={(e) => setGhInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadGithub();
              }
            }}
          />
          <Button
            variant="primary"
            disabled={ghLoading || !ghInput.trim()}
            onClick={loadGithub}
          >
            {ghLoading ? "..." : "Load"}
          </Button>
        </div>
        {ghError && (
          <p className="text-[11px] text-red-400 break-words">{ghError}</p>
        )}
      </Section>

      <Section title="Identity">
        <div>
          <Label>Name</Label>
          <Input value={info.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label>Role</Label>
          <Input
            placeholder="Software Engineer"
            value={info.role}
            onChange={(e) => set("role", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <Label>Org / School</Label>
            <Input
              placeholder="UT Dallas '26"
              value={info.org}
              onChange={(e) => set("org", e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <Label>Location</Label>
            <Input
              placeholder="Dallas, TX"
              value={info.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Tagline</Label>
          <Textarea
            rows={2}
            placeholder="One short line. Keep it punchy."
            value={info.tagline}
            onChange={(e) => set("tagline", e.target.value)}
          />
        </div>
        <div>
          <Label>Bio (longer)</Label>
          <Textarea
            rows={4}
            placeholder="A paragraph for the About section. Auto-wraps to ~4 lines."
            value={info.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        </div>
      </Section>

      <Section title="Socials" hint="Empty rows are skipped on render.">
        <div ref={popoverRef} className="space-y-1.5">
          {info.socials.map((s, i) => {
            const empty = !s.value.trim();
            const isOpen = openKindIdx === i;
            return (
              <div
                key={i}
                className={`flex gap-1.5 items-center transition-opacity ${
                  empty ? "opacity-55" : "opacity-100"
                }`}
              >
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenKindIdx(isOpen ? null : i)}
                    className="size-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] flex items-center justify-center hover:border-[var(--color-border-strong)] cursor-pointer transition-colors"
                    aria-label={`Change type (currently ${SOCIAL_LABELS[s.kind]})`}
                    title={SOCIAL_LABELS[s.kind]}
                  >
                    <SocialIcon kind={s.kind} size={14} />
                  </button>
                  {isOpen && (
                    <div className="absolute z-30 left-0 top-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg p-1 grid grid-cols-5 gap-0.5">
                      {SOCIAL_KINDS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            updateSocial(i, { kind: k });
                            setOpenKindIdx(null);
                          }}
                          className={`size-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
                            k === s.kind
                              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                          }`}
                          title={SOCIAL_LABELS[k]}
                        >
                          <SocialIcon kind={k} size={14} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  value={s.value}
                  onChange={(e) => updateSocial(i, { value: e.target.value })}
                  placeholder={placeholderFor(s.kind)}
                  className="min-w-0"
                />
                <button
                  type="button"
                  onClick={() => removeSocial(i)}
                  aria-label="remove social"
                  className="size-9 shrink-0 rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center cursor-pointer"
                >
                  ×
                </button>
              </div>
            );
          })}
          <Button
            variant="ghost"
            onClick={addSocial}
            className="w-full !mt-2"
          >
            + Add social
          </Button>
        </div>
      </Section>
    </div>
  );
}
