import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFactory, open, close, request, raw, responseStatuses, expectNormal, withoutDate } from './http-helpers.mjs';

test('the same 22 transport boundaries on Windows Node24.14.0', async () => {
  const { create } = await loadFactory(); const records = [];
  const record = (id, details = {}) => { records.push({ id, pass: true, ...structuredClone(details) }); console.log('B20_CHECK ' + JSON.stringify(records.at(-1))); };
  let d = await open(create), referenceHeaders;
  try {
    let sequence = 0;
    for (const mode of ['A', 'B']) {
      d.setMode(mode); const host = '127.0.0.1:' + d.server.address().port;
      const variants = [
        ['duplicate-host', `Host: ${host}\r\nHost: ${host}`, 403], ['missing-host', '', 400],
        ['host-case-value', `Host: LOCALHOST:${d.server.address().port}`, 403], ['trailing-dot', `Host: 127.0.0.1.:${d.server.address().port}`, 403],
        ['get-transfer-encoding', `Host: ${host}\r\nTransfer-Encoding: chunked`, 400],
      ];
      for (const [name, headers, expected] of variants) {
        const body = name === 'get-transfer-encoding' ? '0\r\n\r\n' : '';
        const bytes = await raw(d, `GET ${d.fixture.path} HTTP/1.1\r\n${headers ? headers + '\r\n' : ''}Connection: close\r\n\r\n${body}`);
        const status = responseStatuses(bytes)[0]; assert.equal(status, expected); record(mode + '-' + name, { status, expected });
        if (name === 'get-transfer-encoding') await d.receipt(++sequence);
      }
      const wait1 = d.receipt(sequence + 1), wait2 = d.receipt(sequence + 1), response = await request(d), a = await wait1, b = await wait2; sequence += 1;
      expectNormal(d, mode, response, a);
      const headers = withoutDate(response.headers); if (!referenceHeaders) referenceHeaders = headers; else assert.deepEqual(headers, referenceHeaders);
      record(mode + '-positive-after-rejections', { client: response, receipt: a, headersEqualExceptDate: true });
      a.sourceBytes = 0; a.responseHeaders['Content-Length'] = '0'; const again = await d.receipt(sequence);
      assert.equal(b.sourceBytes, d.fixture.bytes); assert.equal(again.sourceBytes, d.fixture.bytes); assert.equal(Number(again.responseHeaders['Content-Length']), d.fixture.bytes);
      record(mode + '-receipt-clones-isolated');
    }
  } finally { await close(d); }
  d = await open(create);
  try {
    let switchRejected = false;
    d.server.once('request', () => { try { d.setMode('B'); } catch (error) { switchRejected = error.message === 'TRANSPORT_REQUEST_IN_PROGRESS'; } });
    await request(d); await d.receipt(1); assert(switchRejected); record('mode-change-during-request-rejected');
    d.server.once('request', (_req, response) => response.destroy());
    await assert.rejects(request(d)); const aborted = await d.receipt(2);
    assert.equal(aborted.serverEvent, 'CLOSE'); assert.equal(aborted.writableFinished, false); record('server-abort-recorded-not-finish', { receipt: aborted });
    d.setMode('B'); const response = await request(d), receipt = await d.receipt(3); expectNormal(d, 'B', response, receipt);
    record('server-abort-recovery', { client: response, receipt });
    const pending = d.receipt(4, 3000); const rejects = assert.rejects(pending, /SERVER_CLOSED_BEFORE_RECEIPT/u);
    await close(d); await rejects; record('close-settles-pending-receipt');
  } finally { await close(d); }
  d = await open(create);
  try {
    for (let index = 1; index <= 32; index += 1) {
      const mode = index % 2 ? 'A' : 'B'; d.setMode(mode); const response = await request(d), receipt = await d.receipt(index); expectNormal(d, mode, response, receipt); assert.equal(receipt.sequence, index);
    }
    const rejected = await request(d); assert.equal(rejected.status, 429); record('receipt-33rd-request-rejected', { status: rejected.status, previousVerifiedRequests: 32 });
    const head = await request(d, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.bytes, 0); record('head-still-original-after-cap', { client: head });
  } finally { await close(d); }
  d = await open(create);
  try {
    const host = '127.0.0.1:' + d.server.address().port;
    const bytes = await raw(d, `GET ${d.fixture.path} HTTP/1.1\r\nHost: ${host}\r\nConnection: keep-alive\r\n\r\nGET ${d.fixture.path} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`);
    const statuses = responseStatuses(bytes); assert.deepEqual(statuses, [200, 409]); record('overlap-rejected', { statuses });
    const receipt = await d.receipt(1); assert.equal(receipt.serverEvent, 'FINISH'); assert.equal(receipt.sourceBytes, d.fixture.bytes); assert.equal(receipt.sourceSha256, d.fixture.sha256); record('overlap-keeps-first-valid', { receipt });
  } finally { await close(d); }
  assert.equal(records.length, 22);
  console.log('B20_BOUNDARY_RESULT ' + JSON.stringify({ scope: 'WINDOWS_NODE_HTTP_ONLY_NO_BROWSER_OR_MODEL', node: process.version, checks: 22, passed: 22, records }));
});
