import type {
  ProfileInfo,
  RenderOptions,
  SvgTemplate,
  TemplateTheme,
} from "../types";
import {
  compactNumber,
  contributionTotal,
  displayHandle,
  escapeXml,
  fullNumber,
  languageBuckets,
  sourceLabel,
} from "./github-stats-utils";

// row models for the rendered terminal screen. each entry takes one screen
// line; "blank" rows render nothing but still advance the y cursor.
type Row =
  | { kind: "cmd"; text: string }
  | { kind: "blank" }
  | { kind: "kv"; label: string; value: string; hint?: string }
  | { kind: "section"; text: string }
  | { kind: "lang"; bar: string; name: string; pct: string; color: string }
  | { kind: "ready" };

const W = 800;
const PAD_X = 40;
const TOP = 64;
const LINE_H = 22;
// breathing room from the last row baseline to the bottom of the canvas:
// covers cursor descender (~7), watermark line (~14), and safety pad.
const BOTTOM_PAD = 40;

function buildRows(info: ProfileInfo, dim: string, accent: string): Row[] {
  const stats = info.githubStats;
  const handle = displayHandle(info);
  const langs = languageBuckets(stats);

  const rows: Row[] = [];
  rows.push({ kind: "cmd", text: `gh stat --user ${handle}` });
  rows.push({ kind: "blank" });
  rows.push({
    kind: "kv",
    label: "repos",
    value: compactNumber(stats?.profile.publicRepos ?? null),
    hint: `${compactNumber(stats?.totals.repoCount ?? null)} indexed`,
  });
  rows.push({
    kind: "kv",
    label: "commits",
    value: compactNumber(stats?.totals.commitsThisYear ?? null),
    hint: "ytd",
  });
  rows.push({
    kind: "kv",
    label: "prs",
    value: compactNumber(stats?.totals.prsAuthored ?? null),
    hint: `${compactNumber(stats?.totals.prsThisYear ?? null)} ytd`,
  });
  rows.push({
    kind: "kv",
    label: "reviews",
    value: compactNumber(stats?.totals.reviewsThisYear ?? null),
    hint: "ytd",
  });
  rows.push({
    kind: "kv",
    label: "contribs",
    value: contributionTotal(stats),
    hint: sourceLabel(stats).toLowerCase(),
  });
  rows.push({ kind: "blank" });
  rows.push({ kind: "section", text: "top languages" });
  if (langs.length === 0) {
    rows.push({
      kind: "lang",
      bar: "░░░░░░░░░░",
      name: "no data",
      pct: "—",
      color: dim,
    });
  } else {
    for (const l of langs.slice(0, 3)) {
      const filled = Math.max(1, Math.round((l.percentage / 100) * 10));
      const bar = "▮".repeat(filled) + "░".repeat(10 - filled);
      rows.push({
        kind: "lang",
        bar,
        name: l.name,
        pct: `${l.percentage.toFixed(1)}%`,
        color: l.color ?? accent,
      });
    }
  }
  rows.push({ kind: "blank" });
  rows.push({ kind: "ready" });
  return rows;
}

// height tracks the number of rows so the prompt + watermark always fit.
function computeHeight(info: ProfileInfo): number {
  // dim/accent values are not consulted for the height calc, so feed any.
  const rows = buildRows(info, "#000", "#000");
  // last row's baseline sits at TOP + (rows.length - 1) * LINE_H. add the
  // pad to leave room for cursor descender + watermark + bottom margin.
  return TOP + (rows.length - 1) * LINE_H + BOTTOM_PAD;
}

function renderSvg(
  info: ProfileInfo,
  theme: TemplateTheme,
  loopDuration: number,
  options?: RenderOptions,
): string {
  const loopText = options?.loopText ?? true;
  const DUR = `${loopDuration}s`;

  const promptColor = theme.accent;
  const fg = theme.fg;
  const dim = theme.muted;

  const rows = buildRows(info, dim, promptColor);
  const H = TOP + (rows.length - 1) * LINE_H + BOTTOM_PAD;

  // x-offsets inside the kv group: label, value, hint columns.
  const VALUE_X_OFFSET = 120;
  const HINT_X_OFFSET = 200;
  const svgRows: string[] = [];
  let y = TOP;
  rows.forEach((r, i) => {
    const cls = `ln${i}`;
    if (r.kind === "blank") {
      y += LINE_H;
      return;
    }
    if (r.kind === "cmd") {
      svgRows.push(
        `<g class="${cls}" transform="translate(${PAD_X} ${y})">` +
          `<text fill="${promptColor}">$</text>` +
          `<text x="20" fill="${fg}">${escapeXml(r.text)}</text>` +
          `</g>`,
      );
    } else if (r.kind === "kv") {
      svgRows.push(
        `<g class="${cls}" transform="translate(${PAD_X + 20} ${y})">` +
          `<text fill="${dim}">[</text>` +
          `<text x="6" fill="${promptColor}">→</text>` +
          `<text x="20" fill="${dim}">]</text>` +
          `<text x="40" fill="${dim}">${escapeXml(r.label)}</text>` +
          `<text x="${VALUE_X_OFFSET}" fill="${fg}">${escapeXml(r.value)}</text>` +
          (r.hint
            ? `<text x="${HINT_X_OFFSET}" fill="${dim}" fill-opacity="0.7">${escapeXml(r.hint)}</text>`
            : "") +
          `</g>`,
      );
    } else if (r.kind === "section") {
      svgRows.push(
        `<g class="${cls}" transform="translate(${PAD_X} ${y})">` +
          `<text fill="${dim}"># </text>` +
          `<text x="22" fill="${fg}">${escapeXml(r.text)}</text>` +
          `</g>`,
      );
    } else if (r.kind === "lang") {
      svgRows.push(
        `<g class="${cls}" transform="translate(${PAD_X + 20} ${y})">` +
          `<text fill="${r.color}">${escapeXml(r.bar)}</text>` +
          `<text x="120" fill="${fg}">${escapeXml(r.name)}</text>` +
          `<text x="${HINT_X_OFFSET}" fill="${dim}" fill-opacity="0.7">${escapeXml(r.pct)}</text>` +
          `</g>`,
      );
    } else if (r.kind === "ready") {
      svgRows.push(
        `<g class="${cls}" transform="translate(${PAD_X} ${y})">` +
          `<text fill="${promptColor}">$</text>` +
          `<text x="20" fill="${fg}">ready</text>` +
          `<rect x="78" y="-7" width="9" height="14" fill="${fg}" style="animation: blink 1s steps(1) infinite"/>` +
          `</g>`,
      );
    }
    y += LINE_H;
  });

  // staggered fade-in matches terminal-about cadence; only renderable rows
  // get an animation entry (blanks have no svg).
  const keyframes: string[] = [];
  const rowStyles: string[] = [];
  if (loopText) {
    rows.forEach((r, i) => {
      if (r.kind === "blank") return;
      const start = i * 3;
      const visStart = start + 2;
      const visEnd = 88;
      const fadeOut = 95;
      keyframes.push(
        `@keyframes ln${i} { 0%,${start}% { opacity: 0 } ${visStart}%,${visEnd}% { opacity: 1 } ${fadeOut}%,100% { opacity: 0 } }`,
      );
      rowStyles.push(`.ln${i} { animation: ln${i} ${DUR} ease-in-out infinite }`);
    });
  }
  const cursorKf = `@keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`;

  const css = `
    text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; dominant-baseline: middle; }
    ${keyframes.join("\n    ")}
    ${cursorKf}
    ${rowStyles.join("\n    ")}
  `;

  // bottom watermark: contribution total + handle when stats are loaded;
  // shows a neutral terminal-y placeholder during loading. attribution lives
  // exclusively in footer templates now.
  const stats = info.githubStats;
  const handle = displayHandle(info);
  const footerLine = stats
    ? `${fullNumber(stats.contributionCalendar?.totalContributions ?? null)} contributions · @${handle}`
    : `# awaiting stats...`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="${theme.bg}" rx="14" ry="14"/>
  <g opacity="0.5">
    <circle cx="24" cy="24" r="6" fill="#ff5f57"/>
    <circle cx="44" cy="24" r="6" fill="#febc2e"/>
    <circle cx="64" cy="24" r="6" fill="#28c840"/>
  </g>
  <text x="${W / 2}" y="28" fill="${dim}" font-family="ui-monospace, monospace" font-size="11" text-anchor="middle">~ / github.sh</text>
  ${svgRows.join("\n  ")}
  <text x="${W - 18}" y="${H - 14}" fill="${dim}" fill-opacity="0.5" font-family="ui-monospace, monospace" font-size="10" text-anchor="end">${escapeXml(footerLine)}</text>
</svg>`;
}

const template: SvgTemplate = {
  id: "terminal-github-stats",
  name: "Terminal GitHub",
  description:
    "$ gh stat - your GitHub year rendered as a terminal session: counts, top languages, ready prompt.",
  kind: "svg",
  category: "stats",
  family: "terminal",
  width: W,
  // default preview height; the editor swaps in `intrinsicHeight` when present.
  height: TOP + 13 * LINE_H + BOTTOM_PAD,
  duration: 12,
  fields: ["github"],
  intrinsicHeight: computeHeight,
  renderSvg,
};

export default template;
