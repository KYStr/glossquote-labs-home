// Pure core for the Baby Feeding Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md
// (spec-baby-feeding-calculator-20261109): daily total from weight
// (kg) x milk per kg per day (ml/kg/day, NHS 111 Wales range
// 150-200, default 150), split across the day's feeds with the
// remainder distributed 1 ml at a time to the earliest feeds so the
// per-feed amounts sum exactly to the daily total. Age in months is
// label-only: it never changes the factor or the total, it only
// controls reminder notices. All arithmetic is exact integer
// arithmetic; no floating point decides any output number.

export const FIELDS = ["weight", "factor", "feedsPerDay", "ageMonths"];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const RAW_LIMITS = {
  weight: 8,
  factor: 8,
  feedsPerDay: 8,
  ageMonths: 8,
};

export const DEFAULTS = {
  weight: "",
  factor: "150",
  feedsPerDay: "8",
  ageMonths: "",
};

// The example draft; the first synthetic case in fixtures.json
// (typical-4kg-8feeds). Load example fills this draft and waits for a
// manual run.
export const EXAMPLE = {
  weight: "4",
  factor: "150",
  feedsPerDay: "8",
  ageMonths: "",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "baby-feeding-report.json";

// Pinned ranges (SPEC section 3). Weight is stored as h, the integer
// number of 0.01 kg units: 100 <= h <= 1500 (1-15 kg inclusive).
export const WEIGHT_H_MIN = 100;
export const WEIGHT_H_MAX = 1500;
export const FACTOR_MIN = 150;
export const FACTOR_MAX = 200;
export const FEEDS_MIN = 1;
export const FEEDS_MAX = 24;
export const AGE_MIN = 0;
export const AGE_MAX = 24;

// Pinned reminder notice texts (SPEC section 3, step 4).
export const NOTICE_TEXT = {
  "early-newborn-amounts-differ": {
    zh: "新生兒在出生後最初幾天需要的奶量小得多，指引的 150–200 ml 範圍是第一週結束後的用量。",
    en: "Newborns need much smaller amounts in the first few days; the 150–200 ml range applies from the end of the first week.",
  },
  "guideline-covers-to-about-6-months": {
    zh: "引用指引的適用期間到約 6 個月；開始副食品後奶量需求會改變，請諮詢兒科醫師。",
    en: "The cited guideline covers babies up to about 6 months old; once solids start, milk needs change — ask your paediatrician.",
  },
};

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  empty: { zh: "請輸入寶寶體重，或載入範例。", en: "Enter your baby's weight, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const WEIGHT_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^[0-9]+$/;

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

// Schema gate only: the input must be a non-null, non-array plain object
// whose own enumerable properties are exactly the four fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the four string values, or null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
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

// True when the value passes the schema gate only (used to decide
// whether a draft may be restored).
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate the weight string (non-empty): grammar (DECIMAL_FORMAT),
// then range 100-1500 hundredths of a kilogram (RANGE). Returns the
// integer h on success. The grammar guarantees the parse below is
// exact: at most two fractional digits, so h is an integer.
function parseWeight(raw) {
  if (!WEIGHT_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", "weight");
  const [whole, fraction = ""] = raw.split(".");
  const h = Number(whole) * 100 + Number(fraction.padEnd(2, "0") || "0");
  if (h < WEIGHT_H_MIN || h > WEIGHT_H_MAX) {
    return fieldError("RANGE", "weight");
  }
  return { ok: true, value: h };
}

// Validate an integer field (non-empty): grammar (INTEGER_FORMAT),
// then the pinned inclusive range (RANGE).
function parseInteger(raw, field, min, max) {
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field);
  const value = Number(raw);
  if (value < min || value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate the whole input: schema first, then fields in the fixed
// order weight, factor, feedsPerDay, ageMonths; the first error wins.
// Per-field check order: INPUT_LIMIT -> UNICODE -> EMPTY -> grammar
// -> RANGE. ageMonths is optional: "" means not provided (null) and
// skips the grammar and range checks.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("weight", values.weight);
  if (failure !== null) return failure;
  if (values.weight === "") return fieldError("EMPTY", "weight");
  const weight = parseWeight(values.weight);
  if (!weight.ok) return weight;

  failure = checkCapacityAndUnicode("factor", values.factor);
  if (failure !== null) return failure;
  if (values.factor === "") return fieldError("EMPTY", "factor");
  const factor = parseInteger(values.factor, "factor", FACTOR_MIN, FACTOR_MAX);
  if (!factor.ok) return factor;

  failure = checkCapacityAndUnicode("feedsPerDay", values.feedsPerDay);
  if (failure !== null) return failure;
  if (values.feedsPerDay === "") return fieldError("EMPTY", "feedsPerDay");
  const feeds = parseInteger(values.feedsPerDay, "feedsPerDay", FEEDS_MIN, FEEDS_MAX);
  if (!feeds.ok) return feeds;

  failure = checkCapacityAndUnicode("ageMonths", values.ageMonths);
  if (failure !== null) return failure;
  let ageMonths = null;
  if (values.ageMonths !== "") {
    const age = parseInteger(values.ageMonths, "ageMonths", AGE_MIN, AGE_MAX);
    if (!age.ok) return age;
    ageMonths = age.value;
  }

  return {
    ok: true,
    values: {
      weightHundredths: weight.value,
      factor: factor.value,
      feedsPerDay: feeds.value,
      ageMonths,
    },
  };
}

// Reminder notices, fixed order, at most one (SPEC section 3, step 4).
// Age never changes the amounts; it only selects the notice.
function noticesFor(ageMonths) {
  if (ageMonths === null) return [];
  if (ageMonths === 0) return ["early-newborn-amounts-differ"];
  if (ageMonths >= 7) return ["guideline-covers-to-about-6-months"];
  return [];
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { weightHundredths: h, factor, feedsPerDay, ageMonths } = validated.values;

  // Step 1 (SPEC section 3): daily total, half-up rounding of
  // h * factor / 100, in integers only: floor((h * factor + 50) / 100).
  const dailyTotalMl = Math.floor((h * factor + 50) / 100);

  // Step 2: split the total across the feeds; the first r feeds get
  // one extra ml each. The sum is invariantly dailyTotalMl.
  const base = Math.floor(dailyTotalMl / feedsPerDay);
  const r = dailyTotalMl - base * feedsPerDay;
  const perFeedMl = [];
  for (let i = 1; i <= feedsPerDay; i += 1) {
    perFeedMl.push(i <= r ? base + 1 : base);
  }

  // Step 3: per-feed average rounded half-up to one decimal, in
  // integers only: tenths = floor((20 * total + feeds) / (2 * feeds)).
  const tenths = Math.floor((20 * dailyTotalMl + feedsPerDay) / (2 * feedsPerDay));
  const perFeedAverageMl = tenths / 10;

  const result = {
    weightKg: h / 100,
    factorMlPerKgDay: factor,
    feedsPerDay,
    ageMonths,
    dailyTotalMl,
    perFeedMl,
    perFeedAverageMl,
    notices: noticesFor(ageMonths),
  };

  // Report cap backstop (SPEC section 3): a result over the cap is an
  // OUTPUT_LIMIT error instead of a success. With the pinned ranges a
  // real result is a few hundred bytes, so this never fires for a
  // genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Per-feed average display: exactly one decimal place (the value
// already carries one decimal of precision; toFixed only renders it).
export function formatAverageMl(perFeedAverageMl) {
  return perFeedAverageMl.toFixed(1);
}

// Weight display: the JSON number rendered as written (4.55, 4).
export function formatWeightKg(weightKg) {
  return String(weightKg);
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
