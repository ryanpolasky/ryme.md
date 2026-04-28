import { useState } from "react";
import type { ProfileInfo, Social, SocialKind } from "../lib/types";
import { scrapeGithub } from "../lib/github";
import { Button, Input, Label, Section, Select, Textarea } from "./ui";

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

export function InfoForm({ info, onChange }: Props) {
  const [ghInput, setGhInput] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);

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
        // Replace socials wholesale if we got any back, otherwise keep existing.
        socials: data.socials?.length ? data.socials : info.socials,
      });
    } catch (e) {
      setGhError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setGhLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <Section title="Load from GitHub" hint="Public profile only. 60 req/hr per IP.">
        <div className="flex gap-2">
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
          <p className="text-[11px] text-red-400">{ghError}</p>
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
          <div>
            <Label>Org / School</Label>
            <Input
              placeholder="UT Dallas '26"
              value={info.org}
              onChange={(e) => set("org", e.target.value)}
            />
          </div>
          <div>
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
      </Section>

      <Section title="Socials" hint="Order shown is order rendered.">
        <div className="space-y-2">
          {info.socials.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Select
                value={s.kind}
                onChange={(e) =>
                  updateSocial(i, { kind: e.target.value as SocialKind })
                }
                className="w-28 shrink-0"
              >
                {SOCIAL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
              <Input
                value={s.value}
                onChange={(e) => updateSocial(i, { value: e.target.value })}
                placeholder={
                  s.kind === "email"
                    ? "you@domain.com"
                    : s.kind === "website"
                      ? "yoursite.com"
                      : s.kind === "x"
                        ? "@handle"
                        : "url or handle"
                }
              />
              <Button
                variant="ghost"
                onClick={() => removeSocial(i)}
                aria-label="remove"
                className="!px-2"
              >
                ×
              </Button>
            </div>
          ))}
          <Button variant="ghost" onClick={addSocial} className="w-full">
            + Add social
          </Button>
        </div>
      </Section>
    </div>
  );
}
