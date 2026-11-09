// Static page/surface tests: bilingual completeness of the shipped
// HTML, the permanent medical notice (SPEC section 5 honesty rules),
// the privacy/security surface (no storage, no network, no HTML
// sinks), and core purity (timestamp-free). GUI behaviour in a real
// browser is NOT covered here and stays NOT_RUN (see VERIFICATION).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

// Assembled from fragments so this file does not trip naive scans.
const FORBIDDEN = [
  ["inner", "HTML"],
  ["outer", "HTML"],
  ["insertAdjacent", "HTML"],
  ["local", "Storage"],
  ["session", "Storage"],
  ["indexed", "DB"],
  ["document.", "cookie"],
  ["fe", "tch("],
  ["XML", "Http", "Request"],
  ["Web", "Socket"],
  ["send", "Beacon"],
].map((parts) => parts.join(""));

test("zh page carries the full notice and honest labelling", async () => {
  const html = await read("../public/index.html");
  assert.ok(html.includes('<html lang="zh-Hant">'));
  assert.ok(html.includes('id="medical-notice"'));
  assert.ok(html.includes("估計值"));
  assert.ok(html.includes("只有少數寶寶會在預產期當天出生"));
  assert.ok(html.includes("不如早期超音波量測可靠"));
  assert.ok(html.includes("以臨床判斷為準"));
  assert.ok(html.includes("估計預產期")); // the EDD label
  assert.ok(html.includes("已超過 42 週")); // beyond-42-weeks note
  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(html.includes('hreflang="en"'));
  assert.ok(html.includes('href="../../"')); // same-language home link
});

test("en page carries the equivalent notice and honest labelling", async () => {
  const html = await read("../public/en/index.html");
  assert.ok(html.includes('<html lang="en">'));
  assert.ok(html.includes('id="medical-notice"'));
  assert.ok(html.includes("not a prediction and not medical advice"));
  assert.ok(html.includes("Only a small minority of babies are born on their due date"));
  assert.ok(html.includes("less reliable than an early ultrasound measurement"));
  assert.ok(html.includes("the clinical dating prevails"));
  assert.ok(html.includes("Estimated due date"));
  assert.ok(html.includes("more than 42 weeks"));
  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(html.includes('hreflang="zh-Hant"'));
  assert.ok(html.includes('href="../../../"'));
  assert.ok(!/predicted birth date/i.test(html));
  assert.ok(!/predicted due date/i.test(html));
});

test("shipped surface has no storage, network or HTML-sink capability", async () => {
  const files = [
    "../public/index.html",
    "../public/en/index.html",
    "../public/js/app.js",
    "../public/js/core/civil.mjs",
    "../public/js/core/due-date.mjs",
    "../public/styles/app.css",
  ];
  for (const file of files) {
    const text = await read(file);
    for (const token of FORBIDDEN) {
      assert.ok(!text.includes(token), `${file} must not contain ${token}`);
    }
    assert.ok(!/https?:\/\//.test(text), `${file} must not reference external URLs`);
  }
});

test("app renders with textContent only", async () => {
  const app = await read("../public/js/app.js");
  assert.ok(app.includes("textContent"));
});

test("core is timestamp-free and DOM-free", async () => {
  for (const file of ["../public/js/core/civil.mjs", "../public/js/core/due-date.mjs"]) {
    const text = await read(file);
    assert.ok(!text.includes("new " + "Date"), file);
    assert.ok(!text.includes("Date" + ".now"), file);
    assert.ok(!text.includes("document" + "."), file);
    assert.ok(!text.includes("window" + "."), file);
  }
});

test("trimester table is real table markup with headers in both pages", async () => {
  for (const file of ["../public/index.html", "../public/en/index.html"]) {
    const html = await read(file);
    assert.ok(html.includes("<table"), file);
    assert.ok(html.includes('<th scope="col">'), file);
    assert.ok(html.includes('<th scope="row">'), file);
    assert.ok(html.includes('aria-live="polite"'), file);
    assert.ok(html.includes('type="date"'), file);
  }
});
