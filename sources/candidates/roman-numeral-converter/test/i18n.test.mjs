import assert from "node:assert/strict";
import test from "node:test";

import { DICTIONARIES, getErrorMessage } from "../public/js/i18n.mjs";

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
    { code: "INT_TOO_LONG" },
    { code: "INT_NON_DIGIT", char: "a", position: 3 },
    { code: "INT_NO_ZERO" },
    { code: "INT_CEILING" },
    { code: "ROMAN_TOO_LONG", length: 16 },
    { code: "ROMAN_BAD_CHAR", char: "<", position: 1 },
    { code: "ROMAN_OUT_OF_RANGE", loose: 4000 },
    { code: "ROMAN_NON_CANONICAL", loose: 99, canonical: "XCIX" },
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

test("the non-canonical error teaches the rule in both languages", () => {
  const sample = { code: "ROMAN_NON_CANONICAL", loose: 99, canonical: "XCIX" };
  assert.ok(getErrorMessage("zh-Hant", sample).includes("99"));
  assert.ok(getErrorMessage("zh-Hant", sample).includes("XCIX"));
  assert.ok(getErrorMessage("en", sample).includes("99"));
  assert.ok(getErrorMessage("en", sample).includes("XCIX"));
});
