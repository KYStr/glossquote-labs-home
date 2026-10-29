import test from 'node:test';
import assert from 'node:assert/strict';
import { createController, readLocalFile } from '../public/js/controller.mjs';
import { parseDeckJson } from '../public/js/core/schema.mjs';

const csv = 'q,a\nA,a\nB,b\nC,c';
const incoming = '{"schemaVersion":1,"cards":[{"id":17,"question":"新題","answer":"新答"}],"known":[17]}';
const bytes = text => new TextEncoder().encode(text);
function ready(options = {}) { const controller = createController(options); controller.setSource(csv); assert.equal(controller.start(), true); return controller; }
function assessA(controller) { controller.dispatch({ type: 'reveal' }); controller.dispatch({ type: 'assess', value: 'known' }); }
function deferred() { let resolve, reject, aborted = false; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject, cancel: () => { aborted = true; }, get aborted() { return aborted; } }; }

test('A12 JSON import preview/cancel leaves original three cards and progress unchanged', () => {
  const c = ready(); assessA(c); c.prepare('json');
  const original = c.snapshot().session;
  assert.equal(c.previewImport(incoming), true);
  assert.equal(c.snapshot().pendingImport.cards.length, 1); assert.equal(c.snapshot().session, original); assert.equal(c.snapshot().prepared, null);
  assert.equal(c.dispatch({ type: 'next' }), false);
  c.cancel(); assert.equal(c.snapshot().session, original); assert.deepEqual([...c.snapshot().session.known], [1]); assert.equal(c.snapshot().session.cards.length, 3);
});
test('import confirmation replaces once, preserves incoming IDs/progress and starts hidden', () => {
  const c = ready(); c.previewImport(incoming); assert.equal(c.confirmImport(), true);
  assert.equal(c.snapshot().session.cards.length, 1); assert.equal(c.snapshot().session.currentId, 17); assert.equal(c.snapshot().session.revealed, false);
  assert.deepEqual([...c.snapshot().session.known], [17]); assert.equal(c.confirmImport(), false);
  assert.equal(c.prepare('json'), true); assert.deepEqual(parseDeckJson(c.snapshot().prepared.text).known, [17]);
});
test('reset and edit require page confirmation; cancelling preserves progress', () => {
  const c = ready(); assessA(c); c.prepare('json'); c.requestConfirmation('reset');
  assert.deepEqual([...c.snapshot().session.known], [1]); assert.equal(c.snapshot().prepared, null);
  c.cancel(); assert.deepEqual([...c.snapshot().session.known], [1]);
  c.requestConfirmation('reset'); c.confirm(); assert.equal(c.snapshot().session.known.size, 0);
  assert.equal(c.setSource('new,b'), false); c.requestConfirmation('edit'); c.confirm();
  assert.equal(c.snapshot().session, null); assert.equal(c.snapshot().source, csv);
  c.setSource('q,a\nA, '); assert.equal(c.start(), false); assert.equal(c.snapshot().error.code, 'EMPTY_FACE'); assert.equal(c.snapshot().source, 'q,a\nA, '); assert.equal(c.snapshot().prepared, null);
});
test('progress, mode, seed, import and output-option changes synchronously invalidate prepared bytes', () => {
  const c = ready();
  for (const change of [() => c.dispatch({ type: 'reveal' }), () => c.dispatch({ type: 'next' }), () => c.dispatch({ type: 'setMode', mode: 'review' }), () => c.setPracticeSeed('42'), () => c.invalidateOutput(), () => c.previewImport(incoming)]) {
    if (c.snapshot().pendingImport) c.cancel();
    c.prepare('html'); assert.ok(c.snapshot().prepared); change(); assert.equal(c.snapshot().prepared, null);
  }
});
test('source/settings retain editable source, no previous result after a bad setting', () => {
  const c = createController(); c.setSource(csv); c.inspect();
  assert.deepEqual(c.snapshot().columns, [{ index: 0, label: 'q' }, { index: 1, label: 'a' }]);
  c.setSetting('answerColumn', 0); assert.equal(c.start(), false); assert.equal(c.snapshot().error.code, 'INVALID_COLUMNS'); assert.equal(c.snapshot().session, null);
  c.setSetting('answerColumn', 1); assert.equal(c.start(), true);
});
test('seed 42 can be explicit or generated; reshuffle preserves known cards', () => {
  const c = createController({ randomSeed: () => 42 }); c.setSource(csv); c.setSetting('shuffle', true); assert.equal(c.start(), true);
  assert.deepEqual(c.snapshot().session.order, [3, 2, 1]); assert.equal(c.snapshot().settings.seed, '42');
  c.dispatch({ type: 'reveal' }); c.dispatch({ type: 'assess', value: 'known' }); c.setPracticeSeed('42'); c.reshuffle();
  assert.deepEqual([...c.snapshot().session.known], [3]); assert.equal(c.snapshot().session.revealed, false);
  c.prepare('json'); c.setPracticeSeed('0'); assert.equal(c.snapshot().prepared, null); assert.equal(c.reshuffle(), false); assert.equal(c.snapshot().error.code, 'INVALID_SEED');
});
test('clear/cancel and source edits discard late file resolutions, without resurrecting results', async () => {
  for (const operation of ['clear', 'cancel', 'edit']) {
    const task = deferred(), c = createController({ readFile: () => task });
    const pending = c.loadFile({ size: 10 }, 'csv'); assert.equal(c.snapshot().phase, 'running');
    if (operation === 'edit') c.setSource('q,a\nFresh,kept'); else c[operation]();
    assert.equal(task.aborted, true); task.resolve(bytes(csv)); assert.equal(await pending, false);
    assert.equal(c.snapshot().session, null); assert.equal(c.snapshot().source, operation === 'edit' ? 'q,a\nFresh,kept' : '');
  }
});
test('rapid file replacement discards first resolution and keeps only second', async () => {
  const first = deferred(), second = deferred(), queue = [first, second];
  const c = createController({ readFile: () => queue.shift() });
  const p1 = c.loadFile({ size: 10 }, 'csv'), p2 = c.loadFile({ size: 10 }, 'csv');
  second.resolve(bytes('q,a\nSecond,answer')); assert.equal(await p2, true);
  first.resolve(bytes('q,a\nFirst,answer')); assert.equal(await p1, false);
  assert.equal(c.snapshot().source, 'q,a\nSecond,answer'); assert.equal(first.aborted, true);
});
test('JSON file read is cancellable, keeps old session, and invalid/fatal reads never restore prepared exports', async () => {
  const task = deferred(), c = ready({ readFile: () => task }); assessA(c); c.prepare('html'); const original = c.snapshot().session;
  const pending = c.loadFile({ size: 100 }, 'json'); assert.equal(c.snapshot().prepared, null); c.cancel(); task.resolve(bytes(incoming));
  assert.equal(await pending, false); assert.equal(c.snapshot().session, original);
  for (const data of [Uint8Array.from([195, 40]), bytes('{'), bytes('{"schemaVersion":1,"cards":[],"known":[]}')] ) {
    const broken = ready({ readFile: () => ({ promise: Promise.resolve(data), cancel() {} }) }); broken.prepare('json');
    assert.equal(await broken.loadFile({ size: data.length }, 'json'), false); assert.equal(broken.snapshot().prepared, null); assert.equal(broken.snapshot().error.field, 'json'); assert.equal(broken.snapshot().session.cards.length, 3);
  }
});
test('pre-read hard caps prevent opening oversized files, decoded size is checked again', async () => {
  let reads = 0;
  const c = createController({ readFile: () => { reads++; return { promise: Promise.resolve(new Uint8Array(1048577)), cancel() {} }; } });
  assert.equal(await c.loadFile({ size: 1048577 }, 'csv'), false); assert.equal(reads, 0);
  assert.equal(await c.loadFile({ size: 1 }, 'csv'), false); assert.equal(reads, 1); assert.equal(c.snapshot().error.code, 'SOURCE_TOO_LARGE');
});
test('CSV file errors preserve the existing editable source, and only success replaces it', async () => {
  const c = createController({ readFile: () => ({ promise: Promise.resolve(Uint8Array.from([195, 40])), cancel() {} }) });
  c.setSource(csv);
  assert.equal(await c.loadFile({ size: 1048577 }, 'csv'), false); assert.equal(c.snapshot().source, csv);
  assert.equal(await c.loadFile({ size: 2 }, 'csv'), false); assert.equal(c.snapshot().source, csv); assert.equal(c.snapshot().prepared, null); assert.equal(c.snapshot().phase, 'error');
  const task = deferred(), next = createController({ readFile: () => task }); next.setSource(csv);
  const pending = next.loadFile({ size: 20 }, 'csv'); assert.equal(next.snapshot().source, csv);
  task.resolve(bytes('q,a\nNew,answer')); assert.equal(await pending, true); assert.equal(next.snapshot().source, 'q,a\nNew,answer');
});
test('header changes keep numeric column identity and invalidate old header labels', () => {
  const c = createController(); c.setSource('Same,Same,Other\nA,a,x'); c.inspect(); c.setSetting('answerColumn', 2); c.setSetting('header', false);
  assert.deepEqual(c.snapshot().columns, [{ index: 0, label: '' }, { index: 1, label: '' }, { index: 2, label: '' }]);
  assert.equal(c.snapshot().settings.answerColumn, 2); assert.equal(c.start(), true); assert.equal(c.snapshot().session.cards[0].answer, 'Other');
});
test('dispose/resume also rejects pending reads from the old page generation', async () => {
  const task = deferred(), c = createController({ readFile: () => task });
  const pending = c.loadFile({ size: 20 }, 'csv'); c.dispose(); c.resume(); c.setSource('q,a\nRestored,new');
  task.resolve(bytes(csv)); assert.equal(await pending, false); assert.equal(c.snapshot().source, 'q,a\nRestored,new');
});
test('fixed export filenames, exact Blob bytes, deferred URL revocation and cleanup', async () => {
  const made = [], revoked = [], timers = new Map(); let serial = 0;
  const c = ready({ makeUrl: blob => { made.push(blob); return `blob:fake-${++serial}`; }, revokeUrl: url => revoked.push(url), setTimer: (fn, delay) => { assert.equal(delay, 30000); timers.set(serial, fn); return serial; }, clearTimer: id => timers.delete(id) });
  assessA(c); c.prepare('json'); const expected = c.snapshot().prepared.text;
  assert.equal(made.length, 0); const result = c.download();
  assert.deepEqual(result, { url: 'blob:fake-1', filename: 'flashcards-deck.json' }); assert.equal(await made[0].text(), expected);
  assert.equal(made[0].type, 'application/json;charset=utf-8'); assert.equal(revoked.length, 0);
  timers.get(1)(); assert.deepEqual(revoked, ['blob:fake-1']);
  c.prepare('html'); assert.equal(c.download().filename, 'flashcards-study.html'); c.clear();
  assert.deepEqual(revoked, ['blob:fake-1', 'blob:fake-2']); assert.equal(c.snapshot().prepared, null);
});
test('URL replacement/settings changes and pagehide dispose release every owned URL', () => {
  const revoked = [], timers = new Map(); let serial = 0;
  const c = ready({ makeUrl: () => `blob:fake-${++serial}`, revokeUrl: url => revoked.push(url), setTimer: fn => { timers.set(serial, fn); return serial; }, clearTimer: id => timers.delete(id) });
  c.prepare('json'); c.download(); c.download(); c.invalidateOutput();
  assert.deepEqual(revoked, ['blob:fake-1', 'blob:fake-2']); assert.equal(timers.size, 0);
  c.prepare('json'); c.download(); c.dispose(); assert.deepEqual(revoked, ['blob:fake-1', 'blob:fake-2', 'blob:fake-3']);
  assert.equal(c.snapshot().session, null); assert.equal(c.start(), false); c.resume(); assert.equal(c.snapshot().source, '');
});
test('download refusal retains selectable current file text, without claiming a saved file', () => {
  const c = ready({ makeUrl: () => { throw new Error('FAKE_PRIVATE_MESSAGE'); } });
  c.prepare('json'); const text = c.snapshot().prepared.text;
  assert.equal(c.download(), null); assert.equal(c.snapshot().error.code, 'DOWNLOAD_UNAVAILABLE'); assert.equal(c.snapshot().prepared.text, text); assert.equal(c.snapshot().prepared.downloadDisabled, true);
  assert.ok(!JSON.stringify(c.snapshot().error).includes('FAKE_PRIVATE_MESSAGE')); assert.equal(c.download(), null);
});
test('unknown exceptions return a fixed error without raw input or stack', async () => {
  const c = ready({ readFile: () => { throw new Error('FAKE_PRIVATE_MESSAGE'); } });
  assert.equal(await c.loadFile({ size: 5 }, 'json'), false); assert.deepEqual(c.snapshot().error, { code: 'FILE_READ_FAILED', field: 'json', record: null });
  assert.equal(c.previewImport('{"schemaVersion":1,"cards":[{"id":1,"question":" ","answer":"a"}],"known":[]}'), false); assert.equal(c.snapshot().error.field, 'json');
});
test('FileReader adapter maps load, abort and error using fake data only', async () => {
  const original = globalThis.FileReader; let reader;
  class FakeReader {
    constructor() { reader = this; this.readyState = 0; }
    readAsArrayBuffer() { this.readyState = 1; }
    abort() { this.readyState = 2; this.onabort(); }
  }
  globalThis.FileReader = FakeReader;
  try {
    const first = readLocalFile({}); reader.result = bytes('abc').buffer; reader.readyState = 2; reader.onload(); assert.deepEqual(await first.promise, Uint8Array.from([97, 98, 99]));
    const second = readLocalFile({}); second.cancel(); await assert.rejects(second.promise, value => value.code === 'CANCELLED');
    const third = readLocalFile({}); reader.onerror(); await assert.rejects(third.promise, value => value.code === 'FILE_READ_FAILED');
  } finally { if (original === undefined) delete globalThis.FileReader; else globalThis.FileReader = original; }
});
