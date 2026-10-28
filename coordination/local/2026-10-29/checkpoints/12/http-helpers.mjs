import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { verifyFrozenInputs } from './bindings.mjs';

export const sha = value => createHash('sha256').update(value).digest('hex');
export async function deadline(promise, ms = 3000, code = 'TEST_DEADLINE') {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(code)), ms); })]); }
  finally { clearTimeout(timer); }
}
export async function loadFactory(variant = 'candidate') {
  assert(['candidate', 'original'].includes(variant));
  assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.14.0');
  const bindings = await verifyFrozenInputs();
  const url = variant === 'original' ? new URL('../../media-acceptance-intake-2026-10-22/owner-12/transport-ab.mjs', import.meta.url) : bindings.transportUrl;
  const expected = variant === 'original' ? '55aa501801443a194d2001924f51484571a5451cdaccff8db6d1bd6cde48c0fb' : JSON.parse(await fs.readFile(new URL('./candidate-version.json', import.meta.url), 'utf8')).transportSha256;
  const bytes = await fs.readFile(url); assert.equal(sha(bytes), expected, 'Bound transport version changed');
  const module = await import(url);
  return { create: module.createTransportDiagnosticServer, sha256: expected };
}
export async function open(factory) {
  const d = await factory();
  await deadline(new Promise((resolve, reject) => {
    const error = cause => reject(cause); d.server.once('error', error);
    d.server.listen(0, '127.0.0.1', () => { d.server.off('error', error); resolve(); });
  }));
  assert.equal(d.server.address().address, '127.0.0.1'); return d;
}
export async function close(d) {
  if (d.server.listening) await deadline(new Promise((resolve, reject) => { d.server.close(error => error ? reject(error) : resolve()); d.server.closeAllConnections(); }), 3000, 'OWN_SERVER_CLOSE_TIMEOUT');
  assert.equal(d.server.listening, false); assert.equal(d.server.address(), null);
}
export function request(d, opts = {}) {
  return deadline(new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: d.server.address().port, path: opts.path ?? d.fixture.path, method: opts.method ?? 'GET', agent: false, headers: opts.headers ?? {} }, res => {
      const pieces = []; let bytes = 0;
      res.on('data', chunk => { bytes += chunk.length; if (bytes > 200000) res.destroy(new Error('RESPONSE_CAP')); else pieces.push(chunk); });
      res.once('error', reject); res.once('end', () => resolve({ status: res.statusCode, bytes, sha256: sha(Buffer.concat(pieces)), headers: { ...res.headers } }));
    });
    req.once('error', reject); req.setTimeout(3000, () => req.destroy(new Error('REQUEST_TIMEOUT'))); req.end();
  }), 4000, 'HTTP_COMPLETION_TIMEOUT');
}
export function raw(d, text) {
  return deadline(new Promise((resolve, reject) => {
    const socket = net.connect(d.server.address().port, '127.0.0.1', () => socket.write(text));
    const chunks = []; let bytes = 0;
    socket.setTimeout(3000, () => socket.destroy(new Error('RAW_TIMEOUT')));
    socket.on('data', chunk => { bytes += chunk.length; if (bytes > 400000) socket.destroy(new Error('RAW_CAP')); else chunks.push(chunk); });
    socket.once('error', reject); socket.once('end', () => resolve(Buffer.concat(chunks)));
  }), 4000, 'RAW_COMPLETION_TIMEOUT');
}
export function responseStatuses(bytes) {
  const codes = []; let offset = 0;
  while (offset < bytes.length) {
    const end = bytes.indexOf('\r\n\r\n', offset); assert(end >= 0, 'Complete response header required');
    const headers = bytes.subarray(offset, end).toString('latin1');
    const status = /^HTTP\/1\.1 (\d{3})/u.exec(headers); assert(status); codes.push(Number(status[1]));
    const length = /\r\nContent-Length: (\d+)/iu.exec(headers);
    if (!length) break;
    offset = end + 4 + Number(length[1]);
  }
  return codes;
}
export const withoutDate = headers => Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'date').sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
export function expectNormal(d, mode, response, receipt) {
  assert.equal(response.status, 200); assert.equal(response.bytes, d.fixture.bytes); assert.equal(response.sha256, d.fixture.sha256);
  assert.equal(response.headers['content-length'], String(d.fixture.bytes)); assert.equal(response.headers['content-type'], 'audio/wav'); assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(receipt.mode, mode); assert.equal(receipt.serverEvent, 'FINISH'); assert.equal(receipt.writableFinished, true); assert.equal(receipt.firstError, null);
  assert.equal(receipt.sourceSha256, d.fixture.sha256); assert.equal(receipt.sourceBytes, d.fixture.bytes); assert.equal(receipt.submittedBytes, d.fixture.bytes);
  assert(receipt.sourceWriteCalls >= 2); assert.equal(receipt.transportEndCalls, 1);
  assert.equal(receipt.transportWriteCalls, mode === 'A' ? receipt.sourceWriteCalls : 0); assert.equal(receipt.transportBodyEndCalls, mode === 'B' ? 1 : 0);
}
