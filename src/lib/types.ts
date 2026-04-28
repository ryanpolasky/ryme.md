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

export type ProfileInfo = {
  name: string;
  role: string;
  org: string;
  location: string;
  tagline: string;
  bio: string;
  socials: Social[];
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
  "footer",
];

export type TemplateFamily = "terminal" | "glass" | "sleek" | "code";

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
};

export const FAMILY_ORDER: TemplateFamily[] = [
  "terminal",
  "glass",
  "sleek",
  "code",
];

export const FAMILY_DEFAULT_THEME: Record<TemplateFamily, TemplateTheme> = {
  terminal: {
    bg: "#0a0a0b",
    fg: "#e7e7ea",
    accent: "#4ade80",
    muted: "#5a5a64",
  },
  glass: {
    bg: "#0b0b12",
    fg: "#f7f7fb",
    accent: "#7c3aed",
    muted: "#a5a5b3",
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
  | "socials";

export const INFO_FIELD_META: Record<
  InfoField,
  { label: string; placeholder: string; multiline?: boolean; hint?: string }
> = {
  name: { label: "Name", placeholder: "Your Name" },
  role: { label: "Role", placeholder: "Software Engineer" },
  org: { label: "Org / School", placeholder: "UT Dallas '26" },
  location: { label: "Location", placeholder: "Dallas, TX" },
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
  socials: { label: "Socials", placeholder: "" },
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
};

export type Section = {
  id: string;
  templateId: string;
};

/**
 * Optional knobs forwarded to render functions. Right now this just controls
 * whether content fades in/out across the loop (`loopText`); more options can
 * be added without breaking template signatures.
 *
 * Templates that don't care about an option simply ignore it.
 */
export type RenderOptions = {
  /**
   * When true (default), text/content animations cycle (fade out at the end
   * of the loop and fade back in). When false, content appears once and
   * stays. Cursor / wave / heartbeat-style animations remain infinite either
   * way.
   */
  loopText?: boolean;
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
  org: "UT Dallas '26",
  location: "Dallas, TX",
  tagline: "LLMs, iOS, infra. Recovering Java enjoyer.",
  bio: "I build things that turn LLM rollouts into accountable workflows. Lately: agent observability, replayable runs, and the kind of debugging tooling I wish existed when I started.",
  socials: [
    { kind: "github", value: "github.com/ryanpolasky" },
    { kind: "linkedin", value: "in/ryan-polasky" },
    { kind: "website", value: "ryanpolasky.com" },
  ],
};

export const EMPTY_INFO: ProfileInfo = {
  name: "",
  role: "",
  org: "",
  location: "",
  tagline: "",
  bio: "",
  socials: [],
};
