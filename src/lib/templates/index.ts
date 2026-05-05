import type {
  CodeSidebarFile,
  ProfileInfo,
  Section,
  Template,
  TemplateCategory,
  TemplateFamily,
} from "../types";
import terminalHeader from "./terminal-boot";
import terminalAbout from "./terminal-about";
import terminalSkills from "./terminal-skills";
import terminalGithubStats from "./terminal-github-stats";
import terminalFooter from "./terminal-footer";
import glassHeader from "./glass-banner";
import glassAbout from "./glass-about";
import glassSkills from "./glass-skills";
import glassGithubStats from "./glass-github-stats";
import glassFooter from "./glass-footer";
import sleekHeader from "./sleek-header";
import sleekAbout from "./about-card";
import sleekSkills from "./sleek-skills";
import sleekGithubStats from "./sleek-github-stats";
import sleekFooter from "./footer-wave";
import codeHeader from "./code-header";
import codeAbout from "./code-about";
import codeSkills from "./code-skills";
import codeGithubStats from "./code-github-stats";
import codeFooter from "./code-footer";
import neonHeader from "./neon-header";
import neonAbout from "./neon-about";
import neonSkills from "./neon-skills";
import neonGithubStats from "./neon-github-stats";
import neonFooter from "./neon-footer";
import blueprintHeader from "./blueprint-header";
import blueprintAbout from "./blueprint-about";
import blueprintSkills from "./blueprint-skills";
import blueprintGithubStats from "./blueprint-github-stats";
import blueprintFooter from "./blueprint-footer";

export const templates: Template[] = [
  terminalHeader,
  terminalAbout,
  terminalSkills,
  terminalGithubStats,
  terminalFooter,
  glassHeader,
  glassAbout,
  glassSkills,
  glassGithubStats,
  glassFooter,
  sleekHeader,
  sleekAbout,
  sleekSkills,
  sleekGithubStats,
  sleekFooter,
  codeHeader,
  codeAbout,
  codeSkills,
  codeGithubStats,
  codeFooter,
  neonHeader,
  neonAbout,
  neonSkills,
  neonGithubStats,
  neonFooter,
  blueprintHeader,
  blueprintAbout,
  blueprintSkills,
  blueprintGithubStats,
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

/**
 * Build the file-explorer entries for a code-family sidebar from the
 * current section list. Each entry maps to one section's downloaded
 * filename (matching whatever `filenameFor` resolves to in the editor).
 * The current section is marked active so the template can highlight it.
 *
 * Non-code templates ignore the resulting list, so this is safe to call
 * once and forward unconditionally.
 */
export function buildSidebarFiles(
  sections: Section[],
  currentSectionId: string | null,
  filenameFor: (section: Section) => string,
): CodeSidebarFile[] {
  return sections
    .map((s) => {
      const t = getTemplate(s.templateId);
      if (!t) return null;
      // Every template renders to SVG today (the glass family was ported
      // off canvas/GIF). The extension stays hardcoded so the sidebar's
      // file list matches what the editor's "Download all" zip emits.
      return {
        name: `${filenameFor(s)}.svg`,
        active: s.id === currentSectionId,
      };
    })
    .filter((entry): entry is CodeSidebarFile => entry !== null);
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
