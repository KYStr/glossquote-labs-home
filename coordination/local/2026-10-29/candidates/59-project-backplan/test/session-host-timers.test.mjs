import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

// Pure Node receiver-sensitive model, not native Window/Chromium evidence.
// Load the actual class body unchanged; only remove its ESM export keyword.
const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
const start = app.indexOf('export class PlanSession');
const end = app.indexOf('export const COPY');
assert.ok(start >= 0 && end > start);
const body = app.slice(start, end).replace('export class PlanSession', 'class PlanSession');

function model(overrides = {}) {
  const realm = createContext({ TextEncoder });
  runInContext(`
    'use strict';
    globalThis.timerCalls = [];
    globalThis.timerMap = new Map();
    globalThis.timerCounter = 0;
    globalThis.setTimeout = function(callback, milliseconds) {
      const correctReceiver = this === globalThis;
      timerCalls.push({ operation: 'set', correctReceiver, receiver: this?.constructor?.name ?? 'undefined', milliseconds });
      if (!correctReceiver) throw new TypeError('Illegal invocation: synthetic Window receiver guard');
      const id = ++timerCounter; timerMap.set(id, callback); return id;
    };
    globalThis.clearTimeout = function(id) {
      const correctReceiver = this === globalThis;
      timerCalls.push({ operation: 'clear', correctReceiver, receiver: this?.constructor?.name ?? 'undefined', id });
      if (!correctReceiver) throw new TypeError('Illegal invocation: synthetic Window receiver guard');
      timerMap.delete(id);
    };
  `, realm);
  const Session = runInContext(body + '\nPlanSession;', realm);
  const workers = [], states = [], failures = [], results = [], revoked = [];
  const config = {
    createWorker: () => {
      const worker = { sent: [], terminated: 0, postMessage(message) { this.sent.push(message); }, terminate() { this.terminated += 1; } };
      workers.push(worker); return worker;
    },
    createURL: file => `blob:synthetic-${file.filename}`, revokeURL: url => revoked.push(url),
    onState: value => states.push(value), onFailure: errors => failures.push(JSON.parse(JSON.stringify(errors))),
    onResult: (...values) => results.push(values), ...overrides
  };
  return { realm, Session, config, session: new Session(config), workers, states, failures, results, revoked };
}

test('F1 receiver model: omitted default timers schedule, rearm, and clear with the global receiver through real PlanSession', () => {
  const h = model();
  h.session.start({ synthetic: true }, 'en');
  assert.equal(h.workers[0].sent.length, 1, 'default watchdog must not abort before Worker.postMessage');
  assert.equal(h.states.at(-1), 'running');
  assert.equal(h.realm.timerMap.size, 1);
  const worker = h.workers[0];
  worker.onmessage({ data: { type: 'progress', generation: 1, phase: 'validate', unit: 'tasks', completed: 1 } });
  assert.equal(h.realm.timerMap.size, 1, 'progress clears old watchdog then schedules one replacement');
  const plan = { schema: 'gq.backplan', version: 1 };
  const json = JSON.stringify(plan), txt = 'Synthetic plan\n';
  worker.onmessage({ data: { type: 'result', generation: 1, plan, output: { ok: true, totalBytes: Buffer.byteLength(json) + Buffer.byteLength(txt), json: { filename: 'project-backplan.json', text: json }, txt: { filename: 'project-backplan.txt', text: txt } } } });
  assert.equal(h.states.at(-1), 'success');
  assert.equal(h.results.length, 1);
  assert.equal(worker.terminated, 1);
  assert.equal(h.realm.timerMap.size, 0);
  assert.equal(h.failures.length, 0);
  assert.ok(h.realm.timerCalls.every(call => call.correctReceiver));
  assert.deepEqual(Array.from(h.realm.timerCalls, call => call.operation), ['set', 'clear', 'set', 'clear']);
});

test('F1 receiver model: unbound control reproduces pre-postMessage failure and identifies the PlanSession receiver', () => {
  const h = model();
  const session = new h.Session({ ...h.config, setTimer: h.realm.setTimeout, clearTimer: h.realm.clearTimeout });
  session.start({ synthetic: true }, 'en');
  assert.equal(h.workers[0].sent.length, 0);
  assert.equal(h.workers[0].terminated, 1);
  assert.equal(h.states.at(-1), 'error');
  assert.deepEqual(h.failures, [[{ code: 'WORKER_FAILURE', field: 'project' }]]);
  assert.equal(h.realm.timerCalls[0].correctReceiver, false);
  assert.equal(h.realm.timerCalls[0].receiver, 'PlanSession');
});

test('F1 receiver model: cancel clears default watchdog; stale callback cannot fail a new owner; current timeout recovers', () => {
  const h = model();
  h.session.start({ synthetic: 'old' }, 'zh-Hant');
  assert.equal(h.workers[0].sent.length, 1);
  const staleTimer = [...h.realm.timerMap.values()][0];
  h.session.invalidate('cancelled');
  assert.equal(h.realm.timerMap.size, 0);
  assert.equal(h.workers[0].terminated, 1);
  h.session.start({ synthetic: 'new' }, 'zh-Hant');
  assert.equal(h.workers[1].sent.length, 1);
  staleTimer();
  assert.equal(h.failures.length, 0);
  assert.equal(h.session.worker, h.workers[1]);
  const currentTimer = [...h.realm.timerMap.values()][0];
  currentTimer();
  assert.equal(h.realm.timerMap.size, 0);
  assert.equal(h.workers[1].terminated, 1);
  assert.deepEqual(h.failures, [[{ code: 'WORKER_FAILURE', field: 'project' }]]);
  assert.ok(h.realm.timerCalls.every(call => call.correctReceiver));
});
