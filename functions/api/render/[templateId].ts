/**
 * Cloudflare Pages Function: GET /api/render/:templateId
 *
 * Live SVG renderer for stats sections. Reads the editor's full state
 * out of the query string (see `src/lib/embed-url.ts` for the URL shape
 * and `functions/api/_lib/render-params.ts` for the parser), re-renders
 * the matching template's `renderSvg(...)` on every request, and returns
 * the resulting SVG with cache-friendly headers.
 *
 * Restricted to `category === "stats"`. Every template in the codebase
 * is now `kind: "svg"`, so the canvas/GIF carve-out is gone. The real
 * distinction is whether a section's content drifts after the user
 * closes the editor:
 *
 *   - stats: yes (commits/PRs/language mix change with GitHub activity)
 *   - everything else: no (header/about/skills/footer copy is set at
 *     edit time and stays put until the user re-edits)
 *
 * Routing non-stats sections through here would just burn function
 * invocations on data we could've baked once. Those sections download
 * an SVG out of the editor's "Download all" zip and embed via
 * `raw.githubusercontent.com` directly.
 *
 * For stats templates with `?u=<handle>` set, this function calls the
 * neighbouring `/api/github/:username` endpoint over HTTP. That endpoint
 * already wraps GitHub in a 6h KV cache, so the additional internal
 * fetch costs roughly a KV hit (~10ms intra-CF) on a cold render and
 * essentially nothing on a warm edge cache.
 *
 * Embed flow ("github stays live"):
 *   - User pastes `<img src="ryme.md/api/render/<stats-id>?...">` into
 *     their README.
 *   - GitHub's renderer fetches the SVG; CF edge serves from cache.
 *   - When the edge cache TTL elapses, CF revalidates -- our function
 *     re-renders against fresh-or-cached `/api/github` data.
 *   - When the github KV TTL elapses, the next /api/github call refetches
 *     from GitHub.
 *
 * Net staleness vs live GitHub: at most `EDGE_TTL + GITHUB_KV_TTL` (1h +
 * 6h = 7h worst case), at least `EDGE_TTL` (1h best case). README readers
 * see updates within hours of the user's GitHub activity changing without
 * the user touching the file.
 */

import { getTemplate } from "../../../src/lib/templates";
import type { GitHubStats } from "../../../src/lib/github-types";
import { parseRenderParams } from "../_lib/render-params";

interface Env {
  // No bindings consumed directly here -- we delegate the GitHub fetch
  // to /api/github/:username, which owns the GITHUB_TOKEN and STATS_CACHE
  // bindings.
  [key: string]: unknown;
}

// Edge cache window. Short enough that a user re-copying their README
// snippet sees their changes propagate quickly, long enough that a popular
// README with thousands of viewers doesn't burn function invocations.
const EDGE_TTL_SECS = 60 * 60; // 1h
const SWR_TTL_SECS = 60 * 60 * 6; // 6h stale-while-revalidate

const SVG_HEADERS_BASE: HeadersInit = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  // GitHub renders embedded SVGs through their camo image proxy; CORS
  // doesn't strictly matter for that path, but it lets the same URL
  // work in any other consumer (Notion, custom dashboards, etc.).
  "Access-Control-Allow-Origin": "*",
};

function svgResponse(svg: string, status = 200, cache = true): Response {
  return new Response(svg, {
    status,
    headers: {
      ...SVG_HEADERS_BASE,
      "Cache-Control": cache
        ? `public, max-age=${EDGE_TTL_SECS}, s-maxage=${EDGE_TTL_SECS}, stale-while-revalidate=${SWR_TTL_SECS}`
        : "no-store",
    },
  });
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Friendly placeholder rendered when the requested URL doesn't resolve
 * to a live-renderable template. Two cases today:
 *
 *   - Unknown templateId (404)
 *   - Non-stats template (400; it's a static SVG, not a live one)
 *
 * Returning an SVG body for both keeps `<img>` embeds visually intact --
 * the embedder sees a small panel explaining what to do instead of a
 * broken-image icon.
 */
function placeholderSvg(reason: string, sub: string): string {
  const W = 800;
  const H = 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0b0b12" rx="14" ry="14"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" ry="14" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="${W / 2}" y="${H / 2 - 8}" text-anchor="middle" fill="#f5f5f7" font-family="ui-monospace, monospace" font-size="14" font-weight="600">${escapeXml(reason)}</text>
  <text x="${W / 2}" y="${H / 2 + 18}" text-anchor="middle" fill="#a8a8b3" font-family="ui-monospace, monospace" font-size="11">${escapeXml(sub)}</text>
</svg>`;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params }) => {
  const idParam = Array.isArray(params.templateId)
    ? params.templateId[0]
    : params.templateId;
  const templateId = (idParam || "").trim();

  const template = getTemplate(templateId);
  if (!template) {
    return svgResponse(
      placeholderSvg("Unknown template", `No template with id "${templateId}"`),
      404,
      false,
    );
  }

  // Only stats sections are live. Everything else (header/about/skills/
  // footer) is supposed to be downloaded out of the editor and committed
  // to the user's profile repo as a static SVG -- those don't need a
  // function call per pageview.
  if (template.category !== "stats") {
    return svgResponse(
      placeholderSvg(
        `${template.name} is a static section`,
        "Download this section's SVG from the editor and commit it to your profile repo. Only stats sections render live.",
      ),
      400,
      false,
    );
  }

  // Defensive: every template should be `kind: "svg"` after the glass
  // port. If something slips through (e.g. a future canvas template gets
  // miscategorized as `stats`), surface a useful error instead of
  // crashing on the missing `renderSvg` field.
  if (template.kind !== "svg") {
    return svgResponse(
      placeholderSvg(
        `${template.name} can't render server-side`,
        "This template uses a non-SVG renderer. Download it from the editor and commit the file directly.",
      ),
      501,
      false,
    );
  }

  const url = new URL(request.url);
  const parsed = parseRenderParams(url.searchParams, template);
  const { info, theme, loopDuration, loopText, username } = parsed;

  // GitHub-aware templates get a stats payload by reusing the existing
  // /api/github/:username endpoint. We deliberately re-call over HTTP so
  // we share its KV cache, response shape, and error handling with the
  // browser path -- no parallel fetcher implementation to drift.
  const wantsStats = template.fields.includes("github") && username;
  if (wantsStats) {
    info.githubStats = await fetchStatsViaInternalApi(username, request.url);
    info.githubUsername = info.githubStats?.username || username;
  }

  // Render the SVG. `renderSvg` is pure -- no DOM, no canvas -- so it
  // runs cleanly in the Workers runtime. Templates with big bios or
  // long skill rails can throw on extreme inputs; we catch and serve
  // a placeholder so a malformed embed doesn't 500 the README.
  let svg: string;
  try {
    svg = template.renderSvg(info, theme, loopDuration, {
      loopText,
      // sidebarFiles are only meaningful when multiple sections render
      // together (code-family explorer pane). For embed URLs each section
      // is rendered standalone, so we let the template fall back to its
      // built-in static four-file list.
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "render failed";
    return svgResponse(
      placeholderSvg("Render error", msg.slice(0, 200)),
      500,
      false,
    );
  }

  return svgResponse(svg);
};

/**
 * Internal helper: fetch normalized GitHub stats by hitting our own
 * /api/github/:username endpoint. Going through HTTP lets us share its
 * KV cache and rate-limit handling for free. The intra-CF fetch is
 * cached at the edge after the first warm hit, so steady-state cost is
 * essentially zero.
 *
 * Failures fall through to `null` -- a github-aware template handles a
 * stats-less render gracefully (zero-state cards, no streaks).
 */
async function fetchStatsViaInternalApi(
  username: string,
  reqUrl: string,
): Promise<GitHubStats | null> {
  try {
    const target = new URL(
      `/api/github/${encodeURIComponent(username)}`,
      reqUrl,
    );
    const res = await fetch(target.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as GitHubStats;
  } catch {
    return null;
  }
}
