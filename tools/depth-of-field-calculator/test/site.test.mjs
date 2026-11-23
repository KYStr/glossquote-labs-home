// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// pinned FAQ answers, the draft-loss note, the form controls, and the
// download button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>景深計算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入焦距、光圈、對焦距離與感光元件，算出近限、遠限、景深總長與超焦距，決定該收幾級光圈或把焦點移到哪裡。">',
    ),
  );
  assert.ok(zh.includes("<h1>景深計算</h1>"));
  assert.ok(zh.includes('content="noindex, nofollow"'));
  assert.ok(!zh.includes("canonical"));
  assert.ok(!zh.includes("hreflang"));
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes('href="./styles/app.css"'));
  assert.ok(zh.includes('src="./js/app.js"'));
});

test("en page carries the pinned metadata and candidate rules", () => {
  assert.match(en, /<html lang="en">/);
  assert.ok(en.includes("<title>Depth of Field Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter focal length, aperture, focus distance and sensor format to find the near limit, far limit, total depth of field and hyperfocal distance.">',
    ),
  );
  assert.ok(en.includes("<h1>Depth of Field Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages list all nine sensor options with the pinned CoC values", () => {
  for (const page of [zh, en]) {
    for (const sensor of [
      "1-inch",
      "four-thirds",
      "aps-c",
      "aps-c-canon",
      "aps-c-nikon",
      "aps-h",
      "full-frame",
      "medium-645",
      "custom",
    ]) {
      assert.ok(page.includes(`value="${sensor}"`), `missing sensor option ${sensor}`);
    }
    for (const coc of ["0.011", "0.015", "0.018", "0.019", "0.023", "0.029", "0.047"]) {
      assert.ok(page.includes(coc), `missing CoC value ${coc}`);
    }
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("容許彌散圓是什麼？"));
  assert.ok(zh.includes("畫面上仍被視為一點的最大模糊圓直徑，依感光元件尺寸而定。"));
  assert.ok(zh.includes("遠限顯示無限遠是什麼意思？"));
  assert.ok(zh.includes("對焦距離已達或超過超焦距，從近限起的一切都落在可接受的清晰範圍內。"));
  assert.ok(en.includes("What is the circle of confusion?"));
  assert.ok(en.includes("The largest blur spot still seen as a point, set by sensor size."));
  assert.ok(en.includes("What does an infinite far limit mean?"));
  assert.ok(en.includes("The focus distance has reached or passed the hyperfocal distance, so everything from the near limit onward is acceptably sharp."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-focal-length-mm"'));
    assert.ok(page.includes('id="field-aperture"'));
    assert.ok(page.includes('id="field-focus-distance-m"'));
    assert.ok(page.includes('id="field-sensor"'));
    assert.ok(page.includes('id="field-coc-mm"'));
    assert.ok(page.includes('id="error-focal-length-mm"'));
    assert.ok(page.includes('id="error-aperture"'));
    assert.ok(page.includes('id="error-focus-distance-m"'));
    assert.ok(page.includes('id="error-sensor"'));
    assert.ok(page.includes('id="error-coc-mm"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="setup-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
