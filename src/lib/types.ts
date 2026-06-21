export type SocialKind =
  | "github"
  | "linkedin"
  | "email"
  | "website"
  | "x"
  | "instagram"
  | "facebook";

export type Social = {
  kind: SocialKind;
  value: string;
};

// GitHub data types live in their own DOM-free module so the Pages
// Function can import them under a Workers tsconfig. Re-exported here
// for back-compat with existing client imports.
import type { GitHubStats } from "./github-types";
export type {
  GitHubContributionCalendar,
  GitHubContributionDay,
  GitHubFetchError,
  GitHubLanguageBucket,
  GitHubRepoSummary,
  GitHubStats,
} from "./github-types";

export type ProfileInfo = {
  name: string;
  role: string;
  org: string;
  location: string;
  tagline: string;
  bio: string;
  skills: string[];
  socials: Social[];
  /**
   * The GitHub handle the user typed (already normalized -- no @, no URL).
   * Persists across sections so any github-aware template can use it.
   */
  githubUsername: string;
  /**
   * Last successful stats fetch, or null if none has happened yet. This
   * is derived/fetched data; the editor refreshes it on demand. Templates
   * that render bar charts pull from here; those that don't can ignore it.
   */
  githubStats: GitHubStats | null;
};

export type TemplateTheme = {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
};

export type Ctx2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export type TemplateCategory =
  | "header"
  | "about"
  | "skills"
  | "stats"
  | "footer";

export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; hint: string; defaultFilename: string }
> = {
  header: {
    label: "Header",
    hint: "Hero banner at the top of your README.",
    defaultFilename: "header",
  },
  about: {
    label: "About",
    hint: "A bio card. Who you are, what you do.",
    defaultFilename: "about",
  },
  skills: {
    label: "Skills",
    hint: "Tech stack / what you work with.",
    defaultFilename: "skills",
  },
  stats: {
    label: "Stats",
    hint: "GitHub activity, languages, and contributions.",
    defaultFilename: "gh-stats",
  },
  footer: {
    label: "Footer",
    hint: "Sign-off at the bottom of your README.",
    defaultFilename: "footer",
  },
};

export const CATEGORY_ORDER: TemplateCategory[] = [
  "header",
  "about",
  "skills",
  "stats",
  "footer",
];

export type TemplateFamily =
  | "terminal"
  | "glass"
  | "sleek"
  | "code"
  | "neon"
  | "blueprint"
  | "pixelfarm"
  // Celestial -- night-sky star chart (full 5-section family).
  | "celestial";

export const FAMILY_META: Record<
  TemplateFamily,
  { label: string; hint: string }
> = {
  terminal: {
    label: "Terminal",
    hint: "Monospace, shell prompt, mac-window chrome. Pure SVG.",
  },
  glass: {
    label: "Glass",
    hint: "Animated mesh gradient + glassmorphic card. Renders to GIF.",
  },
  sleek: {
    label: "Sleek",
    hint: "Editorial typography, accent bar, pill tags. Pure SVG.",
  },
  code: {
    label: "Code",
    hint: "VS Code window with syntax highlighting and a typing cursor. Pure SVG.",
  },
  neon: {
    label: "Neon",
    hint: "Synthwave cyberpunk - magenta/cyan glow, scanlines, perspective grid. Pure SVG.",
  },
  blueprint: {
    label: "Blueprint",
    hint: "Engineering drawing - cyanotype paper, dimension lines, title block, approval stamp. Pure SVG.",
  },
  pixelfarm: {
    label: "Quaint",
    hint: "Cozy farming-sim - wood-framed parchment, custom 5x7 pixel font, pixel-art sprites, earthy palette. Pure SVG.",
  },
  celestial: {
    label: "Celestial",
    hint: "Night-sky star chart - twinkling stars, a drawn constellation, a star-catalogue skills sheet, and observatory-style stats. Airy serif, pure SVG.",
  },
};

export const FAMILY_ORDER: TemplateFamily[] = [
  "terminal",
  "glass",
  "sleek",
  "code",
  "neon",
  "blueprint",
  "pixelfarm",
  "celestial",
];

export const FAMILY_DEFAULT_THEME: Record<TemplateFamily, TemplateTheme> = {
  terminal: {
    bg: "#0a0a0b",
    fg: "#e7e7ea",
    accent: "#4ade80",
    muted: "#5a5a64",
  },
  glass: {
    // Glass routes fg + muted to two of the three drifting mesh blobs (the
    // third is driven by accent). Defaults preserve the original cyan + pink
    // blob palette; text rendering in the glass family is decoupled from
    // these values and uses fixed GLASS_TEXT / GLASS_TEXT_MUTED constants
    // (see glass-shared.ts).
    bg: "#0b0b12",
    fg: "#22d3ee",
    accent: "#7c3aed",
    muted: "#f472b6",
  },
  sleek: {
    bg: "#0d0d10",
    fg: "#f7f7fb",
    accent: "#dc2626",
    muted: "#a5a5b3",
  },
  code: {
    // VS Code Dark+ palette: editor bg, default fg, keyword blue, comment gray.
    bg: "#1e1e1e",
    fg: "#d4d4d4",
    accent: "#569cd6",
    muted: "#6a737d",
  },
  neon: {
    // Synthwave palette: deep purple-black ground, soft pink fg for legibility
    // through the bloom, hot magenta primary glow, cyan secondary glow.
    bg: "#0a0118",
    fg: "#fde7ff",
    accent: "#ff2bd6",
    muted: "#22d3ee",
  },
  blueprint: {
    // Cyanotype paper: rich blueprint blue ground, paper-cream fg for body
    // text, pure white for high-emphasis dimension/leader lines, faded cyan
    // for grid + table rules + secondary annotations.
    bg: "#0e3a6e",
    fg: "#f1ece1",
    accent: "#ffffff",
    muted: "#7d9fc4",
  },
  pixelfarm: {
    // pixel-farm ignores `theme` at render time (it sources colors from
    // the family-internal PALETTE in `pixelfarm-shared.ts`), but the
    // global-theme pipeline still expects an entry here. Values mirror
    // the four most prominent palette tones (parchment / ink / apple /
    // wood-mid) so any UI that previews this entry as a swatch lands on
    // the right vibe.
    bg: "#f4e4bc",
    fg: "#3d2818",
    accent: "#d04a30",
    muted: "#7a4a23",
  },
  // Celestial maps these onto its star-chart palette via cePalette(): fg =
  // stars/text, muted = dim text, accent = the gold constellation/rule/sparkle
  // role, bg = the night-sky gradient (shaded top/mid/bottom).
  celestial: {
    bg: "#0e1530",
    fg: "#eef2fb",
    accent: "#d9b25b",
    muted: "#9fb1d6",
  },
};

// Which ProfileInfo fields a template actually uses on screen. Drives the
// per-section input form so each section only asks for what it needs.
export type InfoField =
  | "name"
  | "role"
  | "org"
  | "location"
  | "tagline"
  | "bio"
  | "skills"
  | "socials"
  | "github";

export const INFO_FIELD_META: Record<
  InfoField,
  { label: string; placeholder: string; multiline?: boolean; hint?: string }
> = {
  name: { label: "Name", placeholder: "Your Name" },
  role: { label: "Role", placeholder: "Software Engineer" },
  org: { label: "Org / School", placeholder: "Apple" },
  location: { label: "Location", placeholder: "Grand Forks, ND" },
  tagline: {
    label: "Tagline",
    placeholder: "One short line. Keep it punchy.",
    multiline: true,
  },
  bio: {
    label: "Bio",
    placeholder: "A paragraph for the About section.",
    multiline: true,
  },
  skills: {
    label: "Skills",
    placeholder: "TypeScript",
    hint: "Tech stack, tools, languages. Type and press Enter to add.",
  },
  socials: { label: "Socials", placeholder: "" },
  github: {
    label: "GitHub",
    placeholder: "your-handle",
    hint: "Live stars / repo count / language mix, fetched in the browser.",
  },
};

type TemplateBase = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  family: TemplateFamily;
  width: number;
  height: number;
  duration: number;
  /** Which ProfileInfo fields this template actually consumes. */
  fields: readonly InfoField[];
  /**
   * Optional. If present, the template's effective rendered height is a
   * function of `info` (e.g., skill chip lists that grow row-by-row).
   * Layout-aware consumers (Preview img/canvas sizing, the GIF encoder,
   * the Home showcase) call this when set; otherwise they fall back to
   * the static `height`. Width is always `width` -- variable-width banners
   * aren't a thing here.
   */
  intrinsicHeight?: (info: ProfileInfo) => number;
};

export type Section = {
  id: string;
  templateId: string;
};

/**
 * One file entry as it should appear in a code-family sidebar (file
 * explorer). `name` is the displayed filename, `active` marks the entry
 * currently being rendered. The list is ordered top-to-bottom.
 */
export type CodeSidebarFile = {
  name: string;
  active: boolean;
};

export type RenderOptions = {
  /**
   * When true (default), text/content animations cycle (fade out at the end
   * of the loop and fade back in). When false, content appears once and
   * stays. Cursor / wave / heartbeat-style animations remain infinite either
   * way.
   */
  loopText?: boolean;
  /**
   * Sibling sections whose filenames should appear in the code-family
   * sidebar (file explorer). Templates that don't render a sidebar
   * (everything except the `code-*` family) ignore this. When omitted,
   * code templates fall back to a static four-file list so isolated
   * previews still look like a real editor.
   */
  sidebarFiles?: CodeSidebarFile[];
};

export type CanvasTemplate = TemplateBase & {
  kind: "canvas";
  fps: number;
  renderFrame: (
    ctx: Ctx2D,
    t: number,
    info: ProfileInfo,
    theme: TemplateTheme,
    loopDuration: number,
    options?: RenderOptions,
  ) => void;
};

export type SvgTemplate = TemplateBase & {
  kind: "svg";
  renderSvg: (
    info: ProfileInfo,
    theme: TemplateTheme,
    loopDuration: number,
    options?: RenderOptions,
  ) => string;
};

// Loop duration UI bounds. 12s default per user preference; 30s soft max.
export const LOOP_DURATION_DEFAULT = 12;
export const LOOP_DURATION_MIN = 2;
export const LOOP_DURATION_MAX = 30;

export type Template = CanvasTemplate | SvgTemplate;

export const DEFAULT_INFO: ProfileInfo = {
  name: "Ryan Polasky",
  role: "Software Engineer",
  org: "Apple",
  location: "Grand Forks, ND",
  tagline: "LLMs, iOS, infra. Recovering Java enjoyer.",
  bio: "I build things that turn LLM rollouts into accountable workflows. Lately: agent observability, replayable runs, and the kind of debugging tooling I wish existed when I started.",
  skills: [
    "TypeScript",
    "Python",
    "Swift",
    "Rust",
    "Postgres",
    "Kubernetes",
    "FastAPI",
    "React",
  ],
  socials: [
    { kind: "github", value: "github.com/ryanpolasky" },
    { kind: "linkedin", value: "in/ryan-polasky" },
    { kind: "website", value: "ryanpolasky.com" },
  ],
  githubUsername: "",
  githubStats: null,
};

export const EMPTY_INFO: ProfileInfo = {
  name: "",
  role: "",
  org: "",
  location: "",
  tagline: "",
  bio: "",
  skills: [],
  socials: [],
  githubUsername: "",
  githubStats: null,
};
