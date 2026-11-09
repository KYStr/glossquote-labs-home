import test from 'node:test';
import assert from 'node:assert/strict';
import {
  durationToMs, captureTimeMs, createDraft, commitDraft, editNote, validateNote,
  formatNoteId, noteIdValue, nextNoteIdCounter, sortForDisplay, parseDuration, formatTime, noteBytes
} from '../public/js/core/notes.js';
import { one, many } from './fixtures.mjs';

test('duration floors to integer milliseconds; invalid or unsafe duration fails closed', () => {
  assert.equal(durationToMs(123.4569), 123456);
  assert.equal(durationToMs(0), 0);
  for (const value of [Infinity, NaN, -1, -Infinity, Number.MAX_SAFE_INTEGER, '123', null]) {
    assert.deepEqual(durationToMs(value), { error: 'invalid-duration' });
  }
});

test('capture oracle 12.345 seconds, rounding, clamping and invalid inputs', () => {
  assert.equal(captureTimeMs(12.345, 123456), 12345);
  assert.equal(captureTimeMs(12.3456, 123456), 12346);
  assert.equal(captureTimeMs(999, 123456), 123456);
  assert.equal(captureTimeMs(Number.MAX_VALUE, 123456), 123456);
  for (const value of [NaN, Infinity, -1, '12']) assert.deepEqual(captureTimeMs(value, 123456), { error: 'invalid-time' });
  for (const value of [-1, 1.2, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(captureTimeMs(1, value).error, 'invalid-time');
});

test('duration field grammar and exact time display', () => {
  assert.equal(parseDuration('01:02:03.004'), 3723004);
  assert.equal(parseDuration('00:00:00.000'), 0);
  assert.equal(parseDuration('99999999:59:59.999'), 359999999999999);
  for (const text of ['1:02:03.004', '001:60:03.004', '01:02:60.000', '01:02:03.04', '01:02:03.0000', '100000000:00:00.000', ' 00:00:00.000', '00:00:00.000\n']) {
    assert.equal(parseDuration(text).error, 'DURATION_FORMAT', text);
  }
  assert.equal(formatTime(12345), '00:12.345');
  assert.equal(formatTime(3723004), '01:02:03.004');
  assert.equal(formatTime(12345, true), '00:00:12.345');
  assert.equal(formatTime(0), '00:00.000');
});

test('draft is immutable, separate from notes; save preserves original text and creates first ID', () => {
  const notes = [];
  const draft = createDraft(12345, 20000);
  assert.equal(Object.isFrozen(draft), true);
  assert.deepEqual(notes, []);
  assert.deepEqual(commitDraft(notes, draft, 1, '  重點 e\u0301\r\n ', 20000), {
    notes: [one('  重點 e\u0301\r\n ', 12345)], nextCounter: 2
  });
  assert.deepEqual(notes, []);
  assert.equal(createDraft(20001, 20000).error, 'DURATION_RANGE');
  assert.equal(commitDraft(notes, null, 1, 'x', 20000).error, 'DURATION_RANGE');
  assert.equal(commitDraft(notes, draft, 1, ' \t\n ', 20000).error, 'NOTE_EMPTY');
});

test('per-note boundary counts UTF-16 units, not Unicode points', () => {
  assert.equal(validateNote('x'.repeat(2000), []).ok, true);
  assert.equal(validateNote('x'.repeat(2001), []).code, 'NOTE_TOO_LONG');
  assert.equal(validateNote('😀'.repeat(1000), []).ok, true);
  assert.equal(validateNote('😀'.repeat(1000) + 'a', []).code, 'NOTE_TOO_LONG');
});

test('1,000-note boundary, edits at quota and rejected saves do not mutate notes', () => {
  const notes = many(999);
  const committed = commitDraft(notes, createDraft(0, 0), 1000, 'last', 0);
  assert.equal(committed.notes.length, 1000);
  assert.equal(notes.length, 999);
  const frozenBefore = structuredClone(committed.notes);
  assert.equal(commitDraft(committed.notes, createDraft(0, 0), 1001, 'overflow', 0).error, 'NOTE_LIMIT');
  assert.deepEqual(committed.notes, frozenBefore);
  assert.equal(editNote(committed.notes, 'note-000001', 'revised').notes[0].text, 'revised');
});

test('exact 1 MiB UTF-8 total is accepted; one more byte rejected, including editing', () => {
  const notes = many(524, 'x'.repeat(2000));
  assert.equal(noteBytes(notes), 1048000);
  assert.equal(validateNote('x'.repeat(576), notes).ok, true);
  assert.equal(validateNote('x'.repeat(577), notes).code, 'NOTE_TOTAL_BYTES');
  const full = [...notes, one('x'.repeat(576), 0, 'note-000525')];
  assert.equal(noteBytes(full), 1048576);
  assert.equal(editNote(full, 'note-000525', 'x'.repeat(577)).error, 'NOTE_TOTAL_BYTES');
  assert.equal(validateNote('漢', notes).ok, true);
  assert.equal(noteBytes([one('漢😀')]), 7);
});

test('canonical note IDs 6–12 digits only, monotonic counter, no reuse or collision', () => {
  for (const [value, id] of [[1, 'note-000001'], [42, 'note-000042'], [1000000, 'note-1000000'], [999999999999, 'note-999999999999']]) {
    assert.equal(formatNoteId(value), id);
    assert.equal(noteIdValue(id), value);
  }
  for (const id of ['note-000000', 'note-0000001', 'note-00001', 'note-1000000000000', 'note-+00001', 'note-000042\n', 1]) assert.equal(noteIdValue(id), null);
  assert.equal(nextNoteIdCounter([]), 1);
  assert.equal(nextNoteIdCounter([one('x', 0, 'note-000042')]), 43);
  const notes = [one('x', 0, 'note-000042')];
  assert.equal(commitDraft(notes, { timeMs: 0 }, 42, 'bad counter', 0).error, 'NOTE_ID_EXHAUSTED');
  assert.equal(commitDraft(notes, { timeMs: 0 }, 1000000000000, 'exhausted', 0).error, 'NOTE_ID_EXHAUSTED');
  assert.deepEqual(notes, [one('x', 0, 'note-000042')]);
});

test('display order is stable at equal timestamps without modifying creation order', () => {
  const notes = [one('later', 100, 'note-000001'), one('A', 0, 'note-000002'), one('B', 0, 'note-000003')];
  assert.deepEqual(sortForDisplay(notes).map(note => note.text), ['A', 'B', 'later']);
  assert.deepEqual(notes.map(note => note.text), ['later', 'A', 'B']);
});
