// Pure core for the Filament Usage Calculator
// (spec-filament-usage-calculator-20261109).
// Synchronous data-in / data-out only: no DOM, no network, no storage.
//
// All arithmetic is IEEE-754 double with NO intermediate rounding
// (pi = Math.PI), exactly as the SPEC pins:
//   A   = pi * (d/2)^2            (mm^2)
//   gpm = A * rho                 (g per metre; rho in g/cm^3)
//   length mode: weight = lengthM * gpm
//   weight mode: length = weightG / gpm
//   spool mode:  remainingG = grossWeightG - empty; remainingM = remainingG / gpm
//   cost mode:   cost = spoolPrice * usageG / spoolNetWeightG;
//                usageLength = usageG / gpm
// Each output is rounded half-up exactly once
// (floor(x * 10^n + 0.5) / 10^n) and formatted as a fixed-decimal
// string. Densities are pinned nominal slicer values, disclosed as
// such next to every result; they are not measured truth.

export const FIELDS = [
  "mode",
  "diameter",
  "material",
  "lengthM",
  "weightG",
  "grossWeightG",
  "emptySpoolPreset",
  "emptySpoolCustomG",
  "spoolPrice",
  "spoolNetWeightG",
  "usageG",
  "currency",
];

// Raw capacity per field in UTF-16 code units, pinned by the SPEC.
export const RAW_LIMITS = {
  mode: 8,
  diameter: 4,
  material: 4,
  lengthM: 10,
  weightG: 10,
  grossWeightG: 8,
  emptySpoolPreset: 6,
  emptySpoolCustomG: 7,
  spoolPrice: 10,
  spoolNetWeightG: 8,
  usageG: 10,
  currency: 3,
};

export const MODES = ["length", "weight", "spool", "cost"];
export const DIAMETERS = ["1.75", "2.85"];

// Fixed material density table (g/cm^3), pinned by the SPEC.
export const DENSITIES = {
  pla: 1.24,
  petg: 1.27,
  abs: 1.05,
  tpu: 1.21,
  asa: 1.07,
  pc: 1.2,
};
export const MATERIALS = Object.keys(DENSITIES);

export const SPOOL_PRESETS = ["140", "200", "250", "custom"];

export const CURRENCIES = ["TWD", "USD", "EUR", "JPY"];
// Display symbols only; no conversion is ever performed.
export const CURRENCY_SYMBOLS = {
  TWD: "NT$",
  USD: "US$",
  EUR: "€",
  JPY: "¥",
};

// Decimal places allowed per numeric field, pinned by the SPEC.
export const DECIMAL_PLACES = {
  lengthM: 3,
  weightG: 2,
  grossWeightG: 1,
  emptySpoolCustomG: 1,
  spoolPrice: 2,
  spoolNetWeightG: 1,
  usageG: 1,
};

// Inclusive/exclusive numeric ranges per field: [min, max, minExclusive].
export const RANGES = {
  lengthM: [0, 100000, true],
  weightG: [0, 1000000, true],
  grossWeightG: [0, 100000, true],
  emptySpoolCustomG: [0, 10000, false],
  spoolPrice: [0, 1000000, true],
  spoolNetWeightG: [1, 100000, false],
  usageG: [0, 1000000, true],
};

export const ENUMS = {
  mode: MODES,
  diameter: DIAMETERS,
  material: MATERIALS,
  emptySpoolPreset: SPOOL_PRESETS,
  currency: CURRENCIES,
};

export const DEFAULTS = {
  mode: "length",
  diameter: "1.75",
  material: "pla",
  lengthM: "10",
  weightG: "100",
  grossWeightG: "850",
  emptySpoolPreset: "200",
  emptySpoolCustomG: "200",
  spoolPrice: "599",
  spoolNetWeightG: "1000",
  usageG: "100",
  currency: "TWD",
};

// The worked example is fixtures.json case 1 (length-pla-175) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  mode: "length",
  diameter: "1.75",
  material: "pla",
  lengthM: "100",
  weightG: "100",
  grossWeightG: "850",
  emptySpoolPreset: "200",
  emptySpoolCustomG: "200",
  spoolPrice: "599",
  spoolNetWeightG: "1000",
  usageG: "100",
  currency: "TWD",
};

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;
const UNPAIRED_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the twelve
// string fields.
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

// Per-field checks that apply to EVERY field, active or not, in the
// SPEC's pinned order: raw capacity, then unpaired surrogate.
function checkCapacityAndUnicode(field, value) {
  if (value.length > RAW_LIMITS[field]) return failure("INPUT_LIMIT", field);
  if (UNPAIRED_SURROGATE.test(value)) return failure("UNICODE", field);
  return null;
}

// Validates one ACTIVE field. Enum fields: ENUM. Numeric fields:
// EMPTY -> DECIMAL_FORMAT (grammar or too many decimal places) ->
// RANGE. Returns a failure object or null.
function checkActiveValue(field, value) {
  if (Object.hasOwn(ENUMS, field)) {
    if (!ENUMS[field].includes(value)) return failure("ENUM", field);
    return null;
  }
  if (value.length === 0) return failure("EMPTY", field);
  if (!DECIMAL_PATTERN.test(value)) return failure("DECIMAL_FORMAT", field);
  const dot = value.indexOf(".");
  const places = dot === -1 ? 0 : value.length - dot - 1;
  if (places > DECIMAL_PLACES[field]) return failure("DECIMAL_FORMAT", field);
  const numeric = Number(value);
  const [min, max, minExclusive] = RANGES[field];
  if ((minExclusive ? numeric <= min : numeric < min) || numeric > max) {
    return failure("RANGE", field);
  }
  return null;
}

// Round half-up to exactly `places` decimals, applied once to an
// unrounded value, formatted as a fixed-decimal string.
function formatRounded(value, places) {
  const scale = 10 ** places;
  return (Math.floor(value * scale + 0.5) / scale).toFixed(places);
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Phase 1 (SPEC order): every field, fixed field order — raw
  // capacity, then unpaired surrogate.
  for (const field of FIELDS) {
    const error = checkCapacityAndUnicode(field, raw[field]);
    if (error) return error;
  }

  // mode is validated first among the value checks because it decides
  // which other fields are active.
  let error = checkActiveValue("mode", raw.mode);
  if (error) return error;
  const mode = raw.mode;

  const active = new Set(["mode", "diameter", "material"]);
  if (mode === "length") active.add("lengthM");
  if (mode === "weight") active.add("weightG");
  if (mode === "spool") {
    active.add("grossWeightG");
    active.add("emptySpoolPreset");
    if (raw.emptySpoolPreset === "custom") active.add("emptySpoolCustomG");
  }
  if (mode === "cost") {
    active.add("spoolPrice");
    active.add("spoolNetWeightG");
    active.add("usageG");
    active.add("currency");
  }

  // Phase 2 (SPEC order): active fields only, same fixed field order.
  for (const field of FIELDS) {
    if (field === "mode" || !active.has(field)) continue;
    error = checkActiveValue(field, raw[field]);
    if (error) return error;
  }

  const diameter = Number(raw.diameter);
  const area = Math.PI * (diameter / 2) ** 2; // mm^2
  const gramsPerMetre = area * DENSITIES[raw.material]; // g/m
  const result = { gramsPerMetre: formatRounded(gramsPerMetre, 2) };

  if (mode === "length") {
    result.weightG = formatRounded(Number(raw.lengthM) * gramsPerMetre, 1);
  } else if (mode === "weight") {
    result.lengthM = formatRounded(Number(raw.weightG) / gramsPerMetre, 2);
  } else if (mode === "spool") {
    const empty =
      raw.emptySpoolPreset === "custom"
        ? Number(raw.emptySpoolCustomG)
        : Number(raw.emptySpoolPreset);
    const gross = Number(raw.grossWeightG);
    // Cross-field rule: gross below the empty spool weight is its own
    // error; gross == empty is legal (zero remaining).
    if (gross < empty) return failure("NEGATIVE_REMAINING", "grossWeightG");
    const remainingG = gross - empty;
    result.remainingG = formatRounded(remainingG, 1);
    result.remainingM = formatRounded(remainingG / gramsPerMetre, 2);
  } else {
    // cost
    const cost =
      (Number(raw.spoolPrice) * Number(raw.usageG)) / Number(raw.spoolNetWeightG);
    result.cost = formatRounded(cost, 2);
    result.currency = raw.currency;
    result.usageLengthM = formatRounded(Number(raw.usageG) / gramsPerMetre, 2);
  }

  return { ok: true, result };
}

// Fixed report download: filament-usage-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, finite numbers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "filament-usage-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("report values must be finite");
    return JSON.stringify(value);
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
