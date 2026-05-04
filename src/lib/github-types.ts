/**
 * Pure GitHub data types -- no DOM, no React. Lives in its own file so
 * the Cloudflare Pages Function (functions/api/github/[username].ts) can
 * import it under a Workers-only tsconfig without pulling in
 * `CanvasRenderingContext2D` from the rest of the app types.
 *
 * The main `src/lib/types.ts` re-exports everything here, so existing
 * imports keep working.
 */

/**
 * One bucket on a horizontal language bar. `bytes` is the summed source
 * size in that language across all aggregated repos (byte-accurate when
 * the GraphQL path is used; falls back to repo-count-weighted when the
 * function had to use unauthenticated REST). `percentage` is 0..100 and
 * the buckets sum to ~100 (rounded to one decimal). `color` is the
 * GitHub-canonical hex hint (e.g., "#3178c6" for TypeScript) when known.
 */
export type GitHubLanguageBucket = {
  name: string;
  bytes: number;
  percentage: number;
  color: string | null;
};

/** Lightweight repo summary used by templates for top-repo callouts. */
export type GitHubRepoSummary = {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  htmlUrl: string;
  isArchived: boolean;
};

/** One day on a contribution heatmap. */
export type GitHubContributionDay = {
  /** ISO 8601 date (`YYYY-MM-DD`). */
  date: string;
  count: number;
  /**
   * 0..4 bucket matching GitHub's own color levels (so templates can
   * render a heatmap without doing their own thresholding).
   */
  level: number;
};

export type GitHubContributionCalendar = {
  totalContributions: number;
  /** 53 weeks × up to 7 days, oldest week first. */
  weeks: { days: GitHubContributionDay[] }[];
};

/**
 * Normalized GitHub stats returned by the Pages Function at
 * `/api/github/:username` (and consumed via `fetchGithubStats`). The
 * shape is intentionally render-friendly: everything templates need is
 * precomputed here so renderers stay pure functions of the cleaned info.
 *
 * `fetchedAt` is a unix-ms timestamp. `source` says whether the function
 * had a GitHub PAT available (`"graphql"` -- richer payload) or had to
 * fall back to the unauthenticated REST aggregator (`"rest-unauth"` --
 * commit/PR/issue/calendar fields will be null).
 */
export type GitHubStats = {
  username: string;
  fetchedAt: number;
  source: "graphql" | "rest-unauth";
  profile: {
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    blog: string | null;
    htmlUrl: string;
    followers: number;
    following: number;
    publicRepos: number;
    publicGists: number;
    /** ISO timestamp of when the user signed up. */
    createdAt: string;
  };
  totals: {
    /** Sum of `stargazerCount` across counted public non-fork repos. */
    starsReceived: number;
    /** Sum of `forkCount` across counted public non-fork repos. */
    forksReceived: number;
    /**
     * Number of repos actually fetched & aggregated (max 100). For the
     * canonical lifetime count, use `profile.publicRepos`.
     */
    repoCount: number;
    /** How many repos this user has starred (lifetime). */
    starsGiven: number;
    /**
     * Commits this calendar year on default branches of repos visible to
     * the function's PAT. From `contributionsCollection`. Null on the
     * REST-unauth fallback path.
     */
    commitsThisYear: number | null;
    /** Same window, contributions to private repos (count only). */
    restrictedContributions: number | null;
    /** Lifetime PRs authored. Null on REST-unauth fallback. */
    prsAuthored: number | null;
    /** PRs authored this calendar year. */
    prsThisYear: number | null;
    /** Lifetime issues authored. Null on REST-unauth fallback. */
    issuesAuthored: number | null;
    /** Issues authored this calendar year. */
    issuesThisYear: number | null;
    /** PR reviews left this calendar year. */
    reviewsThisYear: number | null;
  };
  /** Top non-fork repos by star count, capped server-side at 5. */
  topRepos: GitHubRepoSummary[];
  /** User's pinned items that are repos. Max 6, in the order pinned. */
  pinnedRepos: GitHubRepoSummary[];
  /**
   * Languages summed across counted repos. Byte-weighted on GraphQL,
   * repo-count-weighted on REST fallback; templates can show the
   * difference via `source` if they care. Max 5 entries.
   */
  languages: GitHubLanguageBucket[];
  /** 53-week contribution heatmap. Null on REST-unauth fallback. */
  contributionCalendar: GitHubContributionCalendar | null;
};

/**
 * Discriminated error union surfaced by the GitHub fetcher. UI code
 * branches on `kind` to render the right message; `resetAt` is a unix-sec
 * timestamp populated only for `rate-limited`.
 */
export type GitHubFetchError = {
  kind:
    | "invalid-username"
    | "not-found"
    | "rate-limited"
    | "network"
    | "unknown";
  message: string;
  resetAt?: number;
};
