// Observe only synchronous bridge exports. Asyncify session/run exports stay untouched.
export function installBridgeObserver(instance, emit, modelSizes) {
  const allocations = new Map(), modelStaging = new Set();
  const metrics = { bridgeAllocatedBytes: 0, bridgeFreedBytes: 0, bridgeLiveBytes: 0, bridgeMaxLiveBytes: 0, nativeModelStagingReleased: 0, prepackingDisabledEntries: 0 };
  const snapshot = () => ({ wasmHeapBytes: instance.HEAPU8.buffer.byteLength, ...metrics });
  const malloc = instance._malloc, free = instance._free, config = instance._OrtAddSessionConfigEntry;
  function ascii(offset) {
    let value = '';
    for (let index = 0; index < 80 && instance.HEAPU8[offset + index]; index += 1) value += String.fromCharCode(instance.HEAPU8[offset + index]);
    return value;
  }
  instance._malloc = function mallocProbe(size) {
    const offset = malloc.call(instance, size);
    instance._malloc = mallocProbe; // First official thunk replaces itself with its resolved export.
    if (offset) {
      allocations.set(offset, size); metrics.bridgeAllocatedBytes += size; metrics.bridgeLiveBytes += size;
      metrics.bridgeMaxLiveBytes = Math.max(metrics.bridgeMaxLiveBytes, metrics.bridgeLiveBytes);
      if (modelSizes.includes(size)) { modelStaging.add(offset); emit('model-staging-allocated', { modelStagingBytes: size, ...snapshot() }); }
    }
    return offset;
  };
  instance._free = function freeProbe(offset) {
    const size = allocations.get(offset) ?? 0;
    const result = free.call(instance, offset); instance._free = freeProbe;
    if (size) { allocations.delete(offset); metrics.bridgeFreedBytes += size; metrics.bridgeLiveBytes -= size; }
    if (modelStaging.delete(offset)) { metrics.nativeModelStagingReleased += 1; emit('model-staging-freed', { freedBytes: size, ...snapshot() }); }
    return result;
  };
  instance._OrtAddSessionConfigEntry = function configProbe(...values) {
    const result = config.apply(instance, values); instance._OrtAddSessionConfigEntry = configProbe;
    if (ascii(values[1]) === 'session.disable_prepacking' && ascii(values[2]) === '1' && result === 0) metrics.prepackingDisabledEntries += 1;
    return result;
  };
  return snapshot;
}
