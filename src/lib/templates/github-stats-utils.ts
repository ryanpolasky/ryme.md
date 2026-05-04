import type { GitHubContributionCalendar, GitHubLanguageBucket, GitHubStats, ProfileInfo } from "../types";

export const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function displayHandle(info: ProfileInfo): string {
  return info.githubStats?.username || info.githubUsername || "github-user";
}

export function compactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trimFixed(n / 1_000_000)}m`;
  if (abs >= 1_000) return `${trimFixed(n / 1_000)}k`;
  return `${n}`;
}

export function fullNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US");
}

function trimFixed(n: number): string {
  const fixed = n.toFixed(Math.abs(n) >= 10 ? 0 : 1);
  return fixed.replace(/\.0$/, "");
}

export type StatCard = {
  label: string;
  value: string;
  hint: string;
};

export function statCards(stats: GitHubStats | null): StatCard[] {
  if (!stats) {
    return [
      { label: "Repos", value: "—", hint: "load github" },
      { label: "Commits", value: "—", hint: "this year" },
      { label: "PRs", value: "—", hint: "authored" },
      { label: "Reviews", value: "—", hint: "this year" },
    ];
  }
  return [
    {
      label: "Repos",
      value: compactNumber(stats.profile.publicRepos),
      hint: `${compactNumber(stats.totals.repoCount)} indexed`,
    },
    {
      label: "Commits",
      value: compactNumber(stats.totals.commitsThisYear),
      hint: "this year",
    },
    {
      label: "PRs",
      value: compactNumber(stats.totals.prsAuthored),
      hint: `${compactNumber(stats.totals.prsThisYear)} this year`,
    },
    {
      label: "Reviews",
      value: compactNumber(stats.totals.reviewsThisYear),
      hint: "this year",
    },
  ];
}

export function languageBuckets(stats: GitHubStats | null): GitHubLanguageBucket[] {
  return stats?.languages.slice(0, 5) ?? [];
}

export function topLanguage(stats: GitHubStats | null): string {
  return stats?.languages[0]?.name ?? "—";
}

export function contributionTotal(stats: GitHubStats | null): string {
  return fullNumber(stats?.contributionCalendar?.totalContributions ?? null);
}

export function sourceLabel(stats: GitHubStats | null): string {
  if (stats?.source === "graphql") return "GraphQL";
  if (stats?.source === "rest-unauth") return "REST fallback";
  return "Not loaded";
}

export function heatmapDays(
  calendar: GitHubContributionCalendar | null | undefined,
  maxWeeks = 26,
) {
  if (!calendar) return [];
  return calendar.weeks.slice(-maxWeeks).flatMap((w) => w.days);
}

export function languageBarSvg(
  langs: GitHubLanguageBucket[],
  x: number,
  y: number,
  width: number,
  height: number,
  fallbackColor: string,
): string {
  if (langs.length === 0) {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${fallbackColor}" fill-opacity="0.18"/>`;
  }
  let cursor = x;
  return langs
    .map((l, i) => {
      const w =
        i === langs.length - 1
          ? x + width - cursor
          : Math.max(2, (width * l.percentage) / 100);
      const seg = `<rect x="${cursor}" y="${y}" width="${w}" height="${height}" rx="${height / 2}" fill="${l.color ?? fallbackColor}"/>`;
      cursor += w;
      return seg;
    })
    .join("\n  ");
}

export function heatmapSvg(
  calendar: GitHubContributionCalendar | null | undefined,
  x: number,
  y: number,
  cell: number,
  gap: number,
  colors: readonly string[],
  weeks = 26,
): string {
  const sourceWeeks = calendar?.weeks.slice(-weeks) ?? [];
  if (sourceWeeks.length === 0) {
    return Array.from({ length: weeks })
      .flatMap((_, wi) =>
        Array.from({ length: 7 }).map((_, di) => {
          const px = x + wi * (cell + gap);
          const py = y + di * (cell + gap);
          return `<rect x="${px}" y="${py}" width="${cell}" height="${cell}" rx="2" fill="${colors[0]}" opacity="0.45"/>`;
        }),
      )
      .join("\n  ");
  }
  return sourceWeeks
    .flatMap((w, wi) =>
      w.days.map((d, di) => {
        const px = x + wi * (cell + gap);
        const py = y + di * (cell + gap);
        return `<rect x="${px}" y="${py}" width="${cell}" height="${cell}" rx="2" fill="${colors[Math.min(colors.length - 1, Math.max(0, d.level))]}"/>`;
      }),
    )
    .join("\n  ");
}

