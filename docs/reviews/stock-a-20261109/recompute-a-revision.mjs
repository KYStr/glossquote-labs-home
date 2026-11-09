import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [repository = '.', deltaPath, receiptPath] = process.argv.slice(2);
const delta = JSON.parse(readFileSync(deltaPath ?? new URL('candidate-delta-a5e7356d.json', import.meta.url), 'utf8'));
const prior = JSON.parse(readFileSync(receiptPath ?? new URL('candidate-readback.json', import.meta.url), 'utf8'));
assert.equal(delta.head, 'a5e7356dae36d2aac3db068352a916d76c7594c3');
assert.equal(delta.previous, prior.head);
const git = args => execFileSync('git', ['-C', repository, ...args], { maxBuffer: 1_048_576 });
const read = path => git(['cat-file', 'blob', delta.head + ':' + path]);

const changed = new Map(delta.deltas.map(file => [file.path, file]));
assert.equal(changed.size, 3);
assert.equal(prior.files.length, 81);
assert.equal(delta.unchanged, prior.files.length - changed.size);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
for (const file of prior.files) {
  const currentSha = git(['rev-parse', delta.head + ':' + file.path]).toString('utf8').trim();
  const change = changed.get(file.path);
  assert.equal(currentSha, change?.blobSha ?? file.blobSha, file.path);
  if (change) {
    assert.equal(change.previousBlobSha, file.blobSha, file.path);
    assert.equal(sha256(read(file.path)), change.sha256, file.path);
  }
}

const folder = 'docs/specs/text-file-line-endings/';
const { cases } = JSON.parse(read(folder + 'fixtures.json'));
const spec = read(folder + 'SPEC.md').toString('utf8');
const authorCheck = read(folder + 'AUTHOR-CHECK.md').toString('utf8');
const tests = spec.split('## tests\n')[1].split('## handoff\n')[0];
assert.match(tests, /首次輸出仍是合法輸入，且未在 strip 模式把前次保留的開頭 U\+FEFF 再辨為 BOM/);
assert.match(tests, /131,072 bytes.+INPUT_LIMIT/);
assert.match(authorCheck, /EFBBBF0A 再得 0A/);

const bom = Buffer.from('efbbbf', 'hex');
function convert(bytes, target, bomMode) {
  if (bytes.length > 65_536) return { error: 'INPUT_LIMIT' };
  const initial = bytes.subarray(0, 3).equals(bom);
  const payload = bytes.subarray(initial ? 3 : 0);
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(payload);
  const body = Buffer.from(payload.toString('latin1').replace(/\r\n|\r|\n/g, target === 'lf' ? '\n' : '\r\n'), 'latin1');
  return { bytes: initial && bomMode === 'keep' ? Buffer.concat([bom, body]) : body };
}

const fixtures = cases.filter(c => c.kind === 'core' && c.expected.ok);
let ordinary = 0;
for (const c of fixtures) {
  const { bytes, target, bomMode } = c.input;
  const first = convert(Buffer.from(bytes), target, bomMode).bytes;
  assert.equal(first.toString('hex'), c.expected.result.outputHex, c.id);
  const second = convert(first, target, bomMode).bytes;
  if (c.id === 'double-bom') assert.equal(second.toString('hex'), '0a');
  else {
    assert.deepEqual(second, first, c.id);
    ordinary++;
  }
}

const expanded = convert(Buffer.alloc(65_536, 10), 'crlf', 'keep').bytes;
assert.equal(expanded.length, 131_072);
assert.deepEqual(convert(expanded, 'crlf', 'keep'), { error: 'INPUT_LIMIT' });
console.log(JSON.stringify({
  status: 'PASS', head: delta.head, unchangedGitBlobs: delta.unchanged,
  changedGitBlobs: changed.size, byteFixtures: fixtures.length, ordinaryIdempotent: ordinary,
  doubleBom: ['efbbbf0a', '0a'], expandedBytes: expanded.length, rerun: 'INPUT_LIMIT', productChecks: 'NOT_RUN',
}));

