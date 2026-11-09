import test from 'node:test';
import assert from 'node:assert/strict';
import { ContactSheetSession, DownloadUrls } from '../public/js/core/session.mjs';
import { ImageInputError } from '../public/js/core/errors.mjs';
import { FakeCanvas, bitmap } from './fixtures/browser-fakes.mjs';
import { fakeFile } from './fixtures/images.mjs';

// Session-level fault injection. These Canvas/decoder/URL adapters are fakes, not native browser proof.
async function fixture(failureAt = 'untimer') {
  const canvas = new FakeCanvas(), cancelled = [], revoked = [], callbacks = new Map(), notifications = [];
  const injected = new Error('SYNTHETIC_INPUT_ERROR_MUST_NOT_BE_RETAINED');
  let nextUrl = 0, nextTimer = 0;
  const urls = new DownloadUrls({
    create: () => `blob:cleanup-${++nextUrl}`,
    timer: (callback, delay) => { assert.equal(delay, 60_000); callbacks.set(++nextTimer, callback); return nextTimer; },
    untimer: (handle) => { cancelled.push(handle); callbacks.delete(handle); if (handle === 1 && failureAt === 'untimer') throw injected; },
    revoke: (url) => { revoked.push(url); if (url === 'blob:cleanup-1' && failureAt === 'revoke') throw injected; },
  });
  const session = new ContactSheetSession({ canvas, urls, decode: async () => bitmap('fake', 3, 2), yieldControl: async () => {},
    onChange: (s) => notifications.push({ phase: s.phase, files: s.files.length, items: s.items.length, output: s.result !== null, width: canvas.width, height: canvas.height }) });
  await session.replaceFiles([fakeFile('first.png'), fakeFile('second.png')]);
  session.setOptions({ columns: 1, showNames: true }); await session.generate();
  assert.equal(session.phase, 'result');
  assert.equal(session.download('png', () => {}), true); assert.equal(session.download('text', () => {}), true);
  assert.equal(urls.entries.size, 2);
  return { session, canvas, urls, cancelled, revoked, callbacks, notifications, injected };
}
function assertOutputCleared(f) {
  assert.equal(f.session.result, null); assert.equal(f.canvas.width, 0); assert.equal(f.canvas.height, 0);
  assert.equal(f.session.error, null); assert.equal(f.session.progress, null); assert.equal(f.session.abort, null);
  assert.equal(f.urls.entries.size, 0); assert.deepEqual(f.cancelled, [1, 2]); assert.deepEqual(f.revoked, ['blob:cleanup-1', 'blob:cleanup-2']);
}
function assertDiagnostic(f) {
  assert.ok(f.session.cleanupError instanceof ImageInputError);
  assert.equal(f.session.cleanupError.code, 'PNG_EXPORT_FAILED');
  assert.deepEqual(f.session.cleanupError.details, { stage: 'url_cleanup' });
  assert.notEqual(f.session.cleanupError, f.injected); assert.equal(f.session.cleanupError.cause, undefined);
  assert.equal(f.session.cleanupError.message.includes('SYNTHETIC_INPUT'), false);
}
test('F1R1 invalidate finishes canvas/state/abort cleanup after URL cancellation throws, retaining selected sources for retry', async () => {
  const f = await fixture(), { session } = f;
  const files = session.files, items = session.items, options = session.options, generation = session.generation;
  const controller = new AbortController(); session.abort = controller;
  session.error = new ImageInputError('DECODE_FAILED'); session.progress = { phase: 'encoding', index: 1, total: 2 };
  assert.doesNotThrow(() => session.invalidate('stale'));
  assertOutputCleared(f); assertDiagnostic(f); assert.equal(controller.signal.aborted, true);
  assert.equal(session.generation, generation + 1); assert.equal(session.phase, 'stale');
  assert.equal(session.files, files); assert.equal(session.items, items); assert.equal(session.options, options);
});
test('F1R1 reset clears sources/options and notifies after URL cleanup failure; repeat and late callback are safe', async () => {
  const f = await fixture(), { session } = f, lateCallbacks = [...f.callbacks.values()];
  assert.doesNotThrow(() => session.reset()); assertOutputCleared(f); assertDiagnostic(f);
  assert.deepEqual(session.files, []); assert.deepEqual(session.items, []); assert.deepEqual(session.options, { columns: undefined, showNames: false });
  assert.equal(session.phase, 'idle');
  assert.deepEqual(f.notifications.at(-1), { phase: 'idle', files: 0, items: 0, output: false, width: 0, height: 0 });
  const diagnostic = session.cleanupError; session.reset(); for (const callback of lateCallbacks) callback();
  assert.equal(session.cleanupError, diagnostic); assert.equal(session.result, null); assert.equal(session.files.length, 0); assert.equal(f.revoked.length, 2);
});
test('F1R1 dispose completes reset and detaches observer after URL cleanup throws', async () => {
  const f = await fixture(), { session } = f, oldObserver = session.onChange;
  assert.doesNotThrow(() => session.dispose()); assertOutputCleared(f); assertDiagnostic(f);
  assert.equal(session.disposed, true); assert.deepEqual(session.files, []); assert.deepEqual(session.items, []);
  assert.deepEqual(session.options, { columns: undefined, showNames: false }); assert.equal(session.phase, 'idle');
  assert.notEqual(session.onChange, oldObserver); const notifications = f.notifications.length;
  session.notify(); session.dispose(); assert.equal(f.notifications.length, notifications);
  await session.replaceFiles([fakeFile('ignored.png')]); await session.generate(); assert.equal(session.files.length, 0);
});
test('F1R1 reset also disposes all session data when URL revocation itself throws, without retaining the raw error', async () => {
  const f = await fixture('revoke'); assert.doesNotThrow(() => f.session.reset());
  assertOutputCleared(f); assertDiagnostic(f); assert.deepEqual(f.session.files, []); assert.deepEqual(f.session.items, []);
  assert.equal(f.session.phase, 'idle');
});
test('F1R1 user option invalidation completes notification and allows regeneration after cleanup failure', async () => {
  const f = await fixture(), { session } = f, files = session.files, count = f.notifications.length;
  assert.doesNotThrow(() => session.setOptions({ columns: 2 }));
  assertOutputCleared(f); assertDiagnostic(f); assert.equal(session.files, files); assert.equal(session.phase, 'stale');
  assert.equal(session.options.columns, 2); assert.equal(f.notifications.length, count + 1);
  const diagnostic = session.cleanupError; await session.generate();
  assert.equal(session.phase, 'result'); assert.notEqual(session.result, null); assert.equal(session.cleanupError, diagnostic);
  session.reset(); assert.equal(session.files.length, 0);
});
