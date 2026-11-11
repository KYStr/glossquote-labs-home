import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [wallpaperOriginal, pingOriginal, candidate] = process.argv.slice(2);
if (!wallpaperOriginal || !pingOriginal || !candidate || process.argv.length !== 5) {
  throw new Error('Usage: node replay-source-diff.mjs <original-wallpaper-dir> <original-ping-dir> <candidate-repo-root>');
}

const evidencePath = join(candidate, 'docs/reviews/five-hour-2026-11-11/candidates/repair-wallpaper-ping');
const manifestBytes = readFileSync(join(evidencePath, 'manifest.json'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
assert.equal(sha256(manifestBytes), '941ba10d753defb4a9c0cb2984d29abd3459c27c3beeb7250a9157c98014877c');

const manifest = JSON.parse(manifestBytes.toString('utf8'));
const patchFile = manifest.verificationFiles.find(x => x.path.endsWith('/source-diff.patch'));
const patchBytes = readFileSync(join(evidencePath, 'source-diff.patch'));
assert.equal(sha256(patchBytes), patchFile.sha256);
assert.equal(gitBlob(patchBytes), patchFile.gitBlob);

function splitLines(contents) {
  assert.ok(contents.endsWith('\n'));
  return contents.slice(0, -1).split('\n');
}

const originals = {'wallpaper-calculator': wallpaperOriginal, 'ping-area-converter': pingOriginal};
const files = new Map();
for (const file of manifest.specifications) {
  const [, , slug, name] = file.path.split('/');
  assert.ok(Object.hasOwn(originals, slug));
  assert.ok(['BRIEF.md', 'SPEC.md', 'AUTHOR-CHECK.md', 'fixtures.json'].includes(name));
  const old = readFileSync(join(originals[slug], name));
  const current = readFileSync(join(candidate, file.path));
  assert.equal(gitBlob(old), file.originalGitBlob);
  assert.equal(gitBlob(current), file.gitBlob);
  assert.equal(sha256(current), file.sha256);
  assert.equal(current.length, file.bytes);
  assert.equal(!current.equals(old), file.changed);
  files.set(file.path, {old: old.toString('utf8'), current: current.toString('utf8'), changed: file.changed});
}
assert.equal(files.size, 8);

const patch = splitLines(patchBytes.toString('utf8'));
const replay = [];
let cursor = 0;
while (cursor < patch.length) {
  const path = /^--- a\/(.+)$/.exec(patch[cursor++])?.[1];
  const target = /^\+\+\+ b\/(.+)$/.exec(patch[cursor++])?.[1];
  assert.ok(path && path === target && files.get(path)?.changed);
  assert.ok(!replay.some(entry => entry.path === path));
  const original = splitLines(files.get(path).old);
  const rebuilt = [];
  let sourceLine = 0;
  let hunks = 0;
  let removedAuthorLines = 0;
  while (cursor < patch.length && patch[cursor].startsWith('@@ ')) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(patch[cursor++]);
    assert.ok(header);
    const start = Number(header[1]) - 1;
    assert.ok(start >= sourceLine);
    rebuilt.push(...original.slice(sourceLine, start));
    sourceLine = start;
    assert.equal(rebuilt.length, Number(header[3]) - 1);
    const originalEnd = sourceLine + Number(header[2] ?? 1);
    const rebuiltEnd = rebuilt.length + Number(header[4] ?? 1);
    while (sourceLine < originalEnd || rebuilt.length < rebuiltEnd) {
      const [operation, ...bodyParts] = patch[cursor++];
      const body = bodyParts.join('');
      assert.ok([' ', '-', '+'].includes(operation));
      if (operation !== '+' && body !== original[sourceLine]) {
        assert.ok(operation === '-' && path.endsWith('/AUTHOR-CHECK.md') && sourceLine === 2
          && original[sourceLine].startsWith('作者 \x60cloud-dot:')
          && body === '[原作者與工作環境資訊見固定來源]');
        removedAuthorLines++;
      }
      if (operation !== '+') sourceLine++;
      if (operation !== '-') rebuilt.push(body);
    }
    assert.equal(sourceLine, originalEnd);
    assert.equal(rebuilt.length, rebuiltEnd);
    hunks++;
  }
  rebuilt.push(...original.slice(sourceLine));
  assert.equal(rebuilt.join('\n') + '\n', files.get(path).current);
  replay.push({path, hunks, removedAuthorLines, exactCandidate: true});
}

assert.equal(replay.length, 7);
assert.equal(replay.reduce((sum, file) => sum + file.removedAuthorLines, 0), 2);
const unchanged = [...files].filter(([, file]) => !file.changed).map(([path]) => path);
assert.deepEqual(unchanged, ['docs/specs/ping-area-converter/BRIEF.md']);
console.log(JSON.stringify({status: 'PASS', runtime: process.version, specFiles: files.size,
  patchSHA256: sha256(patchBytes), replay, unchanged}, null, 2));
