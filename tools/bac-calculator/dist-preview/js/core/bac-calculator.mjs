// Pure core for the BAC Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-bac-calculator-20261109): a single-point Widmark estimate —
// total pure alcohol from 1-12 drinks, the pre-metabolism peak, the
// current estimate after linear elimination at 0.15 g/L/h, the breath
// figure converted at the statutory 2000:1 ratio, the Taiwan legal
// band (administrative 0.15 mg/L / 0.03%, criminal 0.25 mg/L / 0.05% —
// only two thresholds exist in current law), and the minutes remaining
// to fall below the administrative threshold and to reach zero.
//
// All arithmetic is exact BigInt rationals; no floating point anywhere.
// A gram total is kept over a denominator of 1,000,000 (volume ml x
// ABV tenths x 789, the 0.789 g/ml ethanol density), concentrations
// are rational, and every displayed value is rounded half-up exactly
// once from the exact rational. Bands and remaining minutes are always
// decided from the unrounded value.

export const FIELDS = ["sex", "weightKg", "drinks", "elapsedMinutes"];

// Maximum raw length per scalar field, in UTF-16 code units (SPEC).
export const RAW_LIMIT = 8;

export const DEFAULTS = {
  sex: "male",
  weightKg: "70",
  drinks: [{ volumeMl: "350", abvPercent: "5" }],
  elapsedMinutes: "0",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  sex: "male",
  weightKg: "70",
  drinks: [{ volumeMl: "350", abvPercent: "5" }],
  elapsedMinutes: "0",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "bac-report.json";

export const MAX_DRINKS = 12;

// Decimal grammar: ASCII digits, optionally one decimal point followed
// by exactly one digit. Integer grammar: ASCII digits only. Neither
// accepts leading/trailing whitespace, signs, commas, exponents, or
// full-width digits. Leading zeros are allowed: the SPEC grammar does
// not forbid them, so "070" is a valid 70.
const DECIMAL_PATTERN = /^[0-9]+(\.[0-9])?$/;
const INTEGER_PATTERN = /^[0-9]+$/;

const SEXES = ["male", "female"];
// Distribution coefficient r, as an integer over 100: male 0.68,
// female 0.55 (Widmark, literature standard averages).
const R_BY_SEX = { male: 68n, female: 55n };
// Inclusive ranges. ABV's lower bound is exclusive (> 0).
const WEIGHT_RANGE = [20n, 500n]; // weightKg, in tenths of a kg
const VOLUME_RANGE = [1n, 5000n]; // volumeMl, in ml
const ABV_MAX_TENTHS = 1000n; // abvPercent, in tenths of a percent (<= 100)
const ELAPSED_RANGE = [0n, 1440n]; // elapsedMinutes, in minutes

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

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Read one own string data property; null when absent, an accessor, or
// not a string. Any access failure is treated as a schema failure.
function readStringField(object, field) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(object, field);
  } catch {
    return null;
  }
  if (descriptor === undefined || !("value" in descriptor)) return null;
  return typeof descriptor.value === "string" ? descriptor.value : null;
}

// Schema gate: the input must be a plain object whose own properties
// are exactly the four fields, each an own data property; sex /
// weightKg / elapsedMinutes are strings, drinks is an array, and every
// drink row is a plain object with exactly volumeMl and abvPercent as
// own string data properties. Row-shape failures are SCHEMA here (the
// SPEC's shape rule); row value failures are reported per row later.
// Anything else is SCHEMA with field/row null.
function readSchema(input) {
  if (!isPlainObject(input)) return null;
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return null;
  }
  if (keys.length !== FIELDS.length) return null;
  const sex = readStringField(input, "sex");
  const weightKg = readStringField(input, "weightKg");
  const elapsedMinutes = readStringField(input, "elapsedMinutes");
  if (sex === null || weightKg === null || elapsedMinutes === null) return null;
  let drinksDescriptor;
  try {
    drinksDescriptor = Object.getOwnPropertyDescriptor(input, "drinks");
  } catch {
    return null;
  }
  if (drinksDescriptor === undefined || !("value" in drinksDescriptor)) return null;
  const drinksRaw = drinksDescriptor.value;
  if (!Array.isArray(drinksRaw)) return null;
  const drinks = [];
  for (let i = 0; i < drinksRaw.length; i += 1) {
    let row;
    try {
      row = drinksRaw[i];
    } catch {
      return null;
    }
    if (!isPlainObject(row)) return null;
    let rowKeys;
    try {
      rowKeys = Object.keys(row);
    } catch {
      return null;
    }
    if (rowKeys.length !== 2) return null;
    const volumeMl = readStringField(row, "volumeMl");
    const abvPercent = readStringField(row, "abvPercent");
    if (volumeMl === null || abvPercent === null) return null;
    drinks.push({ volumeMl, abvPercent });
  }
  return { sex, weightKg, drinks, elapsedMinutes };
}

// Parse a grammar-valid decimal string into tenths (value x 10).
// The grammar guarantees the shape.
function parseDecimalTenths(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return BigInt(raw) * 10n;
  return BigInt(raw.slice(0, dot)) * 10n + BigInt(raw.slice(dot + 1));
}

// Validate one scalar field in the SPEC's order: capacity
// (INPUT_LIMIT), unpaired surrogate (UNICODE), missing content
// (EMPTY), grammar or enum (DECIMAL_FORMAT / INTEGER_FORMAT / ENUM),
// range (RANGE). Returns null when valid, otherwise the error object.
// `field`/`row` identify the error's field and row; `min`/`max` are BigInts
// in the parsed unit, `minExclusive` marks the ABV lower bound (> 0).
function validateScalar({ field, row, raw, pattern, formatCode, value, min, max, minExclusive }) {
  if (raw.length > RAW_LIMIT) {
    return { code: "INPUT_LIMIT", field, row };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row };
  }
  if (pattern !== null && !pattern.test(raw)) {
    return { code: formatCode, field, row };
  }
  const belowMin = minExclusive ? value <= min : value < min;
  if (belowMin || value > max) {
    return { code: "RANGE", field, row };
  }
  return null;
}

// Validate the whole input in the SPEC's fixed order: sex, weightKg,
// drinks, elapsedMinutes. The first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  // sex: enum (capacity / surrogate / empty first, then ENUM).
  {
    const raw = values.sex;
    if (raw.length > RAW_LIMIT) return { ok: false, error: { code: "INPUT_LIMIT", field: "sex", row: null } };
    if (hasUnpairedSurrogate(raw)) return { ok: false, error: { code: "UNICODE", field: "sex", row: null } };
    if (raw === "") return { ok: false, error: { code: "EMPTY", field: "sex", row: null } };
    if (!SEXES.includes(raw)) return { ok: false, error: { code: "ENUM", field: "sex", row: null } };
  }

  // weightKg: decimal, 20-500 kg. Parse only after the grammar
  // passes, so unparseable text never reaches BigInt.
  {
    const raw = values.weightKg;
    const parsed = DECIMAL_PATTERN.test(raw) ? parseDecimalTenths(raw) : 0n;
    const error = validateScalar({
      field: "weightKg",
      row: null,
      raw,
      pattern: DECIMAL_PATTERN,
      formatCode: "DECIMAL_FORMAT",
      value: parsed,
      min: WEIGHT_RANGE[0] * 10n,
      max: WEIGHT_RANGE[1] * 10n,
      minExclusive: false,
    });
    if (error !== null) return { ok: false, error };
  }

  // drinks: length first, then row by row, volumeMl then abvPercent.
  if (values.drinks.length === 0) {
    return { ok: false, error: { code: "EMPTY", field: "drinks", row: null } };
  }
  if (values.drinks.length > MAX_DRINKS) {
    return { ok: false, error: { code: "ROW_LIMIT", field: "drinks", row: 13 } };
  }
  for (let i = 0; i < values.drinks.length; i += 1) {
    const row = values.drinks[i];
    const rowNumber = i + 1;
    if (INTEGER_PATTERN.test(row.volumeMl)) {
      const error = validateScalar({
        field: "volumeMl",
        row: rowNumber,
        raw: row.volumeMl,
        pattern: INTEGER_PATTERN,
        formatCode: "INTEGER_FORMAT",
        value: BigInt(row.volumeMl),
        min: VOLUME_RANGE[0],
        max: VOLUME_RANGE[1],
        minExclusive: false,
      });
      if (error !== null) return { ok: false, error };
    } else {
      const error = validateScalar({
        field: "volumeMl",
        row: rowNumber,
        raw: row.volumeMl,
        pattern: INTEGER_PATTERN,
        formatCode: "INTEGER_FORMAT",
        value: 0n,
        min: VOLUME_RANGE[0],
        max: VOLUME_RANGE[1],
        minExclusive: false,
      });
      if (error !== null) return { ok: false, error };
    }
    if (DECIMAL_PATTERN.test(row.abvPercent)) {
      const error = validateScalar({
        field: "abvPercent",
        row: rowNumber,
        raw: row.abvPercent,
        pattern: DECIMAL_PATTERN,
        formatCode: "DECIMAL_FORMAT",
        value: parseDecimalTenths(row.abvPercent),
        min: 0n,
        max: ABV_MAX_TENTHS,
        minExclusive: true,
      });
      if (error !== null) return { ok: false, error };
    } else {
      const error = validateScalar({
        field: "abvPercent",
        row: rowNumber,
        raw: row.abvPercent,
        pattern: DECIMAL_PATTERN,
        formatCode: "DECIMAL_FORMAT",
        value: 0n,
        min: 0n,
        max: ABV_MAX_TENTHS,
        minExclusive: true,
      });
      if (error !== null) return { ok: false, error };
    }
  }

  // elapsedMinutes: integer, 0-1440.
  {
    const raw = values.elapsedMinutes;
    const parsed = INTEGER_PATTERN.test(raw) ? BigInt(raw) : 0n;
    const error = validateScalar({
      field: "elapsedMinutes",
      row: null,
      raw,
      pattern: INTEGER_PATTERN,
      formatCode: "INTEGER_FORMAT",
      value: parsed,
      min: ELAPSED_RANGE[0],
      max: ELAPSED_RANGE[1],
      minExclusive: false,
    });
    if (error !== null) return { ok: false, error };
  }

  return {
    ok: true,
    values: {
      sex: values.sex,
      weightTenths: parseDecimalTenths(values.weightKg),
      drinks: values.drinks.map((row) => ({
        volumeMl: BigInt(row.volumeMl),
        abvTenths: parseDecimalTenths(row.abvPercent),
      })),
      elapsedMinutes: BigInt(values.elapsedMinutes),
    },
  };
}

// roundHalfUp(n / d) for non-negative BigInts: quotient q, remainder r;
// if 2r >= d the result is q + 1, otherwise q. An exact half rounds up.
function roundHalfUp(n, d) {
  const q = n / d;
  const r = n - q * d;
  return 2n * r >= d ? q + 1n : q;
}

// Round the non-negative rational n/d to `places` decimals, half-up,
// returning the value as a JS number (exact for these bounded outputs).
function roundToPlaces(n, d, places) {
  const scale = 10n ** BigInt(places);
  const scaled = roundHalfUp(n * scale, d);
  return Number(scaled) / Number(scale);
}

// ceil(n / d) for non-negative BigInts with n > 0.
function ceilDiv(n, d) {
  return (n + d - 1n) / d;
}

// The Widmark estimate. All inputs are validated first; every step is
// exact BigInt rational arithmetic.
//   A (pure alcohol, g) = sum(volumeMl x abvTenths x 789) / 1,000,000
//   P (peak, g/L)       = A / (r x weightKg)
//                       = A_num / (1000 x rNum x weightTenths)
//   B (current, g/L)    = max(0, P - elapsedMinutes / 400)
//   bacPercent (%)       = B / 10; breath (mg/L) = B / 2 (2000:1)
//   band from exact B: < 0.3 below-threshold, < 0.5 administrative,
//   otherwise criminal.
//   minutesToZero = ceil(B x 400); minutesToBelowAdmin =
//   ceil((B - 0.3) x 400), each 0 when already at/below its target.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { sex, weightTenths, drinks, elapsedMinutes } = validated.values;

  let alcoholNum = 0n; // A x 1,000,000
  for (const drink of drinks) {
    alcoholNum += drink.volumeMl * drink.abvTenths * 789n;
  }

  const rNum = R_BY_SEX[sex];
  const peakDen = 1000n * rNum * weightTenths;
  const peakNum = alcoholNum;

  // B over a common denominator: B = B_num / B_den, floored at zero.
  const currentDen = peakDen * 400n;
  const subtracted = peakNum * 400n - elapsedMinutes * peakDen;
  const currentNum = subtracted > 0n ? subtracted : 0n;

  let band;
  if (currentNum * 10n < 3n * currentDen) band = "below-threshold";
  else if (currentNum * 2n < currentDen) band = "administrative";
  else band = "criminal";

  const minutesToZero =
    currentNum === 0n ? 0 : Number(ceilDiv(currentNum * 400n, currentDen));
  const belowAdmin =
    currentNum * 10n < 3n * currentDen
      ? 0
      : Number(ceilDiv((currentNum * 10n - 3n * currentDen) * 40n, currentDen));

  return {
    ok: true,
    result: {
      totalAlcoholGrams: roundToPlaces(alcoholNum, 1000000n, 1),
      peakBacGL: roundToPlaces(peakNum, peakDen, 3),
      bacGL: roundToPlaces(currentNum, currentDen, 3),
      bacPercent: roundToPlaces(currentNum, currentDen * 10n, 3),
      breathMgL: roundToPlaces(currentNum, currentDen * 2n, 3),
      band,
      minutesToZero,
      minutesToBelowAdmin: belowAdmin,
    },
  };
}

// Display formatting (never feeds back into machine values, and never
// changes with locale): fixed decimals, a dot, no thousands separators.
export function formatNumber(value, places) {
  return value.toFixed(places);
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

// Serialize a successful result for download: canonical compact JSON plus
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit
// the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
