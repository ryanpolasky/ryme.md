import type {
  GitHubFetchError,
  GitHubStats,
  ProfileInfo,
  Social,
} from "./types";

// ---------------------------------------------------------------------------
// API base. Defaults to relative `/api`, which works under both:
//   - `wrangler pages dev` (it proxies to vite + serves the function),
//   - production Pages deployment (function runs at the same origin).
//
// `npm run dev:vite` (vite alone) won't resolve /api unless something
// proxies to wrangler. Setting VITE_API_BASE to a remote pages.dev URL is
// also valid for hybrid dev.
const API_BASE: string =
  ((import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE ?? "") + "/api";

// ---------------------------------------------------------------------------
// Username parsing.

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/**
 * Normalize whatever a user pastes into a clean GitHub login. Accepts:
 *   - plain handle ("ryanpolasky")
 *   - @handle ("@ryanpolasky")
 *   - github URL ("https://github.com/ryanpolasky" or
 *     "github.com/ryanpolasky/some-repo" -> "ryanpolasky")
 *
 * Returns null if the result fails GitHub's username rules. The parser is
 * also duplicated in the Pages Function so the server enforces the same
 * shape regardless of what the client sends.
 */
export function parseGithubUsername(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const stripped = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();
  if (!stripped) return null;
  return USERNAME_RE.test(stripped) ? stripped : null;
}

// ---------------------------------------------------------------------------
// Errors.

class GithubFetchException extends Error {
  detail: GitHubFetchError;
  constructor(detail: GitHubFetchError) {
    super(detail.message);
    this.name = "GithubFetchException";
    this.detail = detail;
  }
}

export function isGithubFetchError(e: unknown): e is GithubFetchException {
  return e instanceof GithubFetchException;
}

/**
 * Coerce any thrown value into a typed GitHubFetchError so UI code can
 * branch on `kind` without re-checking instanceof everywhere.
 */
export function getGithubFetchErrorDetail(e: unknown): GitHubFetchError {
  if (isGithubFetchError(e)) return e.detail;
  return {
    kind: "unknown",
    message: e instanceof Error ? e.message : String(e),
  };
}

// ---------------------------------------------------------------------------
// Browser-local cache (second tier under the function's KV cache). Keeps
// the toolbar instant on remount even if the network is offline.

const CACHE_PREFIX = "rymeMd:githubStats:";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CacheEntry = { fetchedAt: number; data: GitHubStats };

function cacheKey(username: string): string {
  return CACHE_PREFIX + username.toLowerCase();
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function getCached(username: string): GitHubStats | null {
  const ls = safeStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(cacheKey(username));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry || typeof entry.fetchedAt !== "number" || !entry.data) {
      return null;
    }
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function setCached(username: string, data: GitHubStats): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), data };
    ls.setItem(cacheKey(username), JSON.stringify(entry));
  } catch {
    // localStorage full / disabled / Safari private mode -- silently ignore;
    // a missed cache write just means the next call re-fetches from the
    // server (which still has its own KV cache layer).
  }
}

/**
 * Drop one user's cached stats (or all of them if `username` is omitted).
 * Useful for an explicit "Refresh" action in the editor that wants to
 * bypass the browser cache (the server-side cache may still be hot).
 */
export function clearGithubStatsCache(username?: string): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    if (username) {
      const parsed = parseGithubUsername(username);
      if (parsed) ls.removeItem(cacheKey(parsed));
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    for (const k of keys) ls.removeItem(k);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Network -- talks to our Pages Function, never to GitHub directly.

type FetchOpts = {
  /** Skip the localStorage cache for this call. */
  force?: boolean;
};

async function fetchFromFunction(username: string): Promise<GitHubStats> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/github/${encodeURIComponent(username)}`, {
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    throw new GithubFetchException({
      kind: "network",
      message:
        e instanceof Error ? e.message : "Network error reaching the server.",
    });
  }

  // The function speaks JSON for both success and error. Parse first, then
  // branch on status -- some errors (404, 429) come with a typed body we
  // want to preserve.
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    const isPlainViteApiMiss =
      res.status === 404 &&
      typeof window !== "undefined" &&
      window.location.port === "5173";
    throw new GithubFetchException({
      kind: "unknown",
      message: isPlainViteApiMiss
        ? "GitHub stats are served by the Cloudflare Pages Function. Run `npm run dev` and open http://localhost:8788, not Vite's :5173 URL."
        : `Server returned non-JSON response (${res.status}).`,
    });
  }

  if (res.ok) {
    return body as GitHubStats;
  }

  const errBody = body as { error?: GitHubFetchError } | null;
  if (errBody?.error?.kind && errBody.error.message) {
    throw new GithubFetchException(errBody.error);
  }
  throw new GithubFetchException({
    kind: "unknown",
    message: `Server error (${res.status}).`,
  });
}

/**
 * Fetch normalized GitHub stats for `rawUsername`. Uses a 6-hour browser
 * localStorage cache by default; pass `{ force: true }` to bypass.
 *
 * Throws `GithubFetchException` whose `.detail` is a typed
 * `GitHubFetchError`. Use `getGithubFetchErrorDetail` to coerce any
 * caught value into the same shape for rendering.
 */
export async function fetchGithubStats(
  rawUsername: string,
  opts: FetchOpts = {},
): Promise<GitHubStats> {
  const username = parseGithubUsername(rawUsername);
  if (!username) {
    throw new GithubFetchException({
      kind: "invalid-username",
      message: "That doesn't look like a valid GitHub handle.",
    });
  }
  if (!opts.force) {
    const cached = getCached(username);
    if (cached) return cached;
  }
  const stats = await fetchFromFunction(username);
  setCached(stats.username, stats);
  return stats;
}

/**
 * One-shot used by the editor's Load button: fetch stats AND derive the
 * autofill payload (name / org / location / tagline / socials) off the
 * same response. Always hits the server (skips the local cache) so a
 * fresh Load reflects current GitHub state -- the server's KV cache
 * still spares the actual GitHub API hit.
 */
export async function loadGithubProfileAndStats(
  rawUsername: string,
): Promise<{
  username: string;
  autofill: Partial<ProfileInfo>;
  stats: GitHubStats;
}> {
  const stats = await fetchGithubStats(rawUsername, { force: true });
  return {
    username: stats.username,
    autofill: autofillFromStats(stats),
    stats,
  };
}

function autofillFromStats(stats: GitHubStats): Partial<ProfileInfo> {
  const p = stats.profile;
  const socials: Social[] = [
    { kind: "github", value: `github.com/${stats.username}` },
  ];
  if (p.blog) {
    const url = p.blog.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (url) socials.push({ kind: "website", value: url });
  }
  return {
    name: p.name || stats.username,
    org: (p.company || "").replace(/^@/, "").trim(),
    location: p.location || "",
    tagline: p.bio || "",
    socials,
    githubUsername: stats.username,
  };
}

// ---------------------------------------------------------------------------
// Back-compat. The original autofill-only entry point still works; new
// callers should prefer `loadGithubProfileAndStats` to also pick up the
// stats payload.

export async function scrapeGithub(
  rawUsername: string,
): Promise<Partial<ProfileInfo>> {
  const { autofill } = await loadGithubProfileAndStats(rawUsername);
  return autofill;
}
