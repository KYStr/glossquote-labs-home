import test from 'node:test';
import assert from 'node:assert/strict';
import { installEncoderCacheOutputReuse } from './spike/cache-output-reuse.mjs';
const names = ['logits', 'present.0.decoder.key', 'present.0.decoder.value', 'present.0.encoder.key', 'present.0.encoder.value'];
const cpu = () => ({ location: 'cpu', data: new Float32Array(8) });
test('cached steps request unchanged logits/decoder outputs and borrow live encoder inputs without copying', async () => {
  const encoderKey = cpu(), encoderValue = cpu(), logits = cpu(), decoderKey = cpu(), decoderValue = cpu(); let calls = 0;
  const session = { outputNames: names, async run(feeds, selected) { calls += 1; assert.equal(this, session); assert.deepEqual(selected, names.slice(0, 3)); return { logits, 'present.0.decoder.key': decoderKey, 'present.0.decoder.value': decoderValue }; } };
  const stats = installEncoderCacheOutputReuse(session), feeds = { use_cache_branch: { location: 'cpu', data: [1] }, 'past_key_values.0.encoder.key': encoderKey, 'past_key_values.0.encoder.value': encoderValue };
  for (let i = 0; i < 3; i += 1) { const result = await session.run(feeds); assert.equal(result.logits, logits); assert.equal(result['present.0.decoder.key'], decoderKey); assert.equal(result['present.0.encoder.key'], encoderKey); assert.equal(result['present.0.encoder.value'], encoderValue); }
  assert.equal(calls, 3); assert.equal(stats().reusedRuns, 3); assert.equal(stats().avoidedBytes, 3 * 2 * 32); assert.equal(encoderKey.data.length, 8);
});
test('first step and explicit output fetches preserve original execution and result identity', async () => {
  const result = { fake: cpu() }, requests = [];
  const session = { outputNames: names, async run(...args) { requests.push(args); return result; } };
  installEncoderCacheOutputReuse(session);
  const first = { use_cache_branch: { location: 'cpu', data: [0] } }, explicit = ['logits'];
  assert.equal(await session.run(first), result); assert.equal(await session.run({ use_cache_branch: { location: 'cpu', data: [1] } }, explicit), result);
  assert.equal(requests[0][0], first); assert.equal(requests[0][1], undefined); assert.equal(requests[1][1], explicit);
});
test('missing cache fails before execution, and inference rejection propagates without replacing the session', async () => {
  let calls = 0; const session = { outputNames: names, async run() { calls += 1; throw new Error('FAKE_KERNEL_FAILURE'); } };
  installEncoderCacheOutputReuse(session);
  await assert.rejects(session.run({ use_cache_branch: { location: 'cpu', data: [1] } }), /INPUT_MISSING/u); assert.equal(calls, 0);
  await assert.rejects(session.run({ use_cache_branch: { location: 'cpu', data: [1] }, 'past_key_values.0.encoder.key': cpu(), 'past_key_values.0.encoder.value': cpu() }), /FAKE_KERNEL_FAILURE/u); assert.equal(calls, 1);
});
test('unexpected runtime output selection is rejected rather than silently claiming reuse', async () => {
  const session = { outputNames: names, async run() { return { 'present.0.encoder.key': cpu() }; } }; installEncoderCacheOutputReuse(session);
  await assert.rejects(session.run({ use_cache_branch: { location: 'cpu', data: [1] }, 'past_key_values.0.encoder.key': cpu(), 'past_key_values.0.encoder.value': cpu() }), /SELECTION_IGNORED/u);
});
