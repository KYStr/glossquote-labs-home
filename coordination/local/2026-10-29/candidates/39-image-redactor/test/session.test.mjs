import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduceEditorState as reduce, jobToken } from '../public/js/core/session.mjs';
const source = { format: 'png', width: 4, height: 3, orientation: 1, visualWidth: 4, visualHeight: 3, pixelCount: 12 };
const mask = { id: 'mask-1', x: 1, y: 1, width: 2, height: 1 };
export function ready() {
  let state = reduce(initialState(), { type: 'select-start' });
  const token = jobToken(state);
  state = reduce(state, { type: 'header-passed', token });
  state = reduce(state, { type: 'select-success', token, source });
  return reduce(state, { type: 'add-mask', mask });
}
const output = { width: 4, height: 3, mime: 'image/png', bytes: 100 };
test('S01 generation A cannot overwrite B after editing; revision increases', () => {
  let state = reduce(ready(), { type: 'generate-start' }); const a = jobToken(state);
  state = reduce(state, { type: 'update-mask', mask: { ...mask, x: 0 } });
  assert.equal(state.output, null); assert.ok(state.maskRevision > a.maskRevision);
  state = reduce(state, { type: 'generate-start' }); const b = jobToken(state);
  assert.strictEqual(reduce(state, { type: 'generate-success', token: a, output }), state);
  state = reduce(state, { type: 'generate-success', token: b, output });
  assert.equal(state.phase, 'output-ready'); assert.equal(state.output.previewLoaded, false);
  state = reduce(state, { type: 'preview-loaded', token: b }); assert.equal(state.output.previewLoaded, true);
});
test('S02 cancelled generation returns ready synchronously and late output is ignored', () => {
  let state = reduce(ready(), { type: 'generate-start' }); const token = jobToken(state);
  state = reduce(state, { type: 'cancel-generation' });
  assert.equal(state.phase, 'ready'); assert.equal(state.notice, 'cancelled'); assert.equal(state.output, null);
  assert.strictEqual(reduce(state, { type: 'generate-success', token, output }), state);
});
test('S03 late decode metadata cannot replace a newer source', () => {
  let state = reduce(initialState(), { type: 'select-start' }); const old = jobToken(state);
  state = reduce(state, { type: 'select-start' }); const current = jobToken(state);
  state = reduce(state, { type: 'header-passed', token: current });
  assert.strictEqual(reduce(state, { type: 'select-success', token: old, source }), state);
  state = reduce(state, { type: 'select-success', token: current, source }); assert.deepEqual(state.source, source);
});
test('S04 pagehide and BFCache persisted restore are empty states with stale jobs', () => {
  const state = ready(), hidden = reduce(state, { type: 'pagehide' });
  assert.equal(hidden.phase, 'disposed'); assert.equal(hidden.source, null); assert.deepEqual(hidden.masks, []); assert.equal(hidden.output, null);
  const restored = reduce(hidden, { type: 'pageshow', persisted: true });
  assert.equal(restored.phase, 'idle'); assert.ok(restored.jobId > hidden.jobId);
  assert.equal(reduce(restored, { type: 'select-success', token: jobToken(state), source }).source, null);
});
test('S05 generate needs a source and at least one mask; 50 is allowed', () => {
  assert.equal(reduce(initialState(), { type: 'generate-start' }).error.code, 'FILE_REQUIRED');
  let state = reduce(ready(), { type: 'clear-masks' });
  assert.equal(reduce(state, { type: 'generate-start' }).error.code, 'MASK_REQUIRED');
  for (let index = 0; index < 50; index++) state = reduce(state, { type: 'add-mask', mask: { ...mask, id: `mask-${index}` } });
  assert.equal(state.masks.length, 50); assert.equal(reduce(state, { type: 'generate-start' }).phase, 'generating');
  const rejected = reduce(state, { type: 'add-mask', mask: { ...mask, id: 'last' } });
  assert.equal(rejected.error.code, 'MASK_LIMIT'); assert.equal(rejected.masks.length, 50);
  assert.equal(reduce(state, { type: 'add-mask', mask: { ...mask, id: 'last', x: 999 } }).error.code, 'MASK_LIMIT');
});
test('invalid coordinate attempts invalidate output while retaining the last valid mask', () => {
  let state = reduce(ready(), { type: 'generate-start' });
  state = reduce(state, { type: 'generate-success', token: jobToken(state), output });
  state = reduce(state, { type: 'update-mask', mask: { ...mask, x: 3 } });
  assert.equal(state.output, null); assert.equal(state.error.code, 'MASK_OUT_OF_BOUNDS'); assert.deepEqual(state.masks, [mask]);
});
test('undo removes the most recently added surviving mask; select is metadata only', () => {
  let state = reduce(ready(), { type: 'add-mask', mask: { ...mask, id: 'mask-2' } });
  state = reduce(state, { type: 'update-mask', mask: { ...mask, x: 0 } });
  state = reduce(state, { type: 'undo-mask' }); assert.deepEqual(state.masks.map(item => item.id), ['mask-1']);
  assert.equal(state.masks[0].x, 0);
  state = reduce(state, { type: 'delete-mask', id: 'mask-1' }); assert.equal(state.phase, 'ready-no-mask');
});
test('reducer holds only JSON metadata and refuses unexpected action fields or native resource payload', () => {
  const state = ready(); assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  const result = reduce(state, { type: 'generate-start', file: new Blob(['CANARY_FAKE_SECRET']) });
  assert.equal(result.error.code, 'HEADER_UNSAFE'); assert.equal(JSON.stringify(result).includes('CANARY_FAKE_SECRET'), false);
  assert.equal(reduce(state, { type: 'generate-success', token: jobToken(state), output: { ...output, url: 'blob:fake' } }).output, null);
  let reads = 0;
  const action = {}; Object.defineProperty(action, 'type', { enumerable: true, get() { reads++; return 'clear-source'; } });
  assert.equal(reduce(state, action).error.code, 'HEADER_UNSAFE'); assert.equal(reads, 0);
});
