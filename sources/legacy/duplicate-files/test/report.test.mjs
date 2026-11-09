import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../public/js/core/analyze.js';
import { describeFiles } from '../public/js/core/limits.js';
import { chooseKeeper, serializeJSON, serializeTXT, visibleName } from '../public/js/core/report.js';
import { fixture, file, ABC } from './helpers.mjs';

test('D48-13/14: keeper changes confined to duplicate group and leave other results immutable', async () => {
  const source = await analyze(describeFiles(Array.from({ length: 9 }, (_, index) => file(String(index), index === 5 ? '2' : String(index)))));
  const group = source.groups.find(item => item.memberSourceIndexes.length > 1);
  assert.deepEqual(group.memberSourceIndexes, [2, 5]);
  const next = chooseKeeper(source, group.groupId, 5);
  assert.equal(next.files[2].status, 'duplicate'); assert.equal(next.files[2].keeperSourceIndex, 5); assert.equal(next.files[5].status, 'keep');
  assert.equal(source.files[2].status, 'keep'); assert.deepEqual(next.summary, source.summary);
  assert.deepEqual(next.groups.map(item => item.memberSourceIndexes), source.groups.map(item => item.memberSourceIndexes));
  assert.deepEqual(next.files.map(item => item.sha256), source.files.map(item => item.sha256));
  assert.equal(chooseKeeper(source, source.groups.find(item => item.memberSourceIndexes[0] === 8).groupId, 2), source);
  assert.equal(chooseKeeper(source, group.groupId, 8), source);
  const json = JSON.parse(serializeJSON(next)); assert.equal(json.files[2].keeperSourceIndex, 5);
  assert.match(serializeTXT(next), /DUPLICATE\t2\t"2"\t1\t[0-9a-f]{64}\t5\n/);
});

test('D48-15: exact JSON keys/order and summary, with no File, content, path or time fields', async () => {
  const report = JSON.parse(serializeJSON(await analyze(fixture())));
  assert.deepEqual(Object.keys(report), ['schemaVersion', 'kind', 'algorithm', 'files', 'groups', 'summary']);
  assert.equal(report.kind, 'glossquote-duplicate-report'); assert.equal(report.schemaVersion, 1);
  assert.equal(report.algorithm, 'size-sha256-byte-verify-v1');
  assert.deepEqual(report.summary, { selectedFileCount: 5, uniqueContentCount: 3, duplicateFileCount: 2, savedBytes: 3 });
  assert.deepEqual(Object.keys(report.files[0]), ['sourceIndex', 'name', 'sizeBytes', 'sha256', 'status', 'keeperSourceIndex']);
  assert.deepEqual(Object.keys(report.groups[0]), ['groupId', 'sizeBytes', 'sha256', 'keeperSourceIndex', 'memberSourceIndexes', 'duplicateSourceIndexes', 'savedBytes']);
  assert.deepEqual(report.groups.map(item => item.memberSourceIndexes), [[0, 1], [2], [3, 4]]);
  assert.deepEqual(report.files.map(item => item.sourceIndex), [0, 1, 2, 3, 4]);
});

test('D48-16/17 core escaping only; JSON roundtrip and TXT exactly six fields', async () => {
  const names = ['<img src=x onerror=alert(1)>', 'tab\tline\n"quote"\\\u202e', '\u0000\u007f\u0085\u061c\u200e\u2066'];
  const result = await analyze(describeFiles(names.map(name => file(name, 'abc'))));
  assert.deepEqual(JSON.parse(serializeJSON(result)).files.map(item => item.name), names);
  const rows = serializeTXT(result).trimEnd().split('\n').slice(7);
  assert.equal(rows.length, 3);
  rows.forEach((row, index) => { const cells = row.split('\t'); assert.equal(cells.length, 6); assert.equal(JSON.parse(cells[2]), names[index]); });
  assert.equal(visibleName(names[1]), 'tab\\u0009line\\u000a"quote"\\\\u202e');
  assert.equal(visibleName(names[2]), '\\u0000\\u007f\\u0085\\u061c\\u200e\\u2066');
});

test('D48-23: exact UTF-8 TXT artifact content', async () => {
  const result = await analyze(describeFiles([file('a', 'abc'), file('b', 'abc')]));
  assert.equal(serializeTXT(result), 'Duplicate file report\nFiles: 2\nUnique contents: 1\nDuplicate files: 1\nPotential space saved: 3 bytes\n\nSTATUS\tSOURCE_INDEX\tNAME_JSON\tSIZE_BYTES\tSHA256\tKEEPER_SOURCE_INDEX\nKEEP\t0\t"a"\t3\t' + ABC + '\t0\nDUPLICATE\t1\t"b"\t3\t' + ABC + '\t0\n');
  assert.throws(() => serializeTXT({ status: 'error' }), /REPORT_NOT_READY/);
});
