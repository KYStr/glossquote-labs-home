// Pure core for the HSR Fare Calculator
// (spec-hsr-fare-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// The SPEC pins the fare data as literal tables, not a formula:
// Taiwan High Speed Rail publishes no per-kilometre rate, so the
// three full-fare tables (standard reserved / business /
// non-reserved, 66 station pairs each) are transcribed verbatim
// from the SPEC's §inputsOutputs tables and stored as upper
// triangles (row i lists fares to stations j > i); the full
// symmetric matrices are built from them below. The three
// short segments that do not sell business class (Nangang–Taipei,
// Nangang–Banqiao, Taipei–Banqiao) are null in the business table.
// Kilometre marks are display-only and never participate in pricing.
// Every discount is computed from the full fare with exact integer
// arithmetic as `5 * floor(baseFare * rate / 5)` (rate kept as a
// numerator/denominator pair, so no floating point ever enters the
// price); distance is computed in integer tenths of a kilometre.

export const FIELDS = ["origin", "destination", "cabin", "fareKind", "quantity"];

export const DEFAULTS = {
  origin: "TPE",
  destination: "TAC",
  cabin: "standard",
  fareKind: "full",
  quantity: "1",
};

// The worked example is fixtures.json case 1
// (taipei-zuoying-standard-full) input, vendored verbatim in
// test/fixtures.json.
export const EXAMPLE = {
  origin: "TPE",
  destination: "ZUY",
  cabin: "standard",
  fareKind: "full",
  quantity: "1",
};

// SPEC-pinned: quantity raw is at most 8 units. The SPEC pins no
// per-field capacity for the enum fields, so they share one cap
// (ENUM_MAX_RAW_UNITS = 16) that sits above every valid value
// (longest valid raw is 11 units: "earlyBird65", "nonreserved");
// see errata candidate 1 in HANDOFF.md.
export const QUANTITY_MAX_RAW_UNITS = 8;
export const ENUM_MAX_RAW_UNITS = 16;
export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 10;

// Station table (north to south; km is the route mark from Nangang,
// stored as integer tenths of a kilometre, display only).
export const STATIONS = [
  { code: "NAG", zh: "南港", en: "Nangang", kmTenths: 0 },
  { code: "TPE", zh: "台北", en: "Taipei", kmTenths: 59 },
  { code: "BAQ", zh: "板橋", en: "Banqiao", kmTenths: 131 },
  { code: "TAY", zh: "桃園", en: "Taoyuan", kmTenths: 423 },
  { code: "HSC", zh: "新竹", en: "Hsinchu", kmTenths: 722 },
  { code: "MIL", zh: "苗栗", en: "Miaoli", kmTenths: 1049 },
  { code: "TAC", zh: "台中", en: "Taichung", kmTenths: 1657 },
  { code: "CHH", zh: "彰化", en: "Changhua", kmTenths: 1939 },
  { code: "YUL", zh: "雲林", en: "Yunlin", kmTenths: 2185 },
  { code: "CHY", zh: "嘉義", en: "Chiayi", kmTenths: 2516 },
  { code: "TAN", zh: "台南", en: "Tainan", kmTenths: 3139 },
  { code: "ZUY", zh: "左營", en: "Zuoying", kmTenths: 3452 },
];

const STATION_INDEX = new Map(STATIONS.map((station, index) => [station.code, index]));

export const CABINS = ["standard", "business", "nonreserved"];

export const FARE_KINDS = [
  "full",
  "concession",
  "earlyBird65",
  "earlyBird80",
  "earlyBird90",
  "student50",
  "student75",
  "student88",
];

// Exact discount fractions (rate numerator / denominator). No
// floating point: singleFare = 5 * floor(baseFare * num / (den * 5)).
const FARE_RATES = {
  full: [1, 1],
  concession: [1, 2],
  earlyBird65: [65, 100],
  earlyBird80: [4, 5],
  earlyBird90: [9, 10],
  student50: [1, 2],
  student75: [3, 4],
  student88: [22, 25],
};

// Early Bird and student discounts apply to standard reserved seats
// only (SPEC cross-field rule FARE_CABIN_MISMATCH).
const STANDARD_ONLY_FARE_KINDS = new Set([
  "earlyBird65",
  "earlyBird80",
  "earlyBird90",
  "student50",
  "student75",
  "student88",
]);

// The three station pairs that do not sell business class, as
// unordered index pairs. Also encoded as null in the business table.
export const BUSINESS_NOT_SOLD_PAIRS = [
  ["NAG", "TPE"],
  ["NAG", "BAQ"],
  ["TPE", "BAQ"],
];

// Full-fare tables, transcribed verbatim from the SPEC. Each row i
// lists the fares from station i to stations j > i, in station
// order; null means "not sold" (business table only, the three
// pairs above). The diagonal is never a fare (same-station input is
// rejected before any lookup).
const STANDARD_UPPER = [
  [40, 70, 200, 330, 480, 750, 870, 970, 1120, 1390, 1530],
  [40, 160, 290, 430, 700, 820, 930, 1080, 1350, 1490],
  [130, 260, 400, 670, 790, 900, 1050, 1320, 1460],
  [130, 280, 540, 670, 780, 920, 1190, 1330],
  [140, 410, 540, 640, 790, 1060, 1200],
  [270, 390, 500, 640, 920, 1060],
  [130, 230, 380, 650, 790],
  [110, 250, 530, 670],
  [150, 420, 560],
  [280, 410],
  [140],
  [],
];

const BUSINESS_UPPER = [
  [null, null, 500, 700, 920, 1330, 1510, 1660, 1880, 2290, 2500],
  [null, 440, 640, 850, 1250, 1430, 1600, 1820, 2230, 2440],
  [400, 590, 800, 1210, 1390, 1550, 1780, 2180, 2390],
  [400, 620, 1010, 1210, 1370, 1580, 1990, 2200],
  [410, 820, 1010, 1160, 1390, 1790, 2000],
  [610, 790, 950, 1160, 1580, 1790],
  [400, 550, 770, 1180, 1390],
  [370, 580, 1000, 1210],
  [430, 830, 1040],
  [620, 820],
  [410],
  [],
];

const NONRESERVED_UPPER = [
  [35, 65, 190, 320, 465, 725, 840, 940, 1085, 1345, 1480],
  [35, 155, 280, 415, 675, 795, 900, 1045, 1305, 1445],
  [125, 250, 385, 645, 765, 870, 1015, 1280, 1415],
  [125, 270, 520, 645, 755, 890, 1150, 1290],
  [135, 395, 520, 620, 765, 1025, 1160],
  [260, 375, 485, 620, 890, 1025],
  [125, 220, 365, 630, 765],
  [105, 240, 510, 645],
  [145, 405, 540],
  [270, 395],
  [135],
  [],
];

function buildMatrix(upper) {
  const size = STATIONS.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  for (let i = 0; i < size; i += 1) {
    for (let j = i + 1; j < size; j += 1) {
      const fare = upper[i][j - i - 1];
      matrix[i][j] = fare;
      matrix[j][i] = fare;
    }
  }
  return matrix;
}

const FARE_TABLES = {
  standard: buildMatrix(STANDARD_UPPER),
  business: buildMatrix(BUSINESS_UPPER),
  nonreserved: buildMatrix(NONRESERVED_UPPER),
};

// Full fares for one station pair, all three cabins, for the UI's
// "same segment, other cabins" comparison. Business is null where
// it is not sold. Returns null for an unknown code or a
// same-station pair.
export function cabinFares(origin, destination) {
  const from = STATION_INDEX.get(origin);
  const to = STATION_INDEX.get(destination);
  if (from === undefined || to === undefined || from === to) return null;
  return {
    standard: FARE_TABLES.standard[from][to],
    business: FARE_TABLES.business[from][to],
    nonreserved: FARE_TABLES.nonreserved[from][to],
  };
}

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the five
// fields.
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

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar (enum membership / integer format),
// range. Quantity's grammar is the ASCII integer pattern and its
// range is 1-10; the enum fields' grammar is membership in the
// pinned table.
function validateEnumField(field, value, allowed) {
  if (value.length > ENUM_MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!allowed.includes(value)) return { error: failure("INVALID_VALUE", field) };
  return { value };
}

function validateQuantity(value) {
  if (value.length > QUANTITY_MAX_RAW_UNITS) {
    return { error: failure("INPUT_LIMIT", "quantity") };
  }
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", "quantity") };
  if (value.length === 0) return { error: failure("EMPTY", "quantity") };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", "quantity") };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < QUANTITY_MIN || parsed > QUANTITY_MAX) {
    return { error: failure("RANGE", "quantity") };
  }
  return { value: parsed };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const stationCodes = STATIONS.map((station) => station.code);
  const origin = validateEnumField("origin", raw.origin, stationCodes);
  if (origin.error) return origin.error;
  const destination = validateEnumField("destination", raw.destination, stationCodes);
  if (destination.error) return destination.error;
  const cabin = validateEnumField("cabin", raw.cabin, CABINS);
  if (cabin.error) return cabin.error;
  const fareKind = validateEnumField("fareKind", raw.fareKind, FARE_KINDS);
  if (fareKind.error) return fareKind.error;
  const quantity = validateQuantity(raw.quantity);
  if (quantity.error) return quantity.error;

  // Cross-field checks, in the SPEC's fixed order.
  if (origin.value === destination.value) return failure("SAME_STATION", "destination");
  const from = STATION_INDEX.get(origin.value);
  const to = STATION_INDEX.get(destination.value);
  const baseFare = FARE_TABLES[cabin.value][from][to];
  if (cabin.value === "business" && baseFare === null) {
    return failure("CABIN_NOT_SOLD", "cabin");
  }
  if (STANDARD_ONLY_FARE_KINDS.has(fareKind.value) && cabin.value !== "standard") {
    return failure("FARE_CABIN_MISMATCH", "fareKind");
  }

  const direction = to > from ? "southbound" : "northbound";
  const distanceKm = Math.abs(STATIONS[to].kmTenths - STATIONS[from].kmTenths) / 10;
  const [rateNum, rateDen] = FARE_RATES[fareKind.value];
  const singleFare = 5 * Math.floor((baseFare * rateNum) / (rateDen * 5));
  const totalFare = singleFare * quantity.value;
  return {
    ok: true,
    result: {
      origin: origin.value,
      destination: destination.value,
      direction,
      distanceKm,
      cabin: cabin.value,
      fareKind: fareKind.value,
      baseFare,
      singleFare,
      quantity: quantity.value,
      totalFare,
    },
  };
}

// Fixed report download: hsr-fare-calculator-report.json. The content
// is the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, the one-decimal
// distanceKm, strings, arrays, plain objects).
export const REPORT_FILENAME = "hsr-fare-calculator-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    // Result numbers are safe integers, except distanceKm, which is
    // a one-decimal number (e.g. 339.3) derived from integer tenths.
    // JSON.stringify gives its shortest round-trip form.
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      throw new Error("report integer values must be safe integers");
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
