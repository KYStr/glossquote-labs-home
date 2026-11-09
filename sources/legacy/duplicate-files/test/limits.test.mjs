import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSelection, LIMITS } from '../public/js/core/limits.js';
import { analyze } from '../public/js/core/analyze.js';
import { descriptor } from './helpers.mjs';

test('D48-01/03/05: exact 200 files, 32MiB/file, 128MiB total accepted before reads', () => {
  const reads = { count: 0 };
  for (const inputs of [Array.from({ length: 200 }, (_, index) => descriptor(0, index, reads)), [descriptor(33_554_432, 0, reads)], Array.from({ length: 4 }, (_, index) => descriptor(33_554_432, index, reads))]) assert.equal(validateSelection(inputs).ok, true);
  assert.deepEqual(LIMITS, { files: 200, fileBytes: 33_554_432, totalBytes: 134_217_728, chunkBytes: 65_536 });
  assert.equal(reads.count, 0);
});

test('D48-02/04/06: count/file/total over limit fail without reads or partial output', async () => {
  const reads = { count: 0 };
  const cases = [
    [Array.from({ length: 201 }, (_, index) => descriptor(0, index, reads)), 'TOO_MANY_FILES', []],
    [[descriptor(33_554_433, 0, reads)], 'FILE_TOO_LARGE', [0]],
    [[...Array.from({ length: 4 }, (_, index) => descriptor(33_554_432, index, reads)), descriptor(1, 4, reads)], 'TOTAL_SIZE_LIMIT', [0, 1, 2, 3, 4]]
  ];
  for (const [input, code, indexes] of cases) {
    const result = await analyze(input);
    assert.equal(result.error.code, code); assert.deepEqual(result.error.fileIndexes, indexes);
    assert.deepEqual(result.files, []); assert.deepEqual(result.groups, []); assert.equal(result.summary, null);
  }
  assert.equal(reads.count, 0);
});

test('No files, malformed descriptors, unsafe sizes and non-contiguous indexes fail closed', async () => {
  assert.equal((await analyze([])).error.code, 'NO_FILES');
  for (const input of [null, [null], [descriptor(-1)], [descriptor(NaN)], [descriptor(1.1)], [descriptor(Number.MAX_SAFE_INTEGER + 1)], [descriptor(0, 2)], [descriptor(0), descriptor(0)], [{ ...descriptor(0), name: 'wrong' }]]) {
    const result = await analyze(input); assert.equal(result.error.code, 'READ_FAILED');
    assert.deepEqual(result.files, []); assert.equal(result.summary, null);
  }
});
