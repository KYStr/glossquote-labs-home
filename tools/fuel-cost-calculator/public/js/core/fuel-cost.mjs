// Fuel Cost Calculator — pure core.
//
// Implements docs/specs/fuel-cost-calculator/SPEC.md section 4 exactly:
// exact rational constants, one normalisation path (everything becomes
// litres and kilometres), exact rational arithmetic end to end, and a
// single rounding point at display (round-half-up, formatTwoDp).
// No DOM, no network, no storage; directly importable by tests.

import { frac, mul, div, cmp, parseDecimal, formatTwoDp } from './fraction.mjs';

// --- Auditable constants (SPEC section 4: definitions, not measurements) ---
// 1 mile = 1.609344 km; 1 US gallon = 3.785411784 L; 1 Imperial gallon = 4.54609 L.
// L/100km from MPG (US) is (112903/480) / MPG exactly, because
// 100 * 3.785411784 / 1.609344 = 112903/480; from MPG (UK) it is
// (56826125/201168) / MPG exactly. Decimal approximations here are a defect.
export const CONSTANTS = Object.freeze({
  mileToKm: frac(1609344n, 1000000n),
  usGallonToLitre: frac(3785411784n, 1000000000n),
  imperialGallonToLitre: frac(454609n, 100000n),
  mpgUsFactor: frac(112903n, 480n),
  mpgUkFactor: frac(56826125n, 201168n),
});

const ZERO = frac(0n);
const HUNDRED = frac(100n);

// Bounds from SPEC section 4. `minExclusive: true` means the value must be
// strictly greater than min (distance and price have no positive floor other
// than zero); consumption lower bounds are inclusive. Display strings are
// kept beside the fractions so the UI can quote the range exactly as pinned.
export const BOUNDS = Object.freeze({
  distance: Object.freeze({
    min: frac(0n), minExclusive: true, max: frac(100000n), minText: '0', maxText: '100000',
  }),
  consumption: Object.freeze({
    'l100km': Object.freeze({
      min: frac(1n, 10n), minExclusive: false, max: frac(100n), minText: '0.1', maxText: '100',
    }),
    kml: Object.freeze({
      min: frac(1n), minExclusive: false, max: frac(100n), minText: '1', maxText: '100',
    }),
    'mpg-us': Object.freeze({
      min: frac(1n), minExclusive: false, max: frac(200n), minText: '1', maxText: '200',
    }),
    'mpg-uk': Object.freeze({
      min: frac(1n), minExclusive: false, max: frac(200n), minText: '1', maxText: '200',
    }),
  }),
  price: Object.freeze({
    min: frac(0n), minExclusive: true, max: frac(10000n), minText: '0', maxText: '10000',
  }),
  people: Object.freeze({ min: 1, max: 12 }),
});

export const DISTANCE_UNITS = Object.freeze(['km', 'mi']);
export const CONSUMPTION_UNITS = Object.freeze(['l100km', 'kml', 'mpg-us', 'mpg-uk']);
export const PRICE_UNITS = Object.freeze(['litre', 'gal-us', 'gal-uk']);

// The currency selector is a display label only; it never converts.
// Output symbols match the SPEC fixtures (F1 "$29.25", F3 "NT$610.00", F4 "£26.37").
export const CURRENCIES = Object.freeze(['TWD', 'USD', 'EUR', 'GBP', 'JPY']);
export const CURRENCY_SYMBOLS = Object.freeze({
  TWD: 'NT$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
});

function validateDecimalField(raw, bound) {
  const text = raw === undefined || raw === null ? '' : String(raw).trim();
  if (text === '') return { ok: false, error: 'required' };
  const parsed = parseDecimal(text);
  if (!parsed.ok) return { ok: false, error: 'not-a-number' };
  if (parsed.decimals > 2) return { ok: false, error: 'too-many-decimals' };
  const belowMin = bound.minExclusive
    ? cmp(parsed.value, bound.min) <= 0
    : cmp(parsed.value, bound.min) < 0;
  if (belowMin || cmp(parsed.value, bound.max) > 0) {
    return { ok: false, error: 'out-of-range' };
  }
  return { ok: true, value: parsed.value };
}

function validatePeople(raw) {
  const text = raw === undefined || raw === null ? '' : String(raw).trim();
  if (text === '') return { ok: false, error: 'required' };
  if (!/^\d+$/.test(text)) return { ok: false, error: 'not-whole' };
  const n = Number.parseInt(text, 10);
  if (n < BOUNDS.people.min || n > BOUNDS.people.max) {
    return { ok: false, error: 'out-of-range' };
  }
  return { ok: true, value: n };
}

function toLitresPer100Km(consumption, unit) {
  if (unit === 'l100km') return consumption;
  if (unit === 'kml') return div(HUNDRED, consumption);
  if (unit === 'mpg-us') return div(CONSTANTS.mpgUsFactor, consumption);
  return div(CONSTANTS.mpgUkFactor, consumption); // mpg-uk
}

function toPricePerLitre(price, unit) {
  if (unit === 'litre') return price;
  if (unit === 'gal-us') return div(price, CONSTANTS.usGallonToLitre);
  return div(price, CONSTANTS.imperialGallonToLitre); // gal-uk
}

/**
 * Validate all fields independently and, when every field is valid, compute
 * the results with exact rational arithmetic.
 *
 * input: {
 *   distance: string, distanceUnit: 'km' | 'mi',
 *   consumption: string, consumptionUnit: 'l100km' | 'kml' | 'mpg-us' | 'mpg-uk',
 *   price: string, priceUnit: 'litre' | 'gal-us' | 'gal-uk',
 *   currency: one of CURRENCIES,
 *   splitOn: boolean, people: string (validated only when splitOn)
 * }
 *
 * Returns { ok: true, results } or { ok: false, errors } where errors maps a
 * field name to 'required' | 'not-a-number' | 'too-many-decimals' |
 * 'out-of-range' | 'not-whole'. Unknown unit/currency values throw, because
 * they come from fixed <select> controls, never from free text.
 */
export function computeFuelCost(input) {
  if (!DISTANCE_UNITS.includes(input.distanceUnit)) {
    throw new RangeError(`unknown distance unit: ${input.distanceUnit}`);
  }
  if (!CONSUMPTION_UNITS.includes(input.consumptionUnit)) {
    throw new RangeError(`unknown consumption unit: ${input.consumptionUnit}`);
  }
  if (!PRICE_UNITS.includes(input.priceUnit)) {
    throw new RangeError(`unknown price unit: ${input.priceUnit}`);
  }
  if (!CURRENCIES.includes(input.currency)) {
    throw new RangeError(`unknown currency: ${input.currency}`);
  }

  const errors = {};
  const distance = validateDecimalField(input.distance, BOUNDS.distance);
  if (!distance.ok) errors.distance = distance.error;
  const consumption = validateDecimalField(
    input.consumption,
    BOUNDS.consumption[input.consumptionUnit],
  );
  if (!consumption.ok) errors.consumption = consumption.error;
  const price = validateDecimalField(input.price, BOUNDS.price);
  if (!price.ok) errors.price = price.error;
  let people = null;
  if (input.splitOn) {
    people = validatePeople(input.people);
    if (!people.ok) errors.people = people.error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // Normalisation (SPEC section 4): everything becomes litres and kilometres.
  const distanceKm = input.distanceUnit === 'mi'
    ? mul(distance.value, CONSTANTS.mileToKm)
    : distance.value;
  const consumptionL100 = toLitresPer100Km(consumption.value, input.consumptionUnit);
  const pricePerLitre = toPricePerLitre(price.value, input.priceUnit);

  const fuelLitres = div(mul(distanceKm, consumptionL100), HUNDRED);
  const totalCost = mul(fuelLitres, pricePerLitre);
  // The share derives from the exact total, never from the displayed total.
  const share = input.splitOn ? div(totalCost, frac(BigInt(people.value))) : null;

  const symbol = CURRENCY_SYMBOLS[input.currency];
  return {
    ok: true,
    results: {
      fuelLitres,
      totalCost,
      share,
      consumptionL100,
      display: {
        fuel: `${formatTwoDp(fuelLitres)} L`,
        total: `${symbol}${formatTwoDp(totalCost)}`,
        share: share === null ? null : `${symbol}${formatTwoDp(share)}`,
        echo: `${formatTwoDp(consumptionL100)} L/100km`,
      },
    },
  };
}
