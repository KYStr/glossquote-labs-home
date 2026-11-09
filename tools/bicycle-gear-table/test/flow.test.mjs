// Flow tests for bicycle-gear-table.
// The two flow fixtures are reproduced verbatim from fixtures.json;
// the rest check the runId gate the SPEC pins in userFlow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlow } from '../public/js/core/bicycle-gear-table.mjs';

const groupRatios = {
  wheelMm: 2100,
  cadence: 80,
  front: [40, 20],
  rear: [10, 20],
};

const twoCogs = {
  wheelMm: 2000,
  cadence: 60,
  front: [30],
  rear: [20, 30],
};

const groupRatiosResult = {
  groups: [
    { ratio: [1, 1], combos: [[20, 20]], rollTenthsMm: 21000, speedTenthsKmh: 101 },
    { ratio: [2, 1], combos: [[40, 20], [20, 10]], rollTenthsMm: 42000, speedTenthsKmh: 202 },
    { ratio: [4, 1], combos: [[40, 10]], rollTenthsMm: 84000, speedTenthsKmh: 403 },
  ],
};

const twoCogsResult = {
  groups: [
    { ratio: [1, 1], combos: [[30, 30]], rollTenthsMm: 20000, speedTenthsKmh: 72 },
    { ratio: [3, 2], combos: [[30, 20]], rollTenthsMm: 30000, speedTenthsKmh: 108 },
  ],
};

test('fixture bicycle-gear-table.dirty-after-edit (verbatim)', () => {
  const flow = createFlow();
  flow.edit(groupRatios);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.deepStrictEqual(flow.snapshot().result, groupRatiosResult);
  flow.edit(twoCogs);
  assert.deepStrictEqual(
    { phase: flow.snapshot().phase, result: flow.snapshot().result },
    { phase: 'dirty', result: null },
  );
});

test('fixture bicycle-gear-table.cancel-then-late (verbatim)', () => {
  const flow = createFlow();
  flow.edit(groupRatios);
  flow.run(1);
  flow.cancel();
  flow.edit(twoCogs);
  flow.run(2);
  flow.settle(2);
  flow.settle(1); // stale reply arrives after the newer one
  assert.deepStrictEqual(
    { phase: flow.snapshot().phase, result: flow.snapshot().result },
    { phase: 'ready', result: twoCogsResult },
  );
});

test('a second run while busy is ignored; only the first runId settles', () => {
  const flow = createFlow();
  flow.edit(groupRatios);
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, 'busy');
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.deepStrictEqual(flow.snapshot().result, groupRatiosResult);
});

test('settle with an unknown runId before any run is a no-op', () => {
  const flow = createFlow();
  flow.edit(groupRatios);
  flow.settle(99);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().result, null);
});

test('cancel outside busy is a no-op; reset returns to empty', () => {
  const flow = createFlow();
  flow.cancel();
  assert.equal(flow.snapshot().phase, 'empty');
  flow.edit(groupRatios);
  flow.run(1);
  flow.settle(1);
  flow.cancel();
  assert.equal(flow.snapshot().phase, 'ready');
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: 'empty', result: null, error: null });
});

test('a core error settles to error with the fixed code and path, no result', () => {
  const flow = createFlow();
  const bad = structuredClone(groupRatios);
  bad.front = [40, 40];
  flow.edit(bad);
  flow.run(1);
  flow.settle(1);
  const snap = flow.snapshot();
  assert.equal(snap.phase, 'error');
  assert.equal(snap.result, null);
  assert.deepStrictEqual(snap.error, { code: 'DUPLICATE', path: '/front/1' });
  flow.edit(groupRatios);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().error, null);
});

test('an old error reply cannot overwrite a newer ready result', () => {
  const flow = createFlow();
  const bad = structuredClone(groupRatios);
  bad.rear = [10, 10];
  flow.edit(bad);
  flow.run(1);
  flow.cancel();
  flow.edit(twoCogs);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, 'ready');
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.deepStrictEqual(flow.snapshot().result, twoCogsResult);
});
