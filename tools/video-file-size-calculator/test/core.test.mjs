// Core tests for the Video File Size Calculator.
// Expectations are FIXTURE LITERALS from the fixed specification
// candidate: spec task labs-video-file-size-calculator-spec-20261109,
// candidate commit 4bf07b24a0342fa9a77ff899488aa862ddbf9a5d, vendored
// verbatim at test/fixtures.json. Expectations were never copied from
// any implementation's output. The additional endpoint/property cases
// below the fixture blocks were derived by hand from the SPEC's stated
// rules with independent exact (BigInt/rational) arithmetic before the
// implementation existed.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULTS,
  EXAMPLE,
  buildReport,
  run,
} from "../public/js/core/video-size.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const cases = new Map(fixtures.cases.map((entry) => [entry.id, entry]));
const literalCases = fixtures.cases.filter((entry) => entry.kind === "core");

test("the vendored fixtures file is the fixed spec candidate's file", () => {
  assert.equal(fixtures.slug, "video-file-size-calculator");
  assert.equal(fixtures.specId, "spec-video-file-size-calculator-20261109");
  assert.equal(fixtures.cases.length, 13);
  assert.equal(literalCases.length, 10);
});

test("vendored spec fixtures: every literal case matches its hand-written expectation", () => {
  assert.equal(literalCases.length, 10);
  for (const entry of literalCases) {
    assert.deepEqual(run(entry.input), entry.expected, entry.id);
  }
});

test("worked example input equals fixtures case 1 input and the defaults object", () => {
  assert.deepEqual(cases.get("preset-1080p30-basic").input, EXAMPLE);
  assert.deepEqual(EXAMPLE, DEFAULTS);
  assert.deepEqual(run(EXAMPLE), cases.get("preset-1080p30-basic").expected);
});

test("max duration endpoint: 999:59:59 at 1080p30 + 192 kbps (hand-derived)", () => {
  assert.deepEqual(
    run({
      mode: "size",
      duration: "999:59:59",
      bitrateSource: "preset",
      preset: "1080p30",
      customBitrateMbps: "10",
      codec: "h264",
      audioKbps: "192",
      targetSize: "64",
      targetUnit: "GiB",
    }),
    {
      ok: true,
      result: {
        mode: "size",
        durationSec: 3599999,
        durationText: "999:59:59",
        videoBps: 8000000,
        audioBps: 192000,
        totalBps: 8192000,
        bytes: 3686398976000,
        sizeMB: "3686398.98",
        sizeGB: "3686.40",
        sizeMiB: "3515624.02",
        sizeGiB: "3433.23",
      },
    },
  );
});

test("custom range endpoints: 0.1 Mbps and 1000 Mbps x ProRes (hand-derived)", () => {
  assert.deepEqual(
    run({
      mode: "size",
      duration: "0:00:01",
      bitrateSource: "custom",
      preset: "1080p30",
      customBitrateMbps: "0.1",
      codec: "h264",
      audioKbps: "0",
      targetSize: "64",
      targetUnit: "GiB",
    }),
    {
      ok: true,
      result: {
        mode: "size",
        durationSec: 1,
        durationText: "0:00:01",
        videoBps: 100000,
        audioBps: 0,
        totalBps: 100000,
        bytes: 12500,
        sizeMB: "0.01",
        sizeGB: "0.00",
        sizeMiB: "0.01",
        sizeGiB: "0.00",
      },
    },
  );
  assert.deepEqual(
    run({
      mode: "size",
      duration: "0:00:02",
      bitrateSource: "custom",
      preset: "1080p30",
      customBitrateMbps: "1000",
      codec: "prores422",
      audioKbps: "320",
      targetSize: "64",
      targetUnit: "GiB",
    }),
    {
      ok: true,
      result: {
        mode: "size",
        durationSec: 2,
        durationText: "0:00:02",
        videoBps: 15000000000,
        audioBps: 320000,
        totalBps: 15000320000,
        bytes: 3750080000,
        sizeMB: "3750.08",
        sizeGB: "3.75",
        sizeMiB: "3576.35",
        sizeGiB: "3.49",
      },
    },
  );
});

test("near-max target: 9007199.25 GB fits exactly; 9007199.26 GB is RANGE (hand-derived)", () => {
  const base = {
    mode: "duration",
    duration: "0:10:00",
    bitrateSource: "preset",
    preset: "480p30",
    customBitrateMbps: "10",
    codec: "h264",
    audioKbps: "0",
    targetUnit: "GB",
  };
  assert.deepEqual(run({ ...base, targetSize: "9007199.25" }), {
    ok: true,
    result: {
      mode: "duration",
      targetBytes: 9007199250000000,
      videoBps: 2500000,
      audioBps: 0,
      totalBps: 2500000,
      maxDurationSec: 28823037600,
      maxDurationText: "8006399:20:00",
      usedBytes: 9007199250000000,
      headroomBytes: 0,
    },
  });
  assert.deepEqual(run({ ...base, targetSize: "9007199.26" }), {
    ok: false,
    error: { code: "RANGE", field: "targetSize", row: null },
  });
});

test("tiny target yields a valid zero-second duration (hand-derived)", () => {
  assert.deepEqual(
    run({
      mode: "duration",
      duration: "0:10:00",
      bitrateSource: "preset",
      preset: "2160p60",
      customBitrateMbps: "10",
      codec: "h264",
      audioKbps: "320",
      targetSize: "0.01",
      targetUnit: "MB",
    }),
    {
      ok: true,
      result: {
        mode: "duration",
        targetBytes: 10000,
        videoBps: 45000000,
        audioBps: 320000,
        totalBps: 45320000,
        maxDurationSec: 0,
        maxDurationText: "0:00:00",
        usedBytes: 0,
        headroomBytes: 10000,
      },
    },
  );
});

test("fractional target 8.5 GiB with H.265 at 720p30 (hand-derived)", () => {
  assert.deepEqual(
    run({
      mode: "duration",
      duration: "0:10:00",
      bitrateSource: "preset",
      preset: "720p30",
      customBitrateMbps: "10",
      codec: "h265",
      audioKbps: "128",
      targetSize: "8.5",
      targetUnit: "GiB",
    }),
    {
      ok: true,
      result: {
        mode: "duration",
        targetBytes: 9126805504,
        videoBps: 2750000,
        audioBps: 128000,
        totalBps: 2878000,
        maxDurationSec: 25369,
        maxDurationText: "7:02:49",
        usedBytes: 9126497750,
        headroomBytes: 307754,
      },
    },
  );
});

test("floor property: maxDurationSec fits the exact target, one more second exceeds it", () => {
  // The exact target in bytes is re-derived here from the SPEC's rule
  // (decimal hundredths x unit bytes), not from the implementation.
  const UNIT = { MB: 1000000n, GB: 1000000000n, MiB: 1048576n, GiB: 1073741824n };
  const exactTarget = (input) => {
    const [whole, fraction = ""] = input.targetSize.split(".");
    const hundredths =
      BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2) || "0");
    return { numerator: hundredths * UNIT[input.targetUnit], denominator: 100n };
  };
  const durationRuns = [
    cases.get("inverse-card-64gib").input,
    {
      mode: "duration",
      duration: "0:10:00",
      bitrateSource: "preset",
      preset: "2160p60",
      customBitrateMbps: "10",
      codec: "prores422",
      audioKbps: "256",
      targetSize: "128",
      targetUnit: "GiB",
    },
    {
      mode: "duration",
      duration: "0:10:00",
      bitrateSource: "custom",
      preset: "1080p30",
      customBitrateMbps: "3.33",
      codec: "h265",
      audioKbps: "128",
      targetSize: "700",
      targetUnit: "MB",
    },
  ];
  for (const input of durationRuns) {
    const outcome = run(input);
    assert.equal(outcome.ok, true);
    const { totalBps, maxDurationSec, targetBytes, usedBytes, headroomBytes } = outcome.result;
    const exact = exactTarget(input);
    // floor: totalBps * maxSec <= exactTarget * 8 < totalBps * (maxSec+1)
    assert.ok(
      BigInt(totalBps) * BigInt(maxDurationSec) * exact.denominator <=
        exact.numerator * 8n,
    );
    assert.ok(
      exact.numerator * 8n <
        BigInt(totalBps) * BigInt(maxDurationSec + 1) * exact.denominator,
    );
    assert.ok(usedBytes <= targetBytes);
    assert.equal(headroomBytes, targetBytes - usedBytes);
    assert.ok(headroomBytes >= 0);
  }
});

test("inactive fields only receive schema/capacity/unicode checks", () => {
  // mode=duration: duration is inactive, grammar-invalid text passes.
  assert.equal(
    run({ ...DEFAULTS, mode: "duration", duration: "garbage!!" }).ok,
    true,
  );
  // bitrateSource=custom: preset is inactive, a non-code string passes.
  assert.equal(
    run({ ...DEFAULTS, bitrateSource: "custom", preset: "4320p30" }).ok,
    true,
  );
  // bitrateSource=preset: customBitrateMbps is inactive, garbage passes.
  assert.equal(run({ ...DEFAULTS, customBitrateMbps: "abc" }).ok, true);
  // mode=size: target fields are inactive, garbage passes.
  assert.equal(run({ ...DEFAULTS, targetSize: "abc", targetUnit: "XB" }).ok, true);
  // ...but capacity and unicode still apply to inactive fields.
  assert.deepEqual(
    run({ ...DEFAULTS, mode: "duration", duration: "0:10:00:00" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "duration", row: null } },
  );
  assert.deepEqual(run({ ...DEFAULTS, targetSize: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "targetSize", row: null },
  });
});

test("duration grammar and range errors", () => {
  const size = { ...DEFAULTS };
  // "1000:00:00" is 10 UTF-16 code units: the raw capacity check fires
  // before the grammar check, per the SPEC's pinned per-field order.
  assert.deepEqual(run({ ...size, duration: "1000:00:00" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "duration", row: null },
  });
  assert.deepEqual(run({ ...size, duration: "0:60:00" }), {
    ok: false,
    error: { code: "DURATION_FORMAT", field: "duration", row: null },
  });
  assert.deepEqual(run({ ...size, duration: "10:00" }), {
    ok: false,
    error: { code: "DURATION_FORMAT", field: "duration", row: null },
  });
  assert.deepEqual(run({ ...size, duration: "0:00:00" }), {
    ok: false,
    error: { code: "RANGE", field: "duration", row: null },
  });
  assert.deepEqual(run({ ...size, duration: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "duration", row: null },
  });
});

test("decimal grammar and custom range errors", () => {
  const custom = { ...DEFAULTS, bitrateSource: "custom" };
  for (const bad of [".5", "1.234", "10.", " 10", "1e3", ""]) {
    const expected =
      bad === ""
        ? { code: "EMPTY", field: "customBitrateMbps", row: null }
        : { code: "DECIMAL_FORMAT", field: "customBitrateMbps", row: null };
    assert.deepEqual(run({ ...custom, customBitrateMbps: bad }), { ok: false, error: expected }, bad);
  }
  for (const out of ["0", "0.05", "0.09", "1000.01", "1001"]) {
    assert.deepEqual(
      run({ ...custom, customBitrateMbps: out }),
      { ok: false, error: { code: "RANGE", field: "customBitrateMbps", row: null } },
      out,
    );
  }
  // Capacity is checked before grammar/range: "10000.01" is 8 units and
  // reaches RANGE, while a 9-unit value is INPUT_LIMIT first.
  assert.deepEqual(run({ ...custom, customBitrateMbps: "10000.01" }), {
    ok: false,
    error: { code: "RANGE", field: "customBitrateMbps", row: null },
  });
  assert.deepEqual(run({ ...custom, customBitrateMbps: "100000.01" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "customBitrateMbps", row: null },
  });
});

test("enum and empty errors on the always-active fields", () => {
  assert.deepEqual(run({ ...DEFAULTS, mode: "SIZE" }), {
    ok: false,
    error: { code: "ENUM", field: "mode", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "mode", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, bitrateSource: "auto" }), {
    ok: false,
    error: { code: "ENUM", field: "bitrateSource", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, codec: "vp9" }), {
    ok: false,
    error: { code: "ENUM", field: "codec", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, audioKbps: "96" }), {
    ok: false,
    error: { code: "ENUM", field: "audioKbps", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, audioKbps: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "audioKbps", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, preset: "4320p30" }), {
    ok: false,
    error: { code: "ENUM", field: "preset", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "duration", targetUnit: "TB" }), {
    ok: false,
    error: { code: "ENUM", field: "targetUnit", row: null },
  });
});

test("schema errors: shape, types, unknown and missing fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run(undefined), schema);
  assert.deepEqual(run("size"), schema);
  assert.deepEqual(run([1, 2, 3]), schema);
  assert.deepEqual(run({ ...DEFAULTS, duration: 600 }), schema);
  const missing = { ...DEFAULTS };
  delete missing.codec;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...DEFAULTS, extra: "x" }), schema);
  let getterCalled = false;
  const withGetter = { ...DEFAULTS };
  Object.defineProperty(withGetter, "duration", {
    enumerable: true,
    get() {
      getterCalled = true;
      return "0:10:00";
    },
  });
  assert.deepEqual(run(withGetter), schema);
  assert.equal(getterCalled, false);
});

test("validation order: field order first, then capacity before unicode before grammar", () => {
  // mode beats duration (INPUT_LIMIT on duration does not preempt).
  assert.deepEqual(run({ ...DEFAULTS, mode: "XX", duration: "0:10:00:00" }), {
    ok: false,
    error: { code: "ENUM", field: "mode", row: null },
  });
  // duration beats bitrateSource.
  assert.deepEqual(run({ ...DEFAULTS, duration: "0:00:00", bitrateSource: "auto" }), {
    ok: false,
    error: { code: "RANGE", field: "duration", row: null },
  });
  // Within duration: capacity before unicode before grammar.
  assert.deepEqual(run({ ...DEFAULTS, duration: "0:10:00:0\uD800" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "duration", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, duration: "0:1\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "duration", row: null },
  });
  // preset beats customBitrateMbps even when the source is custom:
  // an over-capacity preset is INPUT_LIMIT before the custom checks.
  assert.deepEqual(
    run({ ...DEFAULTS, bitrateSource: "custom", preset: "2160p6000", customBitrateMbps: "abc" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "preset", row: null } },
  );
});

test("capacity limits are UTF-16 code units on every field", () => {
  assert.deepEqual(run({ ...DEFAULTS, mode: "sizeXXXXX" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "mode", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, codec: "prores422HQ" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "codec", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, audioKbps: "1920" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "audioKbps", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "duration", targetUnit: "GiBB" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetUnit", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "duration", targetSize: "9999999999.99" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetSize", row: null },
  });
});

test("report: fixed filename, sorted keys, compact JSON, one trailing LF", () => {
  const outcome = run(cases.get("preset-1080p30-basic").input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "video-file-size-report.json");
  // Hand-written literal: keys sorted by UTF-16 code units.
  assert.equal(
    report.text,
    '{"audioBps":192000,"bytes":614400000,"durationSec":600,"durationText":"0:10:00","mode":"size","sizeGB":"0.61","sizeGiB":"0.57","sizeMB":"614.40","sizeMiB":"585.94","totalBps":8192000,"videoBps":8000000}\n',
  );
  assert.equal(report.byteLength, Buffer.byteLength(report.text, "utf8"));
});

test("report: serializer never calls an input's toJSON and rejects non-plain data", () => {
  let called = false;
  const hostile = {
    toJSON() {
      called = true;
      return { mode: "size" };
    },
  };
  const report = buildReport(hostile);
  assert.equal(called, false);
  assert.equal(report.ok, false);
  assert.deepEqual(report.error, { code: "INTERNAL", field: null, row: null });
  // Non-safe-integer numbers and functions are not plain result data.
  assert.equal(buildReport({ mode: "size", bytes: 1.5 }).ok, false);
  assert.equal(buildReport({ mode: "size", fn: () => 1 }).ok, false);
  assert.equal(buildReport(null).ok, false);
});

test("report: nested plain data serializes with recursively sorted keys", () => {
  const report = buildReport({ z: 1, a: { d: [3, 1], b: "x" } });
  assert.equal(report.ok, true);
  assert.equal(report.text, '{"a":{"b":"x","d":[3,1]},"z":1}\n');
});
