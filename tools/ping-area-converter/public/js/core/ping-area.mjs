// Pure core for the Ping Area Converter
// (spec-ping-area-converter-20261109). Synchronous data-in /
// data-out only: no DOM, no network, no storage, no clock.
//
// All conversion arithmetic is exact rational arithmetic on BigInt
// numerator/denominator pairs, exactly as the SPEC pins:
//   1 ping   = 400/121 m²        (1 尺 = 10/33 m; a ping is 6 尺 square)
//   1 m²     = 121/400 ping      (the exact reciprocal)
//   1 ft²    = 145161/1562500 m² (= 0.09290304 exactly; 1 ft = 0.3048 m)
//   1 tatami = 81/50 m²          (= 1.62, the Japanese real-estate
//                                 advertising convention; approximate)
// The amount string is split into an integer over 10^k without ever
// parsing it as a binary float, each output is derived from the
// exact square-metre value, and rounding happens exactly once per
// output, round-half-up, in integer arithmetic:
//   floor((2·n·10^dp + d) / (2d))   for the value n/d at dp places.
// Approximate decimal factors (3.3058 and friends) are never used.

export const FIELDS = ["amount", "unit"];

export const DEFAULTS = { amount: "", unit: "ping" };

// The worked example is fixtures.json case 1 (example-thirty-ping)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = { amount: "30", unit: "ping" };

export const UNITS = ["ping", "m2", "ft2", "tatami"];

export const MAX_AMOUNT_UNITS = 12;
export const MAX_UNIT_UNITS = 6;

// Fixed display decimal places per output unit.
export const DISPLAY_DECIMALS = { ping: 2, m2: 2, ft2: 2, tatami: 1 };

const AMOUNT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$/;
const MAX_AMOUNT = 1000000n;

// Exact "to square metres" factors as [numerator, denominator].
const TO_M2 = {
  ping: [400n, 121n],
  m2: [1n, 1n],
  ft2: [145161n, 1562500n],
  tatami: [81n, 50n],
};

// Exact factors from square metres to each output unit.
const FROM_M2 = {
  ping: [121n, 400n],
  m2: [1n, 1n],
  ft2: [1562500n, 145161n],
  tatami: [50n, 81n],
};

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked.
// Returns the raw string map, or null when the shape is not exactly
// the two fields with string values.
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

// Parses a grammar-valid amount string into an exact fraction
// [numerator, denominator] = integer / 10^k, splitting the string
// directly; no binary floating point ever touches the value.
function parseAmount(text) {
  const dot = text.indexOf(".");
  if (dot === -1) return [BigInt(text), 1n];
  const intPart = text.slice(0, dot);
  const fracPart = text.slice(dot + 1);
  const scale = 10n ** BigInt(fracPart.length);
  return [BigInt(intPart) * scale + BigInt(fracPart), scale];
}

// Round-half-up of the non-negative fraction n/d at dp decimal
// places, returned as the scaled BigInt round(value × 10^dp):
// floor((2·n·10^dp + d) / (2d)). BigInt division truncates toward
// zero, which is floor for non-negative values, so exact .5 ties
// always round up (never banker's rounding, never truncation).
function roundHalfUpScaled(n, d, dp) {
  const scale = 10n ** BigInt(dp);
  return (2n * n * scale + d) / (2n * d);
}

// Renders a scaled BigInt (value × 10^dp) as an exact decimal
// string, e.g. (10675n, 1) -> "1067.5", (3000n, 2) -> "30.00".
function scaledToDecimalString(scaled, dp) {
  const digits = scaled.toString().padStart(dp + 1, "0");
  if (dp === 0) return digits;
  return `${digits.slice(0, digits.length - dp)}.${digits.slice(digits.length - dp)}`;
}

function scaledToNumber(scaled, dp) {
  return Number(scaledToDecimalString(scaled, dp));
}

// One output value: the exact square-metre fraction converted to
// the target unit and rounded once, half-up, at the pinned places.
function outputValue(m2, unit) {
  const dp = DISPLAY_DECIMALS[unit];
  const [fn, fd] = FROM_M2[unit];
  return scaledToNumber(roundHalfUpScaled(m2[0] * fn, m2[1] * fd, dp), dp);
}

function convert(m2) {
  return {
    ping: outputValue(m2, "ping"),
    m2: outputValue(m2, "m2"),
    ft2: outputValue(m2, "ft2"),
    tatami: outputValue(m2, "tatami"),
  };
}

// Per-field validation in the SPEC's fixed order: capacity
// INPUT_LIMIT, unpaired surrogate UNICODE, empty EMPTY, grammar or
// enumeration, then range. amount is validated completely before
// unit (the caller enforces the field order).
function validateAmount(value) {
  if (value.length > MAX_AMOUNT_UNITS) return { error: failure("INPUT_LIMIT", "amount") };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", "amount") };
  if (value.length === 0) return { error: failure("EMPTY", "amount") };
  if (!AMOUNT_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", "amount") };
  const amount = parseAmount(value);
  if (amount[0] === 0n) return { error: failure("RANGE", "amount") };
  if (amount[0] > MAX_AMOUNT * amount[1]) return { error: failure("RANGE", "amount") };
  return { amount };
}

function validateUnit(value) {
  if (value.length > MAX_UNIT_UNITS) return { error: failure("INPUT_LIMIT", "unit") };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", "unit") };
  if (value.length === 0) return { error: failure("EMPTY", "unit") };
  if (!UNITS.includes(value)) return { error: failure("ENUM", "unit") };
  return { unit: value };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const amountOutcome = validateAmount(raw.amount);
  if (amountOutcome.error) return amountOutcome.error;
  const unitOutcome = validateUnit(raw.unit);
  if (unitOutcome.error) return unitOutcome.error;

  const [fn, fd] = TO_M2[unitOutcome.unit];
  const m2 = [amountOutcome.amount[0] * fn, amountOutcome.amount[1] * fd];
  return { ok: true, result: convert(m2) };
}

// The fixed quick table: ping 1-100 to m² and ft² under the same
// exact constants and the same single half-up rounding at 2 places.
export function buildQuickTable() {
  const rows = [];
  for (let ping = 1; ping <= 100; ping += 1) {
    const m2 = [BigInt(ping) * 400n, 121n];
    rows.push({
      ping,
      m2: outputValue(m2, "m2"),
      ft2: outputValue(m2, "ft2"),
    });
  }
  return { rows };
}

// Display formatting: a result number (which by construction equals
// an exact decimal with at most `decimals` fractional digits) shown
// with exactly `decimals` digits, zero-padded, no thousands
// separators. Works on the shortest round-trip string of the value,
// so no binary-float rounding is involved.
export function formatValue(value, decimals) {
  const text = String(value);
  const dot = text.indexOf(".");
  const intPart = dot === -1 ? text : text.slice(0, dot);
  const fracPart = dot === -1 ? "" : text.slice(dot + 1);
  return `${intPart}.${fracPart.padEnd(decimals, "0").slice(0, decimals)}`;
}

// Fixed report download: ping-area-report.json. The content is
// {input, result} — the run's raw input strings and its result —
// serialized compactly with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing
// LF, UTF-8 without BOM. Numbers use their shortest round-trip
// decimal form. The serializer is hand-written: it never calls a
// value's toJSON and reads only own data properties.
export const REPORT_FILENAME = "ping-area-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report numbers must be finite");
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

export function buildReport(input, result) {
  const raw = readRawInput(input);
  if (raw === null || !isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue({ input: { amount: raw.amount, unit: raw.unit }, result })}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
