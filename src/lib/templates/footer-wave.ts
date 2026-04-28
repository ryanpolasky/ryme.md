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

// Build a polyline `d` attribute for a sine wave that's wider than the
// canvas so it can translate by exactly one period without seams.
function sineWavePath(
  startX: number,
  endX: number,
  centerY: number,
  amplitude: number,
  period: number,
  step: number,
): string {
  const parts: string[] = [];
  for (let x = startX; x <= endX; x += step) {
    const y = centerY + amplitude * Math.sin((x / period) * 2 * Math.PI);
    parts.push(
      parts.length === 0
        ? `M ${x} ${y.toFixed(2)}`
        : `L ${x} ${y.toFixed(2)}`,
    );
  }
  return parts.join(" ");
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const W = 800;
  const H = 160;
  const cx = W / 2;
  const DUR = `${loopDuration}s`;

  const socials = info.socials.filter((s) => s.value.trim());
  const name = info.name || "you";
  const tag = info.tagline ? ` - ${info.tagline}` : "";

  // Sign-off composes "made with ♥ by {name}{tag}". Auto-shrink the entire
  // line through 14 → 13 → 12 px to fit; truncates only at 12px for absurd
  // inputs. The whole composite shares a single font size so the heart and
  // text stay visually balanced.
  const SIGNOFF_BUDGET = W - 80;
  const fullSignoff = `made with ♥ by ${name}${tag}`;
  const signoffFit = fitFontSize(
    fullSignoff,
    SIGNOFF_BUDGET,
    [14, 13, 12],
    "sans",
  );
  const signoffSize = signoffFit.size;

  // Wave geometry: continuous sine, two layered phases.
  const PERIOD = 160;
  const AMP_BACK = 14;
  const AMP_FRONT = 9;
  const WAVE_Y = Math.round(H / 2);
  // Path covers x = -PERIOD * 2 to W + PERIOD * 2 so we can translate by
  // exactly one PERIOD and keep the wave seamless on both ends.
  const PATH_START = -PERIOD * 2;
  const PATH_END = W + PERIOD * 2;
  const wavePathBack = sineWavePath(
    PATH_START,
    PATH_END,
    WAVE_Y,
    AMP_BACK,
    PERIOD * 1.6,
    8,
  );
  const wavePathFront = sineWavePath(
    PATH_START,
    PATH_END,
    WAVE_Y,
    AMP_FRONT,
    PERIOD,
    6,
  );

  // Sign-off + socials are grouped together and the whole group is
  // vertically centered in the container. Visual metrics scale with the
  // fitted signoff size so vertical centering stays accurate at smaller
  // sizes. (~0.71em cap, ~0.21em descender for Inter.)
  const SIGNOFF_CAP = Math.round(signoffSize * 0.71);
  const SIGNOFF_DESC = Math.round(signoffSize * 0.21);
  const ICON = 14;
  const ICON_GAP = 6;
  const ENTRY_GAP = 22;
  const GROUP_GAP = 14;
  const ROW_GAP = 8;
  const MAX_ROW_W = W - 80;

  const entryWidths = socials.map(
    (s) => ICON + ICON_GAP + Math.round(s.value.length * 7.2),
  );

  // Decide whether to wrap into two rows. If the single-row width exceeds
  // MAX_ROW_W, split with the larger half on top (per spec).
  function rowWidth(idxs: number[]): number {
    if (idxs.length === 0) return 0;
    return (
      idxs.reduce((sum, i) => sum + entryWidths[i], 0) +
      (idxs.length - 1) * ENTRY_GAP
    );
  }
  const singleRowIdx = socials.map((_, i) => i);
  const singleRowW = rowWidth(singleRowIdx);
  const wrap = socials.length > 1 && singleRowW > MAX_ROW_W;
  const topCount = wrap ? Math.ceil(socials.length / 2) : socials.length;
  const rowsIdxs: number[][] = wrap
    ? [singleRowIdx.slice(0, topCount), singleRowIdx.slice(topCount)]
    : socials.length
      ? [singleRowIdx]
      : [];

  // Group height accounts for the actual number of socials rows.
  const socialsBlockH = rowsIdxs.length
    ? rowsIdxs.length * ICON + (rowsIdxs.length - 1) * ROW_GAP
    : 0;
  const groupHeight = rowsIdxs.length
    ? SIGNOFF_CAP + SIGNOFF_DESC + GROUP_GAP + socialsBlockH
    : SIGNOFF_CAP + SIGNOFF_DESC;
  const groupTop = Math.round((H - groupHeight) / 2);
  const signoffY = groupTop + SIGNOFF_CAP;
  const firstRowCenter =
    signoffY + SIGNOFF_DESC + GROUP_GAP + ICON / 2;

  const socialsSvg = rowsIdxs
    .map((rowIdxs, rowI) => {
      const rowW = rowWidth(rowIdxs);
      let socX = cx - rowW / 2;
      const rowY = firstRowCenter + rowI * (ICON + ROW_GAP);
      return rowIdxs
        .map((i) => {
          const s = socials[i];
          const xStart = socX;
          socX += entryWidths[i] + ENTRY_GAP;
          return `<g transform="translate(${xStart} ${rowY})">
        <g class="soc sf${i}">
          <g transform="translate(0 ${-ICON / 2})">${socialIconSvg(s.kind, ICON, theme.muted)}</g>
          <text x="${ICON + ICON_GAP}" y="0" fill="${theme.muted}" font-family="ui-monospace, monospace" font-size="12" dominant-baseline="middle">${escapeXml(s.value)}</text>
        </g>
      </g>`;
        })
        .join("");
    })
    .join("");

  // When loopText is off, the signoff + socials render statically (no
  // fade-in / fade-out). The wave drift and heartbeat stay infinite either
  // way per spec.
  const loopText = options?.loopText ?? true;
  const textAnimation = loopText
    ? `
    .signoff { animation: signoffIn ${DUR} ease-in-out infinite; }
    .soc { animation: socfade ${DUR} ease-in-out infinite; }
    ${socials.map((_, i) => `.sf${i} { animation-delay: ${(0.6 + i * 0.08).toFixed(2)}s }`).join("\n    ")}

    @keyframes signoffIn {
      0%, 8% { opacity: 0; transform: translateY(4px); }
      18%, 90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(0); }
    }
    @keyframes socfade {
      0%, 22% { opacity: 0; }
      32%, 90% { opacity: 1; }
      100% { opacity: 0; }
    }
  `
    : "";

  const css = `
    ${textAnimation}
    .heart { animation: heartbeat ${DUR} ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .wave-front { animation: drift-front ${DUR} linear infinite; }
    .wave-back { animation: drift-back ${DUR} linear infinite; }

    @keyframes heartbeat {
      0%, 40% { transform: scale(1); }
      45% { transform: scale(1.18); }
      50% { transform: scale(1); }
      55% { transform: scale(1.12); }
      60%, 100% { transform: scale(1); }
    }
    @keyframes drift-front {
      from { transform: translateX(0); }
      to { transform: translateX(-${PERIOD}px); }
    }
    @keyframes drift-back {
      from { transform: translateX(0); }
      to { transform: translateX(${(PERIOD * 1.6).toFixed(0)}px); }
    }
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <defs>
    <linearGradient id="wave-fade" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0"/>
      <stop offset="15%" stop-color="${theme.accent}" stop-opacity="0.45"/>
      <stop offset="85%" stop-color="${theme.accent}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="wave-fade-back" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0"/>
      <stop offset="15%" stop-color="${theme.accent}" stop-opacity="0.16"/>
      <stop offset="85%" stop-color="${theme.accent}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </linearGradient>
    <!-- Mask to fade the wave near the left/right edges so it tucks into the rounded corners. -->
    <linearGradient id="edge-mask" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="white" stop-opacity="0"/>
      <stop offset="10%" stop-color="white" stop-opacity="1"/>
      <stop offset="90%" stop-color="white" stop-opacity="1"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <mask id="edge-fade">
      <rect width="${W}" height="${H}" fill="url(#edge-mask)"/>
    </mask>
  </defs>

  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>

  <!-- Sine waves: outer <g> handles edge mask + animation translate -->
  <g mask="url(#edge-fade)">
    <g class="wave-back">
      <path d="${wavePathBack}" stroke="url(#wave-fade-back)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <g class="wave-front">
      <path d="${wavePathFront}" stroke="url(#wave-fade)" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>

  <!-- Sign-off line -->
  <text class="signoff" x="${cx}" y="${signoffY}" text-anchor="middle" fill="${theme.fg}" font-family='"Inter", system-ui, sans-serif' font-size="${signoffSize}" font-weight="500">made with <tspan class="heart" fill="${theme.accent}">♥</tspan> by ${escapeXml(name)}${escapeXml(tag)}</text>

  ${socialsSvg}
</svg>`;
}

const template: SvgTemplate = {
  id: "sleek-footer",
  name: "Sleek Wave",
  description:
    "Two layered sine waves drift behind a 'made with ♥' sign-off and your socials.",
  kind: "svg",
  category: "footer",
  family: "sleek",
  width: 800,
  height: 160,
  duration: 4,
  fields: ["name", "tagline", "socials"],
  renderSvg,
};

export default template;
