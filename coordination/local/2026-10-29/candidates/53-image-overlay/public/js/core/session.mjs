export function initialSession() { return { revision: 0, phase: 'idle', error: null, result: null, progress: 0 }; }
// Generation is data, never a side effect. Every event that changes the source or
// settings invalidates output synchronously. Late completions are ignored.
export function reduceSession(state, event) {
  if (['edit', 'clear', 'cancel'].includes(event.type)) return {
    revision: state.revision + 1,
    phase: event.type === 'clear' ? 'idle' : 'editing', error: null, result: null, progress: 0
  };
  if (event.revision !== state.revision) return state;
  if (event.type === 'start') return { ...state, phase: 'running', error: null, result: null, progress: 0 };
  if (event.type === 'progress' && state.phase === 'running') return { ...state, progress: Math.max(0, Math.min(100, event.progress)) };
  if (event.type === 'error') return { ...state, phase: 'error', error: event.code, result: null, progress: 0 };
  if (event.type === 'ready' && state.phase === 'running') return { ...state, phase: 'ready', result: event.result, error: null, progress: 100 };
  return state;
}
