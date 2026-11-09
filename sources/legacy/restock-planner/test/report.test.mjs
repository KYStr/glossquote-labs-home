import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateRestockPlan } from '../public/js/core/calculate.mjs';
import { formatRestockReport } from '../public/js/core/report.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/base.json', import.meta.url), 'utf8'));
const result = () => structuredClone(fixture.outcome.result);
const failure = { ok: false, error: { code: 'REPORT_INPUT', field: 'result' } };
const zh = `補貨數量試算
估算假設：以觀測期間平均用量固定計算；訂單在到貨天數結束時可用。
觀測期間：30 天；到貨天數：7 天；到貨後目標涵蓋：30 天。

1. 藍色塗料
單位：ml；觀測用量：30 ml；現貨：10 ml；安全備量：3 ml；每包含：12 ml
平均每日用量：1.000 ml/日；現貨可用：10 整天
到貨前估計短缺：0 ml
建議補貨：3 包（共 36 ml）`;
const en = `Restock quantity plan
Estimate: usage stays at the observed average; the order is available at the end of the lead period.
Observation: 30 days; lead time: 7 days; desired coverage after arrival: 30 days.

1. Blue paint
Unit: ml; observed use: 30 ml; current stock: 10 ml; safety reserve: 3 ml; units per pack: 12 ml
Average daily use: 1.000 ml/day; current stock runway: 10 whole days
Estimated shortage before arrival: 0 ml
Order: 3 packs (36 ml)`;
test('C42a complete literal Chinese report oracle, input untouched', () => {
  const input = result(); const before = structuredClone(input);
  assert.deepEqual(formatRestockReport(input, 'zh-Hant'), { ok: true, text: zh }); assert.deepEqual(input, before);
});
test('C42b complete literal English report oracle', () => {
  const input = structuredClone(fixture.input); input.items[0].nameRaw = 'Blue paint';
  assert.deepEqual(formatRestockReport(calculateRestockPlan(input).result, 'en'), { ok: true, text: en });
});
test('C43 rejects inconsistent pack count without changing order units', () => {
  const input = result(); input.items[0].packsToOrder = 1; assert.deepEqual(formatRestockReport(input, 'en'), failure);
});
test('C44a too many rows rejected before enumeration or getter execution', () => {
  const input = result(); input.items = new Array(31); let calls = 0;
  Object.defineProperty(input.items, '0', { enumerable: true, get() { calls++; } });
  const original = Reflect.ownKeys; Reflect.ownKeys = value => { if (value === input.items) throw new Error('Too early enumeration'); return original(value); };
  try { assert.deepEqual(formatRestockReport(input, 'en'), failure); } finally { Reflect.ownKeys = original; }
  assert.equal(calls, 0);
});
test('C44b holes rejected', () => { const input = result(); input.items = new Array(1); assert.deepEqual(formatRestockReport(input, 'en'), failure); });
test('C44c derived getter rejected without execution', () => {
  const input = result(); let calls = 0; Object.defineProperty(input.items[0], 'packsToOrder', { enumerable: true, get() { calls++; return 3; } });
  assert.deepEqual(formatRestockReport(input, 'en'), failure); assert.equal(calls, 0);
});
test('C44d unknown result row key rejected', () => { const input = result(); input.items[0].extra = 1; assert.deepEqual(formatRestockReport(input, 'en'), failure); });
test('language is validated first, without touching result getters', () => {
  let calls = 0; const input = {}; Object.defineProperty(input, 'schemaVersion', { get() { calls++; } });
  for (const language of ['zh', 'EN', null, 1]) assert.deepEqual(formatRestockReport(input, language), { ok: false, error: { code: 'REPORT_INPUT', field: 'language' } });
  assert.equal(calls, 0);
});
test('every numeric derived field and daily-use member is rechecked', () => {
  for (const key of ['targetNumeratorUnitDays','stockNumeratorUnitDays','needNumeratorUnitDays','packDenominatorUnitDays','packsToOrder','orderUnits','shortageNumeratorUnitDays','shortageBeforeArrivalUnits','runwayWholeDays']) {
    const input = result(); input.items[0][key]++; assert.deepEqual(formatRestockReport(input, 'en'), failure, key);
  }
  for (const [key, value] of [['numeratorUnits',31], ['denominatorDays',29], ['roundedTo3','1.001']]) {
    const input = result(); input.items[0].averageDailyUse[key] = value; assert.deepEqual(formatRestockReport(input, 'en'), failure, key);
  }
});
test('recursive exact schema, primitives, bounds, labels and enums', () => {
  const mutators = [
    r => { r.schemaVersion = 2; }, r => { r.extra = 1; }, r => { delete r.items; }, r => { r.items = []; },
    r => { r.assumptions.observationDays = 0; }, r => { r.assumptions.leadDays = -1; }, r => { r.assumptions.coverageDays = 366; },
    r => { r.assumptions.arrivalTiming = 'start'; }, r => { r.assumptions.usageModel = 'forecast'; }, r => { r.assumptions.extra = 1; },
    r => { r.items[0].observedUseUnits = NaN; }, r => { r.items[0].currentStockUnits = 1000001; }, r => { r.items[0].packSizeUnits = 0; },
    r => { r.items[0].safetyReserveUnits = 0.1; }, r => { r.items[0].name = ' x '; }, r => { r.items[0].unit = '\n'; },
    r => { r.items[0].name = '\ud800'; }, r => { r.items[0].unit = '\u2029'; }, r => { r.items[0].id = '?'; },
    r => { r.items.push(structuredClone(r.items[0])); }, r => { r.items[0].averageDailyUse.extra = 1; },
    r => { Object.defineProperty(r.items[0].averageDailyUse, 'roundedTo3', { enumerable: false }); },
    r => { r.items.extra = true; }, r => { r.items[Symbol('x')] = 1; }, r => { r[Symbol('x')] = 1; },
    r => { Object.setPrototypeOf(r.assumptions, null); }, r => { r.items[0].averageDailyUse = null; },
  ];
  for (const mutate of mutators) { const input = result(); mutate(input); assert.deepEqual(formatRestockReport(input, 'en'), failure); }
  for (const input of [null, [], Object.create(null), 1]) assert.deepEqual(formatRestockReport(input, 'en'), failure);
});
test('getters at each report nesting and array index never execute', () => {
  for (const target of ['root','assumptions','row','average','array']) {
    const input = result(); let calls = 0;
    const [object, key] = target === 'root' ? [input,'items'] : target === 'assumptions' ? [input.assumptions,'leadDays'] : target === 'row' ? [input.items[0],'name'] : target === 'average' ? [input.items[0].averageDailyUse,'roundedTo3'] : [input.items,'0'];
    Object.defineProperty(object, key, { enumerable: true, get() { calls++; } });
    assert.deepEqual(formatRestockReport(input, 'en'), failure); assert.equal(calls, 0);
  }
});
test('30-row report remains complete, ordered and pure text; zero-use wording', () => {
  const input = structuredClone(fixture.input);
  input.items = Array.from({ length: 30 }, (_, i) => ({ ...input.items[0], id: `item-${i+1}`, nameRaw: i === 29 ? '<img src=x onerror=alert(1)>' : `品項 ${i+1}`, usedRaw: '0', stockRaw: '0' }));
  for (const language of ['zh-Hant','en']) {
    const report = formatRestockReport(calculateRestockPlan(input).result, language);
    assert.equal(report.ok, true); assert.ok(report.text.includes('30. <img src=x onerror=alert(1)>'));
    assert.equal(report.text.includes('\r'), false); assert.equal(report.text.endsWith('\n'), false);
    assert.ok(report.text.includes(language === 'en' ? 'Not estimated (zero observed use)' : '無法估算（觀測用量為 0）'));
    assert.equal((report.text.match(language === 'en' ? /Order: 1 packs \(12 ml\)/g : /建議補貨：1 包（共 12 ml）/g) || []).length, 30);
  }
});
test('zero-pack item is retained in both complete reports', () => {
  const input = structuredClone(fixture.input); input.items[0].stockRaw = '40';
  const output = calculateRestockPlan(input);
  assert.ok(formatRestockReport(output.result,'en').text.endsWith('Order: 0 packs (0 ml)'));
  assert.ok(formatRestockReport(output.result,'zh-Hant').text.endsWith('建議補貨：0 包（共 0 ml）'));
});
