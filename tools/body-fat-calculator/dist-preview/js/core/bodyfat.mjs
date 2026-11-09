// Pure core for the Body Fat Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-body-fat-calculator-20261109): the US Navy circumference method
// (Hodgdon & Beckett 1984) with the published inch constants. Inputs are
// centimetre strings; circumference combinations are formed in centimetres
// first, then divided by 2.54 into inches for the original formulas. No
// centimetre-constant variant is used.

export const FIELDS = ["sex", "heightCm", "neckCm", "waistCm", "hipCm", "weightKg"];

export const RANGES = {
  heightCm: [100, 250],
  neckCm: [20, 80],
  waistCm: [40, 300],
  hipCm: [40, 300],
  weightKg: [25, 500],
};

export const DEFAULTS = {
  sex: "male",
  heightCm: "",
  neckCm: "",
  waistCm: "",
  hipCm: "",
  weightKg: "",
};

// The first fixture in fixtures.json (man-normal); "Load example" fills
// this in and waits for a manual run.
export const EXAMPLE = {
  sex: "male",
  heightCm: "175",
  neckCm: "38",
  waistCm: "85",
  hipCm: "",
  weightKg: "75",
};

export const CATEGORY_IDS = [
  "below-essential",
  "essential",
  "athletes",
  "fitness",
  "average",
  "obese",
];

export const MAX_RAW_UNITS = 8;
export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "body-fat-report.json";

const DECIMAL_PATTERN = /^(0|[1-9][0-9]{0,2})(\.[0-9])?$/;
const CM_PER_INCH = 2.54;

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

// The capacity and unpaired-surrogate checks that precede every field's own
// grammar/value checks (SPEC inputsOutputs). Returns an error or null.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > MAX_RAW_UNITS) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate one decimal field: capacity, surrogate, EMPTY, grammar
// (DECIMAL_FORMAT), then range (RANGE). Returns an error or null.
function validateDecimalField(field, raw) {
  const early = checkCapacityAndUnicode(field, raw);
  if (early !== null) return early;
  if (raw === "") return fieldError("EMPTY", field);
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const value = Number(raw);
  const [min, max] = RANGES[field];
  if (value < min || value > max) return fieldError("RANGE", field);
  return null;
}

// Validate the whole input object. The input must be a plain object with
// exactly the six own data fields, all strings; unknown, missing, wrongly
// typed, or accessor-backed fields are SCHEMA with field/row null. Fields
// are checked in the SPEC's fixed order: sex, heightCm, neckCm, waistCm,
// hipCm, weightKg; the first failure fails the whole input.
export function validateInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return schemaError();
  }
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return schemaError();
  }
  if (keys.length !== FIELDS.length) return schemaError();
  const values = {};
  for (const field of FIELDS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return schemaError();
    }
    if (descriptor === undefined || !("value" in descriptor)) return schemaError();
    if (typeof descriptor.value !== "string") return schemaError();
    values[field] = descriptor.value;
  }

  // sex: capacity, surrogate, then the enum itself.
  const sexEarly = checkCapacityAndUnicode("sex", values.sex);
  if (sexEarly !== null) return sexEarly;
  if (values.sex !== "male" && values.sex !== "female") {
    return fieldError("ENUM", "sex");
  }

  for (const field of ["heightCm", "neckCm", "waistCm"]) {
    const error = validateDecimalField(field, values[field]);
    if (error !== null) return error;
  }

  // hipCm: for men, after capacity/surrogate the value must be exactly ""
  // (any non-empty value is NOT_APPLICABLE, with no grammar/range checks);
  // for women it is a required decimal field.
  if (values.sex === "male") {
    const hipEarly = checkCapacityAndUnicode("hipCm", values.hipCm);
    if (hipEarly !== null) return hipEarly;
    if (values.hipCm !== "") return fieldError("NOT_APPLICABLE", "hipCm");
  } else {
    const hipError = validateDecimalField("hipCm", values.hipCm);
    if (hipError !== null) return hipError;
  }

  const weightError = validateDecimalField("weightKg", values.weightKg);
  if (weightError !== null) return weightError;

  return { ok: true, values };
}

// Half-up rounding to one decimal, exactly as pinned by the SPEC:
// r1(x) = floor(x * 10 + 0.5) / 10, applied to the computed double.
function r1(x) {
  return Math.floor(x * 10 + 0.5) / 10;
}

// ACE category from the ROUNDED body-fat percentage. The published integer
// bands are read as continuous [lower, next lower) intervals (SPEC table).
function categoryFor(sex, bodyFatPct) {
  const bounds =
    sex === "male" ? [2, 6, 14, 18, 25] : [10, 14, 21, 25, 32];
  for (let i = 0; i < bounds.length; i += 1) {
    if (bodyFatPct < bounds[i]) return CATEGORY_IDS[i];
  }
  return "obese";
}

// The estimate. Cross-field checks run after all fields pass, in order:
// log domain (circumference combination <= 0 in centimetres, equality
// fails), the Navy formula on inches, then the plausibility gate on the
// UNROUNDED percentage (0 < BF% < 75). Rounding happens once per output:
// bodyFatPct from the unrounded BF%, fatMassKg from the unrounded BF%,
// leanMassKg from the weight minus the ROUNDED fat mass, so the two
// displayed masses sum exactly to the weight at one decimal.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const values = validated.values;
  const sex = values.sex;
  const heightCm = Number(values.heightCm);
  const neckCm = Number(values.neckCm);
  const waistCm = Number(values.waistCm);
  const hipCm = sex === "female" ? Number(values.hipCm) : 0;
  const weightKg = Number(values.weightKg);

  const combinationCm =
    sex === "male" ? waistCm - neckCm : waistCm + hipCm - neckCm;
  if (combinationCm <= 0) return fieldError("LOG_DOMAIN", "waistCm");

  const combinationIn = combinationCm / CM_PER_INCH;
  const heightIn = heightCm / CM_PER_INCH;
  const bodyFatRaw =
    sex === "male"
      ? 86.01 * Math.log10(combinationIn) - 70.041 * Math.log10(heightIn) + 36.76
      : 163.205 * Math.log10(combinationIn) - 97.684 * Math.log10(heightIn) - 78.387;

  if (!(bodyFatRaw > 0 && bodyFatRaw < 75)) {
    return { ok: false, error: { code: "IMPLAUSIBLE_RESULT", field: null, row: null } };
  }

  const bodyFatPct = r1(bodyFatRaw);
  const fatMassKg = r1((weightKg * bodyFatRaw) / 100);
  const leanMassKg = r1(weightKg - fatMassKg);
  return {
    ok: true,
    result: {
      bodyFatPct,
      category: categoryFor(sex, bodyFatPct),
      fatMassKg,
      leanMassKg,
    },
  };
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON plus
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit the
// result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
