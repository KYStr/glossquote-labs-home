import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, validateResult } from '../public/js/core/validate-json.js';
import { result, one, many, encode } from './fixtures.mjs';

test('schema 1 round-trip shape, creation order and exact metadata are preserved', () => {
  const original = result([one('late', 20, 'note-000042'), one('early', 0, 'note-1000000')], 25, ' local recording ');
  assert.deepEqual(parseImport(encode(original)), { result: original });
  const checked = validateResult(original).result;
  checked.notes[0].text = 'changed copy';
  assert.equal(original.notes[0].text, 'late');
});

test('4 MiB import inclusive boundary; size checked before parsing', () => {
  const compact = encode(result([]));
  const exact = new Uint8Array(4194304).fill(32);
  exact.set(compact);
  assert.equal(parseImport(exact).result.sourceTitle, 'Interview recording');
  assert.deepEqual(parseImport(new Uint8Array(4194305)), { error: 'IMPORT_TOO_LARGE' });
});

test('fatal UTF-8 decoding, optional single BOM, malformed JSON and second BOM rejection', () => {
  const bytes = encode(result());
  const bom = Uint8Array.of(239, 187, 191);
  assert.deepEqual(parseImport(new Uint8Array([...bom, ...bytes])), { result: result() });
  assert.equal(parseImport(new Uint8Array([...bom, ...bom, ...bytes])).error, 'IMPORT_JSON');
  for (const bytes of [Uint8Array.of(0xc3, 0x28), Uint8Array.of(0xed, 0xa0, 0x80), Uint8Array.of(0xff)]) {
    assert.equal(parseImport(bytes).error, 'IMPORT_UTF8');
  }
  for (const text of ['', '{', 'undefined', '[]', 'null', 'true']) assert.ok(parseImport(encode(text)).error);
});

test('unknown root/note fields and missing keys reject entire result', () => {
  for (const key of ['schemaVersion', 'kind', 'sourceTitle', 'durationMs', 'notes']) {
    const changed = result(); delete changed[key];
    assert.equal(parseImport(encode(changed)).error, 'IMPORT_SCHEMA', key);
  }
  for (const key of ['noteId', 'timeMs', 'text']) {
    const changed = result(); delete changed.notes[0][key];
    assert.equal(parseImport(encode(changed)).error, 'IMPORT_SCHEMA', key);
  }
  for (const changed of [{ ...result(), file: 'fake' }, result([{ ...one(), mime: 'audio/wav' }])]) {
    assert.equal(parseImport(encode(changed)).error, 'IMPORT_SCHEMA');
  }
});

test('exact version/kind/types; safe integer duration and note range', () => {
  for (const [key, values] of [
    ['schemaVersion', ['1', 0, 2, null]], ['kind', ['other', null, 1]],
    ['durationMs', ['5', -1, 1.1, Number.MAX_SAFE_INTEGER + 1, null]], ['notes', [{}, null, '']]
  ]) {
    for (const value of values) assert.ok(parseImport(encode({ ...result(), [key]: value })).error, `${key}: ${value}`);
  }
  for (const time of [-1, 0.1, '0', null, Number.MAX_SAFE_INTEGER + 1, 3723005]) {
    assert.equal(parseImport(encode(result([one('x', time)]))).error, 'DURATION_RANGE');
  }
  assert.ok(parseImport(encode(result([one('x', 0)], 0))).result);
  assert.ok(parseImport(encode(result([one('x', Number.MAX_SAFE_INTEGER)], Number.MAX_SAFE_INTEGER))).result);
});

test('canonical IDs accepted, duplicates/noncanonical/overflow rejected', () => {
  for (const id of ['note-000001', 'note-1000000', 'note-999999999999']) {
    assert.ok(parseImport(encode(result([one('x', 0, id)]))).result);
  }
  for (const id of ['note-000000', 'note-0000001', 'note-1000000000000', 'note-00001', 'note-+00001', null]) {
    assert.equal(parseImport(encode(result([one('x', 0, id)]))).error, 'IMPORT_NOTE_ID');
  }
  assert.equal(parseImport(encode(result([one(), one()]))).error, 'IMPORT_NOTE_ID');
});

test('source title boundaries, multiline and control rejection', () => {
  assert.ok(parseImport(encode(result([], 0, '😀'.repeat(100)))).result);
  for (const title of ['', ' \t', 'a'.repeat(201), 'a\rb', 'a\nb', 'a\u0000', 'a\u007f', 'a\u0085', 'a\u2028', 'a\u2029', 1]) {
    assert.equal(parseImport(encode(result([], 0, title))).error, 'TITLE_INVALID');
  }
});

test('import note count, text units and total encoded bytes have independent inclusive limits', () => {
  assert.equal(validateResult(result(many(1000))).result.notes.length, 1000);
  assert.equal(validateResult(result(many(1001))).error, 'NOTE_LIMIT');
  assert.ok(validateResult(result([one('x'.repeat(2000))])).result);
  assert.equal(validateResult(result([one('x'.repeat(2001))])).error, 'NOTE_TOO_LONG');
  assert.equal(validateResult(result([one(' \n\t ')])).error, 'NOTE_EMPTY');
  assert.equal(validateResult(result([one(42)])).error, 'NOTE_EMPTY');
  const exact = [...many(524, 'x'.repeat(2000)), one('x'.repeat(576), 0, 'note-000525')];
  assert.ok(validateResult(result(exact)).result);
  exact[524].text += 'a';
  assert.equal(validateResult(result(exact)).error, 'NOTE_TOTAL_BYTES');
});
