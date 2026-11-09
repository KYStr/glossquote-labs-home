// Algorithm cases, hand-derived from the SPEC's implementation rules
// (never from the implementation's output).
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../public/js/core/solve.mjs';

function dev(name, runtime, runs) {
  return { name, runtime, runs: runs.map(([start, end]) => ({ start, end })) };
}

test('several swaps inside one segment', () => {
  const r = solve({ charged: 10, devices: [dev('C', 10, [[0, 35]])] });
  assert.deepStrictEqual(r, {
    status: 'ok',
    result: {
      required: 4, extra: 0, unused: 6, firstMissing: null,
      events: [
        { minute: 0, device: 'C', kind: 'load', pack: 1 },
        { minute: 10, device: 'C', kind: 'swap', pack: 2 },
        { minute: 20, device: 'C', kind: 'swap', pack: 3 },
        { minute: 30, device: 'C', kind: 'swap', pack: 4 },
      ],
    },
  });
});

test('pack runs out exactly at a segment boundary: swap at the next segment start', () => {
  const r = solve({ charged: 2, devices: [dev('A', 10, [[0, 10], [10, 20]])] });
  assert.deepStrictEqual(r.result.events, [
    { minute: 0, device: 'A', kind: 'load', pack: 1 },
    { minute: 10, device: 'A', kind: 'swap', pack: 2 },
  ]);
});

test('touching segments, pack exhausted exactly at the last minute: no swap', () => {
  const r = solve({ charged: 5, devices: [dev('A', 10, [[0, 5], [5, 10]])] });
  assert.deepStrictEqual(r.result.events, [
    { minute: 0, device: 'A', kind: 'load', pack: 1 },
  ]);
  assert.equal(r.result.required, 1);
});

test('full-day runtime needs one load only', () => {
  const r = solve({ charged: 1, devices: [dev('A', 1440, [[0, 1440]])] });
  assert.deepStrictEqual(r.result.events, [
    { minute: 0, device: 'A', kind: 'load', pack: 1 },
  ]);
});

test('closed gaps keep the remaining minutes', () => {
  const r = solve({ charged: 1, devices: [dev('A', 30, [[0, 10], [100, 110]])] });
  assert.deepStrictEqual(r.result.events, [
    { minute: 0, device: 'A', kind: 'load', pack: 1 },
  ]);
});

test('swap at the last working minute of the day', () => {
  const r = solve({ charged: 2, devices: [dev('A', 10, [[0, 10], [1439, 1440]])] });
  assert.deepStrictEqual(r.result.events, [
    { minute: 0, device: 'A', kind: 'load', pack: 1 },
    { minute: 1439, device: 'A', kind: 'swap', pack: 2 },
  ]);
});

test('same-minute events follow device input order, not name order', () => {
  const r = solve({
    charged: 2,
    devices: [
      dev('C', 10, [[100, 110]]),
      dev('A', 10, [[100, 110]]),
      dev('B', 10, [[100, 110]]),
    ],
  });
  assert.deepStrictEqual(r.result.events, [
    { minute: 100, device: 'C', kind: 'load', pack: 1 },
    { minute: 100, device: 'A', kind: 'load', pack: 2 },
    { minute: 100, device: 'B', kind: 'load', pack: null },
  ]);
  assert.equal(r.result.firstMissing, 3);
  assert.equal(r.result.extra, 1);
  assert.equal(r.result.unused, 0);
});

test('unused stock counts when charged exceeds required', () => {
  const r = solve({ charged: 5, devices: [dev('A', 10, [[0, 10]])] });
  assert.equal(r.result.required, 1);
  assert.equal(r.result.extra, 0);
  assert.equal(r.result.unused, 4);
  assert.equal(r.result.firstMissing, null);
});

test('conservation sweep: counts, ordering and pack assignment hold', () => {
  // Deterministic LCG, 200 random small inputs.
  let seed = 20261109;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  for (let t = 0; t < 200; t += 1) {
    const nDev = 1 + (next() % 4);
    const devices = [];
    for (let i = 0; i < nDev; i += 1) {
      const nRuns = 1 + (next() % 3);
      const runs = [];
      let cursor = next() % 100;
      for (let j = 0; j < nRuns; j += 1) {
        const len = 1 + (next() % 60);
        runs.push({ start: cursor, end: Math.min(1440, cursor + len) });
        cursor = Math.min(1439, cursor + len + 1 + (next() % 50));
        if (cursor >= 1440) break;
      }
      devices.push({ name: `D${i}`, runtime: 10 + (next() % 60), runs });
    }
    const charged = next() % 12;
    const r = solve({ charged, devices });
    assert.equal(r.status, 'ok');
    const { required, extra, unused, firstMissing, events } = r.result;
    assert.equal(required, events.length);
    assert.equal(extra, Math.max(0, required - charged));
    assert.equal(unused, Math.max(0, charged - required));
    const firstNull = events.findIndex((e) => e.pack === null);
    assert.equal(firstMissing, firstNull === -1 ? null : firstNull + 1);
    events.forEach((e, i) => {
      assert.equal(e.pack, i + 1 <= charged ? i + 1 : null);
      if (i > 0) {
        const p = events[i - 1];
        assert.ok(
          e.minute > p.minute
            || (e.minute === p.minute && devices.findIndex((d) => d.name === e.device) >= devices.findIndex((d) => d.name === p.device)),
        );
      }
    });
  }
});

test('worst case: 8 devices x 144 swaps = 1152 events', () => {
  const devices = Array.from({ length: 8 }, (_, i) => dev(`D${i}`, 10, [[0, 1440]]));
  const r = solve({ charged: 0, devices });
  assert.equal(r.status, 'ok');
  assert.equal(r.result.required, 1152);
  assert.equal(r.result.extra, 1152);
  assert.equal(r.result.unused, 0);
  assert.equal(r.result.firstMissing, 1);
  assert.equal(r.result.events.filter((e) => e.kind === 'load').length, 8);
  assert.equal(r.result.events.filter((e) => e.kind === 'swap').length, 1144);
});
