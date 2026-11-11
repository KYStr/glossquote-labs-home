// Pure core for the Dew Point Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-dew-point-calculator-20261109): dew point and absolute humidity
// from air temperature and relative humidity via the Magnus formula over
// water, plus a seven-band comfort classification.
//
// Pinned constants (SPEC inputsOutputs; sources in AUTHOR-CHECK.md):
//   a = 17.27, b = 237.7 °C, es(0 °C) = 6.112 hPa (Magnus–Tetens form;
//   Lawrence 2005; about ±0.4 °C over −45…60 °C), absolute-humidity
//   constant 216.7 (= 10^5 / 461.5, from Rv = 461.5 J/(kg·K)).
// The pipeline is IEEE-754 double with Math.log / Math.exp and no
// intermediate rounding; each output is rounded once at the end with
// r(x) = floor(x * 10 + 0.5) / 10, and the comfort band is looked up from
// the ROUNDED dew point. The over-water form is used throughout, so a
// below-0 °C result is the dew point over supercooled water, not a frost
// point.

export const FIELDS = ["temperature", "relativeHumidity"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  temperature: 8,
  relativeHumidity: 8,
};

export const DEFAULTS = {
  temperature: "25",
  relativeHumidity: "60",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  temperature: "25",
  relativeHumidity: "60",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "dew-point-report.json";

export const MAGNUS_A = 17.27;
export const MAGNUS_B = 237.7;
export const ES0_HPA = 6.112;
export const ABSOLUTE_HUMIDITY_CONSTANT = 216.7;

// Decimal grammar (SPEC): optional leading "-", at least one digit, then
// optionally "." plus at least one digit. No "+", whitespace, exponent or
// thousands separators; leading zeros are allowed ("007" = 7).
const DECIMAL_PATTERN = /^-?[0-9]+(\.[0-9]+)?$/;

// Inclusive temperature range in °C; relative humidity is 0 < RH <= 100.
const TEMPERATURE_MIN = -50;
const TEMPERATURE_MAX = 60;
const RH_MAX = 100;

// Comfort bands, pinned verbatim from the SPEC: looked up by the ROUNDED
// dew point, lower bound inclusive, upper bound exclusive.
export const COMFORT_BANDS = [
  { id: "dry", maxExclusive: 10, labelZh: "乾燥", labelEn: "Dry" },
  { id: "comfortable", maxExclusive: 13, labelZh: "舒適", labelEn: "Comfortable" },
  { id: "mostly-comfortable", maxExclusive: 16, labelZh: "大致舒適", labelEn: "Mostly comfortable" },
  { id: "slightly-humid", maxExclusive: 18, labelZh: "略感潮濕", labelEn: "Slightly humid" },
  { id: "humid", maxExclusive: 21, labelZh: "潮濕悶熱", labelEn: "Humid" },
  { id: "oppressive", maxExclusive: 24, labelZh: "非常悶熱", labelEn: "Oppressive" },
  { id: "extremely-oppressive", maxExclusive: Infinity, labelZh: "極度悶熱", labelEn: "Extremely oppressive" },
];

export function comfortBandFor(roundedDewPointC) {
  for (const band of COMFORT_BANDS) {
    if (roundedDewPointC < band.maxExclusive) return band.id;
  }
  return "extremely-oppressive";
}

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
// exactly the two fields, each an own data property (no accessors) holding
// a string. Anything else — unknown or missing keys, wrong types, getters,
// proxies that throw — is SCHEMA with field/row null.
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

// Validate one field in the SPEC's order: capacity (INPUT_LIMIT), unpaired
// surrogate (UNICODE), missing content (EMPTY), grammar (DECIMAL_FORMAT),
// range (RANGE). Returns null when valid, otherwise the error.
function validateField(field, raw) {
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (!DECIMAL_PATTERN.test(raw)) {
    return { code: "DECIMAL_FORMAT", field, row: null };
  }
  // The grammar guarantees a plain decimal string, so Number() is the
  // exact IEEE-754 parse the SPEC's double pipeline starts from.
  const value = Number(raw);
  if (field === "temperature") {
    if (value < TEMPERATURE_MIN || value > TEMPERATURE_MAX) {
      return { code: "RANGE", field, row: null };
    }
  } else if (!(value > 0) || value > RH_MAX) {
    // RH <= 0 is rejected here, before any computation, so Math.log is
    // never evaluated on a non-positive number (the SPEC's ln guard).
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the whole input: schema first, then fields in the fixed order
// temperature, relativeHumidity; the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) return { ok: false, error };
  }
  return {
    ok: true,
    values: {
      temperature: Number(values.temperature),
      relativeHumidity: Number(values.relativeHumidity),
    },
  };
}

// The SPEC's single final rounding, applied once per output:
// r(x) = floor(x * 10 + 0.5) / 10 (one decimal, same rule for negatives).
function roundOneDecimal(x) {
  return Math.floor(x * 10 + 0.5) / 10;
}

// The dew-point computation. Both fields are validated first, so
// 0 < RH <= 100 and gamma < a always hold: ln is never taken of a
// non-positive number and a - gamma > 0, so no division by zero.
// At RH = 100, ln(1) = 0 makes the dew point exactly the temperature in
// exact arithmetic.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const T = validated.values.temperature;
  const RH = validated.values.relativeHumidity;

  const saturationTerm = (MAGNUS_A * T) / (MAGNUS_B + T);
  const gamma = Math.log(RH / 100) + saturationTerm;
  const dewPointRaw = (MAGNUS_B * gamma) / (MAGNUS_A - gamma);
  const es = ES0_HPA * Math.exp(saturationTerm);
  const e = (es * RH) / 100;
  const absoluteHumidityRaw = (ABSOLUTE_HUMIDITY_CONSTANT * e) / (273.15 + T);

  const dewPointC = roundOneDecimal(dewPointRaw);
  const absoluteHumidityGm3 = roundOneDecimal(absoluteHumidityRaw);
  return {
    ok: true,
    result: {
      dewPointC,
      absoluteHumidityGm3,
      comfortBand: comfortBandFor(dewPointC),
    },
  };
}

// Display formatting for the UI: always exactly one decimal place. This
// never feeds back into machine values (the result numbers stay numbers;
// 20.0 serializes as 20 in the report, per the SPEC).
export function formatOneDecimal(value) {
  return value.toFixed(1);
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
