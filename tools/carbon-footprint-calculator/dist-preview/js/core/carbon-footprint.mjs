// Pure core for the Carbon Footprint Calculator
// (spec-carbon-footprint-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. Annual
// conversion is fixed (monthly x12, weekly x52) and never depends on
// the host timezone.
//
// Pinned emission factors (SPEC inputsOutputs rule 2; see FACTORS):
//   electricity 0.471 kg CO2e/kWh (Energy Administration, 2025
//     residential value, announced 2026-06-02 — not the 0.467 overall
//     or 0.466 industrial value);
//   gasoline 2.31, diesel 2.68 kg CO2/litre (IPCC 2006 default
//     combustion factors, CO2 only — no upstream, no CH4/N2O);
//   bus 0.102, rail 0.035 (DEFRA 2024, national rail 0.03546 rounded
//     to 3 decimals), short-haul flight 0.153, long-haul flight
//     0.148 kg CO2e/passenger-km (DEFRA 2024, economy, radiative
//     forcing RF 1.9; short is a single leg under 3,700 km);
//   diet, Poore & Nemecek (2018) global averages: beef 99.5, pork
//     12.3, poultry 9.9, farmed fish 13.6, eggs 4.7, rice 4.5
//     kg CO2e/kg.
// All arithmetic is exact integer arithmetic (BigInt): decimal
// inputs are parsed to integer hundredths, every category is an exact
// rational, and rounding (half away from zero, to 1 decimal) is done
// once on the unrounded value. The total is the unrounded sum rounded
// — never the sum of the rounded categories. Binary floating point
// (and toFixed on an unrounded value) is never used for rounding, so
// the SPEC's 7.65 -> 7.7 case rounds half-up, not banker's 7.6.

export const FIELDS = [
  "electricityKwhPerMonth",
  "carKmPerYear",
  "carFuelLPer100Km",
  "carFuelType",
  "busKmPerYear",
  "railKmPerYear",
  "flightShortKmPerYear",
  "flightLongKmPerYear",
  "dietBeefKgPerWeek",
  "dietPorkKgPerWeek",
  "dietPoultryKgPerWeek",
  "dietFishKgPerWeek",
  "dietEggsKgPerWeek",
  "dietRiceKgPerWeek",
];

export const DEFAULTS = {
  electricityKwhPerMonth: "300",
  carKmPerYear: "0",
  carFuelLPer100Km: "8",
  carFuelType: "gasoline",
  busKmPerYear: "0",
  railKmPerYear: "0",
  flightShortKmPerYear: "0",
  flightLongKmPerYear: "0",
  dietBeefKgPerWeek: "0",
  dietPorkKgPerWeek: "0",
  dietPoultryKgPerWeek: "0",
  dietFishKgPerWeek: "0",
  dietEggsKgPerWeek: "0",
  dietRiceKgPerWeek: "0",
};

// The worked example is fixtures.json case 1 (typical-household)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  electricityKwhPerMonth: "300",
  carKmPerYear: "12000",
  carFuelLPer100Km: "8",
  carFuelType: "gasoline",
  busKmPerYear: "1000",
  railKmPerYear: "2000",
  flightShortKmPerYear: "2000",
  flightLongKmPerYear: "0",
  dietBeefKgPerWeek: "0.5",
  dietPorkKgPerWeek: "1",
  dietPoultryKgPerWeek: "1",
  dietFishKgPerWeek: "0.5",
  dietEggsKgPerWeek: "0.5",
  dietRiceKgPerWeek: "2",
};

export const MAX_RAW_UNITS = 12;

// Ranges in the input's own units (SPEC inputsOutputs).
export const RANGES = {
  electricityKwhPerMonth: [0, 100000],
  carKmPerYear: [0, 500000],
  carFuelLPer100Km: [0, 100],
  busKmPerYear: [0, 1000000],
  railKmPerYear: [0, 1000000],
  flightShortKmPerYear: [0, 1000000],
  flightLongKmPerYear: [0, 1000000],
  dietBeefKgPerWeek: [0, 100],
  dietPorkKgPerWeek: [0, 100],
  dietPoultryKgPerWeek: [0, 100],
  dietFishKgPerWeek: [0, 100],
  dietEggsKgPerWeek: [0, 100],
  dietRiceKgPerWeek: [0, 100],
};

export const FUEL_TYPES = ["gasoline", "diesel"];

// Pinned factor table. Decimal factors are kept as exact rational
// parts so the computation below stays in integers: a factor written
// as {num, den} means num/den kg CO2e per unit. Diet factors are
// tenths (num/10); the rest are thousandths (num/1000), except the
// fuel factors, which are hundredths (num/100).
export const FACTORS = {
  electricityKwh: { num: 471, den: 1000 },
  gasolineL: { num: 231, den: 100 },
  dieselL: { num: 268, den: 100 },
  busKm: { num: 102, den: 1000 },
  railKm: { num: 35, den: 1000 },
  flightShortKm: { num: 153, den: 1000 },
  flightLongKm: { num: 148, den: 1000 },
  dietBeefKg: { num: 995, den: 10 },
  dietPorkKg: { num: 123, den: 10 },
  dietPoultryKg: { num: 99, den: 10 },
  dietFishKg: { num: 136, den: 10 },
  dietEggsKg: { num: 47, den: 10 },
  dietRiceKg: { num: 45, den: 10 },
};

export const CATEGORY_KEYS = ["electricity", "car", "bus", "rail", "flights", "diet"];

// Pinned §7 estimate disclaimer (verbatim, both languages). Shown in
// the results area of both pages.
export const DISCLAIMER_ZH =
  "本工具結果為估算值，僅供個人參考，不構成正式碳盤查、碳足跡查證或任何申報依據。";
export const DISCLAIMER_EN =
  "Results are estimates for personal reference only and are not a formal carbon inventory, verified footprint, or reporting basis.";

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the
// fourteen fields.
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

// Exact parse of a grammar-valid decimal string to integer hundredths.
// "12.34" -> 1234n, "8" -> 800n, "0.5" -> 50n.
function parseHundredths(value) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0") || "0");
}

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, range. Returns the parsed hundredths
// (BigInt) or an { error } outcome.
function validateDecimalField(field, value, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const hundredths = parseHundredths(value);
  if (hundredths < BigInt(min) * 100n || hundredths > BigInt(max) * 100n) {
    return { error: failure("RANGE", field) };
  }
  return { value: hundredths };
}

function validateFuelType(value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", "carFuelType") };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", "carFuelType") };
  if (value.length === 0) return { error: failure("EMPTY", "carFuelType") };
  if (!FUEL_TYPES.includes(value)) return { error: failure("SCHEMA", "carFuelType") };
  return { value };
}

// Half away from zero to 1 decimal, on an exact non-negative rational
// num/den. Returns integer tenths as a BigInt, so 7.65 -> 77n (7.7)
// and never the banker's 76n. All values here are non-negative, so
// floor((2*num*10 + den) / (2*den)) is exactly round-half-up.
function roundToTenths(num, den) {
  return (2n * num * 10n + den) / (2n * den);
}

function tenthsToNumber(tenths) {
  return Number(tenths) / 10;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  for (const field of FIELDS) {
    if (field === "carFuelType") {
      const outcome = validateFuelType(raw[field]);
      if (outcome.error) return outcome.error;
      checked[field] = outcome.value;
      continue;
    }
    const [min, max] = RANGES[field];
    const outcome = validateDecimalField(field, raw[field], min, max);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.value;
  }

  // Every category as an exact numerator over the common denominator
  // 100,000,000 (kg CO2e).
  // electricity: kwh/month x12 x0.471
  const electricityNum = checked.electricityKwhPerMonth * 5652000n;
  // car: litres = km x L/100km / 100; x2.31 (gasoline) or x2.68 (diesel)
  const fuelFactor = checked.carFuelType === "diesel" ? 268n : 231n;
  const carNum = checked.carKmPerYear * checked.carFuelLPer100Km * fuelFactor;
  // bus: km x0.102; rail: km x0.035
  const busNum = checked.busKmPerYear * 102000n;
  const railNum = checked.railKmPerYear * 35000n;
  // flights: short km x0.153 + long km x0.148
  const flightsNum =
    (checked.flightShortKmPerYear * 153n + checked.flightLongKmPerYear * 148n) * 1000n;
  // diet: each item weekly kg x52 x factor (tenths)
  const dietFactors = {
    dietBeefKgPerWeek: 995n,
    dietPorkKgPerWeek: 123n,
    dietPoultryKgPerWeek: 99n,
    dietFishKgPerWeek: 136n,
    dietEggsKgPerWeek: 47n,
    dietRiceKgPerWeek: 45n,
  };
  let dietNum = 0n;
  for (const [field, factor] of Object.entries(dietFactors)) {
    dietNum += checked[field] * 52n * factor * 100000n;
  }

  const DEN = 100000000n;
  const categoryNums = {
    electricity: electricityNum,
    car: carNum,
    bus: busNum,
    rail: railNum,
    flights: flightsNum,
    diet: dietNum,
  };
  const totalNum =
    electricityNum + carNum + busNum + railNum + flightsNum + dietNum;

  const categories = {};
  for (const key of CATEGORY_KEYS) {
    const kgCo2e = tenthsToNumber(roundToTenths(categoryNums[key], DEN));
    const sharePct =
      totalNum === 0n
        ? 0
        : tenthsToNumber(roundToTenths(100n * categoryNums[key], totalNum));
    categories[key] = { kgCo2e, sharePct };
  }

  return {
    ok: true,
    result: {
      categories,
      totalKgCo2e: tenthsToNumber(roundToTenths(totalNum, DEN)),
      totalTonnesCo2e: tenthsToNumber(roundToTenths(totalNum, DEN * 1000n)),
    },
  };
}

// Fixed report download: carbon-footprint-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. Numbers serialize by JSON's shortest round-trip
// form (so a 1-decimal value writes as e.g. 9076.4, 102, or 0). The
// serializer is hand-written: it never calls a value's toJSON and
// accepts only the plain data shapes a result can hold (null,
// booleans, finite numbers, strings, arrays, plain objects).
export const REPORT_FILENAME = "carbon-footprint-report.json";
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
