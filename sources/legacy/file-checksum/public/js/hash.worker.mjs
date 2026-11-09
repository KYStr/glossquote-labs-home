// First-party module. Only raw File bytes reach the native SHA-256 operation.
const MAX_BYTES = 134217728;
const REPLY_ERRORS = new Set([
  'UNSUPPORTED_ENVIRONMENT', 'SIZE_INVALID', 'SIZE_LIMIT', 'WORKER_PROTOCOL',
  'READ_FAILED', 'READ_SIZE_MISMATCH', 'HASH_FAILED', 'HASH_LENGTH',
]);
class WorkerFault extends Error {
  constructor(code) { super(code); this.code = code; }
}
function exactRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === 3 && keys.every(key => ['type', 'jobId', 'file'].includes(key)
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function jobIdOf(value) {
  if (!value || typeof value !== 'object') return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'jobId');
  const id = descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : null;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
export function validateWorkerRequest(request, FileType = globalThis.File) {
  if (!exactRequest(request) || request.type !== 'hash' || jobIdOf(request) === null) throw new WorkerFault('WORKER_PROTOCOL');
  if (typeof FileType !== 'function') throw new WorkerFault('UNSUPPORTED_ENVIRONMENT');
  if (!(request.file instanceof FileType)) throw new WorkerFault('WORKER_PROTOCOL');
  const size = request.file.size;
  if (!Number.isSafeInteger(size) || size < 0) throw new WorkerFault('SIZE_INVALID');
  if (size > MAX_BYTES) throw new WorkerFault('SIZE_LIMIT');
  return Object.freeze({ type: 'hash', jobId: request.jobId, file: request.file });
}
export function createWorkerHandler(scope) {
  let used = false;
  let closed = false;
  let generation = 0;
  function close() {
    if (closed) return;
    closed = true; generation += 1;
    try { scope.close(); } catch { /* No raw exception crosses the protocol. */ }
  }
  function send(message) {
    if (closed) return false;
    try { scope.postMessage(message); return true; }
    catch { close(); return false; }
  }
  function fail(jobId, code) {
    if (jobId !== null) send({ type: 'error', jobId, code: REPLY_ERRORS.has(code) ? code : 'WORKER_PROTOCOL' });
    close();
  }
  return async function handle(request) {
    if (closed) return;
    const availableId = jobIdOf(request);
    if (used) { fail(availableId, 'WORKER_PROTOCOL'); return; }
    if (typeof scope.File !== 'function') { fail(availableId, 'UNSUPPORTED_ENVIRONMENT'); return; }
    let validated;
    try { validated = validateWorkerRequest(request, scope.File); }
    catch (error) { fail(availableId, error.code); return; }
    used = true;
    const token = generation;
    const current = () => !closed && generation === token;
    const { jobId, file } = validated;
    if (scope.isSecureContext !== true || typeof scope.crypto?.subtle?.digest !== 'function'
      || typeof file.arrayBuffer !== 'function') {
      fail(jobId, 'UNSUPPORTED_ENVIRONMENT'); return;
    }
    const size = file.size;
    if (!send({ type: 'stage', jobId, stage: 'reading' })) return;
    let buffer;
    try { buffer = await file.arrayBuffer(); }
    catch { if (current()) fail(jobId, 'READ_FAILED'); return; }
    if (!current()) return;
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== size) {
      fail(jobId, 'READ_SIZE_MISMATCH'); return;
    }
    if (!send({ type: 'stage', jobId, stage: 'hashing' })) return;
    let digest;
    try { digest = await scope.crypto.subtle.digest('SHA-256', buffer); }
    catch { if (current()) fail(jobId, 'HASH_FAILED'); return; }
    if (!current()) return;
    if (!(digest instanceof ArrayBuffer) || digest.byteLength !== 32) {
      fail(jobId, 'HASH_LENGTH'); return;
    }
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    send({ type: 'done', jobId, hex, bytes: size });
    close();
  };
}
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  const handle = createWorkerHandler(self);
  self.addEventListener('message', event => { void handle(event.data); });
}
