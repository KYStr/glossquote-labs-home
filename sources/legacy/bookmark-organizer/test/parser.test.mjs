import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInput } from '../public/js/core/parser.js';
import { bytes, minimal, firefox, chrome, safari, nesting } from './fixtures.mjs';
const parse = value => parseInput(bytes(value));
function rejects(value, code) {
  const result = typeof value === 'string' ? parse(value) : parseInput(value);
  assert.equal(result.status, 'error');
  assert.equal(result.error.code, code);
  assert.deepEqual(result.bookmarks, []);
  assert.deepEqual(result.duplicateGroups, []);
  assert.equal(result.exportHtml, null);
  assert.equal(result.backupJson, null);
  assert(Number.isInteger(result.error.offset));
}
test('K49-01–03: independent synthetic profile table', () => {
  for (const [input, expected] of [[firefox, [['Example', 'https://example.com/a', ['Research']]]], [chrome, [['Example & Tools', 'https://example.com/a?x=1&y=2', ['Toolbar']]]], [safari, [['Root', 'https://example.com/root', []], ['Saved page', 'https://example.com/saved', ['Saved']]]]]) {
    const result = parse(input);
    assert.equal(result.status, 'ready', JSON.stringify(result.error));
    assert.deepEqual(result.bookmarks.map(item => [item.title, item.href, item.folderPath]), expected);
    assert(!JSON.stringify(result).includes('ICON'));
  }
});
test('K49-04–06: exact bytes, +1 and fatal encoding', () => {
  const padded = bytes(minimal + ' '.repeat(2097152 - bytes(minimal).length));
  assert.equal(padded.length, 2097152);
  assert.equal(parseInput(padded).status, 'ready');
  rejects(new Uint8Array(2097153), 'INPUT_TOO_LARGE');
  for (const value of [[0xc3, 0x28], [0xff, 0xfe, 0x3c, 0], [0xfe, 0xff], [0xe2, 0x82]]) rejects(new Uint8Array(value), 'INVALID_ENCODING');
  assert.equal(parseInput(new Uint8Array([0xef, 0xbb, 0xbf, ...bytes(minimal)])).status, 'ready');
});
test('K49-07–10: exact link/depth caps and whole-file refusal', () => {
  const row = '<DT><A HREF="https://example.com/a">A</A>';
  const result = parse('<DL>' + row.repeat(3000) + '</DL>');
  assert.equal(result.status, 'ready');
  assert.equal(result.bookmarks.length, 3000);
  assert.deepEqual([result.bookmarks[0].sourceIndex, result.bookmarks[2999].sourceIndex], [0, 2999]);
  rejects('<DL>' + row.repeat(3001) + '</DL>', 'TOO_MANY_BOOKMARKS');
  assert.equal(parse(nesting(12)).bookmarks[0].folderPath.length, 12);
  rejects(nesting(13), 'DEPTH_LIMIT');
});
test('K49-11–12: exact groups, all included; query singletons stay separate', () => {
  const result = parse('<DL><DT><A HREF="https://example.com/a">First</A><DT><A HREF="https://example.com/a">Second</A><DT><A HREF="https://example.com/a?x=1">One</A><DT><A HREF="https://example.com/a?x=2">Two</A></DL>');
  assert.deepEqual(result.duplicateGroups, [
    { groupId: 'url-group-001', exactHref: 'https://example.com/a', memberSourceIndexes: [0, 1], suggestedKeeperSourceIndex: 0 },
    { groupId: 'url-group-002', exactHref: 'https://example.com/a?x=1', memberSourceIndexes: [2], suggestedKeeperSourceIndex: 2 },
    { groupId: 'url-group-003', exactHref: 'https://example.com/a?x=2', memberSourceIndexes: [3], suggestedKeeperSourceIndex: 3 }
  ]);
  assert(result.bookmarks.every(item => item.included));
});
test('K49-16–17: decoded title is plain string exactly once, wrapper ignored', () => {
  const result = parse('<TITLE>Ignored</TITLE><DL><DT><A HREF="https://example.com/a">&lt;img src=x onerror=alert(1)&gt;</A><DT><A HREF="https://example.com/b">Example &amp; Tools &amp;lt; &#x1F642;</A></DL>');
  assert.deepEqual(result.bookmarks.map(item => item.title), ['<img src=x onerror=alert(1)>', 'Example & Tools &lt; 🙂']);
  assert(!JSON.stringify(result).includes('Ignored'));
});
test('K49-18–21: markup, attributes, entities, structure and P refusal', () => {
  for (const tag of ['SCRIPT', 'STYLE', 'IFRAME', 'IMG', 'DIV']) rejects(`<DL><${tag}></${tag}></DL>`, 'UNSUPPORTED_MARKUP');
  for (const attribute of ['ONCLICK="x"', 'HREF="https://example.com/b"', 'HREF=x']) rejects(`<DL><DT><A HREF="https://example.com/a" ${attribute}>X</A></DL>`, 'UNSUPPORTED_ATTRIBUTE');
  rejects('<!-- unfinished', 'UNSUPPORTED_MARKUP');
  rejects('<!-- bad -- body -->' + minimal, 'UNSUPPORTED_MARKUP');
  for (const entity of ['&unknown;', '&amp', '&#xD800;', '&#1114112;', '&#-1;']) rejects(minimal.replace('Example', entity), 'INVALID_ENTITY');
  for (const malformed of ['', '<DL><DT><A HREF="https://example.com/a">X</DL>', '<DL><DL></DL></DL>', '<DL><DT><A HREF="https://example.com/a">X</A><DL></DL></DL>', '<DL></DL><DL></DL>', '<DL><DT><DT></DT></DL>']) rejects(malformed, 'INVALID_STRUCTURE');
  assert.equal(parse('<DL><P></DL><P>').status, 'ready');
  rejects('<DL><P>text</DL>', 'INVALID_STRUCTURE');
  rejects('<DL><P CLASS="x"></DL>', 'UNSUPPORTED_ATTRIBUTE');
  rejects('<DL><DT><A HREF="https://example.com/a">A</A><P><DT><A HREF="https://example.com/b">B</A></DL>', 'INVALID_STRUCTURE');
  rejects('<DL></P></DL>', 'INVALID_STRUCTURE');
});
test('K49-26: valid prefix followed by unsafe URL yields no partial data', () => {
  rejects('<DL><DT><A HREF="https://example.com/a">Good</A><DT><A HREF="javascript:alert(1)">Bad</A></DL>', 'UNSAFE_URL');
});
test('K49-29: core cancellation returns bounded all-or-nothing error', () => {
  const result = parseInput(bytes(minimal), { jobId: 'canceled', canceled: () => true });
  assert.equal(result.error.code, 'CANCELED');
  assert.deepEqual(result.bookmarks, []);
});
