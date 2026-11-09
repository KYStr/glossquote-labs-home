// Pure core for the Protein Intake Calculator
// (spec-protein-intake-calculator-20261109).
// Synchronous data-in / data-out only: no DOM, no network, no storage.
// All arithmetic is integer math in tenths (weight 0.1 kg, factor
// 0.1 g/kg); the single rounding step is the SPEC's
//   grams(x10) = floor((W10 * x10 + 50) / 100)
// (round half-up of the unrounded product to whole grams).
// The range recomputes from the unrounded product at factor - 0.2 and
// factor + 0.2 (the low factor is clamped at 0), never from the rounded
// target. The per-meal split divides the daily target evenly and gives
// the remainder, one gram at a time, to the earliest meals, so the meals
// always sum exactly to the daily target.

export const FIELDS = ["weight", "goal", "customFactor", "meals"];

export const GOAL_CODES = [
  "sedentary",
  "general",
  "regular-exercise",
  "strength-training",
  "high-intensity",
  "fat-loss",
  "custom",
];

// Pinned factor table in integer tenths of g/kg. `custom` is absent: its
// factor comes from the customFactor field.
export const GOAL_FACTORS_TENTHS = {
  sedentary: 8,
  general: 10,
  "regular-exercise": 12,
  "strength-training": 16,
  "high-intensity": 20,
  "fat-loss": 22,
};

export const DEFAULTS = { weight: "70", goal: "general", customFactor: "", meals: "3" };

// The worked example is fixtures.json case 1 (strength-example) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { weight: "70", goal: "strength-training", customFactor: "", meals: "4" };

// Raw capacity in UTF-16 code units, pinned by the SPEC for weight and
// (by its "same grammar" clause) for customFactor. The SPEC pins no
// capacity for the goal/meals code fields, and the valid code
// "regular-exercise" is 16 units long, so no capacity is applied there.
export const MAX_RAW_UNITS = 8;

// Ranges in display units, used by the static project check.
export const WEIGHT_RANGE = [20.0, 300.0];
export const CUSTOM_FACTOR_RANGE = [0.1, 4.0];

// The same ranges in integer tenths, used by the validator.
const WEIGHT_TENTHS = [200, 3000];
const CUSTOM_FACTOR_TENTHS = [1, 40];

export const MEAL_COUNTS = ["3", "4"];

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;
const UNPAIRED_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the four
// string fields.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

// Decimal field validation in the SPEC's per-field order: capacity,
// unpaired surrogate, empty, grammar, range. Returns { tenths } or
// { error }.
function validateDecimalField(field, value, rangeTenths) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (UNPAIRED_SURROGATE.test(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const dot = value.indexOf(".");
  const tenths =
    dot === -1
      ? Number(value) * 10
      : Number(value.slice(0, dot)) * 10 + Number(value.slice(dot + 1));
  if (tenths < rangeTenths[0] || tenths > rangeTenths[1]) {
    return { error: failure("RANGE", field) };
  }
  return { tenths };
}

// Code field validation in the SPEC's per-field order: unpaired
// surrogate, empty, then the fixed code set. No capacity is pinned for
// code fields (see MAX_RAW_UNITS note).
function validateCodeField(field, value, codes) {
  if (UNPAIRED_SURROGATE.test(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!codes.includes(value)) return { error: failure("ENUM", field) };
  return { code: value };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const weightResult = validateDecimalField("weight", raw.weight, WEIGHT_TENTHS);
  if (weightResult.error) return weightResult.error;

  const goalResult = validateCodeField("goal", raw.goal, GOAL_CODES);
  if (goalResult.error) return goalResult.error;
  const goal = goalResult.code;

  // customFactor is value-validated only when the goal is `custom`; for
  // every other goal only the SCHEMA type check above applies and the
  // value never participates in the calculation.
  let factorTenths;
  if (goal === "custom") {
    const customResult = validateDecimalField(
      "customFactor",
      raw.customFactor,
      CUSTOM_FACTOR_TENTHS,
    );
    if (customResult.error) return customResult.error;
    factorTenths = customResult.tenths;
  } else {
    factorTenths = GOAL_FACTORS_TENTHS[goal];
  }

  const mealsResult = validateCodeField("meals", raw.meals, MEAL_COUNTS);
  if (mealsResult.error) return mealsResult.error;
  const meals = Number(mealsResult.code);

  const W10 = weightResult.tenths;
  const grams = (x10) => Math.floor((W10 * x10 + 50) / 100);
  const dailyGrams = grams(factorTenths);
  const lowGrams = grams(Math.max(factorTenths - 2, 0));
  const highGrams = grams(factorTenths + 2);

  const base = Math.floor(dailyGrams / meals);
  const remainder = dailyGrams - base * meals;
  const perMealGrams = Array.from({ length: meals }, (_, index) =>
    index < remainder ? base + 1 : base,
  );

  return {
    ok: true,
    result: {
      factor: `${Math.floor(factorTenths / 10)}.${factorTenths % 10}`,
      dailyGrams,
      lowGrams,
      highGrams,
      meals,
      perMealGrams,
    },
  };
}

// Fixed report download: protein-intake-report.json. The content is the
// result's compact JSON with object keys sorted recursively by UTF-16
// code units, array order unchanged, exactly one trailing LF, UTF-8
// without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, safe integers, strings, arrays, plain objects).
export const REPORT_FILENAME = "protein-intake-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
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
