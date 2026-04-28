import { useState } from "react";
import { ChevronDown } from "lucide-react";
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

// Families whose templates have text-fade animations that benefit from the
// loop toggle. Glass templates render text statically (only the bg animates),
// so the toggle would be a no-op there and is hidden.
const FAMILIES_WITH_TEXT_LOOP: TemplateFamily[] = ["terminal", "sleek", "code"];

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
          {/* Family picker - segmented, no descriptions */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--color-text-muted)] mb-2">
              Style
            </p>
            <div
              className="grid gap-1.5 p-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
              style={{
                gridTemplateColumns: `repeat(${FAMILY_ORDER.length}, minmax(0,1fr))`,
              }}
            >
              {FAMILY_ORDER.map((f) => {
                const meta = FAMILY_META[f];
                const active = f === family;
                return (
                  <button
                    key={f}
                    onClick={() => onFamilyChange(f)}
                    className={`px-3 py-2 rounded-md border transition-all cursor-pointer min-w-0 flex items-center justify-center gap-2 ${
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
