// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-
// identical copy of the fixed spec candidate fixtures,
// spec-ping-area-converter-20261109, spec candidate commit
// 6d7cc4cd18a273b0d386b19b85b883573d097cba, SHA-256
// 9181883367eee444ef119af360a13a0c13c746966a668e6c15bc59e74508b550).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, and the quick-table
// case compares all 100 rows literally. The cross-check below
// recomputes every success value through an independent path — a
// truncated decimal expansion by long division, rounded from the
// digit string — deliberately a different mechanism from the
// implementation's scaled-integer rounding formula, so agreement is
// a real check of the exact-fraction arithmetic.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildQuickTable, formatValue, run } from "../public/js/core/ping-area.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-ping-area-converter-20261109");
assert.equal(coreCases.length, 23);

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

const tableCase = fixtures.cases.find((entry) => entry.kind === "table");
assert.equal(tableCase.id, "quick-table-1-100");

test("fixture quick-table-1-100: all 100 rows literal", () => {
  assert.deepEqual(buildQuickTable(), { rows: tableCase.expected.rows });
});

// --- Independent recomputation -------------------------------------
// Exact fractions for the SPEC's constants (data, not logic).
const TO_M2 = {
  ping: [400n, 121n],
  m2: [1n, 1n],
  ft2: [145161n, 1562500n],
  tatami: [81n, 50n],
};
const FROM_M2 = {
  ping: [121n, 400n],
  m2: [1n, 1n],
  ft2: [1562500n, 145161n],
  tatami: [50n, 81n],
};
const DPS = { ping: 2, m2: 2, ft2: 2, tatami: 1 };

function parseAmount(text) {
  const dot = text.indexOf(".");
  if (dot === -1) return [BigInt(text), 1n];
  const scale = 10n ** BigInt(text.length - dot - 1);
  return [BigInt(text.slice(0, dot)) * scale + BigInt(text.slice(dot + 1)), scale];
}

// Truncated decimal expansion of n/d with `places` fractional
// digits, by schoolbook long division.
function expand(n, d, places) {
  let rem = n % d;
  let digits = "";
  for (let index = 0; index < places; index += 1) {
    rem *= 10n;
    digits += (rem / d).toString();
    rem %= d;
  }
  return `${n / d}.${digits}`;
}

// Half-up rounding read off a decimal digit string: the first
// dropped digit decides, and a dropped 5 (tie or above) rounds up.
function roundFromExpansion(text, dp) {
  const [intPart, fracPart] = text.split(".");
  const kept = (fracPart ?? "").slice(0, dp).padEnd(dp, "0");
  const dropped = (fracPart ?? "")[dp] ?? "0";
  let scaled = BigInt(intPart) * 10n ** BigInt(dp) + BigInt(kept === "" ? "0" : kept);
  if (dropped >= "5") scaled += 1n;
  const digits = scaled.toString().padStart(dp + 1, "0");
  return Number(
    dp === 0 ? digits : `${digits.slice(0, digits.length - dp)}.${digits.slice(digits.length - dp)}`,
  );
}

function independentConvert(amountText, unit) {
  const [an, ad] = parseAmount(amountText);
  const [tn, td] = TO_M2[unit];
  const m2n = an * tn;
  const m2d = ad * td;
  const result = {};
  for (const target of ["ping", "m2", "ft2", "tatami"]) {
    const [fn, fd] = FROM_M2[target];
    result[target] = roundFromExpansion(expand(m2n * fn, m2d * fd, 15), DPS[target]);
  }
  return result;
}

test("independent decimal-expansion recomputation agrees on every success fixture", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    assert.deepEqual(
      independentConvert(fixture.input.amount, fixture.input.unit),
      fixture.expected.result,
      fixture.id,
    );
  }
});

test("independent recomputation agrees on all 100 quick-table rows", () => {
  const { rows } = buildQuickTable();
  for (const row of rows) {
    const expected = independentConvert(String(row.ping), "ping");
    assert.equal(row.m2, expected.m2, `ping ${row.ping} m2`);
    assert.equal(row.ft2, expected.ft2, `ping ${row.ping} ft2`);
  }
});

test("quick table row 30 equals the example conversion (SPEC cross-reference)", () => {
  const { rows } = buildQuickTable();
  assert.equal(rows.length, 100);
  assert.equal(rows[29].ping, 30);
  assert.equal(rows[29].m2, 99.17);
  assert.equal(rows[29].ft2, 1067.5);
  for (let index = 0; index < 100; index += 1) {
    assert.equal(rows[index].ping, index + 1);
  }
});

// --- Grammar, capacity, order --------------------------------------

test("amount grammar edges follow the SPEC grammar exactly", () => {
  const format = { ok: false, error: { code: "DECIMAL_FORMAT", field: "amount", row: null } };
  for (const bad of ["1.", ".5", "+1", "-1", "1e3", "1 000", "00", "01.5", "1.5 ", " 1", "１２", "1,5", "0x10"]) {
    assert.deepEqual(run({ amount: bad, unit: "ping" }), format, bad);
  }
  // Grammar-valid zero in decimal form is a range failure, not a
  // format failure.
  assert.deepEqual(run({ amount: "0.000", unit: "ping" }), {
    ok: false,
    error: { code: "RANGE", field: "amount", row: null },
  });
  assert.equal(run({ amount: "0.5", unit: "ping" }).ok, true);
});

test("the range upper bound is inclusive and judged on the exact value", () => {
  assert.equal(run({ amount: "1000000", unit: "ping" }).ok, true);
  assert.equal(run({ amount: "1000000.000", unit: "m2" }).ok, true);
  assert.equal(run({ amount: "999999.999", unit: "ft2" }).ok, true);
  // Twelve raw units, grammar-valid, value above the bound: RANGE,
  // proving capacity counts raw units and range judges the value.
  assert.deepEqual(run({ amount: "123456789.12", unit: "ping" }), {
    ok: false,
    error: { code: "RANGE", field: "amount", row: null },
  });
});

test("capacity precedes the Unicode check, which precedes grammar", () => {
  // 13 UTF-16 units including a lone surrogate: INPUT_LIMIT wins.
  assert.deepEqual(run({ amount: "123456789012\uD800", unit: "ping" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "amount", row: null },
  });
  // Exactly 12 units including a lone surrogate: UNICODE.
  assert.deepEqual(run({ amount: "12345678901\uD800", unit: "ping" }), {
    ok: false,
    error: { code: "UNICODE", field: "amount", row: null },
  });
  // A lone low surrogate is UNICODE as well.
  assert.deepEqual(run({ amount: "1\uDC00", unit: "ping" }), {
    ok: false,
    error: { code: "UNICODE", field: "amount", row: null },
  });
});

test("unit validation: capacity, Unicode, empty, then enumeration (case-sensitive)", () => {
  assert.deepEqual(run({ amount: "10", unit: "pingpin" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "unit", row: null },
  });
  // Seven units, one over the unit capacity of six.
  assert.deepEqual(run({ amount: "10", unit: "tatami2" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "unit", row: null },
  });
  assert.deepEqual(run({ amount: "10", unit: "p\uD800ng" }), {
    ok: false,
    error: { code: "UNICODE", field: "unit", row: null },
  });
  for (const bad of ["PING", "Ping", " ping", "ping ", "m²", "yard"]) {
    assert.deepEqual(run({ amount: "10", unit: bad }), {
      ok: false,
      error: { code: "ENUM", field: "unit", row: null },
    }, bad);
  }
});

test("field order: amount is fully validated before unit", () => {
  assert.deepEqual(run({ amount: "0", unit: "yard" }), {
    ok: false,
    error: { code: "RANGE", field: "amount", row: null },
  });
  assert.deepEqual(run({ amount: "10", unit: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "unit", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("30"), schema);
  assert.deepEqual(run(42), schema);
  assert.deepEqual(run({}), schema);
  assert.deepEqual(run({ amount: "30" }), schema);
  assert.deepEqual(run({ amount: "30", unit: "ping", extra: "x" }), schema);
  assert.deepEqual(run({ amount: "30", unit: 4 }), schema);
  const withAccessor = { unit: "ping" };
  Object.defineProperty(withAccessor, "amount", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("half-up ties round up, never to even and never down", () => {
  // The two literal tie fixtures pin 0.605 -> 0.61 and 1.05 -> 1.1;
  // restated here so the intent survives fixture edits.
  assert.equal(run({ amount: "2", unit: "m2" }).result.ping, 0.61);
  assert.equal(run({ amount: "1.701", unit: "m2" }).result.tatami, 1.1);
  // 0.125 m² of ping is 0.0378... no tie; the exact-fraction path
  // is what the expansion cross-check above already proves.
});

test("formatValue pads to the fixed decimals without separators", () => {
  assert.equal(formatValue(30, 2), "30.00");
  assert.equal(formatValue(1067.5, 2), "1067.50");
  assert.equal(formatValue(99.17, 2), "99.17");
  assert.equal(formatValue(61.2, 1), "61.2");
  assert.equal(formatValue(0, 2), "0.00");
  assert.equal(formatValue(0, 1), "0.0");
  assert.equal(formatValue(0.04, 2), "0.04");
  assert.equal(formatValue(57347.6, 1), "57347.6");
  assert.equal(formatValue(1000000, 2), "1000000.00");
  assert.equal(formatValue(28103.17, 2), "28103.17");
});
