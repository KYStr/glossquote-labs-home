import { analyzeAndShiftSrt } from './core.mjs';
import { isShiftRequest } from './protocol.mjs';

let handled = false;
self.addEventListener('message', event => {
  if (handled) return;
  handled = true;
  if (!isShiftRequest(event.data)) throw new Error('INVALID_REQUEST');
  const { jobId, revision, pageGeneration, input } = event.data;
  let outcome;
  try { outcome = analyzeAndShiftSrt(input); }
  catch { throw new Error('PROCESSING_FAILED'); }
  self.postMessage({ type: outcome.ok ? 'success' : 'failure', jobId, revision, pageGeneration, outcome });
});
