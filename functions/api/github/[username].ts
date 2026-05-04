/**
 * Cloudflare Pages Function: GET /api/github/:username
 *
 * Returns the normalized `GitHubStats` payload the editor consumes. This
 * endpoint is the single source of truth for "what GitHub data does the
 * site render" -- the client never talks to GitHub directly, so we don't
 * burn each visitor's 60 req/hr unauth limit, and we can layer caching
 * (KV, edge, browser localStorage) without coordination.
 *
 * Behavior:
 *   - If `GITHUB_TOKEN` is set as a Pages secret: rich payload via a
 *     single GraphQL request -- byte-accurate languages, this-year
 *     commits / PRs / issues / reviews, contribution calendar, pinned
 *     items, lifetime PR + issue counts.
 *   - If no token (e.g., a barebones local dev w/out a `.dev.vars`):
 *     falls back to two unauth REST calls (`/users/X` + `/users/X/repos`)
 *     and returns a partial payload with the GraphQL-only fields nulled.
 *     The `source` field on the response says which path ran.
 *
 * Optional `STATS_CACHE` KV binding wraps both paths in a 6h cache. If
 * the binding isn't configured (local dev without `wrangler kv` setup,
 * or a fresh deploy that hasn't bound a namespace yet) the function
 * just hits GitHub on every request -- still fine, that's why the PAT
 * exists.
 */

// Types are shared with the client so the contract stays in lockstep.
import type {
  GitHubContributionCalendar,
  GitHubFetchError,
  GitHubLanguageBucket,
  GitHubRepoSummary,
  GitHubStats,
} from "../../../src/lib/github-types";

// ---------------------------------------------------------------------------
// Cloudflare environment.

interface Env {
  /** Optional. Fine-grained PAT with public-read scope. */
  GITHUB_TOKEN?: string;
  /** Optional. KV binding declared in wrangler.toml. */
  STATS_CACHE?: KVNamespace;
  /** Optional. Override cache TTL in seconds (default: 21600 = 6h). */
  STATS_CACHE_TTL?: string;
}

// ---------------------------------------------------------------------------
// Username parsing -- duplicated from src/lib/github.ts because the Pages
// Function runs in the Workers runtime, separate from the client bundle,
// and the regex is small enough that sharing isn't worth the import dance.

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function parseUsername(raw: string | undefined): string | null {
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
// Response helpers.

const DEFAULT_TTL_SECS = 6 * 60 * 60; // 6h

function jsonResponse<T>(body: T, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Browsers and CDNs can keep the response for the cache TTL too.
      // We deliberately set s-maxage so the CF edge cache helps even if
      // we don't bind KV.
      "Cache-Control": `public, max-age=300, s-maxage=${DEFAULT_TTL_SECS}`,
      ...extraHeaders,
    },
  });
}

function errorResponse(detail: GitHubFetchError, status: number): Response {
  return jsonResponse({ error: detail }, status, {
    "Cache-Control": "no-store",
  });
}

function statusForErrorKind(kind: GitHubFetchError["kind"]): number {
  switch (kind) {
    case "invalid-username":
      return 400;
    case "not-found":
      return 404;
    case "rate-limited":
      return 429;
    case "network":
      return 502;
    case "unknown":
      return 502;
  }
}

// ---------------------------------------------------------------------------
// KV cache.

function ttlSecs(env: Env): number {
  const v = env.STATS_CACHE_TTL ? Number(env.STATS_CACHE_TTL) : NaN;
  return Number.isFinite(v) && v > 60 ? Math.floor(v) : DEFAULT_TTL_SECS;
}

function cacheKey(username: string, source: GitHubStats["source"]): string {
  return `stats:v2:${source}:${username.toLowerCase()}`;
}

async function readCache(
  env: Env,
  username: string,
  source: GitHubStats["source"],
): Promise<GitHubStats | null> {
  if (!env.STATS_CACHE) return null;
  try {
    const raw = await env.STATS_CACHE.get(cacheKey(username, source), "json");
    return (raw as GitHubStats | null) ?? null;
  } catch {
    return null;
  }
}

async function writeCache(
  env: Env,
  stats: GitHubStats,
): Promise<void> {
  if (!env.STATS_CACHE) return;
  try {
    await env.STATS_CACHE.put(
      cacheKey(stats.username, stats.source),
      JSON.stringify(stats),
      { expirationTtl: ttlSecs(env) },
    );
  } catch {
    // KV write failures are non-fatal -- the response still goes out,
    // we just re-fetch on the next request.
  }
}

// ---------------------------------------------------------------------------
// GraphQL path (rich payload, requires PAT).

const GRAPHQL_QUERY = /* GraphQL */ `
  query Stats($login: String!) {
    user(login: $login) {
      login
      name
      avatarUrl
      bio
      company
      location
      websiteUrl
      url
      createdAt
      followers { totalCount }
      following { totalCount }
      publicRepos: repositories(privacy: PUBLIC, ownerAffiliations: [OWNER]) { totalCount }
      publicGists: gists(privacy: PUBLIC) { totalCount }
      starredRepositories { totalCount }
      pullRequests { totalCount }
      issues { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              color
            }
          }
        }
      }
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            nameWithOwner
            description
            url
            stargazerCount
            forkCount
            isArchived
            primaryLanguage { name color }
          }
        }
      }
      repositories(
        first: 100
        privacy: PUBLIC
        ownerAffiliations: [OWNER]
        isFork: false
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        nodes {
          name
          nameWithOwner
          description
          url
          stargazerCount
          forkCount
          isArchived
          primaryLanguage { name color }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node { name color }
            }
          }
        }
      }
    }
  }
`;

// ---- GraphQL response shape (only fields we read).

type GqlLanguageEdge = {
  size: number;
  node: { name: string; color: string | null };
};

type GqlRepoNode = {
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  primaryLanguage: { name: string; color: string | null } | null;
  languages?: { edges: GqlLanguageEdge[] };
};

type GqlPinnedNode = Omit<GqlRepoNode, "languages">;

type GqlContributionDay = {
  contributionCount: number;
  date: string;
  color: string;
};

type GqlUser = {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  websiteUrl: string | null;
  url: string;
  createdAt: string;
  followers: { totalCount: number };
  following: { totalCount: number };
  publicRepos: { totalCount: number };
  publicGists: { totalCount: number };
  starredRepositories: { totalCount: number };
  pullRequests: { totalCount: number };
  issues: { totalCount: number };
  contributionsCollection: {
    totalCommitContributions: number;
    totalIssueContributions: number;
    totalPullRequestContributions: number;
    totalPullRequestReviewContributions: number;
    restrictedContributionsCount: number;
    contributionCalendar: {
      totalContributions: number;
      weeks: { contributionDays: GqlContributionDay[] }[];
    };
  };
  pinnedItems: { nodes: GqlPinnedNode[] };
  repositories: { nodes: GqlRepoNode[] };
};

type GqlResponse = {
  data?: { user: GqlUser | null };
  errors?: Array<{ message: string; type?: string }>;
};

async function fetchViaGraphQL(
  username: string,
  token: string,
): Promise<GitHubStats> {
  let res: Response;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "ryme-md-pages-fn",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { login: username },
      }),
    });
  } catch (e) {
    throw new GithubFetchException({
      kind: "network",
      message:
        e instanceof Error ? e.message : "Network error reaching GitHub.",
    });
  }

  // Auth/rate-limit headers are consistent across REST + GraphQL.
  if (res.status === 401 || res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    if (remaining === "0") {
      throw new GithubFetchException({
        kind: "rate-limited",
        message: "GitHub GraphQL rate limit hit.",
        resetAt: reset ? Number(reset) : undefined,
      });
    }
    throw new GithubFetchException({
      kind: "unknown",
      message: `GitHub auth failed (${res.status}).`,
    });
  }
  if (!res.ok) {
    throw new GithubFetchException({
      kind: "unknown",
      message: `GitHub GraphQL error (${res.status}).`,
    });
  }

  const body = (await res.json()) as GqlResponse;
  if (body.errors && body.errors.length) {
    // GraphQL "user not found" surfaces as `data.user: null` with a
    // "NOT_FOUND" type error in the errors array.
    const notFound = body.errors.find((e) => e.type === "NOT_FOUND");
    if (notFound) {
      throw new GithubFetchException({
        kind: "not-found",
        message: `@${username} not found on GitHub.`,
      });
    }
    const message = body.errors.map((e) => e.message).join("; ");
    const tokenAccessError = /resource not accessible by personal access token/i.test(
      message,
    );
    throw new GithubFetchException({
      kind: "unknown",
      message: tokenAccessError
        ? "GitHub accepted GITHUB_TOKEN, but the token cannot access one or more GraphQL stats fields. Use a classic PAT with no scopes, or broaden the fine-grained token permissions/resource access."
        : message,
    });
  }
  if (!body.data?.user) {
    throw new GithubFetchException({
      kind: "not-found",
      message: `@${username} not found on GitHub.`,
    });
  }
  return aggregateGraphQL(body.data.user);
}

function aggregateGraphQL(u: GqlUser): GitHubStats {
  const repos = u.repositories.nodes;

  let starsReceived = 0;
  let forksReceived = 0;
  const langBytes: Record<string, { bytes: number; color: string | null }> = {};
  for (const r of repos) {
    starsReceived += r.stargazerCount;
    forksReceived += r.forkCount;
    if (!r.languages) continue;
    for (const edge of r.languages.edges) {
      const cur = langBytes[edge.node.name] ?? {
        bytes: 0,
        color: edge.node.color,
      };
      cur.bytes += edge.size;
      if (!cur.color && edge.node.color) cur.color = edge.node.color;
      langBytes[edge.node.name] = cur;
    }
  }

  const totalBytes = Object.values(langBytes).reduce(
    (a, b) => a + b.bytes,
    0,
  );
  const languages: GitHubLanguageBucket[] = Object.entries(langBytes)
    .sort(([, a], [, b]) => b.bytes - a.bytes)
    .slice(0, 5)
    .map(([name, { bytes, color }]) => ({
      name,
      bytes,
      color,
      percentage: totalBytes
        ? Math.round((bytes / totalBytes) * 1000) / 10
        : 0,
    }));

  const topRepos: GitHubRepoSummary[] = repos.slice(0, 5).map(repoFromNode);
  const pinnedRepos: GitHubRepoSummary[] = u.pinnedItems.nodes.map(
    repoFromNode,
  );

  return {
    username: u.login,
    fetchedAt: Date.now(),
    source: "graphql",
    profile: {
      name: u.name,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      company: u.company,
      location: u.location,
      blog: u.websiteUrl,
      htmlUrl: u.url,
      followers: u.followers.totalCount,
      following: u.following.totalCount,
      publicRepos: u.publicRepos.totalCount,
      publicGists: u.publicGists.totalCount,
      createdAt: u.createdAt,
    },
    totals: {
      starsReceived,
      forksReceived,
      repoCount: repos.length,
      starsGiven: u.starredRepositories.totalCount,
      commitsThisYear: u.contributionsCollection.totalCommitContributions,
      restrictedContributions:
        u.contributionsCollection.restrictedContributionsCount,
      prsAuthored: u.pullRequests.totalCount,
      prsThisYear: u.contributionsCollection.totalPullRequestContributions,
      issuesAuthored: u.issues.totalCount,
      issuesThisYear: u.contributionsCollection.totalIssueContributions,
      reviewsThisYear:
        u.contributionsCollection.totalPullRequestReviewContributions,
    },
    topRepos,
    pinnedRepos,
    languages,
    contributionCalendar: calendarFromGql(
      u.contributionsCollection.contributionCalendar,
    ),
  };
}

function repoFromNode(
  node: GqlRepoNode | GqlPinnedNode,
): GitHubRepoSummary {
  return {
    name: node.name,
    fullName: node.nameWithOwner,
    description: node.description,
    language: node.primaryLanguage?.name ?? null,
    languageColor: node.primaryLanguage?.color ?? null,
    stars: node.stargazerCount,
    forks: node.forkCount,
    htmlUrl: node.url,
    isArchived: node.isArchived,
  };
}

// GitHub's calendar colors map to discrete levels; we bucket counts to 0..4
// using percentile thresholds within the calendar so heatmap templates can
// render a 5-step color ramp without each one re-deriving the same logic.
function calendarFromGql(
  cal: GqlUser["contributionsCollection"]["contributionCalendar"],
): GitHubContributionCalendar {
  const allCounts: number[] = [];
  for (const w of cal.weeks)
    for (const d of w.contributionDays) allCounts.push(d.contributionCount);
  const sorted = [...allCounts].filter((n) => n > 0).sort((a, b) => a - b);
  // Quartile thresholds among nonzero days. If a user has 0 contributions
  // anywhere we just emit level 0 across the board.
  const t1 = sorted.length ? sorted[Math.floor(sorted.length * 0.25)] : 1;
  const t2 = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 1;
  const t3 = sorted.length ? sorted[Math.floor(sorted.length * 0.75)] : 1;

  return {
    totalContributions: cal.totalContributions,
    weeks: cal.weeks.map((w) => ({
      days: w.contributionDays.map((d) => {
        let level = 0;
        if (d.contributionCount > 0) {
          if (d.contributionCount >= t3) level = 4;
          else if (d.contributionCount >= t2) level = 3;
          else if (d.contributionCount >= t1) level = 2;
          else level = 1;
        }
        return {
          date: d.date,
          count: d.contributionCount,
          level,
        };
      }),
    })),
  };
}

// ---------------------------------------------------------------------------
// REST fallback (no token; partial payload).

type RestUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  email: string | null;
  twitter_username: string | null;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
};

type RestRepo = {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  archived: boolean;
};

async function fetchViaRestUnauth(username: string): Promise<GitHubStats> {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ryme-md-pages-fn",
  };
  let userRes: Response;
  let reposRes: Response;
  try {
    [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&type=owner&sort=updated`,
        { headers },
      ),
    ]);
  } catch (e) {
    throw new GithubFetchException({
      kind: "network",
      message:
        e instanceof Error ? e.message : "Network error reaching GitHub.",
    });
  }

  for (const res of [userRes, reposRes]) {
    if (res.ok) continue;
    if (res.status === 404) {
      throw new GithubFetchException({
        kind: "not-found",
        message: `@${username} not found on GitHub.`,
      });
    }
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get("x-ratelimit-reset");
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0" || reset) {
        throw new GithubFetchException({
          kind: "rate-limited",
          message:
            "GitHub unauth rate limit hit (60/hr). Set GITHUB_TOKEN to lift the cap.",
          resetAt: reset ? Number(reset) : undefined,
        });
      }
    }
    throw new GithubFetchException({
      kind: "unknown",
      message: `GitHub REST error (${res.status}).`,
    });
  }

  const user = (await userRes.json()) as RestUser;
  const repos = (await reposRes.json()) as RestRepo[];
  const own = repos.filter((r) => !r.fork);

  let starsReceived = 0;
  let forksReceived = 0;
  const langCount: Record<string, number> = {};
  for (const r of own) {
    starsReceived += r.stargazers_count;
    forksReceived += r.forks_count;
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  }
  const totalLangRepos = Object.values(langCount).reduce((a, b) => a + b, 0);
  const languages: GitHubLanguageBucket[] = Object.entries(langCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      // Repo count masquerading as bytes; templates that only read
      // `percentage` work either way.
      bytes: count,
      color: null,
      percentage: totalLangRepos
        ? Math.round((count / totalLangRepos) * 1000) / 10
        : 0,
    }));

  const topRepos: GitHubRepoSummary[] = [...own]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      languageColor: null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      htmlUrl: r.html_url,
      isArchived: r.archived,
    }));

  return {
    username: user.login,
    fetchedAt: Date.now(),
    source: "rest-unauth",
    profile: {
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      company: user.company,
      location: user.location,
      blog: user.blog,
      htmlUrl: user.html_url,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      publicGists: user.public_gists,
      createdAt: user.created_at,
    },
    totals: {
      starsReceived,
      forksReceived,
      repoCount: own.length,
      starsGiven: 0,
      commitsThisYear: null,
      restrictedContributions: null,
      prsAuthored: null,
      prsThisYear: null,
      issuesAuthored: null,
      issuesThisYear: null,
      reviewsThisYear: null,
    },
    topRepos,
    pinnedRepos: [],
    languages,
    contributionCalendar: null,
  };
}

// ---------------------------------------------------------------------------
// Errors -- we keep them inside this file (the Pages Function can't share
// runtime objects with the client bundle).

class GithubFetchException extends Error {
  detail: GitHubFetchError;
  constructor(detail: GitHubFetchError) {
    super(detail.message);
    this.name = "GithubFetchException";
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// Handler.

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const usernameParam = Array.isArray(params.username)
    ? params.username[0]
    : params.username;
  const username = parseUsername(usernameParam);
  if (!username) {
    return errorResponse(
      {
        kind: "invalid-username",
        message: "That doesn't look like a valid GitHub handle.",
      },
      400,
    );
  }

  const wantSource: GitHubStats["source"] = env.GITHUB_TOKEN
    ? "graphql"
    : "rest-unauth";

  // KV cache lookup. We key by source so toggling auth doesn't return
  // stale unauth payloads to authed deploys (the shapes differ).
  const cached = await readCache(env, username, wantSource);
  if (cached) {
    return jsonResponse(cached, 200, { "X-Stats-Cache": "HIT" });
  }

  try {
    const stats = env.GITHUB_TOKEN
      ? await fetchViaGraphQL(username, env.GITHUB_TOKEN)
      : await fetchViaRestUnauth(username);
    // Fire-and-forget cache write -- waitUntil isn't available in the
    // PagesFunction param list directly, but in practice KV.put resolves
    // fast enough that awaiting it is fine.
    await writeCache(env, stats);
    return jsonResponse(stats, 200, { "X-Stats-Cache": "MISS" });
  } catch (e) {
    if (e instanceof GithubFetchException) {
      return errorResponse(e.detail, statusForErrorKind(e.detail.kind));
    }
    return errorResponse(
      {
        kind: "unknown",
        message: e instanceof Error ? e.message : String(e),
      },
      500,
    );
  }
};
