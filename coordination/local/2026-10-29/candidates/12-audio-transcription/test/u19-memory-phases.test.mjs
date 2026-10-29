import test from 'node:test';
import assert from 'node:assert/strict';
import { enableMemoryTrace, disableMemoryTrace, memoryTraceJob, setMemoryTraceJob, memoryPhase } from '../public/js/core/memory-phases.mjs';
import { configurePlainWhisperSessions } from '../public/js/core/plain-whisper.mjs';

test('trace is opt-in, accepts numeric fixed-schema records only and bounds retained records', () => {
  disableMemoryTrace(); assert.equal(memoryTraceJob(), -1); memoryPhase('not-a-label', { text: 'fake-content' });
  const records = []; enableMemoryTrace(record => records.push(record)); setMemoryTraceJob(7);
  assert.throws(() => enableMemoryTrace(() => {}), /CONFIG_INVALID/u);
  for (const bad of [{ text: 'fake-content' }, { assetBytes: -1 }, { assetBytes: Infinity }]) assert.throws(() => memoryPhase('asset-response-created', bad), /RECORD_INVALID/u);
  assert.throws(() => memoryPhase('unlisted'), /RECORD_INVALID/u);
  assert.throws(() => memoryPhase('asset-response-created', { [Symbol('not-a-field')]: 'fake-content' }), /RECORD_INVALID/u);
  for (let index = 0; index < 520; index += 1) memoryPhase('asset-response-created', { assetBytes: 2 });
  assert.equal(records.length, 513); assert.equal(records.at(-1).phase, 'trace-overflow');
  assert.equal(records[0].jobId, 7); assert(Object.isFrozen(records[0])); assert(!JSON.stringify(records).includes('fake-content'));
  disableMemoryTrace(); assert.equal(memoryTraceJob(), -1);
});

test('observer sees real selected output byte counts without replacing tensors, sessions or kernel errors', async () => {
  disableMemoryTrace(); const records = []; enableMemoryTrace(record => records.push(record)); setMemoryTraceJob(2);
  const hidden = { location: 'cpu', data: new Float32Array(3) }, logits = { location: 'cpu', data: new Float32Array(2) }, key = { location: 'cpu', data: new Float32Array(1) }, value = { location: 'cpu', data: new Float32Array(1) };
  const encoder = { outputNames: ['last_hidden_state', 'encoder_attentions.0'], run: async (feeds, fetches) => { assert.deepEqual(fetches, ['last_hidden_state']); return { last_hidden_state: hidden }; } };
  const decoder = { outputNames: ['logits', 'present.0.encoder.key', 'present.0.encoder.value', 'cross_attentions.0'], run: async () => ({ logits, 'present.0.encoder.key': key, 'present.0.encoder.value': value }) };
  const model = { config: { model_type: 'whisper' }, sessions: { model: encoder, decoder_model_merged: decoder } };
  configurePlainWhisperSessions(model);
  assert.equal((await encoder.run({})).last_hidden_state, hidden);
  assert.equal((await decoder.run({})).logits, logits); assert.equal((await decoder.run({}))['present.0.encoder.key'], key);
  assert.equal(records.find(record => record.phase === 'encoder-run-end').returnedTensorBytes, 12);
  assert.equal(records.filter(record => record.phase === 'decoder-run-start').length, 1);
  setMemoryTraceJob(3); await decoder.run({}); assert.equal(records.filter(record => record.phase === 'decoder-run-start').length, 2);
  assert.equal(model.sessions.model, encoder); assert.equal(model.sessions.decoder_model_merged, decoder);
  disableMemoryTrace(); enableMemoryTrace(() => { throw new Error('OBSERVER_ONLY'); }); setMemoryTraceJob(4);
  assert.equal((await encoder.run({})).last_hidden_state, hidden);
  disableMemoryTrace();
  const error = new Error('FAKE_KERNEL_ERROR');
  const failing = { config: { model_type: 'whisper' }, sessions: { model: { outputNames: ['last_hidden_state'], run: async () => { throw error; } }, decoder_model_merged: decoder } };
  enableMemoryTrace(() => {}); setMemoryTraceJob(5);
  configurePlainWhisperSessions(failing); await assert.rejects(failing.sessions.model.run({}), candidate => candidate === error);
  disableMemoryTrace();
});
