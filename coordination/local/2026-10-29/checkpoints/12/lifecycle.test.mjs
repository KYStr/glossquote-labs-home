import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFactory, open, close, request, deadline, sha, expectNormal } from './http-helpers.mjs';

for (const mode of ['A', 'B']) {
  test(mode + ': duplicate CLOSE and late accepted writes cannot reuse finalized hash', async () => {
    const { create } = await loadFactory(), d = await open(create); d.setMode(mode);
    let responseRef, pipeSeen, sourceClosed;
    const piped = new Promise(resolve => { pipeSeen = resolve; }), ended = new Promise(resolve => { sourceClosed = resolve; });
    d.server.once('request', (_req, response) => {
      responseRef = response;
      response.once('pipe', stream => { pipeSeen(stream); stream.once('close', () => sourceClosed(stream)); });
      // Synthetic lifecycle counterexample, using this owned real response.
      // Make accepted=true before CLOSE; destroyed=false exercises finalized
      // independently, so the subsequent calls would update an ended hash.
      response.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': d.fixture.bytes });
      assert.equal(response.destroyed, false);
      response.emit('close'); response.emit('close');
      assert.doesNotThrow(() => {
        assert.equal(response.write(Buffer.from([1, 2, 3])), false);
        assert.equal(response.end(Buffer.from([4, 5, 6])), response);
        assert.equal(response.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': d.fixture.bytes }), response);
      });
      response.destroy();
    });
    try {
      await assert.rejects(request(d));
      const first = await d.receipt(1); assert.equal(first.serverEvent, 'CLOSE'); assert.equal(first.writableFinished, false); assert.equal(first.sourceBytes, 0); assert.equal(first.sourceSha256, sha(Buffer.alloc(0)));
      const stream = await deadline(piped); await deadline(ended); assert.equal(stream.destroyed, true);
      responseRef.emit('close');
      assert.deepEqual(await d.receipt(1), first);
      const response = await request(d), receipt = await d.receipt(2); expectNormal(d, mode, response, receipt);
      console.log('B20_LIFECYCLE ' + JSON.stringify({ mode, case: 'synthetic-duplicate-close-and-late-writes', pass: true, terminal: first.serverEvent, sourceSha256: first.sourceSha256, sourceDestroyed: stream.destroyed, recoverySha256: response.sha256 }));
    } finally { await close(d); }
  });
  test(mode + ': FINISH then duplicate close/end keeps the one immutable successful receipt', async () => {
    const { create } = await loadFactory(), d = await open(create); d.setMode(mode); let responseRef;
    d.server.once('request', (_req, response) => { responseRef = response; });
    try {
      const response = await request(d), first = await d.receipt(1); expectNormal(d, mode, response, first);
      assert.doesNotThrow(() => { responseRef.emit('close'); responseRef.emit('close'); responseRef.write(Buffer.from([1])); responseRef.end(Buffer.from([2])); });
      assert.deepEqual(await d.receipt(1), first); assert.equal(first.sourceEndCalls, 1); assert.equal(first.transportEndCalls, 1);
      console.log('B20_LIFECYCLE ' + JSON.stringify({ mode, case: 'finish-then-duplicate-terminals', pass: true, terminal: first.serverEvent, sha256: first.sourceSha256 }));
    } finally { await close(d); }
  });
}
