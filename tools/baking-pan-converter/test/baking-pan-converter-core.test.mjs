// Core tests for the Baking Pan Converter. Every literal expectation
// comes from fixtures.json (the SPEC's pinned values) or from an
// independent recomputation noted at the test: table-vs-table factors
// are re-derived below with exact BigInt rational arithmetic, and the
// custom-round boundary volumes were recomputed with Python's Decimal
// at 60 digits of pi — never from the implementation's own output.

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULTS,
  EXAMPLE,
  cmToInchesDisplay,
  formatFixed,
  roundHalfUp,
  run,
} from "../public/js/core/baking-pan-converter.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}: ${entry.purpose}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

function baseInput(overrides = {}) {
  return {
    sourceKind: "table",
    sourcePan: "round-8",
    sourceShape: "round",
    sourceD1: "",
    sourceD2: "",
    sourceDepth: "",
    targetKind: "table",
    targetPan: "round-9",
    targetShape: "round",
    targetD1: "",
    targetD2: "",
    targetDepth: "",
    quantity: "",
    quantityUnit: "g",
    ...overrides,
  };
}

// Exact half-up rounding of a rational num/den to `places` decimals,
// using only integer arithmetic (independent of the core's doubles).
function rationalFixed(num, den, places) {
  const scale = 10n ** BigInt(places);
  const scaled = (BigInt(num) * scale * 10n) / BigInt(den);
  const rounded = (scaled + 5n) / 10n;
  const whole = rounded / scale;
  const frac = rounded % scale;
  return `${whole}.${String(frac).padStart(places, "0")}`;
}

test("all table-vs-table fixture factors match exact rational arithmetic", () => {
  const tableCases = coreCases.filter(
    (entry) =>
      entry.expected.ok === true &&
      entry.input.sourceKind === "table" &&
      entry.input.targetKind === "table",
  );
  assert.ok(tableCases.length >= 5);
  const volumes = {
    "round-6": 927,
    "round-7": 1261,
    "round-8": 1647,
    "round-9": 2085,
    "round-10": 2574,
    "square-8": 2098,
    "square-9": 2655,
    "rect-9x13": 3835,
    "loaf-9x5": 1844,
    "bundt-10": 2844,
    "tube-10": 3792,
  };
  for (const entry of tableCases) {
    const sourceMl = volumes[entry.input.sourcePan];
    const targetMl = volumes[entry.input.targetPan];
    const expected = entry.expected.result;
    assert.equal(expected.factor, rationalFixed(targetMl, sourceMl, 2), entry.id);
    assert.equal(expected.percent, rationalFixed(targetMl * 100, sourceMl, 1), entry.id);
    if (entry.input.quantity !== "") {
      const qty = Number(entry.input.quantity);
      assert.equal(
        expected.scaledQuantity.value,
        rationalFixed(qty * targetMl, sourceMl, 1),
        entry.id,
      );
    }
  }
});

test("boundary: custom round diameter 5, depth 1 (Python Decimal 60-digit pi)", () => {
  // pi x 2.5^2 x 1 = 19.6349540849362077... -> 20 ml; 927 / 19.6349... = 47.21
  const outcome = run(
    baseInput({
      sourceKind: "custom",
      sourceD1: "5",
      sourceDepth: "1",
      targetPan: "round-6",
    }),
  );
  assert.deepEqual(outcome, {
    ok: true,
    result: {
      source: {
        basis: "geometric",
        depthCm: "1.00",
        kind: "custom",
        pan: null,
        shape: "round",
        volumeMl: 20,
      },
      target: {
        basis: "geometric",
        depthCm: "5.08",
        kind: "table",
        pan: "round-6",
        shape: null,
        volumeMl: 927,
      },
      factor: "47.21",
      percent: "4721.2",
      scaledQuantity: null,
      depthRelation: "deeper",
    },
  });
});

test("boundary: custom round diameter 60, depth 15 (Python Decimal 60-digit pi)", () => {
  // pi x 30^2 x 15 = 42411.5008234622087... -> 42412 ml
  const outcome = run(
    baseInput({
      sourceKind: "custom",
      sourceD1: "60",
      sourceDepth: "15",
      targetPan: "round-6",
    }),
  );
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.source.volumeMl, 42412);
  assert.equal(outcome.result.factor, "0.02");
  assert.equal(outcome.result.percent, "2.2");
  assert.equal(outcome.result.depthRelation, "shallower");
});

test("boundary: custom rect 5x5, depth 1 -> square-8 with 100 g", () => {
  const outcome = run(
    baseInput({
      sourceKind: "custom",
      sourceShape: "rect",
      sourceD1: "5",
      sourceD2: "5",
      sourceDepth: "1",
      targetPan: "square-8",
      quantity: "100",
      quantityUnit: "g",
    }),
  );
  assert.deepEqual(outcome, {
    ok: true,
    result: {
      source: {
        basis: "geometric",
        depthCm: "1.00",
        kind: "custom",
        pan: null,
        shape: "rect",
        volumeMl: 25,
      },
      target: {
        basis: "geometric",
        depthCm: "5.08",
        kind: "table",
        pan: "square-8",
        shape: null,
        volumeMl: 2098,
      },
      factor: "83.92",
      percent: "8392.0",
      scaledQuantity: { unit: "g", value: "8392.0" },
      depthRelation: "deeper",
    },
  });
});

test("boundary: custom rect 60x60, depth 15 -> round-6", () => {
  const outcome = run(
    baseInput({
      sourceKind: "custom",
      sourceShape: "rect",
      sourceD1: "60",
      sourceD2: "60",
      sourceDepth: "15",
      targetPan: "round-6",
    }),
  );
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.source.volumeMl, 54000);
  assert.equal(outcome.result.factor, "0.02");
  assert.equal(outcome.result.percent, "1.7");
  assert.equal(outcome.result.depthRelation, "shallower");
});

test("boundary: quantity 100000 scales (exact rational 2085/1647)", () => {
  const outcome = run(baseInput({ quantity: "100000", quantityUnit: "g" }));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.scaledQuantity.value, "126593.8");
  assert.equal(outcome.result.scaledQuantity.unit, "g");
});

test("just over the limits: diameter 4.99 / 60.01, depth 0.99 / 15.01, quantity 100000.01", () => {
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceD1: "4.99", sourceDepth: "5" })), {
    ok: false,
    error: { code: "RANGE", field: "sourceD1", row: null },
  });
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceD1: "60.01", sourceDepth: "5" })), {
    ok: false,
    error: { code: "RANGE", field: "sourceD1", row: null },
  });
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceD1: "20", sourceDepth: "0.99" })), {
    ok: false,
    error: { code: "RANGE", field: "sourceDepth", row: null },
  });
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceD1: "20", sourceDepth: "15.01" })), {
    ok: false,
    error: { code: "RANGE", field: "sourceDepth", row: null },
  });
  assert.deepEqual(run(baseInput({ quantity: "100000.01", quantityUnit: "g" })), {
    ok: false,
    error: { code: "RANGE", field: "quantity", row: null },
  });
  assert.deepEqual(run(baseInput({ quantity: "0.00", quantityUnit: "g" })), {
    ok: false,
    error: { code: "RANGE", field: "quantity", row: null },
  });
});

test("decimal grammar: bad forms are DECIMAL_FORMAT, 0.5 parses but is out of range", () => {
  for (const bad of ["20.", ".5", " 20", "1e3", "+20", "05", "20,5"]) {
    assert.deepEqual(
      run(baseInput({ sourceKind: "custom", sourceD1: bad, sourceDepth: "5" })),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "sourceD1", row: null } },
      bad,
    );
  }
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceD1: "0.5", sourceDepth: "5" })), {
    ok: false,
    error: { code: "RANGE", field: "sourceD1", row: null },
  });
});

test("kind / shape / unit enums and empties", () => {
  assert.deepEqual(run(baseInput({ sourceKind: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "sourceKind", row: null },
  });
  assert.deepEqual(run(baseInput({ sourceKind: "TABLE" })), {
    ok: false,
    error: { code: "ENUM", field: "sourceKind", row: null },
  });
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceShape: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "sourceShape", row: null },
  });
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceShape: "oval" })), {
    ok: false,
    error: { code: "ENUM", field: "sourceShape", row: null },
  });
  assert.deepEqual(run(baseInput({ sourceKind: "custom", sourceShape: "rect", sourceD1: "20", sourceDepth: "5" })), {
    ok: false,
    error: { code: "EMPTY", field: "sourceD2", row: null },
  });
  assert.deepEqual(run(baseInput({ quantity: "100", quantityUnit: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "quantityUnit", row: null },
  });
  assert.deepEqual(run(baseInput({ quantity: "100", quantityUnit: "kg" })), {
    ok: false,
    error: { code: "ENUM", field: "quantityUnit", row: null },
  });
});

test("inactive fields: garbage content is ignored, but over-long content still fails INPUT_LIMIT", () => {
  const withGarbage = baseInput({
    sourceD1: "abc",
    sourceD2: "!!!",
    sourceDepth: "zzz",
    sourceShape: "bogus",
    quantityUnit: "junk",
  });
  assert.equal(run(withGarbage).ok, true);
  assert.deepEqual(run(baseInput({ sourceD1: "123456789" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "sourceD1", row: null },
  });
  assert.deepEqual(run(baseInput({ sourcePan: "round-8-extra" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "sourcePan", row: null },
  });
  assert.deepEqual(run(baseInput({ quantityUnit: "grams" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "quantityUnit", row: null },
  });
});

test("unpaired surrogates: active field is UNICODE, inactive field is ignored", () => {
  assert.deepEqual(run(baseInput({ sourcePan: "round-\ud800" })), {
    ok: false,
    error: { code: "UNICODE", field: "sourcePan", row: null },
  });
  assert.equal(run(baseInput({ sourceD1: "\ud800" })).ok, true);
  assert.deepEqual(run(baseInput({ quantity: "\ud800", quantityUnit: "g" })), {
    ok: false,
    error: { code: "UNICODE", field: "quantity", row: null },
  });
});

test("first error wins in the fixed field order", () => {
  assert.deepEqual(
    run(baseInput({ sourceKind: "custom", sourceD1: "", targetPan: "round-12" })),
    { ok: false, error: { code: "EMPTY", field: "sourceD1", row: null } },
  );
  assert.deepEqual(run(baseInput({ sourcePan: "round-12", quantity: "0" })), {
    ok: false,
    error: { code: "ENUM", field: "sourcePan", row: null },
  });
});

test("schema gate: null, array, missing, extra, wrong type, accessor, symbol key", () => {
  assert.deepEqual(run(null), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run([]), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  const missing = baseInput();
  delete missing.targetPan;
  assert.deepEqual(run(missing), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run({ ...baseInput(), extra: "x" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(run(baseInput({ quantity: 500 })), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  const accessor = baseInput();
  Object.defineProperty(accessor, "quantity", { get: () => "500", enumerable: true });
  assert.deepEqual(run(accessor), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  const withSymbol = baseInput();
  withSymbol[Symbol("x")] = "x";
  assert.deepEqual(run(withSymbol), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("depth relation is same when two custom depths match after normalization", () => {
  const outcome = run(
    baseInput({
      sourceKind: "custom",
      sourceD1: "20",
      sourceDepth: "5.5",
      targetKind: "custom",
      targetShape: "rect",
      targetD1: "20",
      targetD2: "15",
      targetDepth: "5.50",
    }),
  );
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.depthRelation, "same");
  assert.equal(outcome.result.source.depthCm, "5.50");
  assert.equal(outcome.result.target.depthCm, "5.50");
});

test("defaults and example match the SPEC reset value and the first fixture", () => {
  assert.deepEqual(DEFAULTS, {
    sourceKind: "table",
    sourcePan: "round-8",
    sourceShape: "round",
    sourceD1: "",
    sourceD2: "",
    sourceDepth: "",
    targetKind: "table",
    targetPan: "round-9",
    targetShape: "round",
    targetD1: "",
    targetD2: "",
    targetDepth: "",
    quantity: "",
    quantityUnit: "g",
  });
  assert.deepEqual(EXAMPLE, fixtures.cases[0].input);
  assert.equal(run(DEFAULTS).ok, true);
  assert.equal(run(DEFAULTS).result.factor, "1.27");
});

test("display helpers: cm to inches and half-up formatting", () => {
  assert.equal(cmToInchesDisplay(20), "7.87");
  assert.equal(cmToInchesDisplay(5.5), "2.17");
  assert.equal(cmToInchesDisplay(2.54), "1.00");
  assert.equal(roundHalfUp(0.125, 2), 0.13);
  assert.equal(formatFixed(0.125, 2), "0.13");
  assert.equal(formatFixed(100, 1), "100.0");
});
