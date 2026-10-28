import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { createStaticServer, projectRoot, publicRoot, securityHeaders, startServer, routePath, inside } from './serve.mjs';
import { verifyAssets } from './verify-assets.mjs';
import { measurementContext } from './measurement-context.mjs';

const headers = { ...securityHeaders, 'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
const faultPath = '/models/whisper-base/64da57285918e20ea79ea5c88eed7197933abaa8/config.json';
export const SERVER_EVENT = Object.freeze({ RECEIVED: 1, FINISH: 2, CLOSE: 3 });

// Explicit diagnostic mode only. Submitted bytes are not client receipts or wire bytes.
export function attachSpikeDiagnostics(request, response, { requestId, pathOrdinal, declaredBytes, onRecord } = {}) {
  if (!onRecord) return;
  if (typeof onRecord !== 'function' || ![requestId, pathOrdinal].every(value => Number.isSafeInteger(value) && value >= 0) || typeof declaredBytes !== 'function') throw new Error('SPIKE_DIAGNOSTIC_CONFIG_INVALID');
  let bodyBytesSubmitted = 0, inEnd = false;
  const emit = eventCode => {
    const record = Object.freeze({ phase: 'server-receipt', eventCode, requestId, pathOrdinal, wallTimeMs: Date.now(), monotonicMs: performance.now(), statusCode: eventCode === SERVER_EVENT.RECEIVED ? 0 : response.statusCode, declaredBodyBytes: declaredBytes(), bodyBytesSubmitted, writableFinished: Number(Boolean(response.writableFinished)), writableEnded: Number(Boolean(response.writableEnded)), requestAborted: Number(Boolean(request.aborted)) });
    try { onRecord(record); } catch { /* Diagnostics cannot change a response. */ }
  };
  const byteLength = (chunk, encoding) => typeof chunk === 'string' ? Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : 'utf8') : ArrayBuffer.isView(chunk) ? chunk.byteLength : 0;
  const write = response.write, end = response.end;
  response.write = function (...args) {
    const size = inEnd ? 0 : byteLength(args[0], args[1]); bodyBytesSubmitted += size;
    try { return write.apply(this, args); } catch (error) { bodyBytesSubmitted -= size; throw error; }
  };
  response.end = function (...args) {
    const size = byteLength(args[0], args[1]), previous = inEnd; bodyBytesSubmitted += size; inEnd = true;
    try { return end.apply(this, args); } catch (error) { bodyBytesSubmitted -= size; throw error; } finally { inEnd = previous; }
  };
  response.once('finish', () => emit(SERVER_EVENT.FINISH));
  response.once('close', () => emit(SERVER_EVENT.CLOSE));
  emit(SERVER_EVENT.RECEIVED);
}

export function createSpikeServer({ getFault = () => 'normal', onRequest = () => {}, diagnostics } = {}) {
  if (diagnostics !== undefined && (!(diagnostics.pathOrdinals instanceof Map) || typeof diagnostics.onRecord !== 'function' || [...diagnostics.pathOrdinals].some(([key, value]) => typeof key !== 'string' || !Number.isSafeInteger(value) || value < 1))) throw new Error('SPIKE_DIAGNOSTIC_CONFIG_INVALID');
  let diagnosticRequestId = 0;
  const server = createStaticServer({
    headers,
    route: pathname => {
      if (pathname.startsWith('/spike/')) return { root: path.join(projectRoot, 'test', 'spike'), relative: pathname === '/spike/' ? 'index.html' : pathname.slice('/spike/'.length) };
      if (pathname.startsWith('/fixtures/')) return { root: path.join(projectRoot, 'test', 'fixtures'), relative: pathname.slice('/fixtures/'.length) };
      if (pathname === '/model-manifest.json' || ['/js/', '/models/', '/vendor/'].some(prefix => pathname.startsWith(prefix))) return { root: publicRoot, relative: pathname.slice(1) };
      return null;
    },
  });
  const original = server.listeners('request')[0]; server.removeListener('request', original);
  server.on('request', async (request, response) => {
    let pathname; try { pathname = routePath(request.url); } catch { pathname = '[invalid]'; }
    const record = { at: new Date().toISOString(), method: request.method, pathname, queryPresent: request.url.includes('?'), bodyBytesDeclared: Number(request.headers['content-length'] || 0), transferEncodingPresent: Boolean(request.headers['transfer-encoding']) };
    if (diagnostics) attachSpikeDiagnostics(request, response, { requestId: ++diagnosticRequestId, pathOrdinal: diagnostics.pathOrdinals.get(pathname) ?? 0, declaredBytes: () => record.responseBodyBytes ?? 0, onRecord: diagnostics.onRecord });
    const writeHead = response.writeHead;
    response.writeHead = function (status, ...args) {
      const values = args.find(value => value && typeof value === 'object');
      record.responseBodyBytes = Number(values?.['Content-Length'] || 0);
      return writeHead.call(this, status, ...args);
    };
    let recorded = false;
    const finished = () => { if (recorded) return; recorded = true; onRequest({ ...record, status: response.statusCode, completed: response.writableFinished }); };
    response.once('finish', finished); response.once('close', finished);
    if (record.queryPresent || record.bodyBytesDeclared !== 0 || record.transferEncodingPresent) {
      response.writeHead(400, headers); response.end('Invalid request'); return;
    }
    let fault;
    try { fault = await getFault(); } catch { response.writeHead(503, headers); response.end('Spike control unavailable'); return; }
    record.fault = fault;
    if (pathname === faultPath && ['missing', 'corrupt', 'redirect'].includes(fault)) {
      if (fault === 'missing') { response.writeHead(404, headers); response.end('Not found'); return; }
      if (fault === 'redirect') { response.writeHead(302, { ...headers, Location: '/spike/index.html' }); response.end(); return; }
      const bytes = await readFile(path.join(publicRoot, faultPath.slice(1))); bytes[0] ^= 1;
      response.writeHead(200, { ...headers, 'Content-Type': 'application/json', 'Content-Length': bytes.length }); response.end(bytes); return;
    }
    original(request, response);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyAssets();
  const { evidence, positional } = await measurementContext();
  if (positional.length) throw new Error('SPIKE_ARGUMENT_INVALID');
  const name = `server-${new Date().toISOString().replaceAll(/[:.]/gu, '-')}`;
  const auditPath = path.join(evidence, name + '-requests.jsonl');
  const controlPath = path.join(evidence, 'server-control.json');
  if (!inside(evidence, auditPath)) throw new Error('SPIKE_EVIDENCE_PATH_INVALID');
  await writeFile(auditPath, '', { flag: 'wx' });
  let auditWrites = Promise.resolve();
  const server = createSpikeServer({
    getFault: async () => {
      try {
        const bytes = await readFile(controlPath); if (bytes.length > 128) throw new Error('SPIKE_CONTROL_INVALID');
        const control = JSON.parse(bytes.toString('utf8'));
        if (Object.keys(control).length !== 1 || !['normal', 'missing', 'corrupt', 'redirect'].includes(control.fault)) throw new Error('SPIKE_CONTROL_INVALID');
        return control.fault;
      } catch (error) { if (error.code === 'ENOENT') return 'normal'; throw error; }
    },
    onRequest: record => { auditWrites = auditWrites.then(() => appendFile(auditPath, JSON.stringify(record) + '\n')); },
  });
  const address = await startServer(server, 5192);
  await writeFile(path.join(evidence, name + '-startup.json'), JSON.stringify({ pid: process.pid, port: address.port, address: address.address, auditPath, controlPath, startedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
  console.log(`SPIKE http://127.0.0.1:${address.port}/spike/index.html; PID ${process.pid}`);
}
