// Pure core for the Electricity Cost Calculator: strict string validation,
// exact energy and money arithmetic, and display formatting.
// No DOM, no network, no storage: this module is importable by tests.
//
// Arithmetic discipline (SPEC section 4): energy and money are kept exact
// as BigInt rationals end to end. Inputs have bounded decimal places, so
//   kWh          = wattsTenths * hoursHundredths * quantity / 10^6
//   cost         = kWh * rateThousandths / 10^3
// are exact. The ONLY rounding is at display: half away from zero into the
// currency's minor units (money) or three decimals (kWh).

import { CURRENCIES, LIMITS } from "./data.mjs";

const ENERGY_DEN = 1_000_000n; // kWh rationals: numerator / 10^6
const COST_DEN = 1_000_000_000n; // cost rationals: numerator / 10^9

// ---------------------------------------------------------------- parsing

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

// Parse a raw user string as a decimal. Returns { ok, scaled, decimals }
// where value = scaled / 10^decimals, or { ok: false, code }.
export function parseDecimal(raw) {
  if (typeof raw !== "string") return { ok: false, code: "not-a-number" };
  const text = raw.trim();
  if (text === "") return { ok: false, code: "required" };
  if (!DECIMAL_PATTERN.test(text)) return { ok: false, code: "not-a-number" };
  const negative = text.startsWith("-");
  const body = negative ? text.slice(1) : text;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "" : body.slice(dot + 1);
  const scaled = BigInt(intPart + fracPart);
  return {
    ok: true,
    scaled: negative ? -scaled : scaled,
    decimals: fracPart.length,
    hasDecimalPoint: dot !== -1,
  };
}

// Rescale a parsed decimal to a fixed scale; caller guarantees
// parsed.decimals <= scale.
function toScale(parsed, scale) {
  return parsed.scaled * 10n ** BigInt(scale - parsed.decimals);
}

// ------------------------------------------------------------- validation

function fail(errors, field, code, extra = {}) {
  errors.push({ field, code, ...extra });
  return null;
}

// A bounded decimal field (watts, hours, rate). scale is the canonical
// storage scale; maxScaled is the inclusive upper bound at that scale.
function decimalField(errors, field, raw, { decimals, scale, maxScaled }) {
  const parsed = parseDecimal(raw);
  if (!parsed.ok) return fail(errors, field, parsed.code);
  if (parsed.decimals > decimals) {
    return fail(errors, field, "too-many-decimals", { maxDecimals: decimals });
  }
  const value = toScale(parsed, scale);
  if (value <= 0n) return fail(errors, field, "must-be-positive");
  if (value > maxScaled) return fail(errors, field, "above-max");
  return value;
}

// A whole-number field (days, quantity, tier thresholds).
function wholeField(errors, field, raw, { min, max }) {
  const parsed = parseDecimal(raw);
  if (!parsed.ok) return fail(errors, field, parsed.code);
  if (parsed.hasDecimalPoint) return fail(errors, field, "not-whole");
  if (parsed.scaled < min || parsed.scaled > max) {
    return fail(errors, field, "out-of-range");
  }
  return parsed.scaled;
}

function validateRate(errors, field, raw) {
  return decimalField(errors, field, raw, {
    decimals: LIMITS.rateDecimals,
    scale: 3,
    maxScaled: LIMITS.rateMaxThousandths,
  });
}

// -------------------------------------------------------------- rounding

// Round the non-negative rational num/den to the nearest integer, half
// away from zero. All quantities in this tool are non-negative.
export function roundRatio(num, den) {
  return (2n * num + den) / (2n * den);
}

function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format an exact rational amount of energy as kWh with three decimals,
// comma grouping and a point decimal separator (SPEC section 4).
export function formatKwh(num, den) {
  const milli = roundRatio(num * 1000n, den);
  const intPart = milli / 1000n;
  const fracPart = milli % 1000n;
  return `${groupThousands(intPart.toString())}.${fracPart
    .toString()
    .padStart(3, "0")}`;
}

// Round an exact rational cost ONCE into integer minor units of the
// currency and format it: symbol prefix, no space, comma grouping.
export function formatMoney(num, den, currencyCode) {
  const currency = CURRENCIES[currencyCode];
  const minor = currency.minorUnits;
  const minorValue = roundRatio(num * 10n ** BigInt(minor), den);
  return formatMinorUnits(minorValue, currencyCode);
}

export function formatMinorUnits(minorValue, currencyCode) {
  const currency = CURRENCIES[currencyCode];
  const minor = currency.minorUnits;
  const digits = minorValue.toString();
  if (minor === 0) return currency.symbol + groupThousands(digits);
  const padded = digits.padStart(minor + 1, "0");
  const intPart = padded.slice(0, padded.length - minor);
  const fracPart = padded.slice(padded.length - minor);
  return `${currency.symbol}${groupThousands(intPart)}.${fracPart}`;
}

// Rates display with exactly three decimals, as in the SPEC fixtures.
export function formatRate(rateThousandths) {
  const intPart = rateThousandths / 1000n;
  const fracPart = rateThousandths % 1000n;
  return `${intPart.toString()}.${fracPart.toString().padStart(3, "0")}`;
}

// ------------------------------------------------------------ calculation

// input: {
//   watts, hoursPerDay, days, quantity,   // raw strings
//   currency,                              // code from CURRENCIES
//   tariff: { mode: "flat", rate } |
//           { mode: "tiered", bands: [{ threshold: string|null, rate }] }
// }
// The final band's threshold must be null (open-ended); every earlier
// band carries a whole-kWh threshold string.
// Returns { ok: true, result } or { ok: false, errors: [{field, code}] }.
export function calculate(input) {
  const errors = [];

  const wattsTenths = decimalField(errors, "watts", input.watts, {
    decimals: LIMITS.wattsDecimals,
    scale: 1,
    maxScaled: LIMITS.wattsMaxTenths,
  });
  const hoursHundredths = decimalField(errors, "hours", input.hoursPerDay, {
    decimals: LIMITS.hoursDecimals,
    scale: 2,
    maxScaled: LIMITS.hoursMaxHundredths,
  });
  const days = wholeField(errors, "days", input.days, {
    min: LIMITS.daysMin,
    max: LIMITS.daysMax,
  });
  const quantity = wholeField(errors, "quantity", input.quantity, {
    min: LIMITS.quantityMin,
    max: LIMITS.quantityMax,
  });

  if (!CURRENCIES[input.currency]) {
    fail(errors, "currency", "unknown-currency");
  }

  const tariff = input.tariff ?? {};
  let flatRate = null;
  let bands = null;
  if (tariff.mode === "flat") {
    flatRate = validateRate(errors, "rate", tariff.rate);
  } else if (tariff.mode === "tiered") {
    bands = validateBands(errors, tariff.bands);
  } else {
    fail(errors, "tariff", "unknown-mode");
  }

  if (errors.length > 0) return { ok: false, errors };

  // Exact energy: kWh/day = (watts / 1000) * hours * quantity.
  const energyDayNum = wattsTenths * hoursHundredths * quantity;
  const energyPeriodNum = energyDayNum * days;

  const result = {
    currency: input.currency,
    kwhPerDay: formatKwh(energyDayNum, ENERGY_DEN),
    kwhPeriod: formatKwh(energyPeriodNum, ENERGY_DEN),
    perDayIsAverage: tariff.mode === "tiered",
    bands: [],
    costPerDay: null,
    costPeriod: null,
  };

  if (tariff.mode === "flat") {
    result.costPerDay = formatMoney(energyDayNum * flatRate, COST_DEN, input.currency);
    result.costPeriod = formatMoney(
      energyPeriodNum * flatRate,
      COST_DEN,
      input.currency,
    );
    return { ok: true, result };
  }

  // Tiered: price the period energy band by band (SPEC section 4).
  let lowerKwh = 0n;
  let totalNum = 0n;
  for (const band of bands) {
    const upperScaled = band.threshold === null ? null : band.threshold * ENERGY_DEN;
    const capped =
      upperScaled === null || energyPeriodNum < upperScaled
        ? energyPeriodNum
        : upperScaled;
    const bandNum = capped - lowerKwh * ENERGY_DEN;
    if (bandNum > 0n) {
      const subtotalNum = bandNum * band.rate; // over COST_DEN
      totalNum += subtotalNum;
      result.bands.push({
        from: Number(lowerKwh),
        to: band.threshold === null ? null : Number(band.threshold),
        kwh: formatKwh(bandNum, ENERGY_DEN),
        rate: formatRate(band.rate),
        subtotal: formatMoney(subtotalNum, COST_DEN, input.currency),
      });
    }
    if (band.threshold !== null) lowerKwh = band.threshold;
  }
  // The period cost is the rounded EXACT sum of unrounded subtotals,
  // never the sum of the displayed subtotals.
  result.costPeriod = formatMoney(totalNum, COST_DEN, input.currency);
  // No true per-day cost exists under tiered pricing: exact total / days.
  result.costPerDay = formatMoney(totalNum, COST_DEN * days, input.currency);
  return { ok: true, result };
}

function validateBands(errors, rawBands) {
  if (
    !Array.isArray(rawBands) ||
    rawBands.length < LIMITS.bandsMin ||
    rawBands.length > LIMITS.bandsMax
  ) {
    fail(errors, "bands", "band-count");
    return null;
  }
  const bands = [];
  let previousThreshold = null;
  rawBands.forEach((rawBand, index) => {
    const isFinal = index === rawBands.length - 1;
    let threshold = null;
    if (isFinal) {
      if (rawBand.threshold !== null && rawBand.threshold !== undefined) {
        fail(errors, "bands", "final-band-must-be-open");
      }
    } else if (rawBand.threshold === null || rawBand.threshold === undefined) {
      fail(errors, `threshold${index + 1}`, "required");
    } else {
      threshold = wholeField(errors, `threshold${index + 1}`, rawBand.threshold, {
        min: LIMITS.thresholdMin,
        max: LIMITS.thresholdMax,
      });
      if (threshold !== null && previousThreshold !== null && threshold <= previousThreshold) {
        fail(errors, `threshold${index + 1}`, "not-ascending", { band: index + 1 });
        threshold = null;
      }
      if (threshold !== null) previousThreshold = threshold;
    }
    const rate = validateRate(errors, `rate${index + 1}`, rawBand.rate);
    bands.push({ threshold, rate });
  });
  return bands;
}
