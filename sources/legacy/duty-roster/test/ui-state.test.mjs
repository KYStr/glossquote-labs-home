import test from 'node:test';
import assert from 'node:assert/strict';
import { createRosterState } from '../public/js/core/ui-state.js';

test('UI: edits drop results; stale revision cannot be accepted', () => {
  const state = createRosterState(); const result = { ok: true };
  assert.equal(state.accept(result, 0), true); assert.equal(state.snapshot().requestId, 1);
  state.edit(); assert.equal(state.snapshot().result, null); assert.equal(state.accept(result, 0), false);
  assert.equal(state.accept(result, 1), true); assert.equal(state.snapshot().requestId, 2);
});
test('UI: reset changes generation and returns to no result', () => {
  const state = createRosterState(); state.accept({ ok: true }, 0); state.reset();
  assert.deepEqual(state.snapshot(), { revision: 1, requestId: 1, pageGeneration: 1, result: null, copyEpoch: 2, copyPending: false, activeDownloads: 0 });
});

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
test('B14 harness: edit/reset/new request suppress stale resolve, reject AND finally', async () => {
  for (const action of ['edit', 'reset', 'request']) for (const settle of ['resolve', 'reject']) {
    const state = createRosterState(); state.accept({ ok: true }, 0); const pending = deferred(); const events = [];
    state.copy(() => pending.promise, 'FAKE REPORT', phase => events.push(phase));
    if (action === 'request') state.accept({ ok: true }, 0); else state[action]();
    pending[settle](); await flush();
    assert.deepEqual(events, ['copying']); assert.equal(state.snapshot().copyPending, false);
  }
});
test('copy: current resolve/reject/throw, single pending promise and retry', async () => {
  for (const outcome of ['resolve', 'reject', 'throw']) {
    const state = createRosterState(); state.accept({ ok: true }, 0); const events = [];
    const pending = deferred(); let calls = 0;
    const write = text => { calls++; assert.equal(text, 'EXACT FAKE REPORT'); if (outcome === 'throw') throw Error('fake'); return pending.promise; };
    assert.equal(state.copy(write, 'EXACT FAKE REPORT', phase => events.push(phase)), true);
    if (outcome !== 'throw') { assert.equal(state.copy(write, 'EXACT FAKE REPORT', () => {}), false); pending[outcome](); await flush(); }
    assert.equal(calls, 1); assert.deepEqual(events, ['copying', outcome === 'resolve' ? 'copied' : 'failed', 'settled']); assert.equal(state.snapshot().copyPending, false);
  }
});
test('copy: old finalizer cannot release a newer pending write', async () => {
  const state = createRosterState(); state.accept({ ok: true }, 0); const old = deferred(); const next = deferred(); const events = [];
  state.copy(() => old.promise, 'old fake', phase => events.push(`old:${phase}`));
  state.edit(); state.accept({ ok: true }, 1); state.copy(() => next.promise, 'new fake', phase => events.push(`new:${phase}`));
  old.resolve(); await flush(); assert.equal(state.snapshot().copyPending, true);
  next.resolve(); await flush(); assert.deepEqual(events, ['old:copying', 'new:copying', 'new:copied', 'new:settled']);
});
function downloadHarness() {
  const timers = new Map(); const revoked = []; const cleared = []; const clicks = []; let nextTimer = 0; let nextURL = 0;
  const state = createRosterState({ setTimer(callback, ms) { assert.equal(ms, 30000); timers.set(++nextTimer, callback); return nextTimer; }, clearTimer(id) { timers.delete(id); cleared.push(id); }, revokeURL(url) { revoked.push(url); } });
  state.accept({ ok: true }, 0);
  return { state, timers, revoked, cleared, clicks, start: () => state.download(() => `blob:fake-${++nextURL}`, url => clicks.push(url)) };
}
test('B16 harness: exactly eight independent URL/timers, ninth blocked before allocation', () => {
  const h = downloadHarness(); for (let i = 0; i < 8; i++) assert.deepEqual(h.start(), { ok: true });
  assert.deepEqual(h.start(), { ok: false, code: 'DOWNLOAD_LIMIT' }); assert.equal(h.clicks.length, 8); assert.equal(h.timers.size, 8);
  const first = h.timers.values().next().value; first(); assert.deepEqual(h.revoked, ['blob:fake-1']); assert.equal(h.state.snapshot().activeDownloads, 7);
  assert.deepEqual(h.start(), { ok: true }); h.state.reset();
  assert.equal(h.timers.size, 0); assert.equal(h.state.snapshot().activeDownloads, 0); assert.equal(h.revoked.length, 9); assert.equal(h.cleared.length, 9);
});
test('downloads are independent of clipboard and edits; clear/pagehide reset cleans ownership', () => {
  const h = downloadHarness(); h.state.copy(() => new Promise(() => {}), 'fake', () => {});
  assert.deepEqual(h.start(), { ok: true }); h.state.edit(); assert.equal(h.state.snapshot().activeDownloads, 1);
  assert.deepEqual(h.start(), { ok: false, code: 'NO_RESULT' }); h.state.reset(); assert.equal(h.revoked.length, 1); assert.equal(h.timers.size, 0);
});
test('download failure branches revoke URL and clear timers without leaking partial ownership', () => {
  const h = downloadHarness();
  assert.deepEqual(h.state.download(() => { throw Error('fake'); }, () => {}), { ok: false, code: 'DOWNLOAD_FAILED' });
  assert.deepEqual(h.state.download(() => 'blob:fake-throw', () => { throw Error('fake'); }), { ok: false, code: 'DOWNLOAD_FAILED' });
  assert.equal(h.timers.size, 0); assert.deepEqual(h.revoked, ['blob:fake-throw']);
  const revoked = []; const state = createRosterState({ setTimer() { throw Error('fake'); }, clearTimer() {}, revokeURL: url => revoked.push(url) }); state.accept({ ok: true }, 0);
  assert.deepEqual(state.download(() => 'blob:fake-timer', () => {}), { ok: false, code: 'DOWNLOAD_FAILED' }); assert.deepEqual(revoked, ['blob:fake-timer']); assert.equal(state.snapshot().activeDownloads, 0);
});
