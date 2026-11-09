import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, formatAmount } from '../public/js/core/money.mjs';
function error(fn, code) { assert.throws(fn, e => e.code === code && !e.message.includes('FAKE_NAME')); }
test('S06 ASCII decimals and leading zeroes convert exactly', () => {
  assert.equal(parseAmount('0001.2', 2), 120n); assert.equal(parseAmount(' 1.20 ', 2), 120n);
  assert.equal(formatAmount(120n, 2, 'en'), '1.20'); assert.equal(parseAmount('00012', 0), 12n);
  assert.equal(formatAmount(9999999999n, 2, 'zh-Hant'), '99,999,999.99'); assert.equal(formatAmount(-1n, 2, 'en'), '-0.01');
});
test('S07 rejects every malformed amount without rounding', () => {
  error(() => parseAmount('0', 2), 'AMOUNT_ZERO');
  for (const raw of ['-1', '+1', '1e2', '1,000', '.5', '1.', 'NaN', 'Infinity', '1.001', '$1', '１', '', '  ']) error(() => parseAmount(raw, 2), 'AMOUNT_FORMAT');
  error(() => parseAmount('1.25', 0), 'AMOUNT_FORMAT');
});
test('S08 precision-specific maxima, empty paid, 32-unit cap and types', () => {
  assert.equal(parseAmount('99999999', 0), 99999999n); assert.equal(parseAmount('99999999.99', 2), 9999999999n);
  error(() => parseAmount('100000000', 0), 'AMOUNT_MAX'); error(() => parseAmount('100000000.00', 2), 'AMOUNT_MAX');
  assert.equal(parseAmount('', 2, { emptyAsZero: true }), 0n); assert.equal(parseAmount('0.00', 2, { allowZero: true }), 0n);
  assert.equal(parseAmount('0'.repeat(31) + '1', 0), 1n); error(() => parseAmount('0'.repeat(32) + '1', 0), 'AMOUNT_LENGTH');
  error(() => parseAmount(1, 2), 'INPUT_SCHEMA'); error(() => parseAmount('1', 1), 'PRECISION');
  error(() => formatAmount(1, 2), 'INPUT_SCHEMA'); error(() => formatAmount(1n, 2, 'xx'), 'LOCALE');
});
