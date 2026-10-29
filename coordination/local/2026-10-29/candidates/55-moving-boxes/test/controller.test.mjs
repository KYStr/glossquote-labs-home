import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../public/js/controller.mjs';
import { LIMITS } from '../public/js/core/schema.mjs';
import en from '../public/js/locales/en.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';

export function harness(language = 'zh-Hant') {
  const blobs = new Map(), revoked = [], readers = [], timers = new Map(), notifications = [];
  let sequence = 0;
  class Reader {
    constructor() { this.readyState = 0; readers.push(this); }
    readAsArrayBuffer(file) { this.file = file; this.readyState = 1; }
    abort() { this.readyState = 2; this.aborted = true; this.onabort?.(); }
    finish(source) { this.result = typeof source === 'string' ? new TextEncoder().encode(source).buffer : source; this.readyState = 2; this.onload?.(); }
    fail() { this.readyState = 2; this.onerror?.(); }
  }
  const adapters = {
    language, notify: (view, kind) => notifications.push({ view, kind }), createReader: () => new Reader(),
    makeBlob: (parts, options) => new Blob(parts, options),
    createURL: blob => { const url = 'blob:fake-' + ++sequence; blobs.set(url, blob); return url; },
    revokeURL: url => { revoked.push(url); blobs.delete(url); },
    setTimer: (fn, delay) => { const id = ++sequence; timers.set(id, { fn, delay }); return id; }, clearTimer: id => timers.delete(id)
  };
  return { controller: createController(adapters), adapters, Reader, blobs, revoked, readers, timers, notifications };
}

test('controller starts genuinely empty; example is explicit and replace requires cancel/confirm', () => {
  const { controller: c } = harness();
  assert.deepEqual(c.view().counts, { boxes: 0, items: 0 });
  c.loadExample(); assert.deepEqual(c.view().counts, { boxes: 2, items: 2 });
  c.loadExample(); assert.equal(c.view().confirmation.kind, 'example');
  const original = c.view().project; c.cancel(); assert.deepEqual(c.view().project, original);
});
test('source input, invalid edit, mode and search synchronously invalidate prior output', () => {
  const h = harness(); const c = h.controller; c.loadExample();
  for (const change of [() => c.editDraft(true), () => c.setMode('json'), () => c.setQuery('充電器'), () => c.addItem('BX001', { name: 'x', quantity: '1e2', notes: '' })]) {
    c.setDraftDirty(false); c.prepareExport(); assert.ok(c.view().prepared);
    change(); assert.equal(c.view().prepared, null); assert.equal(c.download(), null); assert.equal(h.blobs.size, 0);
  }
  assert.equal(c.view().code, 'INVALID_QUANTITY');
  assert.equal(c.view().field, 'item.quantity');
  assert.equal(c.view().counts.items, 2);
});
test('unsaved form edits cannot export the previously saved inventory', () => {
  const { controller: c } = harness(); c.loadExample(); c.editDraft(true);
  assert.equal(c.prepareExport(), false); assert.equal(c.view().code, 'UNSAVED_DRAFTS'); assert.equal(c.view().prepared, null);
});
test('download produces actual UTF-8 bytes, fixed ASCII filename and delayed URL cleanup', async () => {
  const h = harness('en'); const c = h.controller; c.loadExample(); c.setMode('boxes'); c.prepareExport();
  const [blob] = h.blobs.values();
  assert.equal(await blob.text(), 'Box contents\n\nBox: BX001\nDestination room: Kitchen\nOpen first\n  Pot | Quantity: 1\n\nBox: BX002\nDestination room: Study\nStandard unpacking\n  Charger | Quantity: 2\n');
  const file = c.download(); assert.equal(file.filename, 'moving-boxes-contents.txt');
  assert.equal(h.revoked.length, 0); assert.equal(c.download(), null);
  const [{ fn, delay }] = h.timers.values(); assert.equal(delay, 10000); fn(); assert.deepEqual(h.revoked, [file.url]);
});
test('file import validates first, previews counts, cancellation leaves project exact', () => {
  const h = harness(); const c = h.controller; c.loadExample(); const previous = c.view().project;
  c.importFile({ size: 38 }); assert.equal(c.view().busy, true);
  h.readers[0].finish('{"schemaVersion":1,"boxes":[]}');
  assert.equal(c.view().confirmation.boxes, 0); assert.equal(c.view().confirmation.items, 0);
  assert.deepEqual(c.view().project, previous); c.cancel(); assert.deepEqual(c.view().project, previous);
  c.importText('{"schemaVersion":1,"boxes":[]}'); c.confirm(); assert.deepEqual(c.view().counts, { boxes: 0, items: 0 });
});
test('late callbacks after reselection, edits, cancel and clear cannot resurrect import', () => {
  const h = harness(); const c = h.controller; c.loadExample();
  for (const cancel of [() => c.importFile({ size: 20 }), () => c.editDraft(true), () => c.cancel(), () => c.clear()]) {
    c.importFile({ size: 20 }); const stale = h.readers.at(-1); cancel();
    const before = c.view(); stale.finish('{"schemaVersion":1,"boxes":[]}'); stale.fail();
    assert.deepEqual(c.view(), before); assert.equal(stale.aborted, true);
  }
});
test('bad file, oversize, schema and read failure leave current project unchanged, output gone', () => {
  const h = harness(); const c = h.controller; c.loadExample(); const previous = c.view().project;
  c.prepareExport(); c.importFile({ size: LIMITS.importBytes + 1 }); assert.equal(c.view().code, 'IMPORT_TOO_LARGE');
  assert.equal(h.readers.length, 0); assert.equal(c.view().prepared, null);
  c.importFile({ size: 20 }); h.readers[0].fail(); assert.equal(c.view().code, 'READ_FAILED');
  c.importText('{"schemaVersion":1,"boxes":[],"bad":1}'); assert.equal(c.view().code, 'INVALID_SCHEMA');
  assert.deepEqual(c.view().project, previous);
});
test('import rejects malformed UTF-8 before schema; control-only auto ID is rejected', () => {
  const h = harness(); const c = h.controller; c.loadExample(); const previous = c.view().project;
  c.importFile({ size: 2 }); h.readers[0].finish(new Uint8Array([0xc3, 0x28]).buffer); assert.equal(c.view().code, 'INVALID_JSON');
  c.createBox({ id: '\n', room: 'Office', priority: false, notes: '' }); assert.equal(c.view().code, 'INVALID_TEXT');
  assert.deepEqual(c.view().project, previous);
});
test('pending edits cannot disappear through empty box or item removal', () => {
  const { controller: c } = harness(); c.loadExample(); const previous = c.view().project; c.editDraft(true);
  assert.equal(c.requestDeleteBox('BX001'), false); assert.equal(c.view().code, 'UNSAVED_EDITS');
  assert.equal(c.requestDeleteItem('BX002', 'I000002'), false); assert.equal(c.view().confirmation, null); assert.deepEqual(c.view().project, previous);
});
test('A15 D01 file size gate allows 8 MiB, rejects 8 MiB+1 before reading and validates actual buffer size', () => {
  const h = harness(); const c = h.controller; c.loadExample(); const before = c.view().project;
  c.importFile({ size: 8_388_608 }); assert.equal(h.readers.length, 1); assert.equal(c.view().busy, true);
  const base = '{"schemaVersion":1,"boxes":[]}'; h.readers[0].finish(base + ' '.repeat(8_388_608 - base.length));
  assert.equal(c.view().confirmation.boxes, 0); c.cancel(); assert.deepEqual(c.view().project, before);
  c.importFile({ size: 8_388_609 }); assert.equal(h.readers.length, 1); assert.equal(c.view().code, 'IMPORT_TOO_LARGE');
  c.importFile({ size: 1 }); h.readers[1].finish(new ArrayBuffer(8_388_609)); assert.equal(c.view().code, 'IMPORT_TOO_LARGE'); assert.deepEqual(c.view().project, before);
});
test('nonempty box and item deletion use in-page confirmation; cancellation is exact', () => {
  const { controller: c } = harness(); c.loadExample(); const previous = c.view().project;
  c.requestDeleteBox('BX001'); assert.deepEqual(c.view().confirmation, { kind: 'box', id: 'BX001', count: 1 }); c.cancel(); assert.deepEqual(c.view().project, previous);
  c.requestDeleteItem('BX002', 'I000002'); c.cancel(); assert.deepEqual(c.view().project, previous);
  c.requestDeleteItem('BX002', 'I000002'); c.confirm(); assert.equal(c.view().counts.items, 1);
  c.requestDeleteBox('BX002'); assert.equal(c.view().counts.boxes, 1);
});
test('clear and disposal release prepared and handed-off URLs, pending readers and data', () => {
  const h = harness(); const c = h.controller; c.loadExample(); c.prepareExport(); c.download();
  c.clear(); assert.equal(h.blobs.size, 0); assert.equal(h.timers.size, 0); assert.deepEqual(c.view().counts, { boxes: 0, items: 0 });
  c.importFile({ size: 20 }); const stale = h.readers[0]; c.dispose(); stale.finish('{"schemaVersion":1,"boxes":[]}');
  assert.equal(c.view().disposed, true); assert.equal(c.view().confirmation, null); assert.equal(c.prepareExport(), false);
});
test('all controller errors and status codes have bilingual fixed copy', () => {
  assert.deepEqual(Object.keys(en.words).sort(), Object.keys(zh.words).sort());
  assert.deepEqual(Object.keys(en.status).sort(), Object.keys(zh.status).sort());
  assert.deepEqual(Object.keys(en.errors).sort(), Object.keys(zh.errors).sort());
  for (const dictionary of [en, zh]) for (const group of ['words', 'status', 'errors']) assert.ok(Object.values(dictionary[group]).every(value => typeof value === 'string' && value.length));
});
