import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, deferred } from './helpers/dom-harness.mjs';
import { P5_EN, P5_ZH } from './helpers/fixtures.mjs';
import { ERROR_KEYS, errorMessage, MESSAGES } from '../public/js/i18n.mjs';
import { mountReadingPlan } from '../public/js/app.mjs';
import { readFile } from 'node:fs/promises';

test('no-JS and pre-mount markup fail closed; normal initialization installs submit guard before enabling', async () => {
  for (const path of ['index.html', 'en/index.html']) {
    const html = await readFile(new URL(`../public/${path}`, import.meta.url), 'utf8');
    assert.match(html, /<noscript>.*JavaScript.*<\/noscript>/);
    const form = html.match(/<form id="reading-form"[^>]*>([\s\S]*?)<\/form>/)[1];
    assert.match(form, /^\s*<fieldset id="input-controls" disabled>/);
    assert.match(form, /<button id="create" type="submit"[^>]*\bdisabled>/);
    assert.match(form, /<\/fieldset>\s*$/);
    for (const tag of form.matchAll(/<input\b[^>]*>/g)) {
      // Raw book fields have no submission name; only weekdays are named,
      // and those are inside the initially disabled outer fieldset.
      if (!tag[0].includes('type="checkbox"')) assert(!/\bname=/.test(tag[0]));
    }
  }
  const failed = harness('en', undefined, { mount: false });
  failed.win.addEventListener = () => { throw new Error('TEST_INIT_FAILURE'); };
  assert.throws(() => mountReadingPlan(failed.doc, failed.win), /TEST_INIT_FAILURE/);
  assert(failed.el('input-controls').disabled); assert(failed.el('create').disabled); assert(!failed.el('reading-form').dataset.ready);
  const ready = harness('en');
  assert(!ready.el('input-controls').disabled); assert(!ready.el('create').disabled); assert.equal(ready.el('reading-form').dataset.ready, 'true');
  ready.fill(); ready.submit(); assert(ready.el('reading-form').lastEvent.defaultPrevented); assert(!ready.el('result').hidden); assert.equal(ready.el('report').value, P5_EN);
});

for (const locale of ['zh-Hant', 'en']) {
  test(`${locale} B01/B02/B03 every input invalidates all result access`, () => {
    const h = harness(locale);
    for (const field of ['titleRaw', 'totalPagesRaw', 'startDateRaw', 'endDateRaw', 'dailyCapRaw']) assert.equal(h.el(field).value, '');
    assert.equal(h.el('completedPagesRaw').value, '0'); assert.deepEqual(h.boxes.map(b => b.checked), [true, true, true, true, true, false, false]);
    for (const field of ['titleRaw', 'totalPagesRaw', 'completedPagesRaw', 'startDateRaw', 'endDateRaw', 'dailyCapRaw']) {
      h.fill(); h.submit(); assert.equal(h.el('schedule').children.length, 5); assert.equal(h.el('report').value, locale === 'en' ? P5_EN : P5_ZH);
      h.set(field, field === 'titleRaw' ? '<img>' : '9');
      assert(h.el('result').hidden); assert(h.el('exports').hidden); assert.equal(h.el('report').value, ''); assert.equal(h.el('summary').children.length, 0); assert.equal(h.el('schedule').children.length, 0); assert(h.el('copy').disabled); assert(h.el('download').disabled);
    }
    for (const box of h.boxes) { h.fill(); h.submit(); box.checked = !box.checked; h.el('reading-form').emit('input', { target: box }); assert(h.el('result').hidden); assert.equal(h.el('report').value, ''); }
  });
  test(`${locale} B04/B05/B23 zero, invalid, and capacity states stay distinct`, () => {
    const h = harness(locale); h.fill({ totalPagesRaw: '40' }); h.submit(); assert.equal(h.el('schedule').children.length, 0); assert(!h.el('exports').hidden); assert(h.el('report').value.includes(locale === 'en' ? 'No pages remain.' : '已無剩餘頁。'));
    for (const changes of [{ dailyCapRaw: '10' }, { totalPagesRaw: '0' }]) {
      h.fill(changes); h.submit(); assert(h.el('exports').hidden); assert.equal(h.el('report').value, ''); assert.equal(h.el('schedule').children.length, 0); assert(h.el('copy').disabled); assert(h.el('download').disabled);
      h.click('copy'); h.click('download'); assert.equal(h.created.size, 0);
    }
    h.fill({ dailyCapRaw: '10' }); h.submit(); assert.equal(h.el('summary').children.length, 6); assert(h.el('book-name').textContent === '');
  });
  test(`${locale} B06/B07 confirm, cancel and Escape focus`, () => {
    const h = harness(locale); h.fill(); h.submit(); const before = h.el('report').value;
    h.click('clear'); assert(h.el('clear-dialog').open); assert.equal(h.doc.activeElement.id, 'keep-data');
    h.click('keep-data'); assert(!h.el('clear-dialog').open); assert.equal(h.el('report').value, before); assert.equal(h.doc.activeElement.id, 'clear');
    h.click('clear'); h.el('clear-dialog').emit('cancel'); assert.equal(h.el('report').value, before); assert.equal(h.doc.activeElement.id, 'clear');
    h.click('clear'); h.click('confirm-clear'); assert.equal(h.el('totalPagesRaw').value, ''); assert.equal(h.el('completedPagesRaw').value, '0'); assert.equal(h.el('report').value, ''); assert.equal(h.doc.documentElement.lang, locale); assert.equal(h.doc.activeElement.id, 'clear');
  });
  test(`${locale} B09/B17 invalid raw text survives attempted native switch`, () => {
    const h = harness(locale); h.click('date-mode'); h.set('startDateRaw', '2024-2-29'); h.set('endDateRaw', '2024-03-01');
    h.click('date-mode'); assert.equal(h.el('startDateRaw').type, 'text'); assert.equal(h.el('startDateRaw').value, '2024-2-29'); assert(h.el('date-mode-error').textContent);
    h.set('startDateRaw', '2024-02-29'); h.click('date-mode'); assert.equal(h.el('startDateRaw').type, 'date'); assert.equal(h.el('startDateRaw').value, '2024-02-29');
    h.click('date-mode'); assert.equal(h.el('startDateRaw').value, '2024-02-29');
  });
  test(`${locale} B12 success/reject/unavailable clipboard handlers`, async () => {
    let calls = 0; const d = deferred(); const h = harness(locale, (text) => { calls += 1; assert.equal(text, locale === 'en' ? P5_EN : P5_ZH); return d.promise; });
    h.fill(); h.submit(); assert.equal(calls, 0);
    const pending = h.click('copy')[0]; h.click('copy'); assert.equal(calls, 1); assert(h.el('copy').disabled); assert.equal(h.el('copy-status').textContent, '');
    d.resolve(); await pending; assert.equal(h.el('copy-status').textContent, MESSAGES[locale].copied); assert(!h.el('copy').disabled);
    for (const write of [undefined, () => Promise.reject(new Error('CANARY_REJECT'))]) {
      const r = harness(locale, write); r.fill(); r.submit(); await r.click('copy')[0];
      assert.equal(r.el('copy-status').textContent, MESSAGES[locale].copyDenied); assert.equal(r.doc.activeElement.id, 'report'); assert.equal(r.el('report').selectionStart, 0); assert.equal(r.el('report').selectionEnd, r.el('report').value.length); assert(!r.el('copy').disabled);
    }
  });
  test(`${locale} B13/B25 actual Blob content, fixed filename and delayed URL cleanup`, async () => {
    const h = harness(locale); h.fill(); h.submit(); h.click('download');
    assert.equal(h.created.size, 1); const [url, blob] = [...h.created][0];
    assert.equal(blob.type, 'text/plain;charset=utf-8'); assert.equal(await blob.text(), h.el('report').value);
    assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new TextEncoder().encode(locale === 'en' ? P5_EN : P5_ZH));
    assert.deepEqual(h.doc.downloads, [{ href: url, download: 'glossquote-reading-plan.txt' }]); assert.deepEqual(h.revoked, []);
    assert.equal(h.timers.size, 1); const timer = [...h.timers.values()][0]; assert(timer.delay >= 1000 && timer.delay <= 30000); timer.callback(); assert.deepEqual(h.revoked, [url]); assert.equal(h.timers.size, 0);
    h.click('download'); const second = [...h.created.keys()][1]; h.win.emit('pagehide'); assert(h.revoked.includes(second)); assert.equal(h.timers.size, 0);
  });
  for (const outcome of ['resolve', 'reject']) {
    test(`${locale} B14 old A ${outcome}/finally cannot affect pending B`, async () => {
      const a = deferred(), b = deferred(); let calls = 0;
      const h = harness(locale, () => (++calls === 1 ? a.promise : b.promise));
      h.fill(); h.submit(); const old = h.click('copy')[0]; h.click('copy'); assert.equal(calls, 1);
      h.set('completedPagesRaw', '50'); h.submit(); const recent = h.click('copy')[0]; assert.equal(calls, 2); assert(h.el('copy').disabled);
      h.el('totalPagesRaw').focus(); const focus = h.doc.activeElement;
      a[outcome](outcome === 'reject' ? new Error('OLD_A') : undefined); await old;
      assert(h.el('copy').disabled); assert.equal(h.el('copy').attrs['aria-busy'], 'true'); assert.equal(h.el('copy-status').textContent, ''); assert.equal(h.doc.activeElement, focus);
      b.resolve(); await recent; assert(!h.el('copy').disabled); assert.equal(h.el('copy-status').textContent, MESSAGES[locale].copied);
    });
  }
  test(`${locale} B14/B15 pagehide, persisted pageshow and clear invalidate callbacks`, async () => {
    for (const event of ['pagehide', 'pageshow', 'clear']) {
      const a = deferred(); const h = harness(locale, () => a.promise); h.fill(); h.submit(); const pending = h.click('copy')[0];
      if (event === 'clear') { h.click('clear'); h.click('confirm-clear'); } else h.win.emit(event, { persisted: true });
      const state = h.el('status').textContent; a.reject(new Error('OLD')); await pending;
      assert.equal(h.el('status').textContent, state); assert.equal(h.el('report').value, ''); assert.equal(h.el('totalPagesRaw').value, ''); assert.equal(h.el('completedPagesRaw').value, '0'); assert.equal(h.el('copy-status').textContent, ''); assert(h.el('result').hidden);
    }
  });
  test(`${locale} B24 errors are associated, fixed and preserve raw values`, () => {
    const h = harness(locale); h.fill({ totalPagesRaw: '１,000', startDateRaw: '2026-02-30' }); h.submit();
    assert.equal(h.el('totalPagesRaw').value, '１,000'); assert.equal(h.el('totalPagesRaw').attrs['aria-invalid'], 'true'); assert.equal(h.doc.activeElement.id, 'totalPagesRaw'); assert(h.el('totalPagesRaw-error').textContent); assert(!h.el('errors').textContent.includes('１,000'));
    h.set('titleRaw', '組字中', { isComposing: true }); assert(h.el('errors').hidden); assert.equal(h.el('report').value, '');
  });
}
test('every stable error code has both language messages', () => {
  const expected = ['TITLE_TYPE', 'TITLE_TOO_LONG', 'TITLE_CONTROL', 'TITLE_SURROGATE', 'TITLE_TRIMMED_TOO_LONG', 'TOTAL_TYPE', 'TOTAL_TOO_LONG', 'TOTAL_REQUIRED', 'TOTAL_FORMAT', 'TOTAL_RANGE', 'COMPLETED_TYPE', 'COMPLETED_TOO_LONG', 'COMPLETED_REQUIRED', 'COMPLETED_FORMAT', 'COMPLETED_RANGE', 'START_DATE_TYPE', 'START_DATE_TOO_LONG', 'START_DATE_REQUIRED', 'START_DATE_FORMAT', 'START_DATE_INVALID', 'START_DATE_RANGE', 'END_DATE_TYPE', 'END_DATE_TOO_LONG', 'END_DATE_REQUIRED', 'END_DATE_FORMAT', 'END_DATE_INVALID', 'END_DATE_RANGE', 'WEEKDAYS_TYPE', 'WEEKDAYS_EMPTY', 'WEEKDAYS_SPARSE', 'WEEKDAYS_EXTRA', 'WEEKDAYS_INVALID', 'WEEKDAYS_DUPLICATE', 'DAILY_CAP_TYPE', 'DAILY_CAP_TOO_LONG', 'DAILY_CAP_FORMAT', 'DAILY_CAP_RANGE', 'COMPLETED_GT_TOTAL', 'DATE_ORDER', 'DATE_WINDOW_TOO_LONG', 'NO_READING_DAYS', 'SCHEMA_SHAPE', 'SCHEMA_KEYS', 'SCHEMA_ACCESSOR', 'SCHEMA_UNINSPECTABLE'];
  assert.deepEqual(Object.keys(ERROR_KEYS).sort(), expected.sort());
  for (const code of expected) for (const locale of ['zh-Hant', 'en']) assert.equal(typeof errorMessage(code, locale), 'string');
});
