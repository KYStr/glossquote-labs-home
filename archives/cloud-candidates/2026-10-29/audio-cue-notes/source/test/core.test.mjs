// 核心案例的預期值手寫，不從被測程式反推答案。
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, validTime, durationToMs, validateFile, parseTimestamp, formatTimestamp, normalizeText, snapshot, exportNotes } from '../public/core.mjs';
const doc = () => ({ durationMs: 90000, notes: [{ id: 1, timeMs: 1234, text: '重點\nNext line' }] });
const throws = (fn, code) => assert.throws(fn, { message: code });
test('timestamps exact boundaries and millisecond round trip', () => {
  for (const [text, ms] of [['00:00:00.000', 0], ['00:00:59.999', 59999], ['00:01:00.000', 60000], ['01:00:00.001', 3600001], ['24:00:00.000', 86400000]]) {
    assert.equal(parseTimestamp(text), ms); assert.equal(formatTimestamp(ms), text);
  }
});
for (const text of ['', '0:00:00.000', '00:60:00.000', '00:00:60.000', '00:00:00,000', ' 00:00:00.000', '００:00:00.000', '00:00:00.000\n']) test(`reject invalid timestamp ${JSON.stringify(text)}`, () => throws(() => parseTimestamp(text), 'TIME_FORMAT'));
test('timestamp duration upper bound inclusive', () => { assert.equal(parseTimestamp('00:00:01.000', 1000), 1000); throws(() => parseTimestamp('00:00:01.001', 1000), 'TIME_RANGE'); });
for (const value of [-1, -0, NaN, Infinity, 1.1, 86400001, '1']) test(`reject invalid ms ${String(value)}`, () => throws(() => validTime(value), 'TIME_RANGE'));
test('duration conversion floors and rejects invalid metadata', () => { assert.equal(durationToMs(1.2349), 1234); assert.equal(durationToMs(86400), 86400000); for (const v of [0, -1, 0.0001, Infinity, NaN, 86400.001, '3']) throws(() => durationToMs(v), 'DURATION'); });
test('file size inclusive and MIME fallback', () => { for (const [type, name] of [['audio/wav', 'anything'], ['', 'a.MP3']]) assert.equal(validateFile({ size: LIMITS.bytes, type, name }), true); for (const size of [0, -1, LIMITS.bytes + 1, Infinity, 1.5]) throws(() => validateFile({ size, type: 'audio/wav', name: 'a.wav' }), 'FILE_SIZE'); throws(() => validateFile({ size: 1, type: 'video/mp4', name: 'a.mp3' }), 'FILE_TYPE'); throws(() => validateFile({ size: 1, type: '', name: 'a.txt' }), 'FILE_TYPE'); });
test('notes normalize line endings and preserve safe text', () => { assert.equal(normalizeText(' <script>\r\n\t字\rline '), ' <script>\n\t字\nline '); assert.equal(normalizeText('a'.repeat(2000)).length, 2000); for (const v of ['', ' \t\n', 'a'.repeat(2001), '\u0000a', '\ud800', 'a\x7f']) throws(() => normalizeText(v), 'TEXT'); });
test('snapshot sorts immutable by time then original ID', () => { const input = { durationMs: 10, notes: [{ id: 3, timeMs: 10, text: 'c' }, { id: 2, timeMs: 1, text: 'b' }, { id: 1, timeMs: 1, text: 'a' }] }; const before = structuredClone(input); const result = snapshot(input); assert.deepEqual(result.notes.map(n => n.id), [1, 2, 3]); assert.deepEqual(input, before); result.notes[0].text = 'changed'; assert.deepEqual(input, before); });
test('schema rejects getter without running it', () => { let touched = false; const input = doc(); Object.defineProperty(input, 'notes', { get() { touched = true; return []; }, enumerable: true }); throws(() => snapshot(input), 'SCHEMA'); assert.equal(touched, false); });
test('array getter is not executed', () => { let touched = false; const input = doc(); Object.defineProperty(input.notes, '0', { get() { touched = true; }, enumerable: true }); throws(() => snapshot(input), 'SCHEMA'); assert.equal(touched, false); });
test('schema rejects extras symbols hidden fields custom prototypes and sparse arrays', () => {
  for (const mutate of [d => { d.extra = true; }, d => { d[Symbol()] = 1; }, d => Object.defineProperty(d.notes[0], 'extra', { value: 1 }), d => { d.notes = new Array(1); }, d => { d.notes.extra = true; }, d => Object.setPrototypeOf(d, { evil: true }), d => { d.notes[0].id = 0; }, d => d.notes.push({ ...d.notes[0] })]) { const input = doc(); mutate(input); throws(() => snapshot(input), 'SCHEMA'); }
});
test('notes limit 300 inclusive, zero duration and out of range rejected', () => { const input = { durationMs: 1, notes: Array.from({ length: 300 }, (_, i) => ({ id: i + 1, timeMs: 0, text: 'a' })) }; assert.equal(snapshot(input).notes.length, 300); input.notes.push({ id: 301, timeMs: 0, text: 'a' }); throws(() => snapshot(input), 'NOTES'); throws(() => snapshot({ durationMs: 0, notes: [] }), 'DURATION'); const over = doc(); over.notes[0].timeMs = 90001; throws(() => snapshot(over), 'TIME_RANGE'); });
test('TXT exact bytes in both languages and no BOM or trailing newline', () => {
  const en = 'Timestamped Audio Notes\nDuration: 00:01:30.000\n\n[00:00:01.234] 重點\nNext line';
  const zh = '錄音時間戳筆記\n音檔長度: 00:01:30.000\n\n[00:00:01.234] 重點\nNext line';
  assert.deepEqual(Buffer.from(exportNotes(doc(), 'en').txt), Buffer.from(en)); assert.deepEqual(Buffer.from(exportNotes(doc(), 'zh-Hant').txt), Buffer.from(zh));
});
test('JSON exact schema and safe round trip excludes IDs or file metadata', () => {
  const result = exportNotes(doc(), 'en');
  const expected = '{\n  "format": "glossquote-audio-cue-notes",\n  "version": 1,\n  "durationMs": 90000,\n  "notes": [\n    {\n      "timeMs": 1234,\n      "text": "重點\\nNext line"\n    }\n  ]\n}';
  assert.equal(result.json, expected); assert.equal(JSON.parse(result.json).notes[0].text, '重點\nNext line'); assert.equal(Object.isFrozen(result), true);
});
test('empty and unknown language exports rejected', () => { throws(() => exportNotes({ durationMs: 1, notes: [] }, 'en'), 'EMPTY'); throws(() => exportNotes(doc(), 'de'), 'LANGUAGE'); });
