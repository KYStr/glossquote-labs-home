// Pure controller for Module Dependency Reduction.
// Owns the draft, the work generation, and the state machine. No DOM,
// network, or storage access. The `runner` is injected: an async function
// ({modules, edges, generation}) => ({ok:true, result} | {ok:false, error}).
// Late results from an older generation are discarded and can never revive
// an old result or overwrite a newer error.
//
// States: empty | dirty | busy | success | error | cancelled.
// - empty: initial / after reset, draft is the default.
// - dirty: any draft change invalidated the previous result/download.
// - busy: a run is in flight; editing cancels it and goes dirty.
// - success: result matches the current snapshot; download available.
// - error: the last run failed; the draft is kept for correction.
// - cancelled: a run was cancelled; the draft is kept.

export const DEFAULT_DRAFT = Object.freeze({ modules: '', edges: '' });

export function createController(runner, options = {}) {
  const onAbandon = typeof options.onAbandon === 'function' ? options.onAbandon : () => {};
  const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
  let state = 'empty';
  let draft = { ...DEFAULT_DRAFT };
  let generation = 0;
  let result = null;
  let error = null;
  let reportAvailable = false;

  function notify() {
    onChange(snapshot());
  }

  function snapshot() {
    return {
      state,
      draft: { ...draft },
      result,
      error,
      reportAvailable,
    };
  }

  // Abandon any in-flight run: its late result must be discarded.
  function abandon() {
    if (state === 'busy') onAbandon();
    generation += 1;
  }

  function setDraft(next) {
    const modules = typeof next.modules === 'string' ? next.modules : '';
    const edges = typeof next.edges === 'string' ? next.edges : '';
    if (modules === draft.modules && edges === draft.edges) return snapshot();
    abandon();
    draft = { modules, edges };
    result = null;
    error = null;
    reportAvailable = false;
    state = 'dirty';
    notify();
    return snapshot();
  }

  function run() {
    abandon();
    result = null;
    error = null;
    reportAvailable = false;
    state = 'busy';
    const myGeneration = generation;
    const input = { ...draft };
    const outcome = runner({ ...input, generation: myGeneration });
    Promise.resolve(outcome).then((resolved) => {
      // Only the current generation, while still busy, may land.
      if (myGeneration !== generation || state !== 'busy') return;
      if (resolved && resolved.ok) {
        result = resolved.result;
        error = null;
        reportAvailable = true;
        state = 'success';
      } else {
        result = null;
        error = resolved && resolved.error
          ? resolved.error
          : { code: 'WORKER_ERROR', field: null, row: null };
        reportAvailable = false;
        state = 'error';
      }
      notify();
    });
    notify();
    return snapshot();
  }

  function cancel() {
    if (state !== 'busy') return snapshot();
    abandon();
    result = null;
    error = null;
    reportAvailable = false;
    state = 'cancelled';
    notify();
    return snapshot();
  }

  function reset() {
    abandon();
    draft = { ...DEFAULT_DRAFT };
    result = null;
    error = null;
    reportAvailable = false;
    state = 'empty';
    notify();
    return snapshot();
  }

  return { snapshot, setDraft, run, cancel, reset };
}
