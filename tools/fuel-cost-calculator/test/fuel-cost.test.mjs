// Core tests for the Fuel Cost Calculator.
//
// Every expected value is derived from docs/specs/fuel-cost-calculator/
// SPEC.md section 4 by hand (fixtures F1–F5, the constant identities and
// the per-unit bounds), never from the implementation's own output.

import test from 'node:test';
import assert from 'node:assert/strict';

import { frac, equals, toDecimalString, formatTwoDp } from '../public/js/core/fraction.mjs';
import { computeFuelCost, CONSTANTS } from '../public/js/core/fuel-cost.mjs';

const BASE = {
  distance: '250',
  distanceUnit: 'km',
  consumption: '6.5',
  consumptionUnit: 'l100km',
  price: '1.80',
  priceUnit: 'litre',
  currency: 'USD',
  splitOn: false,
  people: '4',
};
const run = (overrides = {}) => computeFuelCost({ ...BASE, ...overrides });

// --- SPEC fixtures F1–F5 -------------------------------------------------

test('F1: 250 km, 6.5 L/100km, $1.80/L, split 4', () => {
  const out = run({ splitOn: true, people: '4' });
  assert.equal(out.ok, true);
  assert.equal(out.results.display.fuel, '16.25 L');
  assert.equal(out.results.display.total, '$29.25');
  assert.equal(out.results.display.echo, '6.50 L/100km');
  assert.equal(out.results.display.share, '$7.31');
  // Exact values: fuel 65/4, total 117/4, share 117/16 (= 7.3125).
  assert.ok(equals(out.results.fuelLitres, frac(65n, 4n)));
  assert.ok(equals(out.results.totalCost, frac(117n, 4n)));
  assert.ok(equals(out.results.share, frac(117n, 16n)));
});

test('F2: 100 miles, 40 MPG (US), $3.60 per US gallon — exactly 2.5 gallons', () => {
  const out = run({
    distance: '100', distanceUnit: 'mi',
    consumption: '40', consumptionUnit: 'mpg-us',
    price: '3.60', priceUnit: 'gal-us',
  });
  assert.equal(out.ok, true);
  assert.equal(out.results.display.echo, '5.88 L/100km');
  assert.equal(out.results.display.fuel, '9.46 L');
  assert.equal(out.results.display.total, '$9.00');
  // Fuel is exactly 2.5 US gallons in litres: 9.46352946 exactly.
  const twoAndHalfGallons = frac(946352946n, 100000000n);
  assert.ok(equals(out.results.fuelLitres, twoAndHalfGallons));
});

test('F3: 300 km, 15 km/L, NT$30.50/L', () => {
  const out = run({
    distance: '300',
    consumption: '15', consumptionUnit: 'kml',
    price: '30.50', currency: 'TWD',
  });
  assert.equal(out.ok, true);
  assert.equal(out.results.display.fuel, '20.00 L');
  assert.equal(out.results.display.total, 'NT$610.00');
  assert.equal(out.results.display.echo, '6.67 L/100km');
});

test('F4: 200 miles, 50 MPG (UK), £1.45/L — exactly 4 Imperial gallons', () => {
  const out = run({
    distance: '200', distanceUnit: 'mi',
    consumption: '50', consumptionUnit: 'mpg-uk',
    price: '1.45', currency: 'GBP',
  });
  assert.equal(out.ok, true);
  assert.equal(out.results.display.fuel, '18.18 L');
  assert.equal(out.results.display.total, '£26.37');
  assert.equal(out.results.display.echo, '5.65 L/100km');
  // Fuel is exactly 4 Imperial gallons: 18.18436 L exactly.
  assert.ok(equals(out.results.fuelLitres, frac(1818436n, 100000n)));
});

test('F5: 100 km, 10 L/100km, $1.00/L, split 3 — shares diverge by a cent', () => {
  const out = run({
    distance: '100', consumption: '10', price: '1.00',
    splitOn: true, people: '3',
  });
  assert.equal(out.ok, true);
  assert.equal(out.results.display.fuel, '10.00 L');
  assert.equal(out.results.display.total, '$10.00');
  assert.equal(out.results.display.share, '$3.33');
  // Exact share is 10/3; 3 x $3.33 = $9.99 != $10.00 (the rounding-note case).
  assert.ok(equals(out.results.share, frac(10n, 3n)));
});

// --- Constant identities (SPEC section 7b) --------------------------------

test('identity: 40 MPG (US) is 5.8803645833... L/100km to 10+ significant digits', () => {
  const out = run({ consumption: '40', consumptionUnit: 'mpg-us' });
  assert.equal(toDecimalString(out.results.consumptionL100, 10), '5.8803645833');
});

test('identity: 15 km/L is 6.666... L/100km', () => {
  const out = run({ consumption: '15', consumptionUnit: 'kml' });
  assert.equal(toDecimalString(out.results.consumptionL100, 10), '6.6666666666');
});

test('identity: the pinned MPG fractions equal 100 * gallon / mile exactly', () => {
  // 112903/480 == 100 * 3.785411784 / 1.609344 and
  // 56826125/201168 == 100 * 4.54609 / 1.609344, as exact fractions.
  const usDerived = frac(100n * 3785411784n * 1000000n, 1000000000n * 1609344n);
  assert.ok(equals(CONSTANTS.mpgUsFactor, usDerived));
  const ukDerived = frac(100n * 454609n * 1000000n, 100000n * 1609344n);
  assert.ok(equals(CONSTANTS.mpgUkFactor, ukDerived));
});

test('US vs UK discrimination: same MPG number, different fuel', () => {
  const base = { distance: '100', distanceUnit: 'mi', consumption: '40', price: '1.00' };
  const us = run({ ...base, consumptionUnit: 'mpg-us' });
  const uk = run({ ...base, consumptionUnit: 'mpg-uk' });
  // 100 miles at 40 MPG is exactly 2.5 gallons of the respective kind.
  assert.equal(us.results.display.fuel, '9.46 L'); // 2.5 US gallons = 9.46352946 L
  assert.equal(uk.results.display.fuel, '11.37 L'); // 2.5 Imp gallons = 11.365225 L
  assert.ok(equals(uk.results.fuelLitres, frac(11365225n, 1000000n)));
});

// --- Share derives from the exact total (SPEC sections 4, 7d) -------------

test('share is computed from the exact total, not the displayed total', () => {
  // fuel = 200.1 km * 10 L/100km / 100 = 20.01 L; total = 20.01 * 0.50 = 10.005
  // exactly. Displayed total rounds half-up to $10.01, but the exact share
  // 10.005 / 2 = 5.0025 displays as $5.00. A share taken from the displayed
  // total would be 10.01 / 2 = 5.005 -> $5.01, a different cent.
  const out = run({
    distance: '200.1', consumption: '10', price: '0.50',
    splitOn: true, people: '2',
  });
  assert.equal(out.ok, true);
  assert.ok(equals(out.results.totalCost, frac(10005n, 1000n)));
  assert.equal(out.results.display.total, '$10.01');
  assert.equal(out.results.display.share, '$5.00');
});

// --- Bounds (SPEC sections 4, 7c) ------------------------------------------

test('distance bounds: 0 refused, 100000 accepted, 100000.01 refused', () => {
  assert.equal(run({ distance: '0' }).errors.distance, 'out-of-range');
  assert.equal(run({ distance: '-5' }).errors.distance, 'out-of-range');
  assert.equal(run({ distance: '100000' }).ok, true);
  assert.equal(run({ distance: '100000.01' }).errors.distance, 'out-of-range');
});

test('consumption bounds per unit: exact bounds accepted, just outside refused', () => {
  const cases = [
    // [unit, atMin, belowMin, atMax, aboveMax]
    ['l100km', '0.1', '0.09', '100', '100.01'],
    ['kml', '1', '0.99', '100', '100.01'],
    ['mpg-us', '1', '0.99', '200', '200.01'],
    ['mpg-uk', '1', '0.99', '200', '200.01'],
  ];
  for (const [unit, atMin, belowMin, atMax, aboveMax] of cases) {
    assert.equal(run({ consumption: atMin, consumptionUnit: unit }).ok, true, `${unit} min`);
    assert.equal(run({ consumption: belowMin, consumptionUnit: unit }).errors.consumption, 'out-of-range', `${unit} below min`);
    assert.equal(run({ consumption: atMax, consumptionUnit: unit }).ok, true, `${unit} max`);
    assert.equal(run({ consumption: aboveMax, consumptionUnit: unit }).errors.consumption, 'out-of-range', `${unit} above max`);
  }
});

test('price bounds: 0 refused, 10000 accepted, 10000.01 refused', () => {
  assert.equal(run({ price: '0' }).errors.price, 'out-of-range');
  assert.equal(run({ price: '10000' }).ok, true);
  assert.equal(run({ price: '10000.01' }).errors.price, 'out-of-range');
});

test('people bounds: 0, 13 and 2.5 refused; 1 and 12 accepted', () => {
  assert.equal(run({ splitOn: true, people: '0' }).errors.people, 'out-of-range');
  assert.equal(run({ splitOn: true, people: '13' }).errors.people, 'out-of-range');
  assert.equal(run({ splitOn: true, people: '2.5' }).errors.people, 'not-whole');
  assert.equal(run({ splitOn: true, people: '1' }).ok, true);
  assert.equal(run({ splitOn: true, people: '12' }).ok, true);
});

test('people is not validated while the split is off', () => {
  const out = run({ splitOn: false, people: 'not a number' });
  assert.equal(out.ok, true);
  assert.equal(out.results.share, null);
  assert.equal(out.results.display.share, null);
});

// --- Input shape refusals ---------------------------------------------------

test('empty, non-numeric and over-precise inputs are refused per field', () => {
  assert.equal(run({ distance: '' }).errors.distance, 'required');
  assert.equal(run({ distance: '   ' }).errors.distance, 'required');
  assert.equal(run({ distance: 'abc' }).errors.distance, 'not-a-number');
  assert.equal(run({ distance: '1e3' }).errors.distance, 'not-a-number');
  assert.equal(run({ distance: '1,000' }).errors.distance, 'not-a-number');
  assert.equal(run({ distance: '12.345' }).errors.distance, 'too-many-decimals');
  assert.equal(run({ consumption: '6.505' }).errors.consumption, 'too-many-decimals');
  assert.equal(run({ price: '1.800' }).errors.price, 'too-many-decimals');
  assert.equal(run({ splitOn: true, people: '' }).errors.people, 'required');
});

test('each field validates independently: one bad field keeps the others clean', () => {
  const out = run({ consumption: '9999' });
  assert.equal(out.ok, false);
  assert.deepEqual(Object.keys(out.errors), ['consumption']);
});

test('markup in a field is inert data, refused as not-a-number', () => {
  const out = run({ distance: '<script>alert(1)</script>' });
  assert.equal(out.ok, false);
  assert.equal(out.errors.distance, 'not-a-number');
});

// --- Unit-switch reinterpretation (SPEC section 3, core level) --------------

test('switching a unit reinterprets the same typed number', () => {
  const km = run({ distance: '100', distanceUnit: 'km', consumption: '10' });
  const mi = run({ distance: '100', distanceUnit: 'mi', consumption: '10' });
  assert.equal(km.results.display.fuel, '10.00 L');
  assert.equal(mi.results.display.fuel, '16.09 L'); // 160.9344 km * 10 / 100
});

test('price per US gallon vs per litre: same typed number, different total', () => {
  const perLitre = run({ price: '3.60', priceUnit: 'litre' });
  const perGallon = run({ price: '3.60', priceUnit: 'gal-us' });
  assert.equal(perLitre.results.display.total, '$58.50'); // 16.25 * 3.60
  assert.equal(perGallon.results.display.total, '$15.45'); // 16.25 * 3.60 / 3.785411784 = 15.4523...
});

// --- Display rounding (the only rounding point) ------------------------------

test('formatTwoDp rounds half-up exactly, including float-hostile cases', () => {
  assert.equal(formatTwoDp(frac(1n, 8n)), '0.13'); // 0.125 -> 0.13
  assert.equal(formatTwoDp(frac(2675n, 1000n)), '2.68'); // 2.675; a double gives 2.67
  assert.equal(formatTwoDp(frac(5n, 2n)), '2.50');
  assert.equal(formatTwoDp(frac(73125n, 10000n)), '7.31'); // 7.3125 -> 7.31
  assert.equal(formatTwoDp(frac(0n)), '0.00');
});
