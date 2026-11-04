import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeJson, checkExportBytes } from '../public/js/core/serialize-json.js';
import { serializeMarkdown } from '../public/js/core/serialize-markdown.js';
import { parseImport } from '../public/js/core/validate-json.js';
import { Downloads } from '../public/js/downloads.js';
import { result, one, many, exactExportResult } from './fixtures.mjs';
const decode = bytes => new TextDecoder().decode(bytes);

test('exact Markdown oracle: timestamps, stable order, CRLF/CR/LF indentation and final LF', () => {
  const input = result([
    one('last', 3723004), one('A\r\nline2\rline3\nline4', 12345, 'note-000002'),
    one('<script>alert("fake")</script>', 12345, 'note-000003')
  ]);
  const expected = '# Interview recording\nDuration: 01:02:03.004\n\n' +
    '[00:12.345] A\n    line2\n    line3\n    line4\n' +
    '[00:12.345] <script>alert("fake")</script>\n[01:02:03.004] last\n';
  assert.equal(decode(serializeMarkdown(input)), expected);
  assert.deepEqual([...serializeMarkdown(input).slice(0, 3)], [35, 32, 73]);
  assert.equal(decode(serializeMarkdown(result([], 0))), '# Interview recording\nDuration: 00:00:00.000\n\n');
});

test('exact JSON oracle: ordered keys, creation order, UTF-8 without BOM, audio metadata absent', () => {
  const input = result([one('late', 20, 'note-000042'), one('早', 0, 'note-000043')], 20, 'Local');
  const expected = '{\n  "schemaVersion": 1,\n  "kind": "glossquote-audio-cue-notes",\n  "sourceTitle": "Local",\n  "durationMs": 20,\n  "notes": [\n' +
    '    {\n      "noteId": "note-000042",\n      "timeMs": 20,\n      "text": "late"\n    },\n' +
    '    {\n      "noteId": "note-000043",\n      "timeMs": 0,\n      "text": "早"\n    }\n  ]\n}\n';
  const actual = serializeJson(input);
  assert.deepEqual(actual, new TextEncoder().encode(expected));
  assert.deepEqual(parseImport(actual), { result: input });
  assert.deepEqual(Object.keys(JSON.parse(decode(actual))), ['schemaVersion', 'kind', 'sourceTitle', 'durationMs', 'notes']);
  assert.deepEqual(Object.keys(JSON.parse(decode(actual)).notes[0]), ['noteId', 'timeMs', 'text']);
  assert.equal(/blob:|mime|lastModified|filePath|audioData/i.test(decode(actual)), false);
});

test('both serializers reject invalid title and unpaired surrogate instead of silent UTF-8 replacement', () => {
  for (const value of [result([], 0, 'bad\nTitle'), result([], 0, '\ud800'), result([one('text\udfff')]), result([one('x', 4)], 3)]) {
    assert.equal(serializeJson(value).error, 'INVALID_RESULT');
    assert.equal(serializeMarkdown(value).error, 'INVALID_RESULT');
  }
});

test('common export guard accepts exactly 4,194,304 bytes and rejects one more', () => {
  const exact = new Uint8Array(4194304);
  assert.equal(checkExportBytes(exact), exact);
  assert.deepEqual(checkExportBytes(new Uint8Array(4194305)), { error: 'EXPORT_TOO_LARGE' });
});

test('valid JSON export exactly 4 MiB can re-import; one extra escaped-output byte is rejected', () => {
  const input = exactExportResult();
  // Fixed pretty-JSON overhead is 56,141 bytes for these 700 notes and metadata.
  // 689,693 U+0001 characters escape to six bytes each, plus five ASCII bytes:
  // 56,141 + 689,693 * 6 + 5 = 4,194,304. No expected value comes from the serializer.
  const bytes = serializeJson(input);
  assert.equal(bytes.byteLength, 4194304);
  assert.deepEqual(parseImport(bytes), { result: input });
  assert.ok(serializeMarkdown(input).byteLength + bytes.byteLength <= 8388608);
  input.notes[699].text += 'x';
  assert.deepEqual(serializeJson(input), { error: 'EXPORT_TOO_LARGE' });
});

test('valid control-text JSON expands past cap; Markdown remains below cap for same fixture', () => {
  const input = result(many(700, '\u0001'.repeat(1000)), 0);
  assert.equal(serializeJson(input).error, 'EXPORT_TOO_LARGE');
  const markdown = serializeMarkdown(input);
  // 46-byte header + 700 * (12-byte timestamp/prefix + 1,000 bytes + LF).
  assert.equal(markdown.byteLength, 709146);
  assert.ok(markdown.byteLength <= 4194304);
});

test('largest UTF-8 note budget with ordinary text fits both files and 8 MiB combined', () => {
  const input = result([...many(524, 'x'.repeat(2000)), one('x'.repeat(576), 0, 'note-000525')], 0);
  const markdown = serializeMarkdown(input);
  const json = serializeJson(input);
  assert.ok(markdown.byteLength <= 4194304);
  assert.ok(json.byteLength <= 4194304);
  assert.ok(markdown.byteLength + json.byteLength <= 8388608);
  assert.deepEqual(parseImport(json), { result: input });
});

test('newline expansion also obeys Markdown cap and returns no partial content', () => {
  const input = result([...many(524, `x${'\n'.repeat(1999)}`), one(`x${'\n'.repeat(575)}`, 0, 'note-000525')], 0);
  assert.equal(serializeMarkdown(input).error, 'EXPORT_TOO_LARGE');
});

function fakeDownloadIO() {
  const calls = [];
  let next = 0;
  const jobs = new Map();
  return {
    calls, jobs,
    blob: (bytes, type) => { calls.push(['blob', bytes.byteLength, type]); return { bytes }; },
    create: () => { const url = `blob:download-${++next}`; calls.push(['create', url]); return url; },
    revoke: url => calls.push(['revoke', url]),
    activate: (url, name) => calls.push(['activate', url, name]),
    later: fn => { jobs.set(next, fn); return next; },
    cancel: id => { calls.push(['cancel', id]); jobs.delete(id); }
  };
}

test('oversized full JSON path creates zero Blob/URL/download and does not change notes', () => {
  const input = result(many(700, '\u0001'.repeat(1000)), 0);
  const before = structuredClone(input);
  const io = fakeDownloadIO();
  const downloads = new Downloads(io);
  assert.equal(downloads.export(input, 'json').error, 'EXPORT_TOO_LARGE');
  assert.deepEqual(io.calls, []);
  assert.deepEqual(input, before);
});

test('oversized full Markdown path creates zero Blob/URL/download, including newline expansion', () => {
  const input = result([...many(524, `x${'\n'.repeat(1999)}`), one(`x${'\n'.repeat(575)}`, 0, 'note-000525')], 0);
  const io = fakeDownloadIO();
  assert.deepEqual(new Downloads(io).export(input, 'markdown'), { error: 'EXPORT_TOO_LARGE' });
  assert.deepEqual(io.calls, []);
});

test('download uses only complete bytes, expires URL once, and clear invalidates old URL/timer', () => {
  const io = fakeDownloadIO();
  const downloads = new Downloads(io);
  assert.ok(downloads.export(result(), 'json').ok);
  assert.equal(io.calls[0][0], 'blob');
  assert.deepEqual(io.calls[2], ['activate', 'blob:download-1', 'notes.json']);
  io.jobs.get(1)();
  downloads.clear();
  assert.equal(io.calls.filter(call => call[0] === 'revoke').length, 1);
  downloads.export(result(), 'markdown');
  const late = io.jobs.get(2);
  downloads.clear(); late();
  assert.equal(downloads.urls.size, 0);
  assert.equal(io.calls.filter(call => call[0] === 'revoke').length, 2);
  assert.equal(io.calls.filter(call => call[0] === 'activate').at(-1)[2], 'notes.md');
});

test('a later failed export cannot revive an earlier download URL', () => {
  const io = fakeDownloadIO();
  const downloads = new Downloads(io);
  downloads.export(result(), 'markdown');
  assert.equal(downloads.export(result(many(700, '\u0001'.repeat(1000)), 0), 'json').error, 'EXPORT_TOO_LARGE');
  assert.equal(downloads.urls.size, 0);
  assert.equal(io.calls.filter(call => call[0] === 'create').length, 1);
  assert.equal(io.calls.filter(call => call[0] === 'revoke').length, 1);
});
