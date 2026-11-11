import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

export const ok = (result) => ({ ok: true, result });
export const error = (code, field = null, row = null) => ({ ok: false, error: { code, field, row } });

export function hasOwnDataFields(input, fields) {
  if (input === null || typeof input !== 'object') return false;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  return Reflect.ownKeys(descriptors).length === fields.length &&
    fields.every((field) => Object.hasOwn(descriptors, field) && 'value' in descriptors[field]);
}

export function shortStringError(value, max, emptyValue = value) {
  if (value.length > max) return 'INPUT_LIMIT';
  if (!value.isWellFormed()) return 'UNICODE';
  if (emptyValue === '') return 'EMPTY';
  return null;
}

function modelController(derive, defaultDraft) {
  let generation = 0;
  let state = 'empty';
  let draft = defaultDraft;
  let completed;
  return {
    edit(input) {
      draft = input;
      generation++;
      state = 'dirty';
      completed = undefined;
    },
    start() {
      state = 'busy';
      completed = undefined;
      const id = ++generation;
      const input = structuredClone(draft);
      return { id, calculate: () => derive(input) };
    },
    deliver(id, outcome) {
      if (state !== 'busy' || id !== generation) return;
      completed = outcome;
      state = outcome.ok ? 'success' : 'error';
    },
    cancel() {
      generation++;
      state = 'cancelled';
      completed = undefined;
    },
    reset() {
      generation++;
      draft = defaultDraft;
      state = 'empty';
      completed = undefined;
    },
    observe(includeDraft = false) {
      const observation = { state, reportAvailable: state === 'success' };
      if (state === 'error') observation.error = completed.error;
      if (includeDraft) observation.draft = draft;
      return observation;
    },
  };
}

function deriveControllerCase(id, input, derive, defaultDraft) {
  const c = modelController(derive, defaultDraft);
  if (id === 'state-dirty-error') {
    c.edit(input.initial);
    const initial = c.start();
    c.deliver(initial.id, initial.calculate());
    const afterRun = c.observe();
    c.edit(input.edit);
    const afterEdit = c.observe();
    const edited = c.start();
    c.deliver(edited.id, edited.calculate());
    return { afterRun, afterEdit, afterRerun: c.observe() };
  }
  if (id === 'state-cancel-late') {
    c.edit(input.draft);
    const job = c.start();
    const pending = job.calculate();
    assert.equal(pending.ok, true);
    assert.deepEqual(pending.result, input.lateResult, id + ': injected payload must match derived output');
    const whilePending = c.observe();
    c.cancel();
    const afterCancel = c.observe(true);
    c.deliver(job.id, pending);
    const afterLateResult = c.observe();
    c.reset();
    return { whilePending, afterCancel, afterLateResult, afterReset: c.observe(true) };
  }
  assert.equal(id, 'state-replace-late');
  c.edit(input.olderDraft);
  const old = c.start();
  const pending = old.calculate();
  assert.equal(pending.ok, true);
  assert.deepEqual(pending.result, input.olderLateResult, id + ': injected payload must match derived output');
  c.edit(input.newerDraft);
  const latest = c.start();
  c.deliver(latest.id, latest.calculate());
  const afterNewerResult = c.observe();
  c.deliver(old.id, pending);
  return { afterNewerResult, afterOlderLateResult: c.observe() };
}

export async function verifyFixtures(slug, derive, defaultDraft, probes, variant, deriveDraft = derive) {
  const local = (path) => new URL(path, import.meta.url);
  const source = JSON.parse(await readFile(local('./source-check.json'), 'utf8'));
  const target = source.targets.find((entry) => entry.slug === slug);
  assert(target, 'Unknown assigned target ' + slug);
  const file = target.files.find(({ path }) => path.endsWith('/fixtures.json'));
  const bytes = await readFile(local('./' + slug + '/source-fixtures.json'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.specId, target.specId);
  assert.equal(fixture.productChecks, 'NOT_RUN');
  assert.equal(new Set(fixture.cases.map(({ id }) => id)).size, fixture.cases.length);
  assert.equal(fixture.cases.length, target.fixtureCount);

  const cases = fixture.cases.map(({ id, kind, input, expected }) => {
    try {
      const derived = kind === 'controller'
        ? deriveControllerCase(id, input, deriveDraft, defaultDraft)
        : derive(input);
      const status = isDeepStrictEqual(derived, expected) ? 'PASS' : 'FAIL';
      return { id, kind, status, input, derived, ...(status === 'FAIL' ? { literal: expected } : {}) };
    } catch (exception) {
      return { id, kind, status: 'FAIL', input, exception: String(exception), literal: expected };
    }
  });
  const passed = cases.filter(({ status }) => status === 'PASS').length;
  const evidence = {
    candidate: target.candidate,
    ...(variant ? { variant } : {}),
    fixtureBlob: file.blob,
    method: 'Independent offline derivation and exact deep comparison of the complete outputs. Controller cases use a state model.',
    node: process.version,
    passed,
    total: cases.length,
    exitCode: passed === cases.length ? 0 : 1,
    cases,
    probes: probes(),
    productChecks: 'NOT_RUN',
  };
  const jsonSafe = (_key, value) => typeof value === 'number' && !Number.isFinite(value)
    ? String(value)
    : value;
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(evidence, jsonSafe, 2) + '\n');
    process.exitCode = evidence.exitCode;
    return;
  }
  for (const entry of cases) {
    console.log(entry.status + ' ' + entry.id +
      (entry.exception ? ': ' + entry.exception : ''));
  }
  for (const probe of evidence.probes) console.log(JSON.stringify(probe, jsonSafe));
  console.log('Fixture checks ' + passed + '/' + cases.length + ', Node ' + process.version);
  process.exitCode = evidence.exitCode;
}
