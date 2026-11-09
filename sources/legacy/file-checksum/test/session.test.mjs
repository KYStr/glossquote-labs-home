import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductError } from '../public/js/core/checksum.mjs';
import { createSession, reduceSession, validateWorkerReply, isBusy } from '../public/js/core/session.mjs';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const isProtocol = error => error instanceof ProductError && error.code === 'WORKER_PROTOCOL' && error.message === 'WORKER_PROTOCOL';
function started(now = 1000, expected = '') {
  let state = reduceSession(createSession(), { type: 'select', size: 3 });
  state = reduceSession(state, { type: 'expected', source: expected });
  return reduceSession(state, { type: 'start', now });
}
function reply(state, message, now = 1001, captured = state) {
  return reduceSession(state, { type: 'reply', jobId: captured.activeJobId, fileRevision: captured.fileRevision, message, now });
}
function done(state, now = 1002) {
  state = reply(state, { type: 'stage', jobId: state.activeJobId, stage: 'hashing' }, now - 1);
  return reply(state, { type: 'done', jobId: state.activeJobId, hex: ABC, bytes: 3 }, now);
}

test('session is immutable, has only primitive metadata, and never holds a File', () => {
  const initial = createSession();
  assert.equal(initial.phase, 'idle');
  assert.equal(initial.fileSize, null);
  assert.equal(initial.hash, null);
  assert.equal(initial.comparison, 'pending');
  assert.equal(Object.isFrozen(initial), true);
  assert.equal(Object.isFrozen(initial.expected), true);
  const action = Object.freeze({ type: 'select', size: 0 });
  const selected = reduceSession(initial, action);
  assert.equal(selected.phase, 'ready');
  assert.equal(selected.fileSize, 0);
  assert.equal(selected.fileRevision, 1);
  assert.equal(initial.fileRevision, 0);
  assert.deepEqual(action, { type: 'select', size: 0 });
  assert.equal(Object.isFrozen(selected), true);
  assert.deepEqual(Object.keys(selected).sort(), ['activeJobId', 'comparison', 'deadline', 'error', 'expected', 'expectedSource', 'fileRevision', 'fileSize', 'hash', 'jobId', 'outputRevision', 'phase'].sort());
});

test('start needs a file and ten busy starts preserve the single current job', () => {
  const missing = reduceSession(createSession(), { type: 'start', now: 1000 });
  assert.equal(missing.phase, 'error');
  assert.equal(missing.error, 'FILE_REQUIRED');
  assert.equal(missing.activeJobId, null);
  const current = started();
  assert.equal(current.deadline, 61000);
  assert.equal(current.phase, 'reading');
  assert.equal(current.activeJobId, 2);
  assert.equal(isBusy(current), true);
  for (let index = 0; index < 10; index += 1) assert.strictEqual(reduceSession(current, { type: 'start', now: 1010 + index }), current);
});

test('completion compares the latest expected draft; updates preserve hash/output revision', () => {
  let state = started();
  state = reduceSession(state, { type: 'expected', source: ` \t${ABC.toUpperCase()}\r\n` });
  state = done(state);
  assert.equal(state.phase, 'done');
  assert.equal(state.hash, ABC);
  assert.equal(state.comparison, 'match');
  assert.equal(state.activeJobId, null);
  assert.equal(state.deadline, null);
  const revision = state.outputRevision;
  state = reduceSession(state, { type: 'expected', source: 'not hex' });
  assert.equal(state.comparison, 'invalid');
  assert.equal(state.hash, ABC);
  assert.equal(state.outputRevision, revision);
  state = reduceSession(state, { type: 'expected', source: '0'.repeat(64) });
  assert.equal(state.comparison, 'mismatch');
  state = reduceSession(state, { type: 'expected', source: '' });
  assert.equal(state.comparison, 'not-provided');
  assert.equal(state.hash, ABC);
  assert.equal(state.outputRevision, revision);
  assert.equal(isBusy(state), false);
});

test('overlong expected draft is retained in session and never made legal by truncation', () => {
  const source = ' '.repeat(193) + ABC;
  const state = reduceSession(done(started()), { type: 'expected', source });
  assert.equal(state.expectedSource, source);
  assert.equal(state.expectedSource.length, 257);
  assert.equal(state.expected.code, 'EXPECTED_LENGTH');
  assert.equal(state.comparison, 'invalid');
  assert.equal(state.hash, ABC);
});

test('invalid new selection removes a previous successful hash before rejecting size', () => {
  const successful = done(started(1000, ABC));
  const state = reduceSession(successful, { type: 'select', size: 134217729 });
  assert.equal(state.phase, 'error');
  assert.equal(state.error, 'SIZE_LIMIT');
  assert.equal(state.fileSize, null);
  assert.equal(state.hash, null);
  assert.equal(state.comparison, 'pending');
  assert.equal(state.expectedSource, ABC);
  assert.ok(state.fileRevision > successful.fileRevision);
  assert.ok(state.outputRevision > successful.outputRevision);
  assert.equal(successful.hash, ABC);
});

test('cancel in both phases retains file/expected, invalidates messages, and allows fresh retry', () => {
  for (const phase of ['reading', 'hashing']) {
    let original = started(1000, ABC);
    if (phase === 'hashing') original = reply(original, { type: 'stage', jobId: original.activeJobId, stage: 'hashing' });
    const cancelled = reduceSession(original, { type: 'cancel' });
    assert.equal(cancelled.phase, 'cancelled');
    assert.equal(cancelled.fileSize, 3);
    assert.equal(cancelled.expectedSource, ABC);
    assert.equal(cancelled.hash, null);
    assert.equal(cancelled.activeJobId, null);
    assert.equal(cancelled.deadline, null);
    assert.strictEqual(reply(cancelled, { type: 'done', jobId: original.activeJobId, hex: ABC, bytes: 3 }, 1002, original), cancelled);
    assert.strictEqual(reply(cancelled, { type: 'error', jobId: original.activeJobId, code: 'READ_FAILED' }, 1002, original), cancelled);
    const retry = reduceSession(cancelled, { type: 'start', now: 2000 });
    assert.ok(retry.activeJobId > original.activeJobId);
    assert.equal(done(retry, 2002).hash, ABC);
  }
});

test('selecting B ignores every delayed A callback before inspecting message or time', () => {
  const original = started();
  let current = reduceSession(original, { type: 'select', size: 3 });
  current = reduceSession(current, { type: 'start', now: 2000 });
  const payloads = [{ type: 'stage', jobId: original.activeJobId, stage: 'hashing' }, { type: 'done', jobId: original.activeJobId, hex: ABC, bytes: 3 }, { type: 'error', jobId: original.activeJobId, code: 'READ_FAILED' }, null, { unknown: true }];
  for (const message of payloads) assert.strictEqual(reply(current, message, NaN, original), current);
  assert.strictEqual(reduceSession(current, { type: 'fail', jobId: original.activeJobId, fileRevision: original.fileRevision, code: 'WORKER_FAILED', now: NaN }), current);
  assert.equal(done(current, 2002).hash, ABC);
});

test('clear and pagehide remove all content and old callbacks cannot restore it', () => {
  for (const type of ['clear', 'pagehide']) {
    for (const original of [started(1000, ABC), done(started(1000, ABC))]) {
      const cleared = reduceSession(original, { type });
      assert.equal(cleared.phase, 'idle');
      assert.equal(cleared.fileSize, null);
      assert.equal(cleared.hash, null);
      assert.equal(cleared.expectedSource, '');
      assert.equal(cleared.expected.state, 'empty');
      assert.equal(cleared.activeJobId, null);
      assert.equal(cleared.deadline, null);
      assert.equal(cleared.comparison, 'pending');
      assert.ok(cleared.fileRevision > original.fileRevision);
      assert.ok(cleared.outputRevision > original.outputRevision);
      assert.strictEqual(reply(cleared, { type: 'done', jobId: original.activeJobId, hex: ABC, bytes: 3 }, 1002, original), cleared);
      assert.strictEqual(reduceSession(cleared, { type: 'check-deadline', now: 90000 }), cleared);
    }
  }
});

test('60000ms boundary applies to callbacks and deadline checks, regardless of timer delay', () => {
  const current = started(0);
  assert.strictEqual(reduceSession(current, { type: 'check-deadline', now: 59999 }), current);
  for (const now of [60000, 60001, 120000]) {
    const timedOut = reduceSession(current, { type: 'check-deadline', now });
    assert.equal(timedOut.phase, 'error');
    assert.equal(timedOut.error, 'TIMEOUT');
    assert.equal(timedOut.activeJobId, null);
    assert.equal(timedOut.fileSize, 3);
    const hashing = reply(current, { type: 'stage', jobId: current.activeJobId, stage: 'hashing' }, 1);
    const lateDone = reply(hashing, { type: 'done', jobId: hashing.activeJobId, hex: ABC, bytes: 3 }, now);
    assert.equal(lateDone.error, 'TIMEOUT');
    assert.equal(lateDone.hash, null);
    assert.strictEqual(reply(timedOut, { type: 'done', jobId: current.activeJobId, hex: ABC, bytes: 3 }, now + 1, current), timedOut);
    assert.equal(reduceSession(current, { type: 'start', now }).error, 'TIMEOUT');
  }
  assert.equal(done(current, 59999).hash, ABC);
});

test('current malformed/wrong-job/length replies fail closed, while stale revision ignores', () => {
  const current = started();
  const malformed = [null, [], {}, { type: 'unknown', jobId: current.activeJobId }, { type: 'stage', jobId: current.activeJobId, stage: 'done' }, { type: 'stage', jobId: current.activeJobId, stage: 'hashing', extra: true }, { type: 'stage', jobId: current.activeJobId + 1, stage: 'hashing' }, { type: 'error', jobId: current.activeJobId, code: 'FILE_REQUIRED' }, { type: 'error', jobId: current.activeJobId, code: 'FAKE_RAW_ERROR' }, { type: 'done', jobId: current.activeJobId, hex: ABC.toUpperCase(), bytes: 3 }, { type: 'done', jobId: current.activeJobId, hex: ABC, bytes: 4 }];
  for (const message of malformed) {
    const failed = reply(current, message);
    assert.equal(failed.error, 'WORKER_PROTOCOL');
    assert.equal(failed.hash, null);
    assert.equal(failed.activeJobId, null);
  }
  assert.strictEqual(reply(current, null, 1001, { activeJobId: current.activeJobId, fileRevision: current.fileRevision - 1 }), current);
  assert.equal(reply(current, { type: 'done', jobId: current.activeJobId, hex: ABC, bytes: 3 }).error, 'WORKER_PROTOCOL');
  const hashing = reply(current, { type: 'stage', jobId: current.activeJobId, stage: 'hashing' });
  assert.equal(reply(hashing, { type: 'stage', jobId: hashing.activeJobId, stage: 'reading' }).error, 'WORKER_PROTOCOL');
});

test('reply exact schemas reject hidden/symbol/accessor keys without invoking getters', () => {
  const allowed = Object.freeze({ type: 'done', jobId: 1, hex: ABC, bytes: 3 });
  const validated = validateWorkerReply(allowed, { jobId: 1, fileSize: 3 });
  assert.deepEqual(validated, allowed);
  assert.notStrictEqual(validated, allowed);
  assert.equal(Object.isFrozen(validated), true);
  const hidden = Object.defineProperty({ ...allowed }, 'hidden', { value: true });
  const symbolic = { ...allowed, [Symbol('fake')]: true };
  let calls = 0;
  const accessor = { get type() { calls += 1; throw new Error('FAKE_GETTER'); }, jobId: 1, hex: ABC, bytes: 3 };
  for (const message of [hidden, symbolic, accessor]) assert.throws(() => validateWorkerReply(message, { jobId: 1, fileSize: 3 }), isProtocol);
  assert.equal(calls, 0);
});

test('all fixed worker errors and controller failures converge to cleared, retryable state', () => {
  for (const code of ['UNSUPPORTED_ENVIRONMENT', 'SIZE_INVALID', 'SIZE_LIMIT', 'WORKER_PROTOCOL', 'READ_FAILED', 'READ_SIZE_MISMATCH', 'HASH_FAILED', 'HASH_LENGTH']) {
    const current = started();
    const failed = reply(current, { type: 'error', jobId: current.activeJobId, code });
    assert.equal(failed.error, code);
    assert.equal(failed.hash, null);
    assert.equal(failed.activeJobId, null);
    assert.equal(failed.fileSize, 3);
    assert.equal(reduceSession(failed, { type: 'start', now: 2000 }).phase, 'reading');
  }
  for (const code of ['WORKER_START_FAILED', 'WORKER_FAILED', 'WORKER_MESSAGE_FAILED', 'UNSUPPORTED_ENVIRONMENT', 'FAKE_UNKNOWN']) {
    const current = started();
    const failed = reduceSession(current, { type: 'fail', jobId: current.activeJobId, fileRevision: current.fileRevision, code, now: 1001 });
    assert.equal(failed.error, code === 'FAKE_UNKNOWN' ? 'WORKER_PROTOCOL' : code);
    assert.equal(failed.activeJobId, null);
    assert.equal(failed.hash, null);
  }
});

test('three complete/recompute cycles never reuse active ID or preserve stale hash', () => {
  let state = started();
  let last = 0;
  for (let index = 0; index < 3; index += 1) {
    const token = state.activeJobId;
    assert.ok(token > last);
    state = done(state, 1002 + index * 1000);
    const output = state.outputRevision;
    assert.equal(state.hash, ABC);
    state = reduceSession(state, { type: 'start', now: 2000 + index * 1000 });
    assert.equal(state.hash, null);
    assert.equal(state.comparison, 'pending');
    assert.ok(state.outputRevision > output);
    last = token;
  }
});

test('unknown actions, extra keys, invalid clocks and counter overflow reject without mutation', () => {
  const state = reduceSession(createSession(), { type: 'select', size: 3 });
  for (const action of [null, [], {}, { type: 'unknown' }, { type: 'cancel', extra: true }, { type: 'select' }, { type: 'start', now: NaN }, { type: 'start', now: Infinity }, { type: 'start', now: -1 }, { type: 'start', now: '1000' }]) assert.throws(() => reduceSession(state, action), isProtocol);
  for (const [key, action] of [['jobId', { type: 'start', now: 1 }], ['fileRevision', { type: 'select', size: 0 }], ['outputRevision', { type: 'start', now: 1 }]]) {
    const full = Object.freeze({ ...state, [key]: Number.MAX_SAFE_INTEGER });
    assert.throws(() => reduceSession(full, action), isProtocol);
    assert.equal(full[key], Number.MAX_SAFE_INTEGER);
  }
  assert.equal(state.phase, 'ready');
  assert.equal(state.jobId, 1);
  assert.equal(state.hash, null);
});
