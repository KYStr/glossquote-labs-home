// Validation boundaries for solve(): size, shape, type, range, duplicate,
// fixed error paths. Expected values are hand-derived from SPEC inputsOutputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, validate } from '../public/js/core/solve.mjs';

const ok = (targetMinor, denominations) => ({ targetMinor, denominations });

function expectError(input, code, path) {
  const reply = solve(input);
  assert.deepStrictEqual(reply, { status: 'error', error: { code, path } });
}

test('SIZE: JSON over 65536 UTF-8 bytes is rejected at the root', () => {
  const big = { ...ok(10, [{ valueMinor: 5, count: 1 }]), extra: 'x'.repeat(70000) };
  expectError(big, 'SIZE', '');
  // Just under the limit passes the size gate (then fails on the unknown key).
  const near = { ...ok(10, [{ valueMinor: 5, count: 1 }]), extra: 'x'.repeat(60000) };
  const reply = solve(near);
  assert.equal(reply.status, 'error');
  assert.notEqual(reply.error.code, 'SIZE');
});

test('root must be a plain object', () => {
  for (const bad of [null, [], 'x', 42, true]) {
    assert.deepStrictEqual(solve(bad), {
      status: 'error', error: { code: 'TYPE', path: '' },
    });
  }
});

test('SHAPE: unknown key points at the unknown key; missing key at the known key', () => {
  expectError({ ...ok(10, [{ valueMinor: 5, count: 1 }]), nope: 1 }, 'SHAPE', '/nope');
  expectError({ denominations: [{ valueMinor: 5, count: 1 }] }, 'SHAPE', '/targetMinor');
  expectError({ targetMinor: 10 }, 'SHAPE', '/denominations');
  expectError(
    { targetMinor: 10, denominations: [{ valueMinor: 5 }] },
    'SHAPE', '/denominations/0/count',
  );
  expectError(
    { targetMinor: 10, denominations: [{ valueMinor: 5, count: 1, x: 2 }] },
    'SHAPE', '/denominations/0/x',
  );
});

test('TYPE: string numbers, floats, -0, NaN, booleans and null are rejected', () => {
  expectError(ok('10', [{ valueMinor: 5, count: 1 }]), 'TYPE', '/targetMinor');
  expectError(ok(10.5, [{ valueMinor: 5, count: 1 }]), 'TYPE', '/targetMinor');
  expectError(ok(-0, [{ valueMinor: 5, count: 1 }]), 'TYPE', '/targetMinor');
  expectError(ok(Number.NaN, [{ valueMinor: 5, count: 1 }]), 'TYPE', '/targetMinor');
  expectError(ok(true, [{ valueMinor: 5, count: 1 }]), 'TYPE', '/targetMinor');
  expectError(ok(10, [{ valueMinor: '5', count: 1 }]), 'TYPE', '/denominations/0/valueMinor');
  expectError(ok(10, [{ valueMinor: 5, count: 1.5 }]), 'TYPE', '/denominations/0/count');
  expectError(ok(10, 'nope'), 'TYPE', '/denominations');
  expectError(ok(10, [null]), 'TYPE', '/denominations/0');
  expectError(ok(10, [5]), 'TYPE', '/denominations/0');
});

test('RANGE: bounds are inclusive at both ends', () => {
  // targetMinor I[0,10000]
  assert.equal(solve(ok(0, [{ valueMinor: 1, count: 0 }])).status, 'ok');
  assert.equal(solve(ok(10000, [{ valueMinor: 1, count: 0 }])).status, 'ok');
  expectError(ok(-1, [{ valueMinor: 5, count: 1 }]), 'RANGE', '/targetMinor');
  expectError(ok(10001, [{ valueMinor: 5, count: 1 }]), 'RANGE', '/targetMinor');
  // valueMinor I[1,10000]
  expectError(ok(10, [{ valueMinor: 0, count: 1 }]), 'RANGE', '/denominations/0/valueMinor');
  expectError(ok(10, [{ valueMinor: 10001, count: 1 }]), 'RANGE', '/denominations/0/valueMinor');
  assert.equal(solve(ok(10, [{ valueMinor: 10000, count: 0 }])).status, 'ok');
  // count I[0,99]
  expectError(ok(10, [{ valueMinor: 5, count: -1 }]), 'RANGE', '/denominations/0/count');
  expectError(ok(10, [{ valueMinor: 5, count: 100 }]), 'RANGE', '/denominations/0/count');
  assert.equal(solve(ok(10, [{ valueMinor: 5, count: 99 }])).status, 'ok');
  // denominations length 1..8
  expectError(ok(10, []), 'RANGE', '/denominations');
  const nine = Array.from({ length: 9 }, (_, i) => ({ valueMinor: i + 1, count: 1 }));
  expectError(ok(10, nine), 'RANGE', '/denominations');
  const eight = Array.from({ length: 8 }, (_, i) => ({ valueMinor: i + 1, count: 1 }));
  assert.equal(solve(ok(10, eight)).status, 'ok');
});

test('DUPLICATE: second occurrence is named, first occurrence is not blamed', () => {
  expectError(
    ok(10, [
      { valueMinor: 5, count: 1 },
      { valueMinor: 7, count: 1 },
      { valueMinor: 5, count: 2 },
    ]),
    'DUPLICATE', '/denominations/2/valueMinor',
  );
});

test('validation order: size before shape, shape before fields, fields before duplicates', () => {
  // Unknown key + bad target: SHAPE wins over RANGE.
  expectError({ targetMinor: 99999, denominations: [], z: 1 }, 'SHAPE', '/z');
  // Bad target + duplicate rows: RANGE wins over DUPLICATE.
  expectError(
    ok(10001, [
      { valueMinor: 5, count: 1 },
      { valueMinor: 5, count: 1 },
    ]),
    'RANGE', '/targetMinor',
  );
  // Bad row field + duplicate: the field error wins (cross-field runs last).
  expectError(
    ok(10, [
      { valueMinor: 5, count: 1 },
      { valueMinor: 5, count: 200 },
    ]),
    'RANGE', '/denominations/1/count',
  );
});

test('validate() agrees with solve() on valid and invalid inputs', () => {
  assert.equal(validate(ok(10, [{ valueMinor: 5, count: 1 }])), null);
  assert.deepStrictEqual(
    validate(ok(10, [{ valueMinor: 5, count: 1 }, { valueMinor: 5, count: 1 }])),
    { status: 'error', error: { code: 'DUPLICATE', path: '/denominations/1/valueMinor' } },
  );
});
