import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { calculateRestockPlan } from '../public/js/core/calculate.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/base.json', import.meta.url), 'utf8'));
const vectors = JSON.parse(readFileSync(new URL('./fixtures/vectors.json', import.meta.url), 'utf8'));
const base = () => structuredClone(fixture.input);
const expectedError = (code, field) => ({ ok: false, error: { code, field } });
function frozen(value) { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; }
function snapshot(value) {
  if (!value || typeof value !== 'object') return value;
  return Reflect.ownKeys(value).map(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return [key, Object.hasOwn(descriptor, 'value') ? snapshot(descriptor.value) : descriptor.get, descriptor.enumerable, descriptor.writable, descriptor.configurable];
  });
}
function verified(input) {
  frozen(input);
  const before = snapshot(input);
  const result = calculateRestockPlan(input);
  assert.deepEqual(snapshot(input), before);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  return result;
}
const vectorOf = row => [row.targetNumeratorUnitDays, row.stockNumeratorUnitDays, row.needNumeratorUnitDays, row.packDenominatorUnitDays, row.packsToOrder, row.orderUnits, row.shortageNumeratorUnitDays, row.shortageBeforeArrivalUnits, row.runwayWholeDays, row.averageDailyUse.roundedTo3];
function invariants(result) {
  const D = BigInt(result.assumptions.observationDays);
  for (const row of result.items) {
    const target = BigInt(row.targetNumeratorUnitDays), stock = BigInt(row.stockNumeratorUnitDays), need = BigInt(row.needNumeratorUnitDays);
    assert.equal(need, target > stock ? target - stock : 0n);
    const packs = BigInt(row.packsToOrder), pack = BigInt(row.packSizeUnits);
    assert.ok(packs * D * pack >= need);
    if (packs > 0n) assert.ok((packs - 1n) * D * pack < need);
    const short = BigInt(row.shortageNumeratorUnitDays);
    assert.equal(BigInt(row.shortageBeforeArrivalUnits), short / D + (short % D > 0n ? 1n : 0n));
    assert.equal(row.runwayWholeDays, row.observedUseUnits === 0 ? null : Number(stock / BigInt(row.observedUseUnits)));
  }
}
test('C01 exact full result, pure input, JSON roundtrip and fresh allocation', () => {
  const output = verified(base());
  assert.deepEqual(output, fixture.outcome);
  invariants(output.result);
  const another = calculateRestockPlan(base());
  assert.notEqual(output.result.items[0], another.result.items[0]);
});
for (const [id, days, row, expected] of vectors) test(`${id} handwritten integer and rounding oracle`, () => {
  const input = base(); Object.assign(input, days); Object.assign(input.items[0], row);
  const output = verified(input);
  assert.equal(output.ok, true);
  assert.deepEqual(vectorOf(output.result.items[0]), expected);
  invariants(output.result);
});
test('C25 preserves all 30 distinct rows and ordering', () => {
  const input = base(); input.items = Array.from({ length: 30 }, (_, i) => ({ ...input.items[0], id: `item-${i + 1}`, nameRaw: `品項 ${i + 1}` }));
  const output = verified(input);
  assert.equal(output.result.items.length, 30);
  output.result.items.forEach((row, i) => {
    assert.equal(row.id, `item-${i + 1}`); assert.equal(row.name, `品項 ${i + 1}`);
    assert.deepEqual(vectorOf(row), [1200,300,900,360,3,36,0,0,10,'1.000']);
  });
});
test('C26 length bound runs before ownKeys, row access or getter', () => {
  const input = base(); input.items = new Array(31); let calls = 0;
  Object.defineProperty(input.items, '0', { enumerable: true, get() { calls++; return {}; } });
  const ownKeys = Reflect.ownKeys;
  Reflect.ownKeys = value => { if (value === input.items) throw new Error('Array enumerated before length gate'); return ownKeys(value); };
  try { assert.deepEqual(calculateRestockPlan(input), expectedError('ITEM_LIMIT', 'items')); } finally { Reflect.ownKeys = ownKeys; }
  assert.equal(calls, 0);
});
const errors = [
  ['C27', input => { input.items = []; }, 'ITEM_COUNT', 'items'],
  ['C28', input => { input.items = new Array(1); }, 'ITEM_HOLE', 'items[0]'],
  ['C31', input => { input[Symbol('unknown')] = 1; }, 'INPUT_UNKNOWN_FIELD', 'input'],
  ['C32', input => { input.items.push({ ...input.items[0] }); }, 'ROW_ID_DUPLICATE', 'items[1].id'],
  ['C33', input => { input.items[0].usedRaw = '1e2'; }, 'QUANTITY_FORMAT', 'items[0].usedRaw'],
  ['C34', input => { input.items[0].usedRaw = '+1'; }, 'QUANTITY_FORMAT', 'items[0].usedRaw'],
  ['C35', input => { input.items[0].usedRaw = '1000001'; }, 'QUANTITY_RANGE', 'items[0].usedRaw'],
  ['C36', input => { input.observationDaysRaw = ' 30'; }, 'DAY_FORMAT', 'observationDaysRaw'],
  ['C37', input => { input.items[0].nameRaw = '😀'.repeat(81); }, 'NAME_CODEPOINT_LIMIT', 'items[0].nameRaw'],
  ['C38', input => { input.items[0].unitRaw = 'm\u2028l'; }, 'UNIT_LINE_SEPARATOR', 'items[0].unitRaw'],
  ['C39', input => { input.items[0].nameRaw = '\ud800'; }, 'NAME_SURROGATE', 'items[0].nameRaw'],
  ['C40', input => { input.items[0].extra = 1; }, 'ROW_UNKNOWN_FIELD', 'items[0]'],
  ['C41', input => { delete input.items[0].stockRaw; }, 'ROW_MISSING_FIELD', 'items[0].stockRaw'],
];
for (const [id, change, code, field] of errors) test(`${id} first error only`, () => { const input = base(); change(input); assert.deepEqual(verified(input), expectedError(code, field)); });
for (const [id, root, key, code, field] of [['C29', true, 'observationDaysRaw', 'INPUT_PROPERTY', 'observationDaysRaw'], ['C30', false, 'usedRaw', 'ROW_PROPERTY', 'items[0].usedRaw']]) test(`${id} accessor is rejected without execution`, () => {
  const input = base(); let calls = 0;
  Object.defineProperty(root ? input : input.items[0], key, { enumerable: true, get() { calls++; return '30'; } });
  assert.deepEqual(calculateRestockPlan(input), expectedError(code, field)); assert.equal(calls, 0);
});
test('root shapes, same-realm requirement, missing/unknown/property priority', () => {
  for (const value of [null, undefined, 1, [], Object.create(null), new Date(), vm.runInNewContext('({})')]) assert.deepEqual(calculateRestockPlan(value), expectedError('INPUT_OBJECT', 'input'));
  let input = base(); delete input.observationDaysRaw; input.extra = 1;
  assert.deepEqual(calculateRestockPlan(input), expectedError('INPUT_UNKNOWN_FIELD', 'input'));
  delete input.extra; delete input.leadDaysRaw;
  assert.deepEqual(calculateRestockPlan(input), expectedError('INPUT_MISSING_FIELD', 'observationDaysRaw'));
  input = base(); Object.defineProperty(input, 'coverageDaysRaw', { enumerable: false }); input.observationDaysRaw = 'bad';
  assert.deepEqual(calculateRestockPlan(input), expectedError('INPUT_PROPERTY', 'coverageDaysRaw'));
});
test('day grammar, raw limits, types and each range', () => {
  for (const [raw, suffix] of [[undefined,'TYPE'], [1,'TYPE'], [1n,'TYPE'], ['0'.repeat(17),'RAW_LIMIT'], ['', 'FORMAT'], ['-1','FORMAT'], ['1.0','FORMAT'], ['1e2','FORMAT'], ['３０','FORMAT'], ['1,000','FORMAT'], ['30\n','FORMAT'], ['366','RANGE'], ['0','RANGE']]) {
    const input = base(); input.observationDaysRaw = raw;
    assert.deepEqual(calculateRestockPlan(input), expectedError(`DAY_${suffix}`, 'observationDaysRaw'));
  }
  for (const key of ['leadDaysRaw', 'coverageDaysRaw']) { const input = base(); input[key] = '366'; assert.deepEqual(calculateRestockPlan(input), expectedError('DAY_RANGE', key)); }
  const leading = base(); leading.observationDaysRaw = '0000000000000030'; leading.items[0].usedRaw = '00030'; assert.deepEqual(calculateRestockPlan(leading), fixture.outcome);
});
test('array shape, symbols, nonenumerable/accessor index and hostile row', () => {
  const expect = (items, code, field = 'items') => { const input = base(); input.items = items; assert.deepEqual(calculateRestockPlan(input), expectedError(code, field)); };
  expect({}, 'ITEMS_TYPE'); expect(vm.runInNewContext('[]'), 'ITEMS_SHAPE');
  const subclass = new (class extends Array {})(); subclass.push(base().items[0]); expect(subclass, 'ITEMS_SHAPE');
  for (const key of ['extra', '01', Symbol('x')]) { const items = [base().items[0]]; items[key] = 1; expect(items, 'ITEMS_SHAPE'); }
  let items = [base().items[0]]; Object.defineProperty(items, '0', { enumerable: false }); expect(items, 'ITEMS_PROPERTY', 'items[0]');
  items = [base().items[0]]; let calls = 0; Object.defineProperty(items, '0', { get() { calls++; }, enumerable: true }); expect(items, 'ITEMS_PROPERTY', 'items[0]'); assert.equal(calls, 0);
  expect([null], 'ROW_OBJECT', 'items[0]');
});
test('row schema ordering and ID type, format, uniqueness', () => {
  let input = base(); delete input.items[0].id; input.items[0][Symbol('x')] = 1;
  assert.deepEqual(calculateRestockPlan(input), expectedError('ROW_UNKNOWN_FIELD', 'items[0]'));
  input = base(); Object.defineProperty(input.items[0], 'packSizeRaw', { enumerable: false }); input.items[0].id = '?';
  assert.deepEqual(calculateRestockPlan(input), expectedError('ROW_PROPERTY', 'items[0].packSizeRaw'));
  for (const [id, code] of [[1,'ROW_ID_TYPE'], ['', 'ROW_ID_FORMAT'], ['a'.repeat(41),'ROW_ID_FORMAT'], ['a b','ROW_ID_FORMAT'], ['é','ROW_ID_FORMAT']]) {
    input = base(); input.items[0].id = id; assert.deepEqual(calculateRestockPlan(input), expectedError(code, 'items[0].id'));
  }
});
test('label primitive/raw/surrogate/control/line/empty/codepoint priority', () => {
  for (const [key, prefix, rawMax, cpMax] of [['nameRaw','NAME',512,80], ['unitRaw','UNIT',128,16]]) {
    for (const [value, suffix] of [[null,'TYPE'], ['x'.repeat(rawMax+1),'RAW_LIMIT'], ['\udc00\n','SURROGATE'], ['a\u0080\u2028','CONTROL'], ['a\u2029','LINE_SEPARATOR'], [' \u00a0 ','EMPTY'], ['😀'.repeat(cpMax+1),'CODEPOINT_LIMIT']]) {
      const input = base(); input.items[0][key] = value; assert.deepEqual(calculateRestockPlan(input), expectedError(`${prefix}_${suffix}`, `items[0].${key}`));
    }
  }
  const input = base(); input.items[0].nameRaw = ' \u00a0塗料 😀  A\u00a0 '; input.items[0].unitRaw = ' 件😀 ';
  const output = verified(input); assert.equal(output.result.items[0].name, '塗料 😀  A'); assert.equal(output.result.items[0].unit, '件😀');
});
test('quantity primitive, raw, grammar and each boundary; no partial result', () => {
  for (const [value, suffix] of [[2,'TYPE'], ['0'.repeat(17),'RAW_LIMIT'], ['', 'FORMAT'], ['1.5','FORMAT'], ['1\n','FORMAT'], [' 1','FORMAT'], ['١','FORMAT'], ['1000001','RANGE']]) {
    const input = base(); input.items[0].usedRaw = value; assert.deepEqual(calculateRestockPlan(input), expectedError(`QUANTITY_${suffix}`, 'items[0].usedRaw'));
  }
  for (const [key, value] of [['stockRaw','1000001'], ['reserveRaw','1000001'], ['packSizeRaw','10001'], ['packSizeRaw','0']]) {
    const input = base(); input.items.push({ ...input.items[0], id: 'item-2', [key]: value });
    assert.deepEqual(calculateRestockPlan(input), expectedError('QUANTITY_RANGE', `items[1].${key}`));
  }
});
