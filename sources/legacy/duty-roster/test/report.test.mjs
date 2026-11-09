import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../public/js/core/report.js';
import { calculateRoster } from '../public/js/core/roster.js';

const fixture = () => ({ ok: true, days: [
  { date: '2026-10-19', weekday: 1, personNumber: 1, personId: 'a', personName: 'A' },
  { date: '2026-10-20', weekday: 2, personNumber: 2, personId: 'b', personName: 'B' },
  { date: '2026-10-21', weekday: 3, personNumber: null, personId: null, personName: null },
  { date: '2026-10-22', weekday: 4, personNumber: null, personId: null, personName: null },
  { date: '2026-10-23', weekday: 5, personNumber: null, personId: null, personName: null },
], counts: [{ personNumber: 1, personId: 'a', personName: 'A', count: 1 }, { personNumber: 2, personId: 'b', personName: 'B', count: 1 }], assignedCount: 2, unassignedCount: 3, totalDays: 5 });
const zh = 'GlossQuote Duty Roster\n輪值排班表\n輪值日數：5\n已排：2\n未排：3\n\n日期\t星期\t輪值人員\n2026-10-19\t週一\t成員 1：A\n2026-10-20\t週二\t成員 2：B\n2026-10-21\t週三\t未排\n2026-10-22\t週四\t未排\n2026-10-23\t週五\t未排\n\n成員統計\n成員 1：A\t1\n成員 2：B\t1';
const en = 'GlossQuote Duty Roster\nDuty roster\nDuty days: 5\nAssigned: 2\nUnassigned: 3\n\nDate\tWeekday\tMember\n2026-10-19\tMon\tMember 1: A\n2026-10-20\tTue\tMember 2: B\n2026-10-21\tWed\tUnassigned\n2026-10-22\tThu\tUnassigned\n2026-10-23\tFri\tUnassigned\n\nMember totals\nMember 1: A\t1\nMember 2: B\t1';
const failure = path => ({ ok: false, error: { code: 'REPORT_SCHEMA', path } });
for (const [id, lang, expected] of [['C28', 'zh-TW', zh], ['C29', 'en', en]]) {
  test(`${id}: exact full report, TAB/LF, fixed filename and UTF-8 bytes`, () => {
    const result = buildReport(fixture(), lang);
    assert.deepEqual(result, { ok: true, filename: 'glossquote-duty-roster.txt', mimeType: 'text/plain;charset=utf-8', text: expected });
    assert.deepEqual(Buffer.from(result.text, 'utf8'), Buffer.from(expected, 'utf8'));
    assert.equal(result.text.startsWith('\ufeff'), false); assert.equal(result.text.endsWith('\n'), false); assert.equal(result.text.includes('\r'), false);
    assert.equal((result.text.match(/\t/g) ?? []).length, 14);
  });
}
test('C30: language is checked before any result reflection', () => {
  const bad = new Proxy({}, { ownKeys() { throw Error('fake'); } });
  for (const lang of ['zh-Hant', '', null, 'EN', {}]) assert.deepEqual(buildReport(bad, lang), { ok: false, error: { code: 'REPORT_LANGUAGE', path: '/lang' } });
});
test('C31: root exact schema, accessors and totals', () => {
  assert.deepEqual(buildReport({ ...fixture(), extra: true }, 'en'), failure('/'));
  let calls = 0; const data = fixture(); Object.defineProperty(data, 'days', { enumerable: true, get() { calls++; return []; } });
  assert.deepEqual(buildReport(data, 'en'), failure('/')); assert.equal(calls, 0);
  for (const [key, value] of [['assignedCount', 5], ['unassignedCount', 0], ['totalDays', 0]]) assert.deepEqual(buildReport({ ...fixture(), [key]: value }, 'en'), failure(`/${key}`));
});
test('report arrays: empty, sparse, extra, symbol, bounds and prototypes', () => {
  for (const key of ['days', 'counts']) {
    for (const array of [[], [, 1], Object.assign([1], { extra: true }), Object.assign([1], { [Symbol('fake')]: 1 }), Object.setPrototypeOf([1], null)]) assert.deepEqual(buildReport({ ...fixture(), [key]: array }, 'en'), failure(`/${key}`));
    assert.deepEqual(buildReport({ ...fixture(), [key]: Array(key === 'days' ? 367 : 31).fill(1) }, 'en'), failure(`/${key}`));
  }
});
test('report counts: exact shape, ordinal, unique ID, trimmed names and bounds', () => {
  const cases = [
    [r => r.counts[0].extra = true, '/counts/0'], [r => r.counts[0].personNumber = 2, '/counts/0/personNumber'],
    [r => r.counts[1].personId = 'a', '/counts/1/personId'], [r => r.counts[0].personId = 'bad id', '/counts/0/personId'], [r => r.counts[0].personId = 'a\n', '/counts/0/personId'],
    [r => r.counts[0].personName = ' A', '/counts/0/personName'], [r => r.counts[0].personName = 'A\nFAKE', '/counts/0/personName'],
    [r => r.counts[0].personName = '\ud800', '/counts/0/personName'], [r => r.counts[0].personName = null, '/counts/0/personName'],
    [r => r.counts[0].count = -1, '/counts/0/count'], [r => r.counts[0].count = 367, '/counts/0/count'],
    [r => r.counts[0].count = 2, '/counts/0/count'],
  ];
  for (const [mutate, path] of cases) { const data = fixture(); mutate(data); assert.deepEqual(buildReport(data, 'en'), failure(path)); }
});
test('report dates: exact shape, valid ascending dates and weekday agreement', () => {
  const cases = [[r => r.days[0].extra = true, '/days/0'], [r => r.days[0].date = '2026-02-30', '/days/0/date'], [r => r.days[1].date = '2026-10-19', '/days/1/date'], [r => r.days[0].weekday = 2, '/days/0/weekday']];
  for (const [mutate, path] of cases) { const data = fixture(); mutate(data); assert.deepEqual(buildReport(data, 'en'), failure(path)); }
});
test('report assignment: full member match or all three null', () => {
  const cases = [[r => r.days[0].personNumber = 0, '/days/0/personNumber'], [r => r.days[0].personId = 'b', '/days/0/personId'], [r => r.days[0].personName = 'B', '/days/0/personName'], [r => r.days[2].personId = 'a', '/days/2/personId'], [r => r.days[2].personName = '', '/days/2/personName']];
  for (const [mutate, path] of cases) { const data = fixture(); mutate(data); assert.deepEqual(buildReport(data, 'en'), failure(path)); }
});
test('report first-error precedence and getter-free nested validation', () => {
  const data = fixture(); data.counts[0].personNumber = 2; data.days[0].date = 'bad'; data.assignedCount = 8;
  assert.deepEqual(buildReport(data, 'en'), failure('/counts/0/personNumber'));
  for (const [key, path] of [['counts', '/counts/0'], ['days', '/days/0']]) {
    const value = fixture(); let calls = 0; const field = key === 'counts' ? 'personName' : 'date';
    Object.defineProperty(value[key][0], field, { enumerable: true, get() { calls++; return 'FAKE'; } });
    assert.deepEqual(buildReport(value, 'en'), failure(path)); assert.equal(calls, 0);
  }
});
test('report duplicate names and 80 emoji remain numbered and trimmed', () => {
  const result = calculateRoster({ startRaw: '2026-10-19', endRaw: '2026-10-20', weekdays: [1, 2], people: [{ id: 'a', nameRaw: ' Kai ', weekdays: [1, 2] }, { id: 'b', nameRaw: ' Kai ', weekdays: [1, 2] }] });
  for (const lang of ['en', 'zh-TW']) { const text = buildReport(result, lang).text; assert.equal((text.match(lang === 'en' ? /Member 1: Kai/g : /成員 1：Kai/g) ?? []).length, 2); assert.equal((text.match(lang === 'en' ? /Member 2: Kai/g : /成員 2：Kai/g) ?? []).length, 2); }
  const name = '😀'.repeat(80); const emoji = calculateRoster({ startRaw: '2026-10-19', endRaw: '2026-10-19', weekdays: [1], people: [{ id: 'fake', nameRaw: ` ${name} `, weekdays: [1] }] });
  assert.equal(buildReport(emoji, 'en').text.includes(`Member 1: ${name}\t1`), true);
});
test('report is non-mutating and validates zero-assigned results', () => {
  const data = fixture(); const before = JSON.stringify(data);
  Object.freeze(data); assert.equal(buildReport(data, 'en').ok, true); assert.equal(JSON.stringify(data), before);
  const empty = calculateRoster({ startRaw: '2026-10-19', endRaw: '2026-10-19', weekdays: [1], people: [{ id: 'a', nameRaw: 'A', weekdays: [] }] });
  assert.equal(buildReport(empty, 'en').text.includes('2026-10-19\tMon\tUnassigned'), true);
});
