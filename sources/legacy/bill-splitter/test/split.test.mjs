import test from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount, settle, calculateBill, validateName } from '../public/js/core/split.mjs';
export function draft(total = '100.00', weights = ['1', '1', '1'], paid = null) {
  return { total, precision: 2, mode: 'equal', settlement: paid !== null, people: weights.map((weight, i) => ({ id: i + 1, name: `Fake ${i + 1}`, weight, paid: paid?.[i] ?? '' })) };
}
function error(fn, code, fieldId) { assert.throws(fn, e => e.code === code && (!fieldId || e.fieldId === fieldId)); }
test('S01–S05 exact allocation including ties and zero weight', () => {
  assert.deepEqual(splitAmount(10000n, [1, 1, 1]), [3334n, 3333n, 3333n]);
  assert.deepEqual(splitAmount(1n, [1, 1, 1]), [1n, 0n, 0n]);
  assert.deepEqual(splitAmount(100n, [1, 1, 1]), [34n, 33n, 33n]);
  assert.deepEqual(splitAmount(10001n, [1, 2, 0]), [3334n, 6667n, 0n]);
  assert.deepEqual(splitAmount(1000n, [1, 1, 1, 1]), [250n, 250n, 250n, 250n]);
});
test('S09 count limits; S10 identities and hostile names remain data', () => {
  for (const length of [2, 50]) assert.equal(calculateBill(draft('1', Array(length).fill('1'))).people.length, length);
  for (const length of [1, 51]) error(() => calculateBill(draft('1', Array(length).fill('1'))), 'PEOPLE_COUNT');
  const d = draft(); d.people[0].name = '__proto__'; d.people[1].name = '<img src=x onerror=alert(1)>'; d.people[2].name = '__proto__';
  const r = calculateBill(d); assert.equal(r.people[0].name, '__proto__'); assert.equal(r.people[2].id, 3); assert.equal(r.people[1].name, d.people[1].name);
  d.people[1].id = 1; error(() => calculateBill(d), 'PERSON_ID');
});
test('S11 names: Unicode points, separator-before-trim, lone surrogate', () => {
  for (const raw of ['', '  ']) error(() => validateName(raw), 'NAME_EMPTY');
  assert.equal(validateName('😀'.repeat(40)), '😀'.repeat(40)); error(() => validateName('😀'.repeat(41)), 'NAME_LENGTH');
  for (const raw of ['\nName', 'Name\t', '\u0085Name', 'Name\u2028', '\u2029Name', 'Name\x7f', 'N\x00']) error(() => validateName(raw), 'NAME_CONTROL');
  for (const raw of ['\ud800', '\udc00', '\ud800A', 'A\udc00']) error(() => validateName(raw), 'NAME_UNICODE');
  assert.equal(validateName(' Name '), 'Name'); error(() => validateName(null), 'INPUT_SCHEMA');
});
test('S12 weight grammar, zero totals, valid 0 and 1000', () => {
  const d = draft('1', ['0', '0']); d.mode = 'shares'; error(() => calculateBill(d), 'WEIGHTS_ZERO');
  for (const raw of ['-1', '1.5', '1e2', '', ' ', '+1']) { d.people[0].weight = raw; error(() => calculateBill(d), 'WEIGHT_FORMAT', 'weight-1'); }
  d.people[0].weight = '1001'; error(() => calculateBill(d), 'WEIGHT_RANGE');
  d.people[0].weight = '1000'; assert.deepEqual(calculateBill(d).people.map(p => p.share), [100n, 0n]);
  for (const weights of [[1, 1.5], [1, -1], [1, 1001], [1, NaN]]) error(() => splitAmount(1n, weights), 'WEIGHT_RANGE');
  error(() => splitAmount(0n, [1, 1]), 'TOTAL_INVALID'); error(() => splitAmount(1, [1, 1]), 'TOTAL_INVALID');
});
test('S13–S17 deterministic settlements, mismatch rejection, zero-share payer', () => {
  assert.deepEqual(calculateBill(draft('100.00', ['1', '1', '1'], ['100', '', ''])).transfers, [{ fromIndex: 1, toIndex: 0, amount: 3333n }, { fromIndex: 2, toIndex: 0, amount: 3333n }]);
  assert.deepEqual(calculateBill(draft('100', Array(4).fill('1'), ['', '60', '', '40'])).transfers, [{ fromIndex: 0, toIndex: 1, amount: 2500n }, { fromIndex: 2, toIndex: 1, amount: 1000n }, { fromIndex: 2, toIndex: 3, amount: 1500n }]);
  assert.deepEqual(calculateBill(draft('60', ['1', '1', '1'], ['20', '20', '20'])).transfers, []);
  for (const [raw, code] of [['99.99', 'PAID_SHORT'], ['100.01', 'PAID_EXCESS']]) assert.throws(() => calculateBill(draft('100', ['1', '1'], [raw, ''])), e => e.code === code && e.details.amount === 1n);
  const d = draft('30', ['0', '1', '2'], ['30', '', '']); d.mode = 'shares';
  assert.deepEqual(calculateBill(d).people.map(p => p.share), [0n, 1000n, 2000n]);
  assert.deepEqual(calculateBill(d).transfers, [{ fromIndex: 1, toIndex: 0, amount: 1000n }, { fromIndex: 2, toIndex: 0, amount: 2000n }]);
  error(() => settle([1n, 1n], [2n]), 'INPUT_SCHEMA'); error(() => settle([1n, -1n], [0n, 0n]), 'INPUT_SCHEMA');
});
test('S18 hidden paid is never read/validated; exact draft schema; error fields do not contain raw values', () => {
  const d = draft(); Object.defineProperty(d.people[0], 'paid', { enumerable: true, get() { throw new Error('HIDDEN_READ'); } });
  assert.equal(calculateBill(d).settlement, false);
  error(() => calculateBill({ ...draft(), unknown: true }), 'INPUT_SCHEMA');
  const invalid = draft(); invalid.people[1].paid = 'bad'; invalid.settlement = true;
  error(() => calculateBill(invalid), 'AMOUNT_FORMAT', 'paid-2');
  error(() => calculateBill({ ...draft(), mode: 'other' }), 'MODE'); error(() => calculateBill({ ...draft(), settlement: 'true' }), 'INPUT_SCHEMA');
});
test('400 independent invariants: quota error, zero weight, stable ties, settlement conservation, no mutation', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const count = 2 + seed % 49, total = BigInt(seed) * 9876543n % 9999999999n + 1n;
    const weights = Array.from({ length: count }, (_, i) => (seed * (i + 3) * 17 + i * i) % 1001); weights[0] = 1;
    const frozenWeights = [...weights];
    const shares = splitAmount(total, weights), W = weights.reduce((a, b) => a + BigInt(b), 0n);
    assert.equal(shares.reduce((a, b) => a + b, 0n), total); assert.deepEqual(splitAmount(total, weights), shares); assert.deepEqual(weights, frozenWeights);
    shares.forEach((share, i) => { assert.ok(share >= 0n); if (weights[i] === 0) assert.equal(share, 0n); const delta = share * W - total * BigInt(weights[i]); assert.ok(delta > -W && delta < W); });
    const paid = Array(count).fill(0n); paid[seed % count] = total;
    const originalShares = [...shares], originalPaid = [...paid];
    const r = settle(shares, paid); assert.deepEqual(settle(shares, paid), r); assert.ok(r.transfers.length <= count - 1);
    shares.forEach((share, i) => {
      const incoming = r.transfers.filter(t => t.toIndex === i).reduce((a, t) => a + t.amount, 0n);
      const outgoing = r.transfers.filter(t => t.fromIndex === i).reduce((a, t) => a + t.amount, 0n);
      assert.equal(paid[i] - share + outgoing - incoming, 0n);
    });
    for (const t of r.transfers) { assert.ok(t.amount > 0n); assert.notEqual(t.fromIndex, t.toIndex); }
    assert.deepEqual(shares, originalShares); assert.deepEqual(paid, originalPaid);
  }
  const d = draft(); const snapshot = structuredClone(d); calculateBill(d); assert.deepEqual(d, snapshot);
});
