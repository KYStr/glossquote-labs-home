import { calculateBackplan, PlanError } from './core/backplan.mjs';
import { serializePlan } from './core/output.mjs';

// Exported for offline protocol tests. These tests do not establish browser Worker behavior.
export function runCalculation(message, send) {
  if (!message || Object.keys(message).sort().join(',') !== 'generation,input,locale,type' || message.type !== 'calculate' ||
      !Number.isSafeInteger(message.generation) || message.generation < 1 || !['zh-Hant', 'en'].includes(message.locale)) return;
  const { generation } = message;
  try {
    const plan = calculateBackplan(message.input, { onProgress: progress => send({ type: 'progress', generation, ...progress }) });
    const output = serializePlan(plan, { locale: message.locale });
    if (!output.ok) {
      send({ type: 'failure', generation, errors: [{ code: output.code, field: 'project' }] });
      return;
    }
    send({ type: 'progress', generation, phase: 'serialize', completed: output.totalBytes, unit: 'bytes' });
    send({ type: 'result', generation, plan, output });
  } catch (error) {
    send({ type: 'failure', generation, errors: error instanceof PlanError ? error.errors : [{ code: 'INTERNAL_ERROR', field: 'project' }] });
  }
}

if (typeof self !== 'undefined') {
  self.onmessage = event => runCalculation(event.data, message => self.postMessage(message));
}
