import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../scripts/files.mjs';
import { mount } from '../public/js/app.mjs';
import { parseCards } from '../public/js/core/csv.mjs';
import { parseDeckJson } from '../public/js/core/schema.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';
import { page } from '../scripts/pages.mjs';
import { fakeDocument, fakeHost } from './fake-document.mjs';

for (const copy of [zh, en]) {
  test(`Node fake DOM only (${copy.locale}): input → hidden/reveal → known → review → JSON/HTML bytes`, () => {
    const html = readFileSync(join(ROOT, 'public', copy.locale === 'en' ? 'en/index.html' : 'index.html'), 'utf8');
    assert.equal(html, page(copy));
    const doc = fakeDocument(html), host = fakeHost(), revoked = [];
    const c = mount(doc, host, { makeUrl: () => 'blob:fake-view', revokeUrl: url => revoked.push(url), setTimer: () => 1, clearTimer() {} });
    const get = id => doc.getElementById(id);
    assert.equal(get('source').value, ''); assert.equal(get('start').disabled, true); assert.equal(get('practice').hidden, true);
    get('source').value = 'q,a\nA,a\nB,b\nC,c'; get('source').fire('input'); get('start').click();
    assert.equal(get('practice').hidden, false); assert.equal(get('question').textContent, 'A'); assert.equal(get('answer').textContent, '');
    assert.equal(get('answerPanel').hidden, true); assert.equal(get('source').disabled, true);
    get('reveal').click(); assert.equal(get('answer').textContent, 'a'); assert.equal(get('answerPanel').hidden, false);
    get('assessKnown').click(); assert.equal(get('question').textContent, 'B'); assert.equal(get('answer').textContent, ''); assert.equal(get('knownCount').textContent, '1');
    get('mode').value = 'review'; get('mode').fire('change'); assert.deepEqual(c.snapshot().session.order, [2, 3]);
    get('outputType').value = 'json'; get('prepare').click();
    assert.equal(get('prepared').hidden, false); assert.deepEqual(parseDeckJson(get('outputText').value).known, [1]);
    get('download').click(); assert.deepEqual(doc.downloads, [{ href: 'blob:fake-view', filename: 'flashcards-deck.json' }]);
    get('outputType').value = 'html'; get('outputType').fire('change'); assert.equal(get('prepared').hidden, true); assert.equal(get('outputText').value, ''); assert.deepEqual(revoked, ['blob:fake-view']);
    get('prepare').click(); assert.equal(get('printPreview').hidden, false); assert.ok(get('outputText').value.includes(`<html lang="${copy.locale}">`));
    get('edit').click(); assert.equal(get('confirmation').hidden, false); get('cancelConfirm').click(); assert.equal(c.snapshot().session.cards.length, 3);
    get('edit').click(); get('confirm').click(); assert.equal(get('source').disabled, false); assert.equal(get('prepared').hidden, true);
    get('source').value = 'q,a\nQ, '; get('source').fire('input'); get('start').click();
    assert.equal(get('error').hidden, false); assert.ok(get('error').textContent.includes(copy.errors.EMPTY_FACE)); assert.equal(get('source').attributes['aria-invalid'], 'true');
    host.fire('pagehide'); assert.equal(get('source').value, ''); assert.equal(get('jsonText').value, ''); assert.equal(c.snapshot().session, null);
    host.fire('pageshow', { persisted: true }); assert.equal(get('source').disabled, false); assert.equal(get('start').disabled, true);
  });
  test(`Node fake DOM only (${copy.locale}): sample opt-in, import cancel, injection text and language warning`, () => {
    const doc = fakeDocument(page(copy)), host = fakeHost();
    const c = mount(doc, host), get = id => doc.getElementById(id);
    assert.equal(parseCards(copy.sample).length, 3);
    get('sample').click(); assert.equal(get('source').value, copy.sample); get('start').click();
    get('reveal').click(); get('assessKnown').click();
    const original = c.snapshot().session;
    get('jsonText').value = '{"schemaVersion":1,"cards":[{"id":17,"question":"</style><script>x</script>","answer":"<img src=x>"}],"known":[]}';
    get('jsonText').fire('input'); get('previewImport').click(); assert.equal(get('incomingCards').children[0].textContent, '</style><script>x</script>');
    get('cancelImport').click(); assert.equal(c.snapshot().session, original);
    get('languageLink').click(); assert.equal(get('languageConfirm').hidden, false); assert.equal(c.snapshot().session, original);
    get('stayLanguage').click(); assert.equal(get('languageConfirm').hidden, true);
    get('reset').click(); get('confirm').click(); assert.equal(get('knownCount').textContent, '0');
    get('clear').click(); assert.equal(get('source').value, ''); assert.equal(get('jsonText').value, ''); assert.equal(get('empty').hidden, false);
    host.fire('pagehide');
  });
}
test('locales have the same complete keys and no automatic sample content in initial HTML', () => {
  for (const section of ['ui', 'messages', 'errors']) assert.deepEqual(Object.keys(zh[section]).sort(), Object.keys(en[section]).sort());
  for (const copy of [zh, en]) {
    assert.doesNotMatch(page(copy), /H₂O|<script>x/);
    for (const key of ['faqGradeQ', 'faqGradeA', 'faqPrintQ', 'faqPrintA', 'faqSaveQ', 'faqSaveA']) assert.ok(page(copy).includes(copy.ui[key]));
  }
});
test('unsupported fake host leaves native controls disabled and shows local exit copy', () => {
  const doc = fakeDocument(page(en));
  assert.equal(mount(doc, {}), null); assert.equal(doc.getElementById('source').disabled, true); assert.equal(doc.getElementById('unsupported').textContent, en.ui.unsupported);
});
