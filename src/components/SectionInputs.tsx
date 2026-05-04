import {
  INFO_FIELD_META,
  type InfoField,
  type ProfileInfo,
  type Social,
} from "../lib/types";
import { Input, Textarea } from "./ui";
import { SkillsEditor } from "./SkillsEditor";
import { SocialsEditor } from "./SocialsEditor";

type Props = {
  fields: readonly InfoField[];
  info: ProfileInfo;
  onChange: (next: ProfileInfo) => void;
};

// "Short" fields render in a 2-col grid; "wide" fields are full width.
// Tuple typed `as const` so `ShortField` resolves to the precise union of
// ProfileInfo string keys the inline grid actually edits -- which keeps
// `info[f]` strongly typed even as new InfoField values (e.g., "github")
// get added that don't map to a single string property on ProfileInfo.
const SHORT = ["name", "role", "org", "location"] as const;
type ShortField = (typeof SHORT)[number];

export function SectionInputs({ fields, info, onChange }: Props) {
  const has = (f: InfoField) => fields.includes(f);
  const set = <K extends keyof ProfileInfo>(k: K, v: ProfileInfo[K]) =>
    onChange({ ...info, [k]: v });

  const shortFields: ShortField[] = SHORT.filter(has);

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--color-border)] min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--color-text-muted)]">
          Content
        </p>
        <span className="text-[10px] text-[var(--color-text-dim)] font-mono">
          shared across sections
        </span>
      </div>

      {shortFields.length > 0 && (
        <div
          className="grid gap-2.5 min-w-0"
          style={{
            gridTemplateColumns: `repeat(${Math.min(shortFields.length, 2)}, minmax(0, 1fr))`,
          }}
        >
          {shortFields.map((f) => (
            <div key={f} className="min-w-0">
              <FieldLabel field={f} />
              <Input
                value={info[f] ?? ""}
                onChange={(e) => set(f, e.target.value)}
                placeholder={INFO_FIELD_META[f].placeholder}
              />
            </div>
          ))}
        </div>
      )}

      {has("tagline") && (
        <div className="min-w-0">
          <FieldLabel field="tagline" />
          <Textarea
            rows={2}
            value={info.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder={INFO_FIELD_META.tagline.placeholder}
          />
        </div>
      )}

      {has("bio") && (
        <div className="min-w-0">
          <FieldLabel field="bio" />
          <Textarea
            rows={4}
            value={info.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder={INFO_FIELD_META.bio.placeholder}
          />
        </div>
      )}

      {has("skills") && (
        <div className="min-w-0">
          <FieldLabel field="skills" />
          <SkillsEditor
            skills={info.skills}
            onChange={(next: string[]) => onChange({ ...info, skills: next })}
          />
        </div>
      )}

      {has("socials") && (
        <div className="min-w-0">
          <FieldLabel field="socials" />
          <SocialsEditor
            socials={info.socials}
            onChange={(next: Social[]) => onChange({ ...info, socials: next })}
          />
        </div>
      )}

      {has("github") && (
        <div className="min-w-0">
          <FieldLabel field="github" />
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-text-muted)] min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <span className="font-mono leading-relaxed break-words min-w-0">
                {info.githubUsername
                  ? `@${info.githubUsername}`
                  : "Use the GitHub loader above to fetch stats."}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-dim)] shrink-0 self-start">
                {info.githubStats?.source ?? "not loaded"}
              </span>
            </div>
            {info.githubStats && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--color-text-dim)]">
                <span>{info.githubStats.profile.publicRepos} repos</span>
                <span>
                  {info.githubStats.totals.commitsThisYear ?? "—"} commits
                </span>
                <span>{info.githubStats.languages[0]?.name ?? "—"} top lang</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ field }: { field: InfoField }) {
  const meta = INFO_FIELD_META[field];
  return (
    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1.5">
      {meta.label}
    </label>
  );
}
