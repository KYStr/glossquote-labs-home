import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../public/js/core/validation.js';
import { calculateSchedule } from '../public/js/core/schedule.js';
import { formatPlainTextReport, encodeUtf8Report } from '../public/js/core/report.js';
import { D, R, exampleSchedule, zhReport, enReport } from './helpers.mjs';
test('C63', () => assert.equal(formatPlainTextReport(exampleSchedule, 'zh-Hant'), zhReport));
test('C64', () => {
  const input = D('09:00', '10:00', false, [R('r1', 'Opening', '10'), R('r2', 'Discussion', '35'), R('r3', 'Break', '10')]);
  assert.equal(formatPlainTextReport(calculateSchedule(validateDraft(input).value), 'en'), enReport);
  assert.ok(formatPlainTextReport(exampleSchedule, 'en').includes('開場'));
});
test('C65', () => {
  const bytes = encodeUtf8Report(zhReport);
  assert.deepEqual(bytes, new Uint8Array(Buffer.from(zhReport, 'utf8')));
  assert.equal(bytes.length, Buffer.byteLength(zhReport, 'utf8')); assert.notDeepEqual([...bytes.slice(0, 3)], [239, 187, 191]); assert.notEqual(bytes.at(-1), 10);
});
test('C66', () => {
  const schedule = calculateSchedule(validateDraft(D('23:40', '', false, [R('r1', 'Talk', '30'), R('r2', 'Wrap', '20')])).value);
  assert.equal(formatPlainTextReport(schedule, 'zh-Hant'), 'GlossQuote 活動時間表\n開始\t23:40\n01\t23:40–00:10（次日）\tTalk\t30 分鐘\n02\t00:10（次日）–00:30（次日）\tWrap\t20 分鐘\n總長\t50 分鐘\n結束\t00:30（次日）');
  assert.equal(formatPlainTextReport(schedule, 'en'), 'GlossQuote Event Timeline\nStart\t23:40\n01\t23:40–00:10 (next day)\tTalk\t30 min\n02\t00:10 (next day)–00:30 (next day)\tWrap\t20 min\nTotal\t50 min\nEnd\t00:30 (next day)');
});
test('Additional note and late/on-time report labels', () => {
  const schedule = calculateSchedule(validateDraft(D('09:00', '09:01', false, [R('r1', '<b>A</b>', '2', ' Note 😀 ')])).value);
  assert.equal(formatPlainTextReport(schedule, 'en'), 'GlossQuote Event Timeline\nStart\t09:00\n01\t09:00–09:02\t<b>A</b>\t2 min\nNote\tNote 😀\nTotal\t2 min\nEnd\t09:02\nTarget\t09:01 (same day)\nDifference\t1 min late');
});
