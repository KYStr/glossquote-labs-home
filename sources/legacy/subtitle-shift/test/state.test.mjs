import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../public/controller.mjs';
import { createDownloadUrls } from '../public/download-urls.mjs';
import { analyzeAndShiftSrt, ERROR_CODES } from '../public/core.mjs';
import { isTerminal, isShiftRequest } from '../public/protocol.mjs';
import { messages, describeError } from '../public/messages.mjs';
import { basic, shiftedBasic } from '../scripts/test-fixtures.mjs';

// Fake adapters exercise application state only. They are not browser evidence.
class Clock {
  time = 0; sequence = 0; live = new Map(); history = new Map();
  now = () => this.time;
  set = (fn, delay) => { const id = ++this.sequence; const timer = { fn, at: this.time + delay }; this.live.set(id, timer); this.history.set(id, timer); return id; };
  clear = id => { this.live.delete(id); };
  fireOld(id) { this.history.get(id).fn(); }
  advance(ms) {
    const target = this.time + ms;
    while (true) {
      const next = [...this.live.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      this.time = next[1].at; this.live.delete(next[0]); next[1].fn();
    }
    this.time = target;
  }
}
function pool(clock = new Clock(), overrides = {}) {
  const blobs = []; const created = []; const revoked = [];
  const urls = createDownloadUrls({ now: clock.now, setTimer: clock.set, clearTimer: clock.clear,
    createBlob: (bytes, type) => { const blob = { bytes: [...bytes], type }; blobs.push(blob); return blob; },
    createUrl: () => { const url = 'blob:fake-' + (created.length + 1); created.push(url); return url; }, revokeUrl: url => revoked.push(url), ...overrides });
  return { urls, clock, blobs, created, revoked };
}
function harness(overrides = {}) {
  const clock = new Clock(); const downloads = pool(clock); const workers = []; const changes = [];
  const createWorker = () => {
    const worker = { terminated: 0, request: null, postMessage(message) { this.request = structuredClone(message); }, terminate() { this.terminated++; } };
    workers.push(worker); return worker;
  };
  const controller = createController({ createWorker, setTimer: clock.set, clearTimer: clock.clear, urls: downloads.urls, onChange: state => changes.push(state), ...overrides });
  const prepare = () => { controller.edit('srtRaw', basic); controller.edit('direction', 'later'); controller.edit('secondsRaw', '1.25'); };
  const deliver = (worker = workers.at(-1), patch = {}) => {
    const { jobId, revision, pageGeneration, input } = worker.request;
    const outcome = analyzeAndShiftSrt(input);
    worker.onmessage({ data: { type: outcome.ok ? 'success' : 'failure', jobId, revision, pageGeneration, outcome, ...patch } });
  };
  return { controller, clock, workers, changes, downloads, prepare, deliver };
}
test('S01 initial state and unchanged-value edits', () => {
  const h = harness(); assert.deepEqual(h.controller.snapshot(), { srtRaw: '', direction: 'earlier', secondsRaw: '0', revision: 0, pageGeneration: 0, busy: false, composing: false, result: null, resultRevision: null, error: null, status: 'idle' });
  assert.equal(h.controller.hasContent(), false); h.controller.edit('secondsRaw', '0'); assert.equal(h.controller.snapshot().revision, 0); assert.equal(h.changes.length, 0); assert.equal(h.controller.download().ok, false);
});
test('S02 Worker request tokens, one job, complete terminal success', () => {
  const h = harness(); h.prepare(); h.controller.submit(); const w = h.workers[0];
  assert.deepEqual(w.request, { type: 'shift', jobId: 1, revision: 3, pageGeneration: 0, input: { srtRaw: basic, direction: 'later', secondsRaw: '1.25' } });
  assert.equal(h.controller.submit(), false); assert.equal(h.workers.length, 1); assert.equal(h.controller.snapshot().busy, true);
  h.deliver(); assert.equal(w.terminated, 1); assert.equal(h.controller.snapshot().result.srtText, shiftedBasic); assert.equal(h.clock.live.size, 0);
});
test('S03 all field changes synchronously invalidate result and download', () => {
  for (const [field, value] of [['srtRaw', basic + '\n'], ['direction', 'earlier'], ['secondsRaw', '2']]) {
    const h = harness(); h.prepare(); h.controller.submit(); h.deliver(); const before = h.controller.snapshot().revision;
    h.controller.edit(field, value); const state = h.controller.snapshot();
    assert.equal(state.revision, before + 1); assert.equal(state.result, null); assert.equal(state.resultRevision, null); assert.equal(h.controller.download().ok, false);
  }
});
test('S04 stale success/failure/error/messageerror and cleanup cannot touch new busy job', () => {
  const h = harness(); h.prepare(); h.controller.submit(); const old = h.workers[0]; const oldTimer = [...h.clock.live.keys()][0];
  h.controller.edit('secondsRaw', '2'); assert.equal(old.terminated, 1); h.controller.submit(); assert.equal(h.workers[1].request.jobId, 2);
  const before = h.controller.snapshot(); h.deliver(old); h.deliver(old, { type: 'failure', outcome: { ok: false, error: { code: 'NO_CUES', field: 'srtRaw', line: null, cueIndex: null } } });
  old.onerror({ preventDefault() {} }); old.onmessageerror({}); h.clock.fireOld(oldTimer);
  assert.deepEqual(h.controller.snapshot(), before); assert.equal(h.workers[1].terminated, 0); h.deliver(h.workers[1]); assert.equal(h.controller.snapshot().status, 'success');
});
test('S05 foreign tokens and Worker instance closures cannot replace current result', () => {
  const h = harness(); h.prepare(); h.controller.submit();
  const state = h.controller.snapshot();
  for (const patch of [{ jobId: 99 }, { revision: 99 }, { pageGeneration: 99 }]) { h.deliver(undefined, patch); assert.deepEqual(h.controller.snapshot(), state); }
  h.deliver(); const completed = h.controller.snapshot(); h.deliver(); assert.deepEqual(h.controller.snapshot(), completed);
});
test('S06 cancel terminates and retains raw draft', () => {
  const h = harness(); h.prepare(); h.controller.submit(); const old = h.workers[0]; h.controller.cancel(); const state = h.controller.snapshot();
  assert.equal(state.status, 'cancelled'); assert.equal(state.srtRaw, basic); assert.equal(state.result, null); assert.equal(old.terminated, 1); h.deliver(old); assert.deepEqual(h.controller.snapshot(), state);
});
test('S07 unavailable Worker has no fallback, draft is preserved', () => {
  const h = harness({ createWorker: () => { throw new Error('FAKE_PRIVATE'); } }); h.prepare(); assert.equal(h.controller.submit(), false);
  assert.equal(h.controller.snapshot().error.code, 'WORKER_UNAVAILABLE'); assert.equal(h.controller.snapshot().srtRaw, basic); assert.ok(!JSON.stringify(h.controller.snapshot().error).includes('FAKE_PRIVATE'));
});
test('S08 malformed envelopes fail closed, without raw details', () => {
  for (const message of [null, {}, { type: 'success', jobId: 1, revision: 3, pageGeneration: 0, outcome: { ok: true, result: 'FAKE_PRIVATE' } }]) {
    const h = harness(); h.prepare(); h.controller.submit(); h.workers[0].onmessage({ data: message });
    assert.equal(h.controller.snapshot().error.code, 'WORKER_INVALID'); assert.equal(h.controller.snapshot().busy, false); assert.equal(h.controller.snapshot().result, null);
  }
});
test('S09 crash, messageerror and post failure terminate exactly one job', () => {
  for (const kind of ['error', 'messageerror', 'post']) {
    const h = harness(); h.prepare();
    if (kind === 'post') {
      // A separate adapter lets the synchronous send path throw safely.
      const clock = new Clock(); let terminated = 0;
      const c = createController({ createWorker: () => ({ postMessage() { throw new Error('FAKE_PRIVATE'); }, terminate() { terminated++; } }), setTimer: clock.set, clearTimer: clock.clear, urls: pool(clock).urls, onChange() {} });
      c.edit('srtRaw', basic); c.submit(); assert.equal(terminated, 1); assert.equal(c.snapshot().error.code, 'WORKER_FAILED'); assert.equal(clock.live.size, 0);
    } else {
      h.controller.submit(); if (kind === 'error') h.workers[0].onerror({ preventDefault() {} }); else h.workers[0].onmessageerror({});
      assert.equal(h.workers[0].terminated, 1); assert.equal(h.controller.snapshot().busy, false); assert.equal(h.controller.snapshot().srtRaw, basic);
    }
  }
});
test('S10 exact 10000ms timeout; later old paths cannot change new request', () => {
  const h = harness(); h.prepare(); h.controller.submit(); const old = h.workers[0]; const timer = [...h.clock.live.keys()][0];
  h.clock.advance(9999); assert.equal(h.controller.snapshot().busy, true); h.clock.advance(1);
  assert.equal(h.controller.snapshot().error.code, 'WORKER_TIMEOUT'); assert.equal(h.controller.snapshot().srtRaw, basic); assert.equal(old.terminated, 1); assert.equal(h.controller.snapshot().result, null);
  h.controller.submit(); const state = h.controller.snapshot(); h.deliver(old); old.onerror({ preventDefault() {} }); h.clock.fireOld(timer); assert.deepEqual(h.controller.snapshot(), state);
});
test('S11 timeout callback after success cannot clear result', () => {
  const h = harness(); h.prepare(); h.controller.submit(); const timer = [...h.clock.live.keys()][0]; h.deliver(); const state = h.controller.snapshot(); h.clock.fireOld(timer); assert.deepEqual(h.controller.snapshot(), state);
});
test('S12 compositionstart invalidates before edits, composing input cannot submit', () => {
  const h = harness(); h.prepare(); h.controller.submit(); h.deliver(); h.controller.compositionStart();
  assert.equal(h.controller.snapshot().result, null); assert.equal(h.controller.snapshot().composing, true); assert.equal(h.controller.download().ok, false);
  assert.equal(h.controller.submit(), false); const rev = h.controller.snapshot().revision;
  h.controller.edit('srtRaw', basic, true); assert.equal(h.controller.snapshot().revision, rev + 1);
  h.controller.edit('srtRaw', basic + '組字\ud800', true); assert.equal(h.controller.snapshot().error, null); assert.equal(h.controller.snapshot().srtRaw, basic + '組字\ud800');
  h.controller.compositionEnd('srtRaw', basic + '組字完成'); assert.equal(h.controller.snapshot().composing, false); assert.equal(h.controller.submit(), true);
});
test('S13 composing input event alone invalidates active job immediately', () => {
  const h = harness(); h.prepare(); h.controller.submit(); const w = h.workers[0]; h.controller.edit('secondsRaw', '1.25', true);
  assert.equal(w.terminated, 1); assert.equal(h.controller.snapshot().busy, false); const state = h.controller.snapshot(); h.deliver(w); assert.deepEqual(h.controller.snapshot(), state);
});
test('S14 clear resets settings/generation/revision and all URL timers', () => {
  const h = harness(); h.prepare(); h.controller.submit(); h.deliver(); h.controller.download(); const generation = h.controller.snapshot().pageGeneration;
  h.controller.clear(); const state = h.controller.snapshot(); assert.equal(state.pageGeneration, generation + 1); assert.equal(state.srtRaw, ''); assert.equal(state.direction, 'earlier'); assert.equal(state.secondsRaw, '0'); assert.equal(state.status, 'idle'); assert.equal(h.downloads.urls.size, 0); assert.equal(h.downloads.revoked.length, 1); assert.equal(h.clock.live.size, 0);
});
test('S15 navigate/pagehide/persisted pageshow invalidate every old callback', () => {
  for (const action of ['navigate', 'pagehide', 'pageshow']) {
    const h = harness(); h.prepare(); h.controller.submit(); const old = h.workers[0];
    if (action === 'pageshow') h.controller.pageshow(true); else h.controller[action]();
    const state = h.controller.snapshot(); assert.equal(state.srtRaw, ''); assert.equal(state.pageGeneration, 1); h.deliver(old); old.onerror({ preventDefault() {} }); assert.deepEqual(h.controller.snapshot(), state);
  }
});
test('S16 existing successful download URLs survive draft edits', () => {
  const h = harness(); h.prepare(); h.controller.submit(); h.deliver(); h.controller.download(); h.controller.edit('secondsRaw', '0');
  assert.equal(h.downloads.urls.size, 1); assert.equal(h.downloads.revoked.length, 0); assert.equal(h.controller.snapshot().result, null);
  h.clock.advance(29999); assert.equal(h.downloads.urls.size, 1); h.clock.advance(1); assert.equal(h.downloads.urls.size, 0);
});
test('S17 eight live URLs, ninth is refused without replacing older links', () => {
  const p = pool(); for (let i = 0; i < 8; i++) assert.equal(p.urls.allocate(shiftedBasic).ok, true);
  assert.deepEqual(p.urls.allocate(shiftedBasic), { ok: false, code: 'DOWNLOAD_CAPACITY' }); assert.equal(p.created.length, 8); assert.equal(p.revoked.length, 0); assert.equal(p.urls.size, 8);
});
test('S18 per-URL monotonic deadlines and identity-safe stale timers', () => {
  const p = pool(); p.urls.allocate('a'); const firstTimer = [...p.clock.live.keys()][0]; p.clock.advance(1000); p.urls.allocate('b');
  p.clock.advance(29000); assert.deepEqual(p.revoked, ['blob:fake-1']); assert.equal(p.urls.size, 1);
  p.clock.fireOld(firstTimer); assert.deepEqual(p.revoked, ['blob:fake-1']); p.urls.allocate('c');
  p.clock.advance(1000); assert.deepEqual(p.revoked, ['blob:fake-1', 'blob:fake-2']); assert.equal(p.urls.size, 1);
  p.clock.advance(29000); assert.deepEqual(p.revoked, ['blob:fake-1', 'blob:fake-2', 'blob:fake-3']);
});
test('S19 early timer cannot expire URL before deadline', () => {
  const p = pool(); p.urls.allocate('x'); const timer = [...p.clock.live.keys()][0]; p.clock.fireOld(timer); assert.equal(p.revoked.length, 0);
  p.clock.advance(30000); assert.equal(p.revoked.length, 1); assert.equal(p.urls.size, 0);
});
test('S20 allocation failure consumes no slot and Blob bytes/MIME are exact', () => {
  const p = pool(); const raw = '😀<i>x</i>\n'; p.urls.allocate(raw);
  assert.deepEqual(p.blobs[0], { bytes: [...new TextEncoder().encode(raw)], type: 'text/plain;charset=utf-8' });
  for (const adapters of [{ createBlob() { throw new Error('fake'); } }, { createUrl() { throw new Error('fake'); } }, { setTimer() { throw new Error('fake'); } }]) {
    const failed = pool(undefined, adapters); assert.deepEqual(failed.urls.allocate('x'), { ok: false, code: 'DOWNLOAD_FAILED' }); assert.equal(failed.urls.size, 0);
    if (adapters.setTimer) assert.equal(failed.revoked.length, 1);
  }
});
test('S21 suspended timers are pruned on resume and before allocation', () => {
  const h = harness(); h.prepare(); h.controller.submit(); h.deliver(); h.controller.download(); h.clock.time = 30001;
  h.controller.resume(); assert.equal(h.downloads.urls.size, 0); assert.equal(h.controller.snapshot().result.srtText, shiftedBasic);
  h.controller.download(); h.clock.time += 30001; h.controller.pageshow(false); assert.equal(h.downloads.urls.size, 0); assert.equal(h.controller.snapshot().srtRaw, basic);
  const p = pool(); for (let i = 0; i < 8; i++) p.urls.allocate('x'); p.clock.time = 30000; assert.equal(p.urls.allocate('new').ok, true); assert.equal(p.revoked.length, 8); assert.equal(p.urls.size, 1);
});
test('S22 clear/pagehide revoke all links, old timers cannot revoke future links', () => {
  const p = pool(); p.urls.allocate('old'); const old = [...p.clock.live.keys()][0]; p.urls.clear(); p.urls.allocate('new'); p.clock.fireOld(old);
  assert.deepEqual(p.revoked, ['blob:fake-1']); assert.equal(p.urls.size, 1); p.urls.clear(); assert.deepEqual(p.revoked, ['blob:fake-1', 'blob:fake-2']); assert.equal(p.clock.live.size, 0);
});
test('S23 core failure uses exact error and no result; capacity keeps current result', () => {
  const h = harness(); h.controller.edit('srtRaw', 'INVALID_FAKE'); h.controller.submit(); h.deliver(); assert.deepEqual(h.controller.snapshot().error, { code: 'INDEX_FORMAT', field: 'srtRaw', line: 1, cueIndex: 1 }); assert.equal(h.controller.snapshot().result, null);
  h.prepare(); h.controller.submit(); h.deliver(); for (let i = 0; i < 8; i++) h.controller.download(); assert.equal(h.controller.download().ok, false); assert.equal(h.controller.snapshot().error.code, 'DOWNLOAD_CAPACITY'); assert.equal(h.controller.snapshot().result.srtText, shiftedBasic);
});
test('S24 protocol shape rejects extra keys and inconsistent result settings', () => {
  const h = harness(); h.prepare(); h.controller.submit(); const w = h.workers[0];
  assert.equal(isShiftRequest(w.request), true); assert.equal(isShiftRequest({ ...w.request, extra: true }), false);
  const terminal = { type: 'success', jobId: 1, revision: 3, pageGeneration: 0, outcome: analyzeAndShiftSrt(w.request.input) };
  assert.equal(isTerminal(terminal), true); assert.equal(isTerminal({ ...terminal, extra: 1 }), false);
  const bad = structuredClone(terminal); bad.outcome.result.cues[0].shiftedEndMs++; assert.equal(isTerminal(bad), false);
  const validOther = { ...terminal, outcome: analyzeAndShiftSrt({ ...w.request.input, secondsRaw: '2' }) };
  w.onmessage({ data: validOther }); assert.equal(h.controller.snapshot().error.code, 'WORKER_INVALID');
});
test('S25 both languages cover every core/app error without raw content', () => {
  const appCodes = ['WORKER_UNAVAILABLE', 'WORKER_FAILED', 'WORKER_INVALID', 'WORKER_TIMEOUT', 'DOWNLOAD_CAPACITY', 'DOWNLOAD_FAILED'];
  for (const language of ['zh-Hant', 'en']) for (const code of [...ERROR_CODES, ...appCodes]) {
    assert.equal(typeof messages[language].errors[code], 'string');
    const text = describeError(language, { code, field: 'srtRaw', line: 2, cueIndex: 3, ignoredRaw: 'PRIVATE_FAKE' }); assert.ok(!text.includes('PRIVATE_FAKE')); assert.ok(text.includes('2') && text.includes('3'));
  }
});
test('S26 R1 malformed success/text-array/error counterexamples fail closed in controller', () => {
  for (const mutate of [
    outcome => { outcome.result.srtText = 'X\n'; outcome.result.outputUtf8Bytes = 2; return outcome; },
    outcome => { delete outcome.result.cues[0].textLines[0]; return outcome; },
    () => ({ ok: false, error: { code: 'NO_CUES', field: 'secondsRaw', line: 1, cueIndex: 1 } })
  ]) {
    const h = harness(); h.prepare(); h.controller.submit(); const worker = h.workers[0];
    const { jobId, revision, pageGeneration, input } = worker.request;
    const outcome = mutate(analyzeAndShiftSrt(input));
    worker.onmessage({ data: { type: outcome.ok ? 'success' : 'failure', jobId, revision, pageGeneration, outcome } });
    const state = h.controller.snapshot();
    assert.equal(state.error.code, 'WORKER_INVALID'); assert.equal(state.status, 'error'); assert.equal(state.busy, false);
    assert.equal(state.result, null); assert.equal(state.resultRevision, null); assert.equal(state.srtRaw, basic);
    assert.deepEqual(h.controller.download(), { ok: false, code: 'NO_CURRENT_RESULT' });
    assert.equal(h.downloads.created.length, 0); assert.equal(h.downloads.urls.size, 0); assert.equal(worker.terminated, 1);
  }
});
