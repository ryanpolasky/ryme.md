import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { socialIconSvg } from "../social-icons";
import { fitFontSize } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const W = 800;
  const H = 180;
  const PAD_X = 40;
  const LINE_H = 22;
  const DUR = `${loopDuration}s`;

  const promptColor = theme.accent;
  const fg = theme.fg;
  const dim = theme.muted;

  const name = info.name || "you";
  const SOCIAL_LIMIT = 4;
  const socials = info.socials.filter((s) => s.value.trim()).slice(0, SOCIAL_LIMIT);
  const SOCIAL_MAX_CHARS = 30;
  const shownSocials = socials.map((s) => ({
    ...s,
    value:
      s.value.length > SOCIAL_MAX_CHARS
        ? s.value.slice(0, SOCIAL_MAX_CHARS - 1) + "…"
        : s.value,
  }));

  // Pre-compute social row layout so vertical centering knows the row count.
  const ICON = 12;
  const ENTRY_GAP = 10;
  const ROW_PREFIX_W = 80;
  const MAX_ROW_CONTENT_W = W - 2 * PAD_X - ROW_PREFIX_W - 20;

  // Width contributed by a single social entry (excluding the leading dot
  // separator on non-first entries).
  const entryW = (s: { value: string }) =>
    ICON + 4 + s.value.length * 8 + ENTRY_GAP;

  const allIdx = shownSocials.map((_, i) => i);
  const singleRowContentW = allIdx.reduce((sum, i, k) => {
    let w = entryW(shownSocials[i]);
    if (k > 0) w += ENTRY_GAP + 6;
    return sum + w;
  }, 0);
  const wrapSocials =
    shownSocials.length > 1 && singleRowContentW > MAX_ROW_CONTENT_W;
  const topCount = wrapSocials
    ? Math.ceil(shownSocials.length / 2)
    : shownSocials.length;
  const socialsRows: number[][] = wrapSocials
    ? [allIdx.slice(0, topCount), allIdx.slice(topCount)]
    : shownSocials.length
      ? [allIdx]
      : [];

  // Vertically center the row stack inside the area BELOW the menu chrome.
  //   Layout: logout, thanks, [N socials rows], blank, ready  -> (3+N)*LINE_H span.
  const totalSpan = (3 + socialsRows.length) * LINE_H;
  const MENU_BAR_BOTTOM = 48;
  const BOTTOM_PAD = 16;
  const usableMid = (MENU_BAR_BOTTOM + (H - BOTTOM_PAD)) / 2;
  const TOP = Math.round(usableMid - totalSpan / 2);

  type Row = { svg: string };
  const rows: Row[] = [];

  // Row 0: $ logout
  rows.push({
    svg:
      `<g transform="translate(${PAD_X} ${TOP})">` +
      `<text fill="${promptColor}">$</text>` +
      `<text x="20" fill="${fg}">logout</text>` +
      `</g>`,
  });

  // Row 1: [ session.end ]: thanks for visiting - {name}. Shrink the
  // trailing text size if it would overflow rather than truncating.
  let y = TOP + LINE_H;
  const THANKS_X = 128;
  // Keep a right-side safety margin; mono width estimates can run slightly
  // narrow relative to rendered glyph width.
  const THANKS_MAX_W = W - PAD_X - PAD_X - THANKS_X - 120;
  const thanksFit = fitFontSize(
    `thanks for visiting - ${name}`,
    THANKS_MAX_W,
    [13, 12, 11, 10],
    "mono",
  );
  rows.push({
    svg:
      `<g transform="translate(${PAD_X} ${y})">` +
      `<text fill="${dim}">[ </text>` +
      `<text x="14" fill="${promptColor}">session.end</text>` +
      `<text x="100" fill="${dim}"> ]:</text>` +
      `<text x="${THANKS_X}" font-size="${thanksFit.size}" fill="${fg}">${escapeXml(thanksFit.text)}</text>` +
      `</g>`,
  });

  // Socials rows (1 or 2). First row carries the `# socials` prefix; any
  // continuation row is indented to align with the first row's content.
  socialsRows.forEach((idxs, ri) => {
    y += LINE_H;
    const segs: string[] = [];
    if (ri === 0) {
      segs.push(`<text x="0" fill="${dim}"># socials</text>`);
    }
    let sx = ROW_PREFIX_W;
    idxs.forEach((i, k) => {
      const s = shownSocials[i];
      if (k > 0) {
        segs.push(`<text x="${sx}" fill="${dim}">·</text>`);
        sx += ENTRY_GAP + 6;
      }
      segs.push(
        `<g transform="translate(${sx} ${-ICON / 2})">${socialIconSvg(s.kind, ICON, fg)}</g>`,
      );
      sx += ICON + 4;
      segs.push(
        `<text x="${sx}" fill="${fg}">${escapeXml(s.value)}</text>`,
      );
      sx += s.value.length * 8 + ENTRY_GAP;
    });
    rows.push({
      svg: `<g transform="translate(${PAD_X} ${y})">${segs.join("")}</g>`,
    });
  });

  // Final $ _
  y += LINE_H * 2;
  rows.push({
    svg:
      `<g transform="translate(${PAD_X} ${y})">` +
      `<text fill="${promptColor}">$</text>` +
      `<rect x="20" y="-7" width="9" height="14" fill="${fg}" style="animation: blink 1s steps(1) infinite" />` +
      `</g>`,
  });

  // Animations
  const keyframes: string[] = [];
  const rowStyles: string[] = [];
  // When loopText is off, skip text fade-in entirely so the SVG renders with
  // text already on screen at frame 0. The cursor keeps blinking either way.
  const animatedRows = rows.map((r, i) => {
    if (!loopText) {
      return r.svg;
    }
    const start = i * 7; // ~7% per row stagger over 8s
    const visStart = start + 4;
    const visEnd = 86;
    const fadeOut = 94;
    keyframes.push(
      `@keyframes ln${i} { 0%,${start}% { opacity: 0 } ${visStart}%,${visEnd}% { opacity: 1 } ${fadeOut}%,100% { opacity: 0 } }`,
    );
    rowStyles.push(
      `.ln${i} { animation: ln${i} ${DUR} ease-in-out infinite }`,
    );
    return r.svg.replace("<g ", `<g class="ln${i}" `);
  });

  const cursorKey = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;

  const css = `
    text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; dominant-baseline: middle; }
    ${keyframes.join("\n    ")}
    ${cursorKey}
    ${rowStyles.join("\n    ")}
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>
  <g opacity="0.5">
    <circle cx="24" cy="24" r="6" fill="#ff5f57"/>
    <circle cx="44" cy="24" r="6" fill="#febc2e"/>
    <circle cx="64" cy="24" r="6" fill="#28c840"/>
  </g>
  <text x="${W / 2}" y="28" fill="${dim}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle">~ / signoff</text>
  ${animatedRows.join("\n  ")}
</svg>`;
}

const template: SvgTemplate = {
  id: "terminal-footer",
  name: "Terminal Logout",
  description:
    "Mac terminal logging out with a thanks-for-visiting line and your socials.",
  kind: "svg",
  category: "footer",
  family: "terminal",
  width: 800,
  height: 180,
  duration: 8,
  fields: ["name", "socials"],
  renderSvg,
};

export default template;
