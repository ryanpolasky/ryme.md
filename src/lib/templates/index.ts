import type {
  Template,
  TemplateCategory,
  TemplateFamily,
} from "../types";
import terminalHeader from "./terminal-boot";
import terminalAbout from "./terminal-about";
import terminalFooter from "./terminal-footer";
import glassHeader from "./glass-banner";
import glassAbout from "./glass-about";
import glassFooter from "./glass-footer";
import sleekHeader from "./sleek-header";
import sleekAbout from "./about-card";
import sleekFooter from "./footer-wave";
import codeHeader from "./code-header";
import codeAbout from "./code-about";
import codeFooter from "./code-footer";
import neonHeader from "./neon-header";
import neonAbout from "./neon-about";
import neonFooter from "./neon-footer";
import blueprintHeader from "./blueprint-header";
import blueprintAbout from "./blueprint-about";
import blueprintFooter from "./blueprint-footer";

export const templates: Template[] = [
  terminalHeader,
  terminalAbout,
  terminalFooter,
  glassHeader,
  glassAbout,
  glassFooter,
  sleekHeader,
  sleekAbout,
  sleekFooter,
  codeHeader,
  codeAbout,
  codeFooter,
  neonHeader,
  neonAbout,
  neonFooter,
  blueprintHeader,
  blueprintAbout,
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

export {
  terminalHeader,
  terminalAbout,
  terminalFooter,
  glassHeader,
  glassAbout,
  glassFooter,
  sleekHeader,
  sleekAbout,
  sleekFooter,
  codeHeader,
  codeAbout,
  codeFooter,
  neonHeader,
  neonAbout,
  neonFooter,
  blueprintHeader,
  blueprintAbout,
  blueprintFooter,
};
