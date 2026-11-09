// Archive Member Path Preflight — draft / work / generation controller.
// Pure state machine over the core. The worker is injected so tests can use
// a controllable fake worker; the app injects the real Blob Worker.
// States: empty, dirty, busy, success, error, cancelled.
// No DOM, network, or storage access.

import { REPORT_FILENAME, serializeReport } from './core/validate.mjs';

export const EMPTY_DRAFT = Object.freeze({ entries: '' });

export function createController({ createWorker, onChange }) {
  let status = 'empty';
  let draft = { entries: '' };
  let result = null;
  let error = null;
  let reportText = null;
  let generation = 0;
  let workerHandle = null;

  function snapshot() {
    return {
      status,
      draft: { entries: draft.entries },
      result,
      error,
      reportAvailable: status === 'success' && reportText !== null,
      reportText,
    };
  }

  function emit() {
    if (typeof onChange === 'function') onChange(snapshot());
  }

  function terminateWorker() {
    if (workerHandle !== null) {
      const handle = workerHandle;
      workerHandle = null;
      try {
        handle.terminate();
      } catch {
        // Termination is best-effort; the generation bump already discards
        // any late message from this worker.
      }
    }
  }

  function invalidateWork() {
    terminateWorker();
    generation += 1;
  }

  function failWorker(gen) {
    if (gen !== generation || status !== 'busy') return;
    terminateWorker();
    status = 'error';
    result = null;
    reportText = null;
    error = { code: 'WORKER_ERROR', field: null, row: null };
    emit();
  }

  function handleWorkerMessage(gen, message) {
    if (gen !== generation || status !== 'busy') return; // Stale: discard.
    terminateWorker();
    if (message !== null && typeof message === 'object' && message.ok === true) {
      const serialized = serializeReport(message.result);
      if (serialized.ok) {
        status = 'success';
        result = message.result;
        reportText = serialized.text;
        error = null;
      } else {
        status = 'error';
        result = null;
        reportText = null;
        error = serialized.error;
      }
    } else if (
      message !== null
      && typeof message === 'object'
      && message.ok === false
      && message.error !== null
      && typeof message.error === 'object'
      && typeof message.error.code === 'string'
    ) {
      status = 'error';
      result = null;
      reportText = null;
      error = {
        code: message.error.code,
        field: typeof message.error.field === 'string' ? message.error.field : null,
        row: typeof message.error.row === 'number' ? message.error.row : null,
      };
    } else {
      status = 'error';
      result = null;
      reportText = null;
      error = { code: 'INTERNAL', field: null, row: null };
    }
    emit();
  }

  function handleWorkerError(gen) {
    failWorker(gen);
  }

  return {
    getState() {
      return snapshot();
    },

    // Any draft change invalidates the old result and download, terminates
    // in-flight work, and moves to dirty (or empty for a blank draft).
    setDraft(entries) {
      if (typeof entries !== 'string') {
        throw new TypeError('draft entries must be a string');
      }
      invalidateWork();
      draft = { entries };
      result = null;
      error = null;
      reportText = null;
      status = entries === '' ? 'empty' : 'dirty';
      emit();
      return snapshot();
    },

    loadExample(entries) {
      return this.setDraft(entries);
    },

    // Start a run over a snapshot of the current draft. Starting a run
    // supersedes any in-flight work (its generation is retired).
    run() {
      invalidateWork();
      const gen = generation;
      const entries = draft.entries;
      status = 'busy';
      result = null;
      error = null;
      reportText = null;
      emit();

      let factoryResult;
      try {
        factoryResult = createWorker({
          onMessage: (message) => handleWorkerMessage(gen, message),
          onError: () => handleWorkerError(gen),
        });
      } catch {
        factoryResult = Promise.reject(new Error('worker factory failed'));
      }
      Promise.resolve(factoryResult).then(
        (handle) => {
          if (gen !== generation || status !== 'busy') {
            try {
              handle.terminate();
            } catch {
              // Already gone; generation discipline discards its messages.
            }
            return;
          }
          workerHandle = handle;
          try {
            handle.postMessage({ generation: gen, entries });
          } catch {
            failWorker(gen);
          }
        },
        () => failWorker(gen),
      );
      return snapshot();
    },

    // Cancel in-flight work. The draft is kept; the old result stays invalid.
    cancel() {
      if (status !== 'busy') return snapshot();
      invalidateWork();
      status = 'cancelled';
      result = null;
      error = null;
      reportText = null;
      emit();
      return snapshot();
    },

    // Stop work, restore the default draft, clear result and error.
    reset() {
      invalidateWork();
      draft = { entries: '' };
      status = 'empty';
      result = null;
      error = null;
      reportText = null;
      emit();
      return snapshot();
    },

    // Terminate in-flight work (e.g. pagehide). Keeps state and draft so a
    // bfcache restore can reset explicitly; the generation bump discards
    // any late worker message.
    dispose() {
      invalidateWork();
      return snapshot();
    },

    // The download payload for the current successful result, or null.
    download() {
      if (status !== 'success' || reportText === null) return null;
      return { filename: REPORT_FILENAME, text: reportText };
    },
  };
}
