// Static checks over the Spacing Token Audit source tree.
// Verifies the package contract, forbidden sinks, core purity, both HTML
// pages (exact SPEC strings, noindex, canonical/hreflang, CSP, labels,
// required ids), i18n parity, and the literal SPEC fixtures against the core.
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
  else console.log(`ok: ${message}`);
}

async function read(rel) {
  return readFile(join(root, rel), "utf8");
}

async function listFiles(relDir) {
  const out = [];
  const entries = await readdir(join(root, relDir), { withFileTypes: true });
  for (const entry of entries) {
    const rel = join(relDir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(rel)));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
check(nodeMajor >= 24, `Node >= 24 (running ${process.versions.node})`);

const pkg = JSON.parse(await read("package.json"));
check(pkg.type === "module", "package.json type is module");
check(
  typeof pkg.engines?.node === "string" && pkg.engines.node.includes("24"),
  "package.json engines require Node >= 24",
);
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  check(typeof pkg.scripts?.[script] === "string", `package.json script ${script} present`);
}
check(
  pkg.dependencies === undefined && pkg.devDependencies === undefined,
  "zero runtime/dev dependencies",
);

const jsFiles = (await listFiles("public/js")).filter((f) => f.endsWith(".mjs") || f.endsWith(".js"));
const FORBIDDEN = [
  "eval(",
  "new Function",
  "innerHTML",
  "outerHTML",
  "document.write",
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "sendBeacon",
  "import(",
];
for (const file of jsFiles) {
  const source = await read(file);
  for (const pattern of FORBIDDEN) {
    check(!source.includes(pattern), `${file} has no ${pattern}`);
  }
}

const coreSource = await read("public/js/core/audit.mjs");
for (const globalName of ["document", "window", "navigator", "self", "localStorage", "fetch("]) {
  check(!coreSource.includes(globalName), `core has no ${globalName}`);
}
check(coreSource.includes("BigInt"), "core uses BigInt thousandths");

const controllerSource = await read("public/js/controller.mjs");
check(controllerSource.includes("generation"), "controller tracks generations");

const appSource = await read("public/js/app.js");
check(appSource.includes("/*__WORKER_SOURCE__*/ null"), "app.js carries the build placeholder");
check(appSource.includes("textContent"), "app.js uses textContent");
check(appSource.includes("link.download = REPORT_FILENAME"), "download link sets the fixed report filename");

const handlerSource = await read("scripts/worker-handler.mjs");
check(handlerSource.includes("self.onmessage"), "worker handler sets self.onmessage");
check(handlerSource.includes("run(snapshot)"), "worker handler runs the core");

const zh = await read("public/index.html");
const en = await read("public/en/index.html");
const pages = [
  { name: "zh", html: zh },
  { name: "en", html: en },
];

const EXPECTED = {
  zh: {
    lang: 'lang="zh-Hant"',
    title: "<title>設計間距 Token 對照｜Gloss Tools</title>",
    description:
      "設計或前端同事拿到版面標註值，想知道每筆量測最接近哪個設計間距 token，並交付超出可接受偏差的列。",
    h1: "<h1>設計間距 Token 對照</h1>",
  },
  en: {
    lang: 'lang="en"',
    title: "<title>Design Spacing Token Audit | Gloss Tools</title>",
    description:
      "Match measured pixel spacing to the nearest design token and check which differences exceed your tolerance.",
    h1: "<h1>Design Spacing Token Audit</h1>",
  },
};

const CSP_DIRECTIVES = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "worker-src 'blob:'",
  "img-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
];

const REQUIRED_IDS = [
  "audit-form",
  "tokens",
  "measurements",
  "tolerance",
  "run",
  "example",
  "cancel",
  "reset",
  "status",
  "error",
  "results",
  "summary",
  "results-body",
  "pager",
  "prev",
  "next",
  "page-label",
  "download",
];

for (const page of pages) {
  const expected = EXPECTED[page.name];
  check(page.html.includes(expected.lang), `${page.name}: lang attribute`);
  check(page.html.includes(expected.title), `${page.name}: exact title`);
  check(
    page.html.includes(`content="${expected.description}"`),
    `${page.name}: exact description`,
  );
  check(page.html.includes(expected.h1), `${page.name}: exact h1`);
  check(
    page.html.includes('<meta name="robots" content="noindex,nofollow">'),
    `${page.name}: robots noindex,nofollow`,
  );
  check(page.html.includes('rel="canonical"'), `${page.name}: canonical link`);
  check(page.html.includes('hreflang="zh-Hant"'), `${page.name}: hreflang zh-Hant`);
  check(page.html.includes('hreflang="en"'), `${page.name}: hreflang en`);
  for (const directive of CSP_DIRECTIVES) {
    check(page.html.includes(directive), `${page.name}: CSP ${directive}`);
  }
  check(!/(?:\s|^)on[a-z]+\s*=/.test(page.html), `${page.name}: no inline event handlers`);
  check(!page.html.includes("<script") || page.html.includes('type="module"'), `${page.name}: only module script`);
  for (const id of REQUIRED_IDS) {
    check(page.html.includes(`id="${id}"`), `${page.name}: id ${id} present`);
  }
  for (const field of ["tokens", "measurements", "tolerance"]) {
    check(page.html.includes(`<label for="${field}">`), `${page.name}: visible label for ${field}`);
  }
}
check(zh.includes('href="../../"'), "zh: same-language home link");
check(en.includes('href="../../en/"'), "en: same-language home link");
check(zh.includes('href="en/"'), "zh: language link to en");
check(en.includes('href="../"'), "en: language link to zh");
check(zh.includes("取 px 較小的，數值仍相同時依輸入先後。"), "zh: FAQ tie answer");
check(zh.includes("報告只顯示匹配及偏差，原值仍可查看。"), "zh: FAQ edit answer");
check(en.includes("It picks the smaller pixel value, then the earlier listed token."), "en: FAQ tie answer");
check(en.includes("The report shows matches and deviations alongside the original values."), "en: FAQ edit answer");

const zhIds = [...zh.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).sort();
const enIds = [...en.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).sort();
check(
  JSON.stringify(zhIds) === JSON.stringify(enIds),
  "both pages expose the same element ids",
);

// No remote URLs anywhere under public/.
const publicFiles = await listFiles("public");
for (const file of publicFiles) {
  const source = await read(file);
  check(!/https?:\/\//.test(source), `${file} has no remote URL`);
}

// Literal SPEC fixtures against the same core the tests import.
const { run } = await import("../public/js/core/audit.mjs");
const fixtures = JSON.parse(
  await readFile(
    join(root, "..", "..", "docs", "specs", "spacing-token-audit", "fixtures.json"),
    "utf8",
  ),
);
let fixtureCount = 0;
for (const fixture of fixtures.cases.filter((c) => c.kind === "core")) {
  const actual = run(fixture.input);
  const expected = fixture.expected;
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  check(same, `fixture ${fixture.id} matches expected`);
  fixtureCount += 1;
}
check(fixtureCount === 7, "7 core fixtures checked");

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nall static checks passed");
