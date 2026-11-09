// Baker's Percentage Calculator — pure core.
//
// Implements SPEC.md section 4 of docs/specs/bakers-percentage-calculator
// exactly: percentages are relative to the combined flour weight, the
// flour-flagged percentages MUST sum to exactly 100 in percentage modes,
// nothing is ever renormalised, all arithmetic is exact rational
// (BigInt) arithmetic, and display rounding happens once per displayed
// figure, round half-up to 0.1.
//
// This module has no DOM, network or storage access and is imported
// directly by the test suites.

// ---------------------------------------------------------------------------
// Auditable constants (SPEC section 4 bounds; defined once, here).

export const MAX_ROWS = 30;
export const MIN_ROWS = 1;
/** Percentages are integer tenths of a percent internally; 1000.0% cap. */
export const MAX_PERCENT_TENTHS = 10000n;
/** The flour basis: flour-flagged percentages must total exactly 100.0%. */
export const FLOUR_BASIS_TENTHS = 1000n;
/** Targets and weights are integer tenths of a gram internally. */
export const MIN_TARGET_TENTHS = 10n; // 1 g
export const MAX_WEIGHT_TENTHS = 1000000n; // 100,000 g

// ---------------------------------------------------------------------------
// Strict parsing. Percentages: at most one decimal place, no sign, no
// locale comma, no exponent (SPEC sections 4 and 5). Weights: grams with
// at most one decimal place, same strictness.

const PERCENT_PATTERN = /^(\d{1,4})(?:\.(\d))?$/;
const WEIGHT_PATTERN = /^(\d{1,6})(?:\.(\d))?$/;

function parseTenths(text, pattern) {
  if (typeof text !== "string") return { ok: false, code: "not-a-string" };
  const match = pattern.exec(text.trim());
  if (!match) return { ok: false, code: "bad-format" };
  const tenths = BigInt(match[1]) * 10n + BigInt(match[2] ?? "0");
  return { ok: true, tenths };
}

/** Parse a percentage string into tenths of a percent (0..10000). */
export function parsePercent(text) {
  const parsed = parseTenths(text, PERCENT_PATTERN);
  if (!parsed.ok) return { ok: false, code: "percent-format" };
  if (parsed.tenths > MAX_PERCENT_TENTHS) return { ok: false, code: "percent-range" };
  return parsed;
}

/** Parse a weight/target string into tenths of a gram. */
export function parseWeight(text, { allowZero = false } = {}) {
  const parsed = parseTenths(text, WEIGHT_PATTERN);
  if (!parsed.ok) return { ok: false, code: "weight-format" };
  if (parsed.tenths > MAX_WEIGHT_TENTHS) return { ok: false, code: "weight-range" };
  if (!allowZero && parsed.tenths < MIN_TARGET_TENTHS) {
    return { ok: false, code: "weight-range" };
  }
  if (allowZero && parsed.tenths < 0n) return { ok: false, code: "weight-range" };
  return parsed;
}

// ---------------------------------------------------------------------------
// Formatting: display rounding is round half-up to 0.1, applied once.

/** Round the non-negative rational n/d to tenths, half-up. Returns BigInt tenths. */
export function roundHalfUpTenths(n, d) {
  if (d <= 0n) throw new RangeError("denominator must be positive");
  if (n < 0n) throw new RangeError("this tool only rounds non-negative values");
  return (20n * n + d) / (2n * d);
}

/** Format an integer count of tenths as "1,008.0" (grouped, one decimal). */
export function formatTenths(tenths) {
  const negative = tenths < 0n;
  const absolute = negative ? -tenths : tenths;
  const whole = (absolute / 10n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (absolute % 10n).toString();
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** Format the non-negative rational n/d (in the displayed unit) at 0.1. */
export function formatRational(n, d) {
  return formatTenths(roundHalfUpTenths(n, d));
}

/** Format a rational without grouping, for exact test comparisons. */
export function formatTenthsPlain(tenths) {
  const whole = tenths / 10n;
  const frac = tenths % 10n;
  return `${whole.toString()}.${frac.toString()}`;
}

// ---------------------------------------------------------------------------
// Formula model. A row is:
//   { name: string,
//     percentTenths: BigInt | null,   // null = unparsable percentage input
//     flour: boolean, water: boolean }
// Mode C rows carry weightTenths (BigInt | null) instead.

export function flourSumTenths(rows) {
  let sum = 0n;
  for (const row of rows) if (row.flour && row.percentTenths !== null) sum += row.percentTenths;
  return sum;
}

export function totalPercentTenths(rows) {
  let sum = 0n;
  for (const row of rows) if (row.percentTenths !== null) sum += row.percentTenths;
  return sum;
}

export function waterPercentTenths(rows) {
  let sum = 0n;
  for (const row of rows) if (row.water && row.percentTenths !== null) sum += row.percentTenths;
  return sum;
}

export function hasFlourRow(rows) {
  return rows.some((row) => row.flour);
}

/**
 * Validate a formula for the percentage modes (A and B).
 * Returns { ok, errors, flourSumTenths } where errors are
 * { row: index | -1, code } objects. The basis comparison is exact
 * (SPEC section 7c): 99.9 and 100.1 both fail.
 */
export function validatePercentageFormula(rows) {
  const errors = [];
  if (rows.length < MIN_ROWS) errors.push({ row: -1, code: "too-few-rows" });
  if (rows.length > MAX_ROWS) errors.push({ row: -1, code: "too-many-rows" });
  rows.forEach((row, index) => {
    if (row.flour && row.water) errors.push({ row: index, code: "flag-conflict" });
    if (row.percentTenths === null) errors.push({ row: index, code: "percent-format" });
  });
  const sum = flourSumTenths(rows);
  if (errors.length === 0 && sum !== FLOUR_BASIS_TENTHS) {
    errors.push({ row: -1, code: "basis", flourSumTenths: sum });
  }
  return { ok: errors.length === 0, errors, flourSumTenths: sum };
}

// ---------------------------------------------------------------------------
// Mode A: target total dough weight T -> per-ingredient weights.
//   weight_i = T x p_i / S   (S = sum of ALL percentages), exact.

export function computeModeA(rows, targetTenths) {
  const S = totalPercentTenths(rows);
  const weights = rows.map((row) => ({
    // grams: (targetTenths/10) * (p/10) / (S/10) = targetTenths*p / (10*S)
    n: targetTenths * row.percentTenths,
    d: 10n * S,
  }));
  return {
    weights,
    weightTexts: weights.map((w) => formatRational(w.n, w.d)),
    // The page shows the exact target T, not the sum of rounded weights.
    totalText: formatTenths(targetTenths),
    hydrationText: formatTenths(waterPercentTenths(rows)),
  };
}

// ---------------------------------------------------------------------------
// Mode B: flour weight W -> per-ingredient weights plus implied total.
//   weight_i = W x p_i / 100 ; implied total = W x S / 100.

export function computeModeB(rows, flourTenths) {
  const S = totalPercentTenths(rows);
  const weights = rows.map((row) => ({
    // grams: (flourTenths/10) * (p/10) / 100 = flourTenths*p / 10000
    n: flourTenths * row.percentTenths,
    d: 10000n,
  }));
  return {
    weights,
    weightTexts: weights.map((w) => formatRational(w.n, w.d)),
    totalText: formatRational(flourTenths * S, 10000n),
    hydrationText: formatTenths(waterPercentTenths(rows)),
  };
}

// ---------------------------------------------------------------------------
// Mode C: per-ingredient weights -> percentages, implied total, hydration.
// Weights are accepted as exact rationals (grams) so the round-trip
// property of SPEC section 7b can be checked on unrounded Mode A output.

/** Exact rational percentage of each row relative to the flour total. */
export function percentagesFromWeights(weightRationals, flourFlags) {
  let flourN = 0n;
  let flourD = 1n;
  weightRationals.forEach((w, i) => {
    if (!flourFlags[i]) return;
    flourN = flourN * w.d + w.n * flourD;
    flourD = flourD * w.d;
  });
  // Reduce the flour total once; equality below uses cross-multiplication
  // semantics through shared denominators, so reduction is optional but
  // keeps numbers small.
  const percentages = weightRationals.map((w) => ({
    // p_i = w_i / Wf x 100
    n: w.n * flourD * 100n,
    d: w.d * flourN,
  }));
  return { percentages, flourTotal: { n: flourN, d: flourD } };
}

/** Validate mode C rows: weights parse, at least one flour row, flour > 0. */
export function validateWeightFormula(rows) {
  const errors = [];
  if (rows.length < MIN_ROWS) errors.push({ row: -1, code: "too-few-rows" });
  if (rows.length > MAX_ROWS) errors.push({ row: -1, code: "too-many-rows" });
  rows.forEach((row, index) => {
    if (row.flour && row.water) errors.push({ row: index, code: "flag-conflict" });
    if (row.weightTenths === null) errors.push({ row: index, code: "weight-format" });
  });
  let flourTotal = 0n;
  let anyFlour = false;
  for (const row of rows) {
    if (row.flour) {
      anyFlour = true;
      if (row.weightTenths !== null) flourTotal += row.weightTenths;
    }
  }
  if (errors.length === 0) {
    if (!anyFlour) errors.push({ row: -1, code: "no-flour-row" });
    else if (flourTotal === 0n) errors.push({ row: -1, code: "flour-weight-zero" });
  }
  return { ok: errors.length === 0, errors, flourWeightTenths: flourTotal };
}

export function computeModeC(rows) {
  const rationals = rows.map((row) => ({ n: row.weightTenths, d: 10n }));
  const { percentages } = percentagesFromWeights(rationals, rows.map((r) => r.flour));
  let totalTenths = 0n;
  let waterTenths = 0n;
  rows.forEach((row) => {
    totalTenths += row.weightTenths;
    if (row.water) waterTenths += row.weightTenths;
  });
  const flourTenths = rows.reduce(
    (acc, row) => (row.flour ? acc + row.weightTenths : acc),
    0n,
  );
  return {
    percentages,
    percentTexts: percentages.map((p) => formatRational(p.n, p.d)),
    totalText: formatTenths(totalTenths),
    // hydration = water weight / flour weight x 100, displayed 0.1
    hydrationText: formatRational(waterTenths * 100n, flourTenths),
  };
}

/** Exact rational equality (cross-multiplication). */
export function rationalEquals(a, b) {
  return a.n * b.d === b.n * a.d;
}
