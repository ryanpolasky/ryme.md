import template from "../src/lib/templates/glass-footer.ts";
import { FAMILY_DEFAULT_THEME } from "../src/lib/types.ts";
const theme = FAMILY_DEFAULT_THEME.glass;
const info = {
  name: "Ryan Polasky",
  tagline: "LLMs, iOS, infra. Recovering Java enjoyer.",
  githubUsername: "ryanpolasky",
  socials: [],
};
const svg = template.renderSvg(info, theme, 6, { loopText: false });
// match the three signoff text segments by their distinctive font-weight + opacity attrs
const matches = svg.match(/<text[^>]*"Inter"[^>]*>[^<]*<\/text>/g) || [];
console.log(`found ${matches.length} Inter text elements`);
matches.forEach((m, i) => {
  const inner = m.match(/>([^<]*)</)[1];
  const x = parseFloat(m.match(/\bx="([^"]+)"/)[1]);
  const fill = m.match(/fill="([^"]+)"/)[1];
  console.log(`[${i}] x=${x.toFixed(1)} fill=${fill} content=${JSON.stringify(inner)}`);
});
