<div align="center">

<img src="public/favicon.svg" alt="RyMe.md" width="72" height="72" />

# RyMe.md

**Your GitHub profile, with motion.**

Drop-in animated banners for your README. SVG and GIF, themable, rendered entirely in your browser.

[**Open the editor →**](https://ryme.md) &nbsp;·&nbsp; [Source](https://github.com/ryanpolasky/ryme.md) &nbsp;·&nbsp; [@ryan-polasky](https://www.linkedin.com/in/ryan-polasky/)

<br />

![v0.6](https://img.shields.io/badge/v0.6-pure_browser-ef4444?style=flat-square&labelColor=0a0a0b)
![SVG](https://img.shields.io/badge/SVG-animated-f97316?style=flat-square&labelColor=0a0a0b)
![GIF](https://img.shields.io/badge/GIF-24fps-fbbf24?style=flat-square&labelColor=0a0a0b)
![Browser only](https://img.shields.io/badge/no_server-no_signup-4ade80?style=flat-square&labelColor=0a0a0b)

</div>

---

## What is this

**RyMe.md** is a browser-only generator for animated GitHub profile README banners. Pick a template family — _Terminal_, _Glass_, _Sleek_, _Code_, _Neon_, _Blueprint_, _Quaint_, or _Celestial_ — fill in your name, role, bio, and socials, and download a ready-to-paste SVG or GIF. Everything renders, animates, and encodes inside the tab. No server. No upload. No API keys. No analytics.

The output is a single file you drop into your `username/username` repo and reference from your README. That's the whole deployment.

```markdown
![banner](https://raw.githubusercontent.com/<you>/<you>/main/header.svg)
```

## Why

Static READMEs are so chopped, and the dozen "GitHub stats card" generators floating around all converge on the same look. RyMe.md is for the people who want their profile to look intentionally designed — and want full control over the output without trusting a server.

- **Pure SVG with baked-in CSS keyframes** — animates in browsers, plays in `<img>` tags, plays in GitHub's markdown renderer. Zero JavaScript needed for playback.
- **GIF export via [`gifenc`](https://github.com/mattdesl/gifenc) in a Web Worker** — deterministic frame-by-frame rendering at 24 fps. The same renderer powers preview and export, so what you see is what ships.
- **Four-color themes** — `bg`, `fg`, `accent`, `muted`. Override per-section or globally.
- **Stack sections freely** — header, about, footer. Mix templates from different families. Each template asks only for the fields it actually renders.
- **Loop or static** — toggle text-fade animations off so a README reload doesn't replay the typing animation. Cursors and waves keep moving regardless.

## Template families

| Family | Vibe |
|---|---|
| **Terminal** | Monospace shell prompt with mac-window chrome |
| **Glass** | Drifting mesh-gradient backdrop + glassmorphic card |
| **Sleek** | Editorial typography, accent bar, pill tags |
| **Code** | VS Code window with syntax highlighting and a typing cursor |
| **Neon** | Synthwave — magenta/cyan glow, scanlines, perspective grid |
| **Blueprint** | Engineering drawing — cyanotype paper, dimension lines, title block |
| **Quaint** | Cozy farming-sim — wood-framed parchment, pixel-art sprites |
| **Celestial** | Night-sky star chart — twinkling stars, a drawn constellation |

Each family ships all five sections — header, about, skills, stats, footer — for **40 templates total**, growing.

## Quick start

```bash
git clone https://github.com/ryanpolasky/ryme.md.git
cd ryme.md
npm install
npm run dev          # http://localhost:5173 (or next free port)
```

Then visit `/` for the marketing page or `/editor` for the workspace.

The `Load` button in the editor's profile toolbar talks to a Pages
Function at `/api/github/:username`. `npm run dev` (vite alone) does not
serve that endpoint — for full stats the dev command is:

```bash
npm run pages:dev    # wrangler pages dev → http://localhost:8788
```

It runs vite under wrangler so both the static site and the function
are reachable on one origin. Without `GITHUB_TOKEN` (see Deploy below),
the function falls back to unauth REST and returns reduced stats; the
toolbar shows an `unauth` flag in that case.

> Wrangler will print a deprecation warning for the `-- <cmd>` mode.
> Ignore it for now — the alternative ("build to `dist`, then
> `wrangler pages dev dist`") loses Vite HMR, which is unacceptable
> for active development. When wrangler ships a unified dev command
> that keeps HMR, the script will be migrated.

```bash
npm run build        # tsc -b && vite build → ./dist
npm run preview      # serve ./dist locally
npm run lint         # eslint .
npm run pages:deploy # build + wrangler pages deploy dist
```

## How it works

Templates live in `src/lib/templates/` and are registered in [`src/lib/templates/index.ts`](src/lib/templates/index.ts). Each is one of two flavors:

### SVG templates

Export `renderSvg(info, theme, loopDuration, options?) => string`. The string is a complete `<svg>` document with CSS `@keyframes` animations baked in. The preview component renders it via `<img src="data:image/svg+xml,…">` — exactly the way GitHub's markdown renderer will. Download saves the raw SVG.

```ts
const template: SvgTemplate = {
  id: "code-header",
  name: "Code Editor",
  kind: "svg",
  category: "header",
  family: "code",
  width: 800,
  height: 300,
  duration: 12,
  fields: ["name", "role", "org", "location", "tagline"],
  renderSvg,
};
```

### Canvas templates

Export `renderFrame(ctx, t, info, theme, loopDuration, options?) => void`. The same function powers live preview (driven by `requestAnimationFrame`) **and** GIF export (driven by a deterministic `t = i / fps` loop into an `OffscreenCanvas`). No "record real time and pray" — frames are pixel-perfect.

The canvas export pipeline:

1. Main thread renders frame `i` into an `OffscreenCanvas`.
2. `getImageData` is transferred zero-copy to a Web Worker.
3. The worker quantizes the first frame's palette with [`gifenc`](https://github.com/mattdesl/gifenc), then reuses it for every subsequent frame (fast + temporally stable).
4. The worker streams encoded frames into a `GIFEncoder`, finishes, returns the bytes.
5. The main thread wraps in a `Blob` and triggers download.

### Adding a template

1. Create `src/lib/templates/your-template.ts`.
2. `export default` a `Template` (`SvgTemplate` or `CanvasTemplate`).
3. Add it to the array in `src/lib/templates/index.ts`.

That's it — picker, preview, and export pipeline pick it up automatically.

## Architecture

```
src/
├─ App.tsx                    # router (BrowserRouter + Home/Editor routes)
├─ pages/
│  ├─ Home.tsx                # marketing page with live template gallery
│  └─ Editor.tsx              # workspace (sections, theme, downloads)
├─ components/
│  ├─ Logo.tsx                # the .md mark (gradient SVG)
│  ├─ ProfileToolbar.tsx      # name/role/socials inputs + GitHub scrape
│  ├─ GlobalControls.tsx      # family picker + theme + loop controls
│  ├─ SectionEditor.tsx       # one section: inputs + download button
│  ├─ FullStackPreview.tsx    # right-pane preview + zip-all-sections
│  ├─ Preview.tsx             # SVG/Canvas preview wrappers
│  ├─ CombinedReadme.tsx      # the markdown snippet generator
│  ├─ SectionInputs.tsx       # field-driven input form
│  ├─ SocialsEditor.tsx       # socials list editor
│  └─ ui.tsx                  # shared button etc.
├─ lib/
│  ├─ types.ts                # Template, ProfileInfo, RenderOptions, families
│  ├─ text-utils.ts           # truncateToWidth, fitFontSize, fitUniformFontSize, wrapByChars
│  ├─ canvas-utils.ts         # SANS/MONO, rgba, roundRect, ctx.measureText helpers
│  ├─ social-icons.tsx        # 9 social kinds (github, linkedin, …) as SVG + canvas
│  ├─ glass-shared.ts         # mesh-gradient + glass card draw helpers
│  ├─ encoder/
│  │  ├─ encode.ts            # main-thread encodeGif(...) entrypoint
│  │  └─ worker.ts            # Web Worker: gifenc.GIFEncoder pipeline
│  └─ templates/
│     ├─ index.ts
│     ├─ code-header.ts       # profile.json
│     ├─ code-about.ts        # README.md
│     ├─ code-footer.ts       # output panel + status bar
│     ├─ neon-header.ts       # synthwave hero with grid floor
│     ├─ neon-about.ts        # holo-card with glitch bio
│     ├─ neon-footer.ts       # // END_TRANSMISSION + spectrum bars
│     ├─ glass-banner.ts
│     ├─ glass-about.ts
│     ├─ glass-footer.ts
│     ├─ sleek-header.ts
│     ├─ about-card.ts        # sleek-about
│     ├─ footer-wave.ts       # sleek-footer
│     ├─ terminal-boot.ts
│     ├─ terminal-about.ts
│     └─ terminal-footer.ts
└─ index.css                  # Tailwind 4 + theme tokens + fade-up animation
```

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/vite` (theme tokens in `src/index.css`)
- **react-router-dom** for the home/editor split
- **lucide-react** for icons (with project-side `social-icons.tsx` for socials Lucide doesn't ship)
- **gifenc** for client-side GIF encoding in a Web Worker
- **JSZip** for the "download all sections as zip" button
- **Instrument Serif** (Google Fonts) for the home page's editorial italic moments
- **Cloudflare Pages** for deploy

## Design notes

A few things that aren't obvious from the code alone:

- **Auto-shrink before truncate.** Every variable text surface in every template uses `fitFontSize` (or `fitUniformFontSize` for surfaces where multiple texts share a budget). The font drops one step at a time until it fits; only at the smallest step does the helper resort to `…`. So a long bio shrinks gracefully instead of getting ellipsed mid-word.

- **Loop toggle, not just loop duration.** When the loop checkbox is off, text animations are removed entirely from the SVG output — not run-once-and-frozen. This matters because a GIF (and an SVG re-rendered by a fresh GitHub page load) will replay any "run once" animation every visit. With the toggle off, the SVG renders text statically from frame 0, while cursors / waves / heartbeats keep their independent infinite animations.

- **Per-template fade-stagger.** Each terminal/sleek/code template's text fades in row-by-row using independent `@keyframes ln${i}` definitions, animating opacity 0 → 1 → 0 across the loop. The loop duration is set per-section in the editor (default 12 s).

- **Pure SVG output is the differentiator.** Most existing GitHub README generators ship raster banners. SVG + baked CSS animations:
  - scales to any size
  - is text-searchable in the markdown source
  - animates without JavaScript
  - is a fraction of the file size of the equivalent GIF

## Deploy

### Cloudflare Pages (recommended)

The static site **plus** the GitHub stats Pages Function deploy together.

```bash
npm run build
npx wrangler pages deploy dist --project-name ryme-md
```

Or via the dashboard: connect to GitHub, set **Build command**
`npm run build`, **Output directory** `dist`, framework preset Vite.
Pushes to `main` deploy automatically. The function in `functions/api/github/[username].ts` is picked up by Pages without extra config.

#### `GITHUB_TOKEN` (recommended)

Without a token the function still works (unauth REST, 60 req/hr **per
visitor IP**, partial stats payload). With one, it switches to the
GraphQL aggregator: byte-accurate languages, this-year commit / PR /
issue / review counts, lifetime PR + issue counts, pinned items, and a
53-week contribution heatmap — at 5000 req/hr per token, shared across
all visitors and softened by the KV cache below.

1. Generate a classic PAT: <https://github.com/settings/tokens>. Leave every scope unchecked. Classic no-scope tokens can read public GraphQL data and get the normal 5000 req/hr authenticated limit. Fine-grained `github_pat_...` tokens can work for narrow repo reads, but often fail on global GraphQL profile/activity fields with `Resource not accessible by personal access token`.
2. In the Cloudflare dashboard: **Pages → ryme-md → Settings →
   Environment variables → Add variable**, name `GITHUB_TOKEN`, mark it
   encrypted, paste the token.
3. Trigger a redeploy (push to `main` or `wrangler pages deployment list`
   → retry).

Locally, copy `.dev.vars.example` to `.dev.vars` and put the same token
there for `npm run pages:dev`. Restart wrangler after changing `.dev.vars`;
it only reads secrets at startup.

#### `STATS_CACHE` KV namespace (optional)

Caches each `/api/github/:username` response for 6 h, so repeat hits
for the same handle don't burn the token's rate budget.

```bash
npx wrangler kv namespace create STATS_CACHE
```

Paste the printed `id` into the commented-out `[[kv_namespaces]]` block
in `wrangler.toml` and commit. The function reads the binding lazily —
absence is non-fatal, it just means every request hits GitHub.

### Anywhere else

Output is plain static files in `dist/`. Drop them into Netlify, Vercel,
Bunny, S3 + CloudFront, an `nginx` config, whatever. You'll lose the
GitHub Pages Function (the editor's `Load` button will fail) unless the
host supports a compatible serverless runtime — porting the function to
Vercel Edge / Netlify Functions is a one-file change. The only runtime
requirement on the client side is a modern browser with `OffscreenCanvas`
and Web Workers (Chrome 69+, Firefox 105+, Safari 16.4+).

## Roadmap

- [x] Terminal family (mac-window) — 5 sections
- [x] Glass family (mesh-gradient glass) — 5 sections
- [x] Sleek family (editorial) — 5 sections
- [x] Code family (VS Code) — 5 sections
- [x] Neon family (synthwave) — 5 sections
- [x] Blueprint family (engineering drawing) — 5 sections
- [x] Quaint family (cozy farming-sim) — 5 sections
- [x] Celestial family (night-sky star chart) — 5 sections
- [x] GitHub profile scrape (public, unauthenticated)
- [x] Per-section + global theme overrides
- [x] Loop animation toggle
- [x] Auto-shrink overflow handling
- [x] Marketing page with live template gallery
- [ ] Polaroid + sticky-note one-offs
- [ ] Newspaper / editorial print family
- [ ] Animated WebP export (better quality + smaller than GIF)
- [ ] Shareable config URLs (`?config=…`)
- [ ] Public template gallery / community submissions
- [ ] Pages Function proxy for authenticated GitHub requests

## Contributing

Issues + PRs welcome. The contribution surface is mostly _new templates_ — see [Adding a template](#adding-a-template). For big architectural changes, open an issue first so we can riff on it.

## License

[MIT](LICENSE) © [Ryan Polasky](https://www.linkedin.com/in/ryan-polasky/)
