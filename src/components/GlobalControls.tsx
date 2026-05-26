import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  FAMILY_DEFAULT_THEME,
  FAMILY_META,
  FAMILY_ORDER,
  LOOP_DURATION_MAX,
  LOOP_DURATION_MIN,
  type TemplateFamily,
  type TemplateTheme,
} from "../lib/types";

type Props = {
  family: TemplateFamily;
  onFamilyChange: (next: TemplateFamily) => void;
  globalTheme: Partial<TemplateTheme>;
  onGlobalThemeChange: (next: Partial<TemplateTheme>) => void;
  loopDuration: number;
  onLoopDurationChange: (next: number) => void;
  loopText: boolean;
  onLoopTextChange: (next: boolean) => void;
};

// Show the loop toggle only for families where text itself fully disappears
// and reappears over the cycle. Families with always-visible text (glass,
// neon, blueprint) keep ambient/decorative motion but don't need this control.
// Quaint (pixelfarm) belongs here too -- its pf-pop keyframe fades content
// back to opacity 0 at 100%, so the wood-framed text vanishes between loops
// just like the terminal cursor blink.
const FAMILIES_WITH_TEXT_LOOP: TemplateFamily[] = [
  "terminal",
  "sleek",
  "code",
  "pixelfarm",
];

const themeKeys: (keyof TemplateTheme)[] = ["bg", "fg", "accent", "muted"];

function toHex(c: string): string {
  if (c.startsWith("#") && (c.length === 7 || c.length === 4)) return c;
  return "#000000";
}

export function GlobalControls({
  family,
  onFamilyChange,
  globalTheme,
  onGlobalThemeChange,
  loopDuration,
  onLoopDurationChange,
  loopText,
  onLoopTextChange,
}: Props) {
  const [open, setOpen] = useState(true);
  const familyDefault = FAMILY_DEFAULT_THEME[family];
  const effective: TemplateTheme = { ...familyDefault, ...globalTheme };
  const isDirty = themeKeys.some((k) => globalTheme[k] !== undefined);
  const showLoopToggle = FAMILIES_WITH_TEXT_LOOP.includes(family);

  // Keep the active family slot visible inside its scroll container.
  // Manual scrollLeft math (instead of scrollIntoView) so we never
  // accidentally scroll the page when the editor sidebar is sticky.
  const familyRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = familyRowRef.current;
    if (!row) return;
    const btn = row.querySelector<HTMLElement>(`[data-family="${family}"]`);
    if (!btn) return;
    const pad = 12;
    const left = btn.offsetLeft;
    const right = left + btn.offsetWidth;
    const viewL = row.scrollLeft;
    const viewR = viewL + row.clientWidth;
    if (left < viewL + pad) {
      row.scrollTo({ left: Math.max(0, left - pad), behavior: "smooth" });
    } else if (right > viewR - pad) {
      row.scrollTo({
        left: right - row.clientWidth + pad,
        behavior: "smooth",
      });
    }
  }, [family]);

  // Scroll-arrow visibility tracks whether more content exists past either
  // edge. Updated on scroll, resize, and family-list changes so the arrows
  // hide cleanly at the boundaries.
  const [canScrollL, setCanScrollL] = useState(false);
  const [canScrollR, setCanScrollR] = useState(false);
  const updateScrollState = useCallback(() => {
    const row = familyRowRef.current;
    if (!row) return;
    // 1px slop covers sub-pixel rounding (Safari, zoomed Chrome).
    setCanScrollL(row.scrollLeft > 1);
    setCanScrollR(row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
  }, []);
  useEffect(() => {
    if (!open) return;
    updateScrollState();
    const row = familyRowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(row);
    return () => ro.disconnect();
  }, [open, updateScrollState]);
  // Re-run after the active-slot scroll-into-view effect settles, so the
  // arrows reflect the new scroll position (smooth scroll resolves async).
  useEffect(() => {
    const id = window.setTimeout(updateScrollState, 350);
    return () => window.clearTimeout(id);
  }, [family, updateScrollState]);

  const scrollByDir = (dir: -1 | 1) => {
    const row = familyRowRef.current;
    if (!row) return;
    // ~one slot + gap so a click advances by exactly one family.
    row.scrollBy({ left: dir * 120, behavior: "smooth" });
  };

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[var(--color-surface-2)]/50 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0 flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Template &amp; Theme
          </h2>
          {/* Compact summary chips so the user knows what's set without expanding */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {FAMILY_META[family].label.toLowerCase()}
            </span>
            <span
              className="size-3 rounded-full ring-1 ring-white/10 shrink-0"
              style={{ background: effective.accent }}
              title={`accent: ${effective.accent}`}
            />
            <span className="text-[10px] font-mono text-[var(--color-text-dim)]">
              {loopDuration}s loop
            </span>
          </div>
        </div>
        <ChevronDown
          aria-hidden
          size={20}
          strokeWidth={2.25}
          className={`text-[var(--color-text-muted)] transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] p-5 space-y-5">
          {/* Family picker - segmented row that scrolls horizontally so each
              slot can keep a comfortable label width as more families are
              added. Edge chevrons fade in when more content sits past the
              boundary so the affordance reads at a glance. */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--color-text-muted)] mb-2">
              Style
            </p>
            <div className="relative">
              <div
                ref={familyRowRef}
                onScroll={updateScrollState}
                className="flex gap-1.5 p-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] overflow-x-auto scrollbar-thin snap-x snap-mandatory scroll-px-1"
              >
                {FAMILY_ORDER.map((f) => {
                  const meta = FAMILY_META[f];
                  const active = f === family;
                  return (
                    <button
                      key={f}
                      data-family={f}
                      onClick={() => onFamilyChange(f)}
                      className={`px-3 py-2 rounded-md border transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 snap-start min-w-[7rem] ${
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                          : "border-transparent hover:bg-[var(--color-surface)]"
                      }`}
                    >
                      <span
                        className="size-3 rounded-full ring-1 ring-white/10 shrink-0"
                        style={{ background: FAMILY_DEFAULT_THEME[f].accent }}
                      />
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Left edge: gradient scrim + chevron. Inset by 1px so the
                  parent border stays visible underneath. */}
              <button
                type="button"
                onClick={() => scrollByDir(-1)}
                aria-label="Scroll styles left"
                aria-hidden={!canScrollL}
                tabIndex={canScrollL ? 0 : -1}
                className={`absolute left-px top-px bottom-px w-10 flex items-center justify-start pl-1 rounded-l-md transition-opacity cursor-pointer ${
                  canScrollL
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
                style={{
                  background:
                    "linear-gradient(to right, var(--color-surface-2) 0%, var(--color-surface-2) 55%, transparent 100%)",
                }}
              >
                <ChevronLeft
                  size={16}
                  className="text-[var(--color-text)] drop-shadow"
                />
              </button>
              {/* Right edge: mirror of the left scrim. */}
              <button
                type="button"
                onClick={() => scrollByDir(1)}
                aria-label="Scroll styles right"
                aria-hidden={!canScrollR}
                tabIndex={canScrollR ? 0 : -1}
                className={`absolute right-px top-px bottom-px w-10 flex items-center justify-end pr-1 rounded-r-md transition-opacity cursor-pointer ${
                  canScrollR
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
                style={{
                  background:
                    "linear-gradient(to left, var(--color-surface-2) 0%, var(--color-surface-2) 55%, transparent 100%)",
                }}
              >
                <ChevronRight
                  size={16}
                  className="text-[var(--color-text)] drop-shadow"
                />
              </button>
            </div>
          </div>

          {/* Loop duration */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--color-text-muted)]">
                Loop duration
              </p>
              <span className="text-[11px] font-mono text-[var(--color-text)]">
                {loopDuration}s
              </span>
            </div>
            <input
              type="range"
              min={LOOP_DURATION_MIN}
              max={LOOP_DURATION_MAX}
              step={1}
              value={loopDuration}
              onChange={(e) =>
                onLoopDurationChange(Number(e.target.value))
              }
              className="w-full accent-[var(--color-accent)]"
              aria-label="Loop duration in seconds"
            />
            <p className="text-[10px] text-[var(--color-text-dim)] mt-1.5 leading-snug">
              How long one full animation cycle takes. Longer loops mean
              bigger GIF files and slower page loads.
            </p>
          </div>

          {/* Loop animation toggle - only for families with text-fade animations */}
          {showLoopToggle && (
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={loopText}
                  onChange={(e) => onLoopTextChange(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--color-accent)] cursor-pointer shrink-0"
                  aria-describedby="loop-text-help"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
                    Loop animation
                  </span>
                  <span
                    id="loop-text-help"
                    className="block text-[10px] text-[var(--color-text-dim)] mt-1 leading-snug"
                  >
                    On: text fades in and out each cycle. Off: text appears
                    once and stays. The cursor / wave / heartbeat keep
                    animating either way.
                  </span>
                </span>
              </label>
            </div>
          )}

          {/* Theme colors */}
          <div>
            <div className="flex items-baseline justify-between mb-2 gap-2">
              <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--color-text-muted)]">
                Theme
              </p>
              {isDirty ? (
                <button
                  onClick={() => onGlobalThemeChange({})}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline-offset-2 hover:underline cursor-pointer"
                >
                  reset to {FAMILY_META[family].label.toLowerCase()} default
                </button>
              ) : (
                <span className="text-[10px] text-[var(--color-text-dim)] font-mono">
                  {FAMILY_META[family].label.toLowerCase()} default
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {themeKeys.map((k) => (
                <label
                  key={k}
                  className="flex items-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <input
                    type="color"
                    value={toHex(effective[k])}
                    onChange={(e) =>
                      onGlobalThemeChange({
                        ...globalTheme,
                        [k]: e.target.value,
                      })
                    }
                    className="size-7 rounded cursor-pointer bg-transparent border border-[var(--color-border)]"
                  />
                  <span className="text-[var(--color-text-muted)] font-mono">
                    {k}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
