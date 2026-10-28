import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunController, UI_COPY, localizedValidationCodes } from '../public/js/app.js';
import { createWorkerRunner } from '../public/js/conflict-worker.js';
import { session, rawAgenda, validated, clock } from './fixtures.mjs';

function harness() {
  const workers = [], states = [], revoked = [];
  const controller = createRunController({
    createWorker: () => {
      const worker = { terminated: 0, sent: null, onmessage: null, onerror: null, onmessageerror: null,
        terminate() { this.terminated++; }, postMessage(message) { this.sent = message; } };
      workers.push(worker); return worker;
    }, onState: state => states.push(state), revokeUrl: url => revoked.push(url)
  });
  return { controller, workers, states, revoked };
}
function complete(worker, pairResults = []) {
  const n = worker.sent.agenda.sessions.length;
  worker.onmessage({ data: { type: 'complete', generation: worker.sent.generation, checkedPairs: n * (n - 1) / 2, totalPairs: n * (n - 1) / 2, pairResults } });
}

test('worker scheduler uses 512 actual pairs per batch and reports exactly 19,900', () => {
  const agenda = validated(rawAgenda(Array.from({ length: 200 }, (_, i) => session(`S${i}`, { start: clock(i), end: clock(i + 1), speakerIndexes: [] }))));
  const queue = [], messages = [];
  const runner = createWorkerRunner({ postMessage: message => messages.push(message), schedule: callback => queue.push(callback) });
  runner.start({ agenda, generation: 7 });
  assert.equal(messages.length, 0);
  queue.shift()();
  assert.deepEqual(messages, [{ type: 'progress', generation: 7, checkedPairs: 512, totalPairs: 19900 }]);
  while (queue.length) queue.shift()();
  const progress = messages.filter(message => message.type === 'progress');
  assert.equal(progress.length, 39);
  assert.equal(progress.at(-1).checkedPairs, 19900);
  for (let i = 1; i < progress.length; i++) assert.ok(progress[i].checkedPairs - progress[i - 1].checkedPairs <= 512);
  assert.deepEqual(messages.at(-1), { type: 'complete', generation: 7, checkedPairs: 19900, totalPairs: 19900, pairResults: [] });
});

test('worker output preserves multi-reason pair order through real scheduler callbacks', () => {
  const agenda = validated(rawAgenda([session('A'), session('B'), session('C')]));
  const queue = [], messages = [];
  createWorkerRunner({ postMessage: message => messages.push(message), schedule: callback => queue.push(callback) }).start({ agenda, generation: 2 });
  while (queue.length) queue.shift()();
  assert.deepEqual(messages.at(-1).pairResults, [
    { kind: 'overlap', sessionIds: ['A', 'B'], reasons: ['room_overlap', 'speaker_overlap'], sharedSpeakerIndexes: [0] },
    { kind: 'overlap', sessionIds: ['A', 'C'], reasons: ['room_overlap', 'speaker_overlap'], sharedSpeakerIndexes: [0] },
    { kind: 'overlap', sessionIds: ['B', 'C'], reasons: ['room_overlap', 'speaker_overlap'], sharedSpeakerIndexes: [0] }
  ]);
});

test('one-session worker completes zero-pair analysis without fabricated progress', () => {
  const queue = [], messages = [];
  createWorkerRunner({ postMessage: message => messages.push(message), schedule: callback => queue.push(callback) }).start({ agenda: validated(rawAgenda()), generation: 1 });
  queue.shift()();
  assert.deepEqual(messages.map(({ type, checkedPairs, totalPairs }) => ({ type, checkedPairs, totalPairs })), [
    { type: 'progress', checkedPairs: 0, totalPairs: 0 }, { type: 'complete', checkedPairs: 0, totalPairs: 0 }
  ]);
});

test('A20 cancel at progress512 synchronously terminates, clears and rejects saved late callbacks', () => {
  const h = harness();
  const raw = rawAgenda(Array.from({ length: 40 }, (_, index) => session(`S${index}`)));
  const before = structuredClone(raw);
  h.controller.start(validated(raw));
  const worker = h.workers[0]; const late = worker.onmessage;
  late({ data: { type: 'progress', generation: worker.sent.generation, checkedPairs: 512, totalPairs: 780 } });
  assert.deepEqual(h.controller.snapshot().progress, { checkedPairs: 512, totalPairs: 780 });
  h.controller.cancel();
  assert.equal(worker.terminated, 1);
  assert.equal(worker.onmessage, null);
  const cancelled = h.controller.snapshot();
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.files, null); assert.equal(cancelled.result, null); assert.equal(cancelled.progress, null);
  const stateCount = h.states.length;
  late({ data: { type: 'complete', generation: worker.sent.generation, checkedPairs: 780, totalPairs: 780, pairResults: [] } });
  late({ data: { type: 'progress', generation: worker.sent.generation, checkedPairs: 780, totalPairs: 780 } });
  assert.equal(h.states.length, stateCount);
  let blobs = 0;
  assert.equal(h.controller.acquireDownload('json', () => { blobs++; return 'blob:fake'; }), null);
  assert.equal(blobs, 0); assert.deepEqual(raw, before);
});

test('A20 new generation ignores old message/error/messageerror and can complete a retry', () => {
  const h = harness();
  h.controller.start(validated(rawAgenda()));
  const old = h.workers[0];
  const lateMessage = old.onmessage, lateError = old.onerror, lateMessageError = old.onmessageerror;
  h.controller.invalidate(); h.controller.start(validated(rawAgenda()));
  const current = h.workers[1];
  lateMessage({ data: { type: 'complete', generation: old.sent.generation, checkedPairs: 0, totalPairs: 0, pairResults: [] } });
  lateError({ preventDefault() {} }); lateMessageError({ preventDefault() {} });
  assert.equal(h.controller.snapshot().status, 'checking');
  complete(current);
  assert.equal(h.controller.snapshot().status, 'ready');
  assert.equal(current.terminated, 1);
  assert.equal(JSON.parse(h.controller.snapshot().files.json.text).sessions[0].id, 'A');
});

for (const operation of ['invalidate', 'cancel', 'clear', 'pagehide']) {
  test(`ready output URLs and references are cleared by ${operation}`, () => {
    const h = harness(); h.controller.start(validated(rawAgenda())); complete(h.workers[0]);
    let blobs = 0;
    assert.equal(blobs, 0);
    assert.deepEqual(h.controller.acquireDownload('txt', file => { blobs++; assert.equal(file.name, 'agenda-conflicts.txt'); return 'blob:first'; }), { url: 'blob:first', name: 'agenda-conflicts.txt' });
    assert.deepEqual(h.controller.acquireDownload('json', () => 'blob:second'), { url: 'blob:second', name: 'agenda-conflicts.json' });
    assert.deepEqual(h.revoked, ['blob:first']);
    h.controller[operation]();
    assert.deepEqual(h.revoked, ['blob:first', 'blob:second']);
    assert.equal(h.controller.snapshot().files, null); assert.equal(h.controller.snapshot().result, null);
    assert.equal(h.controller.acquireDownload('json', () => 'blob:forbidden'), null);
    assert.equal(blobs, 1);
  });
}

test('generation change during URL construction revokes the new URL without returning it', () => {
  const h = harness(); h.controller.start(validated(rawAgenda())); complete(h.workers[0]);
  assert.equal(h.controller.acquireDownload('txt', () => { h.controller.clear(); return 'blob:late'; }), null);
  assert.deepEqual(h.revoked, ['blob:late']);
});

test('A18 output-limit failure after prior success has no previous or partial download', () => {
  const h = harness(); h.controller.start(validated(rawAgenda())); complete(h.workers[0]);
  h.controller.acquireDownload('json', () => 'blob:previous');
  const agenda = validated(rawAgenda(Array.from({ length: 200 }, (_, i) => session(`S${i}`, { speakerIndexes: [0, 1, 2, 3, 4] })), {
    speakers: Array.from({ length: 5 }, (_, i) => `${i}${'界'.repeat(79)}`)
  }));
  h.controller.start(agenda);
  assert.deepEqual(h.revoked, ['blob:previous']);
  const pairResults = [];
  for (let i = 0; i < 199; i++) for (let j = i + 1; j < 200; j++) pairResults.push({ kind: 'overlap', sessionIds: [`S${i}`, `S${j}`], reasons: ['room_overlap', 'speaker_overlap'], sharedSpeakerIndexes: [0, 1, 2, 3, 4] });
  complete(h.workers[1], pairResults);
  assert.equal(h.controller.snapshot().status, 'failed'); assert.equal(h.controller.snapshot().errorCode, 'OUTPUT_LIMIT');
  assert.equal(h.controller.snapshot().files, null); assert.equal(h.controller.snapshot().result, null);
});

test('worker construction, runtime, message and malformed-progress failures fail closed with fixed codes', () => {
  const broken = createRunController({ createWorker() { throw new Error('SYNTHETIC_ERROR_PRIVATE'); } });
  broken.start(validated(rawAgenda()));
  assert.equal(broken.snapshot().errorCode, 'WORKER_UNAVAILABLE');
  assert.equal(JSON.stringify(broken.snapshot()).includes('SYNTHETIC_ERROR_PRIVATE'), false);
  for (const kind of ['onerror', 'onmessageerror', 'bad-progress']) {
    const h = harness(); h.controller.start(validated(rawAgenda()));
    if (kind === 'bad-progress') h.workers[0].onmessage({ data: { type: 'progress', generation: h.workers[0].sent.generation, checkedPairs: 10, totalPairs: 0 } });
    else h.workers[0][kind]({ preventDefault() {} });
    assert.equal(h.controller.snapshot().errorCode, 'CHECK_FAILED'); assert.equal(h.controller.snapshot().files, null);
    assert.equal(h.workers[0].terminated, 1);
  }
});

test('both UI languages cover every validator code and all dynamic states', () => {
  assert.deepEqual(Object.keys(UI_COPY['zh-Hant']).sort(), Object.keys(UI_COPY.en).sort());
  for (const copy of Object.values(UI_COPY)) {
    assert.deepEqual(Object.keys(copy.errors).sort(), [...localizedValidationCodes].sort());
    for (const text of Object.values(copy.errors)) assert.ok(text.length > 0);
    for (const key of ['OUTPUT_LIMIT', 'WORKER_UNAVAILABLE', 'DOWNLOAD_FAILED', 'failed', 'cancelled', 'partialResult', 'missingNotice']) assert.ok(copy[key]);
  }
});
