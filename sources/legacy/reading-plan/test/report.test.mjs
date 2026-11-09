import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadingPlan } from '../public/js/core/reading-plan.mjs';
import { serializePlanReport } from '../public/js/core/report.mjs';
import { input, P5_ZH, P5_EN } from './helpers/fixtures.mjs';

test('C45 exact bilingual P5 text and UTF-8 bytes, no BOM or final LF', () => {
  const plan = createReadingPlan(input());
  for (const [locale, expected] of [['zh-Hant', P5_ZH], ['en', P5_EN]]) {
    const actual = serializePlanReport(plan, locale);
    assert.equal(actual, expected); assert.deepEqual(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8'));
    assert(!actual.startsWith('\ufeff')); assert(!actual.endsWith('\n')); assert(!actual.includes('\r'));
  }
});
test('C46 flex reports never contain null or reversed pages', () => {
  const plan = createReadingPlan(input({ totalPagesRaw: '43' }));
  assert.deepEqual(serializePlanReport(plan, 'zh-Hant').split('\n').slice(-2), ['2026-10-22｜星期四｜彈性／休息', '2026-10-23｜星期五｜彈性／休息']);
  assert.deepEqual(serializePlanReport(plan, 'en').split('\n').slice(-2), ['2026-10-22 | Thursday | Flexible / rest', '2026-10-23 | Friday | Flexible / rest']);
  for (const locale of ['zh-Hant', 'en']) assert(!/null|44–43/.test(serializePlanReport(plan, locale)));
});
test('C49 successful titles are trimmed; refusal results never carry title', () => {
  for (const totalPagesRaw of ['100', '40']) {
    const plan = createReadingPlan(input({ titleRaw: '  A Book  ', totalPagesRaw }));
    assert.equal(plan.title, 'A Book');
    for (const locale of ['zh-Hant', 'en']) {
      const report = serializePlanReport(plan, locale);
      assert(report.includes('A Book')); assert(!report.includes('  A Book  '));
    }
  }
  const invalid = createReadingPlan(input({ titleRaw: 'A Book', totalPagesRaw: '0' }));
  const infeasible = createReadingPlan(input({ titleRaw: 'A Book', dailyCapRaw: '10' }));
  for (const value of [invalid, infeasible]) { assert(!Object.hasOwn(value, 'title')); assert(!Object.hasOwn(value, 'schedule')); assert.throws(() => serializePlanReport(value, 'en'), /PLAN_REQUIRED/); }
  assert(!Object.hasOwn(invalid, 'summary')); assert(Object.hasOwn(infeasible, 'summary'));
});
test('zero remaining report is explicit and contains no schedule or empty line', () => {
  const plan = createReadingPlan(input({ titleRaw: '  A Book  ', totalPagesRaw: '40' }));
  assert.equal(serializePlanReport(plan, 'en'), `Gloss Tools | Reading plan
Book title: A Book
Status: No pages remain. This does not record that the book was actually completed.
Total pages: 40
Pages completed: 40
Pages remaining: 0
Date range: 2026-10-19 to 2026-10-23
There is no daily schedule for this plan.`);
  assert.equal(serializePlanReport(plan, 'zh-Hant'), `Gloss Tools｜閱讀進度規劃
書名：A Book
狀態：已無剩餘頁。這不代表曾記錄全書實際完成閱讀。
總頁數：40
已讀頁數：40
剩餘頁數：0
日期範圍：2026-10-19 至 2026-10-23
本計畫沒有每日排程。`);
});
test('report rejects unsupported kind and locale and keeps markup as text', () => {
  for (const value of [null, {}, { kind: 'plan', status: 'x', title: '' }]) assert.throws(() => serializePlanReport(value, 'en'), /PLAN_REQUIRED/);
  assert.throws(() => serializePlanReport(createReadingPlan(input()), 'fr'), /LOCALE_INVALID/);
  const p = createReadingPlan(input({ titleRaw: '<img src=x>' })); assert(serializePlanReport(p, 'en').includes('Book title: <img src=x>'));
});
