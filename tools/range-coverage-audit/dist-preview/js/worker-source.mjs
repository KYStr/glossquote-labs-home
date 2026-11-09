// Module Worker entry for Numeric Range Coverage Audit.
//
// The build (scripts/build.mjs) concatenates public/js/core/range.mjs with
// this file — minus the import line below — into one self-contained bundle
// string, which the app loads through a Blob URL. That keeps user input out
// of code entirely: the worker only ever receives data, never code.
//
// `handleWorkerMessage` is exported so Node tests can exercise the exact
// worker path without a browser.

import { runAudit } from './core/range.mjs';

export function handleWorkerMessage(message) {
  if (!message || typeof message !== 'object' || typeof message.generation !== 'number') {
    return { generation: 0, ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } };
  }
  try {
    const outcome = runAudit(message.input);
    if (outcome.ok) {
      return { generation: message.generation, ok: true, result: outcome.result };
    }
    return { generation: message.generation, ok: false, error: outcome.error };
  } catch {
    return { generation: message.generation, ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } };
  }
}

if (typeof self !== 'undefined' && self !== null && typeof self.postMessage === 'function') {
  self.onmessage = (event) => {
    self.postMessage(handleWorkerMessage(event.data));
  };
}
