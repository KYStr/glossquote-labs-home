import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScaledDecimal, decimalRules, formatMinor, formatQuantity } from '../public/js/core/decimal.mjs';
const parse = (kind, text) => parseScaledDecimal(text, { ...decimalRules[kind], field: kind });

test('A01–A04: fixed exact decimal constants and format', () => {
  assert.equal(parse('quantity', '2.5').scaled, 2500n);
  assert.equal(parse('unitPrice', '19.99').scaled, 1999n);
  assert.equal(parse('quantity', '0.001').scaled, 1n);
  assert.equal(parse('quantity', '1000000').scaled, 1000000000n);
  assert.equal(parse('unitPrice', '1000000000.00').scaled, 100000000000n);
  assert.equal(parse('unitPrice', '0').scaled, 0n);
  assert.equal(formatMinor(4998n), '49.98');
  assert.equal(formatMinor(1n), '0.01');
  assert.equal(formatQuantity(2500n), '2.5');
  assert.equal(formatQuantity(1000n), '1');
});
test('A07: quantity range', () => {
  for (const value of ['0', '0.000', '1000000.001']) assert.equal(parse('quantity', value).code, 'DECIMAL_RANGE');
});
test('A08: reject loose formats and precision with stable codes', () => {
  assert.equal(parse('quantity', '1.0000').code, 'DECIMAL_PRECISION');
  for (const value of ['1e3', ' 1', '1 ', '+1', '-1', '1,000', '', '.5', '1.', 'NaN', 'Infinity', '１', '1\n']) assert.equal(parse('quantity', value).code, 'DECIMAL_FORMAT', value);
  for (const value of [1, null, {}, true]) assert.equal(parse('quantity', value).code, 'DECIMAL_TYPE');
});
test('A09/A11: price and rate upper boundaries', () => {
  assert.equal(parse('unitPrice', '1000000000.01').code, 'DECIMAL_RANGE');
  assert.equal(parse('unitPrice', '1.001').code, 'DECIMAL_PRECISION');
  assert.equal(parse('taxRate', '0').scaled, 0n);
  assert.equal(parse('taxRate', '100.00').scaled, 10000n);
  assert.equal(parse('taxRate', '100.01').code, 'DECIMAL_RANGE');
  assert.equal(parse('taxRate', '1.001').code, 'DECIMAL_PRECISION');
});
test('padded decimals remain exact; huge significant integers reject before BigInt', () => {
  assert.equal(parse('quantity', `${'0'.repeat(524288)}1`).scaled, 1000n);
  assert.equal(parse('quantity', '9'.repeat(20000)).code, 'DECIMAL_RANGE');
  assert.equal(formatMinor(5000000000000000000n), '50000000000000000.00');
});
