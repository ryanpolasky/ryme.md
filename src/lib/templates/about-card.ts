import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import { fitFontSize, fitUniformFontSize, wrapByChars } from "../text-utils";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

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
  const PAD = 48;
  const DUR = `${loopDuration}s`;

  const bioLines = wrapByChars(info.bio || info.tagline || "", 78, 4);
  const pills = pillRow(info);

  // Inner usable width: W - 2*PAD - 16 (8px left/right indent).
  // Heading auto-shrinks 32 → 28 → 24 → 20 px to fit; truncates at 20px only
  // for absurd inputs.
  const INNER_W = W - PAD * 2 - 16;
  const titleFit = fitFontSize(
    info.name ? `Hi, I'm ${info.name}.` : "About me.",
    INNER_W,
    [32, 28, 24, 20],
    "sans",
  );
  const titleText = titleFit.text;
  const titleSize = titleFit.size;
  // Heading cap height tracks the fitted size (~0.75em).
  const HEADING_CAP_DYNAMIC = Math.round(titleSize * 0.75);

  // Vertically center the heading/bio/pills block by measuring the same
  // baseline-to-baseline offsets we'll use for placement, then putting the
  // visible top at (H - blockH) / 2.
  const HEADING_CAP = HEADING_CAP_DYNAMIC; // tracks fitted heading size
  const HEADING_DESC = 7;
  const HEADING_TO_BIO = 50;    // heading baseline -> first bio baseline
  const BIO_LINE_H = 22;
  const BIO_DESC = 5;
  const BIO_TO_PILL = 30;       // last bio descender -> pill rect top
  const PILL_HEIGHT = 22;
  const HEADING_TO_PILL = 60;   // heading baseline -> pill rect top (no bio)

  // Block height (top of heading cap to bottom of last element).
  let blockH = HEADING_CAP + HEADING_DESC; // heading only
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
        BIO_DESC +
        BIO_TO_PILL +
        PILL_HEIGHT
      : HEADING_CAP + HEADING_TO_PILL + PILL_HEIGHT;
  }

  const blockTop = Math.round((H - blockH) / 2);
  const HEADING_Y = blockTop + HEADING_CAP; // baseline
  const BIO_Y = HEADING_Y + HEADING_TO_BIO;
  const PILL_Y_TOP = bioLines.length
    ? BIO_Y + (bioLines.length - 1) * BIO_LINE_H + BIO_DESC + BIO_TO_PILL
    : HEADING_Y + HEADING_TO_PILL;
  // PILL_Y_TOP is the rect top; pill text was previously centered at PILL_Y - 14 + 11 = PILL_Y - 3
  // We use PILL_Y as the "pseudo-center" maintained by the old layout: rect top = PILL_Y - 14
  const PILL_Y = PILL_Y_TOP + 14;

  // Bio lines as <tspan>
  const bioTspans = bioLines
    .map(
      (l, i) =>
        `<tspan x="${PAD + 8}" dy="${i === 0 ? 0 : BIO_LINE_H}">${escapeXml(l)}</tspan>`,
    )
    .join("");

  // Pills - outer <g> owns the translate (SVG attr), inner <g> owns the CSS
  // scale animation. If you put both on the same element, CSS `transform: scale()`
  // *replaces* the SVG transform attribute mid-animation and pills collapse to (0,0).
  //
  // Find the largest font size at which all pills fit side-by-side within
  // INNER_W. Smaller sizes mean narrower pills, which lets us keep all of
  // them visible without truncating mid-word.
  const PILL_GAP = 8;
  const pillTotalAtSize = (size: number): number => {
    const charPx = size * 0.6; // mono em width
    const padX = Math.max(8, Math.round(size * 1.0));
    const widths = pills.map((p) => Math.round(p.length * charPx + padX * 2));
    return widths.reduce((s, w) => s + w, 0) + (pills.length - 1) * PILL_GAP;
  };
  const pillSizes = [11, 10, 9, 8];
  let pillSize = pillSizes[0];
  for (const s of pillSizes) {
    if (pillTotalAtSize(s) <= INNER_W) {
      pillSize = s;
      break;
    }
    pillSize = s; // fall through to smallest
  }
  const PILL_CHAR_PX = pillSize * 0.6;
  const PILL_PAD_X = Math.max(8, Math.round(pillSize * 1.0));
  // At the smallest size pills can still overflow if any single pill text is
  // huge. Cap each pill by the per-row budget derived from the current number
  // of pills so the full row always fits inside INNER_W.
  const perPillCap = pills.length
    ? Math.max(
        80,
        Math.floor((INNER_W - (pills.length - 1) * PILL_GAP) / pills.length),
      )
    : Math.floor(INNER_W * 0.55);
  const pillFit = fitUniformFontSize(
    pills,
    perPillCap,
    [pillSize],
    "mono",
  );
  const pillData = pillFit.texts.map((trimmed) => ({
    text: trimmed,
    width: Math.round(trimmed.length * PILL_CHAR_PX + PILL_PAD_X * 2),
  }));
  const PILL_HEIGHT_DYNAMIC = Math.max(20, pillSize * 1.83);
  const pillsSvg = pillData
    .map((d, i) => {
      const tx = PAD + 8 + cumulativePillX(pillData, i, PILL_GAP);
      const ty = PILL_Y - PILL_HEIGHT_DYNAMIC / 2;
      return `<g transform="translate(${tx} ${ty})">
        <g class="pill p${i}">
          <rect width="${d.width}" height="${PILL_HEIGHT_DYNAMIC}" rx="${PILL_HEIGHT_DYNAMIC / 2}" fill="${theme.accent}" fill-opacity="0.12" stroke="${theme.accent}" stroke-opacity="0.4"/>
          <text x="${d.width / 2}" y="${PILL_HEIGHT_DYNAMIC / 2}" fill="${theme.fg}" font-size="${pillSize}" font-family="ui-monospace, monospace" text-anchor="middle" dominant-baseline="middle">${escapeXml(d.text)}</text>
        </g>
      </g>`;
    })
    .join("");

  // Accent bar inset is fixed relative to the card (not the heading), so it
  // stays visually anchored regardless of where the centered text block lands.
  const BAR_INSET = 32;
  const barY = BAR_INSET;
  const barH = H - BAR_INSET * 2;

  // When loopText is off, render everything statically (text appears as if
  // already faded in, accent bar at full height). When on, run the existing
  // looping animation cycle.
  const css = loopText
    ? `
    .heading { animation: slidein ${DUR} ease-out infinite; }
    .bio { animation: fade ${DUR} ease-in-out infinite; }
    .pill { animation: pillpop ${DUR} ease-out infinite; transform-box: fill-box; transform-origin: center; }
    ${pills.map((_, i) => `.p${i} { animation-delay: ${0.4 + i * 0.12}s }`).join("\n    ")}
    .accentbar { animation: bar ${DUR} ease-out infinite; transform-origin: top left; }

    @keyframes slidein {
      0% { opacity: 0; transform: translateX(-12px) }
      8% { opacity: 1; transform: translateX(0) }
      90% { opacity: 1; transform: translateX(0) }
      100% { opacity: 0; transform: translateX(0) }
    }
    @keyframes fade {
      0%, 8% { opacity: 0 }
      18% { opacity: 1 }
      90% { opacity: 1 }
      100% { opacity: 0 }
    }
    @keyframes pillpop {
      0%, 14% { opacity: 0; transform: scale(0.85) }
      22% { opacity: 1; transform: scale(1) }
      90% { opacity: 1; transform: scale(1) }
      100% { opacity: 0; transform: scale(1) }
    }
    @keyframes bar {
      0% { transform: scaleY(0) }
      10% { transform: scaleY(1) }
      90% { transform: scaleY(1) }
      100% { transform: scaleY(1) }
    }
  `
    : `
    /* loopText off: render statically. */
    .pill { transform-box: fill-box; transform-origin: center; }
    .accentbar { transform-origin: top left; }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="card-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg}"/>
      <stop offset="100%" stop-color="${theme.bg}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#card-grad)" rx="14" ry="14"/>
  <rect x="${PAD - 16}" y="${barY}" width="3" height="${barH}" fill="${theme.accent}" rx="1.5" class="accentbar"/>
  <text class="heading" x="${PAD + 8}" y="${HEADING_Y}" fill="${theme.fg}" font-family='"Inter", system-ui, sans-serif' font-size="${titleSize}" font-weight="700">${escapeXml(titleText)}</text>
  <text class="bio" x="${PAD + 8}" y="${BIO_Y}" fill="${theme.muted}" font-family='"Inter", system-ui, sans-serif' font-size="15" font-weight="400">${bioTspans}</text>
  ${pillsSvg}
</svg>`;
}

function cumulativePillX(
  pills: { width: number }[],
  idx: number,
  gap: number,
): number {
  let x = 0;
  for (let i = 0; i < idx; i++) {
    x += pills[i].width + gap;
  }
  return x;
}

const template: SvgTemplate = {
  id: "sleek-about",
  name: "Sleek About",
  description:
    "Bio card with sliding heading, fading paragraph, pill tags, and a socials row.",
  kind: "svg",
  category: "about",
  family: "sleek",
  width: 800,
  height: 320,
  duration: 4,
  fields: ["name", "role", "org", "location", "bio", "tagline"],
  renderSvg,
};

export default template;
