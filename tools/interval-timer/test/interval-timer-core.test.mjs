// Core tests for the Interval Timer: every core fixture from
// test/fixtures.json is asserted verbatim against run(), plus
// hand-derived schema / boundary checks that the fixtures do not cover.
// Expected values come from the SPEC fixtures, never from the
// implementation's own output.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { run, validateInput, formatDuration, MAX_SEGMENTS, MAX_TOTAL_SECONDS } from "../public/js/core/interval-timer.mjs";

const fixtures = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fixtures.json"), "utf8"),
);
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

describe("run(): SPEC fixtures, verbatim", () => {
  for (const entry of coreCases) {
    it(entry.id, () => {
      assert.deepEqual(run(entry.input), entry.expected);
    });
  }
});

describe("run(): hand-derived schema and boundary checks", () => {
  const valid = {
    prepareSeconds: "10",
    workSeconds: "30",
    restSeconds: "10",
    rounds: "8",
    finalRest: "skip",
  };

  it("unknown field is SCHEMA", () => {
    assert.deepEqual(run({ ...valid, extra: "1" }), {
      ok: false,
      error: { code: "SCHEMA", field: null, row: null },
    });
  });

  it("missing field is SCHEMA", () => {
    const { rounds, ...rest } = valid;
    assert.deepEqual(run(rest), {
      ok: false,
      error: { code: "SCHEMA", field: null, row: null },
    });
  });

  it("non-string field is SCHEMA", () => {
    assert.deepEqual(run({ ...valid, rounds: 8 }), {
      ok: false,
      error: { code: "SCHEMA", field: null, row: null },
    });
  });

  it("accessor field is SCHEMA", () => {
    const input = { ...valid };
    Object.defineProperty(input, "rounds", { get: () => "8", enumerable: true });
    assert.deepEqual(run(input), {
      ok: false,
      error: { code: "SCHEMA", field: null, row: null },
    });
  });

  it("symbol key is SCHEMA", () => {
    const input = { ...valid, [Symbol("x")]: "1" };
    assert.deepEqual(run(input), {
      ok: false,
      error: { code: "SCHEMA", field: null, row: null },
    });
  });

  it("non-object input is SCHEMA", () => {
    for (const bad of [null, 42, "10", [], undefined]) {
      assert.deepEqual(run(bad), {
        ok: false,
        error: { code: "SCHEMA", field: null, row: null },
      });
    }
  });

  it("unpaired surrogate is UNICODE", () => {
    assert.deepEqual(run({ ...valid, workSeconds: "3\uD8000" }), {
      ok: false,
      error: { code: "UNICODE", field: "workSeconds", row: null },
    });
  });

  it("field order wins: prepare RANGE before work INPUT_LIMIT", () => {
    assert.deepEqual(
      run({ ...valid, prepareSeconds: "3601", workSeconds: "123456789" }),
      { ok: false, error: { code: "RANGE", field: "prepareSeconds", row: null } },
    );
  });

  it("finalRest empty is EMPTY, not ENUM", () => {
    assert.deepEqual(run({ ...valid, finalRest: "" }), {
      ok: false,
      error: { code: "EMPTY", field: "finalRest", row: null },
    });
  });

  it("finalRest is case-sensitive", () => {
    assert.deepEqual(run({ ...valid, finalRest: "Skip" }), {
      ok: false,
      error: { code: "ENUM", field: "finalRest", row: null },
    });
  });

  it("plus sign and whitespace are INTEGER_FORMAT", () => {
    for (const bad of ["+30", " 30", "30 ", "0x1e", "3e1"]) {
      assert.deepEqual(run({ ...valid, workSeconds: bad }), {
        ok: false,
        error: { code: "INTEGER_FORMAT", field: "workSeconds", row: null },
      });
    }
  });

  it("rounds lower bound is 1", () => {
    assert.deepEqual(run({ ...valid, rounds: "0" }), {
      ok: false,
      error: { code: "RANGE", field: "rounds", row: null },
    });
  });

  it("prepare and rest may be zero", () => {
    const outcome = run({ ...valid, prepareSeconds: "0", restSeconds: "0" });
    assert.equal(outcome.ok, true);
    assert.equal(outcome.result.segmentCount, 8);
    assert.equal(outcome.result.totalSeconds, 240);
  });

  it("maximum program hits the pinned ceilings", () => {
    const outcome = run({
      prepareSeconds: "3600",
      workSeconds: "3600",
      restSeconds: "3600",
      rounds: "99",
      finalRest: "include",
    });
    assert.equal(outcome.ok, true);
    assert.equal(outcome.result.segmentCount, MAX_SEGMENTS);
    assert.equal(outcome.result.totalSeconds, MAX_TOTAL_SECONDS);
    // Hand-derived: 3600 + 99*3600 + 99*3600 = 716400.
    assert.equal(outcome.result.totalSeconds, 3600 + 99 * 3600 + 99 * 3600);
  });

  it("validateInput returns parsed values without building segments", () => {
    assert.deepEqual(validateInput(valid), {
      ok: true,
      values: {
        prepareSeconds: 10,
        workSeconds: 30,
        restSeconds: 10,
        rounds: 8,
        finalRest: "skip",
      },
    });
  });
});

describe("formatDuration()", () => {
  it("renders M:SS below one hour and H:MM:SS at or above", () => {
    assert.equal(formatDuration(0), "0:00");
    assert.equal(formatDuration(65), "1:05");
    assert.equal(formatDuration(3599), "59:59");
    assert.equal(formatDuration(3600), "1:00:00");
    assert.equal(formatDuration(716400), "199:00:00");
  });
});
