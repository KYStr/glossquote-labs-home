// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-air-purifier-calculator-20261121, spec candidate commit
// 4e73cb25b91e9f016310f1898de4b610c2c60ff7, draft spec PR #383,
// SHA-256
// fa705954fe1c368073402a6e1904f57b4e0dabf134698b5268ef124f83476fd1).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned constants and formulas by hand, never from
// the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/air-purifier.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-air-purifier-calculator-20261121");
assert.equal(coreCases.length, 15);

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

const BASE = {
  areaUnit: "m2",
  ceilingHeightM: "2.8",
  purifierCadrCfm: "",
  targetAch: "5.0",
};

function input(patch) {
  return { areaValue: "15", ...BASE, ...patch };
}

// Hand-derived boundary cases (SPEC formulas, decimal arithmetic
// done by hand; see the comments for each derivation).
test("range endpoints are accepted; one unit outside is RANGE in the offending field", () => {
  // ACH 1.0 on the standard room: volume 1483.196531 ft^3 (see
  // standard-bedroom); x1/60 = 24.7199 -> ceil 25 CFM; 25x1.6990
  // = 42.475 -> 42; 25x1.55 = 38.75 -> 38.8 sq ft -> 3.6 m^2.
  assert.deepEqual(run(input({ targetAch: "1.0" })), {
    ok: true,
    result: {
      areaM2: 15,
      areaSqft: 161.5,
      ceilingFt: 9.19,
      volumeFt3: 1483.2,
      targetAch: 1,
      requiredCadrCfm: 25,
      requiredCadrM3h: 42,
      ahamSuggestedRoomSqft: 38.8,
      ahamSuggestedRoomM2: 3.6,
      owned: null,
    },
  });
  // ACH 10.0: x10/60 = 247.199 -> ceil 248; 248x1.6990 = 421.352
  // -> 421; 248x1.55 = 384.4 sq ft -> 35.7 m^2.
  assert.deepEqual(run(input({ targetAch: "10.0" })), {
    ok: true,
    result: {
      areaM2: 15,
      areaSqft: 161.5,
      ceilingFt: 9.19,
      volumeFt3: 1483.2,
      targetAch: 10,
      requiredCadrCfm: 248,
      requiredCadrM3h: 421,
      ahamSuggestedRoomSqft: 384.4,
      ahamSuggestedRoomM2: 35.7,
      owned: null,
    },
  });
  // Ceiling 2.0 m: 6.5616 ft -> 6.56; volume 161.4585x6.5616 =
  // 1059.426094 -> 1059.4; x5/60 = 88.2855 -> ceil 89; 89x1.6990
  // = 151.211 -> 151; 89x1.55 = 137.95 -> 138.0 sq ft -> 12.8 m^2.
  assert.deepEqual(run(input({ ceilingHeightM: "2.0" })), {
    ok: true,
    result: {
      areaM2: 15,
      areaSqft: 161.5,
      ceilingFt: 6.56,
      volumeFt3: 1059.4,
      targetAch: 5,
      requiredCadrCfm: 89,
      requiredCadrM3h: 151,
      ahamSuggestedRoomSqft: 138,
      ahamSuggestedRoomM2: 12.8,
      owned: null,
    },
  });
  // Ceiling 4.0 m: 13.1232 ft -> 13.12; volume 161.4585x13.1232
  // = 2118.852187 -> 2118.9; x5/60 = 176.571 -> ceil 177;
  // 177x1.6990 = 300.723 -> 301; 177x1.55 = 274.35 -> 274.4 sq
  // ft -> 25.5 m^2.
  assert.deepEqual(run(input({ ceilingHeightM: "4.0" })), {
    ok: true,
    result: {
      areaM2: 15,
      areaSqft: 161.5,
      ceilingFt: 13.12,
      volumeFt3: 2118.9,
      targetAch: 5,
      requiredCadrCfm: 177,
      requiredCadrM3h: 301,
      ahamSuggestedRoomSqft: 274.4,
      ahamSuggestedRoomM2: 25.5,
      owned: null,
    },
  });
  // Just outside each range.
  assert.deepEqual(run(input({ areaValue: "0.9" })), {
    ok: false,
    error: { code: "RANGE", field: "areaValue", row: null },
  });
  assert.deepEqual(run(input({ areaValue: "200.1" })), {
    ok: false,
    error: { code: "RANGE", field: "areaValue", row: null },
  });
  assert.deepEqual(run(input({ ceilingHeightM: "1.9" })), {
    ok: false,
    error: { code: "RANGE", field: "ceilingHeightM", row: null },
  });
  assert.deepEqual(run(input({ ceilingHeightM: "4.1" })), {
    ok: false,
    error: { code: "RANGE", field: "ceilingHeightM", row: null },
  });
  assert.deepEqual(run(input({ targetAch: "0.9" })), {
    ok: false,
    error: { code: "RANGE", field: "targetAch", row: null },
  });
  assert.deepEqual(run(input({ targetAch: "10.1" })), {
    ok: false,
    error: { code: "RANGE", field: "targetAch", row: null },
  });
  assert.deepEqual(run(input({ purifierCadrCfm: "9" })), {
    ok: false,
    error: { code: "RANGE", field: "purifierCadrCfm", row: null },
  });
  assert.deepEqual(run(input({ purifierCadrCfm: "2001" })), {
    ok: false,
    error: { code: "RANGE", field: "purifierCadrCfm", row: null },
  });
});

test("owned CADR endpoints 10 and 2000 CFM", () => {
  // 10 CFM: 10x1.55 = 15.5 sq ft -> 1.4 m^2; ACH 600/1483.196531
  // = 0.4046 -> 0.4; shortfall 124-10 = 114.
  assert.deepEqual(run(input({ purifierCadrCfm: "10" })).result.owned, {
    cadrCfm: 10,
    ahamRoomSqft: 15.5,
    ahamRoomM2: 1.4,
    ach: 0.4,
    adequate: false,
    shortfallCfm: 114,
  });
  // 2000 CFM: 2000x1.55 = 3100.0 sq ft; 3100/10.7639 = 287.9997
  // -> 288.0 m^2; ACH 120000/1483.196531 = 80.913 -> 80.9.
  assert.deepEqual(run(input({ purifierCadrCfm: "2000" })).result.owned, {
    cadrCfm: 2000,
    ahamRoomSqft: 3100,
    ahamRoomM2: 288,
    ach: 80.9,
    adequate: true,
    shortfallCfm: 0,
  });
  // Exactly at the requirement: adequate, zero shortfall.
  assert.equal(run(input({ purifierCadrCfm: "124" })).result.owned.adequate, true);
  assert.equal(run(input({ purifierCadrCfm: "124" })).result.owned.shortfallCfm, 0);
  assert.equal(run(input({ purifierCadrCfm: "123" })).result.owned.adequate, false);
  assert.equal(run(input({ purifierCadrCfm: "123" })).result.owned.shortfallCfm, 1);
});

test("ping conversion boundaries are decided on the converted m^2 area", () => {
  // 0.3 ping = 0.99174 m^2 < 1 -> RANGE.
  assert.deepEqual(run(input({ areaValue: "0.3", areaUnit: "ping" })), {
    ok: false,
    error: { code: "RANGE", field: "areaValue", row: null },
  });
  // 60.5 ping = 200.0009 m^2 > 200 -> RANGE; 60.4 ping =
  // 199.67032 m^2 -> accepted, areaM2 199.7.
  assert.deepEqual(run(input({ areaValue: "60.5", areaUnit: "ping" })), {
    ok: false,
    error: { code: "RANGE", field: "areaValue", row: null },
  });
  const ok604 = run(input({ areaValue: "60.4", areaUnit: "ping" }));
  assert.equal(ok604.ok, true);
  assert.equal(ok604.result.areaM2, 199.7);
  // 0.4 ping = 1.32232 m^2 -> areaM2 1.3; areaSqft 1.32232x10.7639
  // = 14.23332 -> 14.2; volume 14.23332x9.18624 = 130.750694 ->
  // 130.8; x5/60 = 10.8959 -> ceil 11; 11x1.6990 = 18.689 -> 19;
  // 11x1.55 = 17.05 -> 17.1 sq ft -> 1.6 m^2.
  assert.deepEqual(run(input({ areaValue: "0.4", areaUnit: "ping" })), {
    ok: true,
    result: {
      areaM2: 1.3,
      areaSqft: 14.2,
      ceilingFt: 9.19,
      volumeFt3: 130.8,
      targetAch: 5,
      requiredCadrCfm: 11,
      requiredCadrM3h: 19,
      ahamSuggestedRoomSqft: 17.1,
      ahamSuggestedRoomM2: 1.6,
      owned: null,
    },
  });
});

test("decimal half-up is exact: 57.35 -> 57.4 (low-ach-2)", () => {
  const outcome = run({
    areaValue: "12",
    areaUnit: "m2",
    ceilingHeightM: "2.6",
    targetAch: "2.0",
    purifierCadrCfm: "",
  });
  assert.equal(outcome.ok, true);
  // 37 CFM x 1.55 = 57.35 exactly; decimal half-up gives 57.4.
  assert.equal(outcome.result.ahamSuggestedRoomSqft, 57.4);
  // Note: the SPEC's stated counter-example ("binary floating
  // point gives 57.3") does not reproduce in Node for this exact
  // product — 37*1.55 in IEEE-754 double is slightly above 57.35,
  // so naive JS rounding also gives 57.4. Binary float does
  // mis-round decimal halves in general (the classic (2.675)
  // .toFixed(2) === "2.67"), which is why the core still uses
  // exact decimal arithmetic; see HANDOFF.md errata candidate 3.
  assert.equal((2.675).toFixed(2), "2.67");
});

test("the 2/3 rule and the 5.0 ACH formula agree at the 8 ft ceiling", () => {
  // aham-eight-foot: 15 m^2 -> 161.4585 sq ft; x 2/3 = 107.639
  // -> ceil 108, equal to the volume formula's requiredCadrCfm.
  const outcome = run({
    areaValue: "15",
    areaUnit: "m2",
    ceilingHeightM: "2.4384",
    targetAch: "5.0",
    purifierCadrCfm: "",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.requiredCadrCfm, 108);
  assert.equal(outcome.result.ceilingFt, 8);
  const twoThirdsCeil = Math.ceil((1614585 * 2) / 3 / 10000);
  assert.equal(twoThirdsCeil, 108);
  assert.equal(twoThirdsCeil, outcome.result.requiredCadrCfm);
});

test("required CADR always rounds up, never down", () => {
  // standard-bedroom: exact 123.599... -> ceil 124, not 123.
  assert.equal(run(input({})).result.requiredCadrCfm, 124);
  // A volume whose exact quotient is just above an integer still
  // rounds up: 12 m^2 at ACH 2.0 gives 36.726... -> 37.
  assert.equal(
    run(input({ areaValue: "12", ceilingHeightM: "2.6", targetAch: "2.0" })).result
      .requiredCadrCfm,
    37,
  );
});

test("grammar: decimal strings only, no sign/space/exponent, one dot at most", () => {
  for (const bad of ["15.", ".5", "+15", "-15", " 15", "15 ", "1e1", "１５", "15..5", "1,5"]) {
    assert.deepEqual(run(input({ areaValue: bad })), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "areaValue", row: null },
    });
  }
  // Four fractional digits are accepted; five are not.
  assert.equal(run(input({ areaValue: "12.3456" })).ok, true);
  assert.deepEqual(run(input({ areaValue: "12.34567" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "areaValue", row: null },
  });
  // targetAch allows at most 1 fractional digit; ceilingHeightM
  // has no pinned place limit (2.4384 is the 8 ft fixture).
  assert.deepEqual(run(input({ targetAch: "5.25" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "targetAch", row: null },
  });
  assert.equal(run(input({ targetAch: "5.0" })).ok, true);
  assert.equal(run(input({ ceilingHeightM: "2.4384" })).ok, true);
  // purifier CADR is an ASCII integer string: no decimal, no
  // leading zero, no sign or space.
  for (const bad of ["200.5", "0200", "+200", "-200", " 200", "200 ", "2e2", "２００"]) {
    assert.deepEqual(run(input({ purifierCadrCfm: bad })), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "purifierCadrCfm", row: null },
    });
  }
  // "0" passes integer grammar but fails the 10-2000 range.
  assert.deepEqual(run(input({ purifierCadrCfm: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "purifierCadrCfm", row: null },
  });
});

test("empty optional fields use the defaults; empty required fields are EMPTY", () => {
  // Blank ceiling + blank ACH + blank purifier on 15 m^2 is exactly
  // the standard-bedroom result (defaults 2.8 m / 5.0 ACH).
  const standard = coreCases.find((entry) => entry.id === "standard-bedroom");
  assert.deepEqual(
    run({ areaValue: "15", areaUnit: "m2", ceilingHeightM: "", targetAch: "", purifierCadrCfm: "" }),
    { ok: true, result: standard.expected.result },
  );
  assert.deepEqual(run(input({ areaValue: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "areaValue", row: null },
  });
  assert.deepEqual(run(input({ areaUnit: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "areaUnit", row: null },
  });
  // areaUnit outside the enumeration is ENUM.
  for (const bad of ["sqft", "M2", "Ping", "坪"]) {
    assert.deepEqual(run(input({ areaUnit: bad })), {
      ok: false,
      error: { code: "ENUM", field: "areaUnit", row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run(input({ areaValue: "1234567890123" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "areaValue", row: null },
  });
  assert.deepEqual(run(input({ targetAch: "1234567890123" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetAch", row: null },
  });
  assert.deepEqual(run(input({ purifierCadrCfm: "1234567890123" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "purifierCadrCfm", row: null },
  });
  // A 13-unit unit string hits capacity before the ENUM check.
  assert.deepEqual(run(input({ areaUnit: "mmmmmmmmmmmmm" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "areaUnit", row: null },
  });
  // Twelve units including a lone surrogate: capacity passes, so
  // the Unicode check fires; thirteen units: capacity wins.
  assert.deepEqual(run(input({ areaValue: "12345678901\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "areaValue", row: null },
  });
  assert.deepEqual(run(input({ areaValue: "123456789012\uD800" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "areaValue", row: null },
  });
});

test("lone surrogates are UNICODE at or under the limit", () => {
  assert.deepEqual(run(input({ areaValue: "15\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "areaValue", row: null },
  });
  assert.deepEqual(run(input({ purifierCadrCfm: "20\uDC00" })), {
    ok: false,
    error: { code: "UNICODE", field: "purifierCadrCfm", row: null },
  });
});

test("field order: areaValue is validated before areaUnit, areaUnit before ceiling", () => {
  assert.deepEqual(run(input({ areaValue: "", targetAch: "12" })), {
    ok: false,
    error: { code: "EMPTY", field: "areaValue", row: null },
  });
  // areaValue "0" is RANGE even when the unit is also invalid: the
  // range uses the m^2 fallback when the unit cannot be trusted
  // (see the core header note and HANDOFF.md note 2).
  assert.deepEqual(run(input({ areaValue: "0", areaUnit: "bogus" })), {
    ok: false,
    error: { code: "RANGE", field: "areaValue", row: null },
  });
  assert.deepEqual(run(input({ areaValue: "15", areaUnit: "bogus" })), {
    ok: false,
    error: { code: "ENUM", field: "areaUnit", row: null },
  });
  assert.deepEqual(run(input({ areaUnit: "", ceilingHeightM: "1.0" })), {
    ok: false,
    error: { code: "EMPTY", field: "areaUnit", row: null },
  });
  assert.deepEqual(run(input({ ceilingHeightM: "1.0", targetAch: "12" })), {
    ok: false,
    error: { code: "RANGE", field: "ceilingHeightM", row: null },
  });
  assert.deepEqual(run(input({ targetAch: "12", purifierCadrCfm: "5" })), {
    ok: false,
    error: { code: "RANGE", field: "targetAch", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("15"), schema);
  assert.deepEqual(run({ areaValue: "15" }), schema);
  assert.deepEqual(run({ ...input({}), extra: "x" }), schema);
  assert.deepEqual(run({ ...input({}), areaValue: 15 }), schema);
  assert.deepEqual(run({ ...input({}), purifierCadrCfm: null }), schema);
  const withAccessor = { ...input({}) };
  Object.defineProperty(withAccessor, "areaValue", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/air-purifier.mjs", import.meta.url));
  const inputs = coreCases.map((entry) => entry.input);
  const script = `
    import { run } from ${JSON.stringify(pathToFileURL(corePath).href)};
    const inputs = ${JSON.stringify(inputs)};
    const outputs = inputs.map((input) => run(input));
    process.stdout.write(JSON.stringify(outputs));
  `;
  const expected = JSON.stringify(inputs.map((input) => run(input)));
  for (const tz of ["UTC", "Asia/Taipei", "America/New_York", "Pacific/Kiritimati"]) {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
    assert.equal(out, expected, `TZ=${tz}`);
  }
});
