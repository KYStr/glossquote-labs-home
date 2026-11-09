import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClock } from '../public/js/core/parse-clock.js';
import { parseDuration } from '../public/js/core/parse-duration.js';
import { createInitialDraft, validateDraft } from '../public/js/core/validation.js';
import { calculateSchedule } from '../public/js/core/schedule.js';
import { D, R, E, validRows, exampleDraft, normalizedExample } from './helpers.mjs';

const clockCases = [
  ['C01', '00:00', { ok: true, minuteOfDay: 0 }], ['C02', '23:59', { ok: true, minuteOfDay: 1439 }], ['C03', '09:00', { ok: true, minuteOfDay: 540 }],
  ...[['C04', '9:00'], ['C05', '24:00'], ['C06', '０９:００'], ['C07', '09：00'], ['C08', '09:00 ']].map(([id, raw]) => [id, raw, { ok: false, code: 'TIME_FORMAT' }])
];
for (const [id, raw, expected] of clockCases) test(id, () => assert.deepEqual(parseClock(raw), expected));
const durationCases = [
  ['C09', '0005', { ok: true, minutes: 5 }], ['C10', '720', { ok: true, minutes: 720 }],
  ...[['C11', ''], ['C12', '+5'], ['C13', '3.5'], ['C14', '５']].map(([id, raw]) => [id, raw, { ok: false, code: 'DURATION_FORMAT' }]),
  ['C15', '0', { ok: false, code: 'DURATION_RANGE' }], ['C16', '721', { ok: false, code: 'DURATION_RANGE' }]
];
for (const [id, raw, expected] of durationCases) test(id, () => assert.deepEqual(parseDuration(raw), expected));
test('C17', () => assert.deepEqual(createInitialDraft(), D('', '', false, [R('row-1', '', '', '')])));
test('C18', () => assert.deepEqual(validateDraft(exampleDraft()), { ok: true, value: normalizedExample }));
const invalidCases = [
  ['C22', D('00:00', '', false, [R('r1', 'A', '720'), R('r2', 'B', '720'), R('r3', 'C', '1')]), E('TOTAL_DURATION_EXCEEDED')],
  ['C24', D('09:00', '09:00'), E('TARGET_NOT_AFTER_START', 'targetTimeRaw')],
  ['C25', D('09:00', '08:59'), E('TARGET_NOT_AFTER_START', 'targetTimeRaw')],
  ['C26', D('09:00', '', true), E('TARGET_NEXT_DAY_WITHOUT_TARGET', 'targetNextDay')],
  ['C28', D('09:00', '10:00', false, []), E('ROW_COUNT', 'rows')],
  ['C29', D('09:00', '', false, validRows(61)), E('ROW_COUNT', 'rows')],
  ['C30', D('9:00', '24:00', false, [R('r1', '', '0')]), E('TIME_FORMAT', 'startTimeRaw')],
  ['C31', D('09:00', '24:00', false, [R('r1', 'A', '0')]), E('TIME_FORMAT', 'targetTimeRaw')],
  ['C32', D('09:00', '', false, [R('r1', 'A', 'x'), R('r2', '', '1')]), E('DURATION_FORMAT', 'rows[].durationMinutesRaw', 'r1')],
  ['C34', D('09:00', '', false, [R('r1', '   ')]), E('NAME_REQUIRED', 'rows[].nameRaw', 'r1')],
  ['C36', D('09:00', '', false, [R('r1', 'x'.repeat(81))]), E('NAME_TOO_LONG', 'rows[].nameRaw', 'r1')],
  ['C37', D('09:00', '', false, [R('r1', 'x'.repeat(257))]), E('RAW_TEXT_TOO_LONG', 'rows[].nameRaw', 'r1')],
  ['C39', D('09:00', '', false, [R('r1', 'A', '1', 'x'.repeat(161))]), E('NOTE_TOO_LONG', 'rows[].noteRaw', 'r1')],
  ['C40', D('09:00', '', false, [R('r1', 'A', '1', 'x'.repeat(257))]), E('RAW_TEXT_TOO_LONG', 'rows[].noteRaw', 'r1')],
  ['C41', D('09:00', '', false, [R('r1', 'A', '1', 'x\n')]), E('CONTROL_CHARACTER', 'rows[].noteRaw', 'r1')],
  ['C42', D('09:00', '', false, [R('r1', 'A', '1', 'x\u0085')]), E('CONTROL_CHARACTER', 'rows[].noteRaw', 'r1')],
  ['C43', D('09:00', '', false, [R('r1', 'A', '1', '\ud800')]), E('UNPAIRED_SURROGATE', 'rows[].noteRaw', 'r1')],
  ['C44', D('09:00', '', false, [R('r1', 'A', '1', '\udc00')]), E('UNPAIRED_SURROGATE', 'rows[].noteRaw', 'r1')],
  ['C47', D('09:00', '', false, [R('r1', '😀'.repeat(41))]), E('NAME_TOO_LONG', 'rows[].nameRaw', 'r1')],
  ['C48', Object.assign(D(), { debug: true }), E('UNKNOWN_FIELD')],
  ['C51', Object.assign(D(), { [Symbol('extra')]: true }), E('INVALID_SCHEMA')],
  ['C52', Object.defineProperty(D(), 'startTimeRaw', { enumerable: false }), E('INVALID_SCHEMA', 'startTimeRaw')],
  ['C53', D('09:00', '', false, Array(1)), E('INVALID_SCHEMA', 'rows')],
  ['C54', D('09:00', '', false, [Object.assign(R(), { extra: true })]), E('UNKNOWN_FIELD')],
  ['C56', D('09:00', '', false, [R('r/1')]), E('INVALID_ROW_ID', 'rows[].id')],
  ['C57', D('09:00', '', false, [R(), R()]), E('DUPLICATE_ROW_ID', 'rows[].id', 'r1')],
  ['C58', D('09:00', '', 'false'), E('INVALID_FIELD_TYPE', 'targetNextDay')],
  ['C59', D('09:00', '', false, [R('r1', 'A', 5)]), E('INVALID_FIELD_TYPE', 'rows[].durationMinutesRaw')]
];
for (const [id, input, expected] of invalidCases) test(id, () => assert.deepEqual(validateDraft(input), expected));
test('C33', () => assert.deepEqual(validateDraft(D('09:00', '', false, [R('r1', 'A', '0005')])), { ok: true, value: { startMinuteOfDay: 540, target: null, rows: [{ id: 'r1', name: 'A', durationMinutes: 5, note: '' }], totalMinutes: 5 } }));
for (const [id, name, note] of [['C35', 'x'.repeat(80), ''], ['C38', 'A', 'x'.repeat(160)], ['C45', 'A', '😀'], ['C46', '😀'.repeat(40), '']]) {
  test(id, () => assert.deepEqual(validateDraft(D('09:00', '', false, [R('r1', name, '1', note)])), { ok: true, value: { startMinuteOfDay: 540, target: null, rows: [{ id: 'r1', name, durationMinutes: 1, note }], totalMinutes: 1 } }));
}
test('C49', () => { const input = D(); delete input.targetNextDay; assert.deepEqual(validateDraft(input), E('MISSING_FIELD', 'targetNextDay')); });
test('C50', () => {
  let count = 0;
  const input = Object.defineProperty(D(), 'targetNextDay', { enumerable: true, get() { count++; return false; } });
  assert.deepEqual(validateDraft(input), E('INVALID_SCHEMA', 'targetNextDay'));
  assert.equal(count, 0);
});
test('C55', () => {
  let count = 0;
  const row = Object.defineProperty(R(), 'nameRaw', { enumerable: true, get() { count++; return 'A'; } });
  assert.deepEqual(validateDraft(D('09:00', '', false, [row])), E('INVALID_SCHEMA', 'rows[].nameRaw'));
  assert.equal(count, 0);
});
test('C60', () => {
  const row = Object.assign(Object.create(null), R());
  const input = Object.assign(Object.create(null), D('09:00', '', false, [row]));
  assert.deepEqual(validateDraft(input), { ok: true, value: { startMinuteOfDay: 540, target: null, rows: [{ id: 'r1', name: 'A', durationMinutes: 1, note: '' }], totalMinutes: 1 } });
});
test('C61', () => {
  const input = exampleDraft();
  input.rows.forEach(Object.freeze); Object.freeze(input.rows); Object.freeze(input);
  const root = Object.getOwnPropertyDescriptors(input);
  const rows = Object.getOwnPropertyDescriptors(input.rows);
  const descriptors = input.rows.map(row => Object.getOwnPropertyDescriptors(row));
  assert.deepEqual(validateDraft(input), { ok: true, value: normalizedExample });
  assert.deepEqual(Object.getOwnPropertyDescriptors(input), root);
  assert.deepEqual(Object.getOwnPropertyDescriptors(input.rows), rows);
  assert.deepEqual(input.rows.map(row => Object.getOwnPropertyDescriptors(row)), descriptors);
  const normalized = structuredClone(normalizedExample);
  const before = structuredClone(normalized);
  calculateSchedule(normalized);
  assert.deepEqual(normalized, before);
});
test('C62', () => {
  const input = D('09:00', '10:00', false, [R('r1', 'A', '0')]);
  assert.deepEqual(validateDraft(input), E('DURATION_RANGE', 'rows[].durationMinutesRaw', 'r1'));
  input.rows[0].durationMinutesRaw = '60';
  const valid = validateDraft(input);
  assert.equal(valid.ok, true); assert.equal(valid.value.totalMinutes, 60);
  const schedule = calculateSchedule(valid.value);
  assert.equal(schedule.endAbsoluteMinute, 600);
  assert.deepEqual(schedule.targetComparison, { targetAbsoluteMinute: 600, targetMinuteOfDay: 600, targetDayOffset: 0, differenceMinutes: 0, relation: 'on-time' });
});

test('Additional schema, order and raw boundaries', () => {
  assert.deepEqual(validateDraft(null), E('INVALID_SCHEMA'));
  assert.deepEqual(validateDraft(new (class Draft {})()), E('INVALID_SCHEMA'));
  assert.deepEqual(validateDraft(D(540)), E('INVALID_FIELD_TYPE', 'startTimeRaw'));
  assert.deepEqual(validateDraft(D('09:00', '', false, {})), E('INVALID_FIELD_TYPE', 'rows'));
  for (const alter of [rows => { rows.extra = true; }, rows => { rows[Symbol()] = true; }, rows => { Object.defineProperty(rows, '0', { enumerable: false }); }, rows => { Object.setPrototypeOf(rows, null); }]) {
    const input = D(); alter(input.rows); assert.deepEqual(validateDraft(input), E('INVALID_SCHEMA', 'rows'));
  }
  let count = 0;
  const input = D(); Object.defineProperty(input.rows, '0', { enumerable: true, get() { count++; return R(); } });
  assert.deepEqual(validateDraft(input), E('INVALID_SCHEMA', 'rows')); assert.equal(count, 0);
  const missing = R(); delete missing.noteRaw;
  assert.deepEqual(validateDraft(D('09:00', '', false, [missing])), E('MISSING_FIELD', 'rows[].noteRaw'));
  assert.deepEqual(validateDraft(D('9:00', '', false, [R('r1', 'A', '0'.repeat(257))])), E('RAW_TEXT_TOO_LONG', 'rows[].durationMinutesRaw', 'r1'));
  assert.deepEqual(validateDraft(D('09:00\n', '', false, [R('r1', 'x'.repeat(257))])), E('RAW_TEXT_TOO_LONG', 'rows[].nameRaw', 'r1'));
  assert.deepEqual(validateDraft(D('09:00', '', false, [R('r/1'), R('r2', 5)])), E('INVALID_FIELD_TYPE', 'rows[].nameRaw'));
  assert.deepEqual(validateDraft(D('09:00', '', false, validRows(60))).value.totalMinutes, 60);
  assert.equal(validateDraft(D('09:00', '', false, [R('r1', 'e\u0301', '0'.repeat(255) + '1', ' note ')])).value.rows[0].name, 'e\u0301');
  for (const raw of ['1e2', '-1', ' 1', '1 ', '1\n']) assert.deepEqual(parseDuration(raw), { ok: false, code: 'DURATION_FORMAT' });
});
