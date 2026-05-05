import type {
  ProfileInfo,
  RenderOptions,
  Social,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { CHAR_WIDTH_EM, approxTextWidth, fitFontSize } from "../text-utils";
import { socialIconSvg } from "../social-icons";
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
 * Glass Sign-off -- footer SVG.
 *
 * A wide thin glass card carrying a centered "made with ♥ by NAME"
 * sign-off (with the heart in `theme.accent`), an optional socials row
 * (or two rows if the entries don't fit on one line), and a low-opacity
 * `made with ryme.md` credit pinned to the bottom-right corner.
 */

function liveSocials(info: ProfileInfo): Social[] {
  return info.socials.filter((s) => s.value.trim());
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 160;

  // Wide thin glass card.
  const cardX = 24;
  const cardY = 18;
  const cardW = W - 48;
  const cardH = H - 36;

  const cx = W / 2;

  // ---- Sign-off composition ------------------------------------------------
  // Auto-shrink the *combined* signoff through 14 → 13 → 12 px so a long
  // tagline doesn't blow past the card edges. We size against the full
  // composed string so the left + heart + right segments always render at
  // the same font size (the layout below relies on this).
  //
  // Heart is rendered as ASCII `<3` (not the ♥ glyph) -- the SVG width
  // estimator is calibrated for proportional Latin glyphs, and the
  // Unicode heart's actual rendered width drifts across system font
  // fallbacks, which used to nudge the "by NAME" segment off-center.
  //
  // The segments are deliberately stored *without* edge whitespace and
  // joined with an explicit `SPACE` pixel gap. SVG renderers are
  // inconsistent about preserving leading/trailing whitespace inside
  // separate `<text>` elements (even with `xml:space="preserve"` --
  // several engines still strip leading space at element start), so
  // anchoring the gaps in pixel space avoids the whole class of bugs.
  const name = info.name || "you";
  const heart = "<3";
  const left = "made with";
  const rightCore = `by ${name}${info.tagline ? ` - ${info.tagline}` : ""}`;
  const fullSignoff = `${left} ${heart} ${rightCore}`;
  const SIGNOFF_BUDGET = cardW - 48;
  const signoffFit = fitFontSize(
    fullSignoff,
    SIGNOFF_BUDGET,
    [14, 13, 12],
    "sans",
  );
  const signoffSize = signoffFit.size;

  // If `fitFontSize` had to truncate, peel the truncated tail back into the
  // right-hand segment; otherwise it equals `rightCore`. The `left` and
  // `heart` strings are short and don't need to be truncated.
  const expectedPrefix = `${left} ${heart} `;
  const right = signoffFit.text.startsWith(expectedPrefix)
    ? signoffFit.text.slice(expectedPrefix.length)
    : rightCore;

  // One regular-space's worth of pixels at the current font size --
  // matches `approxTextWidth(" ", size, "sans")` so the total width equals
  // the budget the auto-shrink fitter validated against.
  const SPACE = signoffSize * CHAR_WIDTH_EM.sans;
  const lw = approxTextWidth(left, signoffSize, "sans");
  const hw = approxTextWidth(heart, signoffSize, "sans");
  const rw = approxTextWidth(right, signoffSize, "sans");
  const totalW = lw + SPACE + hw + SPACE + rw;
  const startX = cx - totalW / 2;
  const heartX = startX + lw + SPACE;
  const rightX = heartX + hw + SPACE;

  // ---- Socials measurement ------------------------------------------------
  const socials = liveSocials(info);
  const SOCIAL_MAX_CHARS = 42;
  const shownSocials = socials.map((s) => ({
    ...s,
    value:
      s.value.length > SOCIAL_MAX_CHARS
        ? s.value.slice(0, SOCIAL_MAX_CHARS - 1) + "…"
        : s.value,
  }));

  const ICON = 14;
  const ICON_GAP = 6;
  const ENTRY_GAP = 22;
  const ROW_GAP = 8;
  const MAX_ROW_W = cardW - 60;
  const SOCIAL_TEXT_SIZE = 11;

  // Mono labels: 0.6em average per char.
  const MONO_PX = SOCIAL_TEXT_SIZE * CHAR_WIDTH_EM.mono;
  const widths = shownSocials.map((s) => Math.round(s.value.length * MONO_PX));
  const entryWidths = widths.map((w) => ICON + ICON_GAP + w);
  const measureRow = (idxs: number[]): number => {
    if (idxs.length === 0) return 0;
    return (
      idxs.reduce((sum, i) => sum + entryWidths[i], 0) +
      (idxs.length - 1) * ENTRY_GAP
    );
  };
  const allIdx = shownSocials.map((_, i) => i);
  const singleRowW = measureRow(allIdx);
  const wrapSocials = shownSocials.length > 1 && singleRowW > MAX_ROW_W;
  const topCount = wrapSocials
    ? Math.ceil(shownSocials.length / 2)
    : shownSocials.length;
  const rowsIdxs: number[][] = wrapSocials
    ? [allIdx.slice(0, topCount), allIdx.slice(topCount)]
    : shownSocials.length
      ? [allIdx]
      : [];

  // ---- Vertical centering of (signoff + socials) inside the card ----------
  // Cap heights scale with the fitted signoff size so a 12 px signoff
  // snaps tighter to its socials than a 14 px one.
  const SIGNOFF_CAP = Math.round(signoffSize * 0.71);
  const SIGNOFF_DESC = Math.round(signoffSize * 0.21);
  const GROUP_GAP = 14;

  const socialsBlockH = rowsIdxs.length
    ? rowsIdxs.length * ICON + (rowsIdxs.length - 1) * ROW_GAP
    : 0;
  const groupHeight = rowsIdxs.length
    ? SIGNOFF_CAP + SIGNOFF_DESC + GROUP_GAP + socialsBlockH
    : SIGNOFF_CAP + SIGNOFF_DESC;
  const cardCenterY = cardY + cardH / 2;
  const groupTop = Math.round(cardCenterY - groupHeight / 2);
  const ty = groupTop + SIGNOFF_CAP;

  // ---- Build SVG nodes ----------------------------------------------------
  // Each segment is whitespace-clean and positioned at its precomputed `x`;
  // the visual gaps come from `SPACE` in the layout math, not from text
  // content (see the SPACE comment above for why).
  const signoffNodes = [
    `<text x="${startX}" y="${ty}" fill="${GLASS_TEXT}" opacity="0.85" font-family='"Inter", system-ui, sans-serif' font-size="${signoffSize}" font-weight="500">${escapeXml(left)}</text>`,
    `<text x="${heartX}" y="${ty}" fill="${theme.accent}" font-family='"Inter", system-ui, sans-serif' font-size="${signoffSize}" font-weight="500">${escapeXml(heart)}</text>`,
    `<text x="${rightX}" y="${ty}" fill="${GLASS_TEXT}" opacity="0.85" font-family='"Inter", system-ui, sans-serif' font-size="${signoffSize}" font-weight="500">${escapeXml(right)}</text>`,
  ].join("\n  ");

  let socialNodes = "";
  if (rowsIdxs.length) {
    const firstRowCenter = ty + SIGNOFF_DESC + GROUP_GAP + ICON / 2;
    const parts: string[] = [];
    rowsIdxs.forEach((rowIdxs, rowI) => {
      const rowW = measureRow(rowIdxs);
      let sx = cx - rowW / 2;
      const sy = firstRowCenter + rowI * (ICON + ROW_GAP);
      for (const i of rowIdxs) {
        // Icon: nested <svg> via <g transform="translate(...)"> -- same
        // approach the other footer templates use.
        parts.push(
          `<g transform="translate(${sx} ${sy - ICON / 2})" opacity="0.85">${socialIconSvg(shownSocials[i].kind, ICON, GLASS_TEXT)}</g>`,
        );
        // Text: dominant-baseline=middle keeps the value vertically aligned
        // with the icon's vertical center.
        const textX = sx + ICON + ICON_GAP;
        parts.push(
          `<text x="${textX}" y="${sy}" fill="${GLASS_TEXT}" opacity="0.65" font-family="ui-monospace, SFMono-Regular, monospace" font-size="${SOCIAL_TEXT_SIZE}" font-weight="500" dominant-baseline="middle">${escapeXml(shownSocials[i].value)}</text>`,
        );
        sx += ICON + ICON_GAP + widths[i] + ENTRY_GAP;
      }
    });
    socialNodes = parts.join("\n  ");
  }

  // ryme.md credit, anchored to the bottom-right corner of the glass
  // card itself (not the SVG canvas) so it sits a comfortable margin
  // inside the card's inner highlight instead of crowding the canvas
  // edge where it was hard to read.
  const creditX = cardX + cardW - 18;
  const creditY = cardY + cardH - 12;
  const creditNode = `<text x="${creditX}" y="${creditY}" fill="${GLASS_TEXT}" opacity="0.35" font-family="ui-monospace, SFMono-Regular, monospace" font-size="10" font-weight="400" text-anchor="end">made with ryme.md</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${glassStyles(loopDuration, loopText)}</style>
  <defs>${glassDefs(theme)}</defs>
  ${glassBackground(W, H, theme)}
  ${glassCard(cardX, cardY, cardW, cardH, 14)}
  ${signoffNodes}
  ${socialNodes}
  ${creditNode}
  ${glassFrame(W, H, 14)}
</svg>`;
}

const template: SvgTemplate = {
  id: "glass-footer",
  name: "Glass Sign-off",
  description:
    "Wide thin glass card with a centered sign-off and socials, built for the bottom of a glass-family stack.",
  kind: "svg",
  category: "footer",
  family: "glass",
  width: 800,
  height: 160,
  duration: 8,
  fields: ["name", "tagline", "socials"],
  renderSvg,
};

export default template;
