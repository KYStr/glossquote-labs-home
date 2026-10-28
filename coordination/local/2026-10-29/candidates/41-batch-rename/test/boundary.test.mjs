import test from 'node:test';
import assert from 'node:assert/strict';
import { RenameWorkspace } from '../public/js/app.mjs';
import { buildStoreZip, MAX_CHUNK_BYTES } from '../public/js/core/zip-store.mjs';
import { LIMITS } from '../public/js/core/filename-planner.mjs';

const rule = { mode: 'sequence', base: 'copy', start: 1, width: 3 };
function workspace(options = {}) {
  const revoked = []; const emitted = []; let serial = 0;
  const ws = new RenameWorkspace({ createUrl: () => `blob:fake-${++serial}`, revokeUrl: url => revoked.push(url), onChange: state => emitted.push(state), ...options });
  return { ws, revoked, emitted };
}
function slowFile() {
  let resolveRead; let started; let cancelCalls = 0; let released = false; let streams = 0;
  const reading = new Promise(resolve => { started = resolve; });
  const file = { name: 'slow.bin', size: 1, stream() {
    if (++streams > 1) return new Blob([new Uint8Array([255])]).stream();
    return { getReader() { return {
      read() { started(); return new Promise(resolve => { resolveRead = resolve; }); },
      cancel() { cancelCalls++; return Promise.resolve(); },
      releaseLock() { released = true; },
    }; } };
  } };
  return { file, reading, late() { resolveRead({ done: false, value: new Uint8Array([255]) }); }, get cancelCalls() { return cancelCalls; }, get released() { return released; } };
}

test('N: rejected additions are atomic, retain old list, revoke old download, and never read bytes', async () => {
  let streams = 0; const { ws, revoked } = workspace();
  const old = new File([], 'old.txt'); ws.addFiles([old]); await ws.build();
  const oversized = { name: 'too-large', size: LIMITS.fileBytes + 1, stream() { streams++; throw new Error('MUST_NOT_READ'); } };
  assert.equal(ws.addFiles([new File([], 'new'), oversized]), false);
  assert.equal(streams, 0); assert.equal(ws.items.length, 1); assert.equal(ws.items[0].file, old);
  assert.equal(ws.url, null); assert.equal(ws.blob, null); assert.deepEqual(revoked, ['blob:fake-1']);
  assert.deepEqual(ws.selectionErrors, [{ code: 'FILE_LIMIT', index: 1 }]);
  assert.equal(ws.plan.rows[0].outputName, 'file-001.txt');
  const hundred = Array.from({ length: 100 }, (_, i) => new File([], `x${i}`));
  ws.clear(); assert.equal(ws.addFiles(hundred), true); assert.equal(ws.addFiles([new File([], '101')]), false);
  assert.equal(ws.items.length, 100); assert.equal(ws.selectionErrors[0].code, 'COUNT');
  ws.clear(); assert.equal(ws.addFiles([{ name: '\ud800', size: 0, stream() { streams++; } }]), false);
  assert.equal(ws.selectionErrors[0].code, 'UNICODE'); assert.equal(streams, 0);
});
test('N: 64 MiB metadata accepted, one extra byte rejected without streaming', () => {
  let streams = 0; const { ws } = workspace();
  const files = Array.from({ length: 4 }, (_, i) => ({ name: `f${i}`, size: LIMITS.fileBytes, stream() { streams++; } }));
  assert.equal(ws.addFiles(files), true); assert.equal(ws.plan.canBuild, true);
  assert.equal(ws.addFiles([{ name: 'one', size: 1, stream() { streams++; } }]), false);
  assert.equal(ws.items.length, 4); assert.equal(ws.selectionErrors[0].code, 'TOTAL_LIMIT'); assert.equal(streams, 0);
});
test('N: exactly 16 MiB is read serially in generated chunks with exact STORE length', async () => {
  let left = LIMITS.fileBytes; let sourceReads = 0;
  const entry = { name: 'boundary.bin', size: LIMITS.fileBytes, stream: () => new ReadableStream({ pull(controller) {
    if (!left) { controller.close(); return; }
    const size = Math.min(MAX_CHUNK_BYTES, left); left -= size; sourceReads++;
    controller.enqueue(new Uint8Array(size));
  } }) };
  const blob = await buildStoreZip([entry], { yieldTask: async () => {} });
  assert.equal(sourceReads, 64); assert.equal(blob.size, 16777338); assert.equal(left, 0);
});
test('N: tiny source chunks are coalesced; archive part count is bounded by bytes, not reads', async () => {
  let left = 1000; let yields = 0; let sizes;
  const entry = { name: 'tiny', size: 1000, stream: () => new ReadableStream({ pull(controller) {
    if (!left--) { controller.close(); return; } controller.enqueue(new Uint8Array([1]));
  } }) };
  const blob = await buildStoreZip([entry], { yieldTask: async () => { yields++; }, createBlob(parts) { sizes = parts.map(p => p.byteLength); return new Blob(parts, { type: 'application/zip' }); } });
  assert.deepEqual(sizes, [30, 4, 1000, 46, 4, 22]); assert.equal(blob.size, 1106); assert.equal(yields, 16);
});
test('N: stream concurrency is one, zero-byte entries preserved, reader locks released', async () => {
  let active = 0; let max = 0; let releases = 0; const order = [];
  const entries = ['first', 'second', 'third'].map(name => ({ name, size: 0, stream() {
    order.push(name); max = Math.max(max, ++active);
    return { getReader() { return { async read() { return { done: true }; }, async cancel() {}, releaseLock() { active--; releases++; } }; } };
  } }));
  await buildStoreZip(entries); assert.equal(max, 1); assert.equal(active, 0); assert.equal(releases, 3);
  assert.deepEqual(order, ['first', 'second', 'third']);
});
test('N: appended batches preserve FileList order and move/remove recompute serial names', () => {
  const { ws } = workspace();
  ws.addFiles([new File([], 'z.TXT'), new File([], 'a.JPG')]); ws.addFiles([new File([], 'second.bin'), new File([], 'last')]);
  assert.deepEqual(ws.items.map(i => i.name), ['z.TXT', 'a.JPG', 'second.bin', 'last']);
  const moved = ws.items[2].id; ws.move(moved, -1);
  assert.deepEqual(ws.items.map(i => i.name), ['z.TXT', 'second.bin', 'a.JPG', 'last']);
  assert.deepEqual(ws.plan.rows.map(r => r.outputName), ['file-001.TXT', 'file-002.bin', 'file-003.JPG', 'file-004']);
  assert.equal(ws.move(ws.items[0].id, -1), false); assert.equal(ws.move(ws.items[3].id, 1), false);
  ws.remove(moved); assert.deepEqual(ws.plan.rows.map(r => r.outputName), ['file-001.TXT', 'file-002.JPG', 'file-003']);
});
test('N: cancel/source/rule/mode/order/remove/clear discard late build results (B gates remain NOT_RUN)', async t => {
  const actions = {
    cancel: ws => ws.cancel(),
    source: ws => ws.addFiles([new File([], 'added')]),
    rule: ws => ws.setRule(rule),
    mode: ws => ws.setRule({ mode: 'replace', find: 'not-found', replacement: '', prefix: 'p-' }),
    order: ws => ws.move(ws.items[1].id, -1),
    remove: ws => ws.remove(ws.items[1].id),
    clear: ws => ws.clear(),
  };
  for (const [name, action] of Object.entries(actions)) await t.test(name, async () => {
    const slow = slowFile(); const { ws, revoked } = workspace();
    ws.addFiles([slow.file, new File([], 'second')]);
    const oldGeneration = ws.generation; const oldBuild = ws.build(); await slow.reading;
    assert.equal(ws.status, 'building'); action(ws);
    assert.ok(ws.generation > oldGeneration); assert.equal(ws.url, null); assert.equal(ws.blob, null); assert.equal(slow.cancelCalls, 1);
    if (name !== 'clear') {
      assert.equal(ws.items.some(i => i.file === slow.file), true);
      assert.equal(await ws.build(), true); assert.equal(ws.url, 'blob:fake-1');
    } else { assert.equal(ws.items.length, 0); assert.deepEqual(ws.rule, { mode: 'sequence', base: 'file', start: 1, width: 3 }); }
    const latest = ws.status; slow.late(); assert.equal(await oldBuild, false);
    assert.equal(slow.released, true); assert.equal(ws.status, latest); assert.deepEqual(revoked, []);
    assert.equal(ws.url, name === 'clear' ? null : 'blob:fake-1');
    ws.clear(); if (name !== 'clear') assert.deepEqual(revoked, ['blob:fake-1']);
  });
});
test('N: ready URLs synchronously revoke for every edit and all File references clear', async t => {
  for (const action of [ws => ws.cancel(), ws => ws.setRule(rule), ws => ws.setRule({ ...rule, base: '' }), ws => ws.move(ws.items[1].id, -1), ws => ws.remove(ws.items[0].id), ws => ws.addFiles([]), ws => ws.clear()]) await t.test('invalidate ready result', async () => {
    const { ws, revoked, emitted } = workspace(); ws.addFiles([new File([], 'a'), new File([], 'b')]); await ws.build();
    const previous = ws.generation; action(ws);
    assert.ok(ws.generation > previous); assert.equal(ws.url, null); assert.equal(ws.blob, null); assert.deepEqual(revoked, ['blob:fake-1']);
    assert.equal(emitted.at(-1).url, null); ws.clear(); assert.deepEqual(ws.items, []); assert.equal(ws.job, null);
  });
});
test('N: duplicate build blocked, stale progress ignored, URL made stale during creation revoked', async () => {
  let finish; let progress; let calls = 0;
  const { ws } = workspace({ writer: async (_, options) => { calls++; progress = options.onProgress; return new Promise(resolve => { finish = resolve; }); } });
  ws.addFiles([new File([], 'zero')]); const oldBuild = ws.build(); assert.equal(await ws.build(), false); assert.equal(calls, 1);
  ws.clear(); progress({ current: 99, completed: 99, total: 99 }); assert.equal(ws.progress, null);
  finish(new Blob([], { type: 'application/zip' })); assert.equal(await oldBuild, false); assert.equal(ws.url, null);
  const revoked = []; let reentrant;
  reentrant = new RenameWorkspace({ createUrl() { reentrant.clear(); return 'blob:expired'; }, revokeUrl: url => revoked.push(url) });
  reentrant.addFiles([new File([], 'zero')]); assert.equal(await reentrant.build(), false); assert.deepEqual(revoked, ['blob:expired']); assert.equal(reentrant.url, null);
});
test('BR37 N: read/size/Blob/URL errors are fixed codes, no partial output, state retained for retry', async () => {
  for (const [fixture, expected] of [
    [{ name: 'short', size: 2, stream: () => new Blob([new Uint8Array([0])]).stream() }, 'READ_SIZE'],
    [{ name: 'throw', size: 1, stream() { throw new Error('PRIVATE RAW PAYLOAD'); } }, 'READ_FAILED'],
  ]) {
    const { ws } = workspace(); ws.addFiles([fixture]); assert.equal(await ws.build(), false);
    assert.equal(ws.errors[0].code, expected); assert.equal(ws.url, null); assert.equal(ws.blob, null); assert.equal(ws.items[0].file, fixture);
    assert.ok(!JSON.stringify(ws.state()).includes('PRIVATE RAW PAYLOAD'));
  }
  await assert.rejects(buildStoreZip([{ name: 'zero', size: 0, stream: () => new Blob([]).stream() }], { createBlob() { throw new Error('PRIVATE RAW PAYLOAD'); } }), error => error.code === 'ZIP_FAILED' && error.message === 'ZIP_FAILED');
  let cancelled = 0; let released = 0;
  const broken = { name: 'broken', size: 2, stream: () => ({ getReader: () => ({
    async read() { throw new Error('PRIVATE READER FAILURE'); }, async cancel() { cancelled++; }, releaseLock() { released++; },
  }) }) };
  await assert.rejects(buildStoreZip([broken]), error => error.code === 'READ_FAILED' && error.message === 'READ_FAILED');
  assert.equal(cancelled, 1); assert.equal(released, 1);
  const failedUrl = workspace({ createUrl() { throw new Error('PRIVATE URL FAILURE'); } }).ws;
  failedUrl.addFiles([new File([], 'zero')]); assert.equal(await failedUrl.build(), false); assert.deepEqual(failedUrl.errors, [{ code: 'ZIP_FAILED' }]); assert.equal(failedUrl.items.length, 1); assert.equal(failedUrl.blob, null);
});
