import test from 'node:test';
import assert from 'node:assert/strict';
import { installBridgeObserver } from './spike/bootstrap-observer.mjs';

test('numeric observer survives official lazy export replacement without wrapping async session/run', () => {
  const instance = { HEAPU8: new Uint8Array(256) }, events = [];
  let address = 100;
  const allocate = () => address += 1, release = () => 17, configure = () => 0;
  instance._malloc = size => (instance._malloc = allocate)(size);
  instance._free = offset => (instance._free = release)(offset);
  instance._OrtAddSessionConfigEntry = (...args) => (instance._OrtAddSessionConfigEntry = configure)(...args);
  const create = instance._OrtCreateSession = () => Promise.resolve(3), run = instance._OrtRun = () => Promise.resolve(4);
  instance.HEAPU8.set(new TextEncoder().encode('session.disable_prepacking'), 1);
  instance.HEAPU8.set(new TextEncoder().encode('1'), 40);
  const snapshot = installBridgeObserver(instance, (label, values) => events.push({ label, ...values }), [47, 53]);
  for (const size of [47, 53]) {
    const pointer = instance._malloc(size);
    assert.equal(instance._OrtAddSessionConfigEntry(2, 1, 40), 0);
    assert.equal(instance._free(pointer), 17);
  }
  assert.equal(instance._OrtCreateSession, create); assert.equal(instance._OrtRun, run);
  assert.equal(snapshot().nativeModelStagingReleased, 2); assert.equal(snapshot().prepackingDisabledEntries, 2);
  assert.equal(snapshot().bridgeAllocatedBytes, 100); assert.equal(snapshot().bridgeFreedBytes, 100); assert.equal(snapshot().bridgeLiveBytes, 0);
  assert.deepEqual(events.map(event => event.label), ['model-staging-allocated', 'model-staging-freed', 'model-staging-allocated', 'model-staging-freed']);
});
