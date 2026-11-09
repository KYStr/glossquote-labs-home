// Stock Average Cost Calculator — draft / work / generation controller.
// Pure state machine over the core. The worker is injected so tests can use
// a controllable fake worker; the app injects the real Blob Worker.
// States: empty, dirty, busy, success, error, cancelled.
// No DOM, network, or storage access.

import { REPORT_FILENAME, serializeReport } from './core/calculate.mjs';

export const DEFAULT_DRAFT = Object.freeze({
  feeRateBps: '0',
  trades: Object.freeze([Object.freeze({ side: 'buy', shares: '', price: '' })]),
});

function copyTrade(trade) {
  return { side: trade.side, shares: trade.shares, price: trade.price };
}

function copyDraft(draft) {
  return { feeRateBps: draft.feeRateBps, trades: draft.trades.map(copyTrade) };
}

function isDefaultDraft(draft) {
  return draft.feeRateBps === DEFAULT_DRAFT.feeRateBps
    && draft.trades.length === 1
    && draft.trades[0].side === 'buy'
    && draft.trades[0].shares === ''
    && draft.trades[0].price === '';
}

function assertDraftShape(draft) {
  if (draft === null || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new TypeError('draft must be an object');
  }
  if (typeof draft.feeRateBps !== 'string') {
    throw new TypeError('draft.feeRateBps must be a string');
  }
  if (!Array.isArray(draft.trades)) {
    throw new TypeError('draft.trades must be an array');
  }
  for (const trade of draft.trades) {
    if (trade === null || typeof trade !== 'object' || Array.isArray(trade)
      || typeof trade.side !== 'string'
      || typeof trade.shares !== 'string'
      || typeof trade.price !== 'string') {
      throw new TypeError('each draft trade needs string side/shares/price');
    }
  }
}

export function createController({ createWorker, onChange }) {
  let status = 'empty';
  let draft = copyDraft(DEFAULT_DRAFT);
  let result = null;
  let error = null;
  let reportText = null;
  let generation = 0;
  let workerHandle = null;

  function snapshot() {
    return {
      status,
      draft: copyDraft(draft),
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
    // in-flight work, and moves to dirty (or empty for the default draft).
    setDraft(nextDraft) {
      assertDraftShape(nextDraft);
      invalidateWork();
      draft = copyDraft(nextDraft);
      result = null;
      error = null;
      reportText = null;
      status = isDefaultDraft(draft) ? 'empty' : 'dirty';
      emit();
      return snapshot();
    },

    loadExample(exampleDraft) {
      return this.setDraft(exampleDraft);
    },

    // Start a run over a snapshot of the current draft. Starting a run
    // supersedes any in-flight work (its generation is retired).
    run() {
      invalidateWork();
      const gen = generation;
      const snapshotDraft = copyDraft(draft);
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
            handle.postMessage({
              generation: gen,
              feeRateBps: snapshotDraft.feeRateBps,
              trades: snapshotDraft.trades,
            });
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
      draft = copyDraft(DEFAULT_DRAFT);
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
