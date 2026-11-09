// Page structure tests: both static entries carry the pinned bilingual
// contract and every element id that app.js wires up.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

const REQUIRED_IDS = [
  "budget-form",
  "workspace",
  "income",
  "ratio-preset",
  "custom-ratio",
  "candidate-rent",
  "deposit-months",
  "agency-fee",
  "err-income",
  "err-ratio-preset",
  "err-custom-ratio",
  "err-candidate-rent",
  "err-deposit-months",
  "err-agency-fee",
  "calculate",
  "load-example",
  "cancel",
  "reset",
  "status-message",
  "example-note",
  "results",
  "result-max-rent",
  "result-share",
  "result-verdict",
  "result-first-month",
  "result-deposit",
  "result-agency-fee",
  "result-total",
  "result-remainder",
  "result-warning",
  "download-report",
];

for (const [name, html] of [["zh-Hant", zh], ["en", en]]) {
  test(name + " page carries every wired element id exactly once", () => {
    for (const id of REQUIRED_IDS) {
      const occurrences = html.split('id="' + id + '"').length - 1;
      assert.equal(occurrences, 1, id + " should appear exactly once");
    }
  });
}

test("pinned titles, descriptions, robots and language links", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(zh.includes("<title>租屋預算規劃｜Gloss Tools</title>"));
  assert.ok(en.includes("<title>Rent Budget Planner | Gloss Tools</title>"));
  assert.ok(zh.includes('content="noindex, nofollow"'));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!zh.includes('rel="canonical"'));
  assert.ok(!en.includes('rel="canonical"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(en.includes('href="../index.html"'));
});
