// Pure core for the Wallpaper Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-wallpaper-calculator-20261109): perimeter or per-wall measurement,
// the drops-per-roll method (strips counted by width, each strip's length
// rounded up to whole pattern repeats after a fixed trim allowance, full
// drops per roll by floor division), three openings-deduction modes, and
// a waste percentage that inflates each wall's strip count before rolls
// are counted. All computation is exact integer centimetre arithmetic;
// metre strings are parsed digit by digit, never through floating point.

export const TRIM_CM = 10; // fixed trim allowance: 5 cm top + 5 cm bottom
export const RAW_LIMIT = 8; // max raw length of every string field, UTF-16 units
export const MAX_WALL_ROWS = 12;
export const MAX_OPENING_ROWS = 20;

export const WALL_MODES = ["perimeter", "walls"];
export const OPENING_MODES = ["none", "area", "list"];

export const DEFAULTS = {
  wallMode: "perimeter",
  perimeterM: "12",
  heightM: "2.5",
  rollWidthM: "0.53",
  rollLengthM: "10.05",
  patternRepeatCm: "0",
  openingsMode: "none",
  wastePercent: "0",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  wallMode: "perimeter",
  perimeterM: "12",
  heightM: "2.5",
  rollWidthM: "0.53",
  rollLengthM: "10.05",
  patternRepeatCm: "0",
  openingsMode: "none",
  wastePercent: "0",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "wallpaper-report.json";

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

const ALWAYS_KEYS = [
  "wallMode",
  "rollWidthM",
  "rollLengthM",
  "patternRepeatCm",
  "openingsMode",
  "wastePercent",
];
const KNOWN_KEYS = new Set([
  ...ALWAYS_KEYS,
  "perimeterM",
  "heightM",
  "walls",
  "openingsAreaM2",
  "openings",
]);
const ARRAY_KEYS = new Set(["walls", "openings"]);

// Inclusive ranges after conversion. Metre fields convert to integer cm;
// openingsAreaM2 converts to integer cm²; the two integer fields are plain.
const RANGES = {
  perimeterM: [1, 20000],
  heightM: [1, 2000],
  widthM: [1, 10000],
  rollWidthM: [10, 200],
  rollLengthM: [100, 10000],
  patternRepeatCm: [0, 200],
  openingsAreaM2: [0, 100000000],
  wastePercent: [0, 50],
};
const INTEGER_FIELDS = new Set(["patternRepeatCm", "wastePercent"]);

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function schemaError(row = null) {
  return fail("SCHEMA", null, row);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

// Read one own data property without invoking accessors. Returns undefined
// when the key is absent, not enumerable as an own key, or an accessor.
function readDataValue(object, key) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(object, key);
  } catch {
    return undefined;
  }
  if (descriptor === undefined || !("value" in descriptor)) return undefined;
  return descriptor.value;
}

// A wall/opening row must be a plain object holding exactly the string
// keys widthM and heightM as own data properties.
function readRow(element) {
  if (!isPlainObject(element)) return null;
  let keys;
  try {
    keys = Object.keys(element);
  } catch {
    return null;
  }
  if (keys.length !== 2) return null;
  const widthM = readDataValue(element, "widthM");
  const heightM = readDataValue(element, "heightM");
  if (typeof widthM !== "string" || typeof heightM !== "string") return null;
  return { widthM, heightM };
}

// Schema phase (SPEC order step 1): plain-object shape, no unknown keys,
// every always-key present, value types, and row element shapes. Element
// shape errors carry the 1-based row; all other schema errors have
// field/row null. Mode-dependent key presence is checked after the ENUM
// step, because the expected key set is only defined for valid modes.
function readSchema(input) {
  if (!isPlainObject(input)) return { error: schemaError() };
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return { error: schemaError() };
  }
  const values = {};
  for (const key of keys) {
    if (!KNOWN_KEYS.has(key)) return { error: schemaError() };
    const value = readDataValue(input, key);
    if (value === undefined) return { error: schemaError() };
    if (ARRAY_KEYS.has(key)) {
      if (!Array.isArray(value)) return { error: schemaError() };
    } else if (typeof value !== "string") {
      return { error: schemaError() };
    }
    values[key] = value;
  }
  for (const key of ALWAYS_KEYS) {
    if (!(key in values)) return { error: schemaError() };
  }
  // Element shapes, in field order: walls rows before openings rows.
  for (const arrayKey of ["walls", "openings"]) {
    if (arrayKey in values) {
      const rows = [];
      for (let i = 0; i < values[arrayKey].length; i += 1) {
        const row = readRow(values[arrayKey][i]);
        if (row === null) return { error: schemaError(i + 1) };
        rows.push(row);
      }
      values[arrayKey] = rows;
    }
  }
  return { values };
}

// After the modes are known to be valid enum values, the exact key set is
// fixed: a missing mode key or a key belonging to another mode is SCHEMA.
function checkModeKeySet(values) {
  const expected = new Set(ALWAYS_KEYS);
  if (values.wallMode === "perimeter") {
    expected.add("perimeterM");
    expected.add("heightM");
  } else {
    expected.add("walls");
  }
  if (values.openingsMode === "area") expected.add("openingsAreaM2");
  if (values.openingsMode === "list") expected.add("openings");
  const actual = Object.keys(values);
  if (actual.length !== expected.size) return false;
  return actual.every((key) => expected.has(key));
}

// Grammar-valid metre string -> integer centimetres, parsed digit by
// digit (the grammar guarantees at most two fraction digits, so x100 is
// exact). Never routes through floating point.
function parseMetresToCm(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac2 = (fracPart + "00").slice(0, 2);
  return Number(intPart) * 100 + Number(frac2);
}

// Grammar-valid m² string -> integer cm² (hundredths of m², then x100).
function parseAreaToCm2(raw) {
  return parseMetresToCm(raw) * 100;
}

// Validate one string field in the SPEC's order: capacity (INPUT_LIMIT),
// unpaired surrogate (UNICODE), missing content (EMPTY), grammar
// (DECIMAL_FORMAT or INTEGER_FORMAT), range (RANGE). On success the
// converted integer value is returned.
function checkField(field, raw, row) {
  if (raw.length > RAW_LIMIT) return fail("INPUT_LIMIT", field, row);
  if (hasUnpairedSurrogate(raw)) return fail("UNICODE", field, row);
  if (raw === "") return fail("EMPTY", field, row);
  const isInteger = INTEGER_FIELDS.has(field);
  if (!(isInteger ? INTEGER_PATTERN : DECIMAL_PATTERN).test(raw)) {
    return fail(isInteger ? "INTEGER_FORMAT" : "DECIMAL_FORMAT", field, row);
  }
  const value =
    field === "openingsAreaM2"
      ? parseAreaToCm2(raw)
      : isInteger
        ? Number(raw)
        : parseMetresToCm(raw);
  const [min, max] = RANGES[field];
  if (value < min || value > max) return fail("RANGE", field, row);
  return { value };
}

// Check an array of dimension rows: length first (EMPTY / ROW_LIMIT on
// the array field itself), then each row in order, widthM before heightM.
function checkRows(arrayKey, rows, limit) {
  if (rows.length === 0) return fail("EMPTY", arrayKey, null);
  if (rows.length > limit) return fail("ROW_LIMIT", arrayKey, null);
  const parsed = [];
  for (let i = 0; i < rows.length; i += 1) {
    const width = checkField("widthM", rows[i].widthM, i + 1);
    if (width.ok === false) return width;
    const height = checkField("heightM", rows[i].heightM, i + 1);
    if (height.ok === false) return height;
    parsed.push({ widthCm: width.value, heightCm: height.value });
  }
  return { rows: parsed };
}

function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

// Format exact cm² as an m² string with exactly two decimals, rounding
// half up at the 0.01 m² step: hundredths = floor((cm2 + 50) / 100).
export function formatAreaM2(cm2) {
  const hundredths = Math.floor((cm2 + 50) / 100);
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

export function run(input) {
  // 1. SCHEMA
  const schema = readSchema(input);
  if (schema.error) return schema.error;
  const values = schema.values;

  // 2. ENUM (wallMode first, then openingsMode)
  if (!WALL_MODES.includes(values.wallMode)) return fail("ENUM", "wallMode", null);
  if (!OPENING_MODES.includes(values.openingsMode)) return fail("ENUM", "openingsMode", null);
  if (!checkModeKeySet(values)) return schemaError();

  // 3. MODE_COMBINATION: an openings list cannot say which wall each
  // opening belongs to, so the dimension list is perimeter-mode only.
  if (values.wallMode === "walls" && values.openingsMode === "list") {
    return fail("MODE_COMBINATION", "openingsMode", null);
  }

  // 4. Per-field checks in the fixed order.
  let wallRowsCm;
  if (values.wallMode === "perimeter") {
    const perimeter = checkField("perimeterM", values.perimeterM, null);
    if (perimeter.ok === false) return perimeter;
    const height = checkField("heightM", values.heightM, null);
    if (height.ok === false) return height;
    wallRowsCm = [{ widthCm: perimeter.value, heightCm: height.value }];
  } else {
    const walls = checkRows("walls", values.walls, MAX_WALL_ROWS);
    if (walls.ok === false) return walls;
    wallRowsCm = walls.rows;
  }

  const rollWidth = checkField("rollWidthM", values.rollWidthM, null);
  if (rollWidth.ok === false) return rollWidth;
  const rollLength = checkField("rollLengthM", values.rollLengthM, null);
  if (rollLength.ok === false) return rollLength;
  const repeat = checkField("patternRepeatCm", values.patternRepeatCm, null);
  if (repeat.ok === false) return repeat;

  let openingsRowsCm = null;
  let openingsAreaInputCm2 = 0;
  if (values.openingsMode === "area") {
    const area = checkField("openingsAreaM2", values.openingsAreaM2, null);
    if (area.ok === false) return area;
    openingsAreaInputCm2 = area.value;
  } else if (values.openingsMode === "list") {
    const openings = checkRows("openings", values.openings, MAX_OPENING_ROWS);
    if (openings.ok === false) return openings;
    openingsRowsCm = openings.rows;
  }

  const waste = checkField("wastePercent", values.wastePercent, null);
  if (waste.ok === false) return waste;

  // 5a. Check the first over-height opening after all per-field checks.
  if (openingsRowsCm !== null) {
    const wallHeightCm = wallRowsCm[0].heightCm;
    const firstOverHeight = openingsRowsCm.findIndex((opening) => opening.heightCm > wallHeightCm);
    if (firstOverHeight !== -1) {
      return fail("OPENING_HEIGHT_EXCEEDS_WALL", "heightM", firstOverHeight + 1);
    }
  }

  // Areas (exact cm²): gross from the full wall dimensions, openings from
  // the area input or the list's own dimensions.
  const grossAreaCm2 = wallRowsCm.reduce((sum, wall) => sum + wall.widthCm * wall.heightCm, 0);
  const openingsWidthSumCm =
    openingsRowsCm === null ? 0 : openingsRowsCm.reduce((sum, row) => sum + row.widthCm, 0);
  const openingsAreaCm2 =
    openingsRowsCm === null
      ? openingsAreaInputCm2
      : openingsRowsCm.reduce((sum, row) => sum + row.widthCm * row.heightCm, 0);

  // 5b. OPENINGS_EXCEED_WALL (list mode: total width first, then area).
  if (openingsRowsCm !== null) {
    if (openingsWidthSumCm >= wallRowsCm[0].widthCm) {
      return fail("OPENINGS_EXCEED_WALL", "openings", null);
    }
    if (openingsAreaCm2 > grossAreaCm2) {
      return fail("OPENINGS_EXCEED_WALL", "openings", null);
    }
  } else if (values.openingsMode === "area" && openingsAreaCm2 > grossAreaCm2) {
    return fail("OPENINGS_EXCEED_WALL", "openingsAreaM2", null);
  }

  // Estimate full strips from the whole wall. Opening widths are a summary,
  // and leftovers are counted independently for each wall.
  const walls = wallRowsCm.map((wall, index) => {
    const strips = ceilDiv(wall.widthCm, rollWidth.value);
    const stripLengthCm =
      repeat.value === 0
        ? wall.heightCm + TRIM_CM
        : ceilDiv(wall.heightCm + TRIM_CM, repeat.value) * repeat.value;
    const dropsPerRoll = Math.floor(rollLength.value / stripLengthCm);
    const stripsWithWaste = ceilDiv(strips * (100 + waste.value), 100);
    const rolls = dropsPerRoll === 0 ? 0 : ceilDiv(stripsWithWaste, dropsPerRoll);
    return {
      index: index + 1,
      widthCm: wall.widthCm,
      openingsWidthCm: openingsWidthSumCm,
      effectiveWidthCm: wall.widthCm,
      strips,
      stripLengthCm,
      dropsPerRoll,
      stripsWithWaste,
      rolls,
    };
  });

  // 5c. STRIP_TOO_LONG: a strip longer than the roll yields zero drops.
  for (const wall of walls) {
    if (wall.dropsPerRoll === 0) {
      return fail("STRIP_TOO_LONG", "rollLengthM", values.wallMode === "walls" ? wall.index : null);
    }
  }

  const netAreaCm2 = grossAreaCm2 - openingsAreaCm2;
  return {
    ok: true,
    result: {
      walls,
      strips: walls.reduce((sum, wall) => sum + wall.strips, 0),
      stripsWithWaste: walls.reduce((sum, wall) => sum + wall.stripsWithWaste, 0),
      rolls: walls.reduce((sum, wall) => sum + wall.rolls, 0),
      grossWallAreaM2: formatAreaM2(grossAreaCm2),
      openingsAreaM2: formatAreaM2(openingsAreaCm2),
      netWallAreaM2: formatAreaM2(netAreaCm2),
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
