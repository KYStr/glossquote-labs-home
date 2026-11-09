// Riegel predictions: the normative fixture of SPEC section 4
// (known result 10 km in 45:00 = 2700 s), the "your input" marking,
// and the fence at the marathon.

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPredictions } from '../public/js/core/riegel.mjs';

test('fixture: predictions from 10 km in 45:00', () => {
  const rows = buildPredictions({ timeSeconds: 2700, distanceKm: 10, unit: 'km' });
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((row) => row.targetKm),
    [5, 10, 21.0975, 42.195],
  );
  // Raw values as printed in SPEC section 4 (1295.01 / 2700 / 5957.29 / 12420.54).
  const printed = [1295.01, 2700, 5957.29, 12420.54];
  rows.forEach((row, index) => {
    assert.ok(
      Math.abs(row.rawSeconds - printed[index]) < 0.05,
      `target ${row.targetKm}: raw ${row.rawSeconds} vs printed ${printed[index]}`,
    );
  });
  assert.deepEqual(
    rows.map((row) => row.timeText),
    ['21:35', '45:00', '1:39:17', '3:27:01'],
  );
  assert.deepEqual(
    rows.map((row) => row.paceText),
    ['4:19', '4:30', '4:42', '4:54'],
  );
});

test('the row equal to the known distance is marked "your input"', () => {
  const rows = buildPredictions({ timeSeconds: 2700, distanceKm: 10, unit: 'km' });
  assert.deepEqual(
    rows.map((row) => row.isInput),
    [false, true, false, false],
  );
  assert.equal(rows[1].timeText, '45:00'); // the actual time, not an estimate
});

test('exact half-marathon input marks the half row instead', () => {
  const rows = buildPredictions({ timeSeconds: 6300, distanceKm: 21.0975, unit: 'km' });
  assert.deepEqual(
    rows.map((row) => row.isInput),
    [false, false, true, false],
  );
});

test('no target beyond the marathon is ever produced', () => {
  const rows = buildPredictions({ timeSeconds: 3600, distanceKm: 10, unit: 'km' });
  assert.ok(rows.every((row) => row.targetKm <= 42.195));
});

test('predicted pace is expressed per chosen unit', () => {
  const rows = buildPredictions({ timeSeconds: 2700, distanceKm: 10, unit: 'mi' });
  // 5K pace: 259.002 s/km x 1.609344 = 416.83 s -> 6:57 per mile.
  assert.equal(rows[0].paceText, '6:57');
  assert.equal(rows[0].timeText, '21:35'); // times are unit-independent
});
