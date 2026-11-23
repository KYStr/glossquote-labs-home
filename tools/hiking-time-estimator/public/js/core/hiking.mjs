// Pure core for the Hiking Time Estimator.
//
// Fixed contract: spec-hiking-time-estimator-20261121 (spec draft PR
// #371, registry rev 1702). Naismith's rule: 5 km/h flat plus 1 hour
// per 600 m of ascent; Langmuir descent correction (gentle: -10 min
// per 300 m, steep: +10 min per 300 m, none: no adjustment). All
// derivation runs on exact integers: distance has at most 2 decimals,
// so d100 = distanceKm * 100 is an integer and totalExactMin * 300 =
// d100 * 36 + ascentM * 30 +/- descentM * 10. Half-up rounding is
// integer arithmetic only; binary floating point is used solely to
// express an already-rounded decimal value (n / 10, n / 100), which
// is the correctly rounded double of that decimal. The core never
// reads a clock, the network, storage, or the DOM.

export const FIELDS = ["distanceKm", "ascentM", "descentM", "descentType"];

export const FIELD_LIMITS = {
  distanceKm: 16,
  ascentM: 16,
  descentM: 16,
  descentType: 16,
};

export const DEFAULTS = {
  distanceKm: "12",
  ascentM: "600",
  descentM: "0",
  descentType: "none",
};

export const EXAMPLE = {
  distanceKm: "12",
  ascentM: "600",
  descentM: "0",
  descentType: "none",
};

export const REPORT_FILENAME = "hiking-time-estimate.json";
export const REPORT_LIMIT_BYTES = 2097152;

// ---------------------------------------------------------------------------
// Small helpers

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Reads one field as an own data property. Accessors are never invoked:
// a non-data descriptor (or a missing key) yields undefined here and the
// caller reports SCHEMA.
function readRawInput(source, field) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, field);
  if (descriptor === undefined || !("value" in descriptor)) return undefined;
  return descriptor.value;
}

// The shape rule: input must be a plain object whose keys are a subset
// of FIELDS, with distanceKm and ascentM present as own string data
// properties; descentM / descentType are optional (missing means the
// SPEC default). Every present value must be a string.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const keys = Object.keys(input);
  for (const key of keys) {
    if (!FIELDS.includes(key)) return null;
  }
  const snapshot = {};
  for (const field of ["distanceKm", "ascentM"]) {
    const value = readRawInput(input, field);
    if (typeof value !== "string") return null;
    snapshot[field] = value;
  }
  for (const field of ["descentM", "descentType"]) {
    const value = readRawInput(input, field);
    if (value === undefined) {
      snapshot[field] = field === "descentM" ? "0" : "none";
    } else {
      if (typeof value !== "string") return null;
      snapshot[field] = value === "" ? (field === "descentM" ? "0" : "none") : value;
    }
  }
  return snapshot;
}

// Per-field prelude, in the SPEC's order: capacity, then unpaired
// surrogate, then emptiness. Returns an error object or null.
function checkPrelude(field, value) {
  if (value.length > FIELD_LIMITS[field]) return failure("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(value)) return failure("UNICODE", field);
  if (value === "") return failure("EMPTY", field);
  return null;
}

// ---------------------------------------------------------------------------
// Field grammars. Each returns { value } or { error } (prelude already ran).

const DISTANCE_PATTERN = /^\d+(\.\d{1,2})?$/;
const INTEGER_PATTERN = /^\d+$/;
const DESCENT_TYPES = new Set(["none", "gentle", "steep"]);

function parseDistanceKm(text) {
  if (!DISTANCE_PATTERN.test(text)) return { error: failure("DECIMAL_FORMAT", "distanceKm") };
  // Exact integer hundredths: at most 2 decimals by the grammar above.
  const dot = text.indexOf(".");
  const d100 =
    dot === -1
      ? Number(text) * 100
      : Number(text.slice(0, dot)) * 100 + Number(text.slice(dot + 1).padEnd(2, "0"));
  if (d100 < 10 || d100 > 20000) return { error: failure("RANGE", "distanceKm") };
  return { value: d100 };
}

function parseIntegerMeters(text, field) {
  if (!INTEGER_PATTERN.test(text)) return { error: failure("INTEGER_FORMAT", field) };
  const value = Number(text);
  if (value < 0 || value > 10000) return { error: failure("RANGE", field) };
  return { value };
}

function parseDescentType(text) {
  if (!DESCENT_TYPES.has(text)) return { error: failure("ENUM", "descentType") };
  return { value: text };
}

// ---------------------------------------------------------------------------
// Exact integer rounding helpers. All numerators are >= 0 here.

// Half-up of numer / denom to an integer.
function halfUpInt(numer, denom) {
  return Math.floor((2 * numer + denom) / (2 * denom));
}

// Half-up of numer / denom to 1 decimal, returned as an integer number
// of tenths.
function halfUpTenths(numer, denom) {
  return Math.floor((20 * numer + denom) / (2 * denom));
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// run: validate a raw string snapshot and compute the hiking estimate.

export function run(input) {
  const snapshot = readSchema(input);
  if (snapshot === null) return failure("SCHEMA", null);

  // Fields in the SPEC's order: distanceKm, ascentM, descentM,
  // descentType. Per field: capacity, then EMPTY, then grammar, then
  // range. descentM / descentType arrive pre-defaulted (missing or
  // empty means "0" / "none"), so they never report EMPTY.
  const distancePrelude = checkPrelude("distanceKm", snapshot.distanceKm);
  if (distancePrelude !== null) return distancePrelude;
  const parsedDistance = parseDistanceKm(snapshot.distanceKm);
  if (parsedDistance.error) return parsedDistance.error;
  const d100 = parsedDistance.value;

  const ascentPrelude = checkPrelude("ascentM", snapshot.ascentM);
  if (ascentPrelude !== null) return ascentPrelude;
  const parsedAscent = parseIntegerMeters(snapshot.ascentM, "ascentM");
  if (parsedAscent.error) return parsedAscent.error;
  const ascentM = parsedAscent.value;

  const descentPrelude = checkPrelude("descentM", snapshot.descentM);
  if (descentPrelude !== null) return descentPrelude;
  const parsedDescent = parseIntegerMeters(snapshot.descentM, "descentM");
  if (parsedDescent.error) return parsedDescent.error;
  const descentM = parsedDescent.value;

  const typePrelude = checkPrelude("descentType", snapshot.descentType);
  if (typePrelude !== null) return typePrelude;
  const parsedType = parseDescentType(snapshot.descentType);
  if (parsedType.error) return parsedType.error;
  const descentType = parsedType.value;

  // Exact derivation. totalExactMin * 300 =
  // d100 * 36 + ascentM * 30 +/- descentM * 10 (gentle -, steep +, none 0).
  const sign = descentType === "gentle" ? -1 : descentType === "steep" ? 1 : 0;
  const numerator = d100 * 36 + ascentM * 30 + sign * descentM * 10;
  const flooredNumerator = numerator < 0 ? 0 : numerator;

  const totalMinutes = halfUpInt(flooredNumerator, 300);
  const totalDisplay = `${Math.floor(totalMinutes / 60)}:${pad2(totalMinutes % 60)}`;

  // paceMinPerKm: floored totalExactMin / distanceKm, half-up to 1 dp.
  // totalExactMin / distanceKm = flooredNumerator / (3 * d100).
  const paceTenths = halfUpTenths(flooredNumerator, 3 * d100);
  // equivalentFlatKm: distanceKm + 7.92 * ascentM / 1000, half-up to
  // 2 dp. In hundredths: d100 + 792 * ascentM / 1000, i.e. the integer
  // half-up of (d100 * 1000 + 792 * ascentM) / 1000.
  const equivalentHundredths = halfUpInt(d100 * 1000 + 792 * ascentM, 1000);

  // Segment display values, each half-up to 1 dp on its own exact
  // value; a negative descent adjustment rounds its absolute value
  // and takes the sign back.
  const flatTenths = halfUpTenths(d100 * 12, 100);
  const ascentTenths = halfUpTenths(ascentM, 10);
  const descentTenths = sign * halfUpTenths(descentM, 30);

  const result = {
    flatMinutes: flatTenths / 10,
    ascentMinutes: ascentTenths / 10,
    descentAdjustmentMinutes: descentTenths === 0 ? 0 : descentTenths / 10,
    totalMinutes,
    totalDisplay,
    paceMinPerKm: paceTenths / 10,
    equivalentFlatKm: equivalentHundredths / 100,
  };
  return { ok: true, result };
}

// ---------------------------------------------------------------------------
// Canonical report serialization: compact JSON, object keys sorted
// ascending by UTF-16 code units recursively, array order unchanged,
// exactly one trailing LF. Built from primitives only — an input
// toJSON is never invoked.

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number in report");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeValue(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts = keys.map((key) => `${JSON.stringify(key)}:${serializeValue(value[key])}`);
    return `{${parts.join(",")}}`;
  }
  throw new TypeError("unsupported value in report");
}

export function serializeReport(result) {
  return `${serializeValue(result)}\n`;
}
