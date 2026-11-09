import { analyze } from './core/analyze.js';

export async function runWorkerMessage(message, postMessage, options = {}) {
  if (!message || message.type !== 'start' || typeof message.jobId !== 'string'
    || Object.keys(message).sort().join(',') !== 'files,jobId,type') return;
  const { jobId, files } = message;
  try {
    const result = await analyze(files, { ...options, jobId,
      onProgress: progress => postMessage({ type: 'progress', jobId, ...progress }) });
    if (result.status === 'ready') postMessage({ type: 'complete', jobId, result });
    else postMessage({ type: 'error', jobId, code: result.error.code, fileIndexes: result.error.fileIndexes });
  } catch { postMessage({ type: 'error', jobId, code: 'READ_FAILED', fileIndexes: [] }); }
}

if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  globalThis.onmessage = async event => {
    await runWorkerMessage(event.data, message => globalThis.postMessage(message));
    globalThis.close();
  };
}
