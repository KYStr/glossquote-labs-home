// Worker protocol tests for Card Sleeve Stock Fit.
// The worker module talks to `globalThis` (onmessage/postMessage), which
// Node leaves undefined, so the test stubs those two globals before import.
// MessageChannel is a Node global, so the batch scheduling path is real.
// Note: no valid input produces more than 4096 candidate steps (the largest
// measured case, 8x500 cards against 8x1000 sleeves, takes 576 steps), so
// real runs finish inside the first batch; the inter-batch cancel path is
// covered structurally by the flow machine (cancel-then-late fixture) and
// by the runId guard, and is documented as such in VERIFICATION.md.
import test from 'node:test';
import assert from 'node:assert/strict';

const REASSIGN = {
  minGap: 0,
  maxGap: 20,
  cards: [
    { name: 'A', w: 630, h: 880, qty: 1 },
    { name: 'B', w: 620, h: 880, qty: 1 },
  ],
  sleeves: [
    { name: 'S1', w: 630, h: 880, stock: 1 },
    { name: 'S2', w: 650, h: 880, stock: 1 },
  ],
};

let posted;
let workerLoaded = false;

async function loadWorkerOnce() {
  if (workerLoaded) return;
  posted = [];
  globalThis.postMessage = (msg) => { posted.push(msg); };
  await import('../public/js/worker.mjs');
  workerLoaded = true;
}

function waitFor(predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error('timed out waiting for worker message'));
      setTimeout(check, 5);
    };
    check();
  });
}

test('worker: run posts a result carrying the runId and the solve reply', async () => {
  await loadWorkerOnce();
  posted.length = 0;
  globalThis.onmessage({ data: { type: 'run', runId: 7, input: REASSIGN } });
  await waitFor(() => posted.some((m) => m.type === 'result' && m.runId === 7));
  const result = posted.find((m) => m.type === 'result' && m.runId === 7);
  assert.equal(result.reply.status, 'ok');
  assert.equal(result.reply.result.covered, 2);
  assert.deepStrictEqual(result.reply.result.cardRows[0].use, [{ sleeve: 'S2', qty: 1 }]);
});

test('worker: run with invalid input posts an error reply, never throws', async () => {
  await loadWorkerOnce();
  posted.length = 0;
  globalThis.onmessage({
    data: {
      type: 'run',
      runId: 8,
      input: { minGap: 25, maxGap: 10, cards: REASSIGN.cards, sleeves: REASSIGN.sleeves },
    },
  });
  await waitFor(() => posted.some((m) => m.type === 'result' && m.runId === 8));
  const result = posted.find((m) => m.type === 'result' && m.runId === 8);
  assert.deepStrictEqual(result.reply, {
    status: 'error',
    error: { code: 'ORDER', path: '/maxGap' },
  });
});

test('worker: cancel for a finished or unknown runId posts nothing and does not crash', async () => {
  await loadWorkerOnce();
  posted.length = 0;
  globalThis.onmessage({ data: { type: 'cancel', runId: 999 } });
  globalThis.onmessage({ data: { type: 'run', runId: 9, input: REASSIGN } });
  await waitFor(() => posted.some((m) => m.type === 'result' && m.runId === 9));
  globalThis.onmessage({ data: { type: 'cancel', runId: 9 } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(
    posted.filter((m) => m.runId === 9).map((m) => m.type),
    ['result'],
  );
});

test('worker: a second run supersedes the first; each result keeps its runId', async () => {
  await loadWorkerOnce();
  posted.length = 0;
  globalThis.onmessage({ data: { type: 'run', runId: 11, input: REASSIGN } });
  globalThis.onmessage({ data: { type: 'run', runId: 12, input: REASSIGN } });
  await waitFor(() => posted.some((m) => m.type === 'result' && m.runId === 12));
  const runIds = posted.filter((m) => m.type === 'result').map((m) => m.runId);
  assert.deepStrictEqual(runIds, [11, 12]);
});

test('worker: unknown message types are ignored', async () => {
  await loadWorkerOnce();
  posted.length = 0;
  globalThis.onmessage({ data: { type: 'ping' } });
  globalThis.onmessage({ data: null });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(posted.length, 0);
});
