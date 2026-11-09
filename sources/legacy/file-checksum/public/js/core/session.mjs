import { ProductError, ERROR_CODES, validateFileSize, parseExpected, compareHash } from './checksum.mjs';

export const JOB_TIMEOUT_MS = 60000;
export const WORKER_ERROR_CODES = Object.freeze([
  'UNSUPPORTED_ENVIRONMENT', 'SIZE_INVALID', 'SIZE_LIMIT', 'WORKER_PROTOCOL',
  'READ_FAILED', 'READ_SIZE_MISMATCH', 'HASH_FAILED', 'HASH_LENGTH',
]);
const PHASES = new Set(['idle', 'ready', 'reading', 'hashing', 'done', 'cancelled', 'error']);
const STATE_KEYS = ['phase', 'fileSize', 'fileRevision', 'jobId', 'outputRevision', 'activeJobId', 'deadline', 'hash', 'error', 'expectedSource', 'expected', 'comparison'];
const ACTION_KEYS = Object.freeze({
  select: ['type', 'size'], expected: ['type', 'source'], start: ['type', 'now'],
  reply: ['type', 'jobId', 'fileRevision', 'message', 'now'],
  fail: ['type', 'jobId', 'fileRevision', 'code', 'now'],
  'check-deadline': ['type', 'now'], cancel: ['type'], clear: ['type'], pagehide: ['type'],
});
function exactRecord(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === fields.length && keys.every(key => fields.includes(key)
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function dataRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Reflect.ownKeys(value).every(key => Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function protocol(condition) { if (!condition) throw new ProductError('WORKER_PROTOCOL'); }
function increment(value) { protocol(Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER); return value + 1; }
function clock(now) { protocol(typeof now === 'number' && Number.isFinite(now) && now >= 0 && now <= Number.MAX_SAFE_INTEGER - JOB_TIMEOUT_MS); return now; }
export function isBusy(state) { return state.phase === 'reading' || state.phase === 'hashing'; }
function withState(state, changes) {
  const next = { ...state, ...changes };
  next.comparison = compareHash(next.hash, next.expected);
  return Object.freeze(next);
}
export function createSession() {
  return Object.freeze({
    phase: 'idle', fileSize: null, fileRevision: 0, jobId: 0, outputRevision: 0,
    activeJobId: null, deadline: null, hash: null, error: null,
    expectedSource: '', expected: parseExpected(''), comparison: 'pending',
  });
}
function validateState(state) {
  protocol(exactRecord(state, STATE_KEYS) && PHASES.has(state.phase));
  for (const key of ['fileRevision', 'jobId', 'outputRevision']) protocol(Number.isSafeInteger(state[key]) && state[key] >= 0);
  protocol(state.fileSize === null || Number.isSafeInteger(state.fileSize) && state.fileSize >= 0 && state.fileSize <= 134217728);
  protocol(typeof state.expectedSource === 'string');
  const parsed = parseExpected(state.expectedSource);
  protocol(exactRecord(state.expected, ['state', 'hex', 'code']) && parsed.state === state.expected.state && parsed.hex === state.expected.hex && parsed.code === state.expected.code);
  protocol(state.error === null || ERROR_CODES.includes(state.error));
  protocol(state.phase === 'error' ? state.error !== null : state.error === null);
  protocol(state.phase !== 'done' || state.hash !== null);
  protocol(!['ready', 'cancelled', 'done'].includes(state.phase) || state.fileSize !== null);
  protocol(state.hash === null || state.phase === 'done');
  protocol(state.comparison === compareHash(state.hash, state.expected));
  if (isBusy(state)) {
    protocol(state.fileSize !== null && Number.isSafeInteger(state.activeJobId) && state.activeJobId > 0 && state.activeJobId === state.jobId
      && Number.isFinite(state.deadline) && state.deadline >= JOB_TIMEOUT_MS && state.hash === null && state.error === null);
  } else protocol(state.activeJobId === null && state.deadline === null);
}
export function validateWorkerReply(message, { jobId, fileSize }) {
  protocol(Number.isSafeInteger(jobId) && jobId > 0);
  validateFileSize(fileSize);
  protocol(dataRecord(message));
  const fields = message.type === 'stage' ? ['type', 'jobId', 'stage']
    : message.type === 'done' ? ['type', 'jobId', 'hex', 'bytes']
      : message.type === 'error' ? ['type', 'jobId', 'code'] : null;
  protocol(fields && exactRecord(message, fields) && message.jobId === jobId);
  if (message.type === 'stage') protocol(['reading', 'hashing'].includes(message.stage));
  if (message.type === 'done') protocol(typeof message.hex === 'string' && /^[0-9a-f]{64}$/.test(message.hex)
    && Number.isSafeInteger(message.bytes) && message.bytes === fileSize);
  if (message.type === 'error') protocol(WORKER_ERROR_CODES.includes(message.code));
  return Object.freeze({ ...message });
}
function finish(state, phase, error = null, hash = null) {
  return withState(state, { phase, error, hash, activeJobId: null, deadline: null,
    jobId: increment(state.jobId), outputRevision: increment(state.outputRevision) });
}
function expired(state, now) { return isBusy(state) && clock(now) >= state.deadline; }
function cleared(state) {
  return withState(state, { phase: 'idle', fileSize: null, fileRevision: increment(state.fileRevision),
    jobId: increment(state.jobId), outputRevision: increment(state.outputRevision), activeJobId: null,
    deadline: null, hash: null, error: null, expectedSource: '', expected: parseExpected('') });
}
export function reduceSession(state, action) {
  validateState(state);
  protocol(dataRecord(action) && Object.hasOwn(ACTION_KEYS, action.type) && exactRecord(action, ACTION_KEYS[action.type]));
  if (action.type === 'expected') {
    if (typeof action.source !== 'string') throw new ProductError('EXPECTED_FORMAT');
    return withState(state, { expectedSource: action.source, expected: parseExpected(action.source) });
  }
  if (action.type === 'select') {
    const changes = { fileRevision: increment(state.fileRevision), jobId: increment(state.jobId), outputRevision: increment(state.outputRevision),
      activeJobId: null, deadline: null, hash: null, error: null, fileSize: null, phase: 'ready' };
    try { changes.fileSize = validateFileSize(action.size); }
    catch (error) { changes.phase = 'error'; changes.error = error.code; }
    return withState(state, changes);
  }
  if (action.type === 'clear' || action.type === 'pagehide') return cleared(state);
  if (action.type === 'cancel') return finish(state, state.fileSize === null ? 'idle' : 'cancelled');
  if (action.type === 'check-deadline') {
    clock(action.now);
    return expired(state, action.now) ? finish(state, 'error', 'TIMEOUT') : state;
  }
  if (action.type === 'start') {
    const now = clock(action.now);
    if (isBusy(state)) return expired(state, now) ? finish(state, 'error', 'TIMEOUT') : state;
    if (state.fileSize === null) return finish(state, 'error', 'FILE_REQUIRED');
    const jobId = increment(state.jobId);
    return withState(state, { phase: 'reading', jobId, activeJobId: jobId, deadline: now + JOB_TIMEOUT_MS,
      outputRevision: increment(state.outputRevision), hash: null, error: null });
  }
  // Callback identity is checked before its message/time. Stale callbacks are inert.
  if (!isBusy(state) || action.jobId !== state.activeJobId || action.fileRevision !== state.fileRevision) return state;
  const now = clock(action.now);
  if (expired(state, now)) return finish(state, 'error', 'TIMEOUT');
  if (action.type === 'fail') {
    const code = ERROR_CODES.includes(action.code) && !action.code.startsWith('EXPECTED_') ? action.code : 'WORKER_PROTOCOL';
    return finish(state, 'error', code);
  }
  let reply;
  try { reply = validateWorkerReply(action.message, { jobId: state.activeJobId, fileSize: state.fileSize }); }
  catch { return finish(state, 'error', 'WORKER_PROTOCOL'); }
  if (reply.type === 'error') return finish(state, 'error', reply.code);
  if (reply.type === 'stage') {
    if (state.phase === 'hashing' && reply.stage === 'reading') return finish(state, 'error', 'WORKER_PROTOCOL');
    return reply.stage === state.phase ? state : withState(state, { phase: reply.stage });
  }
  if (state.phase !== 'hashing') return finish(state, 'error', 'WORKER_PROTOCOL');
  return finish(state, 'done', null, reply.hex);
}
