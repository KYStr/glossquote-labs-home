import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, changeDraft, calculate, clearDraft, beginCopy, finishCopy, dispose } from '../public/js/state.mjs';
import { messages } from '../public/js/i18n.mjs';
import { validateMarkup } from '../scripts/validation.mjs';

function ready() {
  const state = createState();
  changeDraft(state, 'source', 'A😀BC');
  changeDraft(state, 'limitRaw', '0002');
  calculate(state);
  return state;
}
test('source, raw limit and mode changes immediately remove all old output/status', () => {
  for (const [field, value] of [['source', 'next'], ['limitRaw', '+2'], ['mode', 'prefer-lf']]) {
    const state = ready();
    const oldRevision = state.revision;
    const ticket = beginCopy(state, 1);
    finishCopy(state, ticket, 'copied');
    assert.equal(changeDraft(state, field, value), true);
    assert.equal(state[field], value);
    assert.equal(state.revision, oldRevision + 1);
    assert.equal(state.result, null);
    assert.equal(state.copy.status, 'idle');
  }
});
test('raw cap visible immediately with no truncation; recovery requires explicit calculation', () => {
  const state = ready();
  const oversized = 'X'.repeat(100001);
  changeDraft(state, 'source', oversized);
  assert.equal(state.source, oversized);
  assert.equal(state.fieldErrors.source, 'SOURCE_TOO_LONG');
  assert.equal(state.result, null);
  assert.deepEqual(calculate(state), { ok: false, code: 'SOURCE_TOO_LONG' });
  changeDraft(state, 'source', 'ABCDE');
  assert.equal(state.result, null);
  assert.equal(calculate(state).ok, true);
  assert.deepEqual(state.result.chunks.map(chunk => chunk.text), ['AB', 'CD', 'E']);
});
test('overlong raw limit remains intact and field error is not hidden', () => {
  const state = ready();
  const raw = ' '.repeat(32) + '2';
  changeDraft(state, 'limitRaw', raw);
  assert.equal(state.limitRaw, raw);
  assert.equal(state.fieldErrors.limit, 'INPUT_TOO_LONG');
  assert.equal(calculate(state).code, 'INPUT_TOO_LONG');
  assert.equal(state.result, null);
});
test('chunk-limit rejection cannot keep residual results; subsequent retry is complete', () => {
  const state = ready();
  changeDraft(state, 'source', 'A'.repeat(1001));
  changeDraft(state, 'limitRaw', '1');
  assert.equal(calculate(state).code, 'CHUNK_LIMIT_EXCEEDED');
  assert.equal(state.result, null);
  changeDraft(state, 'limitRaw', '10000');
  assert.equal(calculate(state).chunks[0].text, 'A'.repeat(1001));
});
test('copy single-flight locks changes, calculation and clear until the ticket settles', async () => {
  const state = ready();
  const ticket = beginCopy(state, 2);
  const snapshot = state.result.chunks[1].text;
  let resolve;
  const mockPromise = new Promise(done => { resolve = done; });
  assert.equal(state.copy.busy, true);
  assert.equal(snapshot, 'BC');
  assert.equal(beginCopy(state, 1), null);
  assert.equal(changeDraft(state, 'source', 'late'), false);
  assert.equal(changeDraft(state, 'mode', 'prefer-lf'), false);
  assert.equal(calculate(state), null);
  assert.equal(clearDraft(state), false);
  resolve();
  await mockPromise;
  assert.equal(finishCopy(state, ticket, 'copied'), true);
  assert.equal(state.copy.busy, false);
  assert.equal(changeDraft(state, 'source', 'next'), true);
  assert.equal(finishCopy(state, ticket, 'copied'), false);
  assert.equal(state.copy.status, 'idle');
});
test('rejection/fallback is distinct from success; a stale request cannot unlock a newer copy', () => {
  const state = ready();
  const first = beginCopy(state, 1);
  assert.equal(finishCopy(state, first, 'fallback'), true);
  assert.equal(state.copy.status, 'fallback');
  const second = beginCopy(state, 2);
  assert.equal(finishCopy(state, first, 'copied'), false);
  assert.equal(state.copy.busy, true);
  assert.equal(finishCopy(state, second, 'copied'), true);
});
test('clear restores initial fields and pagehide releases references; late promise stays inert', () => {
  const state = ready();
  changeDraft(state, 'limitRaw', 'bad');
  assert.equal(clearDraft(state), true);
  assert.equal(state.source, '');
  assert.equal(state.limitRaw, '280');
  assert.equal(state.mode, 'strict');
  assert.deepEqual(state.fieldErrors, {});
  changeDraft(state, 'source', 'draft');
  calculate(state);
  const ticket = beginCopy(state, 1);
  dispose(state);
  assert.equal(state.source, '');
  assert.equal(state.result, null);
  assert.equal(finishCopy(state, ticket, 'copied'), false);
  assert.equal(beginCopy(state, 1), null);
});
test('R1 tickets belong to their state instance even when numeric fields collide', () => {
  const oldState = ready();
  const oldTicket = beginCopy(oldState, 1);
  dispose(oldState);
  const newState = ready();
  const newTicket = beginCopy(newState, 1);
  assert.deepEqual(oldTicket, { requestId: 4, revision: 2, index: 1 });
  assert.deepEqual(newTicket, oldTicket);
  assert.equal(finishCopy(newState, oldTicket, 'copied'), false);
  assert.equal(finishCopy(newState, oldTicket, 'fallback'), false);
  assert.equal(newState.copy.busy, true);
  assert.equal(newState.copy.status, 'busy');
  assert.equal(finishCopy(newState, { ...newTicket }, 'copied'), false);
  assert.equal(finishCopy(newState, newTicket, 'copied'), true);
});
test('both languages provide the same fixed errors and dynamic states', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['zh-Hant']).sort());
  assert.deepEqual(Object.keys(messages.en.errors).sort(), Object.keys(messages['zh-Hant'].errors).sort());
  for (const locale of Object.values(messages)) {
    assert.equal(Object.values(locale.errors).every(value => typeof value === 'string' && value.length > 0), true);
    assert.ok(locale.fallback('2').includes('2'));
    assert.ok(locale.busy('2').includes('2'));
  }
});
test('authored UI markup has actual labels, raw fields, local assets and language parity', async () => {
  const zh = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const en = await readFile(new URL('../public/en/index.html', import.meta.url), 'utf8');
  assert.deepEqual(validateMarkup(zh, 'zh-Hant'), validateMarkup(en, 'en'));
  assert.throws(() => validateMarkup(zh.replace('id="source"', 'id="source" maxlength="100000"'), 'zh-Hant'), /SILENT_TRUNCATION/);
  assert.throws(() => validateMarkup(en.replace('src="/js/app.mjs"', 'src="https://fixture.invalid/app.mjs"'), 'en'), /UNREVIEWED/);
  assert.throws(() => validateMarkup(en.replace('id="split"', 'id="split" onclick="alert(1)"'), 'en'), /INLINE_ACTIVE/);
});
