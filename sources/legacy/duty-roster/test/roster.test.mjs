import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRoster } from '../public/js/core/roster.js';

const all = [1, 2, 3, 4, 5, 6, 7];
const person = (id = 'a', nameRaw = 'A', weekdays = all) => ({ id, nameRaw, weekdays: [...weekdays] });
const request = (overrides = {}) => ({ startRaw: '2026-10-19', endRaw: '2026-10-23', weekdays: [1, 2, 3, 4, 5], people: [person()], ...overrides });
const error = (code, path) => ({ ok: false, error: { code, path } });
const row = (date, weekday, personNumber, personId, personName) => ({ date, weekday, personNumber, personId, personName });
const count = (personNumber, personId, personName, count) => ({ personNumber, personId, personName, count });
const five = (partial = false) => ({ ok: true, days: [
  row('2026-10-19', 1, 1, 'a', 'A'), row('2026-10-20', 2, 2, 'b', 'B'),
  row('2026-10-21', 3, partial ? null : 1, partial ? null : 'a', partial ? null : 'A'),
  row('2026-10-22', 4, partial ? null : 2, partial ? null : 'b', partial ? null : 'B'),
  row('2026-10-23', 5, partial ? null : 1, partial ? null : 'a', partial ? null : 'A'),
], counts: [count(1, 'a', 'A', partial ? 1 : 3), count(2, 'b', 'B', partial ? 1 : 2)], assignedCount: partial ? 2 : 5, unassignedCount: partial ? 3 : 0, totalDays: 5 });

test('C01: weekday availability, exact five rows and counts', () => assert.deepEqual(calculateRoster(request({ people: [person('a', 'A', [1, 3, 5]), person('b', 'B', [2, 4])] })), five()));
test('C02: both members available on all weekdays', () => assert.deepEqual(calculateRoster(request({ people: [person(), person('b', 'B')] })), five()));
test('C03: all three gaps retained', () => assert.deepEqual(calculateRoster(request({ people: [person('a', 'A', [1]), person('b', 'B', [2])] })), five(true)));
test('C04: unordered weekdays, inclusive endpoints and sorted dates', () => assert.deepEqual(calculateRoster(request({ weekdays: [5, 1] })), { ok: true, days: [row('2026-10-19', 1, 1, 'a', 'A'), row('2026-10-23', 5, 1, 'a', 'A')], counts: [count(1, 'a', 'A', 2)], assignedCount: 2, unassignedCount: 0, totalDays: 2 }));
test('C05: one leap date', () => assert.deepEqual(calculateRoster(request({ startRaw: '2024-02-29', endRaw: '2024-02-29', weekdays: [4] })), { ok: true, days: [row('2024-02-29', 4, 1, 'a', 'A')], counts: [count(1, 'a', 'A', 1)], assignedCount: 1, unassignedCount: 0, totalDays: 1 }));
test('C06: across leap day', () => assert.deepEqual(calculateRoster(request({ startRaw: '2024-02-28', endRaw: '2024-03-01', weekdays: [3, 4, 5] })), { ok: true, days: [row('2024-02-28', 3, 1, 'a', 'A'), row('2024-02-29', 4, 1, 'a', 'A'), row('2024-03-01', 5, 1, 'a', 'A')], counts: [count(1, 'a', 'A', 3)], assignedCount: 3, unassignedCount: 0, totalDays: 3 }));
test('C07: non-leap day invalid', () => assert.deepEqual(calculateRoster(request({ startRaw: '2023-02-29' })), error('START_DATE_INVALID', '/startRaw')));
test('C08: all 366 dates of independent hand-written 2024 calendar', () => {
  // Fixed calendar fixture; no date parser or helper under test constructs expected dates.
  const calendar = [
    ['01', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31'],
    ['02', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29'],
    ['03', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31'],
    ['04', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30'],
    ['05', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31'],
    ['06', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30'],
    ['07', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31'],
    ['08', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31'],
    ['09', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30'],
    ['10', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31'],
    ['11', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30'],
    ['12', '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31'],
  ].flatMap(([month, days]) => days.split(' ').map(day => `2024-${month}-${day}`));
  const expected = { ok: true, days: calendar.map((date, i) => row(date, i % 7 + 1, 1, 'a', 'A')), counts: [count(1, 'a', 'A', 366)], assignedCount: 366, unassignedCount: 0, totalDays: 366 };
  assert.deepEqual(calculateRoster(request({ startRaw: '2024-01-01', endRaw: '2024-12-31', weekdays: all })), expected);
});
test('C09: 367 day span rejected', () => assert.deepEqual(calculateRoster(request({ startRaw: '2024-01-01', endRaw: '2025-01-01' })), error('DATE_SPAN_LIMIT', '/endRaw')));
test('C10: no selected duty dates', () => assert.deepEqual(calculateRoster(request({ endRaw: '2026-10-19', weekdays: [2] })), error('NO_DUTY_DATES', '/weekdays')));
test('C11: empty root weekdays', () => assert.deepEqual(calculateRoster(request({ weekdays: [] })), error('WEEKDAYS_EMPTY', '/weekdays')));
test('C12: duplicate root weekday', () => assert.deepEqual(calculateRoster(request({ weekdays: [1, 1] })), error('WEEKDAY_DUPLICATE', '/weekdays/1')));
test('C13: unavailable every day is a valid partial result', () => assert.deepEqual(calculateRoster(request({ people: [person('a', 'A', [])] })), { ok: true, days: [row('2026-10-19', 1, null, null, null), row('2026-10-20', 2, null, null, null), row('2026-10-21', 3, null, null, null), row('2026-10-22', 4, null, null, null), row('2026-10-23', 5, null, null, null)], counts: [count(1, 'a', 'A', 0)], assignedCount: 0, unassignedCount: 5, totalDays: 5 }));
test('C14: duplicate names distinguished by member number', () => assert.deepEqual(calculateRoster(request({ endRaw: '2026-10-20', weekdays: [1, 2], people: [person('a', 'Kai'), person('b', 'Kai')] })), { ok: true, days: [row('2026-10-19', 1, 1, 'a', 'Kai'), row('2026-10-20', 2, 2, 'b', 'Kai')], counts: [count(1, 'a', 'Kai', 1), count(2, 'b', 'Kai', 1)], assignedCount: 2, unassignedCount: 0, totalDays: 2 }));
test('C15: unknown root key precedes invalid dates', () => assert.deepEqual(calculateRoster(request({ extra: true, startRaw: '' })), error('REQUEST_SCHEMA', '/')));
test('C16: getter never executed', () => { let calls = 0; const input = request(); Object.defineProperty(input, 'startRaw', { enumerable: true, get() { calls++; return ''; } }); assert.deepEqual(calculateRoster(input), error('REQUEST_SCHEMA', '/')); assert.equal(calls, 0); });
test('C17: symbol and hidden unknown keys', () => { for (const key of [Symbol('extra'), 'hidden']) { const input = request(); Object.defineProperty(input, key, { value: 'fake' }); assert.deepEqual(calculateRoster(input), error('REQUEST_SCHEMA', '/')); } });
test('C18: sparse and custom weekdays arrays', () => { for (const days of [[, 1], Object.assign([1], { custom: true }), Object.assign([1], { [Symbol('x')]: 1 })]) assert.deepEqual(calculateRoster(request({ weekdays: days })), error('WEEKDAYS_SCHEMA', '/weekdays')); });
test('C19: people array shape', () => { for (const people of [{}, [, person()], Object.assign([person()], { custom: true })]) assert.deepEqual(calculateRoster(request({ people })), error('PEOPLE_SCHEMA', '/people')); });
test('C20: id invalid inputs including final line terminators', () => { for (const id of ['a b', '甲', 'x'.repeat(41), '', 1, 'a\n', 'a\r\n', 'a\u2028']) assert.deepEqual(calculateRoster(request({ people: [person(id)] })), error('PERSON_ID_INVALID', '/people/0/id')); });
test('C21: id duplicate is case sensitive', () => { assert.deepEqual(calculateRoster(request({ people: [person(), person('a', 'B')] })), error('PERSON_ID_DUPLICATE', '/people/1/id')); assert.equal(calculateRoster(request({ people: [person(), person('A', 'B')] })).ok, true); });
test('C22: C0/C1 controls rejected without echo', () => { for (const name of ['fake\nsecret', 'fake\u0000secret', '\u007f', '\u009f', '\tA']) assert.deepEqual(calculateRoster(request({ people: [person('a', name)] })), error('PERSON_NAME_CONTROL', '/people/0/nameRaw')); });
test('C23: lone high and low surrogates', () => { for (const name of ['\ud800', '\udfff', 'A\ud800X', '😀\udc00']) assert.deepEqual(calculateRoster(request({ people: [person('a', name)] })), error('PERSON_NAME_SURROGATE', '/people/0/nameRaw')); });
test('C24: 80 emoji code points with trimming', () => { const name = '😀'.repeat(80); const actual = calculateRoster(request({ endRaw: '2026-10-19', people: [person('a', `  ${name}  `)] })); assert.deepEqual(actual, { ok: true, days: [row('2026-10-19', 1, 1, 'a', name)], counts: [count(1, 'a', name, 1)], assignedCount: 1, unassignedCount: 0, totalDays: 1 }); });
test('C25: 81 code points rejected', () => assert.deepEqual(calculateRoster(request({ people: [person('a', '😀'.repeat(81))] })), error('PERSON_NAME_TOO_LONG', '/people/0/nameRaw')));
test('C26: 0, 31, 1 and 30 member boundaries', () => {
  for (const n of [0, 31]) assert.deepEqual(calculateRoster(request({ people: Array.from({ length: n }, (_, i) => person(`p${i}`)) })), error('PEOPLE_COUNT', '/people'));
  const people = Array.from({ length: 30 }, (_, i) => person(`p${i + 1}`, `M${i + 1}`));
  const actual = calculateRoster(request({ endRaw: '2026-10-19', people }));
  assert.deepEqual(actual, { ok: true, days: [row('2026-10-19', 1, 1, 'p1', 'M1')], counts: people.map((p, i) => count(i + 1, p.id, p.nameRaw, i === 0 ? 1 : 0)), assignedCount: 1, unassignedCount: 0, totalDays: 1 });
});
test('C27: first-error priority before weekday and people', () => { for (const [startRaw, code] of [['2026-1-01', 'START_DATE_FORMAT'], ['2026-02-30', 'START_DATE_INVALID']]) assert.deepEqual(calculateRoster(request({ startRaw, weekdays: [], people: [] })), error(code, '/startRaw')); });
test('C32: frozen data untouched and deterministic key order', () => {
  const input = request({ people: [person(), person('b', 'B')] });
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const before = JSON.stringify(input); freeze(input);
  const actual = calculateRoster(input);
  assert.deepEqual(actual, five()); assert.equal(JSON.stringify(input), before); assert.equal(JSON.stringify(calculateRoster(input)), JSON.stringify(actual));
  assert.deepEqual(Object.keys(actual), ['ok', 'days', 'counts', 'assignedCount', 'unassignedCount', 'totalDays']);
  assert.deepEqual(Object.keys(actual.days[0]), ['date', 'weekday', 'personNumber', 'personId', 'personName']);
});

test('all remaining date codes and Gregorian century boundaries', () => {
  for (const [raw, issue] of [[null, 'FORMAT'], [' 2026-10-19', 'FORMAT'], ['26-10-19', 'FORMAT'], ['0000-01-01', 'INVALID'], ['1900-02-29', 'INVALID'], ['2000-02-30', 'INVALID'], ['1899-12-31', 'RANGE'], ['2100-01-01', 'RANGE'], ['2026-00-01', 'INVALID'], ['2026-01-00', 'INVALID'], ['2026-13-01', 'INVALID']]) {
    assert.deepEqual(calculateRoster(request({ startRaw: raw })), error(`START_DATE_${issue}`, '/startRaw'));
    assert.deepEqual(calculateRoster(request({ endRaw: raw })), error(`END_DATE_${issue}`, '/endRaw'));
  }
  assert.deepEqual(calculateRoster(request({ endRaw: '2026-10-18' })), error('DATE_ORDER', '/endRaw'));
  for (const [raw, weekday] of [['1900-01-01', 1], ['2000-02-29', 2], ['2099-12-31', 4]]) {
    assert.deepEqual(calculateRoster(request({ startRaw: raw, endRaw: raw, weekdays: all })), { ok: true, days: [row(raw, weekday, 1, 'a', 'A')], counts: [count(1, 'a', 'A', 1)], assignedCount: 1, unassignedCount: 0, totalDays: 1 });
  }
});
test('person shapes, name error ordering, availability validation and non-normalization', () => {
  for (const item of [{ ...person(), extra: true }, Object.create(null), null]) assert.deepEqual(calculateRoster(request({ people: [item] })), error('PERSON_SCHEMA', '/people/0'));
  for (const [name, suffix] of [[null, 'TYPE'], ['x'.repeat(513), 'RAW_LIMIT'], ['   ', 'EMPTY']]) assert.deepEqual(calculateRoster(request({ people: [person('a', name)] })), error(`PERSON_NAME_${suffix}`, '/people/0/nameRaw'));
  for (const days of [[, 1], Object.assign([1], { extra: 1 }), Array(8).fill(1)]) assert.deepEqual(calculateRoster(request({ people: [{ ...person(), weekdays: days }] })), error('PERSON_WEEKDAYS_SCHEMA', '/people/0/weekdays'));
  for (const value of [0, 8, 1.5, '1', NaN]) {
    assert.deepEqual(calculateRoster(request({ weekdays: [value] })), error('WEEKDAY_INVALID', '/weekdays/0'));
    assert.deepEqual(calculateRoster(request({ people: [person('a', 'A', [value])] })), error('PERSON_WEEKDAY_INVALID', '/people/0/weekdays/0'));
  }
  assert.deepEqual(calculateRoster(request({ people: [person('a', 'A', [1, 1])] })), error('PERSON_WEEKDAY_DUPLICATE', '/people/0/weekdays/1'));
  const name = 'e\u0301  X'; assert.equal(calculateRoster(request({ people: [person('a', ` ${name} `)] })).counts[0].personName, name);
});
test('cursor advances after the selected member; no-candidate dates keep cursor', () => {
  const input = request({ endRaw: '2026-10-22', people: [person('a', 'A', [3, 4]), person('b', 'B', [1, 3, 4]), person('c', 'C', [3, 4])] });
  assert.deepEqual(calculateRoster(input), { ok: true, days: [row('2026-10-19', 1, 2, 'b', 'B'), row('2026-10-20', 2, null, null, null), row('2026-10-21', 3, 3, 'c', 'C'), row('2026-10-22', 4, 1, 'a', 'A')], counts: [count(1, 'a', 'A', 1), count(2, 'b', 'B', 1), count(3, 'c', 'C', 1)], assignedCount: 3, unassignedCount: 1, totalDays: 4 });
});
