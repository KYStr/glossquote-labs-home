// Pure core for the Steps Converter.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-steps-converter-20261109): one step count converts to a
// distance using either a measured stride or a height-based stride
// estimate (height x 0.414, the ACSM regression average), plus an
// optional gross calorie estimate (0.75 kcal/kg/km).
//
// The precision strategy is pinned by the SPEC and followed literally:
// every computation runs in exact rational arithmetic with BigInt —
// never a floating-point intermediate. Each output is rounded half-up
// exactly once, from the unrounded exact value: strideCm to 1 decimal,
// distanceKm to 2 decimals, stepsPerKm to a whole number, caloriesKcal
// to a whole number. Display-rounded values never feed back into any
// computation.

export const FIELDS = ["steps", "strideSource", "strideCm", "heightCm", "calories", "weightKg"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  steps: 8,
  strideSource: 8,
  strideCm: 8,
  heightCm: 8,
  calories: 8,
  weightKg: 8,
};

export const DEFAULTS = {
  steps: "10000",
  strideSource: "height",
  strideCm: "70",
  heightCm: "170",
  calories: "off",
  weightKg: "65",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  steps: "10000",
  strideSource: "height",
  strideCm: "70",
  heightCm: "170",
  calories: "off",
  weightKg: "65",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "steps-converter-report.json";

// Height-based stride: stride = height x 207/500 (exactly 0.414).
export const STRIDE_NUMERATOR = 207n;
export const STRIDE_DENOMINATOR = 500n;

// Gross calorie cost: 0.75 kcal/kg/km = 3/4 kcal per kg per km.
export const CALORIE_NUMERATOR = 3n;
export const CALORIE_DENOMINATOR = 4n;

// Steps: `0` or a non-zero-leading run of ASCII digits. No spaces,
// signs, decimals, or exponents.
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
// Decimal strings: integer part `0` or non-zero-leading, optional dot
// plus 1-2 decimal digits (strideCm) or exactly 1 (heightCm/weightKg).
const DECIMAL_2DP_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const DECIMAL_1DP_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1})?$/;

const STEPS_MIN = 0n;
const STEPS_MAX = 99999999n;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Schema gate: the input must be a plain object whose own properties
// are exactly the six fields, each an own data property (no accessors)
// holding a string. Anything else is SCHEMA with field/row null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return null;
  }
  if (keys.length !== FIELDS.length) return null;
  const values = {};
  for (const field of FIELDS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  return values;
}

// The capacity and unpaired-surrogate checks shared by every field,
// active or not, in the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Parse a grammar-valid decimal string into an exact rational
// { num, den } with value = num / den. The grammar guarantees the
// string is a plain ASCII decimal, so this split is exact.
function parseDecimal(raw) {
  const [whole, fraction = ""] = raw.split(".");
  const digits = whole + fraction;
  return { num: BigInt(digits), den: 10n ** BigInt(fraction.length) };
}

// Round a non-negative exact rational num/den half-up to an integer:
// floor((2*num + den) / (2*den)).
function roundHalfUp(num, den) {
  return (2n * num + den) / (2n * den);
}

// Validate a decimal field that is known to be non-empty: grammar
// (DECIMAL_FORMAT), then range (RANGE). Returns the exact rational on
// success, or a field error object.
function parseDecimalField(field, raw, pattern, minNum, minDen, maxNum, maxDen) {
  if (!pattern.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const { num, den } = parseDecimal(raw);
  // Range check in exact rational terms: min <= num/den <= max.
  if (num * minDen < minNum * den || num * maxDen > maxNum * den) {
    return fieldError("RANGE", field);
  }
  return { ok: true, num, den };
}

// Validate the whole input: schema first, then fields in the fixed
// order steps, strideSource, strideCm, heightCm, calories, weightKg;
// the first error wins. Inactive fields (strideCm in height mode,
// heightCm in measured mode, weightKg while calories is off) are
// checked for INPUT_LIMIT and UNICODE only; their content is otherwise
// ignored entirely.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  // steps
  let failure = checkCapacityAndUnicode("steps", values.steps);
  if (failure !== null) return failure;
  if (values.steps === "") return fieldError("EMPTY", "steps");
  if (!INTEGER_PATTERN.test(values.steps)) return fieldError("INTEGER_FORMAT", "steps");
  const steps = BigInt(values.steps);
  if (steps < STEPS_MIN || steps > STEPS_MAX) return fieldError("RANGE", "steps");

  // strideSource
  failure = checkCapacityAndUnicode("strideSource", values.strideSource);
  if (failure !== null) return failure;
  if (values.strideSource === "") return fieldError("EMPTY", "strideSource");
  if (values.strideSource !== "measured" && values.strideSource !== "height") {
    return fieldError("ENUM", "strideSource");
  }
  const strideSource = values.strideSource;

  // strideCm: active only in measured mode.
  failure = checkCapacityAndUnicode("strideCm", values.strideCm);
  if (failure !== null) return failure;
  let strideCmValue = null;
  if (strideSource === "measured") {
    if (values.strideCm === "") return fieldError("EMPTY", "strideCm");
    const parsed = parseDecimalField("strideCm", values.strideCm, DECIMAL_2DP_PATTERN, 20n, 1n, 150n, 1n);
    if (!parsed.ok) return parsed;
    strideCmValue = parsed;
  }

  // heightCm: active only in height mode.
  failure = checkCapacityAndUnicode("heightCm", values.heightCm);
  if (failure !== null) return failure;
  let heightCmValue = null;
  if (strideSource === "height") {
    if (values.heightCm === "") return fieldError("EMPTY", "heightCm");
    const parsed = parseDecimalField("heightCm", values.heightCm, DECIMAL_1DP_PATTERN, 80n, 1n, 250n, 1n);
    if (!parsed.ok) return parsed;
    heightCmValue = parsed;
  }

  // calories
  failure = checkCapacityAndUnicode("calories", values.calories);
  if (failure !== null) return failure;
  if (values.calories === "") return fieldError("EMPTY", "calories");
  if (values.calories !== "off" && values.calories !== "on") {
    return fieldError("ENUM", "calories");
  }
  const calories = values.calories;

  // weightKg: active only while calories is on.
  failure = checkCapacityAndUnicode("weightKg", values.weightKg);
  if (failure !== null) return failure;
  let weightKgValue = null;
  if (calories === "on") {
    if (values.weightKg === "") return fieldError("EMPTY", "weightKg");
    const parsed = parseDecimalField("weightKg", values.weightKg, DECIMAL_1DP_PATTERN, 20n, 1n, 500n, 1n);
    if (!parsed.ok) return parsed;
    weightKgValue = parsed;
  }

  return {
    ok: true,
    values: { steps, strideSource, strideCmValue, heightCmValue, calories, weightKgValue },
  };
}

// Convert an exact rational to a JSON number with the given number of
// decimal places, rounded half-up once. The result is a plain JS
// number (no trailing zeros in JSON output): e.g. 70.4, 7.04, 100.
function toRoundedNumber(num, den, decimalPlaces) {
  const scale = 10n ** BigInt(decimalPlaces);
  const scaled = roundHalfUp(num * scale, den);
  return Number(scaled) / Number(scale);
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { steps, strideSource, strideCmValue, heightCmValue, calories, weightKgValue } =
    validated.values;

  // 1. Exact stride in cm, as a rational strideNum / strideDen.
  //    measured: the entered value; height: heightCm x 207/500.
  let strideNum;
  let strideDen;
  if (strideSource === "measured") {
    strideNum = strideCmValue.num;
    strideDen = strideCmValue.den;
  } else {
    strideNum = heightCmValue.num * STRIDE_NUMERATOR;
    strideDen = heightCmValue.den * STRIDE_DENOMINATOR;
  }

  // 2. Exact distance in km: steps x stride / 100,000.
  const distanceNum = steps * strideNum;
  const distanceDen = strideDen * 100000n;

  // 3. Exact calories (only when on): 3/4 x weightKg x distanceKm.
  let caloriesNum = null;
  let caloriesDen = null;
  if (calories === "on") {
    caloriesNum = CALORIE_NUMERATOR * weightKgValue.num * distanceNum;
    caloriesDen = CALORIE_DENOMINATOR * weightKgValue.den * distanceDen;
  }

  // 4. Each output rounded half-up exactly once, from the exact value.
  const strideCm = toRoundedNumber(strideNum, strideDen, 1);
  const distanceKm = toRoundedNumber(distanceNum, distanceDen, 2);
  const stepsPerKm = Number(roundHalfUp(100000n * strideDen, strideNum));
  const caloriesKcal =
    caloriesNum === null ? null : Number(roundHalfUp(caloriesNum, caloriesDen));

  return {
    ok: true,
    result: { strideCm, distanceKm, stepsPerKm, caloriesKcal },
  };
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
