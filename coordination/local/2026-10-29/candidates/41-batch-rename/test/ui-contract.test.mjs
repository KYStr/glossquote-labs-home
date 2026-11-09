import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../scripts/check.mjs';
import { messages, errorText, formatBytes } from '../public/js/i18n.mjs';
import { RenameWorkspace } from '../public/js/app.mjs';

test('S: two complete noindex pages with matching controls, labels and privacy/ZIP disclosures', async () => {
  let priorIds;
  for (const [page, language, promise, home] of [
    ['index.html', 'zh-Hant', '下載重新命名後的 ZIP 副本。原檔不變；ZIP 不壓縮，下載後需解壓。', 'https://glossquote.com/index.html'],
    ['en/index.html', 'en', 'Download a renamed ZIP copy. Your originals stay unchanged. The ZIP is uncompressed; unzip it after download.', 'https://glossquote.com/en/index.html'],
  ]) {
    const html = await readFile(join(ROOT, 'public', page), 'utf8');
    assert.ok(html.includes(`<html lang="${language}">`)); assert.ok(html.includes(promise));
    assert.ok(html.indexOf(promise) < html.indexOf('id="files"')); assert.ok(html.includes(home));
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /<input id="files" type="file" multiple/);
    assert.doesNotMatch(html, /webkitdirectory|showOpenFilePicker|ondrop|<iframe|canonical|hreflang|<input[^>]*accept=/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ['files', 'mode-sequence', 'mode-replace', 'base', 'start', 'width', 'find', 'replacement', 'prefix', 'build', 'cancel', 'download', 'clear', 'empty', 'file-list', 'status', 'progress', 'language-link']) assert.ok(ids.includes(id), id);
    if (priorIds) assert.deepEqual(ids, priorIds); priorIds = ids;
    for (const field of ['files', 'base', 'start', 'width', 'find', 'replacement', 'prefix']) assert.ok(html.includes(`for="${field}"`));
    for (const match of html.matchAll(/aria-(?:describedby|labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id), id);
    assert.match(html, /download="renamed-files.zip" hidden/);
    assert.match(html, /id="download"(?![^>]*href=)/);
    assert.match(html, /<fieldset id="replace-fields"[^>]*hidden disabled/);
    assert.equal((html.match(/<details>/g) ?? []).length, 4);
    assert.match(html, /16 MiB/); assert.match(html, /64 MiB/); assert.match(html, /EXIF/); assert.match(html, /GPS/); assert.match(html, /FileList/);
    assert.match(html, /aria-live="polite"/); assert.match(html, /role="status"/);
    assert.match(html, /name="description" content="[^"]{40,}"/); assert.match(html, /<noscript>/);
  }
});
test('S: both languages cover every stable error code and locale byte display', () => {
  assert.deepEqual(Object.keys(messages.en.errors).sort(), Object.keys(messages['zh-Hant'].errors).sort());
  for (const [language, t] of Object.entries(messages)) {
    for (const code of Object.keys(t.errors)) {
      const text = errorText(language, code);
      assert.equal(typeof text, 'string'); assert.ok(text.includes(language === 'en' ? '.' : '。'), `${language}:${code}`);
    }
    for (const key of ['empty', 'ready', 'invalid', 'cancelled', 'success', 'original', 'output', 'size', 'row', 'up', 'down', 'remove', 'good', 'unavailable']) assert.equal(typeof t[key], 'string');
    assert.equal(formatBytes(0, language), '0 B'); assert.equal(formatBytes(1048576, language), '1 MiB');
    assert.ok(t.building(1, 2).includes('1')); assert.ok(t.count('100', '64 MiB').includes('64 MiB'));
  }
});
test('N only: controller invalidates old downloads synchronously on rule and list changes', async () => {
  const revoked = []; let last;
  const workspace = new RenameWorkspace({ createUrl: () => 'blob:synthetic', revokeUrl: url => revoked.push(url), onChange: state => { last = state; } });
  const file = new File([new Uint8Array([0, 255])], 'receipt.PDF');
  workspace.addFiles([file]); assert.equal(await workspace.build(), true); assert.equal(last.url, 'blob:synthetic');
  workspace.setRule({ mode: 'sequence', base: 'copy', start: 1, width: 3 });
  assert.equal(last.url, null); assert.deepEqual(revoked, ['blob:synthetic']); assert.equal(last.plan.rows[0].outputName, 'copy-001.PDF');
  assert.equal(await workspace.build(), true); workspace.addFiles([new File([], 'more.txt')]);
  assert.equal(last.url, null); assert.equal(revoked.length, 2); assert.equal(last.items.length, 2);
  workspace.clear(); assert.equal(last.items.length, 0); assert.deepEqual(last.plan.rows, []);
});
