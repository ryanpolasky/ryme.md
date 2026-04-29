import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { templates } from "../src/lib/templates/index.ts";
import { DEFAULT_INFO, FAMILY_DEFAULT_THEME } from "../src/lib/types.ts";
import { cleanInfo } from "../src/lib/info-utils.ts";

const OUT = "/tmp/ryme-audit";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const stressInfo = {
  name: "ALEXANDRIA MAXIMILIAN Q. ENGINEERING-SYSTEMS-OVERSEER THE THIRD",
  role: "PRINCIPAL STAFF SOFTWARE ENGINEER, RUNTIME & RELIABILITY PLATFORM",
  org: "INTERNATIONAL CONSORTIUM FOR DISTRIBUTED AUTONOMOUS TOOLING AND OPERATIONS",
  location: "SAN FRANCISCO BAY AREA / NEW YORK CITY / REMOTE-EVERYWHERE",
  tagline:
    "building observability stacks for agentic systems · incident response · release safety · <xml> & unicode 👋",
  bio:
    "I build production systems that turn noisy LLM rollouts into accountable, replayable workflows. Previously led platform infrastructure across multi-team organizations, with a heavy focus on testability, deterministic tooling, and practical developer ergonomics in high-change environments. Right now I'm working on telemetry-first pipelines, rendering architectures, and artifact workflows that stay human-readable under pressure.",
  socials: [
    { kind: "github", value: "github.com/alexandria-maximilian-engineering-overseer-the-third" },
    { kind: "linkedin", value: "linkedin.com/in/alexandria-maximilian-engineering-overseer-the-third" },
    { kind: "website", value: "alexandria-maximilian-engineering-overseer.dev/portfolio/research/publications" },
    { kind: "email", value: "alexandria.maximilian.engineering.overseer.the.third@example-enterprise-domain.dev" },
    { kind: "x", value: "@alexandria_maximilian_engineering_overseer_the_third" },
  ],
};

const fixtures = [
  { name: "default", info: DEFAULT_INFO },
  { name: "stress", info: stressInfo },
];

const results = [];
for (const t of templates) {
  if (t.kind !== "svg") {
    results.push({ id: t.id, kind: "canvas", status: "skipped-canvas" });
    continue;
  }

  const theme = FAMILY_DEFAULT_THEME[t.family];
  for (const f of fixtures) {
    const cleaned = cleanInfo(f.info);
    const svg = t.renderSvg(cleaned, theme, t.duration, { loopText: true });

    const hasBadToken = /NaN|undefined|null/.test(svg);
    const outBase = `${f.name}-${t.id}`;
    const svgPath = join(OUT, `${outBase}.svg`);
    const pngPath = join(OUT, `${outBase}.png`);
    writeFileSync(svgPath, svg, "utf8");

    try {
      const resvg = new Resvg(svg, {
        fitTo: { mode: "width", value: t.width },
      });
      const png = resvg.render().asPng();
      writeFileSync(pngPath, png);
      results.push({
        id: t.id,
        fixture: f.name,
        kind: "svg",
        status: hasBadToken ? "warn-bad-token" : "ok",
        svgBytes: Buffer.byteLength(svg),
        pngBytes: png.byteLength,
      });
    } catch (err) {
      results.push({
        id: t.id,
        fixture: f.name,
        kind: "svg",
        status: "render-error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

const fail = results.filter((r) => r.status === "render-error");
const warn = results.filter((r) => r.status === "warn-bad-token");
const ok = results.filter((r) => r.status === "ok");
const skipped = results.filter((r) => r.status === "skipped-canvas");

console.log("SVG ok:", ok.length);
console.log("SVG warn:", warn.length);
console.log("SVG fail:", fail.length);
console.log("Canvas skipped:", skipped.length);
if (warn.length) {
  console.log("\nWARN:");
  for (const w of warn) console.log(` - ${w.fixture}/${w.id}`);
}
if (fail.length) {
  console.log("\nFAIL:");
  for (const f of fail) console.log(` - ${f.fixture}/${f.id}: ${f.error}`);
}
console.log("\nArtifacts:", OUT);
