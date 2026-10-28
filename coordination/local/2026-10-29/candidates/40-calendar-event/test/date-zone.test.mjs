import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, parseCivilDate, parseClock, normalizedText, exactRecord } from '../public/js/core/date.mjs';
import { ZONES, resolveLocal, createZoneResolver, formatOffset } from '../public/js/core/zone.mjs';
import { validateEvent } from '../public/js/core/event.mjs';

export const timed = (overrides = {}) => ({ mode: 'timed', title: '範例活動', location: '', notes: '',
  startDate: '2026-10-22', startTime: '09:00', endDate: '2026-10-22', endTime: '10:00', zone: 'Asia/Taipei', ...overrides });
export const allDay = (overrides = {}) => ({ mode: 'all-day', title: 'Sample', location: '', notes: '', startDate: '2026-10-22', lastDate: '2026-10-22', ...overrides });
const epochs = input => resolveLocal(input).candidates.map(c => new Date(c.epochMs).toISOString());
const rejects = (draft, code, field) => {
  const result = validateEvent(draft);
  assert.equal(result.ok, false); assert.equal(result.event, undefined);
  assert.ok(result.errors.some(e => e.code === code && (!field || e.field === field)), JSON.stringify(result.errors));
};

test('C01 Taipei resolves both endpoints with real UTC values', () => {
  const result = validateEvent(timed()); assert.equal(result.ok, true);
  assert.equal(new Date(result.event.start.epochMs).toISOString(), '2026-10-22T01:00:00.000Z');
  assert.equal(new Date(result.event.end.epochMs).toISOString(), '2026-10-22T02:00:00.000Z');
  assert.equal(result.event.start.offsetMinutes, 480);
});
test('C02 UTC equal and earlier end fail; midnight never guesses next day', () => {
  rejects(timed({ zone: 'UTC', endTime: '09:00' }), 'END_NOT_AFTER_START');
  rejects(timed({ zone: 'UTC', endTime: '08:00' }), 'END_NOT_AFTER_START');
  rejects(timed({ startTime: '23:00', endTime: '01:00' }), 'END_NOT_AFTER_START');
});
test('C03 C04 strict Gregorian dates, years, exact ASCII clock', () => {
  assert.deepEqual(parseCivilDate('2024-02-29'), { year: 2024, month: 2, day: 29 });
  for (const invalid of ['2025-02-29', '1999-12-31', '2100-01-01', '2026-2-03', '2026-04-31', '2026-00-01', '2026-01-00', '2026-01-32', '', null, 20260101]) assert.throws(() => parseCivilDate(invalid), { code: 'INVALID_DATE' });
  for (const invalid of ['24:00', '9:00', '12:60', '00:00:00', '０９:００', '', null, 900]) assert.throws(() => parseClock(invalid), { code: 'INVALID_TIME' });
  assert.deepEqual(parseClock('23:59'), { hour: 23, minute: 59 });
  assert.deepEqual(parseCivilDate('2000-01-01'), { year: 2000, month: 1, day: 1 });
  assert.deepEqual(parseCivilDate('2099-12-31'), { year: 2099, month: 12, day: 31 });
});
test('C05 New York spring gap has zero candidates and correct field error', () => {
  assert.deepEqual(epochs({ date: '2026-03-08', time: '02:30', zone: 'America/New_York' }), []);
  rejects(timed({ startDate: '2026-03-08', startTime: '02:30', endDate: '2026-03-08', endTime: '04:00', zone: 'America/New_York' }), 'NONEXISTENT_TIME', 'startTime');
});
test('C06 New York fold requires explicit early/late per endpoint', () => {
  assert.deepEqual(epochs({ date: '2026-11-01', time: '01:30', zone: 'America/New_York' }), ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
  const draft = timed({ zone: 'America/New_York', startDate: '2026-11-01', startTime: '01:30', endDate: '2026-11-01', endTime: '01:45' });
  const unset = validateEvent(draft); assert.equal(unset.ok, false);
  assert.equal(unset.errors.filter(e => e.code === 'AMBIGUOUS_TIME').length, 2);
  assert.deepEqual(unset.ambiguities.start.map(c => c.offsetMinutes), [-240, -300]);
  for (const [choice, expected] of [['early', '2026-11-01T05:30:00.000Z'], ['late', '2026-11-01T06:30:00.000Z']]) {
    const result = validateEvent({ ...draft, startChoice: choice, endChoice: 'late' }); assert.equal(result.ok, true);
    assert.equal(new Date(result.event.start.epochMs).toISOString(), expected);
  }
  rejects({ ...draft, startChoice: 'late', endChoice: 'early' }, 'END_NOT_AFTER_START');
});
test('C07 London gap and autumn fold; C08 Sydney fold', () => {
  assert.deepEqual(epochs({ date: '2026-03-29', time: '01:30', zone: 'Europe/London' }), []);
  assert.deepEqual(epochs({ date: '2026-10-25', time: '01:30', zone: 'Europe/London' }), ['2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z']);
  assert.deepEqual(epochs({ date: '2026-04-05', time: '02:30', zone: 'Australia/Sydney' }), ['2026-04-04T15:30:00.000Z', '2026-04-04T16:30:00.000Z']);
  assert.deepEqual(epochs({ date: '2026-10-04', time: '02:30', zone: 'Australia/Sydney' }), []);
});
test('C09 Tokyo midnight crosses year; all ten zones have explicit expected UTC', () => {
  assert.deepEqual(epochs({ date: '2026-01-01', time: '00:15', zone: 'Asia/Tokyo' }), ['2025-12-31T15:15:00.000Z']);
  const expected = ['12:00', '04:00', '03:00', '04:00', '04:00', '17:00', '20:00', '12:00', '11:00', '01:00'];
  ZONES.forEach((zone, i) => assert.deepEqual(epochs({ date: '2026-01-15', time: '12:00', zone }), [`2026-01-15T${expected[i]}:00.000Z`]));
  assert.deepEqual(epochs({ date: '2026-01-01', time: '00:00', zone: 'UTC' }), ['2026-01-01T00:00:00.000Z']);
});
test('C10 C11 C12 all-day inclusive bounds/exclusive dates and 366-day limit', () => {
  const single = validateEvent(allDay()); assert.equal(single.ok, true); assert.equal(single.event.exclusiveEnd, '2026-10-23');
  const leap = validateEvent(allDay({ startDate: '2024-02-28', lastDate: '2024-02-29' })); assert.equal(leap.event.days, 2); assert.equal(leap.event.exclusiveEnd, '2024-03-01');
  rejects(allDay({ lastDate: '2026-10-21' }), 'LAST_BEFORE_START');
  rejects(allDay({ startDate: '2024-01-01', lastDate: '2025-01-01' }), 'EVENT_TOO_LONG');
  assert.equal(validateEvent(allDay({ startDate: '2024-01-01', lastDate: '2024-12-31' })).event.days, 366);
  rejects(allDay({ startDate: '2099-12-30', lastDate: '2099-12-31' }), 'LAST_DATE_LIMIT');
  assert.equal(validateEvent(allDay({ startDate: '2099-12-30', lastDate: '2099-12-30' })).event.exclusiveEnd, '2099-12-31');
});
test('Timed duration uses actual UTC, <=366 days, including DST endpoints', () => {
  assert.equal(validateEvent(timed({ zone: 'UTC', startDate: '2024-01-01', startTime: '00:00', endDate: '2025-01-01', endTime: '00:00' })).event.durationMs, 366 * DAY_MS);
  rejects(timed({ zone: 'UTC', startDate: '2024-01-01', startTime: '00:00', endDate: '2025-01-01', endTime: '00:01' }), 'EVENT_TOO_LONG');
  const fold = validateEvent(timed({ zone: 'America/New_York', startDate: '2026-11-01', endDate: '2026-11-01', startTime: '01:45', endTime: '01:15', startChoice: 'early', endChoice: 'late' }));
  assert.equal(fold.ok, true); assert.equal(fold.event.durationMs, 30 * 60_000);
});
test('C16 exact schema rejects unknown/symbol/accessor/nonstring/hostile values without content in errors', () => {
  for (const draft of [timed({ extra: 'canary-secret' }), timed({ title: '\ud800' }), timed({ title: 'A\nB' }), timed({ title: 'A\rB' }), timed({ title: 'A\u2028B' }), timed({ notes: 'A\0B' }), timed({ location: 'A\tB' }), timed({ title: 1 }), timed({ zone: null }), { ...allDay(), zone: 'UTC' }, null]) {
    const result = validateEvent(draft); assert.equal(result.ok, false); assert.equal(JSON.stringify(result).includes('canary-secret'), false);
  }
  assert.throws(() => exactRecord({ [Symbol('extra')]: 1 }, []), { code: 'INVALID_SCHEMA' });
  assert.throws(() => exactRecord(Object.defineProperty({}, 'mode', { get() { throw Error('private'); } }), ['mode']), { code: 'INVALID_SCHEMA' });
  rejects(timed({ startChoice: 'guess' }), 'INVALID_CHOICE');
});
test('C17 Unicode code-point text bounds and CR/LF normalization', () => {
  assert.equal(validateEvent(allDay({ title: '😀'.repeat(120), notes: '😀'.repeat(4000), location: '地'.repeat(200) })).ok, true);
  rejects(allDay({ title: '😀'.repeat(121) }), 'TEXT_TOO_LONG', 'title');
  rejects(allDay({ notes: '😀'.repeat(4001) }), 'TEXT_TOO_LONG', 'notes');
  rejects(allDay({ location: '地'.repeat(201) }), 'TEXT_TOO_LONG', 'location');
  rejects(allDay({ title: '    ' }), 'TITLE_REQUIRED');
  assert.equal(normalizedText('A\r\nB\rC', 'notes', 4000, { multiline: true }), 'A\nB\nC');
  assert.equal(validateEvent(allDay({ title: '  範例  ' })).event.title, '範例');
});
test('C19 unsupported zones/Intl errors/malformed formatters fail closed', () => {
  rejects(timed({ zone: 'Pacific/Chatham' }), 'UNSUPPORTED_ZONE');
  for (const factory of [() => { throw new Error('private'); }, () => ({ resolvedOptions: () => ({ calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h24', timeZone: 'UTC' }) }),
    () => ({ resolvedOptions: () => ({ calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23', timeZone: 'UTC' }), formatToParts: () => [{ type: 'hour', value: '24' }] })]) {
    assert.throws(() => createZoneResolver(factory)({ date: '2026-01-01', time: '00:00', zone: 'UTC' }), { code: 'UNSUPPORTED_ZONE' });
  }
  const result = validateEvent(timed(), () => { throw new Error('private'); }); assert.equal(result.ok, false); assert.equal(JSON.stringify(result).includes('private'), false);
  rejects(allDay({ startDate: 'not-a-date' }), 'INVALID_DATE', 'startDate');
  assert.equal(formatOffset(-300), 'UTC-05:00'); assert.equal(formatOffset(480), 'UTC+08:00'); assert.equal(formatOffset(0), 'UTC+00:00');
});
test('Formatter caching and strict maximum 129 format operations per endpoint', () => {
  let factories = 0; let formats = 0;
  const resolver = createZoneResolver(zone => {
    factories++; const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: zone, calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    return { resolvedOptions: () => formatter.resolvedOptions(), formatToParts: value => { formats++; return formatter.formatToParts(value); } };
  });
  assert.equal(validateEvent(timed(), resolver).ok, true); assert.equal(formats, 258); assert.equal(factories, 1);
  assert.equal(validateEvent(timed({ title: '' }), resolver).ok, false); assert.equal(formats, 258);
});
