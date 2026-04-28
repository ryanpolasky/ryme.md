# readme-ryvamper

Animated banners for GitHub profile READMEs. Pick a template, fill in your info (or pull it from a public GitHub profile), and download an animated SVG or GIF to drop into your `username/username` repo.

Everything renders in the browser — no server, no upload, no API keys.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- [`gifenc`](https://github.com/mattdesl/gifenc) for client-side GIF encoding (runs in a Web Worker)
- Cloudflare Pages for deploy

## How it works

Templates are typed in [`src/lib/types.ts`](src/lib/types.ts) and registered in [`src/lib/templates/index.ts`](src/lib/templates/index.ts). Each template is one of two flavors:

- **SVG templates** export `renderSvg(info, theme) => string`. The string is a complete `<svg>` document with CSS keyframe animations baked in. Preview uses a `data:image/svg+xml` `<img>` so you see the same thing GitHub will. Download saves the raw SVG.
- **Canvas templates** export `renderFrame(ctx, t, info, theme)`. The same function powers preview (driven by `requestAnimationFrame`) **and** export (driven by a deterministic `t = i/fps` loop into an `OffscreenCanvas`). No "record real time and pray" — frames are pixel-perfect.

The canvas export pipeline:
1. Main thread renders frame `i` into an `OffscreenCanvas`.
2. `getImageData` → transferred (zero-copy) to a Web Worker.
3. Worker quantizes the first frame's palette with [`gifenc`](https://github.com/mattdesl/gifenc), then reuses it for every subsequent frame (fast + temporally stable).
4. Worker streams encoded frames into a `GIFEncoder`, finishes, returns the bytes.
5. Main thread wraps in a `Blob` and triggers download.

## Adding a template

1. Create `src/lib/templates/your-template.ts`.
2. Export `default` a `Template` (CanvasTemplate or SvgTemplate).
3. Add it to the array in `src/lib/templates/index.ts`.

That's it — picker, preview, and export pipeline pick it up automatically.

## Dev

```bash
npm install
npm run dev      # http://localhost:5173 (or next free port)
npm run build    # tsc -b && vite build → ./dist
npm run preview  # serve ./dist locally
```

## Deploy (Cloudflare Pages)

**Via dashboard:**
1. Push to GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git.
3. Build command: `npm run build`. Output dir: `dist`. Framework preset: Vite.
4. Done. Pushes to `main` deploy automatically.

**Via Wrangler CLI:**
```bash
npm i -D wrangler
npx wrangler pages deploy dist --project-name readme-ryvamper
```

No env vars or secrets required for the MVP. If you ever hit GitHub's 60 req/hr unauthenticated limit, drop a Pages Function at `functions/api/github/[username].ts` that proxies with a server-side token.

## Roadmap

- [x] Terminal Boot template (animated SVG)
- [x] Glass Banner template (canvas → GIF)
- [x] GitHub profile scrape
- [x] Per-template theme overrides
- [ ] Particles → name template
- [ ] 3D wireframe template (three.js → WebP)
- [ ] Animated WebP export (better quality than GIF)
- [ ] Shareable config URLs
- [ ] Pages Function proxy for GitHub auth
- [ ] Public template gallery

## License

MIT.
