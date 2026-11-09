// Calculator lifecycle (SPEC sections 3 and 7): initial state, solve-for
// switching preserving the user's numbers, unit switching from the
// unrounded store, and the stale freeze on invalid input.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createCalculator } from '../public/js/core/state.mjs';

test('initial state: 55:00 and 10 km prefilled, pace solved', () => {
  const state = createCalculator().getState();
  assert.equal(state.solveFor, 'pace');
  assert.equal(state.unit, 'km');
  assert.equal(state.texts.time, '55:00');
  assert.equal(state.texts.distance, '10');
  assert.equal(state.stale, false);
  assert.deepEqual(state.errors, {});
  assert.equal(state.view.paceText, '5:30');
  assert.equal(state.view.splits.rows.length, 10);
  assert.equal(state.view.predictions.length, 4);
});

test('solve-for switching preserves values across a full cycle', () => {
  const calc = createCalculator();
  calc.setSolveFor('time');
  let state = calc.getState();
  assert.equal(state.texts.pace, '5:30'); // seeded from the solved value
  assert.equal(state.view.timeText, '55:00');

  calc.setSolveFor('distance');
  state = calc.getState();
  assert.equal(state.texts.time, '55:00'); // the user's text is kept
  assert.equal(state.view.distanceText, '10.00');

  calc.setSolveFor('pace');
  state = calc.getState();
  assert.equal(state.view.paceText, '5:30');
  assert.equal(state.store.timeSeconds, 3300);
  assert.equal(state.store.distanceKm, 10);
});

test('switching direction keeps the numbers the user typed', () => {
  const calc = createCalculator();
  calc.setField('time', '45:00');
  assert.equal(calc.getState().view.paceText, '4:30');
  calc.setSolveFor('distance');
  const state = calc.getState();
  assert.equal(state.texts.time, '45:00');
  assert.equal(state.texts.pace, '4:30');
  assert.equal(state.view.distanceText, '10.00'); // 2700 s at 270 s/km
});

test('invalid input freezes the outputs at the last valid state', () => {
  const calc = createCalculator();
  calc.setField('time', '45:90');
  let state = calc.getState();
  assert.equal(state.errors.time.code, 'component');
  assert.equal(state.errors.time.component, '90');
  assert.equal(state.stale, true);
  assert.equal(state.view.paceText, '5:30'); // frozen, not recomputed

  calc.setField('time', '50:00');
  state = calc.getState();
  assert.deepEqual(state.errors, {});
  assert.equal(state.stale, false);
  assert.equal(state.view.paceText, '5:00');
});

test('unit switching converts from the unrounded store and round-trips', () => {
  const calc = createCalculator();
  const before = calc.getState().view;
  calc.setUnit('mi');
  let state = calc.getState();
  assert.equal(state.texts.distance, '6.2137'); // 10 km from the store
  assert.equal(state.view.paceText, '8:51');
  assert.equal(state.view.distanceText, '6.21');
  assert.equal(state.view.splits.rows.length, 7); // 6 mile markers + finish
  assert.equal(state.store.distanceKm, 10); // store untouched by the switch

  calc.setUnit('km');
  state = calc.getState();
  assert.equal(state.view.paceText, before.paceText);
  assert.equal(state.view.distanceText, before.distanceText);
  assert.equal(state.view.timeText, before.timeText);
  assert.equal(state.view.splits.rows.length, before.splits.rows.length);
});

test('editing the distance in miles converts with the exact factor', () => {
  const calc = createCalculator();
  calc.setUnit('mi');
  calc.setField('distance', '10');
  const state = calc.getState();
  assert.ok(Math.abs(state.store.distanceKm - 16.09344) < 1e-9);
  // Internal pace: 3300 / 16.09344 = 205.0525 s/km. The view shows pace
  // per chosen unit (SPEC section 4): 205.0525 x 1.609344 = 330 s per
  // mile -> 5:30/mile for a 55:00 10-mile run.
  assert.ok(Math.abs(state.store.paceSecondsPerKm - 205.0525) < 0.001);
  assert.equal(state.view.paceText, '5:30');
});

test('a field error names its field only', () => {
  const calc = createCalculator();
  calc.setField('distance', '300.01');
  const state = calc.getState();
  assert.equal(state.errors.distance.code, 'too-large');
  assert.equal(state.errors.time, undefined);
  assert.equal(state.stale, true);
});
