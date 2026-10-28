import test from 'node:test';
import assert from 'node:assert/strict';
import { fitContain, normalizeColumns, sheetLayout, cellOrigin, shortenLabel, labelLines, validateSheetSize } from '../public/js/core/layout.mjs';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} ≠ ${b}`);
test('A10: explicit column rules and hard rejection', () => {
  assert.equal(normalizeColumns(3), 3); assert.equal(normalizeColumns(30), 4); assert.equal(normalizeColumns(2, 6), 2);
  for (const value of [0, 7, 1.5, NaN, '2', null]) assert.throws(() => normalizeColumns(3, value));
});
test('A11: 300×200 in 100×100 is centered, with independent fractional oracle', () => {
  const fit = fitContain(300, 200, 100, 100);
  near(fit.width, 100); near(fit.height, 200 / 3); near(fit.dx, 0); near(fit.dy, 50 / 3);
});
test('A12: portrait 200×300 in 100×100', () => {
  const fit = fitContain(200, 300, 100, 100);
  near(fit.width, 200 / 3); near(fit.height, 100); near(fit.dx, 50 / 3); near(fit.dy, 0);
});
test('A13: 3 photos / 2 columns is exactly 544×512; fourth origin is unused', () => {
  assert.deepEqual(sheetLayout(3, 2), { columns: 2, rows: 2, width: 544, height: 512, pixels: 278528 });
  assert.deepEqual([0, 1, 2, 3].map((i) => cellOrigin(i, 2)), [{ x: 24, y: 24 }, { x: 280, y: 24 }, { x: 24, y: 264 }, { x: 280, y: 264 }]);
});
test('all allowed selections contain every cell within canvas and below output caps', () => {
  for (let n = 1; n <= 30; n++) for (let columns = 1; columns <= 6; columns++) {
    const r = sheetLayout(n, columns);
    assert.ok(r.width <= 8192 && r.height <= 8192 && r.pixels <= 16_000_000);
    assert.equal(r.rows * r.columns >= n, true);
    const last = cellOrigin(n - 1, r.columns);
    assert.ok(last.x + 240 <= r.width - 24 && last.y + 224 <= r.height - 24);
  }
  assert.doesNotThrow(() => validateSheetSize(4000, 4000));
  for (const [w, h] of [[4001, 4000], [8193, 1], [0, 1], [NaN, 1]]) assert.throws(() => validateSheetSize(w, h));
});
test('contain invariant corpus and invalid geometry', () => {
  for (const [w, h] of [[1, 8192], [8192, 1], [4000, 4000], [313, 971]]) {
    const r = fitContain(w, h);
    assert.ok(r.dx >= 0 && r.dy >= 0 && r.width <= 240 && r.height <= 180);
    near(r.width / r.height, w / h);
  }
  for (const args of [[0, 1], [-1, 1], [NaN, 2], [1, Infinity], [1, 1, 0, 100]]) assert.throws(() => fitContain(...args));
});
test('A15: 32 Unicode code points; at most two lines; controls become spaces in PNG only', () => {
  assert.equal(shortenLabel('😀'.repeat(40)), '😀'.repeat(31) + '…');
  assert.equal(shortenLabel('x'.repeat(32)), 'x'.repeat(32));
  const lines = labelLines('x'.repeat(40), (s) => s.length * 12, 204);
  assert.deepEqual(lines, ['x'.repeat(17), 'x'.repeat(14) + '…']);
  assert.deepEqual(labelLines('a\tB\nC', (s) => s.length), ['a B C']);
});
