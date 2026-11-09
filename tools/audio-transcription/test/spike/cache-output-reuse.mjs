// Fixed Whisper CPU decoder path: Transformers 3.8.1 always reuses the prior
// encoder KV cache. Avoid materializing outputs that it immediately discards.
export function installEncoderCacheOutputReuse(session) {
  if (!session || typeof session.run !== 'function' || !Array.isArray(session.outputNames)) throw new Error('CACHE_OUTPUT_SESSION_INVALID');
  const names = session.outputNames.filter(name => /^present\.\d+\.encoder\.(?:key|value)$/u.test(name));
  if (!names.length || names.length % 2) throw new Error('CACHE_OUTPUT_NAMES_INVALID');
  const requested = session.outputNames.filter(name => !names.includes(name));
  const original = session.run.bind(session), stats = { runs: 0, reusedRuns: 0, avoidedBytes: 0 };
  session.run = async (feeds, fetches, options) => {
    stats.runs += 1;
    // Preserve first-step execution and explicit output-selection overloads.
    if (feeds?.use_cache_branch?.location !== 'cpu' || feeds.use_cache_branch.data[0] !== 1 || fetches !== undefined) return original(feeds, fetches, options);
    const borrowed = Object.create(null);
    for (const name of names) {
      const tensor = feeds[name.replace('present', 'past_key_values')];
      if (!tensor || tensor.location !== 'cpu') throw new Error('CACHE_OUTPUT_INPUT_MISSING');
      borrowed[name] = tensor;
    }
    const result = await original(feeds, requested, options);
    if (names.some(name => Object.hasOwn(result, name))) throw new Error('CACHE_OUTPUT_SELECTION_IGNORED');
    stats.reusedRuns += 1;
    for (const name of names) { result[name] = borrowed[name]; stats.avoidedBytes += borrowed[name].data.byteLength; }
    return result;
  };
  return () => ({ ...stats });
}
