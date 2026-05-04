import type { ProfileInfo, Social } from "./types";

// Zero-width and invisible separator chars that frequently sneak in from
// copy/paste sources (Slack, Notion, smart-quote autoreplace, RTL-marked
// regions, etc.). Stripping them keeps rendered text consistent across
// templates and avoids weird gaps in monospace SVG layouts.
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

// ASCII control chars we never want in rendered text. We KEEP horizontal
// tab (\x09) and line feed (\x0A); everything else in 0x00-0x1F and the
// C1 range (0x7F-0x9F) gets dropped because it can break SVG text content
// or render as a tofu glyph in the user's downloaded image.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x08\x0B-\x1F\x7F-\x9F]/g;

function stripJunk(s: string): string {
  return s.replace(ZERO_WIDTH, "").replace(CONTROL, "");
}

/**
 * Clean a single-line text field. Strips invisible junk, collapses any
 * internal whitespace runs (including stray newlines pasted from a long
 * source) into a single space, and trims the outer ends. Use this for
 * `name` / `role` / `org` / `location` / `tagline` -- anything that
 * templates render on a single line.
 */
export function cleanLine(s: string | undefined | null): string {
  if (typeof s !== "string") return "";
  return stripJunk(s).replace(/\s+/g, " ").trim();
}

/**
 * Clean a multi-line text field (the bio). Preserves intentional paragraph
 * breaks but normalizes them: CRLF/CR are folded to LF, each line is
 * individually trimmed and has its internal spaces collapsed, runs of 3+
 * blank lines collapse to 2, and the outer ends are trimmed. Single line
 * breaks within a paragraph are preserved so users can hard-break if they
 * really want to.
 */
export function cleanBio(s: string | undefined | null): string {
  if (typeof s !== "string") return "";
  const normalized = stripJunk(s.replace(/\r\n?/g, "\n"));
  const trimmedLines = normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  return trimmedLines.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Clean a social handle / URL value. Conservative on purpose: strip
 * invisible junk and outer whitespace, but leave the user's stylistic
 * choices intact -- whether to include `@`, whether to include the
 * protocol on a URL, whether to write `in/foo` vs `linkedin.com/in/foo`.
 * Templates render whatever the user typed.
 */
export function cleanSocialValue(s: string | undefined | null): string {
  if (typeof s !== "string") return "";
  return stripJunk(s).trim();
}

/**
 * One-shot cleaner for the whole ProfileInfo. Apply this at the rendering
 * boundary (just before passing info to a template's `renderSvg` /
 * `renderFrame` or to the GIF encoder). Form inputs hold the raw user
 * text so typing doesn't fight the user mid-stroke; only the rendered
 * output sees the cleaned values.
 *
 * Empty social rows (those whose value cleans down to "") are NOT dropped
 * here -- templates already filter them at render time, and dropping in
 * place would surprise a user mid-edit who's about to type into a row
 * they just added.
 */
export function cleanInfo(info: ProfileInfo): ProfileInfo {
  return {
    name: cleanLine(info.name),
    role: cleanLine(info.role),
    org: cleanLine(info.org),
    location: cleanLine(info.location),
    tagline: cleanLine(info.tagline),
    bio: cleanBio(info.bio),
    skills: cleanSkills(info.skills),
    socials: info.socials.map(
      (s): Social => ({
        kind: s.kind,
        value: cleanSocialValue(s.value),
      }),
    ),
    // GitHub username is just a single-line text field; same hygiene as
    // name / role. Stats are already-structured fetched data; we pass them
    // through unchanged because mutating them would lie about the fetch.
    githubUsername: cleanLine(info.githubUsername),
    githubStats: info.githubStats,
  };
}

/**
 * Normalize the skills list: clean each entry as a single line, drop empties,
 * and de-dupe (case-insensitively) while preserving the user's original
 * casing on the first occurrence.
 */
export function cleanSkills(skills: string[] | undefined | null): string[] {
  if (!Array.isArray(skills)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skills) {
    const cleaned = cleanLine(raw);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}
