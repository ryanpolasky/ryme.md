import type {
  ProfileInfo,
  Template,
  TemplateCategory,
  TemplateFamily,
} from "../types";
import terminalHeader from "./terminal-boot";
import terminalAbout from "./terminal-about";
import terminalSkills from "./terminal-skills";
import terminalFooter from "./terminal-footer";
import glassHeader from "./glass-banner";
import glassAbout from "./glass-about";
import glassSkills from "./glass-skills";
import glassFooter from "./glass-footer";
import sleekHeader from "./sleek-header";
import sleekAbout from "./about-card";
import sleekSkills from "./sleek-skills";
import sleekFooter from "./footer-wave";
import codeHeader from "./code-header";
import codeAbout from "./code-about";
import codeSkills from "./code-skills";
import codeFooter from "./code-footer";
import neonHeader from "./neon-header";
import neonAbout from "./neon-about";
import neonSkills from "./neon-skills";
import neonFooter from "./neon-footer";
import blueprintHeader from "./blueprint-header";
import blueprintAbout from "./blueprint-about";
import blueprintSkills from "./blueprint-skills";
import blueprintFooter from "./blueprint-footer";

export const templates: Template[] = [
  terminalHeader,
  terminalAbout,
  terminalSkills,
  terminalFooter,
  glassHeader,
  glassAbout,
  glassSkills,
  glassFooter,
  sleekHeader,
  sleekAbout,
  sleekSkills,
  sleekFooter,
  codeHeader,
  codeAbout,
  codeSkills,
  codeFooter,
  neonHeader,
  neonAbout,
  neonSkills,
  neonFooter,
  blueprintHeader,
  blueprintAbout,
  blueprintSkills,
  blueprintFooter,
];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): Template[] {
  return templates.filter((t) => t.category === category);
}

export function templatesByFamily(family: TemplateFamily): Template[] {
  return templates.filter((t) => t.family === family);
}

export function templateFor(
  family: TemplateFamily,
  category: TemplateCategory,
): Template | undefined {
  return templates.find((t) => t.family === family && t.category === category);
}

/**
 * Resolve the effective rendered height of `template` for the given `info`.
 * Templates that grow with content advertise this via `intrinsicHeight`;
 * everyone else falls back to the static `height`.
 */
export function templateHeightFor(
  template: Template,
  info: ProfileInfo,
): number {
  if (template.intrinsicHeight) return template.intrinsicHeight(info);
  return template.height;
}

export {
  terminalHeader,
  terminalAbout,
  terminalSkills,
  terminalFooter,
  glassHeader,
  glassAbout,
  glassSkills,
  glassFooter,
  sleekHeader,
  sleekAbout,
  sleekSkills,
  sleekFooter,
  codeHeader,
  codeAbout,
  codeSkills,
  codeFooter,
  neonHeader,
  neonAbout,
  neonSkills,
  neonFooter,
  blueprintHeader,
  blueprintAbout,
  blueprintSkills,
  blueprintFooter,
};
