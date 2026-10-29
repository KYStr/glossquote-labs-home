import { createHash } from 'node:crypto';
import { FIXTURE, verifyFixedSources } from './source-identity.mjs';

const RECEIPT_LIMIT = 32, RECEIPT_DEADLINE_MS = 5000;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const chunkBytes = (value, encoding) => {
  if (value == null || typeof value === 'function') return Buffer.alloc(0);
  if (typeof value === 'string') return Buffer.from(value, typeof encoding === 'string' ? encoding : 'utf8');
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  throw new Error('UNEXPECTED_RESPONSE_CHUNK');
};

// Importing defines the factory only. No listen, child process, external control
// endpoint, browser operation, source write or environment read is performed.
export async function createTransportDiagnosticServer() {
  const fixed = await verifyFixedSources();
  const { createSpikeServer } = await import(new URL('scripts/serve-spike.mjs', fixed.tool));
  const { securityHeaders } = await import(new URL('scripts/serve.mjs', fixed.tool));
  const server = createSpikeServer();
  const handlers = server.listeners('request');
  if (handlers.length !== 1) throw new Error('ORIGINAL_HANDLER_NOT_UNIQUE');
  const original = handlers[0]; server.removeListener('request', original);
  const cells = new Map(); let sequence = 0, active = false, closed = false, mode = 'A';
  const cell = index => {
    if (!cells.has(index)) {
      let settle;
      const promise = new Promise(resolve => { settle = resolve; });
      cells.set(index, { promise, settle, done: false });
    }
    return cells.get(index);
  };
  const settle = (index, value) => { const item = cell(index); if (!item.done) { item.done = true; item.settle(value); } };
  const deny = (response, status, text) => { response.writeHead(status, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' }); response.end(text); };
  server.on('request', (request, response) => {
    const address = server.address();
    const hostCount = request.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === 'host').length;
    // Both branches share this guard. The pinned original static server lacks a
    // Host guard; do not claim it existed or let B bypass the original routes.
    if (!address || address.address !== '127.0.0.1' || hostCount !== 1 || request.headers.host !== '127.0.0.1:' + address.port) return deny(response, 403, 'Host rejected');
    if (request.url !== FIXTURE.path || request.method !== 'GET') return original(request, response);
    if (sequence >= RECEIPT_LIMIT) return deny(response, 429, 'Diagnostic limit');
    if (active) return deny(response, 409, 'Diagnostic busy');
    active = true;
    const record = { sequence: ++sequence, mode, path: FIXTURE.path, scope: 'NODE_PREPARATION_ONLY', originalHandlerDelegated: true, sourceWriteCalls: 0, sourceEndCalls: 0, sourceBytes: 0, transportWriteCalls: 0, transportEndCalls: 0, transportBodyEndCalls: 0, submittedBytes: 0, responseHeaders: null, coalescedBytes: 0, firstError: null };
    cell(record.sequence);
    const chunks = [], sourceHash = createHash('sha256');
    let accepted = false, finalized = false, inEnd = false;
    let sourceStream;
    // Only this response's original file stream is owned here. Async routing can
    // pipe it after the client has already closed; stop that late stream too.
    response.once('pipe', stream => {
      sourceStream = stream;
      if (finalized || response.destroyed) stream.destroy();
    });
    const writeHead = response.writeHead, write = response.write, end = response.end;
    response.writeHead = function (status, ...args) {
      if (finalized || this.destroyed) return this;
      const headers = args.find(value => value && typeof value === 'object');
      record.responseHeaders = headers ? structuredClone(headers) : null;
      accepted = status === 200;
      if (accepted && (headers?.['Content-Type'] !== 'audio/wav' || Number(headers?.['Content-Length']) !== FIXTURE.bytes)) {
        record.firstError = 'FIXTURE_RESPONSE_HEADERS_CHANGED'; response.destroy(); return this;
      }
      return writeHead.call(this, status, ...args);
    };
    const collect = (chunk, encoding) => {
      const bytes = chunkBytes(chunk, encoding);
      record.sourceBytes += bytes.length; sourceHash.update(bytes);
      if (record.sourceBytes > FIXTURE.bytes) { record.firstError = 'FIXTURE_BUFFER_LIMIT'; response.destroy(); return false; }
      if (record.mode === 'B' && bytes.length) chunks.push(Buffer.from(bytes));
      return true;
    };
    response.write = function (...args) {
      if (finalized || this.destroyed) return false;
      if (inEnd) return write.apply(this, args);
      record.sourceWriteCalls += 1;
      if (accepted && !collect(args[0], args[1])) return false;
      if (accepted && record.mode === 'B') {
        const callback = args.find(value => typeof value === 'function'); if (callback) queueMicrotask(callback);
        return true; // Fixed-size buffered control; never writes to the socket here.
      }
      record.transportWriteCalls += 1; record.submittedBytes += chunkBytes(args[0], args[1]).length;
      return write.apply(this, args);
    };
    response.end = function (...args) {
      if (finalized || this.destroyed) return this;
      record.sourceEndCalls += 1;
      if (accepted && !collect(args[0], args[1])) return this;
      let forwarded = args;
      if (accepted && record.mode === 'B') {
        const bytes = Buffer.concat(chunks, record.sourceBytes);
        if (bytes.length !== FIXTURE.bytes || sha(bytes) !== FIXTURE.sha256) { record.firstError = 'COALESCED_FIXTURE_MISMATCH'; response.destroy(); return this; }
        record.coalescedBytes = bytes.length;
        const callback = args.find(value => typeof value === 'function');
        forwarded = callback ? [bytes, callback] : [bytes];
      }
      record.transportEndCalls += 1;
      const size = chunkBytes(forwarded[0], forwarded[1]).length;
      record.transportBodyEndCalls += Number(size > 0); record.submittedBytes += size;
      const previous = inEnd; inEnd = true;
      try { return end.apply(this, forwarded); } finally { inEnd = previous; }
    };
    const finish = event => {
      if (finalized) return; finalized = true; active = false;
      // A failed CLOSE stays failed. Destroy only its file stream; never change
      // a CLOSE receipt into FINISH or suppress an unrelated process exception.
      if (event === 'CLOSE' && !response.writableFinished) sourceStream?.destroy();
      record.serverEvent = event; record.status = response.statusCode;
      record.writableFinished = response.writableFinished; record.writableEnded = response.writableEnded;
      record.acceptedFixedFixture = accepted; record.sourceSha256 = sourceHash.digest('hex');
      record.observedAtMs = performance.now(); record.wallTimeMs = Date.now();
      chunks.length = 0;
      settle(record.sequence, structuredClone(record));
    };
    response.once('finish', () => finish('FINISH'));
    response.once('close', () => finish('CLOSE'));
    // A remains the exact original createReadStream.pipe route. B also uses the
    // original guard/header/file read path, coalescing only response submission.
    void Promise.resolve(original(request, response)).catch(() => { record.firstError = 'ORIGINAL_HANDLER_REJECTED'; response.destroy(); });
  });
  const listen = server.listen;
  server.listen = function (port, host, callback) {
    if (!Number.isInteger(port) || port < 0 || port > 65535 || host !== '127.0.0.1' || (callback !== undefined && typeof callback !== 'function')) throw new Error('LOOPBACK_LISTEN_REQUIRED');
    if (closed) throw new Error('SERVER_CLOSED');
    return listen.call(this, port, host, callback);
  };
  server.once('close', () => { closed = true; for (const [index, item] of cells) if (!item.done) settle(index, { error: 'SERVER_CLOSED_BEFORE_RECEIPT' }); });
  return Object.freeze({
    server,
    fixture: Object.freeze({ ...FIXTURE, receiptLimit: RECEIPT_LIMIT, receiptDeadlineMs: RECEIPT_DEADLINE_MS, bufferCapBytes: FIXTURE.bytes, sources: Object.freeze(fixed.sources.map(item => Object.freeze(item))) }),
    setMode(value) {
      if (closed) throw new Error('SERVER_CLOSED');
      if (!['A', 'B'].includes(value)) throw new Error('INVALID_TRANSPORT_MODE');
      if (active) throw new Error('TRANSPORT_REQUEST_IN_PROGRESS');
      mode = value;
    },
    async receipt(index, timeoutMs = RECEIPT_DEADLINE_MS) {
      if (!Number.isInteger(index) || index < 1 || index > RECEIPT_LIMIT || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > RECEIPT_DEADLINE_MS) throw new Error('INVALID_RECEIPT_ARGUMENT');
      if (closed && !cells.get(index)?.done) throw new Error('SERVER_CLOSED_BEFORE_RECEIPT');
      let timer;
      try {
        const record = await Promise.race([cell(index).promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('SERVER_RECEIPT_TIMEOUT')), timeoutMs); })]);
        if (record.error) throw new Error(record.error);
        return structuredClone(record);
      } finally { clearTimeout(timer); }
    },
  });
}
