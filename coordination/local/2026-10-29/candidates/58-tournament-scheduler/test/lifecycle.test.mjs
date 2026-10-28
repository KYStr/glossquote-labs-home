import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduleState, messages } from '../public/js/app.js';
import { generateRounds } from '../public/js/core/circle.mjs';
import { serializeSchedule } from '../public/js/core/output.mjs';

function fixture() {
  const teams = ['A', 'B'];
  const options = { cycles: 1, courts: 1, timing: null };
  const rounds = generateRounds(teams, { cycles: 1, courts: 1 });
  return { teams, options, rounds, output: serializeSchedule(rounds, options, teams) };
}

export function resourceHarness() {
  const created = [], revoked = [], pending = new Map();
  let next = 0;
  const state = createScheduleState({
    urlApi: { createObjectURL(blob) { const url = `blob:synthetic-${created.length}`; created.push({ url, blob }); return url; }, revokeObjectURL(url) { revoked.push(url); } },
    defer(fn) { pending.set(++next, fn); return next; }, cancelDefer(id) { pending.delete(id); }
  });
  return { state, created, revoked, pending };
}

test('A19: no URLs before explicit download, editing immediately revokes every URL and drops result', async () => {
  const { state, created, revoked, pending } = resourceHarness();
  assert.equal(state.download('txt', () => assert.fail()), false);
  const generation = state.invalidate();
  assert.equal(state.commit(generation, fixture()), true);
  assert.equal(created.length, 0);
  const saved = [];
  assert.equal(state.download('txt', (url, name) => saved.push({ url, name })), true);
  assert.equal(state.download('json', (url, name) => saved.push({ url, name })), true);
  assert.deepEqual(saved.map(item => item.name), ['round-robin.txt', 'round-robin.json']);
  assert.equal(created[0].blob.type, 'text/plain;charset=utf-8');
  assert.equal(JSON.parse(await created[1].blob.text()).rounds[0].matches[0].home, 'A');
  assert.equal(pending.size, 2);
  state.invalidate();
  assert.equal(state.getResult(), null);
  assert.deepEqual(revoked, ['blob:synthetic-0', 'blob:synthetic-1']);
  assert.equal(pending.size, 0);
  assert.equal(state.snapshot().activeUrls, 0);
  assert.equal(state.download('json', () => assert.fail()), false);
});

test('stale generation cannot revive after clear/new generation; failed output cannot commit', () => {
  const { state, created } = resourceHarness();
  const first = state.invalidate();
  const second = state.invalidate();
  assert.equal(state.commit(first, fixture()), false);
  assert.equal(state.commit(second, { output: { ok: false, code: 'OUTPUT_LIMIT' } }), false);
  assert.equal(state.snapshot().ready, false);
  assert.equal(created.length, 0);
  assert.equal(state.commit(second, fixture()), true);
  state.invalidate();
  assert.equal(state.commit(second, fixture()), false);
});

test('URL timeout releases once; download failure releases immediately and remains retryable', () => {
  const { state, pending, revoked } = resourceHarness();
  state.commit(state.invalidate(), fixture());
  state.download('txt', () => {});
  [...pending.values()][0]();
  assert.equal(state.snapshot().activeUrls, 0);
  assert.deepEqual(revoked, ['blob:synthetic-0']);
  assert.equal(state.download('json', () => { throw new Error('synthetic save failure'); }), false);
  assert.deepEqual(revoked, ['blob:synthetic-0', 'blob:synthetic-1']);
  assert.equal(state.snapshot().ready, true);
  assert.equal(state.download('txt', () => {}), true);
  state.invalidate();
  assert.equal(revoked.length, 3);
});

test('generation invalidation during URL creation cannot deliver stale output', () => {
  let state;
  const revoked = [];
  state = createScheduleState({ urlApi: {
    createObjectURL() { state.invalidate(); return 'blob:stale'; },
    revokeObjectURL(url) { revoked.push(url); }
  } });
  state.commit(state.invalidate(), fixture());
  assert.equal(state.download('txt', () => assert.fail('stale save called')), false);
  assert.deepEqual(revoked, ['blob:stale']);
  assert.equal(state.getResult(), null);
});

test('all error/status translation keys are present in both languages', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['zh-Hant']).sort());
  for (const values of Object.values(messages)) for (const value of Object.values(values)) assert.ok(typeof value === 'string' && value.length > 0);
});
