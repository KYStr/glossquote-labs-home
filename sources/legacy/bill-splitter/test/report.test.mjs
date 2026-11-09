import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBill } from '../public/js/core/split.mjs';
import { buildReport } from '../public/js/core/report.mjs';
function d() { return { total: '100', precision: 2, mode: 'equal', settlement: false, people: [1, 2, 3].map((id, i) => ({ id, name: `Fake ${id}`, weight: ['1', '2', '0'][i], paid: '' })) }; }
test('S27 equal report uses effective weights, preserves share-mode draft', () => {
  const draft = d();
  for (const locale of ['zh-Hant', 'en']) {
    const report = buildReport(calculateBill(draft), locale);
    assert.equal((report.match(locale === 'en' ? /Shares: 1/g : /份數: 1/g) ?? []).length, 3);
    assert.ok(report.includes('33.34')); assert.ok(report.includes('33.33')); assert.ok(!report.includes('\r')); assert.ok(!report.startsWith('\ufeff')); assert.ok(report.endsWith('\n') && !report.endsWith('\n\n'));
  }
  assert.deepEqual(draft.people.map(p => p.weight), ['1', '2', '0']);
  draft.mode = 'shares'; assert.deepEqual(calculateBill(draft).people.map(p => p.share), [3333n, 6667n, 0n]);
});
test('report fixed templates include precision, stable ids, settlement and no minimum-transfer claim', () => {
  const draft = d(); draft.settlement = true; draft.people[0].paid = '100';
  const report = buildReport(calculateBill(draft), 'en');
  assert.ok(report.includes('Decimal places: 2')); assert.ok(report.includes('#2 Fake 2 pays #1 Fake 1 33.33'));
  assert.ok(report.includes('To receive: 66.66')); assert.ok(!report.includes('minimum'));
  assert.throws(() => buildReport(calculateBill(draft), 'invalid'), e => e.code === 'LOCALE');
});
