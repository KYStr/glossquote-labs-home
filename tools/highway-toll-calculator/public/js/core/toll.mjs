// Pure core for the Highway Toll Calculator.
//
// Fixed contract: spec-highway-toll-calculator-20261121 (spec draft PR
// #388, registry rev 1787). Taiwan ETC distance-based tolls: the first
// 20 km of a vehicle's day are free, 20-200 km are charged at the
// standard rate, and the part beyond 200 km is charged at 75% of the
// standard rate (large-vehicle long rate is the official table value
// 1.12, not 1.50 x 0.75 = 1.125). The daily allowance and the 200 km
// threshold are settled per vehicle per day, so this trip's charge is
// gross(priorKm + distanceKm) - gross(priorKm). eTag takes 10% off
// before the single final half-up rounding to whole NT$.
//
// All derivation runs on exact integers: distances have at most 1
// decimal, so tenths are integers, and rates are integers in
// milli-NT$ per km (1.20 -> 1200). Binary floating point is used
// solely to express an already-rounded decimal value (n / 10,
// n / 1000), which is the correctly rounded double of that decimal.
// The core never reads a clock, the network, storage, or the DOM.

export const FIELDS = ["mode", "vehicleType", "entry", "exit", "distanceKm", "priorKm", "etag"];

export const FIELD_LIMITS = {
  mode: 16,
  vehicleType: 16,
  entry: 16,
  exit: 16,
  distanceKm: 16,
  priorKm: 16,
  etag: 16,
};

export const DEFAULTS = {
  mode: "distance",
  vehicleType: "small",
  distanceKm: "100",
  priorKm: "0",
  etag: "false",
  entry: null,
  exit: null,
};

// The worked example: fixtures.json case 1 (Taipei to Taichung).
export const EXAMPLE = {
  distanceKm: null,
  entry: "taipei",
  etag: "false",
  exit: "taichung",
  mode: "pair",
  priorKm: "0",
  vehicleType: "small",
};

export const REPORT_FILENAME = "highway-toll-calculator-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

// National Freeway 1 interchanges, km from the Keelung end in tenths.
export const INTERCHANGES = [
  { id: "keelung", kmTenths: 0 },
  { id: "xizhi", kmTenths: 105 },
  { id: "neihu", kmTenths: 168 },
  { id: "taipei", kmTenths: 251 },
  { id: "wugu", kmTenths: 331 },
  { id: "linkou", kmTenths: 415 },
  { id: "taoyuan", kmTenths: 491 },
  { id: "zhongli", kmTenths: 624 },
  { id: "yangmei", kmTenths: 692 },
  { id: "hukou", kmTenths: 838 },
  { id: "taichung", kmTenths: 1786 },
  { id: "changhua", kmTenths: 1984 },
  { id: "tainan", kmTenths: 3274 },
  { id: "kaohsiung_end", kmTenths: 3728 },
];

const INTERCHANGE_KM = new Map(INTERCHANGES.map((entry) => [entry.id, entry.kmTenths]));

// Rates in milli-NT$ per km: [standard, long]. The long rate is 75%
// of the standard rate, except the large-vehicle long rate, which is
// the official table value 1.12 (1.50 x 0.75 = 1.125, table says 1.12).
const RATES_MILLI = {
  small: [1200, 900],
  large: [1500, 1120],
  trailer: [1800, 1350],
};

export const RATES = {
  small: { rateStandard: 1.2, rateLong: 0.9 },
  large: { rateStandard: 1.5, rateLong: 1.12 },
  trailer: { rateStandard: 1.8, rateLong: 1.35 },
};

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
// caller reports SCHEMA (or applies the SPEC default).
function readRawInput(source, field) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, field);
  if (descriptor === undefined || !("value" in descriptor)) return undefined;
  return descriptor.value;
}

// The shape rule: input must be a plain object whose keys are a subset
// of FIELDS. mode / vehicleType / etag must be strings when present
// (missing means the SPEC default); entry / exit / distanceKm must be
// strings or null when present (missing means null); priorKm must be a
// string when present (missing or empty means "0").
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const keys = Object.keys(input);
  for (const key of keys) {
    if (!FIELDS.includes(key)) return null;
  }
  const snapshot = {};
  for (const field of ["mode", "vehicleType", "etag"]) {
    const value = readRawInput(input, field);
    if (value === undefined) {
      snapshot[field] = field === "mode" ? "distance" : field === "vehicleType" ? "small" : "false";
    } else {
      if (typeof value !== "string") return null;
      snapshot[field] = value;
    }
  }
  for (const field of ["entry", "exit", "distanceKm"]) {
    const value = readRawInput(input, field);
    if (value === undefined || value === null) {
      snapshot[field] = null;
    } else {
      if (typeof value !== "string") return null;
      snapshot[field] = value;
    }
  }
  const priorValue = readRawInput(input, "priorKm");
  if (priorValue === undefined) {
    snapshot.priorKm = "0";
  } else {
    if (typeof priorValue !== "string") return null;
    snapshot.priorKm = priorValue === "" ? "0" : priorValue;
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

const DECIMAL_PATTERN = /^\d+(\.\d)?$/;
const MODES = new Set(["distance", "pair"]);
const VEHICLE_TYPES = new Set(["small", "large", "trailer"]);
const ETAG_VALUES = new Set(["true", "false"]);

function parseEnum(text, allowed, field) {
  if (!allowed.has(text)) return { error: failure("FORMAT", field) };
  return { value: text };
}

// Exact integer tenths for a decimal string with at most 1 decimal.
function parseTenths(text, field, minTenths, maxTenths) {
  if (!DECIMAL_PATTERN.test(text)) return { error: failure("FORMAT", field) };
  const dot = text.indexOf(".");
  const tenths =
    dot === -1
      ? Number(text) * 10
      : Number(text.slice(0, dot)) * 10 + Number(text.slice(dot + 1));
  if (tenths < minTenths || tenths > maxTenths) return { error: failure("RANGE", field) };
  return { value: tenths };
}

// ---------------------------------------------------------------------------
// Exact derivation. All amounts are integer milli-NT$; all distances
// are integer tenths of a km.

// gross(d) in milli-NT$ for a cumulative daily distance of d tenths.
function grossMilli(dTenths, ratesMilli) {
  const freeTenths = Math.min(dTenths, 200);
  const standardTenths = Math.max(0, Math.min(dTenths, 2000) - 200);
  const discountedTenths = Math.max(0, dTenths - 2000);
  return (
    (standardTenths * ratesMilli[0]) / 10 + (discountedTenths * ratesMilli[1]) / 10
  );
}

// Half-up of milli-NT$ to whole NT$ (the single final rounding).
function roundHalfUpMilli(milli) {
  return Math.floor((milli + 500) / 1000);
}

// Half-up of (grossMilli x 0.9) to whole NT$: floor((milli*9 + 5000)/10000).
function roundHalfUpMilliEtag(milli) {
  return Math.floor((milli * 9 + 5000) / 10000);
}

// ---------------------------------------------------------------------------
// run: validate a raw snapshot and compute the toll.

export function run(input) {
  const snapshot = readSchema(input);
  if (snapshot === null) return failure("SCHEMA", null);

  // Fields in the SPEC's order: mode, vehicleType, entry, exit,
  // distanceKm, priorKm, etag. Per field: capacity, then UNICODE,
  // then EMPTY, then grammar, then range. Cross-field SAME_INTERCHANGE
  // is checked after entry and exit are individually valid.
  const modePrelude = checkPrelude("mode", snapshot.mode);
  if (modePrelude !== null) return modePrelude;
  const parsedMode = parseEnum(snapshot.mode, MODES, "mode");
  if (parsedMode.error) return parsedMode.error;
  const mode = parsedMode.value;

  const vehiclePrelude = checkPrelude("vehicleType", snapshot.vehicleType);
  if (vehiclePrelude !== null) return vehiclePrelude;
  const parsedVehicle = parseEnum(snapshot.vehicleType, VEHICLE_TYPES, "vehicleType");
  if (parsedVehicle.error) return parsedVehicle.error;
  const vehicleType = parsedVehicle.value;

  // entry / exit: in distance mode both must be null; in pair mode
  // both are required interchange ids.
  let entry = null;
  let exit = null;
  if (mode === "distance") {
    if (snapshot.entry !== null) return failure("FORMAT", "entry");
    if (snapshot.exit !== null) return failure("FORMAT", "exit");
  } else {
    if (snapshot.entry === null) return failure("EMPTY", "entry");
    const entryPrelude = checkPrelude("entry", snapshot.entry);
    if (entryPrelude !== null) return entryPrelude;
    if (!INTERCHANGE_KM.has(snapshot.entry)) {
      return failure("UNKNOWN_INTERCHANGE", "entry");
    }
    entry = snapshot.entry;
    if (snapshot.exit === null) return failure("EMPTY", "exit");
    const exitPrelude = checkPrelude("exit", snapshot.exit);
    if (exitPrelude !== null) return exitPrelude;
    if (!INTERCHANGE_KM.has(snapshot.exit)) {
      return failure("UNKNOWN_INTERCHANGE", "exit");
    }
    exit = snapshot.exit;
    if (entry === exit) return failure("SAME_INTERCHANGE", "exit");
  }

  // distanceKm: in pair mode it must be null (derived from the
  // interchanges); in distance mode it is required, 0.1-999.9 km.
  let distanceTenths;
  if (mode === "pair") {
    if (snapshot.distanceKm !== null) return failure("FORMAT", "distanceKm");
    distanceTenths = Math.abs(INTERCHANGE_KM.get(exit) - INTERCHANGE_KM.get(entry));
  } else {
    if (snapshot.distanceKm === null) return failure("SCHEMA", null);
    const distancePrelude = checkPrelude("distanceKm", snapshot.distanceKm);
    if (distancePrelude !== null) return distancePrelude;
    const parsedDistance = parseTenths(snapshot.distanceKm, "distanceKm", 1, 9999);
    if (parsedDistance.error) return parsedDistance.error;
    distanceTenths = parsedDistance.value;
  }

  // priorKm: missing or empty means "0" (already defaulted by the
  // schema read); range 0-999.9 km.
  const priorPrelude = checkPrelude("priorKm", snapshot.priorKm);
  if (priorPrelude !== null) return priorPrelude;
  const parsedPrior = parseTenths(snapshot.priorKm, "priorKm", 0, 9999);
  if (parsedPrior.error) return parsedPrior.error;
  const priorTenths = parsedPrior.value;

  const etagPrelude = checkPrelude("etag", snapshot.etag);
  if (etagPrelude !== null) return etagPrelude;
  const parsedEtag = parseEnum(snapshot.etag, ETAG_VALUES, "etag");
  if (parsedEtag.error) return parsedEtag.error;
  const etagApplied = parsedEtag.value === "true";

  // Exact derivation on the daily total.
  const totalTenths = priorTenths + distanceTenths;
  const ratesMilli = RATES_MILLI[vehicleType];
  const freeTenths = Math.min(totalTenths, 200);
  const standardTenths = Math.max(0, Math.min(totalTenths, 2000) - 200);
  const discountedTenths = Math.max(0, totalTenths - 2000);
  const grossTotalMilli = grossMilli(totalTenths, ratesMilli);
  const grossPriorMilli = grossMilli(priorTenths, ratesMilli);
  const grossMilliValue = grossTotalMilli - grossPriorMilli;
  const amountNt = etagApplied
    ? roundHalfUpMilliEtag(grossMilliValue)
    : roundHalfUpMilli(grossMilliValue);
  const rates = RATES[vehicleType];

  const result = {
    mode,
    vehicleType,
    entry,
    exit,
    distanceKm: distanceTenths / 10,
    priorKm: priorTenths / 10,
    totalKm: totalTenths / 10,
    freeKm: freeTenths / 10,
    standardKm: standardTenths / 10,
    discountedKm: discountedTenths / 10,
    rateStandard: rates.rateStandard,
    rateLong: rates.rateLong,
    grossTotalNt: grossTotalMilli / 1000,
    grossPriorNt: grossPriorMilli / 1000,
    grossNt: grossMilliValue / 1000,
    etagApplied,
    etagFactor: etagApplied ? 0.9 : 1,
    amountNt,
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
