// Pure core for the Solar Payback Calculator
// (spec-solar-payback-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// All arithmetic is exact decimal arithmetic on BigInt coefficients
// (value = coef * 10^-exp). This matters because the SPEC pins
// half-away-from-zero rounding and the fixtures were derived with
// decimal arithmetic: binary floating point can flip an exact .5
// boundary (for example 50 kWh exported at a 1.15 tariff is exactly
// 57.5 in decimal, but 50 * 1.15 is 57.49999999999999 in binary).
// Every output is rounded from the exact unrounded value, per the
// SPEC: kWh and NT$ amounts to integers, paybackYears /
// requiredRoofAreaM2 to 1 decimal, maxFeasibleKwp by flooring to
// 1 decimal. The ping conversion (1 ping = 400/121 m2) is display
// only, to 2 decimals.
//
// Validation order per field (first error stops, fields in the
// SPEC's order): raw capacity INPUT_LIMIT (16 units) -> EMPTY ->
// DECIMAL_FORMAT (grammar or too many decimal places) -> RANGE.
// Unknown fields, missing fields, wrong types, and accessors are
// SCHEMA with field null. The SPEC defines no UNICODE code: a lone
// surrogate simply fails the decimal grammar and is DECIMAL_FORMAT.
// The tariff table is the SPEC's pinned 2026 (ROC 115) MOEA rooftop
// table, written as literal constants; it is never fetched or
// updated at runtime. Band lower bounds are inclusive, upper bounds
// exclusive (10 kWp uses the 10-<20 kW band).

export const FIELDS = [
  "systemKwp",
  "roofAreaM2",
  "sunHours",
  "installCost",
  "fitRate",
  "selfUsePct",
  "retailPrice",
];

export const DEFAULTS = {
  systemKwp: "9",
  roofAreaM2: "80",
  sunHours: "1250",
  installCost: "540000",
  fitRate: "5.6279",
  selfUsePct: "30",
  retailPrice: "3.00",
};

// The worked example is fixtures.json case 1 (typical-rooftop-9kw)
// input, vendored verbatim in test/fixtures.json. It happens to
// equal the reset defaults.
export const EXAMPLE = {
  systemKwp: "9",
  roofAreaM2: "80",
  sunHours: "1250",
  installCost: "540000",
  fitRate: "5.6279",
  selfUsePct: "30",
  retailPrice: "3.00",
};

export const MAX_RAW_UNITS = 16;

// Per-field rules in the SPEC's validation order: max decimal
// places, then the inclusive range (as decimal strings, compared
// exactly).
export const FIELD_SPECS = {
  systemKwp: { maxDp: 2, min: "0.1", max: "500" },
  roofAreaM2: { maxDp: 2, min: "1", max: "100000" },
  sunHours: { maxDp: 1, min: "500", max: "2000" },
  installCost: { maxDp: 0, min: "1", max: "100000000" },
  fitRate: { maxDp: 4, min: "0.0001", max: "20" },
  selfUsePct: { maxDp: 1, min: "0", max: "100" },
  retailPrice: { maxDp: 2, min: "0.01", max: "20" },
};

// Pinned 2026 (ROC 115) MOEA rooftop feed-in tariff table. Each band
// is [lower, upper) in kWp; the last band is 500 kWp and above.
// Source: MOEA announcement of 2 January 2026, "115 年度再生能源電能
// 躉購費率及其計算公式" (Ref. 經能字第 11458005630 號); the first
// and second phases of 2026 carry the same rates, 20-year term.
// Ground-mounted (3.5037) and floating water-surface (3.8948) rates
// are reference only and are NOT used by this tool. The 15% northern
// region bonus, the 6% high-efficiency module bonus, and local
// government subsidies are all excluded by the SPEC.
export const FIT_BANDS = [
  { belowKwpHundredths: 1000n, rate: "5.6279" },
  { belowKwpHundredths: 2000n, rate: "5.3819" },
  { belowKwpHundredths: 5000n, rate: "4.2505" },
  { belowKwpHundredths: 10000n, rate: "4.0459" },
  { belowKwpHundredths: 50000n, rate: "3.7152" },
  { belowKwpHundredths: null, rate: "3.6236" },
];

export const TARIFF_CITATION_ZH =
  "經濟部 2026 年 1 月 2 日公告「115 年度再生能源電能躉購費率及其計算公式」（經能字第 11458005630 號）";
export const TARIFF_CITATION_EN =
  "MOEA announcement dated 2 January 2026 (Ref. No. 11458005630): 2026 (ROC 115) feed-in tariffs for rooftop solar";

// Planning value pinned by the SPEC: each 1 kWp needs 8 m2 of roof
// (module spacing plus maintenance access).
export const ROOF_M2_PER_KWP = 8;

// 1 ping = 400/121 m2, display only.
const PING_NUMERATOR = 121n;
const PING_DENOMINATOR = 400n;

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the seven
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

// --- Exact decimal arithmetic -------------------------------------
// A decimal is { coef: BigInt, exp: number } meaning coef * 10^-exp.

function parseDecimal(value) {
  const match = DECIMAL_PATTERN.exec(value);
  if (match === null) return null;
  const intPart = match[1];
  const fracPart = match[2] === undefined ? "" : match[2].slice(1);
  return { coef: BigInt(intPart + fracPart), exp: fracPart.length };
}

function compareDecimals(a, b) {
  const left = a.coef * 10n ** BigInt(b.exp);
  const right = b.coef * 10n ** BigInt(a.exp);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function align(a, b) {
  const exp = Math.max(a.exp, b.exp);
  const scale = (d) => d.coef * 10n ** BigInt(exp - d.exp);
  return { aCoef: scale(a), bCoef: scale(b), exp };
}

function addDecimals(a, b) {
  const { aCoef, bCoef, exp } = align(a, b);
  return { coef: aCoef + bCoef, exp };
}

function subtractDecimals(a, b) {
  const { aCoef, bCoef, exp } = align(a, b);
  return { coef: aCoef - bCoef, exp };
}

function multiplyDecimals(a, b) {
  return { coef: a.coef * b.coef, exp: a.exp + b.exp };
}

// Dividing an exact decimal by 10^k: the exponent grows by k.
function divideDecimalByPowerOfTen(a, k) {
  return { coef: a.coef, exp: a.exp + k };
}

// Round an exact decimal to the nearest integer, halves away from
// zero. Returns a Number (all outputs here are far below 2^53).
function roundDecimalToInt(value) {
  const divisor = 10n ** BigInt(value.exp);
  const doubled = value.coef * 2n;
  let quotient;
  if (value.coef >= 0n) {
    quotient = (doubled + divisor) / (divisor * 2n);
  } else {
    quotient = -((-doubled + divisor) / (divisor * 2n));
  }
  return Number(quotient);
}

// Round an exact decimal to 1 decimal place, halves away from zero.
// Returns a Number (for example 9.9, 37, 10.3).
function roundDecimalToTenths(value) {
  const tenths = { coef: value.coef * 10n, exp: value.exp };
  return roundDecimalToInt(tenths) / 10;
}

// Floor a non-negative exact decimal divided by 8, to 1 decimal
// place: floor(value / 8 * 10) / 10. Used for maxFeasibleKwp, where
// the SPEC pins floor (not round). Returns a Number.
function floorEighthsToTenths(value) {
  const numerator = value.coef * 10n;
  const denominator = BigInt(ROOF_M2_PER_KWP) * 10n ** BigInt(value.exp);
  return Number(numerator / denominator) / 10;
}

function decimalToNumber(value) {
  return Number(value.coef) / 10 ** value.exp;
}

// --- Tariff table --------------------------------------------------

function tableRateFor(kwp) {
  // kWp has at most 2 decimal places: hundredths is an exact integer.
  const hundredths = kwp.coef * 10n ** BigInt(2 - kwp.exp);
  for (const band of FIT_BANDS) {
    if (band.belowKwpHundredths === null || hundredths < band.belowKwpHundredths) {
      return band.rate;
    }
  }
  return FIT_BANDS[FIT_BANDS.length - 1].rate;
}

function isTableRate(fitRate, kwp) {
  const table = parseDecimal(tableRateFor(kwp));
  return compareDecimals(fitRate, table) === 0;
}

// --- Validation ----------------------------------------------------

function validateField(field, value) {
  const spec = FIELD_SPECS[field];
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  const parsed = parseDecimal(value);
  if (parsed === null) return { error: failure("DECIMAL_FORMAT", field) };
  const fracDigits = value.includes(".") ? value.split(".")[1].length : 0;
  if (fracDigits > spec.maxDp) return { error: failure("DECIMAL_FORMAT", field) };
  const min = parseDecimal(spec.min);
  const max = parseDecimal(spec.max);
  if (compareDecimals(parsed, min) < 0 || compareDecimals(parsed, max) > 0) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

// --- Core ----------------------------------------------------------

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  for (const field of FIELDS) {
    const outcome = validateField(field, raw[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.value;
  }

  const kwp = checked.systemKwp;
  const roofArea = checked.roofAreaM2;
  const sunHours = checked.sunHours;
  const installCost = checked.installCost;
  const fitRate = checked.fitRate;
  const selfUsePct = checked.selfUsePct;
  const retailPrice = checked.retailPrice;

  // 1. Annual generation (kWh/year).
  const generation = multiplyDecimals(kwp, sunHours);
  // 2. Self-used and exported kWh.
  const selfUsed = divideDecimalByPowerOfTen(multiplyDecimals(generation, selfUsePct), 2);
  const exported = subtractDecimals(generation, selfUsed);
  // 3. Revenues and annual benefit.
  const exportRevenue = multiplyDecimals(exported, fitRate);
  const selfUseSaving = multiplyDecimals(selfUsed, retailPrice);
  const benefit = addDecimals(exportRevenue, selfUseSaving);
  // 4. Payback years (unrounded): installCost / benefit.
  // benefit is always positive: generation >= 50 kWh and at least
  // one of the two revenue legs is positive (fitRate >= 0.0001 and
  // retailPrice >= 0.01), so there is no division by zero.
  const paybackTenths = roundPaybackTenths(installCost, benefit);
  const beyondContract = isPaybackBeyond20(installCost, benefit);
  // 5. 20-year totals (unrounded benefit * 20, minus cost).
  const total20 = multiplyDecimals(benefit, { coef: 20n, exp: 0 });
  const net20 = subtractDecimals(total20, installCost);
  // 6. Roof rule: 8 m2 per kWp; a shortfall is a warning, not an error.
  const requiredRoof = multiplyDecimals(kwp, { coef: BigInt(ROOF_M2_PER_KWP), exp: 0 });
  const roofWarning = compareDecimals(requiredRoof, roofArea) > 0 ? "ROOF_TIGHT" : null;
  const maxFeasible = floorEighthsToTenths(roofArea);

  return {
    ok: true,
    result: {
      annualGenerationKwh: roundDecimalToInt(generation),
      selfUsedKwh: roundDecimalToInt(selfUsed),
      exportedKwh: roundDecimalToInt(exported),
      fitRateApplied: decimalToNumber(fitRate),
      fitSource: isTableRate(fitRate, kwp) ? "table" : "override",
      exportRevenueTwd: roundDecimalToInt(exportRevenue),
      selfUseSavingTwd: roundDecimalToInt(selfUseSaving),
      annualBenefitTwd: roundDecimalToInt(benefit),
      paybackYears: paybackTenths,
      total20BenefitTwd: roundDecimalToInt(total20),
      net20Twd: roundDecimalToInt(net20),
      requiredRoofAreaM2: roundDecimalToTenths(requiredRoof),
      roofWarning,
      maxFeasibleKwp: maxFeasible,
      beyondContract,
    },
  };
}

// paybackYears to 1 decimal, halves away from zero, computed exactly:
// payback * 10 = installCost * 10 / benefit.
function roundPaybackTenths(installCost, benefit) {
  const numerator = installCost.coef * 10n * 10n ** BigInt(benefit.exp);
  const denominator = benefit.coef;
  const quotient = (numerator * 2n + denominator) / (denominator * 2n);
  return Number(quotient) / 10;
}

// paybackYears > 20, on the unrounded value: installCost > 20 * benefit.
function isPaybackBeyond20(installCost, benefit) {
  const scaled = installCost.coef * 10n ** BigInt(benefit.exp);
  return scaled > 20n * benefit.coef;
}

// Display-only ping conversion: 1 ping = 400/121 m2, to 2 decimals.
// Takes a decimal string (a draft field or a rounded result value)
// and returns a string with exactly 2 decimals, or null when the
// input is not a valid decimal string.
export function m2ToPing(raw) {
  if (typeof raw !== "string") return null;
  const parsed = parseDecimal(raw);
  if (parsed === null) return null;
  // ping * 100 = coef * 121 * 100 / (400 * 10^exp), rounded half
  // away from zero (non-negative inputs only in practice).
  const numerator = parsed.coef * PING_NUMERATOR * 100n;
  const denominator = PING_DENOMINATOR * 10n ** BigInt(parsed.exp);
  const hundredths = (numerator * 2n + denominator) / (denominator * 2n);
  const whole = hundredths / 100n;
  const frac = hundredths % 100n;
  return `${whole.toString()}.${frac.toString().padStart(2, "0")}`;
}

// Fixed report download: solar-payback-calculator-report.json. The
// content is the result's compact JSON with object keys sorted
// recursively by UTF-16 code units, array order unchanged, exactly
// one trailing LF, UTF-8 without BOM. The serializer is hand-written:
// it never calls a value's toJSON and accepts only the plain data
// shapes a result can hold (null, booleans, finite numbers, strings,
// arrays, plain objects).
export const REPORT_FILENAME = "solar-payback-calculator-report.json";
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
