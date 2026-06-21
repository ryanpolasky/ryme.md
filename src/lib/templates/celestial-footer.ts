import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import {
  BASE_KEYFRAMES,
  cePalette,
  esc,
  SERIF,
  skyBackdrop,
  sparkle,
  vignette,
} from "./celestial-shared";

const W = 800;
const H = 200;

const SOCIAL_LABEL: Record<string, string> = {
  github: "GITHUB",
  linkedin: "LINKEDIN",
  email: "EMAIL",
  website: "WEBSITE",
  x: "X",
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
};

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;
  const P = cePalette(theme);
  const cx = W / 2;

  const name = (info.name || "Your Name").trim();
  const socials = info.socials.filter((s) => s.value.trim());

  const labels = socials
    .slice(0, 5)
    .map((s) => SOCIAL_LABEL[s.kind] || s.kind.toUpperCase());
  const overflow = Math.max(0, socials.length - 5);
  const socialLine = labels.length
    ? labels.join("    \u2726    ") +
      (overflow > 0 ? `    \u2726    +${overflow}` : "")
    : "\u2014 no signals \u2014";

  // Compact, vertically-centered sign-off stack (H = 200).
  const dividerY = 40;
  const eyebrowY = 74;
  const nameY = 112;
  const socialsY = 142;
  const creditY = 168;
  const halfW = 150;

  const css = `
    ${BASE_KEYFRAMES}
    ${
      loopText
        ? `
    .ce-div { animation: ceReveal ${DUR} ease-out infinite; }
    .ce-eyebrow { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.06).toFixed(2)}s; }
    .ce-name { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.12).toFixed(2)}s; }
    .ce-socials { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.2).toFixed(2)}s; }
    .ce-credit { animation: ceReveal ${DUR} ease-out infinite; animation-delay: ${(loopDuration * 0.28).toFixed(2)}s; }
    `
        : ``
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>

  ${skyBackdrop(P, W, H, 0xf0072e)}
  ${vignette(W, H)}

  <!-- sparkle divider -->
  <g class="ce-div">
    <line x1="${cx - halfW}" y1="${dividerY}" x2="${cx - 18}" y2="${dividerY}" stroke="${P.accent}" stroke-width="1" opacity="0.7"/>
    <line x1="${cx + 18}" y1="${dividerY}" x2="${cx + halfW}" y2="${dividerY}" stroke="${P.accent}" stroke-width="1" opacity="0.7"/>
    ${sparkle(cx, dividerY, 7, P.accentLight)}
  </g>

  <text class="ce-eyebrow" x="${cx}" y="${eyebrowY}" text-anchor="middle" fill="${P.accent}" font-family="${SERIF}" font-size="12" letter-spacing="5">THANKS FOR STOPPING BY</text>
  <text class="ce-name" x="${cx}" y="${nameY}" text-anchor="middle" fill="${P.star}" font-family="${SERIF}" font-size="30" letter-spacing="1">${esc(name)}</text>
  <text class="ce-socials" x="${cx}" y="${socialsY}" text-anchor="middle" fill="${P.starDim}" font-family="${SERIF}" font-size="12" letter-spacing="2">${esc(socialLine)}</text>
  <text class="ce-credit" x="${cx}" y="${creditY}" text-anchor="middle" fill="${P.starDim}" fill-opacity="0.6" font-family="${SERIF}" font-size="9" letter-spacing="3">CHARTED ON RYME.MD</text>
</svg>`;
}

const template: SvgTemplate = {
  id: "celestial-footer",
  name: "Celestial Sign-off",
  description:
    "Closing sign-off under the stars: a sparkle divider, the name in airy serif, socials joined by sparkles, and a ryme.md credit.",
  kind: "svg",
  category: "footer",
  family: "celestial",
  width: W,
  height: H,
  duration: 8,
  fields: ["name", "socials"],
  renderSvg,
};

export default template;
