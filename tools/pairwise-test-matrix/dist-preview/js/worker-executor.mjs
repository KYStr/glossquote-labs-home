// Browser executor: runs the pure core in a module Worker built from the
// embedded fixed Worker source (core + entry), via a single Blob URL.
// The Worker is terminated and the URL revoked on cancel, on a newer
// generation, on reset, and after every result. User content is only ever
// sent as the postMessage snapshot, never as code.

import { WORKER_SOURCE } from './worker-source.mjs';

export function createWorkerExecutor() {
  let worker = null;
  let workerUrl = null;
  let pending = null; // { generation, resolve, reject }

  function dispose() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
      workerUrl = null;
    }
    pending = null;
  }

  function workerError() {
    return Object.assign(new Error('worker failed'), { code: 'WORKER_ERROR' });
  }

  return {
    start(snapshot, generation) {
      dispose();
      return new Promise((resolve, reject) => {
        pending = { generation, resolve, reject };
        try {
          workerUrl = URL.createObjectURL(
            new Blob([WORKER_SOURCE], { type: 'text/javascript' }),
          );
          worker = new Worker(workerUrl, { type: 'module' });
        } catch (err) {
          dispose();
          reject(workerError());
          return;
        }
        worker.onmessage = (event) => {
          const data = event.data;
          if (!data || data.generation !== generation) return;
          const p = pending;
          dispose();
          if (p) p.resolve(data.outcome);
        };
        worker.onerror = () => {
          const p = pending;
          dispose();
          if (p) p.reject(workerError());
        };
        worker.postMessage({ generation, input: snapshot });
      });
    },
    cancel() {
      if (pending) {
        const p = pending;
        dispose();
        p.reject(Object.assign(new Error('cancelled'), { code: 'CANCELLED' }));
      } else {
        dispose();
      }
    },
  };
}
