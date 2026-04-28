import type { Template, TemplateCategory } from "../types";
import terminalBoot from "./terminal-boot";
import glassBanner from "./glass-banner";
import aboutCard from "./about-card";
import footerWave from "./footer-wave";

export const templates: Template[] = [
  terminalBoot,
  glassBanner,
  aboutCard,
  footerWave,
];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): Template[] {
  return templates.filter((t) => t.category === category);
}

export { terminalBoot, glassBanner, aboutCard, footerWave };
