// Pure core for the Brick Calculator
// (spec-brick-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. All
// derivation is exact BigInt rational arithmetic in 0.1 mm units, so
// no floating point ever participates; rounding (half-up, away from
// zero, applied only at final output) is done on exact rationals.
//
// SPEC-pinned rules implemented here:
// - net bricks = ceil(exact count); bricks to buy =
//   ceil(exact count x (1 + waste)); waste is applied once, to the
//   unrounded exact count, never to the already-rounded integer.
// - mortar = wall volume - brick volume; with a 0 mm joint the
//   formula is exactly 0.
// - default waste 5%; default presets: taiwan-red 230x60x110,
//   uk-standard 215x65x102.5, us-modular 194x57x92 mm (length x
//   height x width, nominal sizes, not certified standard values).
// - validation order per field: capacity, unpaired surrogate,
//   grammar, range; fields in the SPEC order wallLengthM,
//   wallHeightM, openings (per row widthM, heightM), brickPreset,
//   brickLengthMm, brickHeightMm, brickWidthMm, jointMm, wastePct;
//   cross-field opening-area check only after all fields pass.
// The result shape follows fixtures.json exactly:
// {grossAreaM2, openingAreaM2, netAreaM2, bricksPerM2, bricksNet,
// bricksToBuy, mortarVolumeM3, mortarVolumeL, wastePct}.

export const FIELDS = [
  "wallLengthM",
  "wallHeightM",
  "openings",
  "brickPreset",
  "brickLengthMm",
  "brickHeightMm",
  "brickWidthMm",
  "jointMm",
  "wastePct",
];

export const DEFAULTS = {
  wallLengthM: "4",
  wallHeightM: "2.5",
  openings: [],
  brickPreset: "taiwan-red",
  jointMm: "10",
  wastePct: "5",
};

// The worked example is fixtures.json case 1 (standard-wall)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  brickPreset: "taiwan-red",
  jointMm: "10",
  openings: [],
  wallHeightM: "2.5",
  wallLengthM: "4",
  wastePct: "5",
};

export const PRESETS = {
  "taiwan-red": { nameZh: "紅磚", nameEn: "Taiwan red brick", lengthMm: 230, heightMm: 60, widthMm: 110 },
  "uk-standard": { nameZh: "英規標準磚", nameEn: "UK standard brick", lengthMm: 215, heightMm: 65, widthMm: 102.5 },
  "us-modular": { nameZh: "美規模組磚", nameEn: "US modular brick", lengthMm: 194, heightMm: 57, widthMm: 92 },
};

export const MAX_RAW_UNITS = 12;

// Scaled integer ranges. Decimal wall/opening fields are parsed to
// integer millimetres (3 decimals); joint to integer 0.1 mm
// (1 decimal); waste to integer hundredths of a percent (2 decimals).
export const WALL_MIN_MM = 10;
export const WALL_MAX_MM = 100000;
export const JOINT_MIN_TENTHS_MM = 0;
export const JOINT_MAX_TENTHS_MM = 200;
export const WASTE_MIN_HUNDREDTHS = 0;
export const WASTE_MAX_HUNDREDTHS = 5000;
export const BRICK_LENGTH_MIN_MM = 20;
export const BRICK_LENGTH_MAX_MM = 500;
export const BRICK_HEIGHT_MIN_MM = 20;
export const BRICK_HEIGHT_MAX_MM = 300;
export const BRICK_WIDTH_MIN_MM = 20;
export const BRICK_WIDTH_MAX_MM = 300;
export const MAX_OPENINGS = 10;

const DECIMAL_PATTERN = /^([0-9]+)(?:\.([0-9]+))?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field, row = null) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

// Parses an ASCII decimal string into an exact integer in units of
// 10^-decimals. Returns null when the grammar fails (wrong shape or
// too many fractional digits); the caller reports DECIMAL_FORMAT.
function parseDecimalScaled(value, decimals) {
  const match = DECIMAL_PATTERN.exec(value);
  if (match === null) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return null;
  const padded = fraction.padEnd(decimals, "0");
  return BigInt(match[1] + padded);
}

function parseInteger(value) {
  if (!INTEGER_PATTERN.test(value)) return null;
  return BigInt(value);
}

// One scalar string field, in the SPEC order: capacity, unpaired
// surrogate, empty, grammar, range. Returns { value: BigInt } or
// { error }.
function validateDecimalField(field, value, decimals, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  const parsed = parseDecimalScaled(value, decimals);
  if (parsed === null) return { error: failure("DECIMAL_FORMAT", field) };
  if (parsed < BigInt(min) || parsed > BigInt(max)) return { error: failure("RANGE", field) };
  return { value: parsed };
}

function validateIntegerField(field, value, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  const parsed = parseInteger(value);
  if (parsed === null) return { error: failure("INTEGER_FORMAT", field) };
  if (parsed < BigInt(min) || parsed > BigInt(max)) return { error: failure("RANGE", field) };
  return { value: parsed };
}

// Reads only own data properties; accessors are never invoked.
// Returns the raw string map plus the openings array (own data
// only), or null when the top-level shape is not a plain object with
// known string-valued fields. Brick-dimension fields are returned
// separately (rawBrickDims) so the preset-conditional SCHEMA rules
// can report the column name: a non-custom preset carrying any of
// them is SCHEMA naming that column, whatever the value is.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  const allowed = new Set(FIELDS);
  for (const key of keys) {
    if (!allowed.has(key)) return null;
  }
  if (!keys.includes("wallLengthM") || !keys.includes("wallHeightM")) return null;
  const raw = {};
  const rawBrickDims = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (key === "openings") {
      if (!Array.isArray(descriptor.value)) return null;
      raw.openings = descriptor.value;
      continue;
    }
    if (key === "brickLengthMm" || key === "brickHeightMm" || key === "brickWidthMm") {
      rawBrickDims[key] = descriptor.value;
      continue;
    }
    if (typeof descriptor.value !== "string") return null;
    raw[key] = descriptor.value;
  }
  if (!("openings" in raw)) raw.openings = [];
  if (!("brickPreset" in raw)) raw.brickPreset = "taiwan-red";
  if (!("jointMm" in raw)) raw.jointMm = "10";
  if (!("wastePct" in raw)) raw.wastePct = "5";
  return { raw, rawBrickDims };
}

// Validates the openings array: at most 10 rows, each a plain
// object holding exactly widthM and heightM as own string data, then
// per-row widthM/heightM in order. Returns { rows: [{wMm, hMm}] }
// in integer millimetres, or { error }.
function validateOpenings(openings) {
  if (openings.length > MAX_OPENINGS) {
    return { error: failure("ROW_LIMIT", "openings") };
  }
  const rows = [];
  for (let index = 0; index < openings.length; index += 1) {
    const row = openings[index];
    const rowNumber = index + 1;
    if (!isPlainObject(row)) {
      return { error: failure("SCHEMA", "openings", rowNumber) };
    }
    const rowKeys = Object.keys(row);
    if (
      rowKeys.length !== 2 ||
      !rowKeys.includes("widthM") ||
      !rowKeys.includes("heightM")
    ) {
      return { error: failure("SCHEMA", "openings", rowNumber) };
    }
    const values = {};
    for (const field of ["widthM", "heightM"]) {
      const descriptor = Object.getOwnPropertyDescriptor(row, field);
      if (descriptor === undefined || !("value" in descriptor)) {
        return { error: failure("SCHEMA", field, rowNumber) };
      }
      if (typeof descriptor.value !== "string") {
        return { error: failure("SCHEMA", field, rowNumber) };
      }
      values[field] = descriptor.value;
    }
    for (const field of ["widthM", "heightM"]) {
      const outcome = validateDecimalField(
        field,
        values[field],
        3,
        WALL_MIN_MM,
        WALL_MAX_MM,
      );
      if (outcome.error) {
        const inner = outcome.error.error;
        return { error: failure(inner.code, inner.field, rowNumber) };
      }
      values[field] = outcome.value;
    }
    rows.push({ wMm: values.widthM, hMm: values.heightM });
  }
  return { rows };
}

// Exact ceiling division for non-negative BigInts.
function ceilDiv(numerator, denominator) {
  return (numerator + denominator - 1n) / denominator;
}

// Rounds an exact non-negative rational numerator/denominator to
// `places` decimal places, half-up (0.5 rounds away from zero),
// and returns the result as a Number. The scaled integer is exact,
// so the Number is the same double JSON.parse of the decimal text
// would produce.
function roundHalfUp(numerator, denominator, places) {
  const scale = 10n ** BigInt(places);
  const scaled = (2n * numerator * scale + denominator) / (2n * denominator);
  return Number(scaled) / Number(scale);
}

export function run(input) {
  const read = readRawInput(input);
  if (read === null) return failure("SCHEMA", null);
  const { raw, rawBrickDims } = read;

  const wallLength = validateDecimalField(
    "wallLengthM",
    raw.wallLengthM,
    3,
    WALL_MIN_MM,
    WALL_MAX_MM,
  );
  if (wallLength.error) return wallLength.error;
  const wallHeight = validateDecimalField(
    "wallHeightM",
    raw.wallHeightM,
    3,
    WALL_MIN_MM,
    WALL_MAX_MM,
  );
  if (wallHeight.error) return wallHeight.error;

  const openings = validateOpenings(raw.openings);
  if (openings.error) return openings.error;

  // brickPreset: no stated capacity; empty or off-enum is SCHEMA.
  const preset = raw.brickPreset;
  if (preset.length > MAX_RAW_UNITS) return failure("INPUT_LIMIT", "brickPreset");
  if (hasLoneSurrogate(preset)) return failure("UNICODE", "brickPreset");
  if (!(preset === "taiwan-red" || preset === "uk-standard" || preset === "us-modular" || preset === "custom")) {
    return failure("SCHEMA", "brickPreset");
  }

  // Brick dimensions: only custom carries them. A non-custom preset
  // carrying any of them is SCHEMA naming that column (SPEC rule 1).
  let brickLengthMm;
  let brickHeightMm;
  let brickWidthMm;
  if (preset !== "custom") {
    for (const field of ["brickLengthMm", "brickHeightMm", "brickWidthMm"]) {
      if (field in rawBrickDims) return failure("SCHEMA", field);
    }
    const pinned = PRESETS[preset];
    brickLengthMm = pinned.lengthMm;
    brickHeightMm = pinned.heightMm;
    brickWidthMm = pinned.widthMm;
  } else {
    const dims = {};
    for (const [field, min, max] of [
      ["brickLengthMm", BRICK_LENGTH_MIN_MM, BRICK_LENGTH_MAX_MM],
      ["brickHeightMm", BRICK_HEIGHT_MIN_MM, BRICK_HEIGHT_MAX_MM],
      ["brickWidthMm", BRICK_WIDTH_MIN_MM, BRICK_WIDTH_MAX_MM],
    ]) {
      if (!(field in rawBrickDims)) return failure("SCHEMA", null);
      const descriptorValue = rawBrickDims[field];
      if (typeof descriptorValue !== "string") return failure("SCHEMA", null);
      const outcome = validateIntegerField(field, descriptorValue, min, max);
      if (outcome.error) return outcome.error;
      dims[field] = outcome.value;
    }
    brickLengthMm = dims.brickLengthMm;
    brickHeightMm = dims.brickHeightMm;
    brickWidthMm = dims.brickWidthMm;
  }

  const joint = validateDecimalField(
    "jointMm",
    raw.jointMm,
    1,
    JOINT_MIN_TENTHS_MM,
    JOINT_MAX_TENTHS_MM,
  );
  if (joint.error) return joint.error;
  const waste = validateDecimalField(
    "wastePct",
    raw.wastePct,
    2,
    WASTE_MIN_HUNDREDTHS,
    WASTE_MAX_HUNDREDTHS,
  );
  if (waste.error) return waste.error;

  // --- Exact derivation, all in 0.1 mm units (u). ---
  // 1 m = 10,000 u; 1 m^2 = 10^8 u^2; 1 m^3 = 10^12 u^3.
  const lengthU = wallLength.value * 10n;
  const heightU = wallHeight.value * 10n;
  const jointU = joint.value;
  const grossAreaU2 = lengthU * heightU;
  let openingAreaU2 = 0n;
  for (const row of openings.rows) {
    openingAreaU2 += row.wMm * 10n * (row.hMm * 10n);
  }
  const netAreaU2 = grossAreaU2 - openingAreaU2;

  // Cross-field: total opening area must be less than the wall area.
  if (openingAreaU2 >= grossAreaU2) {
    return failure("RANGE", "openings");
  }

  // Brick dimensions in 0.1 mm; uk-standard width 102.5 mm is 1025 u.
  const brickLengthU = BigInt(Math.round(Number(brickLengthMm) * 10));
  const brickHeightU = BigInt(Math.round(Number(brickHeightMm) * 10));
  const brickWidthU = BigInt(Math.round(Number(brickWidthMm) * 10));
  const effFaceU2 = (brickLengthU + jointU) * (brickHeightU + jointU);
  const bricksNet = ceilDiv(netAreaU2, effFaceU2);
  const bricksToBuy = ceilDiv(
    netAreaU2 * (10000n + waste.value),
    effFaceU2 * 10000n,
  );

  // Mortar: wall volume minus brick volume, as one exact rational.
  // mortarM3 = netAreaU2 * (brickWidthU * effFaceU2 - brickVolU3)
  //            / (10^12 * effFaceU2); with a 0 joint the bracket is
  //            exactly 0, so mortar is exactly 0.
  const brickVolU3 = brickLengthU * brickWidthU * brickHeightU;
  const mortarNumerator = netAreaU2 * (brickWidthU * effFaceU2 - brickVolU3);
  const mortarDenominator = 1000000000000n * effFaceU2;

  const grossAreaM2 = roundHalfUp(grossAreaU2, 100000000n, 2);
  const openingAreaM2 = roundHalfUp(openingAreaU2, 100000000n, 2);
  const netAreaM2 = roundHalfUp(netAreaU2, 100000000n, 2);
  const bricksPerM2 = roundHalfUp(100000000n, effFaceU2, 2);
  const mortarVolumeM3 = roundHalfUp(mortarNumerator, mortarDenominator, 3);
  const mortarVolumeL = roundHalfUp(mortarNumerator * 1000n, mortarDenominator, 1);

  return {
    ok: true,
    result: {
      grossAreaM2,
      openingAreaM2,
      netAreaM2,
      bricksPerM2,
      bricksNet: Number(bricksNet),
      bricksToBuy: Number(bricksToBuy),
      mortarVolumeM3,
      mortarVolumeL,
      wastePct: Number(waste.value) / 100,
    },
  };
}

// Fixed report download: brick-calculator-report.json. The content
// is the result's compact JSON with object keys sorted recursively
// by UTF-16 code units, array order unchanged, exactly one trailing
// LF, UTF-8 without BOM. The serializer is hand-written: it never
// calls a value's toJSON and accepts only the plain data shapes a
// result can hold (null, booleans, finite numbers, strings, arrays,
// plain objects).
export const REPORT_FILENAME = "brick-calculator-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
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
