import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, deferred, flush } from './app-harness.mjs';

for (const locale of ['en', 'zh-Hant']) {
  for (const outcome of ['resolve', 'reject']) test(`B20 controlled ${locale}: stale A ${outcome}/finally cannot touch B`, async () => {
    const A = deferred(); const B = deferred(); const writes = [];
    const h = harness(locale, { writeText(report) { writes.push(report); return writes.length === 1 ? A.promise : B.promise; } });
    h.build('A'); h.get('copy-report').focus(); h.click('copy-report'); h.click('copy-report');
    assert.equal(writes.length, 1); assert.equal(h.get('copy-report').getAttribute('aria-busy'), 'true');
    h.input('duration-row-1', '2'); assert.equal(h.get('report').value, ''); assert.equal(h.get('copy-report').disabled, true);
    h.click('build-timeline'); h.click('copy-report'); assert.equal(writes.length, 2);
    h.get('report').focus();
    const before = h.snapshot(); const count = h.document.writes;
    A[outcome](outcome === 'reject' ? new Error('fixed fake refusal') : undefined); await flush();
    assert.deepEqual(h.snapshot(), before); assert.equal(h.document.writes, count, 'Every stale callback including finally is a complete DOM/focus no-op');
    assert.equal(h.get('copy-report').getAttribute('aria-busy'), 'true');
    assert.ok(writes[0].includes(locale === 'en' ? '1 min' : '1 分鐘')); assert.ok(writes[1].includes(locale === 'en' ? '2 min' : '2 分鐘'));
    B.resolve(); await flush(); assert.equal(h.get('copy-report').getAttribute('aria-busy'), 'false'); assert.equal(h.get('copy-report').disabled, false);
    assert.equal(h.get('notice').textContent, locale === 'en' ? 'Report copied.' : '已複製文字報告。');
  });
  test(`B22 controlled ${locale}: independent 60-second URLs and cap`, async () => {
    const h = harness(locale); h.build('Fake');
    const original = h.get('report').value;
    for (let index = 0; index < 8; index++) { h.click('download-report'); if (index < 7) h.advance(1000); }
    assert.equal(h.urls.size, 8); assert.equal(h.document.downloads.length, 8); assert.equal(h.timers.size, 8);
    for (const record of h.document.downloads) { assert.equal(record.filename, 'glossquote-event-timeline.txt'); const blob = h.urls.get(record.url); assert.equal(blob.type, 'text/plain;charset=utf-8'); assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new Uint8Array(Buffer.from(original, 'utf8'))); }
    assert.equal(h.get('download-report').disabled, true); h.click('download-report'); assert.equal(h.document.downloads.length, 8);
    h.input('duration-row-1', '2'); h.click('build-timeline'); assert.equal(h.revoked.length, 0); assert.equal(h.get('download-report').disabled, true);
    h.click('clear-all'); assert.equal(h.urls.size, 8); assert.equal(h.revoked.length, 0); assert.equal(h.get('report').value, '');
    h.build('New'); h.advance(52999); assert.equal(h.revoked.length, 0);
    h.advance(1); assert.deepEqual(h.revoked, [{ url: 'blob:test-1', at: 60000 }]); assert.equal(h.get('download-report').disabled, false);
    h.click('download-report'); assert.equal(h.urls.size, 8); assert.equal(h.document.downloads.length, 9);
    h.advance(7000); assert.equal(h.revoked.length, 8); assert.equal(h.urls.size, 1);
    h.advance(53000); assert.equal(h.urls.size, 0); assert.equal(h.timers.size, 0); assert.equal(h.revoked.at(-1).at, 120000);
  });
  test(`B23 controlled ${locale}: pagehide, late callbacks and persisted pageshow`, async () => {
    const A = deferred(); const B = deferred(); let calls = 0;
    const h = harness(locale, { writeText() { return ++calls === 1 ? A.promise : B.promise; } });
    h.build(); h.click('download-report'); h.click('copy-report');
    h.input('duration-row-1', '2'); h.click('build-timeline'); h.click('copy-report'); h.click('download-report');
    const oldInput = h.get('name-row-1'); h.window.fire('pagehide', { persisted: true });
    assert.equal(h.get('start-time').value, ''); assert.equal(h.get('target-time').value, ''); assert.equal(oldInput.value, '');
    assert.equal(h.get('activity-rows').children.length, 0); assert.equal(h.get('report').value, ''); assert.equal(h.get('notice').textContent, '');
    assert.equal(h.get('row-count').textContent, '');
    assert.equal(h.get('result').hidden, true); assert.equal(h.get('copy-report').disabled, true); assert.equal(h.get('download-report').disabled, true);
    assert.equal(h.urls.size, 0); assert.equal(h.timers.size, 0); assert.equal(h.revoked.length, 2);
    const before = h.snapshot(); const count = h.document.writes;
    A.resolve(); B.reject(new Error('fixed fake refusal')); await flush();
    assert.deepEqual(h.snapshot(), before); assert.equal(h.document.writes, count);
    h.window.fire('pageshow', { persisted: true });
    assert.equal(h.get('activity-rows').children.length, 1); assert.equal(h.get('name-row-1').value, ''); assert.equal(h.get('duration-row-1').value, '');
    assert.equal(h.get('start-time').value, ''); assert.equal(h.get('target-next-day').checked, false); assert.equal(h.get('target-next-day').disabled, true);
  });
  test(`Controlled ${locale}: confirm cancellation preserves whole view, confirmed clear and local language route`, () => {
    const h = harness(locale); h.build('Kept'); const before = h.snapshot();
    h.window.answers.push(false); h.click('clear-all'); assert.deepEqual(h.snapshot(), before);
    h.window.answers.push(false); h.click('language-link'); assert.deepEqual(h.snapshot(), before); assert.deepEqual(h.window.navigations, []);
    h.window.answers.push(true); h.click('language-link'); assert.deepEqual(h.window.navigations, [locale === 'en' ? '/index.html' : '/en/index.html']);
    h.click('clear-all'); assert.equal(h.get('start-time').value, ''); assert.equal(h.get('report').value, ''); assert.equal(h.get('activity-rows').children.length, 1);
    const count = h.window.confirmations.length; h.click('clear-all'); assert.equal(h.window.confirmations.length, count);
  });
  test(`Controlled ${locale}: composition, first field error, target reset and row identity`, () => {
    const h = harness(locale); h.build();
    h.get('name-row-1').fire('compositionstart'); h.click('build-timeline'); assert.equal(h.get('report').value, '');
    assert.equal(h.get('notice').textContent, locale === 'en' ? 'Finish composing the text before building the timeline.' : '請完成輸入法組字後再排出時間表。');
    h.get('name-row-1').fire('compositionend'); h.click('build-timeline'); assert.notEqual(h.get('report').value, '');
    h.input('start-time', '9:00'); h.click('build-timeline'); assert.equal(h.document.activeElement.id, 'start-time'); assert.equal(h.get('start-time').getAttribute('aria-invalid'), 'true');
    h.input('start-time', '09:00'); assert.equal(h.get('start-time').getAttribute('aria-invalid'), null);
    h.input('duration-row-1', '0'); h.click('build-timeline'); assert.equal(h.document.activeElement.id, 'duration-row-1');
    h.input('target-time', '09:00'); h.get('target-next-day').checked = true; h.get('target-next-day').fire('change');
    h.input('target-time', ''); assert.equal(h.get('target-next-day').checked, false); assert.equal(h.get('target-next-day').disabled, true);
    h.input('duration-row-1', '1'); h.click('add-activity'); h.input('name-row-2', 'B'); h.input('duration-row-2', '2');
    h.click('up-row-2'); assert.equal(h.get('activity-rows').children[0].children[0].id, 'heading-row-2'); assert.equal(h.document.activeElement.id, 'down-row-2');
    h.click('remove-row-2'); h.click('add-activity'); assert.ok(h.get('name-row-3')); assert.equal(h.get('name-row-2'), null);
    while (h.get('activity-rows').children.length < 60) h.click('add-activity'); assert.equal(h.get('add-activity').disabled, true);
    h.click('remove-row-3'); assert.equal(h.get('add-activity').disabled, false);
  });
  test(`Controlled ${locale}: unavailable/rejected Clipboard keeps manually selectable report`, async () => {
    for (const clipboard of [undefined, { writeText() { throw new Error('fixed fake refusal'); } }, { writeText() { return Promise.reject(new Error('fixed fake refusal')); } }]) {
      const h = harness(locale, clipboard); h.build(); const before = h.get('report').value; h.click('copy-report'); await flush();
      assert.equal(h.get('report').value, before); assert.equal(h.get('copy-report').disabled, false); assert.equal(h.get('copy-report').getAttribute('aria-busy'), 'false');
      assert.equal(h.get('notice').textContent, locale === 'en' ? 'One-click copy is unavailable. Select the report below to copy it.' : '無法一鍵複製；請選取下方報告再複製。');
    }
  });
  test(`B30 controlled ${locale}: repeated lifecycle starts blank`, () => {
    const h = harness(locale);
    for (let round = 0; round < 4; round++) {
      h.build(`Fake ${round}`); h.click('download-report'); h.input('note-row-1', 'Edited'); assert.equal(h.get('report').value, '');
      h.click('build-timeline'); h.click('clear-all'); assert.equal(h.get('report').value, ''); assert.equal(h.urls.size, 1);
      h.click('language-link'); h.window.fire('pagehide'); h.window.fire('pageshow', { persisted: true });
      assert.equal(h.get('name-row-1').value, ''); assert.equal(h.get('start-time').value, ''); assert.equal(h.urls.size, 0); assert.equal(h.timers.size, 0);
    }
  });
}
