import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInput } from '../public/js/core/parser.js';
import { decodeEntities } from '../public/js/core/entities.js';
import { bytes, minimal } from './fixtures.mjs';
const parse = value => parseInput(bytes(value));
test('wrapper and attribute allowlist counterexamples fail closed', () => {
  const cases = [
    ['<!DOCTYPE html>' + minimal, 'UNSUPPORTED_MARKUP'],
    ['<!DOCTYPE NETSCAPE-Bookmark-file-1 SYSTEM "https://example.com/x">' + minimal, 'UNSUPPORTED_MARKUP'],
    ['<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-16">' + minimal, 'INVALID_ENCODING'],
    ['<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8" OTHER="x">' + minimal, 'UNSUPPORTED_ATTRIBUTE'],
    ['<TITLE>X</TITLE><TITLE>Y</TITLE>' + minimal, 'INVALID_STRUCTURE'],
    [minimal + '<TITLE>X</TITLE>', 'INVALID_STRUCTURE'],
    ['<TITLE><A HREF="https://example.com/a">X</A></TITLE>' + minimal, 'INVALID_STRUCTURE'],
    ['<DL CLASS="x"></DL>', 'UNSUPPORTED_ATTRIBUTE'],
    ['<DL><DT><A HREF=https://example.com/a>X</A></DL>', 'UNSUPPORTED_ATTRIBUTE'],
    ['<DL><DT><A>X</A></DL>', 'UNSUPPORTED_ATTRIBUTE'],
    ['<DL><DT><H3 DATA-X="x">Folder</H3><DL></DL></DL>', 'UNSUPPORTED_ATTRIBUTE'],
    ['<DL><DT><A HREF="https://example.com/a" ADD_DATE="&bad;">X</A></DL>', 'INVALID_ENTITY'],
    ['<DL><DT><A HREF="https://example.com/a">X<img></A></DL>', 'UNSUPPORTED_MARKUP'],
    ['<DL><DT><H3></H3><DL></DL></DL>', 'INVALID_STRUCTURE'],
    ['<DL><DT><H3>..</H3><DL></DL></DL>', 'INVALID_STRUCTURE'],
    ['<DL><DT><H3>' + 'x'.repeat(256) + '</H3><DL></DL></DL>', 'INVALID_STRUCTURE'],
    ['\uFEFF\uFEFF' + minimal, 'INVALID_STRUCTURE'],
    ['<DL>\u00a0</DL>', 'INVALID_STRUCTURE']
  ];
  for (const [input, code] of cases) {
    const result = parse(input);
    assert.equal(result.error?.code, code, input.slice(0, 80));
    assert.deepEqual(result.bookmarks, []); assert.equal(result.exportHtml, null); assert.equal(result.backupJson, null);
    assert.deepEqual(Object.keys(result.error), ['code', 'offset', 'messageKey']);
  }
});
test('entity scalar boundaries and exact UTF-16 error offsets', () => {
  assert.equal(decodeEntities('&amp;&lt;&gt;&quot;&apos;&nbsp;&#65;&#x1F642;&#x10FFFF;'), '&<>"\'\u00a0A🙂' + String.fromCodePoint(0x10ffff));
  for (const entity of ['&AMP;', '&', '&#;', '&#x;', '&#x110000;', '&#xDFFF;', '&#9007199254740993;', '&amp&bogus;']) assert.throws(() => decodeEntities(entity, 7), error => error.code === 'INVALID_ENTITY' && error.offset === 7);
  const input = '<DL><DT><A HREF="https://example.com/a">🙂 &unknown;</A></DL>';
  assert.equal(parse(input).error.offset, input.indexOf('&unknown;'));
  const duplicate = '<DL><DT><A HREF="https://example.com/a" href="https://example.com/b">X</A></DL>';
  assert.equal(parse(duplicate).error.offset, duplicate.indexOf('href='));
});
test('case-insensitive tags/attributes and optional DT close; empty folders are recorded', () => {
  const result = parse('<dl><p><dt><h3 add_date="1">Empty</h3><dl></dl><p></dt><dt><a href="https://example.com/a">Root</a></dt></dl><p>');
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.folders, [['Empty']]);
  assert.deepEqual(result.bookmarks.map(item => [item.sourceIndex, item.title, item.folderPath]), [[0, 'Root', []]]);
});
test('Unicode, slash, percent, case, fragment and query remain exact grouping keys', () => {
  const hrefs = ['https://example.com/a', 'https://EXAMPLE.com/a', 'https://example.com/a/', 'https://example.com/a#x', 'https://example.com/a#y', 'https://example.com/%61', 'https://example.com/a?x=1', 'https://example.com/a?x=2', 'https://例子.example/文'];
  const result = parse('<DL>' + hrefs.map((href, i) => `<DT><A HREF="${href}">${i}</A>`).join('') + '</DL>');
  assert.deepEqual(result.duplicateGroups.map(group => group.exactHref), hrefs);
  assert(result.duplicateGroups.every(group => group.memberSourceIndexes.length === 1));
});
test('deterministic malformed suffixes never retain the valid prefix', () => {
  const prefix = minimal.slice(0, -5);
  for (const suffix of ['<SCRIPT>x</SCRIPT></DL>', '<DT><A HREF="data:text/html,x">Bad</A></DL>', '<DT><A HREF="https://example.com/b">&bad;</A></DL>', '<DT><A HREF="https://example.com/b">unfinished', '<DL></DL></DL>', '<P>text</DL>']) {
    const result = parse(prefix + suffix);
    assert.equal(result.status, 'error'); assert.deepEqual(result.bookmarks, []); assert.deepEqual(result.duplicateGroups, []);
  }
});
