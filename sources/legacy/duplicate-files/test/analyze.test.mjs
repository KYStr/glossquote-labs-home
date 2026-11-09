import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describeFiles } from '../public/js/core/limits.js';
import { analyze, sha256Hex } from '../public/js/core/analyze.js';
import { fixture, file, ABC, EMPTY } from './helpers.mjs';

test('D48-07/12: independent abc/abd/empty oracle, exact stable grouping and summary', async () => {
  const result = await analyze(fixture());
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.groups.map(group => group.memberSourceIndexes), [[0, 1], [2], [3, 4]]);
  assert.deepEqual(result.groups.map(group => group.groupId), ['group-001', 'group-002', 'group-003']);
  assert.deepEqual(result.groups.map(group => group.keeperSourceIndex), [0, 2, 3]);
  assert.deepEqual(result.summary, { selectedFileCount: 5, uniqueContentCount: 3, duplicateFileCount: 2, savedBytes: 3 });
  assert.equal(result.groups.filter(group => group.memberSourceIndexes.length > 1).length, 2);
  assert.equal(result.files[0].sha256, ABC); assert.equal(result.files[3].sha256, EMPTY);
  assert.deepEqual(result.files.map(item => item.status), ['keep', 'duplicate', 'keep', 'keep', 'duplicate']);
  for (const [index, content] of ['abc', 'abc', 'abd', '', ''].entries()) assert.equal(result.files[index].sha256, createHash('sha256').update(content).digest('hex'));
});

test('D48-08/09/10: matching content across names, same-name differences, empty duplicates', async () => {
  const sameName = await analyze(describeFiles([file('same', 'abc'), file('same', 'abd')]));
  assert.deepEqual(sameName.groups.map(group => group.memberSourceIndexes), [[0], [1]]);
  assert.equal(sameName.summary.duplicateFileCount, 0);
  const diffName = await analyze(describeFiles([file('one', 'abc'), file('two', 'abc')]));
  assert.deepEqual(diffName.groups[0].memberSourceIndexes, [0, 1]); assert.equal(diffName.groups[0].keeperSourceIndex, 0);
  const empty = await analyze(describeFiles([file('zero'), file('nothing')]));
  assert.equal(empty.summary.savedBytes, 0); assert.equal(empty.summary.duplicateFileCount, 1); assert.equal(empty.files[0].sha256, EMPTY);
});

test('D48-11: forced same digest splits byte groups and size buckets', async () => {
  const result = await analyze(describeFiles([file('a', 'abc'), file('b', 'abd'), file('c', 'abc'), file('d', 'ab'), file('e', 'abd')]), { digestProvider: async () => new Uint8Array(32).fill(9) });
  assert.deepEqual(result.groups.map(group => group.memberSourceIndexes), [[0, 2], [1, 4], [3]]);
  assert.equal(result.summary.savedBytes, 6);
  assert.equal(new Set(result.groups.map(group => group.sha256)).size, 1);
});

test('D48-19: sequential hash reads; once-per-file completion; monotonic progress contains no names', async () => {
  let active = 0, peak = 0; const readOrder = [], progress = [];
  const descriptors = describeFiles([file('a', 'a'), file('b', 'bb'), file('c', 'ccc')]);
  for (const item of descriptors) {
    const source = item.file;
    item.file = { name: source.name, size: source.size, slice: source.slice.bind(source), async arrayBuffer() {
      readOrder.push(item.sourceIndex); active++; peak = Math.max(peak, active);
      const bytes = await source.arrayBuffer(); active--; return bytes;
    } };
  }
  await analyze(descriptors.reverse(), { onProgress: value => progress.push(value) });
  assert.deepEqual(readOrder, [0, 1, 2]); assert.equal(peak, 1);
  assert.deepEqual(progress, [
    { stage: 'hashing', completedFiles: 0, totalFiles: 3 }, { stage: 'hashing', completedFiles: 1, totalFiles: 3 },
    { stage: 'hashing', completedFiles: 2, totalFiles: 3 }, { stage: 'hashing', completedFiles: 3, totalFiles: 3 },
    { stage: 'verifying', completedFiles: 3, totalFiles: 3 }
  ]);
});

test('Read/digest/verify failures return exact redacted all-or-nothing errors', async () => {
  const good = describeFiles([file('one', 'abc'), file('two', 'abc')]);
  const failedRead = [{ ...good[0], file: { name: 'one', size: 3, slice() {}, async arrayBuffer() { throw new Error('SYNTHETIC_CANARY'); } } }];
  const read = await analyze(failedRead, { jobId: 'job-x' });
  assert.deepEqual(read, { schemaVersion: 1, jobId: 'job-x', status: 'error', error: { code: 'READ_FAILED', fileIndexes: [0], messageKey: 'errors.READ_FAILED' }, files: [], groups: [], summary: null });
  for (const provider of [async () => { throw new Error('SYNTHETIC_CANARY'); }, async () => new Uint8Array(31), async () => 'bad']) {
    const result = await analyze(good, { digestProvider: provider });
    assert.equal(result.error.code, 'DIGEST_FAILED'); assert.deepEqual(result.error.fileIndexes, [0]);
    assert.deepEqual(result.files, []); assert.equal(result.summary, null); assert(!JSON.stringify(result).includes('SYNTHETIC_CANARY'));
  }
  const source = good[1].file;
  good[1].file = { name: source.name, size: source.size, arrayBuffer: source.arrayBuffer.bind(source), slice() { throw new Error('SYNTHETIC_CANARY'); } };
  const verify = await analyze(good); assert.equal(verify.error.code, 'VERIFY_FAILED'); assert.deepEqual(verify.error.fileIndexes, [0, 1]);
  assert.deepEqual(verify.files, []); assert.deepEqual(verify.groups, []); assert.equal(verify.summary, null);
});

test('D48-22: File metadata and bytes remain unchanged', async () => {
  const input = fixture(), before = await Promise.all(input.map(async item => [item.file.name, item.file.size, await item.file.text()]));
  await analyze(input);
  assert.deepEqual(await Promise.all(input.map(async item => [item.file.name, item.file.size, await item.file.text()])), before);
  assert.equal(await sha256Hex(new TextEncoder().encode('abc').buffer), ABC);
});
