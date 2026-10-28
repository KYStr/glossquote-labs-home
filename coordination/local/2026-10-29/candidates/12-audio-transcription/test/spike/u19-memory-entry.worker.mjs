import { enableMemoryTrace } from '/js/core/memory-phases.mjs';
enableMemoryTrace(record => self.postMessage({ type: 'u19-memory-phase', ...record }));
// Executes the real production Worker, with its exact validation/protocol/runtime options.
await import('/js/transcribe.worker.mjs');
