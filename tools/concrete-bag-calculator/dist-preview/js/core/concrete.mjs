// Pure core for the Concrete Bag Calculator
// (spec-concrete-bag-calculator-20261109). Synchronous data-in /
// data-out only: no DOM, no network, no storage. The whole pipeline is
// exact BigInt rational arithmetic, exactly as the SPEC pins; no
// floating point is used for volume, waste, or bag counts:
//   - a dimension string becomes an integer H of hundredths of a cm;
//     its length in metres is H/10000.
//   - slab / footing unit volume = H1*H2*H3 / 10^12 m^3.
//   - cylinder unit volume = PI * Dh^2 * Hh / (4 * 10^12) m^3, with
//     PI fixed to 30 decimal places as an exact rational.
//   - net = unit * count; adjusted = net * (10000 + W) / 10000, the
//     waste allowance W (hundredths of a percent) applied exactly
//     once, to the volume, never per bag.
//   - bags = ceil(adjusted / yield) from the UNROUNDED adjusted
//     volume, with the fixed yield table below.
//   - displayed volumes are 3-decimal half-up strings of the exact
//     rationals (an exact 0.0005 rounds up); yd3 = adjusted /
//     0.764554857984 exactly.
// Internally every volume is kept as a numerator over the common
// denominator DEN = 4 * 10^42, so slab and cylinder share one pipeline.

export const FIELDS = [
  "shape",
  "lengthCm",
  "widthCm",
  "thicknessCm",
  "depthCm",
  "diameterCm",
  "heightCm",
  "count",
  "wastePct",
];

export const SHAPES = ["slab", "footing", "cylinder"];

// The dimension fields each shape uses, in the SPEC's validation
// order. Fields of other shapes are ignored completely: not validated,
// not output.
export const SHAPE_FIELDS = {
  slab: ["lengthCm", "widthCm", "thicknessCm"],
  footing: ["lengthCm", "widthCm", "depthCm"],
  cylinder: ["diameterCm", "heightCm"],
};

// The SPEC's reset defaults; the page form starts from these too.
export const DEFAULTS = {
  shape: "slab",
  lengthCm: "400",
  widthCm: "300",
  thicknessCm: "10",
  depthCm: "30",
  diameterCm: "30",
  heightCm: "200",
  count: "1",
  wastePct: "10",
};

// The worked example is fixtures.json case 1 (slab-default-waste)
// input, vendored verbatim in test/fixtures.json; it equals DEFAULTS.
export const EXAMPLE = { ...DEFAULTS };

// Any raw field longer than this many UTF-16 code units is INPUT_LIMIT.
export const MAX_RAW_UNITS = 16;

// Fixed per-bag yields in m^3, written exactly as the SPEC pins them
// (manufacturers' published 0.30 / 0.45 / 0.60 ft^3 converted with
// 1 ft^3 = 0.028316846592 m^3 exactly).
export const BAG_YIELDS = {
  bag40: "0.0084950539776",
  bag60: "0.0127425809664",
  bag80: "0.0169901079552",
};

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

const PI_NUMERATOR = 3141592653589793238462643383279n; // PI * 10^30
const DEN = 4n * 10n ** 42n;
const YD3_DENOMINATOR = 764554857984n; // 0.764554857984 * 10^12
const MAX_DIMENSION_HUNDREDTHS = 1000000n; // 10000 cm in hundredths
const MAX_WASTE_HUNDREDTHS = 10000n; // 100% in hundredths

// Yield of one bag as a numerator over 10^13, parsed from the pinned
// decimal strings so the table above stays the single source.
const YIELD_NUMERATORS = Object.fromEntries(
  Object.entries(BAG_YIELDS).map(([key, text]) => [key, BigInt(text.replace(".", ""))]),
);

function failure(code, path) {
  return { ok: false, error: { code, path } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the nine
// string fields.
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

// Parses a grammar-valid decimal string (at most 2 decimal places)
// into an exact BigInt of hundredths.
function parseHundredths(text) {
  const dot = text.indexOf(".");
  if (dot === -1) return BigInt(text) * 100n;
  const whole = text.slice(0, dot);
  const fraction = (text.slice(dot + 1) + "0").slice(0, 2);
  return BigInt(whole) * 100n + BigInt(fraction);
}

// Per-field checks in the SPEC's order: raw capacity, empty, grammar,
// range. Returns { hundredths } or { error }.
function validateDecimal(field, value, maxHundredths, allowZero) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", `/${field}`) };
  if (value.length === 0) return { error: failure("EMPTY", `/${field}`) };
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("NUMBER_FORMAT", `/${field}`) };
  const hundredths = parseHundredths(value);
  if ((!allowZero && hundredths <= 0n) || hundredths > maxHundredths) {
    return { error: failure("RANGE", `/${field}`) };
  }
  return { hundredths };
}

function validateCount(value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", "/count") };
  if (value.length === 0) return { error: failure("EMPTY", "/count") };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", "/count") };
  const count = Number(value);
  if (count < 1 || count > 999) return { error: failure("RANGE", "/count") };
  return { count };
}

// Formats the exact rational num/den as a 3-decimal half-up string.
function format3(num, den) {
  const thousandths = (2000n * num + den) / (2n * den);
  const whole = thousandths / 1000n;
  const fraction = thousandths % 1000n;
  return `${whole}.${String(fraction).padStart(3, "0")}`;
}

function ceilDiv(numerator, denominator) {
  return (numerator + denominator - 1n) / denominator;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", "");

  // Validation order is fixed: SCHEMA, shape, the current shape's
  // dimension fields in their pinned order, count, wastePct.
  if (!SHAPES.includes(raw.shape)) return failure("ENUM", "/shape");
  const shape = raw.shape;

  const dimensions = {};
  for (const field of SHAPE_FIELDS[shape]) {
    const outcome = validateDecimal(field, raw[field], MAX_DIMENSION_HUNDREDTHS, false);
    if (outcome.error) return outcome.error;
    dimensions[field] = outcome.hundredths;
  }
  const countOutcome = validateCount(raw.count);
  if (countOutcome.error) return countOutcome.error;
  const wasteOutcome = validateDecimal("wastePct", raw.wastePct, MAX_WASTE_HUNDREDTHS, true);
  if (wasteOutcome.error) return wasteOutcome.error;

  // Unit volume numerator over DEN.
  let unitNumerator;
  if (shape === "cylinder") {
    const diameter = dimensions.diameterCm;
    unitNumerator = PI_NUMERATOR * diameter * diameter * dimensions.heightCm;
  } else {
    const [first, second, third] = SHAPE_FIELDS[shape].map((field) => dimensions[field]);
    unitNumerator = 4n * 10n ** 30n * first * second * third;
  }

  const netNumerator = unitNumerator * BigInt(countOutcome.count);
  const adjustedNumerator = netNumerator * (10000n + wasteOutcome.hundredths);
  const adjustedDenominator = DEN * 10000n;

  const bags = {};
  for (const key of ["bag40", "bag60", "bag80"]) {
    // ceil(adjusted / yield) with yield = numerator / 10^13, computed
    // from the unrounded adjusted volume.
    bags[key] = Number(
      ceilDiv(adjustedNumerator * 10n ** 13n, adjustedDenominator * YIELD_NUMERATORS[key]),
    );
  }

  return {
    ok: true,
    result: {
      shape,
      count: countOutcome.count,
      netVolumeM3: format3(netNumerator, DEN),
      adjustedVolumeM3: format3(adjustedNumerator, adjustedDenominator),
      adjustedVolumeYd3: format3(adjustedNumerator * 10n ** 12n, adjustedDenominator * YD3_DENOMINATOR),
      bags,
    },
  };
}
