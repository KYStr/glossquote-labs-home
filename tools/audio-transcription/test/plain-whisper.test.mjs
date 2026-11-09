import test from 'node:test';
import assert from 'node:assert/strict';
import { configurePlainWhisperSessions } from '../public/js/core/plain-whisper.mjs';
function createModel() {
  const requiredEncoder = { fake: 'hidden-state' }, logits = { fake: 'logits' }, key = { fake: 'KV-key' }, value = { fake: 'KV-value' };
  let unusedMaterializations = 0, calls = 0;
  function session(names, data) {
    return { outputNames: names, async run(feeds, selected, options) {
      assert.equal(this.outputNames, names); assert.equal(feeds.fakeInput, true); assert.equal(options, undefined); calls += 1;
      const output = {};
      for (const name of selected ?? names) { if (name.includes('attentions')) unusedMaterializations += 1; output[name] = data[name] ?? { fake: 'large-unused-attention' }; }
      return output;
    } };
  }
  return { model: { config: { model_type: 'whisper' }, sessions: {
    model: session(['last_hidden_state', 'encoder_attentions.0', 'encoder_attentions.1'], { last_hidden_state: requiredEncoder }),
    decoder_model_merged: session(['logits', 'present.0.decoder.key', 'present.0.decoder.value', 'present.0.encoder.key', 'present.0.encoder.value', 'decoder_attentions.0', 'cross_attentions.0'], { logits, 'present.0.decoder.key': key, 'present.0.decoder.value': value, 'present.0.encoder.key': key, 'present.0.encoder.value': value }),
  } }, requiredEncoder, logits, key, value, counts: () => ({ unusedMaterializations, calls }) };
}
test('plain ASR avoids unused attention allocation while preserving hidden state, logits and all KV values across warm calls', async () => {
  const fixture = createModel(), originalSessions = fixture.model.sessions;
  configurePlainWhisperSessions(fixture.model);
  for (let i = 0; i < 3; i += 1) {
    const encoded = await fixture.model.sessions.model.run({ fakeInput: true }); assert.equal(encoded.last_hidden_state, fixture.requiredEncoder);
    const decoded = await fixture.model.sessions.decoder_model_merged.run({ fakeInput: true });
    assert.equal(decoded.logits, fixture.logits); assert.equal(decoded['present.0.decoder.key'], fixture.key); assert.equal(decoded['present.0.encoder.value'], fixture.value);
    assert.deepEqual(Object.keys(encoded), ['last_hidden_state']); assert.equal(Object.keys(decoded).length, 5);
  }
  assert.equal(fixture.model.sessions, originalSessions); assert.deepEqual(fixture.counts(), { unusedMaterializations: 0, calls: 6 });
});
test('all output schemas are checked before changing either session', () => {
  const fixture = createModel(), original = fixture.model.sessions.model.run;
  fixture.model.sessions.decoder_model_merged.outputNames.push('unreviewed-output');
  assert.throws(() => configurePlainWhisperSessions(fixture.model), /CONTRACT_INVALID/u); assert.equal(fixture.model.sessions.model.run, original);
});
test('unexpected fetch overloads or returned fields fail closed', async () => {
  const fixture = createModel(); configurePlainWhisperSessions(fixture.model);
  await assert.rejects(fixture.model.sessions.model.run({ fakeInput: true }, ['encoder_attentions.0']), /REQUEST_INVALID/u);
  const broken = createModel(); broken.model.sessions.model.run = async () => ({ last_hidden_state: {}, leaked_attention: {} }); configurePlainWhisperSessions(broken.model);
  await assert.rejects(broken.model.sessions.model.run({}), /RESULT_INVALID/u);
});
test('native kernel errors propagate and do not dispose or replace warm sessions', async () => {
  const fixture = createModel(), session = fixture.model.sessions.model;
  session.run = async () => { throw new Error('FAKE_NATIVE_KERNEL_FAILURE'); }; configurePlainWhisperSessions(fixture.model);
  await assert.rejects(session.run({}), /FAKE_NATIVE_KERNEL_FAILURE/u); assert.equal(fixture.model.sessions.model, session);
});
