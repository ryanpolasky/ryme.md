/**
 * Shared parser for the `/api/render/:templateId` query string.
 *
 * The contract here is the inverse of `src/lib/embed-url.ts` -- whatever
 * the client serializes into the URL is what this function reads back
 * out. Keeping the two files in lockstep is the entire reason the param
 * key list is duplicated; the client and the Pages Function bundle
 * separately and don't share a runtime, so a single source of truth
 * lives in this comment block: see `embed-url.ts` for the canonical
 * shape.
 *
 * Files under `functions/api/_lib/` are NOT exposed as routes by Pages
 * (the leading underscore opts the directory out), but they ARE bundled
 * into adjacent function files that import from them.
 */

import type {
  ProfileInfo,
  Social,
  SocialKind,
  Template,
  TemplateTheme,
} from "../../../src/lib/types";
import { FAMILY_DEFAULT_THEME } from "../../../src/lib/types";

export type ParsedRender = {
  info: ProfileInfo;
  theme: TemplateTheme;
  loopDuration: number;
  loopText: boolean;
  /** Normalized github handle (no @, no URL, no trailing slash), or null. */
  username: string | null;
};

const HEX_RE = /^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const VALID_SOCIAL_KINDS: ReadonlySet<SocialKind> = new Set<SocialKind>([
  "github",
  "linkedin",
  "email",
  "website",
  "x",
  "instagram",
  "facebook",
]);

// Per-field length caps. The render endpoint is a public surface so we
// clamp aggressively to keep an attacker from feeding us multi-MB strings
// that would inflate the rendered SVG and burn CPU.
const LIMITS = {
  name: 200,
  role: 200,
  org: 200,
  location: 200,
  tagline: 500,
  bio: 1500,
  skill: 80,
  skillsMax: 40,
  socialValue: 300,
  socialsMax: 12,
} as const;

const LOOP_MIN = 1;
const LOOP_MAX = 60;
const LOOP_DEFAULT = 12;

export function parseRenderParams(
  sp: URLSearchParams,
  template: Template,
): ParsedRender {
  const familyDefault = FAMILY_DEFAULT_THEME[template.family];
  const theme: TemplateTheme = {
    bg: normHex(sp.get("bg")) ?? familyDefault.bg,
    fg: normHex(sp.get("fg")) ?? familyDefault.fg,
    accent: normHex(sp.get("accent")) ?? familyDefault.accent,
    muted: normHex(sp.get("muted")) ?? familyDefault.muted,
  };

  const username = parseUsername(sp.get("u"));

  const info: ProfileInfo = {
    name: clamp(sp.get("name"), LIMITS.name),
    role: clamp(sp.get("role"), LIMITS.role),
    org: clamp(sp.get("org"), LIMITS.org),
    location: clamp(sp.get("loc"), LIMITS.location),
    tagline: clamp(sp.get("tag"), LIMITS.tagline),
    bio: clamp(sp.get("bio"), LIMITS.bio),
    skills: parseSkills(sp.getAll("skills")),
    socials: parseSocials(sp),
    githubUsername: username ?? "",
    // Filled in by the render route after a successful /api/github fetch;
    // left null here so a request without `?u=` still produces a valid
    // (stats-less) render.
    githubStats: null,
  };

  const loopDuration = parseLoopDuration(sp.get("dur"));
  const loopText = sp.get("loop") !== "0";

  return { info, theme, loopDuration, loopText, username };
}

// ---------------------------------------------------------------------------
// Field normalizers.

function normHex(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw.trim().replace(/^#/, "");
  if (!HEX_RE.test(stripped)) return null;
  // Normalize 3-char shorthand into 6-char so downstream consumers can
  // assume the canonical form.
  const six =
    stripped.length === 3
      ? stripped
          .split("")
          .map((c) => c + c)
          .join("")
      : stripped;
  return `#${six.toLowerCase()}`;
}

function clamp(raw: string | null, maxLen: number): string {
  if (!raw) return "";
  // Strip ASCII control bytes (NUL, etc.) up front -- they can sneak
  // into the rendered SVG and break some viewers.
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, "");
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function parseSkills(raw: string[]): string[] {
  // Accept either `?skills=a,b,c` (single key, csv) or `?skills=a&skills=b`
  // (repeated key) -- whichever shape the client used.
  const pieces: string[] = [];
  for (const chunk of raw) {
    for (const part of chunk.split(",")) {
      const trimmed = part.trim();
      if (trimmed) pieces.push(trimmed.slice(0, LIMITS.skill));
    }
  }
  return pieces.slice(0, LIMITS.skillsMax);
}

function parseSocials(sp: URLSearchParams): Social[] {
  const out: Social[] = [];
  const seen = new Set<SocialKind>();
  for (const [key, value] of sp.entries()) {
    if (!key.startsWith("social.")) continue;
    if (out.length >= LIMITS.socialsMax) break;
    const kindRaw = key.slice("social.".length);
    if (!VALID_SOCIAL_KINDS.has(kindRaw as SocialKind)) continue;
    const kind = kindRaw as SocialKind;
    if (seen.has(kind)) continue;
    const v = clamp(value, LIMITS.socialValue);
    if (!v) continue;
    seen.add(kind);
    out.push({ kind, value: v });
  }
  return out;
}

function parseLoopDuration(raw: string | null): number {
  if (!raw) return LOOP_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return LOOP_DEFAULT;
  return Math.min(LOOP_MAX, Math.max(LOOP_MIN, Math.round(n)));
}

function parseUsername(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();
  if (!stripped) return null;
  return USERNAME_RE.test(stripped) ? stripped : null;
}
