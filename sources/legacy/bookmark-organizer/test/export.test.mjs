import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInput } from '../public/js/core/parser.js';
import { moveBookmark, setIncluded } from '../public/js/core/organizer.js';
import { exportHtml } from '../public/js/core/export-html.js';
import { exportJson, createOutputs } from '../public/js/core/export-json.js';
import { bytes, chrome } from './fixtures.mjs';
const source = '<DL><DT><H3>A</H3><DL><DT><A HREF="https://example.com/a">&lt;img src=x onerror=alert(1)&gt;</A><DT><A HREF="https://example.com/a">Second &amp; Tools</A></DL></DL>';
test('K49-16–17,22: exact export string and reparse, no double escaping', () => {
  const job = parseInput(bytes(source));
  const html = exportHtml(job);
  assert.equal(html, '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Organized bookmarks</TITLE>\n<H1>Organized bookmarks</H1>\n<DL><p>\n    <DT><H3>A</H3>\n    <DL><p>\n        <DT><A HREF="https://example.com/a">&lt;img src=x onerror=alert(1)&gt;</A>\n        <DT><A HREF="https://example.com/a">Second &amp; Tools</A>\n    </DL><p>\n</DL><p>\n');
  assert(!html.includes('&amp;lt;') && !html.includes('<img'));
  assert.deepEqual(parseInput(bytes(html)).bookmarks.map(item => [item.title, item.href, item.folderPath, item.included]), [['<img src=x onerror=alert(1)>', 'https://example.com/a', ['A'], true], ['Second & Tools', 'https://example.com/a', ['A'], true]]);
});
test('K49-23–24: artifacts contain precise included tree and all JSON rows', async () => {
  const job = parseInput(bytes(source));
  setIncluded(job, 1, false, true);
  moveBookmark(job, 0, ['Work', '2026']);
  const outputs = createOutputs(job);
  assert.equal(outputs.exportHtml.type, 'text/html;charset=utf-8');
  assert.equal(outputs.backupJson.type, 'application/json;charset=utf-8');
  const parsed = parseInput(bytes(await outputs.exportHtml.text()));
  assert.deepEqual(parsed.bookmarks.map(item => [item.title, item.href, item.folderPath]), [['<img src=x onerror=alert(1)>', 'https://example.com/a', ['Work', '2026']]]);
  const json = JSON.parse(await outputs.backupJson.text());
  assert.deepEqual(Object.keys(json), ['schemaVersion', 'kind', 'parserProfile', 'bookmarks', 'duplicateGroups']);
  assert.equal(json.kind, 'glossquote-bookmark-organizer-backup');
  assert.deepEqual(json.bookmarks, [
    { sourceIndex: 0, title: '<img src=x onerror=alert(1)>', href: 'https://example.com/a', originalFolderPath: ['A'], folderPath: ['Work', '2026'], included: true, duplicateGroupId: 'url-group-001', suggestedKeeper: true },
    { sourceIndex: 1, title: 'Second & Tools', href: 'https://example.com/a', originalFolderPath: ['A'], folderPath: ['A'], included: false, duplicateGroupId: 'url-group-001', suggestedKeeper: false }
  ]);
  assert.equal(JSON.stringify(json).includes('sourceName'), false);
});
test('attribute/text contexts cannot inject markup or icons; empty selection is importable', () => {
  const job = parseInput(bytes(chrome));
  job.bookmarks[0].href = 'https://example.com/?x="&y=<test>';
  job.bookmarks[0].folderPath = ['<Folder> & "quoted"'];
  const html = exportHtml(job);
  assert.match(html, /HREF="https:\/\/example.com\/\?x=&quot;&amp;y=&lt;test&gt;"/);
  assert.match(html, /<H3>&lt;Folder&gt; &amp; "quoted"<\/H3>/);
  assert(!/ICON|ICON_URI|<script|<img/i.test(html));
  assert.deepEqual(parseInput(bytes(html)).bookmarks.map(item => [item.href, item.folderPath]), [['https://example.com/?x="&y=<test>', ['<Folder> & "quoted"']]]);
  setIncluded(job, 0, false, true);
  assert.deepEqual(parseInput(bytes(exportHtml(job))).bookmarks, []);
  assert.equal(JSON.parse(exportJson(job)).bookmarks.length, 1);
});
