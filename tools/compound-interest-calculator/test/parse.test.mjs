// Parser tests. Expectations are derived from SPEC section 2/3 bounds and
// section 7(f): amounts refuse >2 decimals, rates accept 3 and refuse 4,
// caps enforced, term 1..600.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAmountToCents,
  parseRateToThousandths,
  parseTermMonths,
  formatCents,
} from '../public/js/core/money.mjs';

test('amount: plain integers and decimals parse to exact cents', () => {
  assert.deepEqual(parseAmountToCents('10000'), { ok: true, cents: 1000000n });
  assert.deepEqual(parseAmountToCents('0'), { ok: true, cents: 0n });
  assert.deepEqual(parseAmountToCents('0.01'), { ok: true, cents: 1n });
  assert.deepEqual(parseAmountToCents('12.3'), { ok: true, cents: 1230n });
  assert.deepEqual(parseAmountToCents('12.30'), { ok: true, cents: 1230n });
  assert.deepEqual(parseAmountToCents(' 100 '), { ok: true, cents: 10000n });
});

test('amount: the cap is accepted and one cent over is refused', () => {
  assert.deepEqual(parseAmountToCents('999999999.99'), { ok: true, cents: 99999999999n });
  assert.equal(parseAmountToCents('1000000000.00').error, 'over-cap');
  assert.equal(parseAmountToCents('9999999999.99').error, 'over-cap');
});

test('amount: more than 2 decimals is a parse error', () => {
  assert.equal(parseAmountToCents('1.234').error, 'too-many-decimals');
  assert.equal(parseAmountToCents('0.001').error, 'too-many-decimals');
});

test('amount: negative, empty and non-numeric inputs are refused distinctly', () => {
  assert.equal(parseAmountToCents('-5').error, 'negative');
  assert.equal(parseAmountToCents('').error, 'required');
  assert.equal(parseAmountToCents('   ').error, 'required');
  assert.equal(parseAmountToCents('abc').error, 'invalid');
  assert.equal(parseAmountToCents('1,000').error, 'invalid');
  assert.equal(parseAmountToCents('1e3').error, 'invalid');
  assert.equal(parseAmountToCents('12.').error, 'invalid');
  assert.equal(parseAmountToCents('.5').error, 'invalid');
  assert.equal(parseAmountToCents('1.2.3').error, 'invalid');
});

test('rate: up to 3 decimals accepted, stored as thousandths of a percent', () => {
  assert.deepEqual(parseRateToThousandths('12'), { ok: true, thousandths: 12000 });
  assert.deepEqual(parseRateToThousandths('0'), { ok: true, thousandths: 0 });
  assert.deepEqual(parseRateToThousandths('12.345'), { ok: true, thousandths: 12345 });
  assert.deepEqual(parseRateToThousandths('0.001'), { ok: true, thousandths: 1 });
  assert.deepEqual(parseRateToThousandths('100'), { ok: true, thousandths: 100000 });
  assert.deepEqual(parseRateToThousandths('100.000'), { ok: true, thousandths: 100000 });
});

test('rate: 4 decimals, over 100, negative and junk are refused', () => {
  assert.equal(parseRateToThousandths('12.3456').error, 'too-many-decimals');
  assert.equal(parseRateToThousandths('100.001').error, 'over-max');
  assert.equal(parseRateToThousandths('101').error, 'over-max');
  assert.equal(parseRateToThousandths('-1').error, 'negative');
  assert.equal(parseRateToThousandths('').error, 'required');
  assert.equal(parseRateToThousandths('x%').error, 'invalid');
});

test('term: whole months 1..600 only', () => {
  assert.deepEqual(parseTermMonths('1'), { ok: true, months: 1 });
  assert.deepEqual(parseTermMonths('600'), { ok: true, months: 600 });
  assert.equal(parseTermMonths('0').error, 'out-of-range');
  assert.equal(parseTermMonths('601').error, 'out-of-range');
  assert.equal(parseTermMonths('12.5').error, 'invalid');
  assert.equal(parseTermMonths('-3').error, 'invalid');
  assert.equal(parseTermMonths('').error, 'required');
});

test('formatCents: grouping on for display, off for plain, always 2 decimals', () => {
  assert.equal(formatCents(1253649n), '12,536.49');
  assert.equal(formatCents(1253649n, false), '12536.49');
  assert.equal(formatCents(0n), '0.00');
  assert.equal(formatCents(5n), '0.05');
  assert.equal(formatCents(99999999999n), '999,999,999.99');
});
