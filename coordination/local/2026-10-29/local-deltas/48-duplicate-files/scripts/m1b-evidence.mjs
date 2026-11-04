import { readdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT } from './check.mjs';

const evidence = resolve(ROOT, 'evidence/m1b');
const manifestPath = resolve(evidence, 'candidate-manifest.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const allowed = path => ['package.json', '.gitignore', 'HANDOFF.md', 'TASK-ENTRY.md', 'M1B-RELEASE.md'].includes(path)
  || ['scripts/', 'test/', 'release-artifacts/'].some(prefix => path.startsWith(prefix));
async function walk(folder = '') {
  const files = [];
  for (const entry of await readdir(resolve(ROOT, folder), { withFileTypes: true })) {
    const path = folder ? `${folder}/${entry.name}` : entry.name;
    if (path === 'evidence/m1b') continue;
    assert(!entry.isSymbolicLink(), 'Evidence does not follow links');
    if (entry.isDirectory()) files.push(...await walk(path));
    else {
      const stat = await lstat(resolve(ROOT, path)); assert(stat.isFile() && !stat.isSymbolicLink());
      const bytes = await readFile(resolve(ROOT, path));
      files.push({ path, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
async function snapshot() {
  const baseline = JSON.parse(await readFile(resolve(evidence, 'baseline.json'), 'utf8')).files;
  const current = await walk(), lookup = new Map(current.map(file => [file.path, file]));
  const old = new Map(baseline.map(file => [file.path, file])), preserved = [], changes = [];
  for (const before of baseline) {
    const after = lookup.get(before.path); assert(after, 'No original file may be deleted');
    if (before.bytes === after.bytes && before.sha256 === after.sha256) preserved.push(before);
    else { assert(allowed(before.path), 'A forbidden original file changed'); changes.push({ path: before.path, change: 'modified', before, after }); }
  }
  for (const after of current) if (!old.has(after.path)) {
    assert(allowed(after.path), 'An added file is outside M1B scope'); changes.push({ path: after.path, change: 'added', before: null, after });
  }
  changes.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const sources = current.filter(file => ['package.json', '.gitignore', 'HANDOFF.md', 'TASK-ENTRY.md', 'M1B-RELEASE.md'].includes(file.path)
    || /^(?:scripts|test)\/[^/]+\.mjs$/.test(file.path) || file.path.startsWith('public/'));
  const artifacts = current.filter(file => file.path.startsWith('release-artifacts/'));
  assert.equal(artifacts.length, 15, 'Expected 14 site files and the sibling manifest');
  const immutable = baseline.filter(file => /^(?:public|dist|evidence\/m1)\//.test(file.path));
  for (const file of immutable) assert.deepEqual(lookup.get(file.path), file, 'M1 runtime/preview/evidence must remain identical');
  return { schemaVersion: 1, candidate: 'B20-RP-48-M1B-2026-10-23',
    sourceSetSha256: hash(JSON.stringify(sources)), artifactSetSha256: hash(JSON.stringify(artifacts)),
    sources, artifacts, preservedFiles: preserved, changes,
    immutableM1Files: immutable, environmentComparison: JSON.parse(await readFile(resolve(evidence, 'environment-comparison.json'), 'utf8')) };
}
function lines(text) { const result = text.replace(/\r\n/g, '\n').split('\n'); if (result.at(-1) === '') result.pop(); return result; }
async function sourcePatch(changes) {
  let patch = '';
  for (const change of changes.filter(change => !change.path.startsWith('release-artifacts/'))) {
    const before = change.before ? lines(await readFile(resolve(evidence, 'before', change.path), 'utf8')) : [];
    const after = lines(await readFile(resolve(ROOT, change.path), 'utf8'));
    patch += `diff --git a/${change.path} b/${change.path}\n--- ${change.before ? 'a/' + change.path : '/dev/null'}\n+++ b/${change.path}\n@@ -${before.length ? 1 : 0},${before.length} +1,${after.length} @@\n`;
    patch += [...before.map(line => '-' + line), ...after.map(line => '+' + line)].join('\n') + '\n';
  }
  return patch;
}
const mode = process.argv[2]; assert(process.argv.length === 3 && ['capture', 'verify'].includes(mode));
if (mode === 'capture') {
  const candidate = await snapshot(); assert.equal(candidate.environmentComparison.status, 'PASS'); assert.equal(candidate.environmentComparison.completeSnapshotsEqual, true);
  const patch = await sourcePatch(candidate.changes);
  await writeFile(resolve(evidence, 'source-changes.patch'), patch, { flag: 'wx' });
  await writeFile(resolve(evidence, 'changes.json'), JSON.stringify(candidate.changes, null, 2) + '\n', { flag: 'wx' });
  await writeFile(manifestPath, JSON.stringify(candidate, null, 2) + '\n', { flag: 'wx' });
  console.log(`FROZEN M1B: ${candidate.sources.length} sources / ${candidate.artifacts.length} artifacts; source ${candidate.sourceSetSha256}; artifact ${candidate.artifactSetSha256}`);
} else {
  const saved = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.deepEqual(await snapshot(), saved, 'M1B frozen source/artifact drift');
  console.log(`PASS M1B frozen bytes: ${saved.sources.length} sources / ${saved.artifacts.length} artifacts; ${saved.immutableM1Files.length} M1 files unchanged`);
}
