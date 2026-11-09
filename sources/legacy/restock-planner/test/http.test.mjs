import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../scripts/build.mjs';
import { startPreview, assertHttpOracle, request } from '../scripts/lib/http-harness.mjs';
import { fixture, cleanupFixture } from '../scripts/test-support/fixture.mjs';

test('actual loopback child: routes, bytes, HEAD, security, precedence and port conflict preserves existing server', async () => {
  const root=await fixture();let preview;
  try {
    await build(root);preview=await startPreview(root);
    const result=await assertHttpOracle(root);assert.equal(result.routes,10);assert.equal(result.requests,94);
    await assert.rejects(()=>startPreview(root),/exited/);
    assert.equal((await request()).status,200);
  } finally { if(preview)await preview.stop();await cleanupFixture(root); }
});
