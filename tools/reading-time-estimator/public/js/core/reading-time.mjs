// Pure core for the Reading Time Estimator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md
// (spec-reading-time-estimator-20261109):
// - CJK ideographs counted per Unicode code point in four pinned
//   ranges; Latin words are whitespace-split tokens containing at
//   least one ASCII letter or digit.
// - Text capacity is measured in UTF-16 code units (100,000);
//   counting is measured in code points. The two deliberately differ.
// - Silent / speaking seconds come from exact BigInt rational
//   arithmetic and are rounded half-up exactly once, on the total.
// - Display is M:SS below one hour, H:MM:SS at or above one hour.

export const FIELDS = ["text", "zhSilentRate", "zhSpeakRate", "enSilentRate", "enSpeakRate"];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const TEXT_LIMIT = 100000;
export const RAW_LIMITS = {
  text: 100000,
  zhSilentRate: 8,
  zhSpeakRate: 8,
  enSilentRate: 8,
  enSpeakRate: 8,
};

export const DEFAULTS = {
  text: "",
  zhSilentRate: "400",
  zhSpeakRate: "240",
  enSilentRate: "200",
  enSpeakRate: "150",
};

// The example draft: the first synthetic case in fixtures.json
// (zh-basic). Loading it fills the form; it never runs by itself.
export const EXAMPLE = {
  text: "閱讀時間估算",
  zhSilentRate: "400",
  zhSpeakRate: "240",
  enSilentRate: "200",
  enSpeakRate: "150",
};

// Pinned rate ranges (SPEC section 3). The four defaults are
// adjustable conventions chosen inside commonly published ranges,
// not constants of nature.
export const RATE_RANGES = {
  zhSilentRate: { min: 50, max: 2000 },
  zhSpeakRate: { min: 50, max: 1200 },
  enSilentRate: { min: 50, max: 1000 },
  enSpeakRate: { min: 50, max: 600 },
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "reading-time-report.json";

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  empty: { zh: "請輸入本文，或載入範例。", en: "Enter your text, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "估算完成", en: "Estimate complete" },
  error: { zh: "無法估算，請檢查輸入", en: "Cannot estimate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

// The pinned CJK ideograph ranges (SPEC section 3, step 3).
function isCjk(codePoint) {
  return (
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0x20000 && codePoint <= 0x2a6df)
  );
}

// The pinned whitespace set W: the full Unicode White_Space
// property set (SPEC section 3, step 3).
function isWhitespace(codePoint) {
  return (
    (codePoint >= 0x0009 && codePoint <= 0x000d) ||
    codePoint === 0x0020 ||
    codePoint === 0x0085 ||
    codePoint === 0x00a0 ||
    codePoint === 0x1680 ||
    (codePoint >= 0x2000 && codePoint <= 0x200a) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    codePoint === 0x202f ||
    codePoint === 0x205f ||
    codePoint === 0x3000
  );
}

function isAsciiLetterOrDigit(codePoint) {
  return (
    (codePoint >= 0x0030 && codePoint <= 0x0039) ||
    (codePoint >= 0x0041 && codePoint <= 0x005a) ||
    (codePoint >= 0x0061 && codePoint <= 0x007a)
  );
}

// Count CJK characters and Latin words in one linear code-point
// scan. A token may contribute to both counts at once (for example
// "中文abc": 2 CJK characters and 1 Latin word); the two counts are
// independent and only added when converting to seconds.
export function countText(text) {
  let cjkChars = 0;
  let latinWords = 0;
  let tokenHasAscii = false;
  let inToken = false;
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (isWhitespace(codePoint)) {
      if (inToken && tokenHasAscii) latinWords += 1;
      inToken = false;
      tokenHasAscii = false;
      continue;
    }
    if (isCjk(codePoint)) cjkChars += 1;
    if (isAsciiLetterOrDigit(codePoint)) tokenHasAscii = true;
    inToken = true;
  }
  if (inToken && tokenHasAscii) latinWords += 1;
  return { cjkChars, latinWords };
}

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

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

// Schema gate only: the input must be a non-null, non-array plain
// object whose own enumerable properties are exactly the five fields,
// each an own data property (no accessors) holding a primitive string.
// Symbol keys are rejected. Returns the five string values, or null.
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

// True when the value passes the schema gate only (used by the
// controller to decide whether a draft shape is usable).
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity and unpaired-surrogate checks shared by every field,
// in the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate one rate field: EMPTY, then ASCII decimal-integer grammar
// (INTEGER_FORMAT), then the pinned range (RANGE).
function parseRate(field, raw) {
  if (raw === "") return fieldError("EMPTY", field);
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field);
  const value = Number(raw);
  const range = RATE_RANGES[field];
  if (value < range.min || value > range.max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate the whole input: schema first, then fields in the fixed
// order text, zhSilentRate, zhSpeakRate, enSilentRate, enSpeakRate;
// inside each field, capacity -> surrogate -> empty -> grammar ->
// range. The first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("text", values.text);
  if (failure !== null) return failure;
  if (values.text === "") return fieldError("EMPTY", "text");

  const rates = {};
  for (const field of ["zhSilentRate", "zhSpeakRate", "enSilentRate", "enSpeakRate"]) {
    failure = checkCapacityAndUnicode(field, values[field]);
    if (failure !== null) return failure;
    const parsed = parseRate(field, values[field]);
    if (!parsed.ok) return parsed;
    rates[field] = parsed.value;
  }

  return { ok: true, values: { text: values.text, ...rates } };
}

// Round a non-negative exact rational (numerator / denominator,
// BigInt) half-up to a whole number, exactly once:
// floor(n/d + 1/2) = floor((2n + d) / 2d).
function roundHalfUp(numerator, denominator) {
  return Number((2n * numerator + denominator) / (2n * denominator));
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { text, zhSilentRate, zhSpeakRate, enSilentRate, enSpeakRate } = validated.values;
  const { cjkChars, latinWords } = countText(text);

  // Exact rational seconds, rounded half-up exactly once on the
  // total (SPEC section 3, step 4):
  // silent = 60*cjk/zhSilent + 60*words/enSilent
  // speak  = 60*cjk/zhSpeak  + 60*words/enSpeak
  const cjk = BigInt(cjkChars);
  const words = BigInt(latinWords);
  const silentNumerator =
    60n * cjk * BigInt(enSilentRate) + 60n * words * BigInt(zhSilentRate);
  const silentDenominator = BigInt(zhSilentRate) * BigInt(enSilentRate);
  const speakNumerator =
    60n * cjk * BigInt(enSpeakRate) + 60n * words * BigInt(zhSpeakRate);
  const speakDenominator = BigInt(zhSpeakRate) * BigInt(enSpeakRate);
  const silentSeconds = roundHalfUp(silentNumerator, silentDenominator);
  const speakSeconds = roundHalfUp(speakNumerator, speakDenominator);

  const result = {
    cjkChars,
    latinWords,
    silentSeconds,
    speakSeconds,
    silentDisplay: formatDuration(silentSeconds),
    speakDisplay: formatDuration(speakSeconds),
  };

  // Report cap backstop (SPEC section 3, step 6): a result over the
  // cap is an OUTPUT_LIMIT error instead of a success. With the
  // pinned ranges a real result is a few hundred bytes, so this never
  // fires for a genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Duration display, from the already-rounded whole seconds only:
// M:SS below one hour, H:MM:SS at or above one hour (no upper bound
// on hours). 0 seconds displays as 0:00.
export function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const rest = seconds - hours * 3600;
    return `${hours}:${pad2(Math.floor(rest / 60))}:${pad2(rest % 60)}`;
  }
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;
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
