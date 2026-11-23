// Pure core for the Grocery Budget Calculator
// (spec-grocery-budget-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// Pinned data (SPEC inputsOutputs, verbatim USDA Food Plans,
// October 2026, US average, four-person household baseline):
//   Table A — Thrifty Food Plan, weekly dollars per person.
//   Table B — Low-Cost Plan, weekly dollars per person.
//   Household size factors (USDA report footnote 2): 1 person x1.20,
//   2 persons x1.10, 3 persons x1.05, 4 persons x1.00, 5-6 persons
//   x0.95, 7+ persons x0.90. Monthly conversion x4.333 (footnote 3).
// Amounts are kept as integer cents end to end; size factors and
// the 4.333 factor are exact rationals (1.20=6/5, 1.10=11/10,
// 1.05=21/20, 0.95=19/20, 0.90=9/10, 4.333=4333/1000). Rounding is
// half-up, performed exactly once at each SPEC-pinned step, with
// integer arithmetic only — never toFixed or float accumulation.
//   weeklyTotal: unadjusted x factor, half-up to the nearest $0.10
//     (a value exactly halfway, e.g. $143.55, rounds up to $143.60).
//   monthlyTotal: weeklyTotal x 4.333, half-up to the nearest $0.10.
//     It is computed from this tool's weekly total, NOT by summing
//     the breakdown monthly subtotals, and NOT from USDA's unrounded
//     weekly costs — so it can differ from USDA's published monthly
//     figure by about $0.20 (reference family: USDA $1,024.60, this
//     tool $1,024.80). That difference is disclosed, not a defect.
//   perPersonWeekly / perPersonMonthly / dailyAverage: half-up to
//     the nearest cent ($0.01).
//   breakdown monthlySubtotal: group weekly subtotal x 4.333,
//     half-up to the nearest $0.10 (pre-adjustment amounts; their
//     sum may differ from monthlyTotal by $0.10-$0.40 through
//     rounding, which is disclosed, not an error).

export const PLAN_FIELD = "plan";
export const PLANS = ["thrifty", "low-cost"];

export const FIELDS = [
  "c1",
  "c2_3",
  "c4_5",
  "c6_8",
  "c9_11",
  "f12_13",
  "f14_19",
  "f20_50",
  "f51_70",
  "f71",
  "m12_13",
  "m14_19",
  "m20_50",
  "m51_70",
  "m71",
];

export const ALL_FIELDS = [PLAN_FIELD, ...FIELDS];

export const DEFAULTS = {
  plan: "thrifty",
  c1: "0",
  c2_3: "0",
  c4_5: "0",
  c6_8: "0",
  c9_11: "0",
  f12_13: "0",
  f14_19: "0",
  f20_50: "1",
  f51_70: "0",
  f71: "0",
  m12_13: "0",
  m14_19: "0",
  m20_50: "1",
  m51_70: "0",
  m71: "0",
};

// The worked example is fixtures.json case 1
// (reference-family-thrifty) input, vendored verbatim in
// test/fixtures.json.
export const EXAMPLE = {
  plan: "thrifty",
  c1: "0",
  c2_3: "0",
  c4_5: "0",
  c6_8: "1",
  c9_11: "1",
  f12_13: "0",
  f14_19: "0",
  f20_50: "1",
  f51_70: "0",
  f71: "0",
  m12_13: "0",
  m14_19: "0",
  m20_50: "1",
  m51_70: "0",
  m71: "0",
};

export const MAX_RAW_UNITS = 8;
export const COUNT_MIN = 0;
export const COUNT_MAX = 10;
export const HOUSEHOLD_MIN = 1;
export const HOUSEHOLD_MAX = 20;

// Weekly dollars per person, in integer cents. Table A (Thrifty)
// and Table B (Low-cost), USDA Food Plans, October 2026, verbatim.
export const THRIFTY_CENTS = {
  c1: 2640,
  c2_3: 3980,
  c4_5: 4350,
  c6_8: 4830,
  c9_11: 5580,
  f12_13: 5170,
  f14_19: 6010,
  f20_50: 5870,
  f51_70: 5460,
  f71: 6030,
  m12_13: 5970,
  m14_19: 7530,
  m20_50: 7370,
  m51_70: 6500,
  m71: 6200,
};

export const LOW_COST_CENTS = {
  c1: 3830,
  c2_3: 4010,
  c4_5: 4140,
  c6_8: 6050,
  c9_11: 6260,
  f12_13: 6230,
  f14_19: 6260,
  f20_50: 6390,
  f51_70: 6220,
  f71: 6210,
  m12_13: 7320,
  m14_19: 7450,
  m20_50: 7350,
  m51_70: 6920,
  m71: 6840,
};

// Household size factor as an exact [numerator, denominator] pair.
export function sizeFactorFor(householdSize) {
  if (householdSize === 1) return [6, 5];
  if (householdSize === 2) return [11, 10];
  if (householdSize === 3) return [21, 20];
  if (householdSize === 4) return [1, 1];
  if (householdSize === 5 || householdSize === 6) return [19, 20];
  return [9, 10];
}

export const GROUP_LABELS = {
  c1: { zh: "孩童 1 歲", en: "Child, 1 year" },
  c2_3: { zh: "孩童 2–3 歲", en: "Child, 2–3 years" },
  c4_5: { zh: "孩童 4–5 歲", en: "Child, 4–5 years" },
  c6_8: { zh: "孩童 6–8 歲", en: "Child, 6–8 years" },
  c9_11: { zh: "孩童 9–11 歲", en: "Child, 9–11 years" },
  f12_13: { zh: "女性 12–13 歲", en: "Female, 12–13 years" },
  f14_19: { zh: "女性 14–19 歲", en: "Female, 14–19 years" },
  f20_50: { zh: "女性 20–50 歲", en: "Female, 20–50 years" },
  f51_70: { zh: "女性 51–70 歲", en: "Female, 51–70 years" },
  f71: { zh: "女性 71 歲以上", en: "Female, 71+ years" },
  m12_13: { zh: "男性 12–13 歲", en: "Male, 12–13 years" },
  m14_19: { zh: "男性 14–19 歲", en: "Male, 14–19 years" },
  m20_50: { zh: "男性 20–50 歲", en: "Male, 20–50 years" },
  m51_70: { zh: "男性 51–70 歲", en: "Male, 51–70 years" },
  m71: { zh: "男性 71 歲以上", en: "Male, 71+ years" },
};

export const PLAN_LABELS = {
  thrifty: { zh: "Thrifty", en: "Thrifty" },
  "low-cost": { zh: "Low-cost", en: "Low-cost" },
};

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

// Half-up rounding of the non-negative rational numerator /
// denominator to the nearest integer: exact halves round up.
// All amounts here are non-negative, and all intermediate values
// stay far below 2^53, so integer arithmetic is exact.
function halfUpDiv(numerator, denominator) {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked.
// Returns the raw string map, or null when the shape is not exactly
// the sixteen fields.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== ALL_FIELDS.length) return null;
  const raw = {};
  for (const field of ALL_FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Per-count-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, range. Returns the parsed integer or an
// { error } outcome.
function validateCount(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < COUNT_MIN || parsed > COUNT_MAX) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

function dollars(cents) {
  return cents / 100;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // plan first, in the SPEC's field order. A plan value outside the
  // fixed two-plan enum is RANGE (the SPEC pins RANGE to cover
  // out-of-enum values); a lone surrogate is UNICODE.
  if (hasLoneSurrogate(raw.plan)) return failure("UNICODE", "plan");
  if (!PLANS.includes(raw.plan)) return failure("RANGE", "plan");

  const counts = {};
  for (const field of FIELDS) {
    const outcome = validateCount(field, raw[field]);
    if (outcome.error) return outcome.error;
    counts[field] = outcome.value;
  }

  // Cross-field: the household must hold 1-20 people in total.
  let householdSize = 0;
  for (const field of FIELDS) householdSize += counts[field];
  if (householdSize === 0) return failure("EMPTY", "household");
  if (householdSize > HOUSEHOLD_MAX) return failure("RANGE", "household");

  const table = raw.plan === "thrifty" ? THRIFTY_CENTS : LOW_COST_CENTS;
  let unadjustedCents = 0;
  for (const field of FIELDS) unadjustedCents += counts[field] * table[field];

  const [factorNum, factorDen] = sizeFactorFor(householdSize);
  // Weekly total, half-up to the nearest 10 cents.
  const weeklyTotalCents = halfUpDiv(unadjustedCents * factorNum, factorDen * 10) * 10;
  // Monthly total from the weekly total x 4333/1000, half-up to the
  // nearest 10 cents.
  const monthlyTotalCents = halfUpDiv(weeklyTotalCents * 4333, 10000) * 10;

  const breakdown = [];
  for (const field of FIELDS) {
    const count = counts[field];
    if (count === 0) continue;
    const weeklyPerPersonCents = table[field];
    const weeklySubtotalCents = count * weeklyPerPersonCents;
    const monthlySubtotalCents = halfUpDiv(weeklySubtotalCents * 4333, 10000) * 10;
    breakdown.push({
      count,
      group: field,
      monthlySubtotal: dollars(monthlySubtotalCents),
      weeklyPerPerson: dollars(weeklyPerPersonCents),
      weeklySubtotal: dollars(weeklySubtotalCents),
    });
  }

  return {
    ok: true,
    result: {
      plan: raw.plan,
      householdSize,
      sizeFactor: factorNum / factorDen,
      unadjustedWeekly: dollars(unadjustedCents),
      sizeAdjustmentWeekly: dollars(weeklyTotalCents - unadjustedCents),
      weeklyTotal: dollars(weeklyTotalCents),
      monthlyTotal: dollars(monthlyTotalCents),
      perPersonWeekly: dollars(halfUpDiv(weeklyTotalCents, householdSize)),
      perPersonMonthly: dollars(halfUpDiv(monthlyTotalCents, householdSize)),
      dailyAverage: dollars(halfUpDiv(weeklyTotalCents, 7)),
      breakdown,
    },
  };
}

// Fixed report download: grocery-budget-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, finite numbers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "grocery-budget-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
