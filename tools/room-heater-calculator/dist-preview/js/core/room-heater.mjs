// Pure core for the Room Heater Calculator
// (spec-room-heater-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. The
// rules are the SPEC's literal §inputsOutputs, applied in the SPEC's
// order:
//   areaM2 = area (m2) or area x 400/121 (ping), exact rational;
//   volumeM3 = areaM2 x ceilingHeight;
//   rawWatts = areaM2 x wPerM2 x (ceilingHeight / 2.4);
//   requiredWatts = rawWatts rounded UP to a multiple of 10 (from
//     the unrounded raw value; an exact multiple is unchanged);
//   requiredWatts <= 3000: recommendedWatts is the smallest standard
//     size >= requiredWatts, units = 1;
//   requiredWatts > 3000: units = ceil(requiredWatts / 2000),
//     recommendedWatts = units x 2000.
// The W/m2 table (good 60 / average 80 / poor 130) is the SPEC's
// pinned Adax by Solaire buying-guide rule of thumb, disclosed as a
// rule of thumb and not an engineering heat-loss standard.
// All arithmetic is exact BigInt rational arithmetic (the SPEC
// forbids binary floating point for the final wattage); display
// rounding is half-up, applied only at display time. The result
// shape follows fixtures.json exactly: {areaM2, volumeM3, wPerM2,
// rawWatts, requiredWatts, recommendedWatts, units}, where areaM2
// and volumeM3 are 2-decimal strings, rawWatts is a 1-decimal
// string, and the rest are integers.

export const FIELDS = ["area", "areaUnit", "ceilingHeight", "insulation"];

export const DEFAULTS = {
  area: "10",
  areaUnit: "m2",
  ceilingHeight: "2.4",
  insulation: "average",
};

// The worked example is fixtures.json case 1 (standard-bedroom)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  area: "10",
  areaUnit: "m2",
  ceilingHeight: "2.4",
  insulation: "average",
};

export const MAX_RAW_UNITS = 8;

export const AREA_UNIT_VALUES = ["m2", "ping"];
export const INSULATION_VALUES = ["good", "average", "poor"];

// Pinned §inputsOutputs W/m2 table (Adax by Solaire buying guide,
// rule of thumb, not an engineering heat-loss standard).
export const W_PER_M2 = { good: 60, average: 80, poor: 130 };

// Pinned §inputsOutputs standard sizes (W) and the multi-unit size.
export const STANDARD_SIZES = [400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000];
export const MULTI_UNIT_SIZE = 2000;
export const MULTI_UNIT_THRESHOLD = 3000;

// Converted-area range, in m2 (checked after the ping conversion).
export const AREA_M2_MIN_NUM = 1n;
export const AREA_M2_MIN_DEN = 2n;
export const AREA_M2_MAX = 200n;

// Ceiling-height range, in hundredths of a metre (2.00–4.00 m).
export const CEILING_HEIGHT_MIN = 200n;
export const CEILING_HEIGHT_MAX = 400n;

// 1 ping = 400/121 m2 (exact rational).
export const PING_NUM = 400n;
export const PING_DEN = 121n;

// Pinned §inputsOutputs note, shown when units > 1.
export const MULTI_UNIT_NOTE_ZH =
  "建議分裝多台，勿用單一延長線串接。";
export const MULTI_UNIT_NOTE_EN =
  "Use multiple units; do not daisy-chain on one extension cord.";

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

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
// fields.
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

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Shared capacity / surrogate / empty prefix of the SPEC's order.
// Returns an { error } outcome, or null when the raw value may
// proceed to grammar checks.
function checkPrefix(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  return null;
}

// Parses a validated decimal string (at most 2 fraction digits) into
// exact hundredths as a BigInt.
function parseHundredths(value) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

// Validates a decimal field (grammar, then range in hundredths).
// Returns { value } in hundredths, or an { error } outcome.
function validateDecimal(field, value, minHundredths, maxHundredths) {
  const prefix = checkPrefix(field, value);
  if (prefix) return prefix;
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const parsed = parseHundredths(value);
  if (parsed < minHundredths || parsed > maxHundredths) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

// Validates an enum field. Returns { value }, or an { error } outcome.
function validateEnum(field, value, allowed) {
  const prefix = checkPrefix(field, value);
  if (prefix) return prefix;
  if (!allowed.includes(value)) return { error: failure("ENUM", field) };
  return { value };
}

// Half-up rounding of a non-negative rational num/den to `places`
// decimal places, returned as the scaled integer (value * 10^places).
function roundHalfUp(num, den, places) {
  const scale = 10n ** BigInt(places);
  return (2n * num * scale + den) / (2n * den);
}

function formatFixed(scaled, places) {
  const scale = 10n ** BigInt(places);
  const whole = scaled / scale;
  const fraction = scaled % scale;
  return `${whole.toString()}.${fraction.toString().padStart(places, "0")}`;
}

function ceilDiv(num, den) {
  return (num + den - 1n) / den;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Field order per the SPEC: area, areaUnit, ceilingHeight,
  // insulation. The area range is checked on the converted area, so
  // it runs right after areaUnit is validated (the conversion needs
  // it) and before ceilingHeight.
  const areaPrefix = checkPrefix("area", raw.area);
  if (areaPrefix) return areaPrefix.error;
  if (!DECIMAL_PATTERN.test(raw.area)) return failure("DECIMAL_FORMAT", "area");
  const areaHundredths = parseHundredths(raw.area);

  const areaUnit = validateEnum("areaUnit", raw.areaUnit, AREA_UNIT_VALUES);
  if (areaUnit.error) return areaUnit.error;

  // Converted area as an exact rational num/den (m2).
  let areaNum;
  let areaDen;
  if (areaUnit.value === "ping") {
    areaNum = areaHundredths * PING_NUM;
    areaDen = 100n * PING_DEN;
  } else {
    areaNum = areaHundredths;
    areaDen = 100n;
  }
  if (areaNum * AREA_M2_MIN_DEN < AREA_M2_MIN_NUM * areaDen || areaNum > AREA_M2_MAX * areaDen) {
    return failure("RANGE", "area");
  }

  const height = validateDecimal(
    "ceilingHeight",
    raw.ceilingHeight,
    CEILING_HEIGHT_MIN,
    CEILING_HEIGHT_MAX,
  );
  if (height.error) return height.error;

  const insulation = validateEnum("insulation", raw.insulation, INSULATION_VALUES);
  if (insulation.error) return insulation.error;

  const wPerM2 = W_PER_M2[insulation.value];
  const heightHundredths = height.value;

  // volumeM3 = areaM2 x ceilingHeight (height = h / 100).
  const volumeNum = areaNum * heightHundredths;
  const volumeDen = areaDen * 100n;
  // rawWatts = areaM2 x wPerM2 x (ceilingHeight / 2.4);
  // ceilingHeight / 2.4 = h / 240 with h in hundredths.
  const rawNum = areaNum * BigInt(wPerM2) * heightHundredths;
  const rawDen = areaDen * 240n;

  const areaM2 = formatFixed(roundHalfUp(areaNum, areaDen, 2), 2);
  const volumeM3 = formatFixed(roundHalfUp(volumeNum, volumeDen, 2), 2);
  const rawWatts = formatFixed(roundHalfUp(rawNum, rawDen, 1), 1);

  // requiredWatts: the unrounded raw value rounded UP to a multiple
  // of 10 (an exact multiple is unchanged).
  const requiredWatts = Number(ceilDiv(rawNum, rawDen * 10n) * 10n);

  let recommendedWatts;
  let units;
  if (requiredWatts <= MULTI_UNIT_THRESHOLD) {
    recommendedWatts = STANDARD_SIZES.find((size) => size >= requiredWatts);
    units = 1;
  } else {
    units = Number(ceilDiv(BigInt(requiredWatts), BigInt(MULTI_UNIT_SIZE)));
    recommendedWatts = units * MULTI_UNIT_SIZE;
  }

  return {
    ok: true,
    result: {
      areaM2,
      volumeM3,
      wPerM2,
      rawWatts,
      requiredWatts,
      recommendedWatts,
      units,
    },
  };
}

// Fixed report download: room-heater-calculator-report.json. The
// content is the result's compact JSON with object keys sorted
// recursively by UTF-16 code units, array order unchanged, exactly
// one trailing LF, UTF-8 without BOM. The serializer is hand-written:
// it never calls a value's toJSON and accepts only the plain data
// shapes a result can hold (null, booleans, safe integers, strings,
// arrays, plain objects).
export const REPORT_FILENAME = "room-heater-calculator-report.json";
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
