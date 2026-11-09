// Pure core for Knit Gauge Pattern Planner (SPEC.md inputsOutputs +
// implementation). No DOM / network / storage access. Directly
// importable by node --test.
//
// solve(data) validates the exact key set in the SPEC's table order,
// then compares, per axis, the feasible counts nearest the target on
// each side using exact integer cross-multiplication. Width candidates
// are 2*edgeEach + k*repeatStitches, height candidates k*repeatRows,
// k a positive integer, every count <= 10,000. Estimated size is
// count * swatchMm / swatchCount; display tenths are half-up via
// floor((20*n + d) / (2*d)) on integers. The chosen side is the one
// with the smaller exact difference; a tie takes the larger count.

export const MAX_JSON_BYTES = 65536;
export const MAX_COUNT = 10000;

// Field order is the SPEC table order; validation follows it.
export const FIELD_DEFS = [
  { key: "swatchStitches", min: 1, max: 1000 },
  { key: "swatchWidthMm", min: 1, max: 5000 },
  { key: "swatchRows", min: 1, max: 1000 },
  { key: "swatchHeightMm", min: 1, max: 5000 },
  { key: "targetWidthMm", min: 1, max: 10000 },
  { key: "targetHeightMm", min: 1, max: 10000 },
  { key: "edgeEach", min: 0, max: 200 },
  { key: "repeatStitches", min: 1, max: 200 },
  { key: "repeatRows", min: 1, max: 200 },
];

const FIELD_KEYS = new Set(FIELD_DEFS.map((field) => field.key));

function error(code, path) {
  return { status: "error", error: { code, path } };
}

// Raw form syntax: ASCII decimal integers only, non-negative form
// 0 | [1-9][0-9]*. Rejects surrounding whitespace, leading zeros,
// full-width digits, exponents, plus signs, decimals and -0.
const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;

export function parseRawInteger(raw) {
  if (typeof raw !== "string" || !INTEGER_SYNTAX.test(raw)) {
    return { ok: false, code: "SYNTAX" };
  }
  return { ok: true, value: Number(raw) };
}

// Half-up tenths of the exact fraction numerator / denominator:
// floor((20*n + d) / (2*d)). All inputs are safe integers; the
// largest product here is 20 * 10,000 * 5,000 = 1,000,000,000.
function sizeTenths(numerator, denominator) {
  return Math.floor((20 * numerator + denominator) / (2 * denominator));
}

function option(count, swatchCount, swatchMm) {
  return {
    count,
    sizeTenthsMm: sizeTenths(count * swatchMm, swatchCount),
  };
}

// One axis. base is the fixed offset (2*edgeEach for width, 0 for
// height); step is the repeat size. Candidates are base + k*step,
// k >= 1, count <= MAX_COUNT.
function solveAxis({ swatchCount, swatchMm, targetMm, base, step }) {
  const targetNum = targetMm * swatchCount; // <= 10,000,000
  const floorM = Math.floor(targetNum / swatchMm);
  const ceilM = Math.floor((targetNum + swatchMm - 1) / swatchMm);
  const minCandidate = base + step;
  let lower = null;
  let upper = null;

  if (floorM >= minCandidate) {
    const capped = Math.min(floorM, MAX_COUNT);
    const k = Math.floor((capped - base) / step);
    lower = option(base + k * step, swatchCount, swatchMm);
  }
  if (ceilM <= minCandidate) {
    upper = option(minCandidate, swatchCount, swatchMm);
  } else {
    const k = Math.ceil((ceilM - base) / step);
    const n = base + k * step;
    if (n <= MAX_COUNT) upper = option(n, swatchCount, swatchMm);
  }

  let chosen;
  if (lower !== null && upper !== null) {
    const diffLower = Math.abs(lower.count * swatchMm - targetNum);
    const diffUpper = Math.abs(upper.count * swatchMm - targetNum);
    // A tie takes the larger count, which is always the upper side.
    chosen = diffLower < diffUpper ? lower : upper;
  } else {
    chosen = lower ?? upper;
  }
  return { lower, upper, chosen };
}

export function solve(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return error("TYPE", "");
  }
  let bytes;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(data)).length;
  } catch {
    return error("TYPE", "");
  }
  if (bytes > MAX_JSON_BYTES) return error("SIZE", "");

  for (const key of Object.keys(data)) {
    if (!FIELD_KEYS.has(key)) return error("SHAPE", "");
  }
  for (const field of FIELD_DEFS) {
    if (!Object.prototype.hasOwnProperty.call(data, field.key)) {
      return error("SHAPE", `/${field.key}`);
    }
  }
  for (const field of FIELD_DEFS) {
    const value = data[field.key];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      Object.is(value, -0)
    ) {
      return error("TYPE", `/${field.key}`);
    }
    if (value < field.min || value > field.max) {
      return error("RANGE", `/${field.key}`);
    }
  }

  return {
    status: "ok",
    result: {
      stitches: solveAxis({
        swatchCount: data.swatchStitches,
        swatchMm: data.swatchWidthMm,
        targetMm: data.targetWidthMm,
        base: 2 * data.edgeEach,
        step: data.repeatStitches,
      }),
      rows: solveAxis({
        swatchCount: data.swatchRows,
        swatchMm: data.swatchHeightMm,
        targetMm: data.targetHeightMm,
        base: 0,
        step: data.repeatRows,
      }),
    },
  };
}
