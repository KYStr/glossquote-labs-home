import { memoryPhase, memoryTraceJob } from './memory-phases.mjs';
// The fixed encoder exports six large attention maps even for plain-text ASR.
// Transformers 3.8.1 consumes only last_hidden_state; its default session.run
// still materializes every exported output. Select the required CPU outputs.
export function configurePlainWhisperSessions(model) {
  if (model?.config?.model_type !== 'whisper' || !model.sessions?.model || !model.sessions?.decoder_model_merged) throw new Error('WHISPER_OUTPUT_CONTRACT_INVALID');
  const encoder = model.sessions.model, decoder = model.sessions.decoder_model_merged;
  const specifications = [
    { session: encoder, required: name => name === 'last_hidden_state', allowed: name => name === 'last_hidden_state' || /^encoder_attentions\.\d+$/u.test(name), mandatory: 'last_hidden_state' },
    { session: decoder, required: name => name === 'logits' || /^present\.\d+\.(?:encoder|decoder)\.(?:key|value)$/u.test(name), allowed: name => name === 'logits' || /^present\.\d+\.(?:encoder|decoder)\.(?:key|value)$/u.test(name) || /^(?:decoder_attentions|cross_attentions)\.\d+$/u.test(name), mandatory: 'logits' },
  ];
  const plans = specifications.map(specification => {
    const { session } = specification;
    if (typeof session.run !== 'function' || !Array.isArray(session.outputNames) || !session.outputNames.includes(specification.mandatory) || !session.outputNames.every(specification.allowed) || new Set(session.outputNames).size !== session.outputNames.length) throw new Error('WHISPER_OUTPUT_CONTRACT_INVALID');
    return { session, selected: session.outputNames.filter(specification.required), original: session.run.bind(session) };
  });
  if (plans[1].selected.length < 3) throw new Error('WHISPER_OUTPUT_CONTRACT_INVALID');
  for (const { session, selected, original } of plans) {
    const role = selected.includes('last_hidden_state') ? 'encoder' : 'decoder';
    let calls = 0, lastObservedJob = -1;
    session.run = async (feeds, explicitFetches, options) => {
      if (explicitFetches !== undefined) throw new Error('WHISPER_OUTPUT_REQUEST_INVALID');
      const traceJob = memoryTraceJob();
      const observed = traceJob >= 0 && (role === 'encoder' || traceJob !== lastObservedJob);
      if (traceJob >= 0) calls += 1;
      if (observed) { lastObservedJob = traceJob; memoryPhase(role + '-run-start', { calls }); }
      const result = await original(feeds, selected, options);
      if (!result || Object.keys(result).length !== selected.length || selected.some(name => !Object.hasOwn(result, name))) throw new Error('WHISPER_OUTPUT_RESULT_INVALID');
      if (observed) {
        const returnedTensorBytes = Object.values(result).reduce((sum, tensor) => sum + (tensor?.location === 'cpu' && ArrayBuffer.isView(tensor.data) ? tensor.data.byteLength : 0), 0);
        memoryPhase(role + '-run-end', { calls, returnedTensorBytes });
      }
      return result;
    };
  }
}
