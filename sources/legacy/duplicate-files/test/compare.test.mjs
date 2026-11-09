import test from 'node:test';
import assert from 'node:assert/strict';
import { compareFilesBytewise } from '../public/js/core/compare.js';
import { file } from './helpers.mjs';

for (const offset of [0, 65535, 65536, 131074]) {
  test(`Byte difference at offset ${offset}; reads <=64KiB and stops at first mismatch`, async () => {
    const bytes = new Uint8Array(131075); const changed = bytes.slice(); changed[offset] = 1;
    const a = file('a', bytes), b = file('b', changed), slices = [];
    const wrap = source => ({ size: source.size, slice(start, end) { slices.push([start, end]); return source.slice(start, end); } });
    assert.equal(await compareFilesBytewise(wrap(a), wrap(b)), false);
    assert.equal(slices.length, 2 * (Math.floor(offset / 65536) + 1));
    assert(slices.every(([start, end]) => end - start <= 65536));
  });
}

test('Chunk comparator: full equal, empty, distinct lengths, read error and truncated slice', async () => {
  const bytes = new Uint8Array(131075).fill(23);
  assert.equal(await compareFilesBytewise(file('a', bytes), file('b', bytes)), true);
  assert.equal(await compareFilesBytewise(file('empty-a'), file('empty-b')), true);
  assert.equal(await compareFilesBytewise(file('a', 'x'), file('b', 'xx')), false);
  await assert.rejects(compareFilesBytewise({ size: 1, slice() { throw new Error('fake'); } }, file('a', 'x')));
  await assert.rejects(compareFilesBytewise({ size: 1, slice() { return { arrayBuffer: async () => new ArrayBuffer(0) }; } }, file('a', 'x')));
  await assert.rejects(compareFilesBytewise(file('a'), file('b'), 65537));
});
