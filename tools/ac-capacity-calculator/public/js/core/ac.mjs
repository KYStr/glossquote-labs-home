// Pure core for the AC Capacity Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-ac-capacity-calculator-20261109): one room, a 500 kcal/h-per-ping
// base load, additive percentage adjustments, fixed conversion constants
// (1 ping = 3.3058 m2, 1 kcal = 3.968 BTU, 1 kW = 860 kcal/h, retail
// rule-of-thumb 1 ton ~ 2,500 kcal/h), and a fixed model-size table.
// The whole pipeline is exact BigInt rational arithmetic; every output is
// rounded half-up exactly once, from the exact value, at its own step.
// No floating point anywhere: a float would move the .5 boundaries and the
// exact-vs-rounded model-size comparison the SPEC pins.

export const FIELDS = [
  "sizeUnit",
  "area",
  "occupants",
  "westSun",
  "topFloor",
  "largeWindows",
  "kitchenHeat",
];

// Maximum raw length per field, in UTF-16 code units (SPEC: 8 for all).
export const RAW_LIMITS = {
  sizeUnit: 8,
  area: 8,
  occupants: 8,
  westSun: 8,
  topFloor: 8,
  largeWindows: 8,
  kitchenHeat: 8,
};

export const DEFAULTS = {
  sizeUnit: "ping",
  area: "10",
  occupants: "2",
  westSun: "false",
  topFloor: "false",
  largeWindows: "false",
  kitchenHeat: "false",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  sizeUnit: "ping",
  area: "10",
  occupants: "2",
  westSun: "false",
  topFloor: "false",
  largeWindows: "false",
  kitchenHeat: "false",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "ac-capacity-report.json";

// Fixed model-size table (kW), as one-decimal strings.
export const MODEL_SIZES_KW = ["2.2", "2.8", "3.6", "4.5", "5.0", "6.3", "7.1", "8.0", "9.0", "10.0"];
// The same sizes as integer tenths of a kW, for exact comparison.
const MODEL_TENTHS = [22n, 28n, 36n, 45n, 50n, 63n, 71n, 80n, 90n, 100n];

const AREA_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

const ENUM_VALUES = {
  sizeUnit: ["ping", "m2"],
  westSun: ["true", "false"],
  topFloor: ["true", "false"],
  largeWindows: ["true", "false"],
  kitchenHeat: ["true", "false"],
};

// Area range, checked in the input unit, as integer hundredths:
// ping 0.5-300 -> 50..30000; m2 1-1000 -> 100..100000.
const AREA_RANGES = { ping: [50n, 30000n], m2: [100n, 100000n] };
const OCCUPANTS_RANGE = [1n, 30n];

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
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

// Schema gate: the input must be a plain object whose own properties are
// exactly the seven fields, each an own data property (no accessors)
// holding a string. Anything else — unknown or missing keys, wrong types,
// getters — is SCHEMA with field/row null.
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

// Parse a grammar-valid area string into integer hundredths.
function parseHundredths(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac2 = (fracPart + "00").slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(frac2);
}

// Validate one field in the SPEC's order: capacity (INPUT_LIMIT), unpaired
// surrogate (UNICODE), missing content (EMPTY), grammar (ENUM for the enum
// fields, DECIMAL_FORMAT for area, INTEGER_FORMAT for occupants), range
// (RANGE). Returns null when valid, otherwise the error. The area range is
// checked in the input unit, so it needs the already-validated sizeUnit.
function validateField(field, raw, values) {
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (Object.hasOwn(ENUM_VALUES, field)) {
    if (!ENUM_VALUES[field].includes(raw)) {
      return { code: "ENUM", field, row: null };
    }
    return null;
  }
  if (field === "area") {
    if (!AREA_PATTERN.test(raw)) {
      return { code: "DECIMAL_FORMAT", field, row: null };
    }
    const [min, max] = AREA_RANGES[values.sizeUnit];
    const hundredths = parseHundredths(raw);
    if (hundredths < min || hundredths > max) {
      return { code: "RANGE", field, row: null };
    }
    return null;
  }
  // occupants
  if (!INTEGER_PATTERN.test(raw)) {
    return { code: "INTEGER_FORMAT", field, row: null };
  }
  const count = BigInt(raw);
  if (count < OCCUPANTS_RANGE[0] || count > OCCUPANTS_RANGE[1]) {
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the whole input: schema first, then fields in the fixed order
// sizeUnit, area, occupants, westSun, topFloor, largeWindows, kitchenHeat;
// the first error wins. There are no cross-field errors.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field], values);
    if (error !== null) return { ok: false, error };
  }
  return {
    ok: true,
    values: {
      sizeUnit: values.sizeUnit,
      areaHundredths: parseHundredths(values.area),
      occupants: Number(BigInt(values.occupants)),
      westSun: values.westSun === "true",
      topFloor: values.topFloor === "true",
      largeWindows: values.largeWindows === "true",
      kitchenHeat: values.kitchenHeat === "true",
    },
  };
}

// roundHalfUp(a / b) for non-negative BigInts: floor((2a + b) / (2b)).
function roundHalfUp(a, b) {
  return (2n * a + b) / (2n * b);
}

// The scaled integer of round_d(num / den): floor(num * 10^d / den + 1/2),
// computed exactly. The result is the output value times 10^d.
function roundScaled(num, den, digits) {
  const scale = 10n ** BigInt(digits);
  return (2n * num * scale + den) / (2n * den);
}

// Format a non-negative scaled BigInt with exactly `digits` decimals.
function formatScaled(scaled, digits) {
  const scale = 10n ** BigInt(digits);
  const whole = scaled / scale;
  const frac = scaled % scale;
  return `${whole}.${String(frac).padStart(digits, "0")}`;
}

// Outputs are bounded by the input ranges, so every BigInt result converts
// to an exact safe integer.
function toSafeNumber(value) {
  const num = Number(value);
  if (!Number.isSafeInteger(num)) {
    throw new Error("Result outside the safe-integer range");
  }
  return num;
}

// The capacity pipeline. Exact rationals throughout:
// - ping = A/100 (ping input) or A*50/16529 (m2 input; 1 ping = 3.3058 m2
//   and 3.3058 = 16529/5000, so dividing by it is A/100 * 5000/16529).
// - baseKcal = ping * 500; requiredKcal = baseKcal * (100 + pct) / 100,
//   with pct the additive adjustment total (never compounded).
// - Each output rounds half-up once, from the exact requiredKcal.
// - The model recommendation compares the EXACT kW against the size
//   table, never the rounded display value.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const v = validated.values;

  let pingNum;
  let pingDen;
  if (v.sizeUnit === "ping") {
    pingNum = v.areaHundredths;
    pingDen = 100n;
  } else {
    pingNum = v.areaHundredths * 50n;
    pingDen = 16529n;
  }

  const pct =
    (v.westSun ? 10 : 0) +
    (v.topFloor ? 15 : 0) +
    (v.largeWindows ? 10 : 0) +
    (v.kitchenHeat ? 10 : 0) +
    3 * Math.max(0, v.occupants - 2);

  const baseNum = pingNum * 500n;
  const baseDen = pingDen;
  const reqNum = baseNum * BigInt(100 + pct);
  const reqDen = baseDen * 100n;

  // Exact kW is reqNum / (reqDen * 860). A size of s tenths qualifies when
  // s/10 >= exact kW, i.e. s * reqDen * 860 >= reqNum * 10.
  let recommendedModelKw = null;
  let nextModelKw = null;
  let modelOverRange = false;
  let found = -1;
  for (let i = 0; i < MODEL_TENTHS.length; i += 1) {
    if (MODEL_TENTHS[i] * reqDen * 860n >= reqNum * 10n) {
      found = i;
      break;
    }
  }
  if (found === -1) {
    modelOverRange = true;
  } else {
    recommendedModelKw = MODEL_SIZES_KW[found];
    nextModelKw = found + 1 < MODEL_SIZES_KW.length ? MODEL_SIZES_KW[found + 1] : null;
  }

  return {
    ok: true,
    result: {
      ping: formatScaled(roundScaled(pingNum, pingDen, 2), 2),
      baseKcalH: toSafeNumber(roundHalfUp(baseNum, baseDen)),
      adjustmentPct: pct,
      requiredKcalH: toSafeNumber(roundHalfUp(reqNum, reqDen)),
      requiredBtuH: toSafeNumber(roundHalfUp(reqNum * 3968n, reqDen * 1000n)),
      requiredKw: formatScaled(roundScaled(reqNum, reqDen * 860n, 2), 2),
      tonnageRuleOfThumb: formatScaled(roundScaled(reqNum, reqDen * 2500n, 1), 1),
      recommendedModelKw,
      nextModelKw,
      modelOverRange,
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
