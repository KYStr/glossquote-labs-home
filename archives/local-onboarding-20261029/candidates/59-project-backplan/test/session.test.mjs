import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanSession, COPY } from '../public/js/app.js';
import { calculateBackplan } from '../public/js/core/backplan.mjs';
import { serializePlan } from '../public/js/core/output.mjs';
import { project } from './helpers.mjs';

function harness(options = {}) {
  const workers = [], states = [], results = [], failures = [], revoked = [], created = [], timers = new Map();
  let timerId = 0;
  const session = new PlanSession({
    createWorker: () => {
      const worker = { terminated: 0, sent: [], postMessage(message) { this.sent.push(message); }, terminate() { this.terminated += 1; } };
      workers.push(worker);
      return worker;
    },
    createURL: file => { const url = `blob:synthetic-${created.length}`; created.push({ url, file }); return url; },
    revokeURL: url => revoked.push(url), onState: state => states.push(state), onResult: (...args) => results.push(args), onFailure: e => failures.push(e),
    setTimer: fn => { timerId += 1; timers.set(timerId, fn); return timerId; }, clearTimer: id => timers.delete(id), ...options
  });
  const finish = (worker = workers.at(-1)) => {
    const input = worker.sent[0];
    const plan = calculateBackplan(input.input);
    const output = serializePlan(plan, { locale: input.locale });
    worker.onmessage({ data: { type: 'result', generation: input.generation, plan, output } });
  };
  return { session, workers, states, results, failures, revoked, created, timers, finish };
}

test('Node ownership only: app sends exact locale contract; success terminates owner and creates both URLs', () => {
  const h = harness();
  h.session.start(project(), 'zh-Hant');
  assert.deepEqual(Object.keys(h.workers[0].sent[0]).sort(), ['generation', 'input', 'locale', 'type']);
  assert.equal(h.workers[0].sent[0].locale, 'zh-Hant');
  assert.equal(h.workers[0].sent[0].generation, 1);
  h.finish();
  assert.equal(h.workers[0].terminated, 1);
  assert.equal(h.session.worker, null);
  assert.equal(h.timers.size, 0);
  assert.equal(h.created.length, 2);
  assert.equal(h.results.length, 1);
  assert.equal(h.results[0][2], h.created.reduce((sum, x) => sum + Buffer.byteLength(x.file.text), 0));
  assert.equal(h.results[0][0].anchor, '2026-10-23');
});
test('Node ownership only: cancellation immediately terminates and discards generation; late message/error ignored', () => {
  const h = harness();
  h.session.start(project(), 'en');
  const worker = h.workers[0], lateMessage = worker.onmessage, lateError = worker.onerror;
  const generation = h.session.generation;
  const plan = calculateBackplan(project());
  const output = serializePlan(plan);
  h.session.invalidate('cancelled');
  assert.equal(worker.terminated, 1);
  assert.equal(h.session.generation, generation + 1);
  assert.equal(h.session.worker, null);
  assert.equal(h.session.result, null);
  lateMessage({ data: { type: 'result', generation, plan, output } });
  lateError({ preventDefault() {} });
  assert.equal(h.created.length, 0);
  assert.equal(h.results.length, 0);
  assert.equal(h.failures.length, 0);
  h.session.start(project(), 'en');
  h.finish();
  assert.equal(h.results.length, 1);
});
test('Node ownership only: source edit, clear/pagehide invalidation and recalculation revoke every URL', () => {
  for (const reason of ['stale', 'cleared']) {
    const h = harness();
    h.session.start(project(), 'en');
    h.finish();
    const oldURLs = [...h.session.urls];
    h.session.invalidate(reason);
    assert.deepEqual(h.revoked, oldURLs);
    assert.deepEqual(h.session.urls, []);
    assert.equal(h.session.result, null);
  }
  const h = harness();
  h.session.start(project(), 'en'); h.finish();
  h.session.start(project(), 'en');
  assert.equal(h.revoked.length, 2);
  assert.equal(h.session.result, null);
  assert.equal(h.states.at(-1), 'running');
});
test('Node ownership only: worker faults and no-progress timeout recover with fixed errors and no output', () => {
  for (const kind of ['error', 'messageerror', 'watchdog']) {
    const h = harness();
    h.session.start(project(), 'en');
    if (kind === 'error') h.workers[0].onerror({ message: 'SYNTHETIC_RAW_DETAIL', preventDefault() {} });
    if (kind === 'messageerror') h.workers[0].onmessageerror({});
    if (kind === 'watchdog') [...h.timers.values()][0]();
    assert.equal(h.workers[0].terminated, 1);
    assert.equal(h.session.worker, null);
    assert.deepEqual(h.failures, [[{ code: 'WORKER_FAILURE', field: 'project' }]]);
    assert.equal(h.created.length, 0);
    assert.equal(JSON.stringify(h.failures).includes('SYNTHETIC_RAW_DETAIL'), false);
  }
});
test('Node ownership only: atomic Blob allocation failure revokes first URL and never exposes a result', () => {
  let calls = 0;
  const h = harness({ createURL: () => { calls += 1; if (calls === 2) throw new Error('synthetic allocation failure'); return 'blob:synthetic-first'; } });
  h.session.start(project(), 'en'); h.finish();
  assert.equal(h.results.length, 0);
  assert.equal(h.session.result, null);
  assert.deepEqual(h.revoked, ['blob:synthetic-first']);
  assert.deepEqual(h.failures, [[{ code: 'OUTPUT_FAILED', field: 'project' }]]);
});
test('Node ownership only: stale progress, malformed progress, and constructor failure', () => {
  const h = harness();
  h.session.start(project(), 'en');
  h.workers[0].onmessage({ data: { type: 'progress', generation: 0, phase: 'calendar', unit: 'civilDays', completed: 9 } });
  assert.equal(h.session.worker, h.workers[0]);
  h.workers[0].onmessage({ data: { type: 'progress', generation: 1, phase: 'calendar', unit: 'tasks', completed: 9 } });
  assert.equal(h.session.worker, null);
  const broken = harness({ createWorker: () => { throw new Error('SYNTHETIC_RAW_DETAIL'); } });
  broken.session.start(project(), 'en');
  assert.deepEqual(broken.failures, [[{ code: 'WORKER_FAILURE', field: 'project' }]]);
});
test('bilingual error codes, phases and result headers have complete matching keys', () => {
  assert.deepEqual(Object.keys(COPY.en.errors).sort(), Object.keys(COPY['zh-Hant'].errors).sort());
  assert.deepEqual(Object.keys(COPY.en.phase).sort(), Object.keys(COPY['zh-Hant'].phase).sort());
  assert.equal(COPY.en.headers.length, 9);
  assert.equal(COPY['zh-Hant'].headers.length, 9);
  for (const language of Object.values(COPY)) for (const message of Object.values(language.errors)) assert.ok(message.length > 0);
});
