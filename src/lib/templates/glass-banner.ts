import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize } from "../text-utils";
import {
  GLASS_TEXT,
  GLASS_TEXT_MUTED,
  escapeXml,
  glassBackground,
  glassCard,
  glassDefs,
  glassFrame,
  glassStyles,
} from "../glass-svg-shared";

/**
 * Glass Banner -- header SVG.
 *
 * Drifting mesh-gradient backdrop with a frosted card centered in the
 * canvas. The card carries up to three text rows:
 *
 *   1. Name              (large, semibold, near-white)
 *   2. role  ·  org      (mid-weight, slightly dimmer)
 *   3. tagline           (italic, even dimmer)
 *
 * Vertical centering uses cap-height + descender bookkeeping rather than
 * raw font size so different combinations of present/absent rows always
 * end up optically centered.
 */
function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 300;

  // Glass card geometry: 660x200, centered.
  const cardW = 660;
  const cardH = 200;
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;
  const TEXT_BUDGET = cardW - 64; // 32 px padding either side

  // ---- Lines + per-line vertical metrics so the block can be centered. ----
  type Line = {
    text: string;
    fill: string;
    size: number;
    weight: number;
    italic: boolean;
    cap: number;
    desc: number;
    gapBefore: number;
  };
  const lines: Line[] = [];

  const nameFit = fitFontSize(
    info.name || "Your Name",
    TEXT_BUDGET,
    [38, 32, 28, 24],
    "sans",
  );
  lines.push({
    text: nameFit.text,
    fill: GLASS_TEXT,
    size: nameFit.size,
    weight: 600,
    italic: false,
    cap: Math.round(nameFit.size * 0.74),
    desc: Math.round(nameFit.size * 0.18),
    gapBefore: 0,
  });

  const subtitleParts = [info.role, info.org].filter(Boolean);
  if (subtitleParts.length) {
    const subFit = fitFontSize(
      subtitleParts.join("  ·  "),
      TEXT_BUDGET,
      [15, 14, 13, 12],
      "sans",
    );
    lines.push({
      text: subFit.text,
      fill: GLASS_TEXT_MUTED,
      size: subFit.size,
      weight: 500,
      italic: false,
      cap: Math.round(subFit.size * 0.74),
      desc: Math.round(subFit.size * 0.22),
      gapBefore: 36,
    });
  }
  if (info.tagline) {
    const tagFit = fitFontSize(
      info.tagline,
      TEXT_BUDGET,
      [13, 12, 11],
      "sans",
    );
    lines.push({
      text: tagFit.text,
      // 70% of GLASS_TEXT (#f5f5f7) baked at 0.7 opacity via separate attribute.
      fill: GLASS_TEXT,
      size: tagFit.size,
      weight: 400,
      italic: true,
      cap: Math.round(tagFit.size * 0.74),
      desc: Math.round(tagFit.size * 0.22),
      gapBefore: 28,
    });
  }

  // Block extent: top of first cap → bottom of last descender.
  let blockH = lines[0].cap;
  for (let i = 1; i < lines.length; i++) blockH += lines[i].gapBefore;
  blockH += lines[lines.length - 1].desc;

  const cx = W / 2;
  const cardCenterY = cardY + cardH / 2;
  let ty = cardCenterY - blockH / 2 + lines[0].cap;

  const textNodes: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ty += lines[i].gapBefore;
    const l = lines[i];
    const fontStyle = l.italic ? "italic " : "";
    // Tagline gets opacity 0.7 to match the canvas original (rgba 0.7).
    const opacity = i === 2 ? ` opacity="0.7"` : "";
    textNodes.push(
      `<text x="${cx}" y="${ty}" text-anchor="middle" fill="${l.fill}" font-family='"Inter", system-ui, -apple-system, sans-serif' font-size="${l.size}" font-weight="${l.weight}" font-style="${fontStyle.trim() || "normal"}"${opacity}>${escapeXml(l.text)}</text>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${glassStyles(loopDuration, loopText)}</style>
  <defs>${glassDefs(theme)}</defs>
  ${glassBackground(W, H, theme)}
  ${glassCard(cardX, cardY, cardW, cardH, 18)}
  ${textNodes.join("\n  ")}
  ${glassFrame(W, H, 14)}
</svg>`;
}

const template: SvgTemplate = {
  id: "glass-header",
  name: "Glass Banner",
  description:
    "Drifting mesh-gradient backdrop with a frosted glass card carrying your name, role, and tagline.",
  kind: "svg",
  category: "header",
  family: "glass",
  width: 800,
  height: 300,
  duration: 8,
  fields: ["name", "role", "org", "tagline"],
  renderSvg,
};

export default template;
