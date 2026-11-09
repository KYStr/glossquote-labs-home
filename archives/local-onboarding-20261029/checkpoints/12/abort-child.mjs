import http from 'node:http';
import assert from 'node:assert/strict';
import { loadFactory, open, close, request, deadline, expectNormal, withoutDate } from './http-helpers.mjs';

const [variant, mode] = process.argv.slice(2);
assert(['candidate', 'original'].includes(variant)); assert(['A', 'B'].includes(mode));
const bound = await loadFactory(variant), d = await open(bound.create); d.setMode(mode);
console.log(JSON.stringify({ event: 'owned-ready', pid: process.pid, platform: process.platform, node: process.version, variant, mode, transportSha256: bound.sha256, address: d.server.address() }));
try {
  let client, source, sourceClosed = false, seeSource, sourceClose;
  const sourceSeen = new Promise(resolve => { seeSource = resolve; });
  const sourceEnded = new Promise(resolve => { sourceClose = resolve; });
  d.server.once('request', (_request, response) => {
    response.once('pipe', stream => { source = stream; stream.once('close', () => { sourceClosed = true; sourceClose(); }); seeSource(); });
    client.destroy(new Error('OWNED_TEST_CLIENT_ABORT'));
  });
  const aborted = await deadline(new Promise(resolve => {
    client = http.request({ host: '127.0.0.1', port: d.server.address().port, path: d.fixture.path, agent: false }, res => res.resume());
    client.once('error', error => resolve(error.message)); client.end();
  }));
  assert.equal(aborted, 'OWNED_TEST_CLIENT_ABORT');
  const receipt = await d.receipt(1); console.log(JSON.stringify({ event: 'abort-receipt', variant, mode, receipt }));
  assert.equal(receipt.serverEvent, 'CLOSE'); assert.equal(receipt.writableFinished, false);
  // Original is intentionally allowed to crash in this exact owned disposable
  // child. There is no global uncaught-exception handler or error whitelist.
  if (variant === 'candidate') {
    await deadline(sourceSeen); await deadline(sourceEnded);
    assert(source.destroyed && sourceClosed);
  }
  let baselineHeaders;
  const recovery = [];
  for (const nextMode of ['A', 'B']) {
    d.setMode(nextMode);
    const response = await request(d), nextReceipt = await d.receipt(recovery.length + 2);
    expectNormal(d, nextMode, response, nextReceipt);
    const headers = withoutDate(response.headers);
    if (!baselineHeaders) baselineHeaders = headers; else assert.deepEqual(headers, baselineHeaders);
    recovery.push({ mode: nextMode, client: response, receipt: nextReceipt });
  }
  console.log(JSON.stringify({ event: 'abort-and-recovery', scope: 'WINDOWS_NODE_HTTP_ONLY', variant, mode, sourceDestroyed: source?.destroyed ?? false, sourceClosed, recovery, headersEqualExceptDate: true }));
} finally { await close(d); }
console.log(JSON.stringify({ event: 'natural-completion', variant, mode, status: 'PASS_ABORT_AND_RECOVERY', node: process.version }));
