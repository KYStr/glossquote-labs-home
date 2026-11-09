// Worker test: the exact embedded script (core source + fixed entry,
// as scripts/build.mjs assembles it) executes in a module context with
// a fake `self`, routes one snapshot, and posts back the outcome.
// This exercises the real worker code path minus the Worker thread.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKER_ENTRY } from '../scripts/worker-entry.mjs';

async function loadWorkerScript() {
  const core = await readFile(new URL('../public/js/core/pairwise.mjs', import.meta.url), 'utf8');
  const source = `${core}${WORKER_ENTRY}`;
  const dir = await mkdtemp(join(tmpdir(), 'pairwise-worker-'));
  const file = join(dir, 'worker.mjs');
  await writeFile(file, source, 'utf8');
  const posted = [];
  const fakeSelf = { postMessage: (msg) => posted.push(msg) };
  // Keep globalThis.self installed while the test drives onmessage: the
  // worker entry refers to the bare `self` global, as in a real Worker.
  globalThis.self = fakeSelf;
  await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  return { dir, fakeSelf, posted };
}

test('worker posts the binary-triple result for the current generation', async () => {
  const { dir, fakeSelf, posted } = await loadWorkerScript();
  try {
    assert.equal(typeof fakeSelf.onmessage, 'function');
    fakeSelf.onmessage({ data: { generation: 7, input: { dimensions: 'A:0|1\nB:0|1\nC:0|1' } } });
    assert.equal(posted.length, 1);
    assert.equal(posted[0].generation, 7);
    assert.deepEqual(posted[0].outcome, {
      ok: true,
      result: {
        dimensions: ['A', 'B', 'C'],
        spaceSize: 8,
        pairCount: 12,
        cases: [
          { values: ['0', '0', '0'], gain: 3 },
          { values: ['0', '1', '1'], gain: 3 },
          { values: ['1', '0', '1'], gain: 3 },
          { values: ['1', '1', '0'], gain: 3 },
        ],
      },
    });
    // An invalid snapshot posts the error outcome, not a throw.
    fakeSelf.onmessage({ data: { generation: 8, input: { dimensions: 'A:a|b|c|d|e\nB:a|b|c|d|e\nC:a|b|c|d|e\nD:a|b|c|d|e\nE:a|b|c|d|e' } } });
    assert.equal(posted.length, 2);
    assert.deepEqual(posted[1].outcome, {
      ok: false,
      error: { code: 'PRODUCT_LIMIT', field: 'dimensions', row: null },
    });
    // Messages without a generation are ignored.
    fakeSelf.onmessage({ data: { input: { dimensions: 'A:0|1\nB:0|1' } } });
    assert.equal(posted.length, 2);
  } finally {
    delete globalThis.self;
    await rm(dir, { recursive: true, force: true });
  }
});
