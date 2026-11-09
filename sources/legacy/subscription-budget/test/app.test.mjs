import test from 'node:test';
import assert from 'node:assert/strict';
import { mountApp } from '../public/js/app.mjs';
import { createDOM } from './fake-dom.mjs';

function app(lang = 'en', clipboard) { const dom = createDOM(lang, clipboard); mountApp(dom.doc, dom.win); return dom; }
function fields(dom, suffix) { return dom.get('rows').children.map(group => dom.get(`${group.id.slice(6)}-${suffix}`)); }
async function edit(element, value) { element.value = value; await element.emit('input'); }
async function calculate(dom) { await dom.get('budget-form').emit('submit'); }
async function example(dom) { await dom.get('example').click(); if (dom.get('confirm-dialog').open) await dom.get('confirm').click(); await calculate(dom); }
function invalidated(dom) {
  assert.equal(dom.get('results').hidden, true); assert.equal(dom.get('report').value, '');
  assert.equal(dom.get('summary').children.length, 0); assert.equal(dom.get('details').children.length, 0);
  assert.equal(dom.get('copy').disabled, true); assert.equal(dom.get('download').disabled, true);
  assert.equal(dom.get('export-status').textContent, '');
}
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test('UI initial, complete bilingual example and text-only markup rendering', async () => {
  for (const lang of ['zh-Hant', 'en']) {
    const dom = app(lang); invalidated(dom);
    assert.equal(fields(dom, 'nameRaw').length, 2); assert.equal(dom.get('currency').value, 'TWD');
    assert.ok(fields(dom, 'period').every(element => element.value === 'monthly'));
    assert.ok(fields(dom, 'plannedStop').every(element => element.checked === false));
    await example(dom);
    assert.equal(dom.get('results').hidden, false);
    assert.ok(dom.get('report').value.includes('4800.00')); assert.ok(dom.get('report').value.includes('400.00'));
    await edit(fields(dom, 'nameRaw')[0], '<img src=x onerror=alert(1)>'); await calculate(dom);
    assert.equal(dom.get('details').children[0].children[0].textContent, '<img src=x onerror=alert(1)>');
    assert.equal(dom.get('details').children[0].children[0].children.length, 0);
  }
});
test('UI invalidates every field, row add/remove and results atomically', async () => {
  const dom = app(); await example(dom);
  for (const [suffix, val] of [['nameRaw', 'Edited'], ['amountRaw', '100.25'], ['period', 'yearly']]) {
    await edit(fields(dom, suffix)[0], val); invalidated(dom); await calculate(dom);
  }
  const check = fields(dom, 'plannedStop')[0]; check.checked = true; await check.emit('change'); invalidated(dom); await calculate(dom);
  await edit(dom.get('currency'), 'USD'); invalidated(dom); await calculate(dom);
  await dom.get('add').click(); invalidated(dom);
  assert.equal(dom.doc.activeElement, fields(dom, 'nameRaw').at(-1));
  await fields(dom, 'remove')[3].click(); invalidated(dom); await calculate(dom);
  await fields(dom, 'remove')[1].click(); invalidated(dom);
  assert.equal(dom.doc.activeElement, fields(dom, 'nameRaw')[1]);
});
test('UI first-field validation, no partial output or blank-row skipping', async () => {
  const dom = app(); await calculate(dom); invalidated(dom);
  assert.equal(dom.doc.activeElement, fields(dom, 'nameRaw')[0]);
  assert.equal(fields(dom, 'nameRaw')[0].getAttribute('aria-invalid'), 'true');
  await example(dom); await edit(fields(dom, 'amountRaw')[1], '1000000.01'); await calculate(dom); invalidated(dom);
  assert.equal(dom.doc.activeElement, fields(dom, 'amountRaw')[1]); assert.ok(dom.get('error-summary').textContent.includes('1000000.00'));
  await edit(fields(dom, 'amountRaw')[1], ' 100'); await calculate(dom); assert.equal(dom.doc.activeElement, fields(dom, 'amountRaw')[1]);
});
test('UI clear and example confirmation cancel/Escape retain report; confirmation resets and focuses', async () => {
  const dom = app(); await example(dom); const report = dom.get('report').value;
  for (const action of ['clear', 'example']) {
    dom.get(action).focus(); await dom.get(action).click(); assert.equal(dom.get('confirm-dialog').open, true);
    await dom.get('cancel').click(); assert.equal(dom.get('report').value, report); assert.equal(dom.doc.activeElement, dom.get(action));
    await dom.get(action).click(); await dom.get('confirm-dialog').emit('cancel'); assert.equal(dom.get('report').value, report);
  }
  await dom.get('clear').click(); await dom.get('confirm').click(); invalidated(dom);
  assert.equal(fields(dom, 'nameRaw').length, 2); assert.ok(fields(dom, 'nameRaw').every(element => element.value === ''));
  assert.equal(dom.get('currency').value, 'TWD'); assert.equal(dom.doc.activeElement, fields(dom, 'nameRaw')[0]);
});
test('UI 60-row cap, removal to zero and explicit error then recovery', async () => {
  const dom = app();
  for (let index = 2; index < 60; index += 1) await dom.get('add').click();
  assert.equal(dom.get('rows').children.length, 60); assert.equal(dom.get('add').disabled, true);
  for (let index = 0; index < 60; index += 1) await fields(dom, 'remove')[0].click();
  assert.equal(dom.doc.activeElement, dom.get('add')); await calculate(dom);
  assert.ok(dom.get('error-summary').textContent.includes('at least one'));
  await dom.get('add').click(); assert.equal(fields(dom, 'nameRaw').length, 1);
});
test('B06 app callback: pending clipboard success/rejection cannot affect edited, cleared or hidden generations', async () => {
  for (const action of ['edit', 'clear', 'pagehide']) for (const outcome of ['resolve', 'reject']) {
    const pending = deferred(); let writes = 0;
    const dom = app('en', { writeText() { writes += 1; return pending.promise; } }); await example(dom);
    const copy = dom.get('copy').click(); assert.equal(dom.get('copy').textContent, 'Copying…');
    await dom.get('copy').click(); assert.equal(writes, 1);
    if (action === 'edit') await edit(fields(dom, 'nameRaw')[0], 'Edited');
    if (action === 'clear') { await dom.get('clear').click(); await dom.get('confirm').click(); }
    if (action === 'pagehide') await dom.win.emit('pagehide');
    const activeBefore = dom.doc.activeElement;
    pending[outcome](outcome === 'reject' ? new Error('DENIED_FAKE') : undefined); await copy;
    invalidated(dom); assert.equal(dom.get('copy').getAttribute('aria-busy'), 'false'); assert.equal(dom.doc.activeElement, activeBefore);
  }
});
test('B06 request identity: stale finally cannot clear a newer copy busy state', async () => {
  const first = deferred(); const second = deferred(); let count = 0;
  const dom = app('en', { writeText: () => (++count === 1 ? first.promise : second.promise) }); await example(dom);
  const oldCopy = dom.get('copy').click(); await edit(fields(dom, 'amountRaw')[0], '101'); await calculate(dom);
  const newCopy = dom.get('copy').click(); first.resolve(); await oldCopy;
  assert.equal(dom.get('copy').disabled, true); assert.equal(dom.get('copy').textContent, 'Copying…');
  second.resolve(); await newCopy; assert.equal(dom.get('export-status').textContent, 'Complete report copied.');
});
test('Clipboard missing and rejected give selected visible report, no success claim (mock environment)', async () => {
  for (const clipboard of [undefined, { writeText: () => Promise.reject(new Error('DENIED_FAKE')) }]) {
    const dom = app('en', clipboard); await example(dom); await dom.get('copy').click();
    assert.equal(dom.get('export-status').textContent, 'Not copied. Select the report and copy it manually.');
    assert.equal(dom.doc.activeElement, dom.get('report')); assert.equal(dom.get('report').selected, true); assert.equal(dom.get('copy').disabled, false);
  }
});
test('Download snapshot bytes, name and delayed/pagehide URL disposal (mock, not native download)', async () => {
  const dom = app(); await example(dom); const report = dom.get('report').value;
  await dom.get('download').click(); const download = dom.doc.downloads[0];
  assert.equal(download.filename, 'glossquote-subscription-budget.txt');
  const blob = dom.blobs.get(download.href); assert.equal(await blob.text(), report);
  const bytes = new Uint8Array(await blob.arrayBuffer()); assert.notDeepEqual([...bytes.subarray(0, 3)], [239, 187, 191]); assert.notEqual(bytes.at(-1), 10);
  const timer = [...dom.timers.values()][0]; assert.equal(timer.delay, 30000); timer.callback(); assert.ok(dom.revoked.includes(download.href));
  await dom.get('download').click(); const second = dom.doc.downloads[1];
  await dom.win.emit('pagehide'); assert.ok(dom.revoked.includes(second.href)); invalidated(dom);
  assert.ok(fields(dom, 'nameRaw').every(element => element.value === '')); assert.equal(dom.get('currency').value, 'TWD');
  await dom.win.emit('pageshow', { persisted: true }); assert.equal(fields(dom, 'nameRaw').length, 2);
});

test('Download A survives edit/recalculation/download B until its own deadline; pagehide clears all (app harness)', async () => {
  const dom = app(); await example(dom); await dom.get('download').click();
  const first = dom.doc.downloads[0].href; const firstTimer = [...dom.timers.values()][0];
  const firstText = await dom.blobs.get(first).text();
  await edit(fields(dom, 'amountRaw')[0], '101'); invalidated(dom);
  assert.ok(dom.blobs.has(first)); assert.ok(!dom.revoked.includes(first));
  await calculate(dom); await dom.get('download').click(); const second = dom.doc.downloads[1].href;
  assert.ok(dom.blobs.has(first)); assert.ok(dom.blobs.has(second)); assert.notEqual(await dom.blobs.get(second).text(), firstText);
  firstTimer.callback(); assert.ok(dom.revoked.includes(first)); assert.ok(dom.blobs.has(second));
  assert.equal(dom.get('download').disabled, false);
  await dom.win.emit('pagehide'); assert.equal(dom.blobs.size, 0); assert.equal(dom.timers.size, 0); invalidated(dom);
  firstTimer.callback(); invalidated(dom);
});

test('Eight pending downloads bound memory; release never re-enables stale results; bilingual limit recovers (app harness)', async () => {
  for (const lang of ['zh-Hant', 'en']) {
    const dom = app(lang); await example(dom);
    for (let index = 0; index < 8; index += 1) await dom.get('download').click();
    assert.equal(dom.blobs.size, 8); assert.equal(dom.get('download').disabled, true);
    assert.ok(dom.get('download-status').textContent.includes('30'));
    await dom.get('download').click(); assert.equal(dom.doc.downloads.length, 8);
    const firstTimer = [...dom.timers.values()][0]; firstTimer.callback();
    assert.equal(dom.blobs.size, 7); assert.equal(dom.get('download').disabled, false);
    await dom.get('download').click(); assert.equal(dom.blobs.size, 8);
    await edit(fields(dom, 'nameRaw')[0], 'Edited'); invalidated(dom);
    const nextTimer = [...dom.timers.values()][0]; nextTimer.callback(); invalidated(dom);
    assert.equal(dom.get('download-status').textContent, '');
    await calculate(dom); assert.equal(dom.get('download').disabled, false);
    await dom.get('download').click(); assert.equal(dom.get('download').disabled, true);
    await dom.get('clear').click(); await dom.get('confirm').click();
    assert.equal(dom.blobs.size, 8); await dom.win.emit('pagehide'); assert.equal(dom.blobs.size, 0);
  }
});
