import type { ProfileInfo, SvgTemplate, TemplateTheme } from "../types";
import { socialIconSvg } from "../social-icons";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function renderSvg(info: ProfileInfo, theme: TemplateTheme): string {
  const W = 800;
  const H = 140;
  const cx = W / 2;

  const socials = info.socials.filter((s) => s.value.trim());
  const name = info.name || "you";
  const tag = info.tagline ? ` — ${info.tagline}` : "";

  // Three pulsing dots, staggered
  const dotY = 36;
  const dotSpacing = 14;
  const dots = [-1, 0, 1]
    .map(
      (i) =>
        `<circle class="dot d${i + 1}" cx="${cx + i * dotSpacing}" cy="${dotY}" r="3" fill="${theme.accent}"/>`,
    )
    .join("");

  // Top decorative gradient line
  const lineY = 14;

  // Socials row at the bottom
  const socialSize = 16;
  const socialGap = 18;
  const socialsTotalW =
    socials.length * socialSize + Math.max(0, socials.length - 1) * socialGap;
  const socialsStartX = cx - socialsTotalW / 2;
  const socialsY = H - 32;
  const socialsSvg = socials
    .map((s, i) => {
      const x = socialsStartX + i * (socialSize + socialGap);
      return `<g class="soc sf${i}" transform="translate(${x} ${socialsY - socialSize / 2})">${socialIconSvg(s.kind, socialSize, theme.muted)}</g>`;
    })
    .join("");

  const css = `
    .dot { animation: pulse 2s ease-in-out infinite; }
    .d1 { animation-delay: 0s }
    .d2 { animation-delay: 0.2s }
    .d3 { animation-delay: 0.4s }
    .signoff { animation: fade 4s ease-in-out infinite; }
    .soc { animation: socfade 4s ease-in-out infinite; }
    ${socials.map((_, i) => `.sf${i} { animation-delay: ${0.6 + i * 0.08}s }`).join("\n    ")}
    .topline { animation: lineslide 4s ease-in-out infinite; transform-origin: center; }

    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.1); }
    }
    @keyframes fade {
      0%, 12% { opacity: 0; }
      22%, 90% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes socfade {
      0%, 18% { opacity: 0; }
      30%, 90% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes lineslide {
      0%, 4% { transform: scaleX(0); }
      20%, 80% { transform: scaleX(1); }
      100% { transform: scaleX(0); }
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="footer-line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${theme.accent}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>
  <rect class="topline" x="80" y="${lineY}" width="${W - 160}" height="1.5" fill="url(#footer-line)" rx="1"/>
  ${dots}
  <text class="signoff" x="${cx}" y="${H / 2 + 14}" text-anchor="middle" fill="${theme.fg}" font-family='"Inter", system-ui, sans-serif' font-size="14" font-weight="500">made with <tspan fill="${theme.accent}">♥</tspan> by ${escapeXml(name)}${escapeXml(tag)}</text>
  ${socialsSvg}
</svg>`;
}

const template: SvgTemplate = {
  id: "footer-wave",
  name: "Footer Wave",
  description:
    "Pulsing dots over a 'made with ♥ by you' line, with your social icons. Quiet sign-off.",
  kind: "svg",
  category: "footer",
  width: 800,
  height: 140,
  duration: 4,
  defaultTheme: {
    bg: "#0a0a0b",
    fg: "#e7e7ea",
    accent: "#7c3aed",
    muted: "#8b8b94",
  },
  renderSvg,
};

export default template;
