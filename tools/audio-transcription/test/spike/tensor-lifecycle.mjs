// Diagnostic candidate for the fixed, CPU/WASM, plain-text Whisper generate path.
// Sessions and the model stay alive across calls; only completed CPU outputs are released.
export function installCpuTensorLifecycle(model) {
  if (!model || typeof model.generate !== 'function' || typeof model.getPastKeyValues !== 'function') throw new Error('TENSOR_LIFECYCLE_MODEL_INVALID');
  const originalGenerate = model.generate.bind(model), originalPast = model.getPastKeyValues.bind(model);
  let active = false, cache = [], lastOutputs = [];
  const stats = { generations: 0, disposals: 0, peakCacheBytes: 0, cleanupFailures: 0 };
  const identity = value => value?.ort_tensor ?? value;
  const bytes = value => value?.location === 'cpu' ? value.data?.byteLength ?? 0 : 0;
  function release(values, keep = []) {
    const kept = new Set(keep.map(identity)), seen = new Set();
    for (const tensor of values) {
      const key = identity(tensor);
      if (!tensor || seen.has(key) || kept.has(key) || tensor.location !== 'cpu') continue;
      seen.add(key);
      try { tensor.dispose(); stats.disposals += 1; }
      catch { stats.cleanupFailures += 1; }
    }
  }
  model.getPastKeyValues = (outputs, previous, final = false) => {
    const next = originalPast(outputs, previous, final);
    if (!active) return next;
    const nextValues = Object.values(next), outputValues = Object.values(outputs);
    const nextBytes = [...new Map(nextValues.map(tensor => [identity(tensor), tensor])).values()].reduce((total, tensor) => total + bytes(tensor), 0);
    stats.peakCacheBytes = Math.max(stats.peakCacheBytes, nextBytes);
    // Keep aliases of the reused encoder cache and all live decoder outputs.
    release([...cache, ...Object.values(previous ?? {})], nextValues);
    // Logits have been sampled before getPastKeyValues; unused encoder outputs
    // are replaced by the prior encoder cache in the fixed runtime.
    release(outputValues, nextValues);
    cache = nextValues; lastOutputs = outputValues;
    return next;
  };
  model.generate = async (...args) => {
    if (active || args[0]?.return_dict_in_generate || args[0]?.output_attentions || args[0]?.return_token_timestamps) throw new Error('TENSOR_LIFECYCLE_CONTRACT_INVALID');
    active = true; stats.generations += 1;
    try { return await originalGenerate(...args); }
    finally {
      release([...cache, ...lastOutputs]); cache = []; lastOutputs = []; active = false;
    }
  };
  return () => ({ ...stats, trackedCacheTensors: cache.length, active });
}
