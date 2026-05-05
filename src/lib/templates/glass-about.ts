import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import {
  CHAR_WIDTH_EM,
  fitFontSize,
  fitUniformFontSize,
  wrapByChars,
} from "../text-utils";
import { chipWidth } from "../chip-layout";
import {
  GLASS_TEXT,
  escapeXml,
  glassBackground,
  glassCard,
  glassDefs,
  glassFrame,
  glassStyles,
} from "../glass-svg-shared";

/**
 * Glass About -- biography card.
 *
 * Heading row ("Hi, I'm {name}" or "About me") + multi-line bio + a row
 * of pill tags drawn from role / org / location. The whole thing is
 * vertically centered inside a wide glass panel so present-or-absent rows
 * never leave the layout looking lopsided.
 *
 * Word-wrap uses the character-count heuristic (`wrapByChars`) since SVG
 * has no DOM `measureText`. The proportional-sans width estimate is
 * slightly conservative -- we'd rather under-fill a line than overflow.
 */

function pillRow(info: ProfileInfo): string[] {
  const out: string[] = [];
  if (info.role) out.push(info.role);
  if (info.org) out.push(info.org);
  if (info.location) out.push(info.location);
  return out;
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 320;

  // Card geometry: 30 px inset on every side.
  const PAD = 30;
  const cardW = W - PAD * 2;
  const cardH = H - PAD * 2;
  const cardX = PAD;
  const cardY = PAD;

  const innerX = cardX + 32;
  const innerW = cardW - 64;

  // Heading auto-shrinks 28 → 24 → 20 → 16. Identical sizes to the canvas.
  const headingFit = fitFontSize(
    info.name ? `Hi, I'm ${info.name}` : "About me",
    innerW,
    [28, 24, 20, 16],
    "sans",
  );
  const headingText = headingFit.text;
  const headingSize = headingFit.size;

  // Bio: wrap to ≤4 lines at 14 px sans. innerW / (14 * 0.55) ≈ 87 chars.
  const BIO_SIZE = 14;
  const bioMaxChars = Math.floor(innerW / (BIO_SIZE * CHAR_WIDTH_EM.sans));
  const bioLines = wrapByChars(info.bio || info.tagline || "", bioMaxChars, 4);

  const pills = pillRow(info);

  // Vertical metrics. The canvas template uses heading-cap = 0.75em,
  // descender = 0.21em; we keep those to preserve the spatial rhythm.
  const HEADING_CAP = Math.round(headingSize * 0.75);
  const HEADING_DESC = Math.round(headingSize * 0.21);
  const HEADING_TO_BIO = 40;
  const BIO_LINE_H = 22;
  const BIO_DESC = 5;
  const BIO_TO_PILL = 30;
  const HEADING_TO_PILL = 50;
  const PILL_BELOW_BASELINE = 8;

  let blockH = HEADING_CAP + HEADING_DESC;
  if (bioLines.length) {
    blockH =
      HEADING_CAP +
      HEADING_TO_BIO +
      (bioLines.length - 1) * BIO_LINE_H +
      BIO_DESC;
  }
  if (pills.length) {
    blockH = bioLines.length
      ? HEADING_CAP +
        HEADING_TO_BIO +
        (bioLines.length - 1) * BIO_LINE_H +
        BIO_TO_PILL +
        PILL_BELOW_BASELINE
      : HEADING_CAP + HEADING_TO_PILL + PILL_BELOW_BASELINE;
  }

  const cardCenterY = cardY + cardH / 2;
  let ty = Math.round(cardCenterY - blockH / 2 + HEADING_CAP);
  const headingY = ty;

  // Bio baselines, then last bio baseline becomes our pill anchor.
  const bioYs: number[] = [];
  if (bioLines.length) {
    let bioY = ty + HEADING_TO_BIO;
    for (let i = 0; i < bioLines.length; i++) {
      bioYs.push(bioY);
      bioY += BIO_LINE_H;
    }
    ty = bioY - BIO_LINE_H;
  }

  // ---- Pills ---------------------------------------------------------------
  // Find a font size at which all pills fit on a single row of innerW.
  // Mirrors the canvas template's [11, 10, 9, 8] ladder.
  type PillRendered = { text: string; w: number; size: number; pad: number };
  const pillData: PillRendered[] = [];
  let pillSize = 8;
  let pillPad = 8;
  let pillHeight = 18;

  if (pills.length) {
    const PILL_GAP = 8;
    const sizes = [11, 10, 9, 8];
    for (const s of sizes) {
      const padX = Math.max(8, Math.round(s * 0.85));
      const widths = pills.map((p) => chipWidth(p, s, padX, "mono"));
      const total =
        widths.reduce((sum, w) => sum + w, 0) + (pills.length - 1) * PILL_GAP;
      pillSize = s;
      pillPad = padX;
      if (total <= innerW) break;
    }
    pillHeight = Math.max(18, Math.round(pillSize * 1.83));

    // Per-pill character cap so the row stays inside innerW even at the
    // smallest font size when several long labels are present.
    const perPillCap = Math.max(
      80,
      Math.floor((innerW - (pills.length - 1) * PILL_GAP) / pills.length),
    );
    const fitted = fitUniformFontSize(
      pills,
      perPillCap,
      [pillSize],
      "mono",
    );
    for (const text of fitted.texts) {
      pillData.push({
        text,
        w: chipWidth(text, pillSize, pillPad, "mono"),
        size: pillSize,
        pad: pillPad,
      });
    }
  }

  // ---- Render --------------------------------------------------------------

  const headingNode = `<text x="${innerX}" y="${headingY}" fill="${GLASS_TEXT}" font-family='"Inter", system-ui, sans-serif' font-size="${headingSize}" font-weight="700">${escapeXml(headingText)}</text>`;

  const bioNodes = bioLines
    .map(
      (line, i) =>
        `<text x="${innerX}" y="${bioYs[i]}" fill="${GLASS_TEXT}" opacity="0.75" font-family='"Inter", system-ui, sans-serif' font-size="${BIO_SIZE}" font-weight="400">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  let pillNodes = "";
  if (pillData.length) {
    const pillY = bioLines.length ? ty + BIO_TO_PILL : ty + HEADING_TO_PILL;
    const PILL_GAP = 8;
    const radius = pillHeight / 2;
    let px = innerX;
    const parts: string[] = [];
    for (const p of pillData) {
      const rectY = pillY - pillHeight / 2 - 1;
      const textY = pillY + 1;
      // Fill via theme.accent at 0.18 + outline at 0.5 -- matching
      // canvas's rgba(theme.accent, 0.18) / 0.5 treatment.
      parts.push(
        `<rect x="${px}" y="${rectY}" width="${p.w}" height="${pillHeight}" rx="${radius}" ry="${radius}" fill="${theme.accent}" fill-opacity="0.18" stroke="${theme.accent}" stroke-opacity="0.5" stroke-width="1"/>`,
        `<text x="${px + p.pad}" y="${textY}" fill="${GLASS_TEXT}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="${p.size}" font-weight="500">${escapeXml(p.text)}</text>`,
      );
      px += p.w + PILL_GAP;
    }
    pillNodes = parts.join("\n  ");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${glassStyles(loopDuration, loopText)}</style>
  <defs>${glassDefs(theme)}</defs>
  ${glassBackground(W, H, theme)}
  ${glassCard(cardX, cardY, cardW, cardH, 18)}
  ${headingNode}
  ${bioNodes}
  ${pillNodes}
  ${glassFrame(W, H, 14)}
</svg>`;
}

const template: SvgTemplate = {
  id: "glass-about",
  name: "Glass About",
  description:
    "Drifting mesh-gradient backdrop with a wide glass card carrying your bio and tag pills.",
  kind: "svg",
  category: "about",
  family: "glass",
  width: 800,
  height: 320,
  duration: 10,
  fields: ["name", "role", "org", "location", "bio", "tagline"],
  renderSvg,
};

export default template;
