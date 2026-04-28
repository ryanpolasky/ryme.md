/**
 * The RyMe.md mark — a square SVG glyph with `.md` set in chunky mono.
 *
 * Refined version of the inline gradient div the editor used to render. Goes
 * from accent-red bottom-left to amber-orange top-right with a subtle inner
 * highlight ring at 50% opacity to give the chip a lit-from-above feel that
 * holds up on both dark and light backgrounds.
 */
type Props = {
  size?: number;
  className?: string;
  /** Use a brighter glow ring (for the home hero where the mark is bigger). */
  glow?: boolean;
};

export function Logo({ size = 32, className = "", glow = false }: Props) {
  // ID is derived from the size so multiple instances on the same page don't
  // collide on `defs` ids.
  const gid = `ryme-grad-${size}`;
  const rid = `ryme-ring-${size}`;
  const radius = Math.round(size * 0.22);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="RyMe.md mark"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id={rid} cx="0.5" cy="0" r="0.85">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={glow ? "0.55" : "0.35"} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx={radius} fill={`url(#${gid})`} />
      <rect width="32" height="32" rx={radius} fill={`url(#${rid})`} />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily='"JetBrains Mono", ui-monospace, "SF Mono", monospace'
        fontSize="13"
        fontWeight="800"
        fill="#ffffff"
        letterSpacing="-0.5"
      >
        .md
      </text>
    </svg>
  );
}
