// Core tests: every literal core fixture from the SPEC's fixtures.json
// (vendored verbatim at test/fixtures.json, byte-identical to spec
// candidate 1b6147ac5d8652fe43f46614a54dfdb810b4faa8, SHA-256
// cf0270353735878c659c6f1e34fb4145f2fee9d884c06a2fbf71b0d1187792e8),
// deep-compared against run(). Extra boundary, fit-endpoint, hostile
// input and invariant cases were derived by hand from the SPEC's stated
// rules (multiplier table, endpoint ownership, exact arithmetic), never
// from the implementation's output.

import assert from "node:assert/strict";
import test from "node:test";
import { run } from "../public/js/core/tv.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

test("legal upper endpoints: 120 inches and 1500 cm succeed", () => {
  const big = run({ diagonalIn: "120", roomDistanceCm: "", resolution: "FHD" });
  assert.equal(big.ok, true);
  assert.equal(big.result.diagonalIn, 120);
  const far = run({ diagonalIn: "", roomDistanceCm: "1500", resolution: "FHD" });
  assert.equal(far.ok, true);
  assert.equal(far.result.mode, "distance");
  assert.equal(far.result.roomDistanceCm, 1500);
});

test("just outside the ranges is RANGE with the field path", () => {
  assert.deepEqual(run({ diagonalIn: "120.1", roomDistanceCm: "", resolution: "FHD" }), {
    ok: false,
    error: { code: "RANGE", field: "diagonalIn", path: "/diagonalIn" },
  });
  assert.deepEqual(run({ diagonalIn: "9.9", roomDistanceCm: "", resolution: "FHD" }), {
    ok: false,
    error: { code: "RANGE", field: "diagonalIn", path: "/diagonalIn" },
  });
  assert.deepEqual(run({ diagonalIn: "", roomDistanceCm: "1500.1", resolution: "FHD" }), {
    ok: false,
    error: { code: "RANGE", field: "roomDistanceCm", path: "/roomDistanceCm" },
  });
  assert.deepEqual(run({ diagonalIn: "", roomDistanceCm: "29.9", resolution: "FHD" }), {
    ok: false,
    error: { code: "RANGE", field: "roomDistanceCm", path: "/roomDistanceCm" },
  });
});

test("grammar rejects signs, spaces, exponents and two decimals", () => {
  for (const bad of ["+55", " 55", "55 ", "5.5e1", "55.55", ".5", "55.", "１２"]) {
    assert.deepEqual(
      run({ diagonalIn: bad, roomDistanceCm: "", resolution: "FHD" }),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "diagonalIn", path: "/diagonalIn" } },
      bad,
    );
  }
});

test("capacity over 8 UTF-16 units is INPUT_LIMIT before grammar", () => {
  assert.deepEqual(run({ diagonalIn: "123456789", roomDistanceCm: "", resolution: "FHD" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "diagonalIn", path: "/diagonalIn" },
  });
});

test("an unpaired surrogate is UNICODE", () => {
  assert.deepEqual(run({ diagonalIn: "5\uD800", roomDistanceCm: "", resolution: "FHD" }), {
    ok: false,
    error: { code: "UNICODE", field: "diagonalIn", path: "/diagonalIn" },
  });
});

test("structure failures are SCHEMA", () => {
  assert.deepEqual(run(null), { ok: false, error: { code: "SCHEMA", field: null, path: null } });
  assert.deepEqual(run("55"), { ok: false, error: { code: "SCHEMA", field: null, path: null } });
  assert.deepEqual(run({ diagonalIn: "55", roomDistanceCm: "", resolution: "FHD", extra: "1" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, path: "/extra" },
  });
  assert.deepEqual(run({ diagonalIn: 55, roomDistanceCm: "", resolution: "FHD" }), {
    ok: false,
    error: { code: "SCHEMA", field: "diagonalIn", path: "/diagonalIn" },
  });
  const accessor = {};
  Object.defineProperty(accessor, "diagonalIn", {
    enumerable: true,
    get() {
      return "55";
    },
  });
  assert.deepEqual(run(accessor), {
    ok: false,
    error: { code: "SCHEMA", field: "diagonalIn", path: "/diagonalIn" },
  });
});

test("resolution: missing defaults to FHD, empty or unknown is ENUM", () => {
  const missing = run({ diagonalIn: "55", roomDistanceCm: "" });
  assert.equal(missing.ok, true);
  assert.equal(missing.result.resolution, "FHD");
  assert.deepEqual(run({ diagonalIn: "55", roomDistanceCm: "", resolution: "" }), {
    ok: false,
    error: { code: "ENUM", field: "resolution", path: "/resolution" },
  });
  assert.deepEqual(run({ diagonalIn: "55", roomDistanceCm: "", resolution: "8K" }), {
    ok: false,
    error: { code: "ENUM", field: "resolution", path: "/resolution" },
  });
});

test("missing numeric fields count as not filled", () => {
  assert.deepEqual(run({ resolution: "FHD" }), {
    ok: false,
    error: { code: "EMPTY", field: null, path: "/" },
  });
  const inverse = run({ roomDistanceCm: "300" });
  assert.equal(inverse.ok, true);
  assert.equal(inverse.result.mode, "distance");
});

test("field order: diagonalIn is validated before roomDistanceCm and resolution", () => {
  assert.deepEqual(run({ diagonalIn: "130", roomDistanceCm: "1", resolution: "8K" }), {
    ok: false,
    error: { code: "RANGE", field: "diagonalIn", path: "/diagonalIn" },
  });
  assert.deepEqual(run({ diagonalIn: "", roomDistanceCm: "1", resolution: "8K" }), {
    ok: false,
    error: { code: "RANGE", field: "roomDistanceCm", path: "/roomDistanceCm" },
  });
});

// Fit endpoint ownership, derived by hand from the SPEC table for a
// 50-inch FHD screen, whose exact distances are minimum 152.4 cm,
// idealLow 190.5 cm, idealHigh 254 cm, maximum 317.5 cm.
test("fit endpoints belong exactly as the SPEC table pins", () => {
  const fitAt = (r) =>
    run({ diagonalIn: "50", roomDistanceCm: r, resolution: "FHD" }).result.fit.status;
  assert.equal(fitAt("152.3"), "TOO_CLOSE");
  assert.equal(fitAt("152.4"), "NEAR");
  assert.equal(fitAt("190.4"), "NEAR");
  assert.equal(fitAt("190.5"), "IDEAL");
  assert.equal(fitAt("254"), "IDEAL");
  assert.equal(fitAt("254.1"), "FAR");
  assert.equal(fitAt("317.5"), "FAR");
  assert.equal(fitAt("317.6"), "TOO_FAR");
});

test("4K changes only the minimum distance and diagonalMaxIn", () => {
  const fhd = run({ diagonalIn: "55", roomDistanceCm: "", resolution: "FHD" }).result;
  const uhd = run({ diagonalIn: "55", roomDistanceCm: "", resolution: "UHD4K" }).result;
  assert.deepEqual(uhd.screen, fhd.screen);
  assert.deepEqual(uhd.distances.idealLow, fhd.distances.idealLow);
  assert.deepEqual(uhd.distances.idealHigh, fhd.distances.idealHigh);
  assert.deepEqual(uhd.distances.maximum, fhd.distances.maximum);
  assert.notDeepEqual(uhd.distances.minimum, fhd.distances.minimum);
  const invFhd = run({ diagonalIn: "", roomDistanceCm: "300", resolution: "FHD" }).result;
  const invUhd = run({ diagonalIn: "", roomDistanceCm: "300", resolution: "UHD4K" }).result;
  assert.deepEqual(invUhd.diagonalRangeIn, invFhd.diagonalRangeIn);
  assert.deepEqual(invUhd.diagonalMinIn, invFhd.diagonalMinIn);
  assert.ok(invUhd.diagonalMaxIn > invFhd.diagonalMaxIn);
});

test("inverse results always satisfy min <= low <= high <= max", () => {
  for (const r of ["30", "85.5", "300", "777", "1500"]) {
    for (const resolution of ["FHD", "UHD4K"]) {
      const result = run({ diagonalIn: "", roomDistanceCm: r, resolution }).result;
      assert.ok(result.diagonalMinIn <= result.diagonalRangeIn.low, `${r} ${resolution}`);
      assert.ok(result.diagonalRangeIn.low <= result.diagonalRangeIn.high, `${r} ${resolution}`);
      assert.ok(result.diagonalRangeIn.high <= result.diagonalMaxIn, `${r} ${resolution}`);
    }
  }
});

test("a hostile markup string is inert data and fails grammar", () => {
  assert.deepEqual(
    run({ diagonalIn: "<script>", roomDistanceCm: "", resolution: "FHD" }),
    { ok: false, error: { code: "DECIMAL_FORMAT", field: "diagonalIn", path: "/diagonalIn" } },
  );
});
