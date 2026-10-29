import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAgenda, toMinuteOfDay, TimeError } from '../public/js/core/validate.mjs';
import { session, rawAgenda, validated } from './fixtures.mjs';

function rejects(raw, code, field) {
  const result = validateAgenda(raw);
  assert.equal(result.ok, false);
  assert.equal(result.agenda, null);
  assert.ok(result.errors.some(error => error.code === code && (!field || error.field === field)), JSON.stringify(result.errors));
  for (const error of result.errors) {
    assert.deepEqual(Object.keys(error), ['row', 'sessionId', 'field', 'code', 'index']);
    assert.equal(typeof error.code, 'string');
  }
}

test('A11 accepts the full single civil day [0,1439)', () => {
  const agenda = validated(rawAgenda([session('A', { start: '00:00', end: '23:59' })]));
  assert.equal(agenda.sessions[0].startMinute, 0);
  assert.equal(agenda.sessions[0].endMinute, 1439);
});

for (const value of ['24:00', '9:00', '12:60', '', ' 09:00', '09:00\n', '０９:００', '09:00:00', null, 900]) {
  test(`A12 rejects lexical time ${JSON.stringify(value)}`, () => {
    assert.throws(() => toMinuteOfDay(value), TimeError);
    rejects(rawAgenda([session('A', { start: value })]), 'TIME_FORMAT', 'start');
    rejects(rawAgenda([session('A', { end: value })]), 'TIME_FORMAT', 'end');
  });
}
for (const [start, end] of [['09:00', '09:00'], ['23:00', '01:00']]) {
  test(`A12 rejects non-increasing ${start}/${end}`, () => rejects(rawAgenda([session('A', { start, end })]), 'END_AFTER_START', 'end'));
}

test('A13 accepts all maxima together and never mutates source', () => {
  const raw = rawAgenda(Array.from({ length: 200 }, (_, index) => session(`S${index}`, { roomIndex: 19, speakerIndexes: [99, 4, 3, 2, 1] })), {
    rooms: Array.from({ length: 20 }, (_, i) => `R${i}`), speakers: Array.from({ length: 100 }, (_, i) => `Speaker ${i}`)
  });
  const before = structuredClone(raw);
  assert.equal(validated(raw).sessions.length, 200);
  assert.deepEqual(raw, before);
});

test('A13 rejects each count over cap and does not traverse oversized arrays', () => {
  rejects(rawAgenda(Array.from({ length: 201 }, (_, i) => session(`S${i}`))), 'SESSION_COUNT');
  rejects(rawAgenda([], {}), 'SESSION_COUNT');
  rejects(rawAgenda(undefined, { rooms: Array(21).fill('R') }), 'ROOM_COUNT');
  rejects(rawAgenda(undefined, { speakers: Array(101).fill('S') }), 'SPEAKER_COUNT');
  rejects(rawAgenda([session('A', { speakerIndexes: [0, 1, 2, 3, 4, 5] })], { speakers: ['a', 'b', 'c', 'd', 'e', 'f'] }), 'SPEAKER_REFERENCES');
  const tooMany = Array(201);
  Object.defineProperty(tooMany, 0, { get() { throw new Error('Member must not be read'); } });
  rejects(rawAgenda(tooMany), 'SESSION_COUNT');
});

test('A14 duplicates and invalid references reject the complete input', () => {
  rejects(rawAgenda([session('A'), session('A')]), 'DUPLICATE_ID', 'id');
  rejects(rawAgenda(undefined, { rooms: [' Caf\u00e9 ', 'Cafe\u0301'] }), 'DUPLICATE_NAME', 'rooms');
  rejects(rawAgenda(undefined, { speakers: ['S', ' S '] }), 'DUPLICATE_NAME', 'speakers');
  rejects(rawAgenda([session('A', { speakerIndexes: [0, 0] })]), 'DUPLICATE_SPEAKER');
  for (const roomIndex of [2, -1, 0.5, '0', undefined]) rejects(rawAgenda([session('A', { roomIndex })]), 'ROOM_REFERENCE');
  for (const speakerIndexes of [[-1], [3], [0.5], ['0'], Array(1), null]) rejects(rawAgenda([session('A', { speakerIndexes })]), Array.isArray(speakerIndexes) ? 'SPEAKER_REFERENCE' : 'SPEAKER_REFERENCES');
});

test('A14 canonical registry is NFC + trim, case-sensitive and does not split punctuation', () => {
  const agenda = validated(rawAgenda([session('A', { speakerIndexes: [1], roomIndex: 0 })], {
    rooms: [' Cafe\u0301 ', 'café'], speakers: ['Alex, Jr.; 李', ' Alex, Jr.; li ']
  }));
  assert.deepEqual(agenda.rooms, ['Café', 'café']);
  assert.deepEqual(agenda.speakers, ['Alex, Jr.; 李', 'Alex, Jr.; li']);
  assert.deepEqual(agenda.sessions[0].speakerIndexes, [1]);
});

test('unassigned resources and zero registries are legal and explicit', () => {
  const agenda = validated(rawAgenda([session('A', { roomIndex: null, speakerIndexes: [] })], { rooms: [], speakers: [] }));
  assert.equal(agenda.sessions[0].roomIndex, null);
  assert.deepEqual(agenda.sessions[0].speakerIndexes, []);
});

test('A15 omitted transition defaults to 10; only integer 0..120 accepted', () => {
  const omitted = rawAgenda();
  delete omitted.transitionMinutes;
  assert.equal(validated(omitted).transitionMinutes, 10);
  for (const value of [0, 120]) assert.equal(validated(rawAgenda(undefined, { transitionMinutes: value })).transitionMinutes, value);
  for (const value of [121, -1, 1.5, '10', null, undefined, NaN, Infinity, true]) rejects(rawAgenda(undefined, { transitionMinutes: value }), 'TRANSITION');
});

test('scalar bounds accept emoji and reject oversized names/titles/IDs', () => {
  const agenda = validated(rawAgenda([session('A'.repeat(32), { title: '😀'.repeat(160) })], { rooms: ['😀'.repeat(80)] }));
  assert.equal([...agenda.sessions[0].title].length, 160);
  rejects(rawAgenda([session('A'.repeat(33))]), 'ID_FORMAT');
  rejects(rawAgenda([session('A', { title: '😀'.repeat(161) })]), 'TITLE');
  rejects(rawAgenda(undefined, { rooms: ['😀'.repeat(81)] }), 'NAME');
  rejects(rawAgenda([session(' A ')]), 'ID_FORMAT');
  rejects(rawAgenda([session('A', { title: '   ' })]), 'TITLE');
});

for (const forbidden of ['\u0000', '\t', '\n', '\r', '\u007f', '\u0085', '\u009f', '\u2028', '\u2029', '\ud800', '\udfff']) {
  test(`rejects control/unpaired scalar U+${forbidden.charCodeAt(0).toString(16)}`, () => {
    rejects(rawAgenda([session('A', { title: `x${forbidden}` })]), 'TITLE');
    rejects(rawAgenda(undefined, { rooms: [`${forbidden}x`] }), 'NAME');
    rejects(rawAgenda(undefined, { speakers: [`x${forbidden}`] }), 'NAME');
    rejects(rawAgenda([session(`A${forbidden}`)]), 'ID_FORMAT');
  });
}

test('exact input schemas reject unknown fields, missing members and sparse session arrays', () => {
  rejects(null, 'SCHEMA');
  rejects(rawAgenda(undefined, { date: '2026-01-01' }), 'UNKNOWN_FIELD');
  rejects(rawAgenda([session('A', { timezone: 'UTC' })]), 'UNKNOWN_FIELD');
  const missing = session('A');
  delete missing.speakerIndexes;
  rejects(rawAgenda([missing]), 'SCHEMA');
  rejects(rawAgenda(Array(1)), 'SCHEMA');
  rejects(rawAgenda(undefined, { rooms: Array(1) }), 'NAME');
});

test('errors locate row/session/field without copying invalid title or raw values', () => {
  const canary = 'SYNTHETIC_PRIVATE_TITLE\n';
  const result = validateAgenda(rawAgenda([session('A'), session('B', { title: canary })]));
  assert.deepEqual(result.errors, [{ row: 2, sessionId: 'B', field: 'title', code: 'TITLE', index: null }]);
  assert.equal(JSON.stringify(result.errors).includes(canary), false);
});
