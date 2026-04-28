export type SocialKind = "github" | "linkedin" | "email" | "website" | "x";

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

type TemplateBase = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  width: number;
  height: number;
  duration: number;
  defaultTheme: TemplateTheme;
};

export type Section = {
  id: string;
  templateId: string;
  themeOverride: Partial<TemplateTheme>;
};

export type CanvasTemplate = TemplateBase & {
  kind: "canvas";
  fps: number;
  renderFrame: (
    ctx: Ctx2D,
    t: number,
    info: ProfileInfo,
    theme: TemplateTheme,
  ) => void;
};

export type SvgTemplate = TemplateBase & {
  kind: "svg";
  renderSvg: (info: ProfileInfo, theme: TemplateTheme) => string;
};

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
