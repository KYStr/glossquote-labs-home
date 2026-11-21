// Pure core for the Inflation Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-inflation-calculator-20261109):
// a constant annual inflation rate mode (future nominal amount, real
// purchasing power, cumulative inflation, year-by-year table) and a CPI
// index mode (converted amount, cumulative change, equivalent annual
// rate). All arithmetic is IEEE-754 double precision in the SPEC's
// pinned operation order; each output is rounded exactly once with the
// pinned roundD (half up toward +infinity). A non-finite purchasing
// power (factor underflow) is null, never Infinity or NaN.

export const RATE_FIELDS = ["mode", "amount", "annualRatePercent", "years"];
export const CPI_FIELDS = [
  "mode",
  "amount",
  "cpiFrom",
  "cpiTo",
  "labelFrom",
  "labelTo",
  "yearsBetween",
];
export const ALL_FIELDS = [
  "mode",
  "amount",
  "annualRatePercent",
  "years",
  "cpiFrom",
  "cpiTo",
  "labelFrom",
  "labelTo",
  "yearsBetween",
];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = {
  amount: 12,
  annualRatePercent: 8,
  years: 3,
  cpiFrom: 9,
  cpiTo: 9,
  labelFrom: 24,
  labelTo: 24,
  yearsBetween: 3,
};

// Maximum decimal places per DECIMAL field (SPEC inputsOutputs).
export const DECIMAL_PLACES = {
  amount: 2,
  annualRatePercent: 3,
  cpiFrom: 3,
  cpiTo: 3,
};

export const AMOUNT_MIN = 0;
export const AMOUNT_MAX = 999999999.99;
export const RATE_MIN_EXCLUSIVE = -100;
export const RATE_MAX = 1000;
export const YEARS_MIN = 0;
export const YEARS_MAX = 200;
export const CPI_MIN_EXCLUSIVE = 0;
export const CPI_MAX = 99999.999;
export const YEARS_BETWEEN_MIN = 1;
export const YEARS_BETWEEN_MAX = 200;

export const DEFAULTS = {
  mode: "rate",
  amount: "100000",
  annualRatePercent: "2",
  years: "10",
};

export const CPI_DEFAULTS = {
  mode: "cpi",
  amount: "100000",
  cpiFrom: "100.0",
  cpiTo: "102.0",
  labelFrom: "",
  labelTo: "",
  yearsBetween: null,
};

// The example draft; identical to the default rate draft by design
// (SPEC userFlow) and to the rate-basic fixture input.
export const EXAMPLE = {
  mode: "rate",
  amount: "100000",
  annualRatePercent: "2",
  years: "10",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "inflation-calculator-report.json";

// Pinned error messages (SPEC inputsOutputs).
export const ERROR_MESSAGES = {
  SCHEMA: {
    zh: "輸入結構不正確",
    en: "The input structure is invalid.",
  },
  INPUT_LIMIT: { zh: "輸入太長", en: "Input is too long." },
  UNICODE: {
    zh: "輸入包含不完整的 Unicode 字元",
    en: "Input contains an unpaired surrogate.",
  },
  EMPTY: { zh: "此欄必填", en: "This field is required." },
  DECIMAL_FORMAT: {
    zh: "請輸入有效的小數",
    en: "Enter a valid decimal number.",
  },
  INTEGER_FORMAT: {
    zh: "請輸入有效的整數",
    en: "Enter a valid whole number.",
  },
  RANGE: { zh: "數值超出允許範圍", en: "Value is outside the allowed range." },
  OUTPUT_LIMIT: {
    zh: "報告太大，無法產生",
    en: "The report is too large to generate.",
  },
  INTERNAL: { zh: "處理失敗，請重試", en: "Processing failed. Try again." },
  WORKER_ERROR: {
    zh: "處理失敗，請重試",
    en: "Processing failed. Try again.",
  },
};

// Pinned status announcements (SPEC userFlow).
export const STATUS_TEXT = {
  empty: { zh: "請輸入數字，或載入範例。", en: "Enter values, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const DECIMAL_PATTERN = /^[0-9]+(\.[0-9]+)?$/;
const SIGNED_DECIMAL_PATTERN = /^-?[0-9]+(\.[0-9]+)?$/;
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
// whose own enumerable properties are exactly the key set of its mode,
// each an own data property; every value is a string except yearsBetween,
// which may also be null. Symbol keys are rejected. Returns the values
// object, or null.
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
  let modeDescriptor;
  try {
    modeDescriptor = Object.getOwnPropertyDescriptor(input, "mode");
  } catch {
    return null;
  }
  if (modeDescriptor === undefined || !("value" in modeDescriptor)) return null;
  const mode = modeDescriptor.value;
  if (mode !== "rate" && mode !== "cpi") return null;
  const expectedFields = mode === "rate" ? RATE_FIELDS : CPI_FIELDS;
  if (keys.length !== expectedFields.length) return null;
  const values = {};
  for (const field of expectedFields) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    const value = descriptor.value;
    if (field === "yearsBetween") {
      if (value !== null && typeof value !== "string") return null;
    } else if (typeof value !== "string") {
      return null;
    }
    values[field] = value;
  }
  return values;
}

// True when the value passes the schema gate only.
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

// Validate a DECIMAL field (non-empty raw): grammar, then range.
// `signed` allows a leading "-" (only annualRatePercent). The grammar
// guarantees Number() parses the value exactly as written.
function parseDecimal(raw, field, signed, minExclusive, minInclusive, max) {
  const pattern = signed ? SIGNED_DECIMAL_PATTERN : DECIMAL_PATTERN;
  if (!pattern.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const dotIndex = raw.indexOf(".");
  if (dotIndex !== -1 && raw.length - dotIndex - 1 > DECIMAL_PLACES[field]) {
    return fieldError("DECIMAL_FORMAT", field);
  }
  const value = Number(raw);
  if (minExclusive !== null && !(value > minExclusive)) {
    return fieldError("RANGE", field);
  }
  if (minInclusive !== null && value < minInclusive) {
    return fieldError("RANGE", field);
  }
  if (value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate an INTEGER field (non-empty raw): grammar, then range.
function parseInteger(raw, field, min, max) {
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field);
  const value = Number(raw);
  if (value < min || value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Trim only U+0020 from both ends (SPEC label rule).
function trimSpaces(text) {
  let start = 0;
  let end = text.length;
  while (start < end && text.charCodeAt(start) === 0x20) start += 1;
  while (end > start && text.charCodeAt(end - 1) === 0x20) end -= 1;
  return text.slice(start, end);
}

// Validate the whole input: schema first, then fields in the fixed
// per-mode order; the first error wins. yearsBetween may be null (no
// equivalent annual rate) or an empty string, which the app sends as
// null; a blank optional value means "not given".
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("amount", values.amount);
  if (failure !== null) return failure;
  if (values.amount === "") return fieldError("EMPTY", "amount");
  let parsed = parseDecimal(values.amount, "amount", false, null, AMOUNT_MIN, AMOUNT_MAX);
  if (!parsed.ok) return parsed;
  const amount = parsed.value;

  if (values.mode === "rate") {
    failure = checkCapacityAndUnicode("annualRatePercent", values.annualRatePercent);
    if (failure !== null) return failure;
    if (values.annualRatePercent === "") return fieldError("EMPTY", "annualRatePercent");
    parsed = parseDecimal(
      values.annualRatePercent,
      "annualRatePercent",
      true,
      RATE_MIN_EXCLUSIVE,
      null,
      RATE_MAX,
    );
    if (!parsed.ok) return parsed;
    const annualRatePercent = parsed.value;

    failure = checkCapacityAndUnicode("years", values.years);
    if (failure !== null) return failure;
    if (values.years === "") return fieldError("EMPTY", "years");
    parsed = parseInteger(values.years, "years", YEARS_MIN, YEARS_MAX);
    if (!parsed.ok) return parsed;
    const years = parsed.value;

    return { ok: true, values: { mode: "rate", amount, annualRatePercent, years } };
  }

  failure = checkCapacityAndUnicode("cpiFrom", values.cpiFrom);
  if (failure !== null) return failure;
  if (values.cpiFrom === "") return fieldError("EMPTY", "cpiFrom");
  parsed = parseDecimal(values.cpiFrom, "cpiFrom", false, CPI_MIN_EXCLUSIVE, null, CPI_MAX);
  if (!parsed.ok) return parsed;
  const cpiFrom = parsed.value;

  failure = checkCapacityAndUnicode("cpiTo", values.cpiTo);
  if (failure !== null) return failure;
  if (values.cpiTo === "") return fieldError("EMPTY", "cpiTo");
  parsed = parseDecimal(values.cpiTo, "cpiTo", false, CPI_MIN_EXCLUSIVE, null, CPI_MAX);
  if (!parsed.ok) return parsed;
  const cpiTo = parsed.value;

  failure = checkCapacityAndUnicode("labelFrom", values.labelFrom);
  if (failure !== null) return failure;
  const labelFrom = trimSpaces(values.labelFrom);
  if (labelFrom === "") return fieldError("EMPTY", "labelFrom");

  failure = checkCapacityAndUnicode("labelTo", values.labelTo);
  if (failure !== null) return failure;
  const labelTo = trimSpaces(values.labelTo);
  if (labelTo === "") return fieldError("EMPTY", "labelTo");

  let yearsBetween = null;
  if (values.yearsBetween !== null && values.yearsBetween !== "") {
    failure = checkCapacityAndUnicode("yearsBetween", values.yearsBetween);
    if (failure !== null) return failure;
    parsed = parseInteger(
      values.yearsBetween,
      "yearsBetween",
      YEARS_BETWEEN_MIN,
      YEARS_BETWEEN_MAX,
    );
    if (!parsed.ok) return parsed;
    yearsBetween = parsed.value;
  } else if (values.yearsBetween !== null) {
    // Empty string for the optional field: capacity/surrogate still apply.
    failure = checkCapacityAndUnicode("yearsBetween", values.yearsBetween);
    if (failure !== null) return failure;
  }

  return {
    ok: true,
    values: { mode: "cpi", amount, cpiFrom, cpiTo, labelFrom, labelTo, yearsBetween },
  };
}

// Pinned rounding: roundD(x, d) = Math.floor(x * 10^d + 0.5) / 10^d,
// applied exactly once per output, from the unrounded double value.
// For negative x this rounds half up toward +infinity, as pinned.
function roundD(value, decimals) {
  const scale = 10 ** decimals;
  return Math.floor(value * scale + 0.5) / scale;
}

function round2(value) {
  return roundD(value, 2);
}

function round4(value) {
  return roundD(value, 4);
}

// A purchasing-power quotient that is not finite becomes null (SPEC
// non-finite rule: factor underflow to +0); otherwise it is rounded once.
// The rounded value is checked too: a finite quotient near the double
// maximum (about 1e307) would overflow to Infinity when round2
// multiplies by 100, and the SPEC forbids Infinity as a purchasing
// power ("不得以 Infinity、NaN 或 0 冒充購買力"), so that row is null
// as well. The pinned underflow check asserts only the title values,
// not per-row values, so this does not conflict with any fixture.
function purchasingPower(amount, factor) {
  const quotient = amount / factor;
  if (!Number.isFinite(quotient)) return null;
  const rounded = round2(quotient);
  if (!Number.isFinite(rounded)) return null;
  return rounded;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const values = validated.values;

  let result;
  if (values.mode === "rate") {
    const { amount, annualRatePercent, years } = values;
    // Pinned operation order: base = 1 + r / 100 (divide first, then add).
    const base = 1 + annualRatePercent / 100;
    const factor = Math.pow(base, years);
    const yearTable = [];
    for (let k = 0; k <= years; k += 1) {
      // Each row is recomputed independently with Math.pow(base, k);
      // never iterative multiplication.
      const fk = Math.pow(base, k);
      yearTable.push({
        year: k,
        nominalValue: round2(amount * fk),
        purchasingPower: purchasingPower(amount, fk),
      });
    }
    result = {
      cumulativePercent: round2((factor - 1) * 100),
      futureValue: round2(amount * factor),
      purchasingPower: purchasingPower(amount, factor),
      yearTable,
    };
  } else {
    const { amount, cpiFrom, cpiTo, labelFrom, labelTo, yearsBetween } = values;
    // Pinned operation order: ratio = t / f (divide first).
    const ratio = cpiTo / cpiFrom;
    let equivalentAnnualRatePercent = null;
    if (yearsBetween !== null) {
      const exponent = 1 / yearsBetween;
      equivalentAnnualRatePercent = round4((Math.pow(ratio, exponent) - 1) * 100);
    }
    result = {
      adjustedAmount: round2(amount * ratio),
      cumulativePercent: round2((ratio - 1) * 100),
      equivalentAnnualRatePercent,
      fromLabel: labelFrom,
      toLabel: labelTo,
    };
  }

  // Report cap backstop (SPEC inputsOutputs): a result over the cap is
  // an OUTPUT_LIMIT error instead of a success. With the pinned ranges
  // a real result is at most ~15 KB (201-row table), so this never fires
  // for a genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Display formatting (app layer, never feeds back into machine values):
// thousands grouped with a fixed comma, decimals kept as written by
// String(value). No locale-sensitive formatting is used anywhere.
export function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value);
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction] = unsigned.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rendered = fraction === undefined ? grouped : `${grouped}.${fraction}`;
  return negative ? `-${rendered}` : rendered;
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value)}%`;
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
