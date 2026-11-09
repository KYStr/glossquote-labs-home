// Pure core for the Ring Size Converter.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-ring-size-converter-20261109): one source value in any of six ring
// size systems (inside circumference mm, inside diameter mm, US, EU, JP,
// UK) is normalised to the canonical inside circumference circH (integer,
// 0.01 mm) and every output is derived from circH alone.
//
// - JP follows the JIS S 4700 diameter definition: size n has inside
//   diameter (38 + n) / 3 mm; the JP output is round(3 * diameter - 38),
//   and a result below 1 is reported as null (below JP size 1).
// - The fixed 21-row standard table (US 3.0-13.0 in half steps) is literal
//   data below; the implementation never looks up or interpolates US/UK
//   values anywhere else.
// - Fit: a canonical circumference within 0.30 mm of the nearest row
//   (delta <= 30 in circH units) is "exact", otherwise "between"; a tie at
//   the exact midpoint takes the larger row.
// - Pi is the IEEE-754 double Math.PI. The spec author exhaustively
//   verified every legal input stays far from a rounding boundary (see
//   AUTHOR-CHECK.md), so double arithmetic matches the real-number rules.

export const FIELDS = ["source", "value"];

export const SOURCES = ["circumference", "diameter", "us", "eu", "jp", "uk"];

// Maximum raw length of the `value` field, in UTF-16 code units (SPEC: 8).
// The SPEC's shared "raw max 8 units per field" sentence is applied to
// `value` only: the source field's own valid value "circumference" is 13
// units, so an 8-unit cap on `source` would reject the SPEC's pinned
// default and its first fixture. `source` is a closed enum and is checked
// UNICODE then ENUM instead (recorded in VERIFICATION.md).
export const VALUE_RAW_LIMIT = 8;

export const DEFAULTS = { source: "circumference", value: "" };

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = { source: "circumference", value: "51.9" };

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "ring-size-report.json";

// Fit tolerance: delta <= 0.30 mm (30 circH units) counts as an exact match.
export const FIT_TOLERANCE_H = 30;

// Fixed standard size table, 21 rows, literal per SPEC.md. circH is the
// row's canonical inside circumference in 0.01 mm; usSize is the display
// label (whole sizes without a decimal, halves with ".5"); ukSize is the
// fixed half-letter label.
export const ROWS = [
  { circH: 4420, usSize: "3", ukSize: "F½" },
  { circH: 4550, usSize: "3.5", ukSize: "G½" },
  { circH: 4680, usSize: "4", ukSize: "H½" },
  { circH: 4800, usSize: "4.5", ukSize: "I½" },
  { circH: 4930, usSize: "5", ukSize: "J½" },
  { circH: 5060, usSize: "5.5", ukSize: "K½" },
  { circH: 5190, usSize: "6", ukSize: "L½" },
  { circH: 5310, usSize: "6.5", ukSize: "M½" },
  { circH: 5440, usSize: "7", ukSize: "N½" },
  { circH: 5570, usSize: "7.5", ukSize: "O½" },
  { circH: 5700, usSize: "8", ukSize: "P½" },
  { circH: 5830, usSize: "8.5", ukSize: "Q½" },
  { circH: 5950, usSize: "9", ukSize: "R½" },
  { circH: 6080, usSize: "9.5", ukSize: "S½" },
  { circH: 6210, usSize: "10", ukSize: "T½" },
  { circH: 6340, usSize: "10.5", ukSize: "U½" },
  { circH: 6460, usSize: "11", ukSize: "V½" },
  { circH: 6590, usSize: "11.5", ukSize: "W½" },
  { circH: 6720, usSize: "12", ukSize: "X½" },
  { circH: 6850, usSize: "12.5", ukSize: "Y½" },
  { circH: 6970, usSize: "13", ukSize: "Z½" },
];

export const UK_LABELS = ROWS.map((row) => row.ukSize);

const DECIMAL_PATTERN = /^(0|[1-9][0-9]{0,2})(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]{0,2})$/;

const DECIMAL_SOURCES = new Set(["circumference", "diameter", "us"]);
const INTEGER_SOURCES = new Set(["eu", "jp"]);

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

// Schema gate: the input must be a plain object whose own properties are
// exactly `source` and `value`, each an own data property (no accessors)
// holding a string. Anything else is SCHEMA with field/row null.
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

// Parse a grammar-valid decimal string into integer hundredths.
function parseHundredths(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac2 = (fracPart + "00").slice(0, 2);
  return Number(intPart) * 100 + Number(frac2);
}

// Format an amount in 0.01 mm as a one-decimal mm string, rounding half-up
// at the second decimal: tenths = floor((h + 5) / 10).
function formatTenths(hundredths) {
  const tenths = Math.floor((hundredths + 5) / 10);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}

function rowOutput(row) {
  return {
    usSize: row.usSize,
    ukSize: row.ukSize,
    circumferenceMm: formatTenths(row.circH),
  };
}

// Validate the whole input and normalise it to circH. Validation order
// (SPEC inputsOutputs): SCHEMA; then source (UNICODE, ENUM); then value
// (INPUT_LIMIT, UNICODE, EMPTY, grammar); then the semantic checks for the
// chosen source, RANGE before STEP. The first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  const { source, value } = values;

  if (hasUnpairedSurrogate(source)) return fieldError("UNICODE", "source");
  if (!SOURCES.includes(source)) return fieldError("ENUM", "source");

  if (value.length > VALUE_RAW_LIMIT) return fieldError("INPUT_LIMIT", "value");
  if (hasUnpairedSurrogate(value)) return fieldError("UNICODE", "value");
  if (value === "") return fieldError("EMPTY", "value");
  if (DECIMAL_SOURCES.has(source)) {
    if (!DECIMAL_PATTERN.test(value)) return fieldError("DECIMAL_FORMAT", "value");
  } else if (INTEGER_SOURCES.has(source)) {
    if (!INTEGER_PATTERN.test(value)) return fieldError("INTEGER_FORMAT", "value");
  } else if (!UK_LABELS.includes(value)) {
    return fieldError("ENUM", "value");
  }

  let circH;
  if (source === "circumference") {
    circH = parseHundredths(value);
    if (circH < 4000 || circH > 7000) return fieldError("RANGE", "value");
  } else if (source === "diameter") {
    const diaH = parseHundredths(value);
    if (diaH < 1280 || diaH > 2220) return fieldError("RANGE", "value");
    circH = Math.floor(diaH * Math.PI + 0.5);
  } else if (source === "us") {
    const h = parseHundredths(value);
    if (h < 300 || h > 1300) return fieldError("RANGE", "value");
    if (h % 50 !== 0) return fieldError("STEP", "value");
    circH = ROWS[(h - 300) / 50].circH;
  } else if (source === "eu") {
    const eu = Number(value);
    if (eu < 40 || eu > 70) return fieldError("RANGE", "value");
    circH = eu * 100;
  } else if (source === "jp") {
    const n = Number(value);
    if (n < 1 || n > 28) return fieldError("RANGE", "value");
    circH = Math.floor(((Math.PI * (38 + n)) / 3) * 100 + 0.5);
  } else {
    circH = ROWS[UK_LABELS.indexOf(value)].circH;
  }
  return { ok: true, values: { circH } };
}

// The conversion pipeline. Every output is derived from circH alone; the
// original input is never read back.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { circH } = validated.values;

  const diaTenths = Math.floor(circH / (10 * Math.PI) + 0.5);
  const euSize = Math.floor((circH + 50) / 100);
  const jpRaw = Math.floor((3 * circH) / (100 * Math.PI) - 38 + 0.5);
  const jpSize = jpRaw < 1 ? null : jpRaw;

  let nearestIndex = 0;
  let delta = Infinity;
  for (let i = 0; i < ROWS.length; i += 1) {
    const distance = Math.abs(circH - ROWS[i].circH);
    if (distance < delta || (distance === delta && ROWS[i].circH > ROWS[nearestIndex].circH)) {
      nearestIndex = i;
      delta = distance;
    }
  }
  const fit = delta <= FIT_TOLERANCE_H ? "exact" : "between";
  let adjacentRow = null;
  if (fit === "between") {
    if (circH < ROWS[nearestIndex].circH && nearestIndex > 0) {
      adjacentRow = rowOutput(ROWS[nearestIndex - 1]);
    } else if (circH > ROWS[nearestIndex].circH && nearestIndex < ROWS.length - 1) {
      adjacentRow = rowOutput(ROWS[nearestIndex + 1]);
    }
  }

  return {
    ok: true,
    result: {
      circumferenceMm: formatTenths(circH),
      diameterMm: `${Math.floor(diaTenths / 10)}.${diaTenths % 10}`,
      euSize,
      jpSize,
      nearestRow: rowOutput(ROWS[nearestIndex]),
      deltaMm: formatTenths(delta),
      fit,
      adjacentRow,
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

// Serialize a successful result for download as ring-size-report.json:
// canonical compact JSON plus one trailing LF, UTF-8, no BOM. Over the
// 2,097,152-byte report limit the result is OUTPUT_LIMIT and no artifact
// is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
