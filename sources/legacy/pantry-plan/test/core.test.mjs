import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuantity, formatQuantity, normalizeIngredient } from '../public/js/core/quantities.mjs';
import { validateProject, parseProject, serializeProject } from '../public/js/core/schema.mjs';
import { calculateShopping, serializeReport, shoppingText } from '../public/js/core/shopping.mjs';
import { Session } from '../public/js/core/session.mjs';

const item = (ingredient, quantity, unit = 'g', unitLabel = '') => ({ ingredient, quantity, unit, unitLabel });
const project = (items = [], stock = [], name = '假料理') => ({ schema: 1, meals: [{ id: 'meal-1', name, items }], stock });
const calc = (items, stock) => calculateShopping(project(items, stock));
const rejects = (fn, code) => assert.throws(fn, error => error.code === code);

test('A01 mass: 500g + .75kg minus 300g = 950g', () => {
  const row = calc([item('米', '500'), item('米', '0.75', 'kg')], [item('米', '300')]).buy[0];
  assert.deepEqual([row.required, row.available, row.used, row.buy, row.unit], [1250000n, 300000n, 300000n, 950000n, 'g']);
  assert.equal(row.sources.length, 2);
});
test('A02 volume: .5L + 250ml minus .25L = 500ml', () => {
  const row = calc([item('水', '0.5', 'L'), item('水', '250', 'ml')], [item('水', '0.25', 'L')]).buy[0];
  assert.equal(row.buy, 500000n); assert.equal(row.unit, 'ml');
});
test('A03 mass and volume stay separate with warning', () => {
  const result = calc([item('奶', '500'), item('奶', '500', 'ml')]);
  assert.deepEqual(result.buy.map(r => [r.dimension, r.buy]), [['mass', 500000n], ['volume', 500000n]]);
  assert.deepEqual(result.warnings, [{ code: 'INCOMPATIBLE_UNITS', ingredient: '奶' }]);
});
test('A04 no shortage and surplus two pieces', () => {
  const result = calc([item('蛋', '3', 'piece')], [item('蛋', '5', 'piece')]);
  assert.equal(result.buy.length, 0); assert.equal(result.enough[0].buy, 0n); assert.equal(result.enough[0].surplus, 2000n);
});
test('A05 fractional count is exact', () => assert.equal(calc([item('蛋', '1.5', 'piece')], [item('蛋', '0.5', 'piece')]).buy[0].buy, 1000n));
test('A06 NFC + trim, preserving internal space and case', () => {
  assert.equal(calc([item(' 米 ', '1'), item('米', '2')]).buy[0].buy, 3000n);
  assert.equal(calc([item('米 A', '1'), item('米  A', '1'), item('Rice', '1'), item('rice', '1')]).buy.length, 4);
  assert.equal(normalizeIngredient(' e\u0301 '), 'é');
});
test('A07 custom units do not infer synonyms or piece equivalence', () => {
  const result = calc([item('麵', '2', 'customCount', '包'), item('麵', '1', 'customCount', '袋'), item('麵', '1', 'piece')], [item('麵', '1', 'customCount', ' 包 ')]);
  assert.deepEqual(result.buy.map(r => [r.unit, r.buy]), [['包', 1000n], ['袋', 1000n], ['piece', 1000n]]);
});
test('A08 reject invalid quantities and boundaries', () => {
  for (const value of ['1e3', '-1', '+1', '1.0001', '', ' 1', '1 ', '.5', '1.', '１', 'NaN', 'Infinity', '1000000.001', '1000001', '1\n', 1, null]) rejects(() => parseQuantity(value), 'INVALID_QUANTITY');
  assert.equal(parseQuantity('1000000.000'), 1000000000n); assert.equal(parseQuantity('0000.010'), 10n);
});
test('A09 duplicate stock added and deducted once', () => {
  const row = calc([item('A', '10')], [item('A', '2'), item('A', '3')]).buy[0];
  assert.equal(row.available, 5000n); assert.equal(row.buy, 5000n); assert.equal(row.stockSources.length, 2);
});
test('A10 zero values and empty source are valid', () => {
  const result = calc([item('A', '0')], [item('A', '0')]);
  assert.equal(result.buy.length, 0); assert.equal(result.enough[0].surplus, 0n);
  assert.deepEqual(calculateShopping({ meals: [], stock: [] }), { buy: [], enough: [], unmatchedStock: [], warnings: [] });
});
test('calculation interface rejects unknown keys and invalid root values', () => {
  for (const value of [null, [], { meals: [], stock: [], extra: true }]) rejects(() => calculateShopping(value), 'INVALID_SCHEMA');
});
test('import size is inclusive at exactly 2 MiB and counts UTF-8 bytes', () => {
  const minimum = '{"schema":1,"meals":[],"stock":[]}';
  assert.deepEqual(parseProject(minimum.padEnd(2097152, ' ')), { schema: 1, meals: [], stock: [] });
  rejects(() => parseProject(minimum.padEnd(2097153, ' ')), 'IMPORT_TOO_LARGE');
  rejects(() => parseProject('米'.repeat(699051)), 'IMPORT_TOO_LARGE');
});
test('A11 preview cancel keeps original rice and discards new noodles', () => {
  const session = new Session(); session.replace(project([item('米', '2')])); session.calculate();
  const generation = session.beginImport();
  assert.equal(session.result, null);
  assert.equal(session.preview(serializeProject(project([item('麵', '3')])), generation), true);
  session.cancelImport();
  assert.equal(session.project.meals[0].items[0].ingredient, '米'); assert.equal(session.pending, null);
});
test('A12 malicious text survives as inert literal data in JSON/TXT', () => {
  const result = calculateShopping(project([item('<img src=x>', '1')], [], '<img>'));
  const report = JSON.parse(serializeReport(result));
  assert.equal(report.buy[0].ingredient, '<img src=x>'); assert.equal(report.buy[0].sources[0].mealName, '<img>');
  const words = { reportTitle: 'List', unitNote: 'Separate units', progressNote: 'Progress only', buyHeading: 'Buy', enoughHeading: 'Enough', unmatchedHeading: 'Other stock', none: 'None', required: 'Need', available: 'Have', deducted: 'Used', surplus: 'Surplus', conflict: 'Conflict', fromMeal: 'Meal', stockRow: 'Stock', noPurchase: 'No purchase' };
  assert.ok(shoppingText(result, words).includes('Meal <img>: 1 g = 1 g'));
});
test('schema exact keys, unique ids, controls, prototypes and JSON errors reject whole project', () => {
  rejects(() => validateProject({ ...project(), extra: true }), 'INVALID_SCHEMA');
  rejects(() => validateProject({ ...project(), schema: 2 }), 'INVALID_SCHEMA');
  const duplicate = project(); duplicate.meals.push({ ...duplicate.meals[0] });
  rejects(() => validateProject(duplicate), 'DUPLICATE_ID');
  for (const bad of ['a\u0000b', 'a\u0085b', 'a\u202eb', '\ud800', ' ', 'a'.repeat(121)]) rejects(() => validateProject(project([item(bad, '1')])), 'INVALID_NAME');
  rejects(() => parseProject('{"schema":1,"meals":[],"stock":[],"__proto__":{}}'), 'INVALID_SCHEMA');
  rejects(() => parseProject('{bad'), 'INVALID_JSON');
  rejects(() => parseProject(' '.repeat(2097153)), 'IMPORT_TOO_LARGE');
  const bad = project([item('A', '1', 'g', 'x')]); rejects(() => validateProject(bad), 'INVALID_UNIT');
  rejects(() => validateProject(project([item('A', '1', 'customCount', '')])), 'INVALID_UNIT_LABEL');
  rejects(() => validateProject(project([item('A', '1', 'customCount', 'a'.repeat(21))])), 'INVALID_UNIT_LABEL');
  const accessor = project(); Object.defineProperty(accessor, 'stock', { get() { throw new Error('should not run'); } });
  rejects(() => validateProject(accessor), 'INVALID_SCHEMA');
});
test('limits permit exact maximum rows and reject +1, including sparse arrays', () => {
  const value = project(Array.from({ length: 300 }, () => item('A', '0')));
  value.stock = Array.from({ length: 300 }, () => item('A', '0'));
  assert.equal(validateProject(value).stock.length, 300);
  value.stock.push(item('A', '0')); rejects(() => validateProject(value), 'STOCK_LIMIT'); value.stock.pop();
  value.meals[0].items.push(item('A', '0')); rejects(() => validateProject(value), 'REQUIREMENT_LIMIT');
  const meals = { schema: 1, stock: [], meals: Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, name: 'M', items: [] })) };
  assert.equal(validateProject(meals).meals.length, 30); meals.meals.push({ id: 'extra', name: 'M', items: [] }); rejects(() => validateProject(meals), 'MEAL_LIMIT');
  rejects(() => validateProject(project(new Array(1))), 'INVALID_SCHEMA');
});
test('aggregate display cap is exact for demand and stock', () => {
  const maximum = item('A', '1000000', 'kg');
  assert.equal(calc([maximum]).buy[0].buy, 1000000000000n);
  rejects(() => calc([maximum, item('A', '0.001')]), 'TOTAL_LIMIT');
  rejects(() => calc([], [maximum, item('A', '0.001')]), 'TOTAL_LIMIT');
});
test('format does not auto-change unit or lose thousandths', () => {
  assert.equal(formatQuantity(999000n), '999'); assert.equal(formatQuantity(1001n), '1.001');
  assert.equal(formatQuantity(1200n), '1.2'); assert.equal(formatQuantity(0n), '0');
});
test('unmatched stock preserved and conflicts include stock-only dimensions', () => {
  const result = calc([item('奶', '1', 'ml')], [item('奶', '2', 'g'), item('鹽', '5')]);
  assert.equal(result.unmatchedStock.length, 2); assert.equal(result.unmatchedStock[0].surplus, 2000n);
  assert.equal(result.buy[0].unitConflict, true);
});
test('session invalidates ready/error/purchased states and stale generations cannot restore', () => {
  const session = new Session(); session.replace(project([item('A', '1')])); session.calculate();
  const key = session.result.buy[0].key; assert.equal(session.markPurchased(key, true), true);
  assert.equal(session.result.buy[0].buy, 1000n);
  session.invalidate(); assert.equal(session.checked.size, 0); assert.equal(session.result, null);
  session.project.meals[0].items[0].quantity = 'bad'; assert.equal(session.calculate(), null); assert.equal(session.error.code, 'INVALID_QUANTITY');
  const old = session.beginImport(); session.clear();
  assert.equal(session.preview(serializeProject(project([item('late', '1')])), old), false);
  assert.equal(session.project.meals.length, 0);
});
test('deterministic arithmetic conservation with fake data across all compatible units', () => {
  for (let i = 0; i < 50; i++) {
    const result = calc([item('A', `${i}.125`, 'kg')], [item('A', `${i * 900}.001`)]);
    const row = result.buy[0] ?? result.enough[0];
    assert.equal(row.required, row.used + row.buy); assert.equal(row.available, row.used + row.surplus);
    assert.ok(row.buy === 0n || row.surplus === 0n);
  }
});
