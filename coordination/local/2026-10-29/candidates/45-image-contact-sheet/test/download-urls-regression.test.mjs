import test from 'node:test';
import assert from 'node:assert/strict';
import { DownloadUrls, ContactSheetSession } from '../public/js/core/session.mjs';
import { FakeCanvas, bitmap } from './fixtures/browser-fakes.mjs';
import { fakeFile } from './fixtures/images.mjs';

// Explicit host-receiver model in Node, not a native Window/Chromium execution claim.
function withReceiverLimitedTimers(operation) {
  const set = Object.getOwnPropertyDescriptor(globalThis, 'setTimeout'), clear = Object.getOwnPropertyDescriptor(globalThis, 'clearTimeout');
  let next = 0; const scheduled = new Map(), receivers = [];
  try {
    Object.defineProperty(globalThis, 'setTimeout', { ...set, value: function (callback, delay) {
      if (this !== globalThis) throw new TypeError('Illegal invocation (synthetic host receiver guard)');
      receivers.push('set:globalThis'); assert.equal(delay, 60_000);
      const id = ++next; scheduled.set(id, callback); return id;
    } });
    Object.defineProperty(globalThis, 'clearTimeout', { ...clear, value: function (id) {
      if (this !== globalThis) throw new TypeError('Illegal invocation (synthetic host receiver guard)');
      receivers.push('clear:globalThis'); scheduled.delete(id);
    } });
    return operation({ scheduled, receivers });
  } finally { Object.defineProperty(globalThis, 'setTimeout', set); Object.defineProperty(globalThis, 'clearTimeout', clear); }
}
test('F1 default timer/untimer preserve the global host receiver for explicit release and 60s fallback', () => withReceiverLimitedTimers(({ scheduled, receivers }) => {
  let next = 0; const revoked = [], urls = new DownloadUrls({ create: () => `blob:fake-${++next}`, revoke: (url) => revoked.push(url) });
  const first = urls.add(new Blob(['synthetic'])); assert.equal(scheduled.size, 1);
  urls.release(first); urls.release(first); assert.deepEqual(revoked, ['blob:fake-1']);
  const second = urls.add(new Blob(['synthetic'])), callback = [...scheduled.values()][0];
  callback(); callback(); urls.clear();
  assert.deepEqual(revoked, [first, second]); assert.equal(urls.entries.size, 0); assert.equal(scheduled.size, 0);
  assert.deepEqual(receivers, ['set:globalThis', 'clear:globalThis', 'set:globalThis', 'clear:globalThis']);
}));
test('F1 scheduling failure revokes the already-created URL and leaves no untracked entry', () => {
  const revoked = [], urls = new DownloadUrls({ create: () => 'blob:failed-schedule', revoke: (url) => revoked.push(url), timer: () => { throw new Error('synthetic scheduler failure'); }, untimer: () => assert.fail('No handle was allocated') });
  assert.throws(() => urls.add(new Blob(['synthetic'])), /scheduler failure/u);
  assert.deepEqual(revoked, ['blob:failed-schedule']); assert.equal(urls.entries.size, 0);
  urls.clear(); assert.deepEqual(revoked, ['blob:failed-schedule']);
});
test('F1 release removes ownership and revokes even when cancelling the timer throws', () => {
  const revoked = []; let cancels = 0;
  const urls = new DownloadUrls({ create: () => 'blob:failed-cancel', revoke: (url) => revoked.push(url), timer: () => 7, untimer: () => { cancels++; throw new Error('synthetic cancel failure'); } });
  const url = urls.add(new Blob(['synthetic'])); assert.throws(() => urls.release(url), /cancel failure/u);
  assert.equal(urls.entries.size, 0); urls.release(url); urls.clear();
  assert.equal(cancels, 1); assert.deepEqual(revoked, [url]);
});
test('F1 clear attempts every URL despite one timer cancellation failing', () => {
  let next = 0; const revoked = [], cancelled = [];
  const urls = new DownloadUrls({ create: () => `blob:clear-${++next}`, revoke: (url) => revoked.push(url), timer: () => next, untimer: (id) => { cancelled.push(id); if (id === 1) throw new Error('synthetic first cancel failure'); } });
  urls.add(new Blob(['a'])); urls.add(new Blob(['b']));
  assert.throws(() => urls.clear(), /first cancel failure/u);
  assert.equal(urls.entries.size, 0); assert.deepEqual(revoked, ['blob:clear-1', 'blob:clear-2']); assert.deepEqual(cancelled, [1, 2]);
  urls.clear(); assert.equal(revoked.length, 2);
});
test('F1 reentrant cancellation cannot double-revoke or retain an entry', () => {
  let urls, url, cancels = 0; const revoked = [];
  urls = new DownloadUrls({ create: () => 'blob:reentrant', revoke: (u) => revoked.push(u), timer: () => 1, untimer: () => { cancels++; if (cancels === 1) urls.release(url); } });
  url = urls.add(new Blob(['synthetic'])); urls.release(url);
  assert.equal(cancels, 1); assert.deepEqual(revoked, [url]); assert.equal(urls.entries.size, 0);
});
test('F1 synchronous injected fallback cannot resurrect a released entry', () => {
  const revoked = [], cancelled = [];
  const urls = new DownloadUrls({ create: () => 'blob:sync', revoke: (url) => revoked.push(url), timer: (callback) => { callback(); return 9; }, untimer: (id) => cancelled.push(id) });
  urls.add(new Blob(['synthetic']));
  assert.equal(urls.entries.size, 0); assert.deepEqual(revoked, ['blob:sync']); assert.deepEqual(cancelled, [9]);
});
test('F1 PNG/TXT session downloads retain result under the receiver model and reset cleans both URLs (FAKE Canvas)', async () => {
  const revoked = [], triggered = []; let next = 0;
  const canvas = new FakeCanvas();
  const session = new ContactSheetSession({ canvas, decode: async () => bitmap('fake', 3, 2), yieldControl: async () => {} });
  await session.replaceFiles([fakeFile('synthetic.png')]); await session.generate(); assert.equal(session.phase, 'result');
  withReceiverLimitedTimers(({ scheduled }) => {
    session.urls = new DownloadUrls({ create: () => `blob:session-${++next}`, revoke: (url) => revoked.push(url) });
    assert.equal(session.download('png', (url, name) => triggered.push(name)), true);
    assert.equal(session.download('text', (url, name) => triggered.push(name)), true);
    assert.equal(session.phase, 'result'); assert.notEqual(session.result, null); assert.equal(scheduled.size, 2);
    session.reset(); assert.equal(scheduled.size, 0); assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
  });
  assert.deepEqual(triggered, ['photo-contact-sheet.png', 'photo-contact-sheet-index.txt']);
  assert.deepEqual(revoked, ['blob:session-1', 'blob:session-2']); assert.equal(session.result, null);
});
