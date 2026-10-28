import test from 'node:test';
import assert from 'node:assert/strict';
import { installCpuTensorLifecycle } from './spike/tensor-lifecycle.mjs';

function tensor(size = 4, ort = { data: new Float32Array(size), releases: 0 }) {
  return { ort_tensor: ort, get location() { return ort.data ? 'cpu' : 'none'; }, get data() { return ort.data; }, dispose() { if (!ort.data) throw new Error('DOUBLE_RELEASE'); ort.releases += 1; ort.data = undefined; } };
}
function model(generate) {
  return { generate, getPastKeyValues(output, previous) { return { encoder: previous?.encoder ?? output.encoder, decoder: output.decoder }; }, sessions: { encoder: {}, decoder: {} } };
}
test('CPU cache replacement retains the live encoder and releases old decoder plus discarded outputs', async () => {
  const enc = tensor(), first = tensor(), discarded = tensor(), second = tensor(), logits = tensor();
  const engine = model(async function () {
    const previous = this.getPastKeyValues({ encoder: enc, decoder: first }, null);
    const next = this.getPastKeyValues({ encoder: discarded, decoder: second, logits }, previous);
    assert.equal(enc.location, 'cpu'); assert.equal(second.location, 'cpu');
    assert.equal(first.location, 'none'); assert.equal(discarded.location, 'none'); assert.equal(logits.location, 'none');
    assert.equal(next.encoder, enc); return 'plain result';
  });
  const state = installCpuTensorLifecycle(engine);
  assert.equal(await engine.generate({}), 'plain result');
  for (const value of [enc, first, discarded, second, logits]) assert.equal(value.ort_tensor.releases, 1);
  assert.equal(state().trackedCacheTensors, 0); assert.equal(state().cleanupFailures, 0);
});
test('error after a cache update releases the active cache without masking the inference failure', async () => {
  const enc = tensor(), dec = tensor();
  const engine = model(async function () { this.getPastKeyValues({ encoder: enc, decoder: dec }, null); throw new Error('INFERENCE_CANARY'); });
  const state = installCpuTensorLifecycle(engine);
  await assert.rejects(engine.generate({}), /INFERENCE_CANARY/u);
  assert.equal(enc.location, 'none'); assert.equal(dec.location, 'none'); assert.equal(state().active, false);
});
test('shared ORT tensor aliases are kept and disposed once; warm generations keep the sessions', async () => {
  const original = tensor(), alias = tensor(4, original.ort_tensor), first = tensor(), second = tensor();
  const engine = model(async function () {
    const previous = this.getPastKeyValues({ encoder: original, decoder: first }, null);
    const next = this.getPastKeyValues({ encoder: alias, decoder: second }, previous);
    assert.equal(next.encoder.location, 'cpu'); return tensor(1);
  });
  const sessions = engine.sessions, state = installCpuTensorLifecycle(engine);
  const sequence = await engine.generate({});
  assert.equal(sequence.location, 'cpu'); assert.equal(original.ort_tensor.releases, 1); assert.equal(engine.sessions, sessions); assert.equal(state().cleanupFailures, 0);
});
test('completed generations cannot keep past CPU tensors across repeated warm calls', async () => {
  const created = [];
  const engine = model(async function () { const encoder = tensor(), decoder = tensor(); created.push(encoder, decoder); this.getPastKeyValues({ encoder, decoder }, null); return 'text'; });
  const sessions = engine.sessions, state = installCpuTensorLifecycle(engine);
  for (let i = 0; i < 3; i += 1) { assert.equal(await engine.generate({}), 'text'); assert.equal(state().trackedCacheTensors, 0); }
  assert.equal(engine.sessions, sessions); assert.equal(state().generations, 3); assert.equal(created.filter(value => value.location === 'cpu').length, 0);
});
test('timestamp/dictionary and overlapping generation paths fail before executing', async () => {
  let executed = 0; let finish;
  const engine = model(async function () { executed += 1; await new Promise(resolve => { finish = resolve; }); return 'text'; });
  installCpuTensorLifecycle(engine);
  await assert.rejects(engine.generate({ return_dict_in_generate: true }), /CONTRACT_INVALID/u);
  const pending = engine.generate({}); await assert.rejects(engine.generate({}), /CONTRACT_INVALID/u); finish(); await pending;
  assert.equal(executed, 1);
});
