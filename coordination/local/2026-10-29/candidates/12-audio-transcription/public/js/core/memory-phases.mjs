// Numeric, opt-in observation for the T02 worker entry. No native runtime hooks.
const labels = new Set(['asset-load-start', 'asset-load-complete', 'asset-map-clear', 'asset-response-created', 'asset-reference-read', 'runtime-bootstrap-start', 'runtime-bootstrap-end', 'inference-start', 'inference-end', 'encoder-run-start', 'encoder-run-end', 'decoder-run-start', 'decoder-run-end', 'read-receipt', 'trace-overflow']);
const receiptFields = new Set(['scopeCode', 'ordinal', 'readId', 'expectedBytes', 'receivedBytes', 'eof', 'hashChecked', 'hashOk', 'readerLocked', 'lockObserved', 'hasSignal', 'signalAborted', 'reasonCode', 'outcomeCode']);
const fields = new Set(['verifiedBytes', 'assetBytes', 'responseCopyBytes', 'sessionCount', 'calls', 'returnedTensorBytes', 'inputPcmBytes', 'eventCode', ...receiptFields]);
export const READ_EVENT = Object.freeze({ START: 1, READER_ACQUIRED: 2, EOF: 3, HASH_RESULT: 4, CANCEL_CALLED: 5, ABORT_SIGNALLED: 6, ERROR: 7, FINISH: 8 });
export const READ_REASON = Object.freeze({ NONE: 0, CALLER_SIGNAL: 1, TIMEOUT: 2, HEADER_LENGTH: 3, SIZE_CAP: 4, SHORT_READ: 5, HASH_MISMATCH: 6, READ_ERROR: 7, LOAD_ERROR: 8, RESPONSE_REJECTED: 9 });
let sink, jobId = 0, sequence = 0;
export function enableMemoryTrace(callback) {
  if (sink || typeof callback !== 'function') throw new Error('MEMORY_TRACE_CONFIG_INVALID');
  sink = callback; jobId = 0; sequence = 0;
}
export function disableMemoryTrace() { sink = undefined; jobId = 0; sequence = 0; }
export function memoryTraceJob() { return sink ? jobId : -1; }
export function setMemoryTraceJob(value) {
  if (!sink) return;
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('MEMORY_TRACE_JOB_INVALID');
  jobId = value;
}
export function memoryPhase(label, values = {}) {
  if (!sink) return;
  if (!labels.has(label) || !values || Array.isArray(values) || typeof values !== 'object'
    || Reflect.ownKeys(values).some(key => typeof key !== 'string' || !fields.has(key) || !Number.isSafeInteger(values[key]) || values[key] < 0)) throw new Error('MEMORY_TRACE_RECORD_INVALID');
  if (sequence > 512) return;
  const overflow = sequence === 512;
  const record = Object.freeze({ phase: overflow ? 'trace-overflow' : label, jobId, sequence: sequence++, wallTimeMs: Date.now(), monotonicMs: performance.now(), ...(overflow ? {} : values) });
  try { sink(record); } catch { /* An observer cannot change inference results or error propagation. */ }
}

// Retains numbers only; never a Response, reader, signal, input, output or body.
export function createReadReceipt({ scopeCode, ordinal, readId, expectedBytes, hasSignal = 0 }) {
  if (!sink) return undefined;
  if (![1, 2].includes(scopeCode) || ![ordinal, readId, expectedBytes].every(value => Number.isSafeInteger(value) && value > 0) || ![0, 1].includes(hasSignal)) throw new Error('READ_RECEIPT_CONFIG_INVALID');
  const state = { scopeCode, ordinal, readId, expectedBytes, receivedBytes: 0, eof: 0, hashChecked: 0, hashOk: 0, readerLocked: 0, lockObserved: 0, hasSignal, signalAborted: 0, reasonCode: 0, outcomeCode: 0 };
  const update = values => {
    if (!values || typeof values !== 'object' || Array.isArray(values) || Reflect.ownKeys(values).some(key => !receiptFields.has(key) || !Number.isSafeInteger(values[key]) || values[key] < 0)) throw new Error('READ_RECEIPT_RECORD_INVALID');
    for (const key of ['eof', 'hashChecked', 'hashOk', 'readerLocked', 'lockObserved', 'hasSignal', 'signalAborted']) if (Object.hasOwn(values, key) && ![0, 1].includes(values[key])) throw new Error('READ_RECEIPT_RECORD_INVALID');
    if ((Object.hasOwn(values, 'reasonCode') && !Object.values(READ_REASON).includes(values.reasonCode)) || (Object.hasOwn(values, 'outcomeCode') && ![0, 1, 2].includes(values.outcomeCode))) throw new Error('READ_RECEIPT_RECORD_INVALID');
    for (const key of ['scopeCode', 'ordinal', 'readId', 'expectedBytes', 'hasSignal']) if (Object.hasOwn(values, key) && values[key] !== state[key]) throw new Error('READ_RECEIPT_IDENTITY_INVALID');
    Object.assign(state, values);
  };
  const record = (eventCode, values = {}) => {
    if (!Object.values(READ_EVENT).includes(eventCode)) throw new Error('READ_RECEIPT_EVENT_INVALID');
    update(values); memoryPhase('read-receipt', { ...state, eventCode });
  };
  record(READ_EVENT.START);
  return Object.freeze({ update, record });
}
