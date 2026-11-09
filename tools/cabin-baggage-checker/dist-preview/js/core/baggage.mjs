// Pure core for the Cabin Baggage Checker
// (spec-cabin-baggage-checker-20261109).
// Synchronous data-in / data-out only: no DOM, no network, no storage.
// All arithmetic is integer math in tenths (0.1 cm and 0.1 kg); there is
// no floating point and no rounding anywhere. Every output number is
// formatted as a string with exactly one decimal place, and there is no
// negative zero.
//
// The rules table below is pinned by the SPEC and was verified against
// each airline's published economy-class (international) rules on
// 2026-11-09. weightMode "main" means the limit applies to the main bag
// alone; "total" means main bag + personal item combined. A personal
// limit of null means the airline publishes no personal-item dimensions
// (it only requires the item to fit under the seat in front).

export const FIELDS = [
  "bagLength",
  "bagWidth",
  "bagHeight",
  "bagWeightKg",
  "personalLength",
  "personalWidth",
  "personalHeight",
  "personalWeightKg",
  "airlines",
];

const STRING_FIELDS = FIELDS.slice(0, 8);
const BAG_FIELDS = ["bagLength", "bagWidth", "bagHeight", "bagWeightKg"];
const PERSONAL_FIELDS = [
  "personalLength",
  "personalWidth",
  "personalHeight",
  "personalWeightKg",
];

export const AIRLINE_IDS = [
  "eva",
  "china-airlines",
  "starlux",
  "tigerair-taiwan",
  "ana",
  "jal",
];

export const RULES_AS_OF = "2026-11-09";

// Fixed rules table, in output order. Dimensions are integer tenths of
// a centimetre, stored unsorted exactly as published; weight limits are
// integer tenths of a kilogram.
export const RULES = [
  { id: "eva", mainTenths: [560, 360, 230], personalTenths: [400, 300, 100], weightMode: "main", weightLimitTenths: 70 },
  { id: "china-airlines", mainTenths: [560, 360, 230], personalTenths: [400, 300, 150], weightMode: "main", weightLimitTenths: 70 },
  { id: "starlux", mainTenths: [560, 360, 230], personalTenths: [400, 300, 100], weightMode: "total", weightLimitTenths: 70 },
  { id: "tigerair-taiwan", mainTenths: [540, 380, 230], personalTenths: null, weightMode: "total", weightLimitTenths: 100 },
  { id: "ana", mainTenths: [550, 400, 250], personalTenths: [400, 300, 200], weightMode: "total", weightLimitTenths: 100 },
  { id: "jal", mainTenths: [550, 400, 250], personalTenths: null, weightMode: "total", weightLimitTenths: 100 },
];

export const DEFAULTS = {
  bagLength: "",
  bagWidth: "",
  bagHeight: "",
  bagWeightKg: "",
  personalLength: "",
  personalWidth: "",
  personalHeight: "",
  personalWeightKg: "",
  airlines: [...AIRLINE_IDS],
};

// The worked example is fixtures.json case 1 (fits-five-of-six) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  bagLength: "55",
  bagWidth: "35",
  bagHeight: "22",
  bagWeightKg: "6.5",
  personalLength: "",
  personalWidth: "",
  personalHeight: "",
  personalWeightKg: "",
  airlines: [...AIRLINE_IDS],
};

// Raw capacity in UTF-16 code units, pinned by the SPEC for every
// string field.
export const MAX_RAW_UNITS = 8;

// Ranges in display units, used by the static project check.
export const DIMENSION_RANGE = [0.1, 200.0];
export const WEIGHT_RANGE = [0.1, 100.0];

// The same ranges in integer tenths, used by the validator:
// 0 < value <= 200 cm and 0 < value <= 100 kg.
const DIMENSION_TENTHS_MAX = 2000;
const WEIGHT_TENTHS_MAX = 1000;

// ASCII decimal, at most one fractional digit; integer part is 1-3
// digits, "0" or non-zero-leading (no "05"), ".5"-style fractions are
// not allowed ("0.5" is). No spaces, signs, or exponents.
const DECIMAL_PATTERN = /^(0|[1-9][0-9]{0,2})(\.[0-9])?$/;
const UNPAIRED_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function failure(code, field, row = null) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw input (eight strings plus the airlines array), or null when
// the shape is not exactly the nine pinned fields with the pinned
// types.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of STRING_FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  if (!keys.includes("airlines")) return null;
  const airlinesDescriptor = Object.getOwnPropertyDescriptor(input, "airlines");
  if (airlinesDescriptor === undefined || !("value" in airlinesDescriptor)) return null;
  if (!Array.isArray(airlinesDescriptor.value)) return null;
  raw.airlines = airlinesDescriptor.value;
  return raw;
}

// airlines validation in the SPEC's order: capacity, empty, then per
// member in order (non-string members are a shape error; unknown ids
// are ENUM and repeats are DUPLICATE, both with a 1-based row).
function validateAirlines(airlines) {
  if (airlines.length > AIRLINE_IDS.length) return { error: failure("INPUT_LIMIT", "airlines") };
  if (airlines.length === 0) return { error: failure("EMPTY", "airlines") };
  const seen = new Set();
  for (let index = 0; index < airlines.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(airlines, String(index));
    if (descriptor === undefined || !("value" in descriptor) || typeof descriptor.value !== "string") {
      return { error: failure("SCHEMA", null) };
    }
    const id = descriptor.value;
    if (!AIRLINE_IDS.includes(id)) return { error: failure("ENUM", "airlines", index + 1) };
    if (seen.has(id)) return { error: failure("DUPLICATE", "airlines", index + 1) };
    seen.add(id);
  }
  return { ids: [...seen] };
}

// Decimal field validation in the SPEC's per-field order: capacity,
// unpaired surrogate, empty, grammar, range. Returns { tenths } or
// { error }.
function validateDecimalField(field, value, maxTenths) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (UNPAIRED_SURROGATE.test(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const dot = value.indexOf(".");
  const tenths =
    dot === -1
      ? Number(value) * 10
      : Number(value.slice(0, dot)) * 10 + Number(value.slice(dot + 1));
  if (tenths <= 0 || tenths > maxTenths) return { error: failure("RANGE", field) };
  return { tenths };
}

// Formats an integer-tenths value with exactly one decimal place.
// Integer arithmetic only; zero never carries a sign.
function formatTenths(tenths) {
  const sign = tenths < 0 ? "-" : "";
  const absolute = Math.abs(tenths);
  return `${sign}${Math.floor(absolute / 10)}.${absolute % 10}`;
}

function sortDescending(values) {
  return [...values].sort((a, b) => b - a);
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const airlinesResult = validateAirlines(raw.airlines);
  if (airlinesResult.error) return airlinesResult.error;
  const selected = new Set(airlinesResult.ids);

  const bagTenths = {};
  for (const field of BAG_FIELDS) {
    const max = field === "bagWeightKg" ? WEIGHT_TENTHS_MAX : DIMENSION_TENTHS_MAX;
    const validated = validateDecimalField(field, raw[field], max);
    if (validated.error) return validated.error;
    bagTenths[field] = validated.tenths;
  }

  // The personal-item block exists iff at least one of its four fields
  // is non-empty; when it exists, every field is required and then runs
  // the same validation chain as a main-bag field.
  const hasPersonal = PERSONAL_FIELDS.some((field) => raw[field] !== "");
  const personalTenths = {};
  if (hasPersonal) {
    for (const field of PERSONAL_FIELDS) {
      const max = field === "personalWeightKg" ? WEIGHT_TENTHS_MAX : DIMENSION_TENTHS_MAX;
      const validated = validateDecimalField(field, raw[field], max);
      if (validated.error) return validated.error;
      personalTenths[field] = validated.tenths;
    }
  }

  const bagSorted = sortDescending([bagTenths.bagLength, bagTenths.bagWidth, bagTenths.bagHeight]);
  const personalSorted = hasPersonal
    ? sortDescending([
        personalTenths.personalLength,
        personalTenths.personalWidth,
        personalTenths.personalHeight,
      ])
    : null;
  const bagWeight = bagTenths.bagWeightKg;
  const personalWeight = hasPersonal ? personalTenths.personalWeightKg : 0;

  const airlineResults = [];
  for (const rule of RULES) {
    if (!selected.has(rule.id)) continue;
    const limitSorted = sortDescending(rule.mainTenths);
    const margins = limitSorted.map((limit, index) => limit - bagSorted[index]);
    const dimensionsPass = margins.every((margin) => margin >= 0);
    const checkedWeight = rule.weightMode === "main" ? bagWeight : bagWeight + personalWeight;
    const weightMargin = rule.weightLimitTenths - checkedWeight;
    const weightPass = weightMargin >= 0;
    let personal;
    if (!hasPersonal) {
      personal = { status: "notApplicable", marginsCm: null };
    } else if (rule.personalTenths === null) {
      personal = { status: "notSpecified", marginsCm: null };
    } else {
      const personalLimitSorted = sortDescending(rule.personalTenths);
      const personalMargins = personalLimitSorted.map(
        (limit, index) => limit - personalSorted[index],
      );
      personal = {
        status: personalMargins.every((margin) => margin >= 0) ? "pass" : "fail",
        marginsCm: personalMargins.map(formatTenths),
      };
    }
    airlineResults.push({
      id: rule.id,
      limitCm: limitSorted.map(formatTenths),
      marginsCm: margins.map(formatTenths),
      dimensionsPass,
      weight: {
        mode: rule.weightMode,
        checkedKg: formatTenths(checkedWeight),
        limitKg: formatTenths(rule.weightLimitTenths),
        marginKg: formatTenths(weightMargin),
        pass: weightPass,
      },
      personal,
      pass: dimensionsPass && weightPass && personal.status !== "fail",
    });
  }

  const fits = airlineResults.filter((entry) => entry.pass).length;
  return {
    ok: true,
    result: {
      bagSortedCm: bagSorted.map(formatTenths),
      personalSortedCm: personalSorted === null ? null : personalSorted.map(formatTenths),
      airlines: airlineResults,
      summary: {
        compared: airlineResults.length,
        fits,
        overallPass: fits === airlineResults.length,
      },
    },
  };
}

// Fixed report download: cabin-baggage-report.json. The content is the
// result's compact JSON with object keys sorted recursively by UTF-16
// code units, array order unchanged, exactly one trailing LF, UTF-8
// without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, safe integers, strings, arrays, plain objects).
export const REPORT_FILENAME = "cabin-baggage-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
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
