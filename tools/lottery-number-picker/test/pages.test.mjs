// Page tests: both static entries carry the SPEC-pinned metadata
// (language, title, description, h1), the candidate preview rules
// (noindex, no canonical/hreflang, relative language links only,
// same-language home links), the pinned seed/exclude help texts, the
// honest note, the FAQ answers, and every element id the app wires.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const IDS = [
  "picks-form",
  "game",
  "seed",
  "set-count",
  "exclude",
  "run-btn",
  "example-btn",
  "cancel-btn",
  "reset-btn",
  "status",
  "results",
  "result-summary",
  "result-sets",
  "copy-btn",
  "download-btn",
];

const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "樂透選號器｜Gloss Tools",
    description:
      "用固定種子重現的亂數，幫大樂透、威力彩、今彩539 產生選號；同一個種子永遠產生同一組號碼，每種組合出現的機會都相等。",
    h1: "樂透選號器",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    seedHelp: "留空時會自動產生一個種子並顯示出來，之後可用同一種子重現。",
    excludeHelp: "只套用到第一區；威力彩第二區不排除。",
    note: "每種號碼組合出現的機率完全相等；本工具不能預測開獎結果，任何號碼組合的中獎機率都相同。",
    faqAnswer: "產生器由種子完全決定，同種子必然同結果，方便重現與核對。",
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Lottery Number Picker | Gloss Tools",
    description:
      "Generate picks for Taiwan's Lotto 6/49, Super Lotto 638 and Daily Cash 539 with a seeded, reproducible generator — the same seed always yields the same numbers, and every combination is equally likely.",
    h1: "Lottery Number Picker",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    seedHelp: "Leave blank to have a seed generated and shown; reuse it to reproduce the same numbers.",
    excludeHelp: "Applies to Zone 1 only; the Super Lotto Zone 2 is never excluded.",
    note: "Every combination is equally likely. This tool cannot predict draw results; no combination has a better chance of winning than any other.",
    faqAnswer:
      "The generator is fully determined by the seed, so results are reproducible and can be checked again later.",
  },
];

for (const page of PAGES) {
  test(`page ${page.path}: pinned metadata and candidate rules`, async () => {
    const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
    assert.ok(html.includes(`<html lang="${page.lang}">`));
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${page.description}">`));
    assert.ok(html.includes(`<h1>${page.h1}</h1>`));
    assert.ok(html.includes('content="noindex, nofollow"'));
    assert.ok(!html.includes("canonical"));
    assert.ok(!html.includes("hreflang"));
    assert.ok(html.includes(page.langLink));
    assert.ok(html.includes(page.home));
    assert.ok(html.includes(page.seedHelp));
    assert.ok(html.includes(page.excludeHelp));
    assert.ok(html.includes(page.note));
    assert.ok(html.includes(page.faqAnswer));
    for (const id of IDS) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
  });
}
