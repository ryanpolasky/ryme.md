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

type TemplateBase = {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  duration: number;
  defaultTheme: TemplateTheme;
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
  socials: [
    { kind: "github", value: "github.com/ryanpolasky" },
    { kind: "linkedin", value: "in/ryan-polasky" },
    { kind: "website", value: "ryanpolasky.com" },
  ],
};
