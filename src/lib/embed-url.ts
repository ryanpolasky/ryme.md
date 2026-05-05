import type {
  ProfileInfo,
  Template,
  TemplateTheme,
} from "./types";

/**
 * Build the public embed URL for a single section.
 *
 * The URL points at the `/api/render/:templateId` Pages Function which
 * re-renders the SVG live on every request. GitHub-aware templates pull
 * fresh stats off the matching `/api/github/:username` cache (6h KV TTL).
 *
 * URL shape (flat query params so they're easy to inspect/edit by hand):
 *
 *   /api/render/<template-id>
 *     ?u=<github-handle>                     // only github-aware templates
 *     &bg=<hex>&fg=<hex>&accent=<hex>&muted=<hex>   // 6-char hex, no `#`
 *     &name=...&role=...&org=...&loc=...&tag=...&bio=...
 *     &skills=react,ts,go
 *     &social.github=...&social.linkedin=...&social.x=...&...
 *     &dur=<seconds>                         // omitted at default 12s
 *     &loop=0                                // omitted at default (on)
 *
 * Only fields the template actually consumes (`template.fields`) and only
 * non-empty values are emitted, to keep URLs as short as possible while
 * still round-tripping the editor's full state.
 */
export function buildEmbedUrl(opts: {
  origin: string;
  template: Template;
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
  username?: string | null;
}): string {
  const { origin, template, info, theme, loopDuration, loopText, username } =
    opts;

  const url = new URL(`/api/render/${template.id}`, origin);
  const p = url.searchParams;
  const fieldSet = new Set<string>(template.fields);

  // GitHub handle: only on github-aware templates, and only if the user
  // has typed one. Without it the function still renders, just without
  // the live stats overlay.
  const handle = (username ?? info.githubUsername ?? "").trim().replace(/^@/, "");
  if (handle && fieldSet.has("github")) {
    p.set("u", handle);
  }

  // Theme. Always emit all four so the rendered output is independent of
  // any future change to FAMILY_DEFAULT_THEME -- a URL pasted into a
  // README years from now should still render exactly as it did the day
  // it was copied.
  p.set("bg", stripHash(theme.bg));
  p.set("fg", stripHash(theme.fg));
  p.set("accent", stripHash(theme.accent));
  p.set("muted", stripHash(theme.muted));

  const setIf = (key: string, value: string | undefined | null) => {
    const v = (value ?? "").trim();
    if (v) p.set(key, v);
  };

  if (fieldSet.has("name")) setIf("name", info.name);
  if (fieldSet.has("role")) setIf("role", info.role);
  if (fieldSet.has("org")) setIf("org", info.org);
  if (fieldSet.has("location")) setIf("loc", info.location);
  if (fieldSet.has("tagline")) setIf("tag", info.tagline);
  if (fieldSet.has("bio")) setIf("bio", info.bio);

  if (fieldSet.has("skills") && info.skills.length) {
    // Comma-csv keeps the URL inspectable. Skill names with commas in
    // them are extraordinarily rare, but if anyone really needs one they
    // can fall back to repeated `skills=` keys (the server treats both
    // forms equivalently).
    p.set("skills", info.skills.map((s) => s.trim()).filter(Boolean).join(","));
  }

  if (fieldSet.has("socials")) {
    for (const s of info.socials) {
      const v = (s.value ?? "").trim();
      if (!v) continue;
      p.set(`social.${s.kind}`, v);
    }
  }

  // Render options. Defaults are omitted to keep URLs compact.
  if (loopDuration !== 12 && Number.isFinite(loopDuration) && loopDuration > 0) {
    p.set("dur", String(Math.round(loopDuration)));
  }
  if (!loopText) p.set("loop", "0");

  return url.toString();
}

function stripHash(hex: string): string {
  return hex.replace(/^#/, "").toLowerCase();
}
