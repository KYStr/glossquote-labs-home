// Static checks for the Shoe Size Converter candidate. Exit 1 on any failure.
// Covers: the data-provenance gate, SPEC fixtures D1-D5 against the core,
// both pages' head/SEO/privacy invariants, forbidden honesty wording,
// core purity (no DOM/network/storage), and app.js DOM safety.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifyDataGate } from "./gate.mjs";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const check = (name, condition, detail = "") => {
  if (condition) console.log(`ok — ${name}`);
  else failures.push(detail ? `${name}: ${detail}` : name);
};

// 1. Data gate (row counts + SHA-256 vs DATA-SOURCE.md).
const gate = await verifyDataGate(toolRoot);
check("data gate (row counts + SHA-256 vs DATA-SOURCE.md)", gate.ok, gate.problems.join("; "));

// 2. Fixtures D1-D5 through the core.
const core = await import(pathToFileURL(path.join(toolRoot, "public/js/core/convert.mjs")).href);
const men = core.tableFor("men");
const women = core.tableFor("women");
const result = (cat, row) => core.rowResult(cat, row);
const byFoot = (rows, mm) => {
  const p = core.selectRowByFoot(rows, mm);
  return p.status === "ok" ? p.row : null;
};
const d1 = result("men", byFoot(men, 270));
check("D1 men 27.0cm -> EU 42.5 / UK 9 / US 10 / JP 27.0",
  d1.eur === "42.5" && d1.uk === "9" && d1.us === "10" && d1.jp === "27.0", JSON.stringify(d1));
const d2 = result("men", byFoot(men, 263));
check("D2 men 26.3cm rounds up to row 265 -> EU 41.5 / UK 8.5 / US 9.5 / JP 26.5",
  d2.mondo === 265 && d2.eur === "41.5" && d2.uk === "8.5" && d2.us === "9.5" && d2.jp === "26.5",
  JSON.stringify(d2));
const d3row = core.selectRowByLabel(women, "us", "8");
const d3 = d3row ? result("women", d3row) : {};
check("D3 women US 8 -> row 245, EU 38.5 / UK 6 / JP 24.5",
  d3.mondo === 245 && d3.eur === "38.5" && d3.uk === "6" && d3.jp === "24.5", JSON.stringify(d3));
const d4row = core.selectRowByLabel(men, "eur", "44");
const d4 = d4row ? result("men", d4row) : {};
check("D4 men EU 44 -> row 280, UK 10 / US 11 / JP 28.0",
  d4.mondo === 280 && d4.uk === "10" && d4.us === "11" && d4.jp === "28.0", JSON.stringify(d4));
check("D5 men 32.5cm out of range; 21.0cm out of range; 21.1cm -> row 215 (EU 34 / UK 2.5 / US 3.5)",
  core.selectRowByFoot(men, 325).status === "out-of-range"
    && core.selectRowByFoot(men, 210).status === "out-of-range"
    && result("men", byFoot(men, 211)).eur === "34");

// 3. Page invariants for both languages.
function listPublic(dir = path.join(toolRoot, "public"), base = path.join(toolRoot, "public")) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listPublic(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}
const pages = [
  { rel: "index.html", lang: 'lang="zh-Hant"', home: 'href="../../"' },
  { rel: "en/index.html", lang: 'lang="en"', home: 'href="../../en/"' },
];
for (const page of pages) {
  const html = readFileSync(path.join(toolRoot, "public", page.rel), "utf8");
  const at = (name, cond) => check(`${page.rel} ${name}`, cond);
  at("lang attribute", html.includes(page.lang));
  at("title", /<title>.+<\/title>/.test(html));
  at("meta description", html.includes('name="description"'));
  at("h1", /<h1 /.test(html));
  at("canonical", html.includes('rel="canonical"'));
  at("hreflang pair + x-default",
    html.includes('hreflang="zh-Hant"') && html.includes('hreflang="en"') && html.includes('hreflang="x-default"'));
  at("preview noindex", html.includes('content="noindex, nofollow"'));
  at("same-language home link", html.includes(page.home));
  at("provenance block present", html.includes('class="provenance"'));
}

// 4. Whole-public-tree invariants: no external resources, no forbidden
// honesty wording, no remote URLs of any kind.
const publicFiles = listPublic();
for (const rel of publicFiles) {
  const text = readFileSync(path.join(toolRoot, "public", rel), "utf8");
  check(`${rel} no external URL`, !/https?:\/\//.test(text));
  check(`${rel} no forbidden fit wording`, !/exact fit/i.test(text) && !/guaranteed/i.test(text) && !/保證/.test(text));
}

// 5. Core purity and DOM safety.
for (const rel of ["public/js/core/tables.mjs", "public/js/core/convert.mjs"]) {
  const text = readFileSync(path.join(toolRoot, rel), "utf8");
  check(`${rel} pure (no DOM/network/storage/eval)`,
    !/\b(document|window|fetch|XMLHttpRequest|localStorage|sessionStorage|eval|Function|innerHTML)\b/.test(text));
}
const appJs = readFileSync(path.join(toolRoot, "public/js/app.js"), "utf8");
check("app.js never uses innerHTML", !appJs.includes("innerHTML"));

// 6. package.json script contract.
const pkg = JSON.parse(readFileSync(path.join(toolRoot, "package.json"), "utf8"));
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  check(`package.json script "${script}"`, typeof pkg.scripts?.[script] === "string");
}
check("package.json zero dependencies",
  Object.keys(pkg.dependencies ?? {}).length === 0 && Object.keys(pkg.devDependencies ?? {}).length === 0);
check("package.json Node >=24 ESM", pkg.type === "module" && pkg.engines?.node === ">=24");

if (failures.length > 0) {
  console.error(`\ncheck FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\ncheck ok — all static checks passed");
