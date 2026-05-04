// Standalone smoke test for the /api/github/:username Pages Function and
// the client-side username parser. Hits whatever's running on
// http://localhost:8788 (the wrangler default), so start the function
// first:
//
//   npm run pages:dev   # in another terminal
//
// Then:
//
//   npx tsx scripts/smoke-github.ts <username>
//
// Defaults to "octocat" if no username is given. Override the base URL
// via SMOKE_BASE=https://your-deploy.pages.dev to test prod.

import {
  parseGithubUsername,
} from "../src/lib/github";
import type { GitHubStats, GitHubFetchError } from "../src/lib/types";

const BASE = process.env.SMOKE_BASE || "http://localhost:8788";

const PARSER_CASES: Array<[string, string | null]> = [
  ["ryanpolasky", "ryanpolasky"],
  ["@ryanpolasky", "ryanpolasky"],
  ["  ryanpolasky  ", "ryanpolasky"],
  ["https://github.com/ryanpolasky", "ryanpolasky"],
  ["github.com/ryanpolasky/some-repo", "ryanpolasky"],
  ["https://github.com/ryanpolasky/some-repo?tab=stars", "ryanpolasky"],
  ["", null],
  ["-bad", null],
  ["bad-", null],
  ["bad--name", null],
  ["x".repeat(40), null],
  ["valid-name-here", "valid-name-here"],
];

function checkParser(): boolean {
  let ok = true;
  for (const [input, want] of PARSER_CASES) {
    const got = parseGithubUsername(input);
    const passed = got === want;
    if (!passed) ok = false;
    console.log(
      `${passed ? "ok " : "FAIL"}  parseGithubUsername(${JSON.stringify(input)}) -> ${JSON.stringify(got)} (want ${JSON.stringify(want)})`,
    );
  }
  return ok;
}

async function fetchViaFunction(username: string): Promise<GitHubStats> {
  const url = `${BASE}/api/github/${encodeURIComponent(username)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const body = (await res.json()) as
    | GitHubStats
    | { error: GitHubFetchError };
  if (!res.ok) {
    const err = (body as { error?: GitHubFetchError }).error;
    throw err
      ? Object.assign(new Error(err.message), { detail: err })
      : new Error(`HTTP ${res.status}`);
  }
  return body as GitHubStats;
}

async function main() {
  console.log("=== parser cases ===");
  const parserOk = checkParser();

  const username = process.argv[2] || "octocat";
  console.log(
    `\n=== GET ${BASE}/api/github/${username} ===`,
  );
  try {
    const stats = await fetchViaFunction(username);
    console.log(`source:        ${stats.source}`);
    console.log(`username:      ${stats.username}`);
    console.log(`name:          ${stats.profile.name ?? "(null)"}`);
    console.log(`avatar:        ${stats.profile.avatarUrl}`);
    console.log(`public repos:  ${stats.profile.publicRepos}`);
    console.log(`followers:     ${stats.profile.followers}`);
    console.log(
      `aggregated:    ${stats.totals.repoCount} repos, ` +
        `${stats.totals.starsReceived}\u2605 received, ` +
        `${stats.totals.forksReceived} forks received, ` +
        `${stats.totals.starsGiven}\u2605 given`,
    );
    if (stats.totals.commitsThisYear !== null) {
      console.log(
        `this year:     ${stats.totals.commitsThisYear} commits, ` +
          `${stats.totals.prsThisYear} PRs, ` +
          `${stats.totals.issuesThisYear} issues, ` +
          `${stats.totals.reviewsThisYear} reviews`,
      );
      console.log(
        `lifetime:      ${stats.totals.prsAuthored} PRs authored, ` +
          `${stats.totals.issuesAuthored} issues authored`,
      );
    }
    console.log(`top repos:`);
    for (const r of stats.topRepos) {
      console.log(
        `  - ${r.fullName.padEnd(40)} ${String(r.stars).padStart(6)}\u2605  [${r.language ?? "?"}]`,
      );
    }
    if (stats.pinnedRepos.length) {
      console.log(`pinned:`);
      for (const r of stats.pinnedRepos) {
        console.log(`  - ${r.fullName} [${r.language ?? "?"}]`);
      }
    }
    console.log(`languages:`);
    for (const l of stats.languages) {
      console.log(
        `  - ${l.name.padEnd(20)} ${String(l.bytes).padStart(10)}b  ${l.percentage}%  ${l.color ?? ""}`,
      );
    }
    if (stats.contributionCalendar) {
      console.log(
        `calendar:      ${stats.contributionCalendar.totalContributions} contributions, ` +
          `${stats.contributionCalendar.weeks.length} weeks`,
      );
    }
    console.log(`fetchedAt:     ${new Date(stats.fetchedAt).toISOString()}`);
    if (!parserOk) {
      console.error("\nparser cases failed");
      process.exit(1);
    }
  } catch (e) {
    const detail = (e as { detail?: GitHubFetchError }).detail;
    if (detail) {
      console.error(`\nFETCH FAILED [${detail.kind}]: ${detail.message}`);
      if (detail.resetAt) {
        console.error(
          `  resets at: ${new Date(detail.resetAt * 1000).toISOString()}`,
        );
      }
    } else {
      console.error(
        `\nFETCH FAILED: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    process.exit(1);
  }
}

main();
