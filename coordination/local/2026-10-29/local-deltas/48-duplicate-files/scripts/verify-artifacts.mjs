import { File } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT } from './check.mjs';
import { describeFiles } from '../public/js/core/limits.js';
import { analyze } from '../public/js/core/analyze.js';
import { chooseKeeper, serializeJSON, serializeTXT } from '../public/js/core/report.js';

const directory = resolve(ROOT, 'evidence/m1/artifacts');
await mkdir(directory, { recursive: true });
const abc = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const empty = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
// Independent node:crypto oracle for abd; abc/empty use the specification literals.
const abd = createHash('sha256').update('abd').digest('hex');
const result = await analyze(describeFiles(['abc', 'abc', 'abd', '', ''].map((content, index) => new File([content], ['a', 'b', 'c', 'd', 'e'][index]))));
const expected = {
  schemaVersion: 1, kind: 'glossquote-duplicate-report', algorithm: 'size-sha256-byte-verify-v1',
  files: [
    { sourceIndex: 0, name: 'a', sizeBytes: 3, sha256: abc, status: 'keep', keeperSourceIndex: 0 },
    { sourceIndex: 1, name: 'b', sizeBytes: 3, sha256: abc, status: 'duplicate', keeperSourceIndex: 0 },
    { sourceIndex: 2, name: 'c', sizeBytes: 3, sha256: abd, status: 'keep', keeperSourceIndex: 2 },
    { sourceIndex: 3, name: 'd', sizeBytes: 0, sha256: empty, status: 'keep', keeperSourceIndex: 3 },
    { sourceIndex: 4, name: 'e', sizeBytes: 0, sha256: empty, status: 'duplicate', keeperSourceIndex: 3 }
  ],
  groups: [
    { groupId: 'group-001', sizeBytes: 3, sha256: abc, keeperSourceIndex: 0, memberSourceIndexes: [0, 1], duplicateSourceIndexes: [1], savedBytes: 3 },
    { groupId: 'group-002', sizeBytes: 3, sha256: abd, keeperSourceIndex: 2, memberSourceIndexes: [2], duplicateSourceIndexes: [], savedBytes: 0 },
    { groupId: 'group-003', sizeBytes: 0, sha256: empty, keeperSourceIndex: 3, memberSourceIndexes: [3, 4], duplicateSourceIndexes: [4], savedBytes: 0 }
  ],
  summary: { selectedFileCount: 5, uniqueContentCount: 3, duplicateFileCount: 2, savedBytes: 3 }
};
const defaultTXT = 'Duplicate file report\nFiles: 5\nUnique contents: 3\nDuplicate files: 2\nPotential space saved: 3 bytes\n\nSTATUS\tSOURCE_INDEX\tNAME_JSON\tSIZE_BYTES\tSHA256\tKEEPER_SOURCE_INDEX\n'
  + `KEEP\t0\t"a"\t3\t${abc}\t0\nDUPLICATE\t1\t"b"\t3\t${abc}\t0\nKEEP\t2\t"c"\t3\t${abd}\t2\nKEEP\t3\t"d"\t0\t${empty}\t3\nDUPLICATE\t4\t"e"\t0\t${empty}\t3\n`;
const manifest = [];
async function artifact(name, actual, independentExpected) {
  const bytes = Buffer.from(actual, 'utf8');
  await writeFile(resolve(directory, name), bytes);
  const readback = await readFile(resolve(directory, name));
  assert(readback.equals(Buffer.from(independentExpected, 'utf8')), `Artifact bytes differ: ${name}`);
  manifest.push({ path: `artifacts/${name}`, bytes: readback.length, sha256: createHash('sha256').update(readback).digest('hex') });
}
await artifact('oracle-default.json', serializeJSON(result), JSON.stringify(expected, null, 2) + '\n');
await artifact('oracle-default.txt', serializeTXT(result), defaultTXT);
const changed = chooseKeeper(result, 'group-001', 1);
const changedExpected = structuredClone(expected);
changedExpected.files[0].status = 'duplicate'; changedExpected.files[0].keeperSourceIndex = 1;
changedExpected.files[1].status = 'keep'; changedExpected.files[1].keeperSourceIndex = 1;
changedExpected.groups[0].keeperSourceIndex = 1; changedExpected.groups[0].duplicateSourceIndexes = [0];
await artifact('oracle-keeper1.json', serializeJSON(changed), JSON.stringify(changedExpected, null, 2) + '\n');
await artifact('oracle-keeper1.txt', serializeTXT(changed), defaultTXT.replace(`KEEP\t0\t"a"\t3\t${abc}\t0\nDUPLICATE\t1\t"b"\t3\t${abc}\t0`, `DUPLICATE\t0\t"a"\t3\t${abc}\t1\nKEEP\t1\t"b"\t3\t${abc}\t1`));
for (const name of ['oracle-default.json', 'oracle-keeper1.json']) {
  const parsed = JSON.parse(await readFile(resolve(directory, name), 'utf8'));
  assert.deepEqual(parsed.summary, { selectedFileCount: 5, uniqueContentCount: 3, duplicateFileCount: 2, savedBytes: 3 });
}
await writeFile(resolve(ROOT, 'evidence/m1/artifacts-verification.json'), JSON.stringify({ status: 'PASS', scope: 'Synthetic CLI-generated report bytes; not browser downloads', independentlyVerifiedArtifacts: 4, files: manifest }, null, 2) + '\n');
console.log('PASS artifacts: 4 UTF-8 JSON/TXT files read back; exact independent expected bytes, keys, counts and keeper mapping');
