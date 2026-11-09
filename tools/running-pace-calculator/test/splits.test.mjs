// Split table: markers, step rule, finish row, and the rounding contract
// that segment times are differences of the displayed cumulatives.
// All expectations are hand-derived from SPEC section 4 and section 6.

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSplits } from '../public/js/core/splits.mjs';

function cumulatives(result) {
  return result.rows.map((row) => row.cumulativeSeconds);
}
function segments(result) {
  return result.rows.map((row) => row.segmentSeconds);
}
function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

test('fixture A splits: 10 km at 330 s/km', () => {
  const result = buildSplits({
    timeSeconds: 3300,
    distanceKm: 10,
    paceSecondsPerKm: 330,
    unit: 'km',
  });
  assert.equal(result.step, 1);
  assert.equal(result.rows.length, 10);
  assert.deepEqual(cumulatives(result), [
    330, 660, 990, 1320, 1650, 1980, 2310, 2640, 2970, 3300,
  ]);
  assert.deepEqual(
    result.rows.map((row) => row.label),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  );
  assert.ok(result.rows.every((row) => !row.isFinish));
  assert.equal(sum(segments(result)), 3300);
});

test('splits fixture extended to 10.5 km: finish row 57:45, segment 2:45', () => {
  const result = buildSplits({
    timeSeconds: 3465,
    distanceKm: 10.5,
    paceSecondsPerKm: 330,
    unit: 'km',
  });
  assert.equal(result.rows.length, 11);
  const finish = result.rows[10];
  assert.equal(finish.isFinish, true);
  assert.equal(finish.label, '10.5');
  assert.equal(finish.cumulativeSeconds, 3465); // 57:45
  assert.equal(finish.segmentSeconds, 165); // 2:45
  assert.equal(sum(segments(result)), 3465);
});

test('segments come from rounded cumulatives, not rounded exact segments', () => {
  // 905 s over 10 km: pace 90.5 s/km, whose per-km product lands on .5 s.
  // Rounded cumulatives: 91, 181, 272, ... so the second segment is 90.
  // Rounding each exact segment (90.5 -> 91) instead would print ten 91 s
  // segments summing to 910, contradicting the printed total 905.
  const result = buildSplits({
    timeSeconds: 905,
    distanceKm: 10,
    paceSecondsPerKm: 90.5,
    unit: 'km',
  });
  assert.deepEqual(cumulatives(result), [
    91, 181, 272, 362, 453, 543, 634, 724, 815, 905,
  ]);
  assert.deepEqual(segments(result), [91, 90, 91, 90, 91, 90, 91, 90, 91, 90]);
  assert.equal(sum(segments(result)), 905);
});

test('step rule boundary: whole-unit count 100 uses step 1', () => {
  const result = buildSplits({
    timeSeconds: 30000,
    distanceKm: 100,
    paceSecondsPerKm: 300,
    unit: 'km',
  });
  assert.equal(result.step, 1);
  assert.equal(result.rows.length, 100);
  assert.ok(result.rows.every((row) => !row.isFinish));
  assert.equal(result.rows[99].cumulativeSeconds, 30000);
});

test('step rule boundary: 101 units uses step 5 with a finish row', () => {
  const result = buildSplits({
    timeSeconds: 30300,
    distanceKm: 101,
    paceSecondsPerKm: 300,
    unit: 'km',
  });
  assert.equal(result.step, 5);
  assert.equal(result.rows.length, 21); // markers 5..100 plus finish
  const finish = result.rows[20];
  assert.equal(finish.isFinish, true);
  assert.equal(finish.label, '101');
  assert.equal(finish.cumulativeSeconds, 30300);
  assert.equal(sum(segments(result)), 30300);
});

test('step 5 with a non-multiple distance adds a finish row', () => {
  const result = buildSplits({
    timeSeconds: 30900,
    distanceKm: 103,
    paceSecondsPerKm: 300,
    unit: 'km',
  });
  assert.equal(result.step, 5);
  assert.equal(result.rows.length, 21);
  const finish = result.rows[20];
  assert.equal(finish.isFinish, true);
  assert.equal(finish.label, '103');
  assert.equal(finish.cumulativeSeconds, 30900);
});

test('splits are expressed in miles when the unit is miles', () => {
  // 10 miles at 330 s/km: distance 16.09344 km, time 5310.8352 s,
  // pace per mile 531.08352 s.
  const result = buildSplits({
    timeSeconds: 5310.8352,
    distanceKm: 16.09344,
    paceSecondsPerKm: 330,
    unit: 'mi',
  });
  assert.equal(result.step, 1);
  assert.equal(result.rows.length, 10);
  assert.equal(result.rows[0].cumulativeSeconds, 531); // 8:51
  assert.equal(result.rows[9].cumulativeSeconds, 5311);
  assert.ok(result.rows.every((row) => !row.isFinish));
});

test('a sub-unit distance produces only the finish row', () => {
  const result = buildSplits({
    timeSeconds: 3.3,
    distanceKm: 0.01,
    paceSecondsPerKm: 330,
    unit: 'km',
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].isFinish, true);
  assert.equal(result.rows[0].label, '0.01');
  assert.equal(result.rows[0].cumulativeSeconds, 3);
  assert.equal(result.rows[0].segmentSeconds, 3);
});
