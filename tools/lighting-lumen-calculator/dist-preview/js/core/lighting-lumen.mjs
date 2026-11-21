// Pure core for the Lighting Lumen Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md
// (spec-lighting-lumen-calculator-20261109): the simple lumen method
// (total lumens = area x target illuminance) with the pinned target
// illuminance table (GB 50034-2013 Table 5.1.1 general-activity values,
// corridors from EN 12464-1:2021), exact rational arithmetic (BigInt
// numerator/denominator) throughout, and half-up rounding applied
// exactly once per output. 1 ping = 400/121 m^2 exactly.

export const FIELDS = [
  "mode",
  "lengthM",
  "widthM",
  "areaUnit",
  "areaValue",
  "roomType",
  "bulbLumens",
];

export const NUMERIC_FIELDS = ["lengthM", "widthM", "areaValue", "bulbLumens"];

// Maximum raw length per numeric field, in UTF-16 code units (SPEC
// inputsOutputs). Enum fields (mode, areaUnit, roomType) have no
// capacity limit: a non-enum value is ENUM, and the legal value
// "dimensions" is itself 10 units long.
export const RAW_LIMITS = {
  lengthM: 8,
  widthM: 8,
  areaValue: 8,
  bulbLumens: 8,
};

export const DEFAULTS = {
  mode: "dimensions",
  lengthM: "4.0",
  widthM: "3.5",
  areaUnit: "m2",
  areaValue: "20.00",
  roomType: "living",
  bulbLumens: "800",
};

// The example draft; identical to the default draft by design (SPEC
// userFlow) and to the living-dimensions-basic fixture input.
export const EXAMPLE = {
  mode: "dimensions",
  lengthM: "4.0",
  widthM: "3.5",
  areaUnit: "m2",
  areaValue: "20.00",
  roomType: "living",
  bulbLumens: "800",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "lighting-lumen-report.json";

// Pinned target illuminance table (SPEC scope), in lux.
export const ROOM_TARGET_LUX = {
  living: 100,
  bedroom: 75,
  kitchen: 100,
  bathroom: 100,
  study: 300,
  corridor: 100,
};

// Room labels and the pinned source line of each row, for display only.
export const ROOM_TYPES = {
  living: {
    lux: 100,
    label: { zh: "客廳", en: "Living room" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 起居室·一般活動",
      en: "GB 50034-2013 Table 5.1.1, living room — general activity",
    },
  },
  bedroom: {
    lux: 75,
    label: { zh: "臥室", en: "Bedroom" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 臥室·一般活動",
      en: "GB 50034-2013 Table 5.1.1, bedroom — general activity",
    },
  },
  kitchen: {
    lux: 100,
    label: { zh: "廚房", en: "Kitchen" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 廚房·一般活動",
      en: "GB 50034-2013 Table 5.1.1, kitchen — general activity",
    },
  },
  bathroom: {
    lux: 100,
    label: { zh: "浴室", en: "Bathroom" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 衛生間",
      en: "GB 50034-2013 Table 5.1.1, bathroom",
    },
  },
  study: {
    lux: 300,
    label: { zh: "書房／辦公", en: "Study / office" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 起居室·書寫、閱讀",
      en: "GB 50034-2013 Table 5.1.1, living room — writing and reading",
    },
  },
  corridor: {
    lux: 100,
    label: { zh: "走廊", en: "Corridor" },
    source: {
      zh: "EN 12464-1:2021 流通區域與走廊",
      en: "EN 12464-1:2021, circulation areas and corridors",
    },
  },
};

// Pinned status announcements (SPEC userFlow).
export const STATUS_TEXT = {
  empty: { zh: "請輸入房間資訊，或載入範例。", en: "Enter the room details, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  unavailable: { zh: "背景計算不可用", en: "Background calculation unavailable" },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

// Decimal grammar: ASCII ^(0|[1-9][0-9]*)(\.[0-9]+)?$ with at most
// one decimal place (lengthM/widthM) or two (areaValue).
const DECIMAL_1_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;
const DECIMAL_2_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

// Scaled-integer ranges (lengthM/widthM in tenths, areaValue in
// hundredths, bulbLumens as an integer).
const LENGTH_MIN_TENTHS = 5n;
const LENGTH_MAX_TENTHS = 1000n;
const AREA_M2_MIN_HUNDREDTHS = 25n;
const AREA_M2_MAX_HUNDREDTHS = 1000000n;
const AREA_PING_MIN_HUNDREDTHS = 8n;
const AREA_PING_MAX_HUNDREDTHS = 300000n;
const BULB_MIN = 1n;
const BULB_MAX = 100000n;

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
// whose own enumerable properties are exactly the seven fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the seven string values, or null.
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

// Capacity and unpaired-surrogate checks for a numeric field, in the
// SPEC's order: INPUT_LIMIT first, then UNICODE. These apply even to
// inactive numeric fields.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Surrogate check for an enum field (no capacity limit on enums).
function checkUnicode(field, raw) {
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Parse a grammar-valid decimal string into a scaled BigInt: the value
// times 10^scale. The grammar guarantees the shape, so the split cannot
// fail.
function parseDecimalScaled(raw, scale) {
  const [whole, fraction = ""] = raw.split(".");
  const padded = fraction.padEnd(scale, "0");
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(padded === "" ? "0" : padded);
}

// Validate an active length/width string (non-empty): grammar
// (DECIMAL_FORMAT, at most one decimal place), then range 0.5-100.0 m
// (RANGE). Returns the scaled integer (tenths of a metre) on success.
function parseLength(raw, field) {
  if (!DECIMAL_1_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const value = parseDecimalScaled(raw, 1);
  if (value < LENGTH_MIN_TENTHS || value > LENGTH_MAX_TENTHS) {
    return fieldError("RANGE", field);
  }
  return { ok: true, value };
}

// Validate an active area string (non-empty): grammar (DECIMAL_FORMAT,
// at most two decimal places), then the range for the chosen unit
// (RANGE). Returns the scaled integer (hundredths) on success.
function parseArea(raw, unit) {
  if (!DECIMAL_2_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", "areaValue");
  const value = parseDecimalScaled(raw, 2);
  const min = unit === "ping" ? AREA_PING_MIN_HUNDREDTHS : AREA_M2_MIN_HUNDREDTHS;
  const max = unit === "ping" ? AREA_PING_MAX_HUNDREDTHS : AREA_M2_MAX_HUNDREDTHS;
  if (value < min || value > max) return fieldError("RANGE", "areaValue");
  return { ok: true, value };
}

// Validate the bulb string (non-empty): integer grammar
// (INTEGER_FORMAT), then range 1-100000 (RANGE).
function parseBulb(raw) {
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", "bulbLumens");
  const value = BigInt(raw);
  if (value < BULB_MIN || value > BULB_MAX) return fieldError("RANGE", "bulbLumens");
  return { ok: true, value };
}

// Validate the whole input: schema first, then fields in the fixed
// order mode, lengthM, widthM, areaUnit, areaValue, roomType,
// bulbLumens; the first error wins. An inactive numeric field receives
// only its capacity and surrogate checks and its content is otherwise
// ignored; an inactive enum field is not checked at all. If mode
// itself fails validation, checking stops at mode.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkUnicode("mode", values.mode);
  if (failure !== null) return failure;
  if (values.mode !== "dimensions" && values.mode !== "area") {
    return fieldError("ENUM", "mode");
  }
  const mode = values.mode;
  const dimensionsMode = mode === "dimensions";

  // lengthM: capacity and surrogate checks in both modes; the
  // remaining checks only when dimensions is active.
  failure = checkCapacityAndUnicode("lengthM", values.lengthM);
  if (failure !== null) return failure;
  let lengthTenths = null;
  if (dimensionsMode) {
    if (values.lengthM === "") return fieldError("EMPTY", "lengthM");
    const parsed = parseLength(values.lengthM, "lengthM");
    if (!parsed.ok) return parsed;
    lengthTenths = parsed.value;
  }

  // widthM: same shape as lengthM.
  failure = checkCapacityAndUnicode("widthM", values.widthM);
  if (failure !== null) return failure;
  let widthTenths = null;
  if (dimensionsMode) {
    if (values.widthM === "") return fieldError("EMPTY", "widthM");
    const parsed = parseLength(values.widthM, "widthM");
    if (!parsed.ok) return parsed;
    widthTenths = parsed.value;
  }

  // areaUnit: not checked at all when dimensions is active.
  let areaUnit = null;
  if (!dimensionsMode) {
    failure = checkUnicode("areaUnit", values.areaUnit);
    if (failure !== null) return failure;
    if (values.areaUnit !== "m2" && values.areaUnit !== "ping") {
      return fieldError("ENUM", "areaUnit");
    }
    areaUnit = values.areaUnit;
  }

  // areaValue: capacity and surrogate checks in both modes; the
  // remaining checks only when area is active.
  failure = checkCapacityAndUnicode("areaValue", values.areaValue);
  if (failure !== null) return failure;
  let areaHundredths = null;
  if (!dimensionsMode) {
    if (values.areaValue === "") return fieldError("EMPTY", "areaValue");
    const parsed = parseArea(values.areaValue, areaUnit);
    if (!parsed.ok) return parsed;
    areaHundredths = parsed.value;
  }

  // roomType: always active.
  failure = checkUnicode("roomType", values.roomType);
  if (failure !== null) return failure;
  if (!Object.hasOwn(ROOM_TARGET_LUX, values.roomType)) {
    return fieldError("ENUM", "roomType");
  }

  // bulbLumens: always active.
  failure = checkCapacityAndUnicode("bulbLumens", values.bulbLumens);
  if (failure !== null) return failure;
  if (values.bulbLumens === "") return fieldError("EMPTY", "bulbLumens");
  const bulbParsed = parseBulb(values.bulbLumens);
  if (!bulbParsed.ok) return bulbParsed;

  return {
    ok: true,
    values: {
      mode,
      lengthTenths,
      widthTenths,
      areaUnit,
      areaHundredths,
      roomType: values.roomType,
      bulbLumens: bulbParsed.value,
    },
  };
}

// roundHalfUp for a non-negative rational num/den: floor(num/den + 1/2).
// Exactly 0.5 always rounds up (never banker's rounding).
function roundHalfUpDiv(num, den) {
  return (2n * num + den) / (2n * den);
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { mode, lengthTenths, widthTenths, areaUnit, areaHundredths, roomType, bulbLumens } =
    validated.values;

  // Exact area in m^2 as a rational areaNum/areaDen (never rounded
  // before use). dimensions: (L/10) x (W/10); m2: value/100; ping:
  // value/100 x 400/121.
  let areaNum;
  let areaDen;
  if (mode === "dimensions") {
    areaNum = lengthTenths * widthTenths;
    areaDen = 100n;
  } else if (areaUnit === "m2") {
    areaNum = areaHundredths;
    areaDen = 100n;
  } else {
    areaNum = areaHundredths * 400n;
    areaDen = 12100n;
  }

  const targetLux = ROOM_TARGET_LUX[roomType];

  // totalLumens = roundHalfUp(area x targetLux), an integer.
  const totalLumens = roundHalfUpDiv(areaNum * BigInt(targetLux), areaDen);

  // bulbCount = ceil(totalLumens / bulbLumens), computed from the
  // already-rounded total so the three displayed numbers stay mutually
  // checkable. installedLumens = bulbCount x bulbLumens.
  const bulbCount = (totalLumens + bulbLumens - 1n) / bulbLumens;
  const installedLumens = bulbCount * bulbLumens;

  // achievedLux = roundHalfUp to 1 decimal of installedLumens / area
  // (exact, unrounded area). areaM2 = roundHalfUp to 2 decimals of the
  // exact area. Each is rounded exactly once, at output.
  const achievedTenths = roundHalfUpDiv(installedLumens * 10n * areaDen, areaNum);
  const achievedLux = Number(achievedTenths) / 10;
  const areaHundredthsRounded = roundHalfUpDiv(areaNum * 100n, areaDen);
  const areaM2 = Number(areaHundredthsRounded) / 100;

  const result = {
    areaM2,
    targetLux,
    totalLumens: Number(totalLumens),
    bulbCount: Number(bulbCount),
    installedLumens: Number(installedLumens),
    achievedLux,
  };

  // Report cap backstop (SPEC inputsOutputs): a result over the cap
  // is an OUTPUT_LIMIT error instead of a success. With the pinned
  // ranges a real result is a few hundred bytes, so this never fires
  // for a genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Display formatting (app layer, never feeds back into machine values).
// Groups the integer part with commas; keeps the fraction as written
// (trailing zeros already dropped by the numeric value).
export function formatDecimal(value) {
  const text = String(value);
  const [whole, fraction] = text.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export function formatInteger(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
