import { parseInput } from './core/parser.js';
self.addEventListener('message', event => {
  const { type, jobId, bytes } = event.data ?? {};
  if (type === 'cancel' && typeof jobId === 'string') { self.close(); return; }
  if (type !== 'parse' || typeof jobId !== 'string' || !(bytes instanceof ArrayBuffer)) return;
  self.postMessage({ type: 'phase', jobId, phase: 'decoding' });
  const result = parseInput(new Uint8Array(bytes), { jobId, onPhase: phase => self.postMessage({ type: 'phase', jobId, phase }) });
  self.postMessage({ type: 'result', jobId, result });
});
