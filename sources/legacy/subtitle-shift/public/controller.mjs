import { isTerminal } from './protocol.mjs';

// Owns one active Worker and one current result. No DOM, storage or networking.
export function createController({ createWorker, setTimer, clearTimer, urls, onChange }) {
  const state = { srtRaw: '', direction: 'earlier', secondsRaw: '0', revision: 0, pageGeneration: 0, busy: false, composing: false, result: null, resultRevision: null, error: null, status: 'idle' };
  let active = null;
  let jobSequence = 0;
  const emit = () => onChange({ ...state });
  const current = token => active === token && token.worker === active.worker && token.jobId === active.jobId && token.revision === state.revision && token.pageGeneration === state.pageGeneration;
  const retire = token => {
    if (!current(token)) return false;
    active = null; // Invalidate before terminate: adapters may deliver late callbacks.
    clearTimer(token.timer);
    token.worker.terminate();
    state.busy = false;
    return true;
  };
  const invalidate = () => {
    if (active) retire(active);
    state.revision++;
    state.result = null; state.resultRevision = null; state.error = null;
    state.status = 'edited';
  };
  const fail = (token, code) => {
    if (!retire(token)) return;
    state.error = { code }; state.status = 'error'; emit();
  };
  const reset = () => {
    invalidate(); state.pageGeneration++;
    state.srtRaw = ''; state.direction = 'earlier'; state.secondsRaw = '0';
    state.composing = false; state.error = null; state.status = 'idle';
    urls.clear(); emit();
  };
  return Object.freeze({
    snapshot() { return { ...state }; },
    hasContent() { return state.srtRaw !== '' || state.secondsRaw !== '0' || state.direction !== 'earlier' || state.result !== null || state.busy; },
    edit(field, value, isComposing = false) {
      if (!['srtRaw', 'direction', 'secondsRaw'].includes(field) || typeof value !== 'string') return;
      const changed = state[field] !== value;
      if (changed || isComposing) invalidate();
      state[field] = value;
      if (isComposing) state.composing = true;
      if (changed || isComposing) emit();
    },
    compositionStart() { invalidate(); state.composing = true; emit(); },
    compositionEnd(field, value) {
      if (!['srtRaw', 'secondsRaw'].includes(field) || typeof value !== 'string') return;
      if (state[field] !== value) { invalidate(); state[field] = value; }
      state.composing = false; emit();
    },
    submit() {
      if (state.composing || state.busy) return false;
      state.result = null; state.resultRevision = null; state.error = null;
      let worker;
      try { worker = createWorker(); }
      catch { state.status = 'error'; state.error = { code: 'WORKER_UNAVAILABLE' }; emit(); return false; }
      const token = { worker, jobId: ++jobSequence, revision: state.revision, pageGeneration: state.pageGeneration, timer: null };
      active = token; state.busy = true; state.status = 'working';
      worker.onmessage = event => {
        if (!current(token)) return;
        const message = event.data;
        // An envelope for another request must have no effect on this request.
        if (message && typeof message === 'object' && [message.jobId, message.revision, message.pageGeneration].every(Number.isSafeInteger)
          && (message.jobId !== token.jobId || message.revision !== token.revision || message.pageGeneration !== token.pageGeneration)) return;
        if (!isTerminal(message)) { fail(token, 'WORKER_INVALID'); return; }
        if (message.outcome.ok && (message.outcome.result.direction !== state.direction || message.outcome.result.secondsRaw !== state.secondsRaw)) { fail(token, 'WORKER_INVALID'); return; }
        if (!retire(token)) return;
        if (message.outcome.ok) {
          state.result = message.outcome.result; state.resultRevision = state.revision; state.status = 'success';
        } else { state.error = message.outcome.error; state.status = 'error'; }
        emit();
      };
      worker.onerror = event => { event.preventDefault?.(); fail(token, 'WORKER_FAILED'); };
      worker.onmessageerror = () => fail(token, 'WORKER_INVALID');
      emit();
      // Start the deadline at send time, with identity-guarded cleanup paths.
      try {
        token.timer = setTimer(() => fail(token, 'WORKER_TIMEOUT'), 10000);
        worker.postMessage({ type: 'shift', jobId: token.jobId, revision: token.revision, pageGeneration: token.pageGeneration, input: { srtRaw: state.srtRaw, direction: state.direction, secondsRaw: state.secondsRaw } });
      } catch { fail(token, 'WORKER_FAILED'); }
      return true;
    },
    cancel() {
      if (!active) return;
      invalidate(); state.status = 'cancelled'; emit();
    },
    clear: reset,
    navigate() { reset(); },
    pagehide() { reset(); },
    pageshow(persisted) { if (persisted) reset(); else urls.prune(); },
    resume() { urls.prune(); },
    download() {
      if (!state.result || state.resultRevision !== state.revision || state.composing || state.busy) return { ok: false, code: 'NO_CURRENT_RESULT' };
      const outcome = urls.allocate(state.result.srtText);
      if (!outcome.ok) { state.error = { code: outcome.code }; emit(); }
      else { state.error = null; emit(); }
      return outcome;
    }
  });
}
