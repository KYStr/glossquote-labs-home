// Pure core for the VO2max Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-vo2max-calculator-20261109):
// Cooper 12-minute run VO2max = (distanceM - 504.9) / 44.73 (Cooper 1968),
// and 1.5-mile run VO2max = 483 / timeMinutes + 3.5 (ACSM published
// form), each rounded half-up to one decimal exactly once, with optional
// classification against the pinned Cooper Institute age/sex norms
// (labelled approximate). All arithmetic is IEEE-754 double precision in
// the SPEC's pinned operation order.

export const FIELDS = ["test", "distanceMeters", "time", "age", "sex"];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const RAW_LIMITS = {
  test: 8,
  distanceMeters: 8,
  time: 8,
  age: 8,
  sex: 8,
};

export const DEFAULTS = {
  test: "cooper12",
  distanceMeters: "2400",
  time: "12:00",
  age: "",
  sex: "",
};

// The example draft; identical to the default draft by design (SPEC
// section 2) and to the cooper-basic fixture input.
export const EXAMPLE = {
  test: "cooper12",
  distanceMeters: "2400",
  time: "12:00",
  age: "",
  sex: "",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "vo2max-report.json";
export const STORAGE_KEY = "gloss-tools:vo2max-calculator:draft:v1";

// Pinned formula constants (SPEC section 4).
export const COOPER_OFFSET = 504.9;
export const COOPER_DIVISOR = 44.73;
export const MILE15_NUMERATOR = 483;
export const MILE15_RESTING = 3.5;

export const DISTANCE_MIN = 0;
export const DISTANCE_MAX = 10000;
export const TIME_SECONDS_MIN = 240;
export const TIME_SECONDS_MAX = 3600;
export const AGE_MIN = 13;
export const AGE_MAX = 99;

// Cooper Institute age/sex normative thresholds (SPEC section 4),
// transcribed verbatim and labelled approximate. Each row gives the
// lower bound of each band for the ROUNDED vo2max value.
export const THRESHOLDS = {
  male: {
    "13-19": { poorMin: 35.0, fairMin: 38.4, goodMin: 45.2, excellentMin: 51.0, superiorMin: 56.0 },
    "20-29": { poorMin: 33.0, fairMin: 36.5, goodMin: 42.5, excellentMin: 46.5, superiorMin: 52.5 },
    "30-39": { poorMin: 31.5, fairMin: 35.5, goodMin: 41.0, excellentMin: 45.0, superiorMin: 49.5 },
    "40-49": { poorMin: 30.2, fairMin: 33.6, goodMin: 39.0, excellentMin: 43.8, superiorMin: 48.1 },
    "50-59": { poorMin: 26.1, fairMin: 31.0, goodMin: 35.8, excellentMin: 41.0, superiorMin: 45.4 },
    "60+": { poorMin: 20.5, fairMin: 26.1, goodMin: 32.3, excellentMin: 36.5, superiorMin: 44.3 },
  },
  female: {
    "13-19": { poorMin: 25.0, fairMin: 31.0, goodMin: 35.0, excellentMin: 39.0, superiorMin: 42.0 },
    "20-29": { poorMin: 23.6, fairMin: 29.0, goodMin: 33.0, excellentMin: 37.0, superiorMin: 41.1 },
    "30-39": { poorMin: 22.8, fairMin: 27.0, goodMin: 31.5, excellentMin: 35.7, superiorMin: 40.1 },
    "40-49": { poorMin: 21.0, fairMin: 24.5, goodMin: 29.0, excellentMin: 32.9, superiorMin: 37.0 },
    "50-59": { poorMin: 20.2, fairMin: 22.8, goodMin: 27.0, excellentMin: 31.5, superiorMin: 35.8 },
    "60+": { poorMin: 17.5, fairMin: 20.2, goodMin: 24.5, excellentMin: 30.3, superiorMin: 31.5 },
  },
};

export const CATEGORIES = ["very-poor", "poor", "fair", "good", "excellent", "superior"];

export const CATEGORY_LABELS = {
  "very-poor": { zh: "非常弱", en: "Very poor" },
  poor: { zh: "弱", en: "Poor" },
  fair: { zh: "普通", en: "Fair" },
  good: { zh: "良好", en: "Good" },
  excellent: { zh: "優秀", en: "Excellent" },
  superior: { zh: "卓越", en: "Superior" },
};

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  idle: { zh: "準備就緒", en: "Ready" },
  dirty: { zh: "內容已修改，尚未計算", en: "Changed — not calculated yet" },
  submitting: { zh: "計算中…", en: "Calculating…" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  unavailable: { zh: "背景計算不可用", en: "Background calculation unavailable" },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const DECIMAL_PATTERN = /^[0-9]+(\.[0-9])?$/;
const TIME_M_SS_PATTERN = /^[0-9]{1,3}:[0-5][0-9]$/;
const TIME_H_MM_SS_PATTERN = /^[0-9]{1,2}:[0-5][0-9]:[0-5][0-9]$/;
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
// whose own enumerable properties are exactly the five fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the five string values, or null.
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
// whether a stored draft may be restored).
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

// Validate an active distance string (non-empty): grammar
// (DECIMAL_FORMAT), then range 0-10000 m (RANGE). The grammar
// guarantees Number() parses the value exactly as written.
function parseDistance(raw) {
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", "distanceMeters");
  const value = Number(raw);
  if (value < DISTANCE_MIN || value > DISTANCE_MAX) {
    return fieldError("RANGE", "distanceMeters");
  }
  return { ok: true, value };
}

// Validate an active time string (non-empty): grammar (TIME_FORMAT),
// then range 240-3600 total seconds (RANGE). The grammar already
// bounds every seconds/minutes segment to 00-59.
function parseTime(raw) {
  if (!TIME_M_SS_PATTERN.test(raw) && !TIME_H_MM_SS_PATTERN.test(raw)) {
    return fieldError("TIME_FORMAT", "time");
  }
  const parts = raw.split(":").map(Number);
  const total =
    parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (total < TIME_SECONDS_MIN || total > TIME_SECONDS_MAX) {
    return fieldError("RANGE", "time");
  }
  return { ok: true, value: total };
}

// Validate the whole input: schema first, then fields in the fixed
// order test, distanceMeters, time, age, sex; the first error wins. An
// inactive measurement field receives only its capacity and surrogate
// checks and its content is otherwise ignored. After all per-field
// checks, the age/sex pair rule runs before any computation.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("test", values.test);
  if (failure !== null) return failure;
  if (values.test === "") return fieldError("EMPTY", "test");
  if (values.test !== "cooper12" && values.test !== "mile15") {
    return fieldError("ENUM", "test");
  }
  const mode = values.test;

  // distanceMeters: capacity and surrogate checks in every mode; the
  // remaining checks only when cooper12 is active.
  failure = checkCapacityAndUnicode("distanceMeters", values.distanceMeters);
  if (failure !== null) return failure;
  let distanceValue = null;
  if (mode === "cooper12") {
    if (values.distanceMeters === "") return fieldError("EMPTY", "distanceMeters");
    const parsed = parseDistance(values.distanceMeters);
    if (!parsed.ok) return parsed;
    distanceValue = parsed.value;
  }

  // time: capacity and surrogate checks in every mode; the remaining
  // checks only when mile15 is active.
  failure = checkCapacityAndUnicode("time", values.time);
  if (failure !== null) return failure;
  let timeSeconds = null;
  if (mode === "mile15") {
    if (values.time === "") return fieldError("EMPTY", "time");
    const parsed = parseTime(values.time);
    if (!parsed.ok) return parsed;
    timeSeconds = parsed.value;
  }

  failure = checkCapacityAndUnicode("age", values.age);
  if (failure !== null) return failure;
  let ageValue = null;
  if (values.age !== "") {
    if (!INTEGER_PATTERN.test(values.age)) return fieldError("INTEGER_FORMAT", "age");
    ageValue = Number(values.age);
    if (ageValue < AGE_MIN || ageValue > AGE_MAX) return fieldError("RANGE", "age");
  }

  failure = checkCapacityAndUnicode("sex", values.sex);
  if (failure !== null) return failure;
  if (values.sex !== "" && values.sex !== "male" && values.sex !== "female") {
    return fieldError("ENUM", "sex");
  }

  // Cross-field pair rule: exactly one of age/sex present is an error
  // naming the absent field.
  if ((ageValue === null) !== (values.sex === "")) {
    return fieldError("PAIR_REQUIRED", ageValue === null ? "age" : "sex");
  }

  return {
    ok: true,
    values: {
      mode,
      distanceMeters: distanceValue,
      timeSeconds,
      age: ageValue,
      sex: values.sex === "" ? null : values.sex,
    },
  };
}

function ageBandFor(age) {
  if (age <= 19) return "13-19";
  if (age <= 29) return "20-29";
  if (age <= 39) return "30-39";
  if (age <= 49) return "40-49";
  if (age <= 59) return "50-59";
  return "60+";
}

function classify(sex, age, vo2max) {
  const ageBand = ageBandFor(age);
  const row = THRESHOLDS[sex][ageBand];
  let category;
  if (vo2max < row.poorMin) category = "very-poor";
  else if (vo2max < row.fairMin) category = "poor";
  else if (vo2max < row.goodMin) category = "fair";
  else if (vo2max < row.excellentMin) category = "good";
  else if (vo2max < row.superiorMin) category = "excellent";
  else category = "superior";
  return { sex, ageBand, category };
}

// Round half up to one decimal, applied exactly once (SPEC section 4).
function roundHalfUp1(raw) {
  return Math.floor(raw * 10 + 0.5) / 10;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { mode, distanceMeters, timeSeconds, age, sex } = validated.values;

  // Pinned operation order (SPEC section 4, step 2).
  let raw;
  if (mode === "cooper12") {
    raw = (distanceMeters - COOPER_OFFSET) / COOPER_DIVISOR;
  } else {
    raw = MILE15_RESTING + MILE15_NUMERATOR / (timeSeconds / 60.0);
  }
  const vo2max = roundHalfUp1(raw);

  // Non-positive rule, Cooper mode only (SPEC section 4, step 4).
  if (mode === "cooper12" && vo2max <= 0) {
    return fieldError("BELOW_RANGE", "distanceMeters");
  }

  const classification = sex === null ? null : classify(sex, age, vo2max);

  const result =
    mode === "cooper12"
      ? { test: "cooper12", distanceMeters, vo2max, classification }
      : { test: "mile15", timeSeconds, vo2max, classification };

  // Report cap backstop (SPEC section 4, step 6): a result over the cap
  // is an OUTPUT_LIMIT error instead of a success. With the pinned
  // ranges a real result is a few hundred bytes, so this never fires
  // for a genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// VO2max display: exactly one decimal place (the value already carries
// one decimal of precision; toFixed only renders it).
export function formatVo2max(vo2max) {
  return vo2max.toFixed(1);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Time display (app layer, never feeds back into machine values):
// H:MM:SS at or above one hour, otherwise M:SS.
export function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const rest = seconds - hours * 3600;
    return `${hours}:${pad2(Math.floor(rest / 60))}:${pad2(rest % 60)}`;
  }
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;
}

// Distance display: thousands grouped, a single decimal kept.
export function formatDistanceM(distanceM) {
  const text = String(distanceM);
  const [whole, fraction] = text.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
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
