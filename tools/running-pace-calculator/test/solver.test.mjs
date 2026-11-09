// The three solve directions and the view model.
// Fixtures A, B and C are the normative worked examples of SPEC section 4.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildView,
  distanceInputText,
  paceInputText,
  solveForDistance,
  solveForPace,
  solveForTime,
} from '../public/js/core/solver.mjs';

test('fixture A: 55:00 over 10 km solves pace 5:30/km', () => {
  const store = solveForPace(3300, 10);
  assert.equal(store.paceSecondsPerKm, 330);
  const view = buildView(store, 'km');
  assert.equal(view.paceText, '5:30');
  assert.equal(view.timeText, '55:00');
  assert.equal(view.distanceText, '10.00');
});

test('fixture A per mile: the same run is 8:51/mile', () => {
  const store = solveForPace(3300, 10);
  const view = buildView(store, 'mi');
  // 330 x 1.609344 = 531.08 s -> 8:51 (SPEC section 4).
  assert.equal(view.paceText, '8:51');
  assert.equal(view.distanceText, '6.21');
  assert.equal(paceInputText(store.paceSecondsPerKm, 'mi'), '8:51');
});

test('fixture B: pace 5:00/km over 21.0975 km solves time 1:45:29', () => {
  const store = solveForTime(300, 21.0975);
  assert.equal(store.timeSeconds, 6329.25);
  const view = buildView(store, 'km');
  assert.equal(view.timeText, '1:45:29');
  assert.equal(view.distanceText, '21.10');
});

test('fixture C: 3:30:00 at 6:00/km solves distance 35.00 km', () => {
  const store = solveForDistance(12600, 360);
  assert.equal(store.distanceKm, 35);
  const view = buildView(store, 'km');
  assert.equal(view.distanceText, '35.00');
  assert.equal(view.timeText, '3:30:00');
  assert.equal(view.paceText, '6:00');
});

test('computed results are displayed as computed, outside typed bounds', () => {
  // 60 s over 0.01 km: computed pace 6000 s/km = 1:40:00, far beyond the
  // typed pace cap of 59:59, and it must still be displayed (SPEC section 2).
  const store = solveForPace(60, 0.01);
  const view = buildView(store, 'km');
  assert.equal(view.paceText, '1:40:00');
});

test('distance input text re-expresses the unrounded store', () => {
  assert.equal(distanceInputText(10, 'km'), '10');
  assert.equal(distanceInputText(10, 'mi'), '6.2137');
  assert.equal(distanceInputText(21.0975, 'km'), '21.0975');
  assert.equal(distanceInputText(21.0975, 'mi'), '13.1094');
});
