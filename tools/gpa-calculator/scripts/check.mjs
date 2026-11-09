// Static checks: file contract, scale-table audit against SPEC section 4,
// forbidden patterns, and bilingual page requirements.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCALES } from "../public/js/core/scales.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const need = (cond, msg) => { if (!cond) failures.push(msg); };

for (const rel of ["public/index.html", "public/en/index.html", "public/js/app.js",
  "public/js/core/scales.mjs", "public/js/core/validate.mjs", "public/js/core/calc.mjs",
  "public/js/core/state.mjs", "public/styles/main.css"]) {
  need(existsSync(join(root, rel)), `missing file: ${rel}`);
}

// Scale tables must match SPEC section 4 exactly (toolchain-provenance).
const EXPECTED = {
  "4.0": [["A",40],["A\u2212",37],["B+",33],["B",30],["B\u2212",27],["C+",23],["C",20],["C\u2212",17],["D+",13],["D",10],["D\u2212",7],["F",0]],
  "4.3": [["A+",43],["A",40],["A\u2212",37],["B+",33],["B",30],["B\u2212",27],["C+",23],["C",20],["C\u2212",17],["D+",13],["D",10],["D\u2212",7],["F",0]]
};
for (const [id, entries] of Object.entries(EXPECTED)) {
  need(JSON.stringify(SCALES[id].entries) === JSON.stringify(entries), `scale table mismatch: ${id}`);
  need(SCALES[id].maxTenths === entries[0][1], `scale max mismatch: ${id}`);
}

const zh = readFileSync(join(root, "public/index.html"), "utf8");
const en = readFileSync(join(root, "public/en/index.html"), "utf8");
need(zh.includes('lang="zh-Hant"'), "zh page lang");
need(en.includes('lang="en"'), "en page lang");
for (const [name, html] of [["zh", zh], ["en", en]]) {
  need(html.includes('content="noindex, nofollow"'), `${name}: preview noindex missing`);
  need(html.includes('rel="canonical"'), `${name}: canonical missing`);
  need(html.includes('hreflang="zh-Hant"') && html.includes('hreflang="en"'), `${name}: hreflang pair missing`);
  need(!/https?:\/\//.test(html.replace(/<!--[^]*?-->/g, "")), `${name}: external URL in page`);
}
need(zh.includes('href="../../"'), "zh: same-language home link missing");
need(en.includes('href="../../en/"'), "en: same-language home link missing");

const app = readFileSync(join(root, "public/js/app.js"), "utf8");
need(!app.includes("innerHTML"), "app.js must not use innerHTML");
const allJs = ["public/js/app.js", "public/js/core/scales.mjs", "public/js/core/validate.mjs",
  "public/js/core/calc.mjs", "public/js/core/state.mjs"].map((r) => readFileSync(join(root, r), "utf8")).join("\n");
for (const bad of ["eval(", "Function(", "fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "document.cookie"]) {
  need(!allJs.includes(bad), `forbidden in shipped JS: ${bad}`);
}
const cores = ["scales", "validate", "calc", "state"].map((n) => readFileSync(join(root, `public/js/core/${n}.mjs`), "utf8")).join("\n");
need(!/document|window/.test(cores), "core must not touch DOM");

if (failures.length) { console.error("check FAILED:\n- " + failures.join("\n- ")); process.exit(1); }
console.log("check OK: files, scale tables vs SPEC s4, bilingual/SEO, safety patterns");
