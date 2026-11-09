// Fixture and computation-rule tests. Every expected value is taken from
// docs/specs/paint-coverage-calculator/SPEC.md section 4 (fixtures P1–P5,
// re-derived by hand) or constructed by hand from section 4's rules —
// never from the implementation's own output.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { frac } from '../public/js/core/fractions.mjs';
import {
  computePaint,
  purchaseForLitres,
  display2,
  displayCans,
} from '../public/js/core/paint-core.mjs';

const H = (x) => BigInt(Math.round(x * 100)); // metres etc. -> hundredths

function inputs(overrides = {}) {
  return {
    lengthH: H(4),
    widthH: H(5),
    heightH: H(2.8),
    doors: 1,
    windows: 2,
    customH: H(0),
    ceiling: false,
    coats: 2,
    coverageH: H(10),
    canSizeH: H(5),
    ...overrides,
  };
}

function assertFrac(actual, n, d, label) {
  assert.equal(actual.n, BigInt(n), `${label} numerator`);
  assert.equal(actual.d, BigInt(d), `${label} denominator`);
}

test('P1: default room, ceiling off (SPEC fixture)', () => {
  const r = computePaint(inputs());
  assert.equal(r.ok, true);
  assert.equal(display2(r.gross), '50.40');
  assert.equal(display2(r.deductions), '5.49');
  assert.equal(display2(r.paintable), '44.91');
  assertFrac(r.litres, 4491, 500, 'P1 litres'); // exactly 8.982 L
  assert.equal(display2(r.litres), '8.98');
  assert.equal(displayCans(r.cans), '2');
  assert.equal(display2(r.purchased), '10.00');
  assertFrac(r.leftover, 509, 500, 'P1 leftover'); // exactly 1.018 L
  assert.equal(display2(r.leftover), '1.02');
});

test('P2: P1 with ceiling on adds L x W (SPEC fixture)', () => {
  const r = computePaint(inputs({ ceiling: true }));
  assert.equal(r.ok, true);
  assert.equal(display2(r.ceilingArea), '20.00');
  assert.equal(display2(r.paintable), '64.91');
  assertFrac(r.litres, 6491, 500, 'P2 litres'); // exactly 12.982 L
  assert.equal(display2(r.litres), '12.98');
  assert.equal(displayCans(r.cans), '3');
  assert.equal(display2(r.purchased), '15.00');
  assert.equal(display2(r.leftover), '2.02'); // exact 2.018
});

test('P3: exactly divisible litres buy no phantom can (SPEC fixture)', () => {
  const r = computePaint(
    inputs({
      lengthH: H(3),
      widthH: H(3),
      heightH: H(2.5),
      doors: 0,
      windows: 0,
      coats: 1,
      canSizeH: H(1),
    }),
  );
  assert.equal(r.ok, true);
  assert.equal(display2(r.paintable), '30.00');
  assertFrac(r.litres, 3, 1, 'P3 litres'); // exactly 3.00 L
  assert.equal(display2(r.litres), '3.00');
  assert.equal(displayCans(r.cans), '3');
  assert.equal(display2(r.purchased), '3.00');
  assert.equal(display2(r.leftover), '0.00');
});

test('P4: deductions equal to gross walls is the computation error (SPEC fixture)', () => {
  const r = computePaint(
    inputs({
      lengthH: H(2),
      widthH: H(2),
      heightH: H(2.5),
      doors: 0,
      windows: 0,
      customH: H(20), // gross wall area is exactly 20.00 m²
    }),
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'openings-exceed-walls');
  assert.equal(display2(r.gross), '20.00');
  assert.equal(display2(r.deductions), '20.00');
});

test('P4 variant: an enabled ceiling does not rescue the comparison', () => {
  const r = computePaint(
    inputs({
      lengthH: H(2),
      widthH: H(2),
      heightH: H(2.5),
      doors: 0,
      windows: 0,
      customH: H(20),
      ceiling: true,
    }),
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'openings-exceed-walls');
});

test('error rule: deductions above gross also error', () => {
  const r = computePaint(
    inputs({ lengthH: H(2), widthH: H(2), heightH: H(2.5), doors: 0, windows: 0, customH: H(25) }),
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'openings-exceed-walls');
});

test('error rule: deductions one cent of a square metre below gross stay valid', () => {
  const r = computePaint(
    inputs({
      lengthH: H(2),
      widthH: H(2),
      heightH: H(2.5),
      doors: 0,
      windows: 0,
      customH: H(19.99),
      coats: 1,
      canSizeH: H(0.5),
    }),
  );
  assert.equal(r.ok, true);
  assert.equal(display2(r.paintable), '0.01');
  assertFrac(r.litres, 1, 1000, 'tiny litres'); // 0.01 m² x 1 coat / 10 m²/L
  assert.equal(displayCans(r.cans), '1'); // any positive need buys a whole can
  assert.equal(display2(r.purchased), '0.50');
  assert.equal(display2(r.leftover), '0.50'); // 0.5 L can - 0.001 L = 0.499 -> 0.50
});

test('P5: small one-coat room (SPEC fixture)', () => {
  const r = computePaint(
    inputs({
      lengthH: H(2.5),
      widthH: H(3),
      heightH: H(2.4),
      doors: 0,
      windows: 1,
      coats: 1,
      coverageH: H(12),
      canSizeH: H(2.5),
    }),
  );
  assert.equal(r.ok, true);
  assert.equal(display2(r.gross), '26.40');
  assert.equal(display2(r.paintable), '24.60');
  assertFrac(r.litres, 41, 20, 'P5 litres'); // exactly 2.05 L
  assert.equal(display2(r.litres), '2.05');
  assert.equal(displayCans(r.cans), '1');
  assert.equal(display2(r.purchased), '2.50');
  assert.equal(display2(r.leftover), '0.45');
});

test('ceiling rule at core level: one microlitre over a multiple buys one more can', () => {
  const over = purchaseForLitres(frac(3001, 1000), 100n); // 3.001 L, 1 L cans
  assert.equal(over.cans, 4n);
  assert.equal(display2(over.purchased), '4.00');
  assert.equal(display2(over.leftover), '1.00'); // 4 - 3.001 = 0.999 -> 1.00

  const exact = purchaseForLitres(frac(3, 1), 100n); // exactly 3.000 L
  assert.equal(exact.cans, 3n);
  assert.equal(display2(exact.leftover), '0.00');

  const zero = purchaseForLitres(frac(0), 500n);
  assert.equal(zero.cans, 0n);
});

test('leftover is derived from exact litres, not from displayed litres', () => {
  // Hand-derived: 10 x 10 m room, H 2.5 -> gross 100.00; custom openings
  // 10.15 -> paintable 89.85; 1 coat at coverage 10 -> litres exactly
  // 8.985, displayed 8.99. Purchased 10.00 - displayed 8.99 = 1.01, but the
  // exact leftover is 1.015, displayed half-up as 1.02. SPEC s.4 requires 1.02.
  const r = computePaint(
    inputs({
      lengthH: H(10),
      widthH: H(10),
      heightH: H(2.5),
      doors: 0,
      windows: 0,
      customH: H(10.15),
      coats: 1,
    }),
  );
  assert.equal(r.ok, true);
  assertFrac(r.litres, 1797, 200, 'exact litres'); // 8.985
  assert.equal(display2(r.litres), '8.99');
  assert.equal(displayCans(r.cans), '2');
  assertFrac(r.leftover, 203, 200, 'exact leftover'); // 1.015
  assert.equal(display2(r.leftover), '1.02');
});

test('standard opening sizes: one door 1.89, one window 1.80 (SPEC s.4)', () => {
  const r = computePaint(inputs({ doors: 1, windows: 1, customH: H(0) }));
  assert.equal(display2(r.deductions), '3.69'); // 1.89 + 1.80
});
