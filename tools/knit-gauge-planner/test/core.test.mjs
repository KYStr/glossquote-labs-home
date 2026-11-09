// Tests for Knit Gauge Pattern Planner. Expected values come from
// docs/specs/knit-gauge-planner/fixtures.json and from hand-derived
// cases recomputed from the SPEC's rules — never from the
// implementation's own output. Run offline with: node --test

import { test } from "node:test";
import assert from "node:assert/strict";
import { solve, parseRawInteger, FIELD_DEFS } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";
import { stringsFor, fieldLabel, formatMm } from "../public/js/core/i18n.mjs";
import fixtures from "../../../docs/specs/knit-gauge-planner/fixtures.json" with {
  type: "json",
};

const VALID = {
  swatchStitches: 20,
  swatchWidthMm: 100,
  swatchRows: 24,
  swatchHeightMm: 120,
  targetWidthMm: 103,
  targetHeightMm: 52,
  edgeEach: 2,
  repeatStitches: 6,
  repeatRows: 4,
};

function withOverrides(overrides) {
  return { ...VALID, ...overrides };
}

// --- Literal SPEC fixtures -------------------------------------------------

for (const fixture of fixtures.cases.filter((c) => c.kind === "solve")) {
  test(`solve fixture ${fixture.id}`, () => {
    assert.deepEqual(solve(fixture.input), fixture.expected);
  });
}

function runFlowOps(flow, ops) {
  for (const op of ops) {
    if (op.type === "edit") flow.edit(op.draft);
    else if (op.type === "run") flow.run(op.runId);
    else if (op.type === "settle") flow.settle(op.runId);
    else if (op.type === "cancel") flow.cancel();
    else if (op.type === "reset") flow.reset();
    else throw new Error(`unknown flow op ${op.type}`);
  }
}

for (const fixture of fixtures.cases.filter((c) => c.kind === "flow")) {
  test(`flow fixture ${fixture.id}`, () => {
    const flow = createFlow();
    runFlowOps(flow, fixture.input);
    const { phase, result } = flow.snapshot();
    assert.deepEqual({ phase, result }, fixture.expected);
  });
}

// --- Raw form syntax (SPEC: ASCII decimal integers only) -------------------

test("parseRawInteger accepts plain integers", () => {
  assert.deepEqual(parseRawInteger("0"), { ok: true, value: 0 });
  assert.deepEqual(parseRawInteger("7"), { ok: true, value: 7 });
  assert.deepEqual(parseRawInteger("10000"), { ok: true, value: 10000 });
});

test("parseRawInteger rejects non-canonical forms", () => {
  for (const raw of [
    "",
    " ",
    " 12",
    "12 ",
    "012",
    "00",
    "-0",
    "-1",
    "+12",
    "1e3",
    "12.0",
    "１２",
    "1_000",
    "12a",
  ]) {
    assert.deepEqual(parseRawInteger(raw), { ok: false, code: "SYNTAX" }, raw);
  }
  assert.deepEqual(parseRawInteger(12), { ok: false, code: "SYNTAX" });
});

// --- Core type / range / shape / size --------------------------------------

test("solve rejects non-object input as TYPE at the root", () => {
  for (const bad of [null, [], "x", 42, true]) {
    assert.deepEqual(solve(bad), {
      status: "error",
      error: { code: "TYPE", path: "" },
    });
  }
});

test("solve rejects string, fractional and -0 values as TYPE", () => {
  assert.deepEqual(solve(withOverrides({ swatchStitches: "20" })), {
    status: "error",
    error: { code: "TYPE", path: "/swatchStitches" },
  });
  assert.deepEqual(solve(withOverrides({ targetWidthMm: 100.5 })), {
    status: "error",
    error: { code: "TYPE", path: "/targetWidthMm" },
  });
  assert.deepEqual(solve(withOverrides({ edgeEach: -0 })), {
    status: "error",
    error: { code: "TYPE", path: "/edgeEach" },
  });
  assert.deepEqual(solve(withOverrides({ repeatRows: null })), {
    status: "error",
    error: { code: "TYPE", path: "/repeatRows" },
  });
});

test("solve enforces every field range at its fixed path", () => {
  for (const field of FIELD_DEFS) {
    assert.deepEqual(
      solve(withOverrides({ [field.key]: field.min - 1 })),
      {
        status: "error",
        error: { code: "RANGE", path: `/${field.key}` },
      },
      `${field.key} below min`,
    );
    assert.deepEqual(
      solve(withOverrides({ [field.key]: field.max + 1 })),
      {
        status: "error",
        error: { code: "RANGE", path: `/${field.key}` },
      },
      `${field.key} above max`,
    );
    assert.equal(solve(withOverrides({ [field.key]: field.min })).status, "ok");
    assert.equal(solve(withOverrides({ [field.key]: field.max })).status, "ok");
  }
});

test("solve validates fields in SPEC table order", () => {
  // Two bad fields: the earlier table field wins.
  assert.deepEqual(
    solve(withOverrides({ swatchRows: 0, targetWidthMm: 0 })),
    {
      status: "error",
      error: { code: "RANGE", path: "/swatchRows" },
    },
  );
});

test("solve rejects an unknown key as SHAPE at the root", () => {
  assert.deepEqual(solve(withOverrides({ surprise: 1 })), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
});

test("solve rejects a missing key as SHAPE at that key path", () => {
  const { targetHeightMm, ...rest } = VALID;
  assert.deepEqual(solve(rest), {
    status: "error",
    error: { code: "SHAPE", path: "/targetHeightMm" },
  });
  // Two missing keys: the earlier table field wins.
  const { swatchWidthMm, swatchRows, ...rest2 } = VALID;
  assert.deepEqual(solve(rest2), {
    status: "error",
    error: { code: "SHAPE", path: "/swatchWidthMm" },
  });
});

test("solve enforces the 65,536-byte input cap before shape", () => {
  // {"pad":"<n x's>"} is 10 + n bytes; n = 65,526 is exactly the cap.
  const atCap = { pad: "x".repeat(65526) };
  assert.equal(Buffer.byteLength(JSON.stringify(atCap), "utf8"), 65536);
  assert.deepEqual(solve(atCap), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  const overCap = { pad: "x".repeat(65527) };
  assert.equal(Buffer.byteLength(JSON.stringify(overCap), "utf8"), 65537);
  assert.deepEqual(solve(overCap), {
    status: "error",
    error: { code: "SIZE", path: "" },
  });
});

// --- Algorithm: half-up tenths, ties, caps ---------------------------------

test("size tenths round half-up from the exact fraction", () => {
  // 134/40 = 3.35 mm -> 34 tenths (half-up, not banker's, not truncate).
  const up = solve(
    withOverrides({
      swatchStitches: 40,
      swatchWidthMm: 134,
      targetWidthMm: 3,
      edgeEach: 0,
      repeatStitches: 1,
      swatchRows: 10,
      swatchHeightMm: 10,
      targetHeightMm: 10,
      repeatRows: 1,
    }),
  );
  assert.equal(up.result.stitches.chosen.sizeTenthsMm, 34);
  assert.equal(up.result.stitches.lower, null);
  // 130/40 = 3.25 mm -> 33 tenths.
  const mid = solve(
    withOverrides({
      swatchStitches: 40,
      swatchWidthMm: 130,
      targetWidthMm: 3,
      edgeEach: 0,
      repeatStitches: 1,
      swatchRows: 10,
      swatchHeightMm: 10,
      targetHeightMm: 10,
      repeatRows: 1,
    }),
  );
  assert.equal(mid.result.stitches.chosen.sizeTenthsMm, 33);
  // 324/100 = 3.24 mm -> 32 tenths.
  const down = solve(
    withOverrides({
      swatchStitches: 100,
      swatchWidthMm: 324,
      targetWidthMm: 3,
      edgeEach: 0,
      repeatStitches: 1,
      swatchRows: 10,
      swatchHeightMm: 10,
      targetHeightMm: 10,
      repeatRows: 1,
    }),
  );
  assert.equal(down.result.stitches.chosen.sizeTenthsMm, 32);
});

test("chosen is the nearer side; an exact tie takes the larger count", () => {
  // 5 mm per stitch, candidates 10/16/22, target 101: diffs 51 vs 9.
  const nearer = solve(
    withOverrides({
      swatchStitches: 20,
      swatchWidthMm: 100,
      targetWidthMm: 101,
      edgeEach: 2,
      repeatStitches: 6,
    }),
  );
  assert.equal(nearer.result.stitches.chosen.count, 22);
  // Target 90: lower 16 (80, diff 10) vs upper 22 (110, diff 20).
  const lowerWins = solve(
    withOverrides({
      swatchStitches: 20,
      swatchWidthMm: 100,
      targetWidthMm: 90,
      edgeEach: 2,
      repeatStitches: 6,
    }),
  );
  assert.equal(lowerWins.result.stitches.chosen.count, 16);
});

test("width candidates always include both edge stitches", () => {
  // edgeEach 3, repeat 5: candidates 6+5k = 11, 16, 21, ...; the
  // minimum feasible count is 11, never 6 or 1.
  const result = solve(
    withOverrides({
      swatchStitches: 10,
      swatchWidthMm: 10,
      targetWidthMm: 5,
      edgeEach: 3,
      repeatStitches: 5,
      swatchRows: 10,
      swatchHeightMm: 10,
      targetHeightMm: 10,
      repeatRows: 1,
    }),
  );
  assert.equal(result.result.stitches.lower, null);
  assert.equal(result.result.stitches.upper.count, 11);
  assert.equal(result.result.stitches.chosen.count, 11);
});

test("solve does not mutate its input", () => {
  const input = withOverrides({});
  const frozen = Object.freeze({ ...input });
  assert.equal(solve(frozen).status, "ok");
  assert.deepEqual(frozen, input);
});

// --- Flow extras ------------------------------------------------------------

test("flow reset returns to empty and clears everything", () => {
  const flow = createFlow();
  flow.edit(VALID);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow fail enters error and a later edit returns to dirty", () => {
  const flow = createFlow();
  flow.fail({ code: "SYNTAX", path: "/swatchStitches" });
  assert.deepEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "SYNTAX", path: "/swatchStitches" },
  });
  flow.edit(VALID);
  assert.deepEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow ignores a resubmit while busy", () => {
  const flow = createFlow();
  flow.edit(VALID);
  flow.run(1);
  flow.run(2); // ignored: run 1 stays active
  flow.settle(2); // ignored: wrong runId
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
});

test("flow ignores a stale error reply", () => {
  const flow = createFlow();
  flow.edit(VALID);
  flow.run(1);
  flow.cancel();
  flow.edit({ ...VALID, targetWidthMm: 100 });
  flow.run(2);
  flow.settleWith(1, {
    status: "error",
    error: { code: "RANGE", path: "/swatchStitches" },
  });
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "ready");
});

test("flow cancel while not busy is a no-op", () => {
  const flow = createFlow();
  flow.edit(VALID);
  flow.cancel();
  assert.deepEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow run with no draft is a no-op", () => {
  const flow = createFlow();
  flow.run(1);
  assert.equal(flow.snapshot().phase, "empty");
});

// --- i18n -------------------------------------------------------------------

test("i18n has both languages for every field and key strings", () => {
  for (const lang of ["zh-Hant", "en"]) {
    const strings = stringsFor(lang);
    assert.equal(typeof strings.submit, "string");
    assert.ok(strings.submit.length > 0);
    assert.equal(typeof strings.statusReady, "string");
    for (const code of ["SYNTAX", "TYPE", "RANGE", "SHAPE", "SIZE"]) {
      assert.equal(typeof strings.errors[code], "string");
    }
    for (const key of FIELD_DEFS.map((f) => f.key)) {
      const label = fieldLabel(lang, key);
      assert.equal(typeof label, "string");
      assert.ok(label.length > 0, `${lang} ${key}`);
    }
  }
  assert.equal(stringsFor("zh-Hant").submit, "找出可行針數與行數");
  assert.equal(stringsFor("en").submit, "Find stitch and row counts");
});

test("formatMm formats computed tenths with one decimal", () => {
  assert.equal(formatMm(33, "zh-Hant"), "3.3");
  assert.equal(formatMm(105, "en"), "10.5");
  assert.equal(formatMm(1000, "en"), "100.0");
});
