// Pure core for the Clothing Size Converter.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-clothing-size-converter-20261109): two fixed lookup tables —
// women's tops keyed by bust and men's tops keyed by chest, both in
// centimetres with half-open [cmLow, cmHigh) ranges — are literal data
// below. Nothing is derived by formula: a size code is found by exact
// match in the pinned columns, and a measurement by integer-millimetre
// comparison against the pinned bounds. Cells with no label are null
// and never participate in a lookup.

export const FIELDS = ["garment", "mode", "measurementCm", "fromSystem", "sizeValue"];

export const GARMENTS = ["women", "men"];
export const MODES = ["measurement", "size"];
export const SYSTEMS = ["us", "uk", "eu", "jp"];

// Raw capacity per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = {
  garment: 5,
  mode: 11,
  measurementCm: 5,
  fromSystem: 2,
  sizeValue: 4,
};

export const DEFAULTS = {
  garment: "women",
  mode: "measurement",
  measurementCm: "",
  fromSystem: "us",
  sizeValue: "",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  garment: "women",
  mode: "measurement",
  measurementCm: "88",
  fromSystem: "us",
  sizeValue: "",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "clothing-size-report.json";

// Measurement field range in integer millimetres: 50.0–200.0 cm.
export const MEASUREMENT_MIN_MM = 500;
export const MEASUREMENT_MAX_MM = 2000;

// Fixed women's tops table (SPEC, keyed by bust cm, half-open ranges).
export const WOMEN_ROWS = [
  { row: 1, cmLow: 74, cmHigh: 79, usLetter: "XXS", usNumeric: "0", ukNumeric: "4", euNumeric: "30", jpLetter: null, jpNumeric: "3" },
  { row: 2, cmLow: 79, cmHigh: 84, usLetter: "XS", usNumeric: "2", ukNumeric: "6", euNumeric: "32", jpLetter: null, jpNumeric: "5" },
  { row: 3, cmLow: 84, cmHigh: 89, usLetter: "S", usNumeric: "4", ukNumeric: "8", euNumeric: "34", jpLetter: "S", jpNumeric: "7" },
  { row: 4, cmLow: 89, cmHigh: 94, usLetter: "M", usNumeric: "6", ukNumeric: "10", euNumeric: "36", jpLetter: "M", jpNumeric: "9" },
  { row: 5, cmLow: 94, cmHigh: 99, usLetter: "L", usNumeric: "8", ukNumeric: "12", euNumeric: "38", jpLetter: "L", jpNumeric: "11" },
  { row: 6, cmLow: 99, cmHigh: 104, usLetter: "XL", usNumeric: "10", ukNumeric: "14", euNumeric: "40", jpLetter: "LL", jpNumeric: "13" },
  { row: 7, cmLow: 104, cmHigh: 110, usLetter: "XXL", usNumeric: "12", ukNumeric: "16", euNumeric: "42", jpLetter: null, jpNumeric: "15" },
  { row: 8, cmLow: 110, cmHigh: 116, usLetter: "XXXL", usNumeric: "14", ukNumeric: "18", euNumeric: "44", jpLetter: null, jpNumeric: "17" },
];

// Fixed men's tops table (SPEC, keyed by chest cm, half-open ranges).
// UK numbers equal the US numbers (both are chest-inches labels) and the
// JP numeric column is always null, exactly as pinned.
export const MEN_ROWS = [
  { row: 1, cmLow: 86, cmHigh: 91, usLetter: "XS", usNumeric: "34", ukNumeric: "34", euNumeric: "44", jpLetter: "S", jpNumeric: null },
  { row: 2, cmLow: 91, cmHigh: 96, usLetter: "S", usNumeric: "36", ukNumeric: "36", euNumeric: "46", jpLetter: "M", jpNumeric: null },
  { row: 3, cmLow: 96, cmHigh: 101, usLetter: "M", usNumeric: "38", ukNumeric: "38", euNumeric: "48", jpLetter: "L", jpNumeric: null },
  { row: 4, cmLow: 101, cmHigh: 106, usLetter: "L", usNumeric: "40", ukNumeric: "40", euNumeric: "50", jpLetter: "XL", jpNumeric: null },
  { row: 5, cmLow: 106, cmHigh: 111, usLetter: "XL", usNumeric: "42", ukNumeric: "42", euNumeric: "52", jpLetter: "2L", jpNumeric: null },
  { row: 6, cmLow: 111, cmHigh: 116, usLetter: "XXL", usNumeric: "44", ukNumeric: "44", euNumeric: "54", jpLetter: "3L", jpNumeric: null },
  { row: 7, cmLow: 116, cmHigh: 121, usLetter: "XXXL", usNumeric: "46", ukNumeric: "46", euNumeric: "56", jpLetter: "4L", jpNumeric: null },
];

export const ROWS = { women: WOMEN_ROWS, men: MEN_ROWS };

// Which columns a source system searches, in order, and whether a hit in
// that column counts as a letter or a numeric match (SPEC inputsOutputs).
const SEARCH_COLUMNS = {
  us: [
    ["usLetter", "letter"],
    ["usNumeric", "numeric"],
  ],
  uk: [["ukNumeric", "numeric"]],
  eu: [["euNumeric", "numeric"]],
  jp: [
    ["jpLetter", "letter"],
    ["jpNumeric", "numeric"],
  ],
};

// Measurement grammar: ASCII, integer part "0" or 1–3 digits without a
// leading zero, optionally one decimal digit. No spaces/signs/exponent.
const DECIMAL_PATTERN = /^(0|[1-9][0-9]{0,2})(\.[0-9])?$/;
// Size code raw form: ASCII letters and digits only.
const SIZE_RAW_PATTERN = /^[A-Za-z0-9]+$/;
const NUMERIC_PATTERN = /^[0-9]+$/;

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
// exactly the five fields, each an own data property (no accessors)
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

// Capacity then surrogate — the checks every field gets, in this order,
// before any content validation (SPEC inputsOutputs).
function checkCapacityUnicode(value, field) {
  if (value.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(value)) return fieldError("UNICODE", field);
  return null;
}

// Parse a grammar-valid measurement string into integer millimetres.
// The grammar allows at most one decimal digit, so the conversion is
// exact and never rounds.
function parseMillimetres(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracDigit = dot === -1 ? 0 : Number(raw.slice(dot + 1));
  return Number(intPart) * 10 + fracDigit;
}

// The result's measurementCm: a number in cm with one decimal place;
// whole values are presented as integers (88, not 88.0). Tenths of a cm
// are exactly representable, so this never introduces float error.
function millimetresToCm(mm) {
  return mm % 10 === 0 ? mm / 10 : mm / 10;
}

function rowOutput(row) {
  return {
    row: row.row,
    cmLow: row.cmLow,
    cmHigh: row.cmHigh,
    usLetter: row.usLetter,
    usNumeric: row.usNumeric,
    ukNumeric: row.ukNumeric,
    euNumeric: row.euNumeric,
    jpLetter: row.jpLetter,
    jpNumeric: row.jpNumeric,
  };
}

// Validate the whole input in the SPEC's pinned order and run the
// lookup. Cross-field order follows the field order; within a field the
// order is capacity, surrogate, then that field's grammar/rules. Fields
// the active mode does not use still get capacity + surrogate checks.
export function run(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  const { garment, mode, measurementCm, fromSystem, sizeValue } = values;

  let failure = checkCapacityUnicode(garment, "garment");
  if (failure) return failure;
  if (garment === "") return fieldError("EMPTY", "garment");
  if (!GARMENTS.includes(garment)) return fieldError("ENUM", "garment");

  failure = checkCapacityUnicode(mode, "mode");
  if (failure) return failure;
  if (mode === "") return fieldError("EMPTY", "mode");
  if (!MODES.includes(mode)) return fieldError("ENUM", "mode");

  const rows = ROWS[garment];

  if (mode === "measurement") {
    failure = checkCapacityUnicode(measurementCm, "measurementCm");
    if (failure) return failure;
    if (measurementCm === "") return fieldError("EMPTY", "measurementCm");
    if (!DECIMAL_PATTERN.test(measurementCm)) return fieldError("DECIMAL_FORMAT", "measurementCm");
    const mm = parseMillimetres(measurementCm);
    if (mm < MEASUREMENT_MIN_MM || mm > MEASUREMENT_MAX_MM) {
      return fieldError("RANGE", "measurementCm");
    }
    failure = checkCapacityUnicode(fromSystem, "fromSystem");
    if (failure) return failure;
    failure = checkCapacityUnicode(sizeValue, "sizeValue");
    if (failure) return failure;

    const first = rows[0];
    const last = rows[rows.length - 1];
    let status;
    let hit = null;
    if (mm < first.cmLow * 10) {
      status = "below-range";
    } else if (mm >= last.cmHigh * 10) {
      status = "above-range";
    } else {
      status = "in-range";
      hit = rows.find((row) => mm >= row.cmLow * 10 && mm < row.cmHigh * 10) ?? null;
    }
    return {
      ok: true,
      result: {
        garment,
        mode: "measurement",
        measurementCm: millimetresToCm(mm),
        status,
        onBoundary: hit !== null && mm === hit.cmLow * 10,
        row: hit === null ? null : rowOutput(hit),
      },
    };
  }

  // mode === "size"
  failure = checkCapacityUnicode(measurementCm, "measurementCm");
  if (failure) return failure;

  failure = checkCapacityUnicode(fromSystem, "fromSystem");
  if (failure) return failure;
  if (fromSystem === "") return fieldError("EMPTY", "fromSystem");
  if (!SYSTEMS.includes(fromSystem)) return fieldError("ENUM", "fromSystem");

  failure = checkCapacityUnicode(sizeValue, "sizeValue");
  if (failure) return failure;
  if (sizeValue === "") return fieldError("EMPTY", "sizeValue");
  if (!SIZE_RAW_PATTERN.test(sizeValue)) return fieldError("SIZE_FORMAT", "sizeValue");
  const sizeToken = sizeValue.toUpperCase();
  if (NUMERIC_PATTERN.test(sizeToken) && sizeToken.length > 1 && sizeToken.startsWith("0")) {
    return fieldError("SIZE_FORMAT", "sizeValue");
  }

  for (const [column, matchedBy] of SEARCH_COLUMNS[fromSystem]) {
    for (const row of rows) {
      if (row[column] !== null && row[column] === sizeToken) {
        return {
          ok: true,
          result: {
            garment,
            mode: "size",
            fromSystem,
            sizeToken,
            matchedBy,
            row: rowOutput(row),
          },
        };
      }
    }
  }
  return fieldError("UNKNOWN_SIZE", "sizeValue");
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls on the input.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download as clothing-size-report.json:
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
