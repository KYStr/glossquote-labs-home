// Flow tests for frame-row-marking.
// The two flow fixtures are reproduced verbatim from fixtures.json;
// the rest check the runId gate the SPEC pins in userFlow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlow } from '../public/js/core/frame-row-marking.mjs';

const center = {
  spanMm: 1000,
  minGapMm: 100,
  align: 'center',
  frames: [
    { name: 'A', wMm: 200, hMm: 300, hookLeftMm: 100, hookTopMm: 40 },
    { name: 'B', wMm: 300, hMm: 200, hookLeftMm: 150, hookTopMm: 20 },
  ],
};

const top = {
  spanMm: 600,
  minGapMm: 0,
  align: 'top',
  frames: [
    { name: 'A', wMm: 200, hMm: 100, hookLeftMm: 25, hookTopMm: 10 },
    { name: 'B', wMm: 100, hMm: 200, hookLeftMm: 80, hookTopMm: 15 },
  ],
};

const centerResult = {
  feasible: true,
  deficitMm: 0,
  gapTenths: 1667,
  marks: [
    { name: 'A', leftTenths: 1667, topTenths: 0, hookXTenths: 2667, hookYTenths: 400 },
    { name: 'B', leftTenths: 5333, topTenths: 500, hookXTenths: 6833, hookYTenths: 700 },
  ],
};

const topResult = {
  feasible: true,
  deficitMm: 0,
  gapTenths: 1000,
  marks: [
    { name: 'A', leftTenths: 1000, topTenths: 0, hookXTenths: 1250, hookYTenths: 100 },
    { name: 'B', leftTenths: 4000, topTenths: 0, hookXTenths: 4800, hookYTenths: 150 },
  ],
};

test('fixture frame-row-marking.dirty-after-edit (verbatim)', () => {
  const flow = createFlow();
  flow.edit(center);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.deepStrictEqual(flow.snapshot().result, centerResult);
  flow.edit(top);
  assert.deepStrictEqual(
    { phase: flow.snapshot().phase, result: flow.snapshot().result },
    { phase: 'dirty', result: null },
  );
});

test('fixture frame-row-marking.cancel-then-late (verbatim)', () => {
  const flow = createFlow();
  flow.edit(center);
  flow.run(1);
  flow.cancel();
  flow.edit(top);
  flow.run(2);
  flow.settle(2);
  flow.settle(1); // stale reply arrives after the newer one
  assert.deepStrictEqual(
    { phase: flow.snapshot().phase, result: flow.snapshot().result },
    { phase: 'ready', result: topResult },
  );
});

test('a second run while busy is ignored; only the first runId settles', () => {
  const flow = createFlow();
  flow.edit(center);
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, 'busy');
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.deepStrictEqual(flow.snapshot().result, centerResult);
});

test('settle with an unknown runId before any run is a no-op', () => {
  const flow = createFlow();
  flow.edit(center);
  flow.settle(99);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().result, null);
});

test('cancel outside busy is a no-op; reset returns to empty', () => {
  const flow = createFlow();
  flow.cancel();
  assert.equal(flow.snapshot().phase, 'empty');
  flow.edit(center);
  flow.run(1);
  flow.settle(1);
  flow.cancel();
  assert.equal(flow.snapshot().phase, 'ready');
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: 'empty', result: null, error: null });
});

test('a core error settles to error with the fixed code and path, no result', () => {
  const flow = createFlow();
  const bad = structuredClone(center);
  bad.frames[0].hookLeftMm = 201;
  flow.edit(bad);
  flow.run(1);
  flow.settle(1);
  const snap = flow.snapshot();
  assert.equal(snap.phase, 'error');
  assert.equal(snap.result, null);
  assert.deepStrictEqual(snap.error, { code: 'OFFSET', path: '/frames/0/hookLeftMm' });
  flow.edit(center);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().error, null);
});

test('an infeasible but valid draft settles to ready with the deficit', () => {
  const flow = createFlow();
  const short = structuredClone(top);
  short.spanMm = 359;
  short.minGapMm = 20;
  flow.edit(short);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.deepStrictEqual(flow.snapshot().result, {
    feasible: false,
    deficitMm: 1,
    gapTenths: null,
    marks: [],
  });
});
