import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  GitBranch,
  HardDrive,
  Layers,
  Palette,
  Sparkles,
  Zap,
} from "lucide-react";
import { SocialIcon } from "../lib/social-icons";
import {
  DEFAULT_INFO,
  FAMILY_DEFAULT_THEME,
  type ProfileInfo,
} from "../lib/types";
import { getTemplate, templates } from "../lib/templates";
import { Logo } from "../components/Logo";

/**
 * Marketing/home page.
 *
 * Editorial dark layout with an Instrument Serif display heading, a live
 * gallery of actual rendered template SVGs (so the page itself is the demo),
 * and a clear CTA into /editor. The hero showcase fades the staggered SVGs
 * in on load - the first 1.2 s of any visit shows the page literally being
 * "rendered" the same way the templates render their own content.
 *
 * No server-side anything. Just static React + the same template renderers
 * the editor uses.
 */

// Demo profile used by every preview on this page. Slightly tweaked from
// DEFAULT_INFO to read better in the marketing context.
const DEMO_INFO: ProfileInfo = {
  ...DEFAULT_INFO,
  name: "Ryan Polasky",
  role: "Software Engineer",
  org: "UT Dallas '26",
  location: "Dallas, TX",
  tagline: "LLMs, iOS, infra. Recovering Java enjoyer.",
  bio: "I build things that turn LLM rollouts into accountable workflows. Lately: agent observability, replayable runs, and tooling I wish existed when I started.",
};

/**
 * Render any template by id directly into an `<img src=data:image/svg+xml>`
 * for SVG templates. Canvas/GIF templates aren't shown on the marketing page
 * (they'd need an animation loop and add bundle weight); we show a still-
 * frame approximation rendered as a static gradient placeholder.
 */
function TemplatePreview({
  templateId,
  loopText = true,
  className = "",
}: {
  templateId: string;
  loopText?: boolean;
  className?: string;
}) {
  const template = getTemplate(templateId);
  const dataUrl = useMemo(() => {
    if (!template || template.kind !== "svg") return "";
    const familyDefault = FAMILY_DEFAULT_THEME[template.family];
    const svg = template.renderSvg(DEMO_INFO, familyDefault, 12, { loopText });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [template, loopText]);

  if (!template) return null;

  // Canvas templates: show a stylized placeholder (the `glass` family doesn't
  // need to be in the gallery since we have plenty of SVG templates to lead
  // with on the home page).
  if (template.kind !== "svg") {
    return (
      <div
        className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] grid place-items-center text-[var(--color-text-dim)] text-[11px] font-mono ${className}`}
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      >
        glass family - animated GIF
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`${template.name} preview`}
      loading="lazy"
      className={`block w-full h-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
      style={{ aspectRatio: `${template.width} / ${template.height}` }}
    />
  );
}

// Highlighted by-family lineup we want shown in the showcase strip. Six tiles
// (3x2 on desktop) covering header + about across five standout SVG families.
// Glass is omitted from the showcase because it renders to GIF and the Home
// strip uses live SVG previews.
const SHOWCASE_TEMPLATE_IDS = [
  "sleek-header",
  "neon-header",
  "code-header",
  "terminal-header",
  "neon-about",
  "blueprint-about",
];

const FEATURES = [
  {
    icon: Zap,
    title: "Animated SVG + GIF",
    body: "Pick SVG for crisp scalable banners or GIF for compatibility. Both bake their animation in - no JavaScript required to play.",
  },
  {
    icon: HardDrive,
    title: "Browser-only",
    body: "Every byte of your README is rendered, encoded, and downloaded inside the tab. No servers, no upload, no API keys.",
  },
  {
    icon: Palette,
    title: "Themable, four colors",
    body: "Background, foreground, accent, muted - that's it. Swap them per-section or globally; everything cascades.",
  },
  {
    icon: Layers,
    title: "Stack sections freely",
    body: "Header, about, footer - mix and match templates from any family. Drag to reorder. Each template asks only for the fields it needs.",
  },
  {
    icon: Sparkles,
    title: "Loop or static",
    body: "Animated text fades on a 12-second cycle by default. Toggle to static and the text just appears - cursors and waves keep moving.",
  },
  {
    icon: GitBranch,
    title: "Drop-in for GitHub",
    body: "Save the file to your username/username repo, paste the path into the README, push. That's the whole deployment.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-[var(--color-accent)] selection:text-white">
      <NavBar />
      <main>
        <Hero />
        <Showcase />
        <Features />
        <HowItWorks />
        <CTABanner />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ------------------------------ NavBar ------------------------------ */

function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
        <Link
          to="/"
          aria-label="RyMe.md home"
          className="flex items-center gap-2.5 group"
        >
          <Logo size={32} />
          <span className="font-mono text-[13px] tracking-tight text-[var(--color-text)]">
            <span className="text-[var(--color-accent)]">Ry</span>
            <span>Me</span>
            <span className="text-[var(--color-text-dim)]">.md</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[12px] font-mono text-[var(--color-text-muted)]">
          <a href="#showcase" className="hover:text-[var(--color-text)] transition-colors">
            showcase
          </a>
          <a href="#features" className="hover:text-[var(--color-text)] transition-colors">
            features
          </a>
          <a href="#how" className="hover:text-[var(--color-text)] transition-colors">
            how it works
          </a>
          <a
            href="https://github.com/ryanpolasky/ryme.md"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-text)] transition-colors"
          >
            github
          </a>
        </nav>

        <Link
          to="/editor"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[var(--color-accent)] text-white text-[12.5px] font-medium tracking-tight shadow-[0_4px_24px_-8px_rgba(239,68,68,0.6)] hover:bg-[var(--color-accent-strong)] transition-colors"
        >
          Open editor
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </header>
  );
}

/* ------------------------------- Hero ------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Backdrop: soft radial glow tinted by accent + a faint grid. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(239,68,68,0.18), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-text) 1px, transparent 1px), linear-gradient(to bottom, var(--color-text) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 80%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 pt-20 sm:pt-28 pb-20 sm:pb-28">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-muted)] tracking-[0.18em] uppercase mb-8 fade-up">
          <span className="size-1.5 rounded-full bg-[var(--color-accent)] motion-safe:animate-pulse" />
          <span>v0.6 - pure browser</span>
        </div>

        {/* Headline */}
        <h1
          className="text-[14vw] sm:text-[8.4vw] lg:text-[124px] leading-[0.9] tracking-[-0.04em] text-[var(--color-text)] max-w-5xl fade-up"
          style={{ animationDelay: "60ms" }}
        >
          Your GitHub profile,
          <br />
          with{" "}
          <span
            className="italic font-normal align-baseline relative"
            style={{
              fontFamily: "var(--font-display)",
              backgroundImage:
                "linear-gradient(95deg, #fbbf24 0%, #f97316 38%, #ef4444 78%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            motion
            <span
              aria-hidden
              className="absolute -right-[0.78em] top-[0.86em] sm:-right-[0.84em] sm:top-[0.78em] text-[var(--color-accent)] text-[31%] tracking-tight opacity-90"
              style={{
                fontFamily: "var(--font-mono)",
                transform: "rotate(12deg)",
              }}
            >
              ✦
            </span>
          </span>
          .
        </h1>

        {/* Subheading */}
        <p
          className="mt-7 sm:mt-9 max-w-2xl text-[15.5px] sm:text-[17px] leading-relaxed text-[var(--color-text-muted)] fade-up"
          style={{ animationDelay: "180ms" }}
        >
          Drop-in animated banners for your README. SVG and GIF, themable,
          rendered entirely in your browser.{" "}
          <span className="text-[var(--color-text)] font-medium">
            Translation: your profile's about to be goated.
          </span>
        </p>

        {/* CTAs */}
        <div
          className="mt-9 flex flex-wrap items-center gap-3 fade-up"
          style={{ animationDelay: "300ms" }}
        >
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[var(--color-accent)] text-white text-[14.5px] font-medium tracking-tight shadow-[0_8px_40px_-12px_rgba(239,68,68,0.7)] hover:bg-[var(--color-accent-strong)] transition-all hover:translate-y-[-1px]"
          >
            Build your README
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#showcase"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[14.5px] text-[var(--color-text)] tracking-tight transition-colors"
          >
            See templates
          </a>
          <span className="text-[12px] font-mono text-[var(--color-text-dim)] ml-1">
            free · no signup · open source
          </span>
        </div>

        {/* Hero showcase - 3 stacked live previews on a slight diagonal. */}
        <div
          className="mt-16 sm:mt-20 fade-up"
          style={{ animationDelay: "420ms" }}
        >
          <HeroStack />
        </div>
      </div>
    </section>
  );
}

/**
 * Stacked, slightly-rotated trio of actual live SVG templates. The whole
 * group is wrapped in a perspective container so it tilts subtly toward the
 * reader. On mobile the rotations flatten so it doesn't look broken.
 */
function HeroStack() {
  return (
    <div
      className="relative max-w-5xl mx-auto"
      style={{ perspective: "1600px" }}
    >
      <div className="relative aspect-[800/520] sm:aspect-[800/440]">
        {/* Back layer - Code editor */}
        <div
          className="absolute inset-0 sm:left-[6%] sm:right-[6%] sm:top-[18%] sm:bottom-[36%] origin-bottom-right transition-transform"
          style={{
            transform:
              "rotateX(8deg) rotateZ(-1.3deg) translateZ(-30px)",
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.45))",
          }}
        >
          <TemplatePreview templateId="code-header" />
        </div>
        {/* Mid layer - Terminal boot */}
        <div
          className="absolute inset-0 sm:left-[2%] sm:right-[12%] sm:top-[10%] sm:bottom-[28%] origin-bottom-right transition-transform"
          style={{
            transform: "rotateX(6deg) rotateZ(0.4deg) translateZ(-15px)",
            filter: "drop-shadow(0 22px 50px rgba(0,0,0,0.4))",
          }}
        >
          <TemplatePreview templateId="terminal-header" />
        </div>
        {/* Front layer - Sleek header */}
        <div
          className="absolute inset-0 sm:left-[10%] sm:right-[2%] sm:top-[34%] sm:bottom-[0%] origin-bottom-left transition-transform"
          style={{
            transform: "rotateX(4deg) rotateZ(2deg) translateZ(0)",
            filter:
              "drop-shadow(0 36px 60px rgba(239,68,68,0.18)) drop-shadow(0 10px 28px rgba(0,0,0,0.5))",
          }}
        >
          <TemplatePreview templateId="sleek-header" />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Showcase ----------------------------- */

function Showcase() {
  return (
    <section
      id="showcase"
      className="relative border-t border-[var(--color-border)] bg-[var(--color-surface)]/40"
    >
      <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <SectionLabel>The template gallery</SectionLabel>
        <h2 className="mt-2 text-[36px] sm:text-[52px] tracking-[-0.03em] leading-[1.05] text-[var(--color-text)] max-w-3xl">
          Five families. Three sections. Pick a vibe.
        </h2>
        <p className="mt-5 max-w-2xl text-[15px] text-[var(--color-text-muted)] leading-relaxed">
          Every template renders right here in this page - what you see is
          what you'll embed. Themes are at their family defaults; the editor
          lets you remap any of the four colors.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7">
          {SHOWCASE_TEMPLATE_IDS.map((id) => {
            const t = getTemplate(id);
            if (!t) return null;
            return (
              <figure
                key={id}
                className="group relative rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-text-muted)] transition-colors"
              >
                <div className="p-3 sm:p-5">
                  <TemplatePreview templateId={id} className="!border-0" />
                </div>
                <figcaption className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 flex items-center justify-between gap-3 text-[12px] font-mono">
                  <span className="text-[var(--color-text)] truncate">
                    {t.name}
                  </span>
                  <span className="text-[var(--color-text-dim)] uppercase tracking-[0.12em] text-[10px]">
                    {t.family} · {t.category}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-text)] hover:text-[var(--color-text)] text-[var(--color-text-muted)] text-[13px] font-mono transition-colors"
          >
            See all {templates.length} templates
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Features ----------------------------- */

function Features() {
  return (
    <section id="features" className="relative">
      <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <SectionLabel>Why this exists</SectionLabel>
        <h2 className="mt-2 text-[36px] sm:text-[52px] tracking-[-0.03em] leading-[1.05] text-[var(--color-text)] max-w-3xl">
          Static READMEs are{" "}
          <span
            className="italic font-normal"
            style={{ fontFamily: "var(--font-display)" }}
          >
            so chopped
          </span>
          .
        </h2>
        <p className="mt-5 max-w-2xl text-[15px] text-[var(--color-text-muted)] leading-relaxed">
          Six things that make RyMe.md different from the dozens of "GitHub
          stats card" generators floating around.
        </p>

        <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 hover:border-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors group"
            >
              <div className="size-9 rounded-md bg-[var(--color-accent-soft)] grid place-items-center text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-white transition-colors">
                <f.icon className="size-4.5" strokeWidth={2.25} />
              </div>
              <h3 className="mt-5 text-[16.5px] tracking-tight text-[var(--color-text)] font-medium">
                {f.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-text-muted)]">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------- How It Works --------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Pick a vibe",
      body: "Glass for animated mesh. Sleek for editorial. Terminal for that mac-window dev energy. Code for syntax-highlighted profile.json.",
    },
    {
      n: "02",
      title: "Drop in your info",
      body: "Name, role, org, location, tagline, bio, socials. Or paste a public GitHub username and we'll pull the obvious stuff in for you.",
    },
    {
      n: "03",
      title: "Download and paste",
      body: "Hit Download SVG (or GIF). Save it under your username/username repo. Reference the path from your README. Push. Done.",
    },
  ];

  return (
    <section
      id="how"
      className="relative border-t border-[var(--color-border)] bg-[var(--color-surface)]/40"
    >
      <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <SectionLabel>Three steps</SectionLabel>
        <h2 className="mt-2 text-[36px] sm:text-[52px] tracking-[-0.03em] leading-[1.05] text-[var(--color-text)] max-w-3xl">
          From empty README to motion in{" "}
          <span
            className="italic font-normal"
            style={{ fontFamily: "var(--font-display)" }}
          >
            thirty seconds
          </span>
          .
        </h2>

        <ol className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7 relative">
          {/* Connecting hairline behind the step circles, MD+ only */}
          <div
            aria-hidden
            className="hidden md:block absolute top-[18px] left-[6%] right-[6%] h-px bg-gradient-to-r from-transparent via-[var(--color-border-strong)] to-transparent"
          />
          {steps.map((s, i) => (
            <li key={s.n} className="relative">
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-text-dim)] bg-[var(--color-bg)] px-3 py-1 rounded-full border border-[var(--color-border)]"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  STEP {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-[22px] tracking-tight text-[var(--color-text)] font-medium">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------- CTA Banner ----------------------------- */

function CTABanner() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(239,68,68,0.16), transparent 65%)",
        }}
      />
      <div className="max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-accent)]">
          ⏎ ready when you are
        </p>
        <h2 className="mt-5 text-[44px] sm:text-[72px] leading-[0.95] tracking-[-0.035em] text-[var(--color-text)]">
          Make your README{" "}
          <span
            className="italic font-normal"
            style={{
              fontFamily: "var(--font-display)",
              backgroundImage:
                "linear-gradient(95deg, #fbbf24 0%, #f97316 38%, #ef4444 78%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            move
          </span>
          .
        </h2>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[var(--color-accent)] text-white text-[15px] font-medium tracking-tight shadow-[0_12px_50px_-14px_rgba(239,68,68,0.7)] hover:bg-[var(--color-accent-strong)] transition-all hover:translate-y-[-1px]"
          >
            Open the editor
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="https://github.com/ryanpolasky/ryme.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[var(--color-text)] text-[15px] tracking-tight transition-colors"
          >
            <SocialIcon kind="github" size={16} />
            Source
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Footer ------------------------------ */

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/30">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[12px] font-mono text-[var(--color-text-dim)]">
        <div className="flex items-center gap-2.5">
          <Logo size={24} />
          <span>
            <span className="text-[var(--color-accent)]">Ry</span>
            <span className="text-[var(--color-text)]">Me</span>
            <span className="text-[var(--color-text-dim)]">.md</span>
            <span className="text-[var(--color-text-dim)]"> · v0.6</span>
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/ryanpolasky/ryme.md"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-text)] transition-colors"
          >
            github
          </a>
          <a
            href="https://www.linkedin.com/in/ryan-polasky/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-text)] transition-colors"
          >
            ryan polasky
          </a>
          <Link to="/editor" className="hover:text-[var(--color-text)] transition-colors">
            editor
          </Link>
        </div>
        <span className="text-[var(--color-text-dim)] text-right">
          everything renders in your browser. nothing leaves the tab.
        </span>
      </div>
    </footer>
  );
}

/* ------------------------------ Helpers ----------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
      <span className="size-1 rounded-full bg-[var(--color-accent)]" />
      {children}
    </span>
  );
}
