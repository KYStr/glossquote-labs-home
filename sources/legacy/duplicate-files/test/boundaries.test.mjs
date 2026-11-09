import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Blob } from 'node:buffer';
import { analyze } from '../public/js/core/analyze.js';
import { describeFiles, validateSelection } from '../public/js/core/limits.js';
import { file, EMPTY, descriptor } from './helpers.mjs';

test('T30/D48-01: analyze all 200 empty files with exact counts and complete progress', async () => {
  const progress = [], input = describeFiles(Array.from({ length: 200 }, (_, index) => file(`empty-${index}`)));
  const result = await analyze(input, { onProgress: value => progress.push(value) });
  assert.deepEqual(result.summary, { selectedFileCount: 200, uniqueContentCount: 1, duplicateFileCount: 199, savedBytes: 0 });
  assert.deepEqual(result.groups[0].memberSourceIndexes, Array.from({ length: 200 }, (_, index) => index));
  assert.equal(result.groups[0].sha256, EMPTY);
  assert.deepEqual(progress.filter(value => value.stage === 'hashing').map(value => value.completedFiles), Array.from({ length: 201 }, (_, index) => index));
});

test('T30/D48-03/05: real 32MiB files at exactly 128MiB total, native SHA and byte verification', { timeout: 30000 }, async () => {
  const bytes = new Uint8Array(33_554_432);
  bytes[0] = 17; bytes[65_535] = 23; bytes[65_536] = 37; bytes[bytes.length - 1] = 251;
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  const blob = new Blob([bytes]);
  const input = describeFiles(Array.from({ length: 4 }, (_, index) => file(`boundary-${index}`, blob)));
  const result = await analyze(input);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.summary, { selectedFileCount: 4, uniqueContentCount: 1, duplicateFileCount: 3, savedBytes: 100_663_296 });
  assert.deepEqual(result.groups[0].memberSourceIndexes, [0, 1, 2, 3]);
  assert(result.files.every(item => item.sha256 === expectedHash));
});

test('T30 malformed/unknown descriptor fields and wrong-length read fail closed', async () => {
  const valid = descriptor(0);
  assert.equal(validateSelection([{ ...valid, path: 'synthetic-never-a-real-path' }]).errors[0].code, 'READ_FAILED');
  const result = await analyze([{ sourceIndex: 0, name: 'wrong-read-size', sizeBytes: 1, file: { name: 'wrong-read-size', size: 1, async arrayBuffer() { return new ArrayBuffer(0); }, slice() {} } }]);
  assert.equal(result.error.code, 'READ_FAILED'); assert.deepEqual(result.files, []); assert.equal(result.summary, null);
});
