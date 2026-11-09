import assert from 'node:assert/strict';
import { readdir, lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from './files.mjs';

const EVIDENCE = path.join(ROOT, 'evidence/f1r1-2026-10-27');
const PREVIOUS = path.join(ROOT, 'evidence/f1-2026-10-27');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function scan(root, excluded = []) {
  const result = [];
  async function walk(relative = '') {
    for (const entry of await readdir(path.join(root, relative))) {
      if (!relative && excluded.includes(entry)) continue;
      const name = relative ? relative + '/' + entry : entry, stat = await lstat(path.join(root, name));
      assert.ok(!stat.isSymbolicLink());
      if (stat.isDirectory()) await walk(name);
      else { assert.ok(stat.isFile()); const bytes = await readFile(path.join(root, name)); result.push({ path: name, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  await walk(); return result.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
const sources = (root) => scan(root, ['evidence', 'dist', 'release-artifacts', '.git', 'node_modules']);
async function copy(root, targetRoot, files) {
  for (const file of files) {
    assert.ok(!path.isAbsolute(file.path) && !file.path.split('/').includes('..') && !file.path.includes('\\'));
    const bytes = await readFile(path.join(root, file.path)); assert.equal(sha(bytes), file.sha256);
    const target = path.join(targetRoot, file.path); await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' }); assert.equal(sha(await readFile(target)), file.sha256);
  }
}
async function save(name, value) { await writeFile(path.join(EVIDENCE, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
assert.equal(process.argv.length, 3);
const mode = process.argv[2];
if (mode === 'capture') {
  const previous = JSON.parse(await readFile(path.join(PREVIOUS, 'candidate-manifest.json'), 'utf8'));
  assert.deepEqual((await sources(ROOT)).filter((f) => f.path !== 'scripts/f1r1-candidate.mjs'), previous.sourceFiles, 'CURRENT_SOURCE_NOT_FROZEN_F1');
  await copy(path.join(PREVIOUS, 'candidate'), path.join(EVIDENCE, 'old'), previous.candidateFiles);
  await mkdir(path.join(EVIDENCE, 'old/evidence/m1'), { recursive: true });
  await writeFile(path.join(EVIDENCE, 'old/evidence/m1/source-inventory.json'), await readFile(path.join(ROOT, 'evidence/m1/source-inventory.json')), { flag: 'wx' });
  await save('old-inventory.json', { files: previous.candidateFiles, sourceFiles: previous.sourceFiles, sourceTreeSha256: previous.sourceTreeSha256, releaseManifestSha256: previous.releaseManifestSha256 });
  await save('previous-evidence.json', { files: await scan(PREVIOUS) });
  console.log(`PRESERVED ${previous.candidateFiles.length} frozen F1 files; complete previous evidence fingerprint recorded.`);
} else if (mode === 'pin') {
  const old = JSON.parse(await readFile(path.join(EVIDENCE, 'old/scripts/release-inputs.json'), 'utf8')), files = await scan(path.join(ROOT, 'public'));
  assert.deepEqual(files.map((f) => f.path), old.files.map((f) => f.path));
  assert.deepEqual(files.filter((f) => old.files.find((p) => p.path === f.path).sha256 !== f.sha256).map((f) => f.path), ['js/core/session.mjs']);
  await writeFile(path.join(ROOT, 'scripts/release-inputs.json'), JSON.stringify({ ...old, files }, null, 2) + '\n');
  console.log('PINNED F1R1: only session.mjs public bytes changed.');
} else if (mode === 'candidate') {
  const files = await sources(ROOT); await copy(ROOT, path.join(EVIDENCE, 'candidate'), files);
  await mkdir(path.join(EVIDENCE, 'candidate/evidence/m1'), { recursive: true });
  await writeFile(path.join(EVIDENCE, 'candidate/evidence/m1/source-inventory.json'), await readFile(path.join(EVIDENCE, 'old/evidence/m1/source-inventory.json')), { flag: 'wx' });
  await save('candidate-inputs.json', { files }); console.log(`CREATED F1R1 candidate with ${files.length} source files.`);
} else if (mode === 'sync-handoff') {
  const before = JSON.parse(await readFile(path.join(EVIDENCE, 'candidate-inputs.json'), 'utf8'));
  const target = path.join(EVIDENCE, 'candidate/HANDOFF.md'); assert.equal(sha(await readFile(target)), before.files.find((f) => f.path === 'HANDOFF.md').sha256);
  await writeFile(target, await readFile(path.join(ROOT, 'HANDOFF.md'))); console.log('SYNCED final HANDOFF; implementation inputs unchanged.');
} else if (mode === 'freeze') {
  const old = JSON.parse(await readFile(path.join(EVIDENCE, 'old-inventory.json'), 'utf8'));
  const previous = JSON.parse(await readFile(path.join(EVIDENCE, 'previous-evidence.json'), 'utf8'));
  assert.deepEqual(await scan(PREVIOUS), previous.files, 'PREVIOUS_F1_EVIDENCE_CHANGED');
  const current = await sources(ROOT), candidate = path.join(EVIDENCE, 'candidate'); assert.deepEqual(await sources(candidate), current);
  for (const f of old.files) assert.equal(sha(await readFile(path.join(EVIDENCE, 'old', f.path))), f.sha256, 'OLD_SNAPSHOT_CHANGED');
  const before = new Map(old.sourceFiles.map((f) => [f.path, f]));
  const changes = current.filter((f) => before.get(f.path)?.sha256 !== f.sha256).map((f) => ({ path: f.path, before: before.get(f.path) ?? null, after: f }));
  const candidateFiles = await scan(candidate, ['evidence', '.git', 'node_modules']);
  const releaseManifestBytes = await readFile(path.join(candidate, 'release-artifacts/manifest.json')), release = JSON.parse(releaseManifestBytes);
  await save('source-vs-old.json', { changed: changes, removed: old.sourceFiles.filter((f) => !current.some((n) => n.path === f.path)), previousEvidenceFilesVerified: previous.files.length });
  await save('candidate-manifest.json', { schemaVersion: 1, candidate: 'B20-45-F1R1', sourceTreeSha256: sha(JSON.stringify(current)), sourceFiles: current, candidateFiles, releaseManifestSha256: sha(releaseManifestBytes), releaseFiles: release.files, publicSourceFiles: release.sourceFiles, browserReverification: 'NOT_RUN_BY_OWNER_ROOT_REQUIRED' });
  console.log(`FROZEN F1R1: ${current.length} source files; source ${sha(JSON.stringify(current))}; release manifest ${sha(releaseManifestBytes)}; ${changes.length} changes; ${previous.files.length} previous evidence files unchanged.`);
} else throw new Error('UNKNOWN_MODE');
