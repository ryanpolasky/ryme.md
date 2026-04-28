import type { ProfileInfo, SvgTemplate, TemplateTheme } from "../types";
import { socialIconSvg } from "../social-icons";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  if (!text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += " " + w;
    } else {
      lines.push(current);
      if (lines.length === maxLines) {
        current = "";
        break;
      }
      current = w;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // If we ran out of lines and still have words, add an ellipsis to the last
  if (lines.length === maxLines) {
    const stillHave = words.length > lines.join(" ").split(/\s+/).length;
    if (stillHave) {
      const last = lines[lines.length - 1];
      lines[lines.length - 1] =
        last.length > maxChars - 1 ? last.slice(0, maxChars - 1) + "…" : last + "…";
    }
  }
  return lines;
}

function pillRow(info: ProfileInfo): string[] {
  const out: string[] = [];
  if (info.role) out.push(info.role);
  if (info.org) out.push(info.org);
  if (info.location) out.push(info.location);
  return out;
}

function renderSvg(info: ProfileInfo, theme: TemplateTheme): string {
  const W = 800;
  const H = 280;
  const PAD = 48;
  const HEADING_Y = 70;
  const BIO_Y = 120;
  const PILL_Y = 230;

  const bioLines = wrapText(info.bio || info.tagline || "", 78, 4);
  const pills = pillRow(info);
  const socials = info.socials.filter((s) => s.value.trim());

  const titleText = info.name ? `Hi, I'm ${info.name}` : "About me";

  // Bio lines as <tspan>
  const bioTspans = bioLines
    .map(
      (l, i) =>
        `<tspan x="${PAD + 8}" dy="${i === 0 ? 0 : 22}">${escapeXml(l)}</tspan>`,
    )
    .join("");

  // Pills
  const pillsSvg = pills
    .map((p, i) => {
      // Approximate pill width: 12px padding * 2 + ~7.2px per char @ 12px font
      const w = Math.round(p.length * 7.2 + 24);
      return `<g class="pill p${i}" transform="translate(${
        PAD + 8 + cumulativePillX(pills, i)
      } ${PILL_Y - 14})">
        <rect width="${w}" height="22" rx="11" fill="${theme.accent}" fill-opacity="0.12" stroke="${theme.accent}" stroke-opacity="0.4"/>
        <text x="${w / 2}" y="11" fill="${theme.fg}" font-size="11" font-family="ui-monospace, monospace" text-anchor="middle" dominant-baseline="middle">${escapeXml(p)}</text>
      </g>`;
    })
    .join("");

  // Socials in top-right corner of card
  const socialsSize = 18;
  const socialsGap = 14;
  const socialsTotalW = socials.length * socialsSize + (socials.length - 1) * socialsGap;
  const socialsStartX = W - PAD - socialsTotalW;
  const socialsSvg = socials
    .map((s, i) => {
      const x = socialsStartX + i * (socialsSize + socialsGap);
      return `<g class="soc s${i}" transform="translate(${x} ${HEADING_Y - 28})">${socialIconSvg(s.kind, socialsSize, theme.muted)}</g>`;
    })
    .join("");

  // Animations
  const css = `
    .heading { animation: slidein 4s ease-out infinite; }
    .bio { animation: fade 4s ease-in-out infinite; }
    .pill { animation: pillpop 4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    ${pills.map((_, i) => `.p${i} { animation-delay: ${0.4 + i * 0.12}s }`).join("\n    ")}
    .soc { animation: socfade 4s ease-out infinite; }
    ${socials.map((_, i) => `.s${i} { animation-delay: ${0.6 + i * 0.08}s }`).join("\n    ")}
    .accentbar { animation: bar 4s ease-out infinite; transform-origin: top left; }

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
    @keyframes socfade {
      0%, 18% { opacity: 0 }
      28% { opacity: 1 }
      90% { opacity: 1 }
      100% { opacity: 0 }
    }
    @keyframes bar {
      0% { transform: scaleY(0) }
      10% { transform: scaleY(1) }
      90% { transform: scaleY(1) }
      100% { transform: scaleY(1) }
    }
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
  <rect x="${PAD - 16}" y="${HEADING_Y - 38}" width="3" height="${H - 2 * (HEADING_Y - 38) + 50}" fill="${theme.accent}" rx="1.5" class="accentbar"/>
  <text class="heading" x="${PAD + 8}" y="${HEADING_Y}" fill="${theme.fg}" font-family='"Inter", system-ui, sans-serif' font-size="32" font-weight="700">${escapeXml(titleText)}</text>
  ${socialsSvg}
  <text class="bio" x="${PAD + 8}" y="${BIO_Y}" fill="${theme.muted}" font-family='"Inter", system-ui, sans-serif' font-size="15" font-weight="400">${bioTspans}</text>
  ${pillsSvg}
</svg>`;
}

function cumulativePillX(pills: string[], idx: number): number {
  let x = 0;
  for (let i = 0; i < idx; i++) {
    x += Math.round(pills[i].length * 7.2 + 24) + 8;
  }
  return x;
}

const template: SvgTemplate = {
  id: "about-card",
  name: "About Card",
  description:
    "A bio card with a sliding heading, fading paragraph, and pill-row tags. Pure SVG, lays out cleanly.",
  kind: "svg",
  category: "about",
  width: 800,
  height: 280,
  duration: 4,
  defaultTheme: {
    bg: "#111114",
    fg: "#f7f7fb",
    accent: "#7c3aed",
    muted: "#a5a5b3",
  },
  renderSvg,
};

export default template;
