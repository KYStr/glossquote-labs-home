// Pure core for the Ideal Weight Calculator. Synchronous data in, data
// out: no DOM, no network, no storage, no timers. Implements the fixed
// contract of SPEC spec-ideal-weight-calculator-20261109: strict schema
// over own data properties, the pinned per-field validation order
// (INPUT_LIMIT, UNICODE, EMPTY, grammar/ENUM, RANGE), exact rational
// arithmetic with BigInt (no binary floating point anywhere in the
// derivation), the WHO healthy range (BMI 18.5-24.9), the BMI-22
// reference weight, and the four published formulas Devine (1974),
// Robinson (1983), Miller (1983) and Hamwi (1964, computed in pounds
// and converted with the exact 1 lb = 0.45359237 kg). Every output is
// rounded half-up exactly once, from the exact value, to one decimal.

export const FIELDS = ["heightCm", "sex"];

// Maximum raw length per field, in UTF-16 code units (SPEC: 8).
export const MAX_INPUT_UNITS = 8;

// Height range in tenths of a centimetre: 130.0-230.0 cm, endpoints
// included.
export const MIN_HEIGHT_TENTHS = 1300n;
export const MAX_HEIGHT_TENTHS = 2300n;

export const DEFAULTS = { heightCm: "", sex: "female" };

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = { heightCm: "170", sex: "male" };

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "ideal-weight-report.json";

// WHO adult healthy band, pinned by the SPEC (display range).
export const WHO_BMI_LOW = "18.5";
export const WHO_BMI_HIGH = "24.9";
export const BMI22_REFERENCE = "22";

// Formula constants, pinned by the SPEC and AUTHOR-CHECK.md. Devine,
// Robinson and Miller are kg-native: base kg at 5 ft plus kg per inch
// over 5 ft. Hamwi is lb-native: base lb at 5 ft plus lb per inch over
// 5 ft, converted with the exact 1 lb = 0.45359237 kg. Each entry is
// [male, female] as exact decimal strings.
export const FORMULA_CONSTANTS = {
  devine: { baseKg: ["50", "45.5"], perInchKg: ["2.3", "2.3"] },
  robinson: { baseKg: ["52", "49"], perInchKg: ["1.9", "1.7"] },
  miller: { baseKg: ["56.2", "53.1"], perInchKg: ["1.41", "1.36"] },
  hamwi: { baseLb: ["106", "100"], perInchLb: ["6", "5"] },
};

export const FORMULA_ORDER = ["devine", "robinson", "miller", "hamwi"];

// Bilingual messages. EMPTY and RANGE are field specific; the rest are
// per code.
export const ERROR_MESSAGES = {
  SCHEMA: { "zh-Hant": "輸入格式不正確", en: "The input is malformed." },
  INPUT_LIMIT: { "zh-Hant": "輸入太長", en: "Input is too long." },
  UNICODE: { "zh-Hant": "輸入含有無效字元", en: "Input contains an invalid character." },
  DECIMAL_FORMAT: {
    "zh-Hant": "身高必須是數字，最多一位小數",
    en: "Height must be a number with at most one decimal place.",
  },
  ENUM: {
    "zh-Hant": "性別只能是男性或女性",
    en: "Sex must be male or female.",
  },
  INTERNAL: { "zh-Hant": "發生錯誤，請再試一次", en: "Something went wrong. Try again." },
  EMPTY: {
    heightCm: { "zh-Hant": "請輸入身高", en: "Enter the height." },
    sex: { "zh-Hant": "請選擇性別", en: "Choose the sex." },
  },
  RANGE: {
    heightCm: {
      "zh-Hant": "身高必須介於 130.0 到 230.0 公分",
      en: "Height must be between 130.0 and 230.0 cm.",
    },
  },
};

// Resolves the pinned display text for an error object. Field-specific
// codes (EMPTY, RANGE) look up by field; combinations the SPEC does not
// pin fall back to the INTERNAL text.
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

// Schema gate: the input must be a plain object whose own properties are
// exactly the two fields, each an own data property (no accessors)
// holding a string. Anything else — unknown or missing keys, wrong types,
// getters — is SCHEMA with field/row null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const values = {};
  for (const field of FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  return values;
}

// UNICODE check, pinned by the SPEC: unpaired surrogates, C0/C1 control
// characters, or Cf format characters.
const CONTROL_PATTERN = /[\u0000-\u001F\u007F-\u009F]/;
const FORMAT_PATTERN = /\p{Cf}/u;

function hasInvalidUnicode(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return CONTROL_PATTERN.test(text) || FORMAT_PATTERN.test(text);
}

// The checks shared by every field, in the SPEC's pinned order. Returns
// an error code or null.
function sharedFieldCheck(raw) {
  if (raw.length > MAX_INPUT_UNITS) return "INPUT_LIMIT";
  if (hasInvalidUnicode(raw)) return "UNICODE";
  if (raw === "") return "EMPTY";
  return null;
}

const HEIGHT_GRAMMAR = /^[0-9]+(\.[0-9])?$/;

// Parses a grammar-valid height string into tenths of a centimetre as a
// BigInt. "170" -> 1700n, "175.5" -> 1755n.
function parseHeightTenths(raw) {
  const dot = raw.indexOf(".");
  const integerPart = dot === -1 ? raw : raw.slice(0, dot);
  const fractionPart = dot === -1 ? "" : raw.slice(dot + 1);
  return BigInt(integerPart) * 10n + BigInt(fractionPart === "" ? "0" : fractionPart);
}

// Floor division for BigInt with a positive divisor (BigInt `/`
// truncates toward zero, which is wrong for negative dividends).
function floorDiv(a, b) {
  const q = a / b;
  const r = a % b;
  return r === 0n || (r > 0n) === (b > 0n) ? q : q - 1n;
}

// Half-up rounding of the rational num/den to one decimal; returns the
// tenths as a BigInt: floor((20*num + den) / (2*den)). All outputs are
// positive inside the pinned height range, but the helper is exact for
// negative values too.
function roundToTenths(num, den) {
  return floorDiv(20n * num + den, 2n * den);
}

// Outputs are bounded by the input ranges, so every BigInt result
// converts to an exact safe integer.
function toSafeNumber(value) {
  const num = Number(value);
  if (!Number.isSafeInteger(num)) {
    throw new Error("Result outside the safe-integer range");
  }
  return num;
}

// Parses an exact decimal string ("45.5", "2.3", "106") into a
// numerator/denominator pair of BigInts.
function parseDecimal(text) {
  const dot = text.indexOf(".");
  if (dot === -1) return [BigInt(text), 1n];
  const scale = 10n ** BigInt(text.length - dot - 1);
  return [BigInt(text.slice(0, dot) + text.slice(dot + 1)), scale];
}

export function run(input) {
  try {
    const values = readSchema(input);
    if (values === null) return failure("SCHEMA", null);

    // Field order is pinned: heightCm, then sex. Within each field:
    // INPUT_LIMIT, UNICODE, EMPTY, grammar/ENUM, RANGE.
    let code = sharedFieldCheck(values.heightCm);
    if (code !== null) return failure(code, "heightCm");
    if (!HEIGHT_GRAMMAR.test(values.heightCm)) return failure("DECIMAL_FORMAT", "heightCm");
    const heightTenths = parseHeightTenths(values.heightCm);
    if (heightTenths < MIN_HEIGHT_TENTHS || heightTenths > MAX_HEIGHT_TENTHS) {
      return failure("RANGE", "heightCm");
    }

    code = sharedFieldCheck(values.sex);
    if (code !== null) return failure(code, "sex");
    if (values.sex !== "male" && values.sex !== "female") return failure("ENUM", "sex");
    const sexIndex = values.sex === "male" ? 0 : 1;

    // Exact rational derivation. Height in cm is H/10 where H is the
    // integer tenths; h2 = (H/1000)^2 = H^2 / 10^6.
    const h = heightTenths;
    const h2Num = h * h;
    const h2Den = 1000000n;

    // WHO range and BMI-22 reference: low = 18.5 * h2, high = 24.9 * h2,
    // bmi22 = 22 * h2.
    const lowKg = toSafeNumber(roundToTenths(37n * h2Num, 2n * h2Den)) / 10;
    const highKg = toSafeNumber(roundToTenths(249n * h2Num, 10n * h2Den)) / 10;
    const bmi22Kg = toSafeNumber(roundToTenths(22n * h2Num, h2Den)) / 10;

    // Inches, exact: heightCm / 2.54 = heightCm * 50 / 127 = 5H / 127.
    // E = inches - 60 = (5H - 7620) / 127. E may be negative below 5 ft;
    // the formulas extend along the same straight line (SPEC, pinned).
    const inchesNum = 5n * h;
    const inchesDen = 127n;
    const heightInches = toSafeNumber(roundToTenths(inchesNum, inchesDen)) / 10;
    const eNum = 5n * h - 7620n;
    const eDen = 127n;

    // Each formula: value = base + k * E, computed as one exact rational
    // and rounded half-up once, from the exact value, to one decimal.
    const formulasKg = {};
    for (const key of ["devine", "robinson", "miller"]) {
      const constants = FORMULA_CONSTANTS[key];
      const [baseNum, baseDen] = parseDecimal(constants.baseKg[sexIndex]);
      const [kNum, kDen] = parseDecimal(constants.perInchKg[sexIndex]);
      const num = baseNum * kDen * eDen + baseDen * kNum * eNum;
      const den = baseDen * kDen * eDen;
      formulasKg[key] = toSafeNumber(roundToTenths(num, den)) / 10;
    }
    // Hamwi: computed in pounds first, then converted with the exact
    // 1 lb = 0.45359237 kg. lb = baseLb + kLb * E.
    {
      const constants = FORMULA_CONSTANTS.hamwi;
      const baseLb = BigInt(constants.baseLb[sexIndex]);
      const kLb = BigInt(constants.perInchLb[sexIndex]);
      const lbNum = baseLb * eDen + kLb * eNum;
      const lbDen = eDen;
      const kgNum = lbNum * 45359237n;
      const kgDen = lbDen * 100000000n;
      formulasKg.hamwi = toSafeNumber(roundToTenths(kgNum, kgDen)) / 10;
    }

    return {
      ok: true,
      result: {
        bmi22Kg,
        formulasKg: {
          devine: formulasKg.devine,
          hamwi: formulasKg.hamwi,
          miller: formulasKg.miller,
          robinson: formulasKg.robinson,
        },
        healthyRangeKg: { highKg, lowKg },
        heightCm: toSafeNumber(h) / 10,
        heightInches,
        sex: values.sex,
      },
    };
  } catch {
    return failure("INTERNAL", null);
  }
}

// Display formatting: every output is a multiple of 0.1 by construction,
// so the tenths integer is recovered exactly and shown with one decimal.
export function formatOneDecimal(value) {
  const tenths = Math.round(value * 10);
  const sign = tenths < 0 ? "-" : "";
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10}`;
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
