import type { Template } from "../types";
import terminalBoot from "./terminal-boot";
import glassBanner from "./glass-banner";

export const templates: Template[] = [terminalBoot, glassBanner];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export { terminalBoot, glassBanner };
