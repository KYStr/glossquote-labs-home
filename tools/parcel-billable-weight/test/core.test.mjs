// Tests for Parcel Billable Weight core (solve + flow).
// All expected values are derived independently from SPEC.md and
// fixtures.json — never generated from the implementation's output.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { solve, volumeTenths } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../../../docs/specs/parcel-billable-weight/fixtures.json", import.meta.url),
    "utf8",
  ),
);

function validInput() {
  return {
    parcels: [{ name: "P", sidesMm: [300, 200, 100], actualG: 1000 }],
    services: [
      {
        name: "A",
        divisor: 5000,
        stepG: 500,
        minG: 0,
        maxLengthMm: null,
        maxWrapMm: null,
        maxActualG: null,
      },
    ],
  };
}

function errorCase(input, code, path) {
  assert.deepStrictEqual(solve(input), {
    status: "error",
    error: { code, path },
  });
}

// ---- literal SPEC fixtures ----------------------------------------------

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "solve") continue;
  test(`fixture ${fixture.id}`, () => {
    assert.deepStrictEqual(solve(fixture.input), fixture.expected);
  });
}

// ---- flow fixture driver -------------------------------------------------

function runFlowSteps(flow, steps) {
  for (const step of steps) {
    if (step.type === "edit") flow.edit(step.draft);
    else if (step.type === "run") flow.run(step.runId);
    else if (step.type === "settle") flow.settle(step.runId);
    else if (step.type === "settleWith") flow.settleWith(step.runId, step.reply);
    else if (step.type === "cancel") flow.cancel();
    else if (step.type === "reset") flow.reset();
    else if (step.type === "fail") flow.fail(step.error);
    else throw new Error(`unknown step type: ${step.type}`);
  }
  const { phase, result } = flow.snapshot();
  return { phase, result };
}

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "flow") continue;
  test(`fixture ${fixture.id}`, () => {
    const flow = createFlow();
    assert.deepStrictEqual(runFlowSteps(flow, fixture.input), fixture.expected);
  });
}

// ---- SIZE boundary --------------------------------------------------------

test("SIZE: exactly 65,536 bytes passes the size check (then SHAPE)", () => {
  const baseText = JSON.stringify(validInput());
  const prefix = `${baseText.slice(0, -1)},"pad":"`;
  const suffix = '"}';
  const n = 65536 - prefix.length - suffix.length;
  const input = JSON.parse(`${prefix}${"x".repeat(n)}${suffix}`);
  errorCase(input, "SHAPE", "");
});

test("SIZE: 65,537 bytes is rejected", () => {
  const baseText = JSON.stringify(validInput());
  const prefix = `${baseText.slice(0, -1)},"pad":"`;
  const suffix = '"}';
  const n = 65537 - prefix.length - suffix.length;
  const input = JSON.parse(`${prefix}${"x".repeat(n)}${suffix}`);
  errorCase(input, "SIZE", "");
});

// ---- shape / type / range fixed paths --------------------------------------

test("root must be an object", () => {
  errorCase(null, "TYPE", "");
  errorCase([], "TYPE", "");
  errorCase("x", "TYPE", "");
});

test("unknown root key reports SHAPE at the root", () => {
  const input = validInput();
  input.extra = 1;
  errorCase(input, "SHAPE", "");
});

test("missing root key reports SHAPE at that key", () => {
  const input = validInput();
  delete input.services;
  errorCase(input, "SHAPE", "/services");
});

test("parcels must be an array of 1-12", () => {
  const input = validInput();
  input.parcels = "P";
  errorCase(input, "TYPE", "/parcels");
  input.parcels = [];
  errorCase(input, "RANGE", "/parcels");
  input.parcels = Array.from({ length: 13 }, (_, i) => ({
    name: `P${i}`,
    sidesMm: [100, 100, 100],
    actualG: 100,
  }));
  errorCase(input, "RANGE", "/parcels");
});

test("parcel row shape: unknown and missing keys", () => {
  const input = validInput();
  input.parcels[0].extra = 1;
  errorCase(input, "SHAPE", "/parcels/0");
  const input2 = validInput();
  delete input2.parcels[0].actualG;
  errorCase(input2, "SHAPE", "/parcels/0/actualG");
});

test("sidesMm must be an array of exactly 3", () => {
  const input = validInput();
  input.parcels[0].sidesMm = 300;
  errorCase(input, "TYPE", "/parcels/0/sidesMm");
  input.parcels[0].sidesMm = [300, 200];
  errorCase(input, "RANGE", "/parcels/0/sidesMm");
  input.parcels[0].sidesMm = [300, 200, 100, 50];
  errorCase(input, "RANGE", "/parcels/0/sidesMm");
});

test("side bounds and types", () => {
  const cases = [
    [0, "RANGE"],
    [3001, "RANGE"],
    ["100", "TYPE"],
    [100.5, "TYPE"],
    [true, "TYPE"],
    [null, "TYPE"],
  ];
  for (const [value, code] of cases) {
    const input = validInput();
    input.parcels[0].sidesMm = [value, 200, 100];
    errorCase(input, code, "/parcels/0/sidesMm/0");
  }
  const input = validInput();
  input.parcels[0].sidesMm = [-0, 200, 100];
  errorCase(input, "TYPE", "/parcels/0/sidesMm/0");
});

test("actualG bounds and types", () => {
  const input = validInput();
  input.parcels[0].actualG = 0;
  errorCase(input, "RANGE", "/parcels/0/actualG");
  input.parcels[0].actualG = 100001;
  errorCase(input, "RANGE", "/parcels/0/actualG");
  input.parcels[0].actualG = "1000";
  errorCase(input, "TYPE", "/parcels/0/actualG");
});

test("services must be an array of 1-4", () => {
  const input = validInput();
  input.services = [];
  errorCase(input, "RANGE", "/services");
  input.services = Array.from({ length: 5 }, (_, i) => ({
    name: `S${i}`,
    divisor: 5000,
    stepG: 100,
    minG: 0,
    maxLengthMm: null,
    maxWrapMm: null,
    maxActualG: null,
  }));
  errorCase(input, "RANGE", "/services");
});

test("service row shape: unknown and missing keys", () => {
  const input = validInput();
  input.services[0].extra = 1;
  errorCase(input, "SHAPE", "/services/0");
  const input2 = validInput();
  delete input2.services[0].minG;
  errorCase(input2, "SHAPE", "/services/0/minG");
});

test("service field bounds and types", () => {
  const fieldCases = [
    ["divisor", 0, "RANGE"],
    ["divisor", 100001, "RANGE"],
    ["divisor", "5000", "TYPE"],
    ["stepG", 0, "RANGE"],
    ["stepG", 100001, "RANGE"],
    ["minG", -1, "RANGE"],
    ["minG", 100001, "RANGE"],
    ["maxLengthMm", 0, "RANGE"],
    ["maxLengthMm", 3001, "RANGE"],
    ["maxWrapMm", 0, "RANGE"],
    ["maxWrapMm", 15001, "RANGE"],
    ["maxActualG", 0, "RANGE"],
    ["maxActualG", 100001, "RANGE"],
    ["maxActualG", "x", "TYPE"],
  ];
  for (const [field, value, code] of fieldCases) {
    const input = validInput();
    input.services[0][field] = value;
    errorCase(input, code, `/services/0/${field}`);
  }
  // -0 is rejected as a type error by the core.
  const input = validInput();
  input.services[0].divisor = -0;
  errorCase(input, "TYPE", "/services/0/divisor");
});

// ---- names -----------------------------------------------------------------

test("name rules: empty, too long, bad first/rest characters", () => {
  const bad = ["", "a".repeat(25), "-A", "A/B", "<script>", "A<b", "A\tB"];
  for (const name of bad) {
    const input = validInput();
    input.parcels[0].name = name;
    errorCase(input, "RANGE", "/parcels/0/name");
  }
  const good = ["P", "1A", "A B", "A-1_b", "包裹一"];
  for (const name of good) {
    const input = validInput();
    input.parcels[0].name = name;
    assert.equal(solve(input).status, "ok", `name ${JSON.stringify(name)}`);
  }
  const input = validInput();
  input.parcels[0].name = 42;
  errorCase(input, "TYPE", "/parcels/0/name");
});

test("duplicate names point at the second occurrence", () => {
  const input = validInput();
  input.parcels.push({ name: "P", sidesMm: [100, 100, 100], actualG: 100 });
  errorCase(input, "DUPLICATE", "/parcels/1/name");
  const input2 = validInput();
  input2.services.push({
    name: "A",
    divisor: 5000,
    stepG: 100,
    minG: 0,
    maxLengthMm: null,
    maxWrapMm: null,
    maxActualG: null,
  });
  errorCase(input2, "DUPLICATE", "/services/1/name");
});

test("duplicate detection uses the normalized name (NFC, trim, case-sensitive)", () => {
  // U+00E9 (composed) and U+0065 U+0301 (decomposed) normalize to the same name.
  const input = validInput();
  input.parcels[0].name = "\u00e9";
  input.parcels.push({
    name: "e\u0301",
    sidesMm: [100, 100, 100],
    actualG: 100,
  });
  errorCase(input, "DUPLICATE", "/parcels/1/name");

  // The output carries the normalized name.
  const input2 = validInput();
  input2.parcels[0].name = "e\u0301";
  const out2 = solve(input2);
  assert.equal(out2.status, "ok");
  assert.equal(out2.result.services[0].pieces[0].name, "\u00e9");

  const input3 = validInput();
  input3.parcels[0].name = "P";
  input3.parcels.push({
    name: " P ",
    sidesMm: [100, 100, 100],
    actualG: 100,
  });
  errorCase(input3, "DUPLICATE", "/parcels/1/name");

  // Case differs: not a duplicate.
  const input4 = validInput();
  input4.parcels.push({ name: "p", sidesMm: [100, 100, 100], actualG: 100 });
  assert.equal(solve(input4).status, "ok");
});

test("cross-field duplicates run after all field errors", () => {
  const input = validInput();
  input.parcels.push({ name: "P", sidesMm: [100, 100, 100], actualG: 100 });
  input.services[0].divisor = 0;
  errorCase(input, "RANGE", "/services/0/divisor");
});

// ---- algorithm ---------------------------------------------------------------

test("side order does not change the result", () => {
  const a = validInput();
  const b = validInput();
  b.parcels[0].sidesMm = [100, 300, 200];
  assert.deepStrictEqual(solve(a), solve(b));
});

test("volumeTenths is half-up on exact integers", () => {
  assert.equal(volumeTenths(3, 2), 15); // 1.5 g
  assert.equal(volumeTenths(1, 3), 3); // 0.333... -> 0.3
  assert.equal(volumeTenths(2, 3), 7); // 0.666... -> 0.7
  assert.equal(volumeTenths(1, 8), 1); // 0.125 -> 0.1
  assert.equal(volumeTenths(3, 8), 4); // 0.375 -> 0.4
  assert.equal(volumeTenths(1000000, 5000), 2000); // 200.0 g
  assert.equal(volumeTenths(6000000, 5000), 12000); // 1200.0 g
});

test("maximum volume is exact (27,000,000,000 mm^3)", () => {
  const input = {
    parcels: [{ name: "Big", sidesMm: [3000, 3000, 3000], actualG: 1 }],
    services: [
      {
        name: "A",
        divisor: 1,
        stepG: 1,
        minG: 0,
        maxLengthMm: null,
        maxWrapMm: null,
        maxActualG: null,
      },
    ],
  };
  const out = solve(input);
  assert.equal(out.status, "ok");
  assert.equal(out.result.services[0].pieces[0].volumeNumerator, 27000000000);
  assert.equal(out.result.services[0].pieces[0].chargeG, 27000000000);
  assert.equal(out.result.services[0].totalChargeG, 27000000000);
});

test("maximum combination count: 12 parcels x 4 services", () => {
  const parcels = Array.from({ length: 12 }, (_, i) => ({
    name: `P${i}`,
    sidesMm: [100, 100, 100],
    actualG: 1000,
  }));
  const services = Array.from({ length: 4 }, (_, i) => ({
    name: `S${i}`,
    divisor: 5000,
    stepG: 100,
    minG: 0,
    maxLengthMm: null,
    maxWrapMm: null,
    maxActualG: null,
  }));
  const out = solve({ parcels, services });
  assert.equal(out.status, "ok");
  assert.equal(out.result.services.length, 4);
  for (const service of out.result.services) {
    assert.equal(service.pieces.length, 12);
    assert.equal(service.totalChargeG, 12000);
    for (const piece of service.pieces) {
      assert.equal(piece.chargeG, 1000);
      assert.equal(piece.volumeNumerator, 1000000);
      assert.equal(piece.wrapMm, 500);
    }
  }
});

test("minimum weight that is an exact step stays", () => {
  const input = validInput();
  input.parcels[0].sidesMm = [100, 100, 100];
  input.parcels[0].actualG = 1;
  input.services[0].minG = 500;
  input.services[0].stepG = 500;
  const out = solve(input);
  assert.equal(out.result.services[0].pieces[0].chargeG, 500);
});

test("charge rounds up to the next step when not exact", () => {
  const input = validInput();
  input.parcels[0].sidesMm = [100, 100, 100];
  input.parcels[0].actualG = 1001;
  input.services[0].stepG = 500;
  const out = solve(input);
  assert.equal(out.result.services[0].pieces[0].chargeG, 1500);
});

test("fractional volume above actual weight rounds up by the step", () => {
  const input = {
    parcels: [{ name: "P", sidesMm: [1, 1, 7], actualG: 1 }],
    services: [
      {
        name: "A",
        divisor: 2,
        stepG: 3,
        minG: 0,
        maxLengthMm: null,
        maxWrapMm: null,
        maxActualG: null,
      },
    ],
  };
  const out = solve(input);
  // Volume 7/2 = 3.5 g beats actual 1 g; ceil(7/6) * 3 = 6.
  assert.equal(out.result.services[0].pieces[0].chargeG, 6);
});

test("a service with any over-limit piece has a null total", () => {
  const input = validInput();
  input.parcels.push({ name: "Q", sidesMm: [100, 100, 100], actualG: 100 });
  input.services[0].maxActualG = 500;
  const out = solve(input);
  assert.equal(out.result.services[0].totalChargeG, null);
  assert.equal(out.result.services[0].pieces[0].chargeG, null);
  assert.deepStrictEqual(out.result.services[0].pieces[0].reasons, ["MASS"]);
  assert.equal(out.result.services[0].pieces[1].chargeG, 500); // volume 200 g, ceil to one 500 g step
});

test("solve does not mutate its input", () => {
  const input = validInput();
  const before = JSON.stringify(input);
  assert.equal(solve(input).status, "ok");
  assert.equal(JSON.stringify(input), before);
});

// ---- flow extras ---------------------------------------------------------------

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  flow.edit(validInput());
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: fail keeps the draft and a later edit returns to dirty", () => {
  const flow = createFlow();
  flow.edit(validInput());
  flow.fail({ code: "RANGE", path: "/parcels/0/name" });
  assert.equal(flow.snapshot().phase, "error");
  flow.edit(validInput());
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow: run while busy is ignored; only the first run settles", () => {
  const flow = createFlow();
  flow.edit(validInput());
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.services[0].totalChargeG, 1500);
});

test("flow: a stale error reply cannot overwrite a newer ready state", () => {
  const flow = createFlow();
  flow.edit(validInput());
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.settleWith(1, { status: "error", error: { code: "RANGE", path: "" } });
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.services[0].totalChargeG, 1500);
});

test("flow: a core error reply settles as error", () => {
  const flow = createFlow();
  const bad = validInput();
  bad.services[0].divisor = 0;
  flow.edit(bad);
  flow.run(1);
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "RANGE", path: "/services/0/divisor" },
  });
});

test("flow: cancel while idle is a no-op", () => {
  const flow = createFlow();
  flow.cancel();
  assert.equal(flow.snapshot().phase, "empty");
  flow.edit(validInput());
  flow.cancel();
  assert.equal(flow.snapshot().phase, "dirty");
});

test("flow: sample draft settles to the two-services result", () => {
  const fixture = fixtures.cases.find(
    (c) => c.id === "parcel-billable-weight.two-services",
  );
  const flow = createFlow();
  flow.edit(fixture.input);
  flow.run(1);
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot(), {
    phase: "ready",
    result: fixture.expected.result,
    error: null,
  });
});
