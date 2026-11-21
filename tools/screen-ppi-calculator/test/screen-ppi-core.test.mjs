// Core tests: all 18 fixture cases verbatim from fixtures.json, plus
// hand-derived boundary / grammar / schema / invariant cases. Expected
// values in the extra cases were derived by hand or with an independent
// high-precision (Decimal, 50-digit) recomputation — never from the
// product's own output.

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULTS,
  EXAMPLE,
  formatCm,
  formatDotPitchMm,
  formatMegapixels,
  formatPpi,
  gcd,
  roundHalfUp,
  run,
} from "../public/js/core/screen-ppi.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

test("all 18 core fixture cases pass verbatim", () => {
  assert.equal(coreCases.length, 18);
  for (const entry of coreCases) {
    assert.deepEqual(run(entry.input), entry.expected, entry.id);
  }
});

test("field order: the first failing field wins", () => {
  // diagonalIn fails before widthPx; widthPx fails before heightPx.
  assert.deepEqual(run({ diagonalIn: "", widthPx: "x", heightPx: "y" }), {
    ok: false,
    error: { code: "EMPTY", field: "diagonalIn", row: null },
  });
  assert.deepEqual(run({ diagonalIn: "24", widthPx: "", heightPx: "y" }), {
    ok: false,
    error: { code: "EMPTY", field: "widthPx", row: null },
  });
  assert.deepEqual(run({ diagonalIn: "24", widthPx: "1920", heightPx: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "heightPx", row: null },
  });
});

test("just-outside boundaries are RANGE", () => {
  const base = { diagonalIn: "24", widthPx: "1920", heightPx: "1080" };
  assert.deepEqual(run({ ...base, diagonalIn: "0.09" }), {
    ok: false,
    error: { code: "RANGE", field: "diagonalIn", row: null },
  });
  assert.deepEqual(run({ ...base, diagonalIn: "200.01" }), {
    ok: false,
    error: { code: "RANGE", field: "diagonalIn", row: null },
  });
  assert.deepEqual(run({ ...base, diagonalIn: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "diagonalIn", row: null },
  });
  assert.deepEqual(run({ ...base, widthPx: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "widthPx", row: null },
  });
  assert.deepEqual(run({ ...base, heightPx: "16385" }), {
    ok: false,
    error: { code: "RANGE", field: "heightPx", row: null },
  });
});

test("endpoint values that look like boundaries are valid", () => {
  // "200.00" is 200 exactly, inside the range; "0.10" is 0.1 exactly.
  assert.equal(run({ diagonalIn: "200.00", widthPx: "1920", heightPx: "1080" }).ok, true);
  assert.equal(run({ diagonalIn: "0.10", widthPx: "320", heightPx: "240" }).ok, true);
  assert.equal(run({ diagonalIn: "24", widthPx: "16384", heightPx: "16384" }).ok, true);
});

test("diagonal grammar: trailing dot, leading zero, sign, space, exponent fail", () => {
  const base = { diagonalIn: "24", widthPx: "1920", heightPx: "1080" };
  for (const bad of ["24.", "024", "+24", "-24", " 24", "24 ", "2.4e1", "24,5"]) {
    assert.deepEqual(
      run({ ...base, diagonalIn: bad }),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "diagonalIn", row: null } },
      bad,
    );
  }
  // One or two decimal digits are accepted; "6.10" parses to 6.1 (see
  // HANDOFF.md errata 1: the SPEC grammar allows 1-2 decimal digits,
  // so "6.10" is valid despite the parenthetical in section 3).
  const trailingZero = run({ diagonalIn: "6.10", widthPx: "1179", heightPx: "2556" });
  assert.equal(trailingZero.ok, true);
  assert.equal(trailingZero.result.diagonalIn, 6.1);
  assert.equal(run({ ...base, diagonalIn: "24.5" }).ok, true);
  assert.equal(run({ ...base, diagonalIn: "24.55" }).ok, true);
});

test("pixel grammar: decimals, leading zeros, signs, exponents fail", () => {
  const base = { diagonalIn: "24", widthPx: "1920", heightPx: "1080" };
  for (const bad of ["1920.5", "01920", "+1920", "-1920", "1e3", "1 920"]) {
    assert.deepEqual(
      run({ ...base, widthPx: bad }),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "widthPx", row: null } },
      bad,
    );
  }
  assert.deepEqual(run({ ...base, heightPx: "01080" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "heightPx", row: null },
  });
});

test("capacity: a 9-unit raw value is INPUT_LIMIT, before grammar", () => {
  const base = { diagonalIn: "24", widthPx: "1920", heightPx: "1080" };
  assert.deepEqual(run({ ...base, diagonalIn: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "diagonalIn", row: null },
  });
  assert.deepEqual(run({ ...base, widthPx: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "widthPx", row: null },
  });
  // 8 units is the cap: "12345678" passes capacity and fails grammar/range.
  assert.deepEqual(run({ ...base, diagonalIn: "12345678" }), {
    ok: false,
    error: { code: "RANGE", field: "diagonalIn", row: null },
  });
});

test("UNICODE: an unpaired surrogate fails before EMPTY/grammar", () => {
  const base = { diagonalIn: "24", widthPx: "1920", heightPx: "1080" };
  assert.deepEqual(run({ ...base, diagonalIn: "12\ud800" }), {
    ok: false,
    error: { code: "UNICODE", field: "diagonalIn", row: null },
  });
  assert.deepEqual(run({ ...base, heightPx: "1080\ud800" }), {
    ok: false,
    error: { code: "UNICODE", field: "heightPx", row: null },
  });
  // A paired surrogate is not UNICODE; it fails the grammar instead.
  assert.deepEqual(run({ ...base, diagonalIn: "24😀" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "diagonalIn", row: null },
  });
});

test("schema: missing, extra, wrong-type, null, array, accessor and symbol inputs", () => {
  const good = { diagonalIn: "24", widthPx: "1920", heightPx: "1080" };
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run({ diagonalIn: "24", widthPx: "1920" }), schema);
  assert.deepEqual(run({ ...good, brand: "acme" }), schema);
  assert.deepEqual(run({ diagonalIn: 24, widthPx: "1920", heightPx: "1080" }), schema);
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run(["24", "1920", "1080"]), schema);
  assert.deepEqual(run("24"), schema);
  const accessor = {};
  Object.defineProperty(accessor, "diagonalIn", { enumerable: true, get: () => "24" });
  accessor.widthPx = "1920";
  accessor.heightPx = "1080";
  assert.deepEqual(run(accessor), schema);
  const symbolKeyed = { ...good, [Symbol("x")]: 1 };
  assert.deepEqual(run(symbolKeyed), schema);
  // A null-prototype object with exactly the three string fields passes.
  const nullProto = Object.create(null);
  nullProto.diagonalIn = "24";
  nullProto.widthPx = "1920";
  nullProto.heightPx = "1080";
  assert.equal(run(nullProto).ok, true);
});

test("defaults and example match the SPEC", () => {
  assert.deepEqual(DEFAULTS, { diagonalIn: "27", widthPx: "2560", heightPx: "1440" });
  assert.deepEqual(EXAMPLE, { diagonalIn: "24", widthPx: "1920", heightPx: "1080" });
  assert.equal(run(DEFAULTS).ok, true);
  assert.equal(run(EXAMPLE).ok, true);
});

test("gcd reduces the ratio in width:height order", () => {
  assert.equal(gcd(3440, 1440), 80);
  assert.equal(gcd(1366, 768), 2);
  assert.equal(gcd(1920, 1080), 120);
  assert.equal(gcd(7, 7), 7);
  assert.equal(gcd(1, 16384), 1);
});

test("display formatting is fixed-decimal and zero-padded", () => {
  assert.equal(formatPpi(94), "94.0");
  assert.equal(formatPpi(91.8), "91.8");
  assert.equal(formatCm(29.9), "29.9");
  assert.equal(formatCm(28), "28.0");
  assert.equal(formatDotPitchMm(0.49), "0.490");
  assert.equal(formatDotPitchMm(0.055), "0.055");
  assert.equal(formatMegapixels(2.07), "2.07");
  assert.equal(formatMegapixels(0.06), "0.06");
});

test("rounding is half-up, applied once", () => {
  assert.equal(roundHalfUp(2.5, 0), 3);
  assert.equal(roundHalfUp(0.125, 2), 0.13);
  assert.equal(roundHalfUp(100.45, 1), 100.5);
});

// The SPEC's pinned invariant, corrected (see HANDOFF.md errata 2):
// sqrt(widthCm^2 + heightCm^2) / 2.54 equals the DIAGONAL (d), not the
// ppi — widthCm = w/ppi*2.54, so the diagonal is what drops out.
// Verified here from the inputs alone, on the unrounded values.
test("reconciliation invariant: unrounded width/height recombine to the diagonal", () => {
  for (const entry of coreCases) {
    if (!entry.expected.ok) continue;
    const { diagonalIn: d, widthPx: w, heightPx: h } = entry.input;
    const diagPx = Math.sqrt(w * w + h * h);
    const ppiRaw = diagPx / Number(d);
    const widthCmRaw = (w / ppiRaw) * 2.54;
    const heightCmRaw = (h / ppiRaw) * 2.54;
    const recombined = Math.sqrt(widthCmRaw * widthCmRaw + heightCmRaw * heightCmRaw) / 2.54;
    assert.ok(Math.abs(recombined - Number(d)) < 1e-9, entry.id);
  }
});

// The displayed (rounded) PPI must NOT be the source of the physical
// sizes: 100x100 at 15.6" has ppiRaw 9.065... (shown 9.1); deriving
// the width from the shown 9.1 gives 27.9 cm, the correct unrounded
// derivation gives 28.0 cm. Expected values below were recomputed
// independently with 50-digit Decimal arithmetic.
test("physical sizes derive from the unrounded ppi, not the displayed ppi", () => {
  const outcome = run({ diagonalIn: "15.6", widthPx: "100", heightPx: "100" });
  assert.deepEqual(outcome, {
    ok: true,
    result: {
      aspectRatio: "1:1",
      diagonalIn: 15.6,
      dotPitchMm: 2.802,
      heightCm: 28,
      heightPx: 100,
      megapixels: 0.01,
      ppi: 9.1,
      widthCm: 28,
      widthPx: 100,
    },
  });
  const fromShownPpi = roundHalfUp((100 / outcome.result.ppi) * 2.54, 1);
  assert.equal(fromShownPpi, 27.9);
  assert.notEqual(fromShownPpi, outcome.result.widthCm);
});
