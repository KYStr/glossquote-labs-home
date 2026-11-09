// This is a Node worker_threads bridge for protocol tests, never a browser.
import { parentPort, workerData } from 'node:worker_threads';
import { runWorkerMessage } from '../public/js/analysis-worker.js';
parentPort.once('message', async message => {
  const options = workerData?.pauseDigest ? { digestProvider: async bytes => {
    // Deterministic test-only pause; no time-based race or browser claim.
    parentPort.postMessage({ type: 'test-digest-paused' });
    await new Promise(resolve => parentPort.once('message', resolve));
    return globalThis.crypto.subtle.digest('SHA-256', bytes);
  } } : {};
  await runWorkerMessage(message, value => parentPort.postMessage(value), options);
  parentPort.close();
});
