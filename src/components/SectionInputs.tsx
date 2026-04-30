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
const SHORT: InfoField[] = ["name", "role", "org", "location"];

export function SectionInputs({ fields, info, onChange }: Props) {
  const has = (f: InfoField) => fields.includes(f);
  const set = <K extends keyof ProfileInfo>(k: K, v: ProfileInfo[K]) =>
    onChange({ ...info, [k]: v });

  const shortFields = SHORT.filter(has);

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
                value={(info[f] as string) ?? ""}
                onChange={(e) =>
                  set(f as "name" | "role" | "org" | "location", e.target.value)
                }
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
