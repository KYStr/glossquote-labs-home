// Pure core for the One-Rep Max Calculator. Synchronous data in, data
// out: no DOM, no network, no storage, no timers. Implements the fixed
// contract of SPEC spec-one-rep-max-20261109: strict schema over own
// data properties, the pinned per-field validation order, exact rational
// arithmetic with BigInt (no binary floating point anywhere in the
// derivation), the Epley and Brzycki formulas with the reps = 1 special
// case, and the three pinned half-up rounding points (one decimal for
// the two formula estimates, the 0.5 kg step for the headline result and
// for every percentage-table load, the table based on the ROUNDED
// headline result).

export const MAX_INPUT_UNITS = 16;
export const MAX_WEIGHT_HUNDREDTHS = 150000n; // 1500.00 in the chosen unit
export const MIN_REPS = 1;
export const MAX_REPS = 30;
export const HIGH_REPS_THRESHOLD = 10;

// The percentage / typical-reps table pinned by SPEC inputsOutputs.
// Implementations must not look up or alter these values.
export const PERCENT_TABLE = [
  { percent: 95, typicalReps: 2 },
  { percent: 90, typicalReps: 4 },
  { percent: 85, typicalReps: 6 },
  { percent: 80, typicalReps: 8 },
  { percent: 75, typicalReps: 10 },
  { percent: 70, typicalReps: 12 },
  { percent: 65, typicalReps: 16 },
  { percent: 60, typicalReps: 20 },
  { percent: 55, typicalReps: 24 },
  { percent: 50, typicalReps: 30 },
];

// Bilingual messages pinned by the SPEC. EMPTY and RANGE are field
// specific; the rest are per code.
export const ERROR_MESSAGES = {
  SCHEMA: { "zh-Hant": "輸入格式不正確", en: "The input is malformed." },
  INPUT_LIMIT: { "zh-Hant": "輸入太長", en: "Input is too long." },
  UNICODE: { "zh-Hant": "輸入含無效字元", en: "Input contains an invalid character." },
  DECIMAL_FORMAT: {
    "zh-Hant": "重量必須是數字，最多兩位小數",
    en: "Weight must be a number with at most two decimal places.",
  },
  INTEGER_FORMAT: { "zh-Hant": "次數必須是整數", en: "Reps must be a whole number." },
  ENUM: { "zh-Hant": "單位只能是公斤或磅", en: "Unit must be kilograms or pounds." },
  INTERNAL: { "zh-Hant": "發生錯誤，請再試一次", en: "Something went wrong. Try again." },
  EMPTY: {
    weight: { "zh-Hant": "請輸入重量", en: "Enter the weight." },
    reps: { "zh-Hant": "請輸入次數", en: "Enter the reps." },
  },
  RANGE: {
    weight: {
      "zh-Hant": "重量必須大於 0 且不超過 1500",
      en: "Weight must be greater than 0 and at most 1500.",
    },
    reps: { "zh-Hant": "次數必須介於 1 到 30", en: "Reps must be between 1 and 30." },
  },
};

// Resolves the pinned display text for an error object. Field-specific
// codes (EMPTY, RANGE) look up by field; combinations the SPEC does not
// pin (e.g. EMPTY for unit, unreachable from the radio-group UI) fall
// back to the INTERNAL text.
export function messageFor(error, lang) {
  const language = lang === "en" ? "en" : "zh-Hant";
  if (error === null || typeof error !== "object") {
    return ERROR_MESSAGES.INTERNAL[language];
  }
  const entry = ERROR_MESSAGES[error.code];
  if (entry === undefined) return ERROR_MESSAGES.INTERNAL[language];
  if (entry[language] !== undefined) return entry[language];
  const byField = entry[error.field];
  if (byField !== undefined) return byField[language];
  return ERROR_MESSAGES.INTERNAL[language];
}

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const FIELD_NAMES = ["weight", "reps", "unit"];

// Reads only own data properties. Unknown fields, missing fields, wrong
// types (every field is a string), and accessors are all SCHEMA.
function readInput(input) {
  if (!isPlainObject(input)) return null;
  const names = Object.getOwnPropertyNames(input);
  if (names.length !== FIELD_NAMES.length) return null;
  const values = {};
  for (const name of FIELD_NAMES) {
    if (!names.includes(name)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, name);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[name] = descriptor.value;
  }
  return values;
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// The checks shared by every field, in the SPEC's pinned order. Returns
// an error code or null.
function sharedFieldCheck(raw) {
  if (raw.length > MAX_INPUT_UNITS) return "INPUT_LIMIT";
  if (hasUnpairedSurrogate(raw)) return "UNICODE";
  if (raw === "") return "EMPTY";
  return null;
}

const WEIGHT_GRAMMAR = /^(0|[1-9][0-9]{0,6})(\.[0-9]{1,2})?$/;
const REPS_GRAMMAR = /^(0|[1-9][0-9]*)$/;

// Parses a grammar-valid weight string into hundredths as a BigInt.
// "42.5" -> 4250n, "100" -> 10000n, "0.05" -> 5n.
function parseWeightHundredths(raw) {
  const dot = raw.indexOf(".");
  const integerPart = dot === -1 ? raw : raw.slice(0, dot);
  const fractionPart = dot === -1 ? "" : raw.slice(dot + 1);
  const fractionHundredths = (fractionPart + "00").slice(0, 2);
  return BigInt(integerPart) * 100n + BigInt(fractionHundredths);
}

// Half-up rounding of the non-negative rational num/den to one decimal;
// returns the tenths as a BigInt: floor((20*num + den) / (2*den)).
function roundToTenths(num, den) {
  return (20n * num + den) / (2n * den);
}

// Half-up rounding of the non-negative rational num/den to the nearest
// 0.5 step; returns the count of half steps as a BigInt:
// floor((4*num + den) / (2*den)).
function roundToHalves(num, den) {
  return (4n * num + den) / (2n * den);
}

export function run(input) {
  try {
    const values = readInput(input);
    if (values === null) return failure("SCHEMA", null);

    // Field order is pinned: weight, then reps, then unit. Within each
    // field: INPUT_LIMIT, UNICODE, EMPTY, format/ENUM, RANGE.
    let code = sharedFieldCheck(values.weight);
    if (code !== null) return failure(code, "weight");
    if (!WEIGHT_GRAMMAR.test(values.weight)) return failure("DECIMAL_FORMAT", "weight");
    const weightHundredths = parseWeightHundredths(values.weight);
    if (weightHundredths <= 0n || weightHundredths > MAX_WEIGHT_HUNDREDTHS) {
      return failure("RANGE", "weight");
    }

    code = sharedFieldCheck(values.reps);
    if (code !== null) return failure(code, "reps");
    if (!REPS_GRAMMAR.test(values.reps)) return failure("INTEGER_FORMAT", "reps");
    const repsBig = BigInt(values.reps);
    if (repsBig < BigInt(MIN_REPS) || repsBig > BigInt(MAX_REPS)) {
      return failure("RANGE", "reps");
    }
    const reps = Number(repsBig);

    code = sharedFieldCheck(values.unit);
    if (code !== null) return failure(code, "unit");
    if (values.unit !== "kg" && values.unit !== "lb") return failure("ENUM", "unit");

    // Weight in kilograms as an exact fraction num/den. For pounds the
    // exact definition 1 lb = 0.45359237 kg applies to the hundredths:
    // wKg = W * 45359237 / 10^10.
    let num;
    let den;
    if (values.unit === "kg") {
      num = weightHundredths;
      den = 100n;
    } else {
      num = weightHundredths * 45359237n;
      den = 10000000000n;
    }

    let epleyNum;
    let epleyDen;
    let brzyckiNum;
    let brzyckiDen;
    if (reps === 1) {
      // A weight lifted once is its own 1RM by definition; the raw
      // Epley factor 31/30 at r = 1 is not used.
      epleyNum = num;
      epleyDen = den;
      brzyckiNum = num;
      brzyckiDen = den;
    } else {
      epleyNum = num * BigInt(30 + reps);
      epleyDen = den * 30n;
      brzyckiNum = num * 36n;
      brzyckiDen = den * BigInt(37 - reps);
    }

    const epleyKg = Number(roundToTenths(epleyNum, epleyDen)) / 10;
    const brzyckiKg = Number(roundToTenths(brzyckiNum, brzyckiDen)) / 10;

    // Headline result: the mean of the two UNROUNDED estimates, rounded
    // to the nearest 0.5 kg step.
    const meanNum = epleyNum * brzyckiDen + brzyckiNum * epleyDen;
    const meanDen = 2n * epleyDen * brzyckiDen;
    const oneRepMaxHalves = roundToHalves(meanNum, meanDen);
    const oneRepMaxKg = Number(oneRepMaxHalves) / 2;

    // Percentage loads derive from the ROUNDED headline result:
    // load = oneRepMaxKg * percent / 100 = halves * percent / 200,
    // rounded to the nearest 0.5 kg step.
    const rows = PERCENT_TABLE.map(({ percent, typicalReps }) => ({
      loadKg: Number(roundToHalves(oneRepMaxHalves * BigInt(percent), 200n)) / 2,
      percent,
      typicalReps,
    }));

    return {
      ok: true,
      result: {
        brzyckiKg,
        epleyKg,
        highReps: reps > HIGH_REPS_THRESHOLD,
        oneRepMaxKg,
        rows,
      },
    };
  } catch {
    return failure("INTERNAL", null);
  }
}

// Display formatting: every output weight is shown with exactly one
// decimal (100.0, 97.5). The value is a multiple of 0.1 by construction,
// so the tenths integer is recovered exactly.
export function formatKg(value) {
  const tenths = Math.round(value * 10);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}
