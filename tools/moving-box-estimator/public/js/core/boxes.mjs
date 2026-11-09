// Pure core for the Moving Box Estimator
// (spec-moving-box-estimator-20261109). Synchronous data-in / data-out
// only: no DOM, no network, no storage. All arithmetic is integer
// arithmetic exactly as the SPEC pins; no floating point, no
// locale-dependent rounding:
//   base split: small  = floor((30*B + 99) / 100)   (30% rounded up)
//               medium = floor((50*B + 99) / 100)   (50% rounded up)
//               large  = B - small - medium        (remainder to large)
//   adders (before the uplift): manyBooks +8 small, fragileItems +4
//   small, largeKitchen +6 medium, manyClothes +5 medium.
//   uplift: livedOver5Years ? floor((subtotal + 4) / 5) : 0  (+20%
//   rounded up), all uplift boxes counted as medium.
//   supplies: tapeRolls = floor((totalBoxes + 9) / 10);
//             packingPaperRolls = tapeRolls + (fragileItems ? 1 : 0).

export const FIELDS = [
  "homeType",
  "manyBooks",
  "largeKitchen",
  "manyClothes",
  "fragileItems",
  "livedOver5Years",
];

export const TOGGLES = [
  "manyBooks",
  "largeKitchen",
  "manyClothes",
  "fragileItems",
  "livedOver5Years",
];

export const HOME_TYPES = [
  "studio",
  "one-bedroom",
  "two-bedroom",
  "three-bedroom",
  "four-bedroom",
];

// Base boxes per home type (medium-box-equivalent totals), pinned by
// the SPEC's base table.
export const BASE_BOXES = {
  studio: 15,
  "one-bedroom": 25,
  "two-bedroom": 40,
  "three-bedroom": 60,
  "four-bedroom": 80,
};

export const DEFAULTS = {
  homeType: "studio",
  manyBooks: false,
  largeKitchen: false,
  manyClothes: false,
  fragileItems: false,
  livedOver5Years: false,
};

// The worked example is fixtures.json case 1 (studio-plain) input,
// vendored verbatim in test/fixtures.json; it equals the defaults.
export const EXAMPLE = { ...DEFAULTS };

export const INPUT_LIMIT_BYTES = 65536;
export const REPORT_FILENAME = "moving-box-estimator-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  // Realm-tolerant: a plain object from another realm (e.g. delivered
  // into a Worker by structured clone) has a prototype whose own
  // prototype is null. Class instances fail this check.
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}

// UTF-8 byte length of the input's JSON serialization, per the SPEC's
// capacity rule. Returns null when the value cannot be serialized at
// all (then the structural checks below report SCHEMA instead).
function serializedByteLength(input) {
  let text;
  try {
    text = JSON.stringify(input);
  } catch {
    return null;
  }
  if (typeof text !== "string") return null;
  return new TextEncoder().encode(text).length;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw field map, or null when the shape is not exactly the six
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
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(text) {
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

export function run(input) {
  // Validation order is pinned: capacity, structure + per-field types
  // (in field order), then homeType UNICODE, EMPTY, ENUM. The first
  // failure fails the whole input.
  const byteLength = serializedByteLength(input);
  if (byteLength !== null && byteLength > INPUT_LIMIT_BYTES) {
    return failure("INPUT_LIMIT", null);
  }
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);
  if (typeof raw.homeType !== "string") return failure("SCHEMA", "homeType");
  for (const field of TOGGLES) {
    if (typeof raw[field] !== "boolean") return failure("SCHEMA", field);
  }
  if (hasLoneSurrogate(raw.homeType)) return failure("UNICODE", "homeType");
  if (raw.homeType === "") return failure("EMPTY", "homeType");
  if (!HOME_TYPES.includes(raw.homeType)) return failure("ENUM", "homeType");

  const baseBoxes = BASE_BOXES[raw.homeType];
  const baseSplit = {
    small: Math.floor((30 * baseBoxes + 99) / 100),
    medium: Math.floor((50 * baseBoxes + 99) / 100),
    large: 0,
  };
  baseSplit.large = baseBoxes - baseSplit.small - baseSplit.medium;

  const adders = {
    manyBooks: raw.manyBooks ? 8 : 0,
    largeKitchen: raw.largeKitchen ? 6 : 0,
    manyClothes: raw.manyClothes ? 5 : 0,
    fragileItems: raw.fragileItems ? 4 : 0,
  };
  const subtotal =
    baseBoxes + adders.manyBooks + adders.largeKitchen + adders.manyClothes + adders.fragileItems;
  const upliftBoxes = raw.livedOver5Years ? Math.floor((subtotal + 4) / 5) : 0;
  const totalBoxes = subtotal + upliftBoxes;

  const boxes = {
    small: baseSplit.small + adders.manyBooks + adders.fragileItems,
    medium: baseSplit.medium + adders.largeKitchen + adders.manyClothes + upliftBoxes,
    large: baseSplit.large,
  };
  const tapeRolls = Math.floor((totalBoxes + 9) / 10);
  const supplies = {
    tapeRolls,
    packingPaperRolls: tapeRolls + (raw.fragileItems ? 1 : 0),
  };

  return {
    ok: true,
    result: {
      homeType: raw.homeType,
      baseBoxes,
      baseSplit,
      adders,
      upliftBoxes,
      totalBoxes,
      boxes,
      supplies,
    },
  };
}

// Canonical report serialization, per the SPEC: compact JSON of the
// result with object keys sorted ascending by UTF-16 code units
// (recursively; array order unchanged), string values as JSON literals
// (the input's toJSON is never called), one trailing LF, UTF-8 no BOM.
function canonicalStringify(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`);
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildReport(result) {
  const text = `${canonicalStringify(result)}\n`;
  if (new TextEncoder().encode(text).length > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text };
}
