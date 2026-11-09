import { processJson } from './core/formatter.mjs';
import { failure } from './core/lexer.mjs';
self.onmessage = event => {
  const data = event.data;
  if (!data || typeof data !== 'object' || !Number.isSafeInteger(data.jobId) || data.jobId < 1) return;
  let result;
  if (Object.keys(data).length !== 4 || !['type','jobId','source','mode'].every(key => Object.hasOwn(data,key)) || data.type !== 'process' || typeof data.source !== 'string') result = failure('WORKER_FAILED');
  else {
    try { result = processJson(data.source,data.mode); }
    catch { result = failure('WORKER_FAILED'); }
  }
  self.postMessage({ type:'result', jobId:data.jobId, result });
};
