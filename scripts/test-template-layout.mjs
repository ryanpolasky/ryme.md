import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  oxc: { jsx: { runtime: "classic" } },
  server: { middlewareMode: true },
  appType: "custom",
});
let templates, DEFAULT_INFO, FAMILY_DEFAULT_THEME, wrapByChars, truncateToWidth, PIXEL_FONT;
try {
  ({ templates } = await server.ssrLoadModule("/src/lib/templates/index.ts"));
  ({ DEFAULT_INFO, FAMILY_DEFAULT_THEME } = await server.ssrLoadModule("/src/lib/types.ts"));
  ({ wrapByChars, truncateToWidth } = await server.ssrLoadModule("/src/lib/text-utils.ts"));
  ({ PIXEL_FONT } = await server.ssrLoadModule("/src/lib/templates/pixelfarm-font.ts"));
} finally {
  await server.close();
}

const fixtures = [
  DEFAULT_INFO,
  { ...DEFAULT_INFO, name: "Alex", role: "", org: "", location: "", bio: "", tagline: "", skills: [], socials: [] },
  {
    ...DEFAULT_INFO,
    name: "Alex ".repeat(60),
    role: "Engineer ".repeat(40),
    org: "Organization ".repeat(40),
    location: "Remote ".repeat(40),
    bio: "Biography ".repeat(100),
    tagline: "Tagline ".repeat(40),
    skills: ["TypeScript", "X".repeat(200), ...DEFAULT_INFO.skills],
    socials: ["github", "linkedin", "website", "email"].map((kind) => ({ kind, value: "example.com/" + "profile".repeat(20) })),
  },
  {
    ...DEFAULT_INFO,
    githubUsername: "alexandria-maximilian-engineer",
    githubStats: {
      username: "alexandria-maximilian-engineer",
      fetchedAt: 0,
      source: "graphql",
      profile: { publicRepos: 123, followers: 9876, following: 42, name: "Alex", avatarUrl: "", bio: "", company: "", location: "", blog: "", htmlUrl: "", publicGists: 4, createdAt: "2020-01-01" },
      totals: { starsReceived: 123456, forksReceived: 4567, repoCount: 100, starsGiven: 123, commitsThisYear: 12345, restrictedContributions: 12, prsAuthored: 1234, prsThisYear: 123, issuesAuthored: 456, issuesThisYear: 45, reviewsThisYear: 678 },
      topRepos: [],
      pinnedRepos: [],
      languages: ["TypeScript", "Jupyter Notebook", "JavaScript", "Objective-C++", "HTML"].map((name, i) => ({ name, bytes: 1000, percentage: [40, 25, 20, 10, 5][i], color: "#3178c6" })),
      contributionCalendar: { totalContributions: 12345, weeks: Array.from({ length: 53 }, () => ({ days: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${10 + i}`, count: i * 3, level: i % 5 })) })) },
    },
  },
];
const render = (template, info, loopText = false) =>
  template.renderSvg(info, FAMILY_DEFAULT_THEME[template.family], template.duration, { loopText });
const decode = (text) => text.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) =>
  ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[entity],
);
const plainText = (svg) => decode(svg.replace(/<[^>]*>/g, ""));

test("default profile uses the updated location and tagline", () => {
  assert.equal(DEFAULT_INFO.location, "Cupertino, CA");
  assert.equal(DEFAULT_INFO.tagline, "LLMs, iOS, infra. Learning Go eventually.");
});

test("Celestial header shows the role once and keeps organization and location below", () => {
  const template = templates.find((t) => t.id === "celestial-header");
  const svg = render(template, DEFAULT_INFO);
  const role = DEFAULT_INFO.role.toUpperCase();
  assert.equal(plainText(svg).split(role).length - 1, 1);
  const meta = svg.match(/<text class="ce-meta"[^>]*>([^<]*)<\/text>/)[1];
  assert.ok(meta.includes(DEFAULT_INFO.org.toUpperCase()));
  assert.ok(meta.includes(DEFAULT_INFO.location.toUpperCase()));
  assert.ok(!meta.includes(role));
  const roleOnly = render(template, { ...DEFAULT_INFO, org: "", location: "" });
  assert.doesNotMatch(roleOnly, /<text class="ce-meta"/);
});

test("Quaint inventory grows beyond 18 skills and caps at 999", () => {
  const template = templates.find((t) => t.id === "pixelfarm-skills");
  for (const count of [24, 1000]) {
    const info = { ...DEFAULT_INFO, skills: Array.from({ length: count }, (_, i) => `Skill ${i + 1}`) };
    const svg = render(template, info, true);
    const tiles = [...svg.matchAll(/<g class="pf-tile pf-tile-\d+">/g)];
    assert.equal(tiles.length, Math.min(count, 999));
    assert.ok(template.intrinsicHeight(info) > template.intrinsicHeight(DEFAULT_INFO));
    const delays = [...svg.matchAll(/\.pf-tile-\d+ \{ animation-delay: ([\d.]+)s;/g)];
    assert.equal(delays.length, tiles.length);
    assert.ok(delays.every((match) => Number(match[1]) <= template.duration * 0.4));
  }
});

test("all templates render valid dimensions for sparse, default, and long input", () => {
  for (const template of templates) {
    for (const info of fixtures) {
      for (const loopText of [false, true]) {
        const svg = render(template, info, loopText);
        const height = template.intrinsicHeight?.(info) ?? template.height;
        assert.ok(svg.includes(`viewBox="0 0 ${template.width} ${height}"`), template.id);
        assert.doesNotMatch(svg, /NaN|undefined|Infinity/, template.id);
      }
    }
  }
});

test("code rows keep a shared top anchor and line height regardless of content", () => {
  for (const template of templates.filter((t) => t.family === "code")) {
    for (const info of fixtures) {
      const svg = render(template, info);
      const rows = [...svg.matchAll(/<g class="cl\d+"[^>]*>([\s\S]*?)<\/g>/g)];
      const positions = rows.map((row) => {
        const transform = row[0].match(/transform="translate\([\d.]+ ([\d.]+)\)"/);
        const y = row[1].match(/<text[^>]* y="([\d.]+)"/);
        return Number(template.category === "footer" ? transform[1] : y[1]);
      });
      assert.ok(positions.length >= 2, template.id);
      assert.equal(positions[0], template.category === "footer" ? 56 : 86, template.id);
      positions.slice(1).forEach((y, i) => assert.equal(y - positions[i], 22, template.id));
      const height = template.intrinsicHeight?.(info) ?? template.height;
      assert.ok(positions.at(-1) + 8 < height - (template.category === "footer" ? 28 : 0), template.id);
    }
  }
});

test("code and terminal chrome can retain explicit font sizes", () => {
  for (const template of templates.filter((t) => ["code", "terminal"].includes(t.family))) {
    const svg = render(template, DEFAULT_INFO);
    assert.doesNotMatch(svg, /text\s*\{[^}]*font-size:/, template.id);
    if (template.id !== "terminal-skills") {
      assert.match(svg, /^<svg[^>]*font-size="/, template.id);
    }
  }
});

test("code cursors flow with the text rather than guessing a pixel position", () => {
  for (const template of templates.filter((t) => t.family === "code")) {
    for (const info of fixtures) {
      const svg = render(template, info);
      assert.match(svg, /<tspan[^>]*animation: blink[^>]*>\|<\/tspan>/, template.id);
      assert.doesNotMatch(svg, /<rect[^>]*animation: blink/, template.id);
    }
  }
});

test("pixel handles have an at-sign glyph instead of using the fallback", () => {
  assert.ok(PIXEL_FONT["@"]);
  assert.notDeepEqual(PIXEL_FONT["@"], PIXEL_FONT["?"]);
});

test("long code values stay within the editor width", () => {
  for (const id of ["code-header", "code-about", "code-skills", "code-github-stats"]) {
    const template = templates.find((t) => t.id === id);
    const svg = render(template, fixtures[2]);
    const size = Number(svg.match(/^<svg[^>]*font-size="([\d.]+)"/)[1]);
    const lines = [...svg.matchAll(/<g transform="translate\(194 [\d.]+\)">([\s\S]*?)<\/g>/g)];
    assert.ok(lines.length, id);
    for (const line of lines) {
      assert.ok(plainText(line[1]).length * size * 0.6 <= 590, `${id}: ${plainText(line[1])}`);
    }
  }
});

test("oversized skill chips truncate rather than overflowing their panels", () => {
  for (const id of ["terminal-skills", "glass-skills", "sleek-skills", "neon-skills"]) {
    const template = templates.find((t) => t.id === id);
    const svg = render(template, fixtures[2]);
    assert.ok(!svg.includes("X".repeat(200)), id);
    assert.ok(svg.includes("…"), id);
  }
});

test("tracked text truncation accounts for the space between glyphs", () => {
  const text = truncateToWidth("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 100, 12, "mono", 4);
  assert.ok(text.length * 12 * 0.6 + (text.length - 1) * 4 <= 100);
  assert.ok(text.endsWith("…"));
});

test("wrapped text respects both line and character limits, including long tokens", () => {
  for (const text of ["X".repeat(300), "short " + "X".repeat(200), "word ".repeat(100), "last line exactly fits"]) {
    for (const width of [1, 10, 24]) {
      for (const maxLines of [1, 2, 4]) {
        const lines = wrapByChars(text, width, maxLines);
        assert.ok(lines.length <= maxLines);
        assert.ok(lines.every((line) => line.length <= width), JSON.stringify(lines));
      }
    }
  }
  assert.deepEqual(wrapByChars("", 10, 2), []);
  assert.deepEqual(wrapByChars("text", 10, 0), []);
  assert.deepEqual(wrapByChars("one two three", 7, 2), ["one two", "three"]);
});
