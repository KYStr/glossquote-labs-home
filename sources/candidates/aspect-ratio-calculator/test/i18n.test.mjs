import assert from "node:assert/strict";
import test from "node:test";

import { DICTIONARIES, formatNote, getErrorMessage } from "../public/js/i18n.mjs";

test("dictionaries cover the same keys in both languages", () => {
  assert.deepEqual(
    Object.keys(DICTIONARIES["zh-Hant"]).sort(),
    Object.keys(DICTIONARIES.en).sort(),
  );
  assert.deepEqual(
    Object.keys(DICTIONARIES["zh-Hant"].errors).sort(),
    Object.keys(DICTIONARIES.en.errors).sort(),
  );
});

test("every core error code renders a real message in both languages", () => {
  const samples = [
    { code: "EMPTY" },
    { code: "INVALID_NUMBER" },
    { code: "TOO_MANY_DECIMALS", max: 0 },
    { code: "TOO_MANY_DECIMALS", max: 3 },
    { code: "NON_POSITIVE" },
    { code: "TOO_LARGE", cap: "100000" },
  ];
  for (const language of ["zh-Hant", "en"]) {
    for (const sample of samples) {
      const message = getErrorMessage(language, sample);
      assert.equal(typeof message, "string");
      assert.ok(message.length > 0, `${language} ${sample.code}`);
      assert.ok(!message.includes("undefined"), `${language} ${sample.code}`);
    }
  }
});

test("the exact/close honesty wording survives translation", () => {
  assert.equal(formatNote("zh-Hant", { kind: "exact", label: "16:9" }), "正好是 16:9");
  assert.equal(
    formatNote("zh-Hant", { kind: "close", label: "16:9", diffText: "0.0009" }),
    "接近 16:9（差 0.0009）",
  );
  assert.equal(formatNote("en", { kind: "exact", label: "16:9" }), "Exactly 16:9");
  assert.equal(
    formatNote("en", { kind: "close", label: "16:9", diffText: "0.0009" }),
    "Close to 16:9 (differs by 0.0009)",
  );
  assert.equal(formatNote("en", { kind: "none" }), "");
});
