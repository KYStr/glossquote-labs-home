// Worker integration test: runs the exact bytes scripts/build.mjs embeds
// (pure core + worker-entry) inside a worker thread with a DOM-Worker-shaped
// `self` shim, and checks the message protocol end to end.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Worker } from 'node:worker_threads';

const root = new URL('..', import.meta.url);

const SHIM = `import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
globalThis.self = {
  _fn: null,
  set onmessage(fn) { this._fn = fn; },
  get onmessage() { return this._fn; },
  postMessage(message) { parentPort.postMessage(message); },
};
await import(pathToFileURL(workerData.combinedPath).href);
parentPort.on('message', (data) => {
  const fn = globalThis.self.onmessage;
  if (typeof fn === 'function') fn({ data });
});
`;

async function nextMessage(worker) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker timed out')), 10000);
    worker.once('message', (message) => {
      clearTimeout(timer);
      resolve(message);
    });
    worker.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

test('embedded worker answers run() outcomes with the generation attached', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bri-worker-'));
  try {
    const core = await readFile(new URL('public/js/core/inspector.mjs', root), 'utf8');
    const entry = await readFile(new URL('src/worker-entry.mjs', root), 'utf8');
    const combinedPath = path.join(dir, 'combined.mjs');
    const shimPath = path.join(dir, 'shim.mjs');
    await writeFile(combinedPath, core + '\n' + entry, 'utf8');
    await writeFile(shimPath, SHIM, 'utf8');

    const worker = new Worker(shimPath, { workerData: { combinedPath } });
    try {
      worker.postMessage({
        snapshot: { hex: 'FF 80 00 01', layout: 'a\t0\tu16be\nb\t0\tu16le\nc\t1\ti8' },
        generation: 7,
      });
      assert.deepEqual(await nextMessage(worker), {
        generation: 7,
        ok: true,
        result: {
          byteCount: 4,
          fields: [
            { label: 'a', offset: 0, type: 'u16be', hex: 'ff80', value: '65408' },
            { label: 'b', offset: 0, type: 'u16le', hex: 'ff80', value: '33023' },
            { label: 'c', offset: 1, type: 'i8', hex: '80', value: '-128' },
          ],
        },
      });

      worker.postMessage({
        snapshot: { hex: 'A B', layout: 'a\t0\tu8' },
        generation: 8,
      });
      assert.deepEqual(await nextMessage(worker), {
        generation: 8,
        ok: false,
        error: { code: 'HEX_FORMAT', field: 'hex', row: null },
      });
    } finally {
      await worker.terminate();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
