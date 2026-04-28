import type { Ctx2D, SocialKind } from "./types";

type IconDef = {
  paths: string[];
  viewBox: string;
};

// Stroke-based 24x24 icons (Lucide style). Render with fill=none, stroke=color, width=2,
// linecap=round, linejoin=round.
export const SOCIAL_ICONS: Record<SocialKind, IconDef> = {
  github: {
    viewBox: "0 0 24 24",
    paths: [
      "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
      "M9 18c-4.51 2-5-2-7-2",
    ],
  },
  linkedin: {
    viewBox: "0 0 24 24",
    paths: [
      "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z",
      "M2 9h4v12H2z",
      "M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    ],
  },
  website: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
      "M2 12h20",
      "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10",
      "M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10",
    ],
  },
  email: {
    viewBox: "0 0 24 24",
    paths: [
      "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
      "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",
    ],
  },
  x: {
    viewBox: "0 0 24 24",
    paths: ["M18 6 6 18", "m6 6 12 12"],
  },
};

// React component for use in form UI / preview chrome
type IconProps = {
  kind: SocialKind;
  size?: number;
  className?: string;
};

export function SocialIcon({ kind, size = 16, className }: IconProps) {
  const icon = SOCIAL_ICONS[kind];
  return (
    <svg
      viewBox={icon.viewBox}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// SVG-string helper for templates that emit raw SVG
export function socialIconSvg(
  kind: SocialKind,
  size: number,
  color: string,
): string {
  const icon = SOCIAL_ICONS[kind];
  return `<svg viewBox="${icon.viewBox}" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
}

// Canvas helper for canvas templates
export function drawSocialIcon(
  ctx: Ctx2D,
  kind: SocialKind,
  x: number,
  y: number,
  size: number,
  color: string,
  strokeWidth = 2,
) {
  const icon = SOCIAL_ICONS[kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of icon.paths) {
    ctx.stroke(new Path2D(d));
  }
  ctx.restore();
}

// Friendly short label (used in compact UI)
export const SOCIAL_LABELS: Record<SocialKind, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  website: "Website",
  email: "Email",
  x: "X / Twitter",
};
