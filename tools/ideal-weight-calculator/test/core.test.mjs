// Core tests: every literal core case from fixtures.json, compared
// deep-equal against the SPEC's expected values. The expected values
// were independently recalculated (Python Fraction exact rational
// arithmetic, hand-derived from the SPEC formulas) and match the
// fixtures; they were never taken from this implementation's output.
// Extra cases cover the validation order, UNICODE classes, schema
// edges, leading zeros, and the report serializer.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DEFAULTS,
  EXAMPLE,
  REPORT_FILENAME,
  formatOneDecimal,
  messageFor,
  run,
  serializeReport,
} from "../public/js/core/ideal-weight.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

test("fixtures identity: 16 core cases, spec id pinned", () => {
  assert.equal(fixtures.specId, "spec-ideal-weight-calculator-20261109");
  assert.equal(coreCases.length, 16);
  assert.equal(fixtures.cases.filter((entry) => entry.kind === "controller").length, 3);
});

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

test("leading zeros and trailing .0 parse to the same value", () => {
  const base = run({ heightCm: "170", sex: "male" });
  assert.deepEqual(run({ heightCm: "0170", sex: "male" }), base);
  assert.deepEqual(run({ heightCm: "170.0", sex: "male" }), base);
  assert.deepEqual(run({ heightCm: "007", sex: "female" }).error, {
    code: "RANGE",
    field: "heightCm",
    row: null,
  });
});

test("validation order: heightCm is checked before sex", () => {
  assert.deepEqual(run({ heightCm: "abc", sex: "other" }).error, {
    code: "DECIMAL_FORMAT",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "", sex: "" }).error, {
    code: "EMPTY",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "170", sex: "other" }).error, {
    code: "ENUM",
    field: "sex",
    row: null,
  });
});

test("sex is case- and whitespace-sensitive", () => {
  for (const sex of ["Male", "MALE", " male", "male ", "Female", ""]) {
    const outcome = run({ heightCm: "170", sex });
    if (sex === "") {
      assert.deepEqual(outcome.error, { code: "EMPTY", field: "sex", row: null });
    } else {
      assert.deepEqual(outcome.error, { code: "ENUM", field: "sex", row: null });
    }
  }
});

test("INPUT_LIMIT beats grammar, UNICODE and range", () => {
  assert.deepEqual(run({ heightCm: "123456789", sex: "male" }).error, {
    code: "INPUT_LIMIT",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "12345678\uD800", sex: "male" }).error, {
    code: "INPUT_LIMIT",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "1234567.", sex: "male" }).error, {
    code: "DECIMAL_FORMAT",
    field: "heightCm",
    row: null,
  });
});

test("UNICODE: unpaired surrogate, control char, format char", () => {
  assert.deepEqual(run({ heightCm: "\uD800", sex: "male" }).error, {
    code: "UNICODE",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "170\u0001", sex: "male" }).error, {
    code: "UNICODE",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "170\u200B", sex: "male" }).error, {
    code: "UNICODE",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "170", sex: "fe\u007Fmale" }).error, {
    code: "UNICODE",
    field: "sex",
    row: null,
  });
  // A paired surrogate is not UNICODE (it fails the grammar instead).
  assert.deepEqual(run({ heightCm: "\uD83D\uDE00", sex: "male" }).error, {
    code: "DECIMAL_FORMAT",
    field: "heightCm",
    row: null,
  });
});

test("grammar rejects signs, spaces, exponents, full-width digits, two decimals", () => {
  for (const height of ["+170", "-170", " 170", "170 ", "1.7e2", "１７０", "170.55", ".5", "170.", ""]) {
    const outcome = run({ heightCm: height, sex: "male" });
    if (height === "") {
      assert.deepEqual(outcome.error, { code: "EMPTY", field: "heightCm", row: null });
    } else {
      assert.deepEqual(outcome.error, { code: "DECIMAL_FORMAT", field: "heightCm", row: null });
    }
  }
});

test("schema: wrong types, missing/extra keys, accessors, non-objects", () => {
  const schema = { code: "SCHEMA", field: null, row: null };
  assert.deepEqual(run({ heightCm: 170, sex: "male" }).error, schema);
  assert.deepEqual(run({ heightCm: "170" }).error, schema);
  assert.deepEqual(run({ heightCm: "170", sex: "male", weight: "60" }).error, schema);
  assert.deepEqual(run({ heightCm: "170", sex: "male", age: "30" }).error, schema);
  assert.deepEqual(run(null).error, schema);
  assert.deepEqual(run("170").error, schema);
  assert.deepEqual(run(["170", "male"]).error, schema);
  const withGetter = {};
  Object.defineProperty(withGetter, "heightCm", { enumerable: true, get: () => "170" });
  Object.defineProperty(withGetter, "sex", { enumerable: true, value: "male" });
  assert.deepEqual(run(withGetter).error, schema);
  const nullProto = Object.create(null);
  nullProto.heightCm = "170";
  nullProto.sex = "male";
  assert.equal(run(nullProto).ok, true);
});

test("boundaries: 130.0 and 230.0 pass, one step outside fails", () => {
  assert.equal(run({ heightCm: "130.0", sex: "female" }).ok, true);
  assert.equal(run({ heightCm: "230.0", sex: "male" }).ok, true);
  assert.deepEqual(run({ heightCm: "129.9", sex: "female" }).error, {
    code: "RANGE",
    field: "heightCm",
    row: null,
  });
  assert.deepEqual(run({ heightCm: "230.1", sex: "male" }).error, {
    code: "RANGE",
    field: "heightCm",
    row: null,
  });
});

test("exactly 5 feet: E = 0, every formula equals its base value", () => {
  const outcome = run({ heightCm: "152.4", sex: "male" });
  assert.deepEqual(outcome.result.formulasKg, {
    devine: 50,
    robinson: 52,
    miller: 56.2,
    hamwi: 48.1,
  });
  assert.equal(outcome.result.heightInches, 60);
});

test("below 5 feet: Hamwi uses the exact pound conversion (40.5, not 40.8)", () => {
  const outcome = run({ heightCm: "147", sex: "female" });
  assert.equal(outcome.result.formulasKg.hamwi, 40.5);
  assert.equal(outcome.result.formulasKg.devine, 40.6);
});

test("outputs round half-up once, from the exact value", () => {
  // 170 cm male: low = 53.465 exactly -> 53.5 (half-up, not banker's).
  const outcome = run({ heightCm: "170", sex: "male" });
  assert.equal(outcome.result.healthyRangeKg.lowKg, 53.5);
  assert.equal(outcome.result.healthyRangeKg.highKg, 72);
  assert.equal(outcome.result.heightInches, 66.9);
});

test("formatOneDecimal always shows one decimal", () => {
  assert.equal(formatOneDecimal(65.9), "65.9");
  assert.equal(formatOneDecimal(72), "72.0");
  assert.equal(formatOneDecimal(0), "0.0");
  assert.equal(formatOneDecimal(152.4), "152.4");
});

test("messageFor resolves field-specific and per-code messages", () => {
  assert.equal(messageFor({ code: "EMPTY", field: "heightCm", row: null }, "zh-Hant"), "請輸入身高");
  assert.equal(messageFor({ code: "EMPTY", field: "sex", row: null }, "en"), "Choose the sex.");
  assert.equal(
    messageFor({ code: "RANGE", field: "heightCm", row: null }, "en"),
    "Height must be between 130.0 and 230.0 cm.",
  );
  assert.equal(messageFor({ code: "SCHEMA", field: null, row: null }, "en"), "The input is malformed.");
  assert.equal(messageFor(null, "en"), "Something went wrong. Try again.");
  assert.equal(messageFor({ code: "NOPE", field: null, row: null }, "zh-Hant"), "發生錯誤，請再試一次");
});

test("serializeReport: canonical compact JSON plus one LF, exact bytes", () => {
  const result = run({ heightCm: "170", sex: "male" }).result;
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(REPORT_FILENAME, "ideal-weight-report.json");
  const expectedText =
    '{"bmi22Kg":63.6,"formulasKg":{"devine":65.9,"hamwi":66.9,"miller":66,"robinson":65.2},"healthyRangeKg":{"highKg":72,"lowKg":53.5},"heightCm":170,"heightInches":66.9,"sex":"male"}\n';
  assert.equal(serialized.text, expectedText);
  assert.equal(serialized.bytes, Buffer.byteLength(expectedText, "utf8"));
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    createHash("sha256").update(expectedText, "utf8").digest("hex"),
  );
});

test("serializeReport: over the 2,097,152-byte limit is OUTPUT_LIMIT", () => {
  const oversized = { note: "x".repeat(2097153) };
  const serialized = serializeReport(oversized);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});

test("defaults and example match the SPEC", () => {
  assert.deepEqual(DEFAULTS, { heightCm: "", sex: "female" });
  assert.deepEqual(EXAMPLE, { heightCm: "170", sex: "male" });
  assert.deepEqual(run(EXAMPLE), run(fixtures.cases[0].input));
});
