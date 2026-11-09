import assert from 'node:assert/strict';
import { readdir, lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from './files.mjs';

const F1 = path.join(ROOT, 'evidence', 'f1-2026-10-27');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function records(directory, sourceOnly = false) {
  const files = [];
  async function walk(relative = '') {
    for (const entry of await readdir(path.join(directory, relative))) {
      const name = relative ? relative + '/' + entry : entry;
      if (!relative && ['evidence', '.git', 'node_modules'].includes(entry)) continue;
      if (sourceOnly && !relative && ['dist', 'release-artifacts'].includes(entry)) continue;
      const absolute = path.join(directory, name), stat = await lstat(absolute);
      assert.ok(!stat.isSymbolicLink(), 'UNSAFE_SNAPSHOT_LINK');
      if (stat.isDirectory()) await walk(name);
      else { assert.ok(stat.isFile()); const bytes = await readFile(absolute); files.push({ path: name, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  await walk(); return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
async function copyRecords(source, destination, files) {
  for (const file of files) {
    assert.ok(!path.isAbsolute(file.path) && !file.path.split('/').includes('..') && !file.path.includes('\\'));
    const bytes = await readFile(path.join(source, file.path)); assert.equal(sha(bytes), file.sha256);
    const target = path.join(destination, file.path); await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' }); assert.equal(sha(await readFile(target)), file.sha256);
  }
}
async function save(name, object) {
  await writeFile(path.join(F1, name), JSON.stringify(object, null, 2) + '\n', { flag: 'wx' });
}
assert.equal(process.argv.length, 3, 'EXPECTED_ONE_MODE');
const mode = process.argv[2];
if (mode === 'capture') {
  const files = (await records(ROOT)).filter((f) => f.path !== 'scripts/f1-candidate.mjs');
  await copyRecords(ROOT, path.join(F1, 'old'), files);
  const historical = await readFile(path.join(ROOT, 'evidence/m1/source-inventory.json'));
  await mkdir(path.join(F1, 'old/evidence/m1'), { recursive: true });
  await writeFile(path.join(F1, 'old/evidence/m1/source-inventory.json'), historical, { flag: 'wx' });
  await save('old-inventory.json', { files, sourceTreeSha256: sha(JSON.stringify(files)), historicalM1InventorySha256: sha(historical) });
  console.log(`PRESERVED ${files.length} old source/public/dist/release files with byte/SHA verification.`);
} else if (mode === 'pin') {
  const old = JSON.parse(await readFile(path.join(F1, 'old/scripts/release-inputs.json'), 'utf8'));
  const files = (await records(path.join(ROOT, 'public'))).map((f) => ({ ...f }));
  assert.deepEqual(files.filter((f) => old.files.find((p) => p.path === f.path)?.sha256 !== f.sha256).map((f) => f.path), ['js/core/session.mjs'], 'UNEXPECTED_PUBLIC_CHANGE');
  assert.deepEqual(files.map((f) => f.path), old.files.map((f) => f.path));
  await writeFile(path.join(ROOT, 'scripts/release-inputs.json'), JSON.stringify({ ...old, files }, null, 2) + '\n');
  console.log('UPDATED source pins: only js/core/session.mjs differs; original release policy/version contract retained.');
} else if (mode === 'candidate') {
  const files = await records(ROOT, true);
  await copyRecords(ROOT, path.join(F1, 'candidate'), files);
  await mkdir(path.join(F1, 'candidate/evidence/m1'), { recursive: true });
  await writeFile(path.join(F1, 'candidate/evidence/m1/source-inventory.json'), await readFile(path.join(F1, 'old/evidence/m1/source-inventory.json')), { flag: 'wx' });
  await save('candidate-inputs.json', { files, sourceTreeSha256: sha(JSON.stringify(files)) });
  console.log(`CREATED isolated F1 candidate copy: ${files.length} source files. Existing root dist/release kept unchanged.`);
} else if (mode === 'sync-handoff') {
  const inputs = JSON.parse(await readFile(path.join(F1, 'candidate-inputs.json'), 'utf8'));
  const target = path.join(F1, 'candidate/HANDOFF.md');
  assert.equal(sha(await readFile(target)), inputs.files.find((f) => f.path === 'HANDOFF.md').sha256, 'CANDIDATE_HANDOFF_UNEXPECTED_CHANGE');
  await writeFile(target, await readFile(path.join(ROOT, 'HANDOFF.md')));
  console.log('SYNCED final HANDOFF only; tested product/toolchain inputs unchanged.');
} else if (mode === 'freeze') {
  const old = JSON.parse(await readFile(path.join(F1, 'old-inventory.json'), 'utf8'));
  const current = await records(ROOT, true), byOld = new Map(old.files.map((f) => [f.path, f]));
  const changes = current.filter((f) => byOld.get(f.path)?.sha256 !== f.sha256).map((f) => ({ path: f.path, before: byOld.get(f.path) ?? null, after: f }));
  const oldAssets = old.files.filter((f) => f.path.startsWith('dist/') || f.path.startsWith('release-artifacts/'));
  for (const file of oldAssets) assert.equal(sha(await readFile(path.join(ROOT, file.path))), file.sha256, 'OLD_ROOT_BUILD_CHANGED');
  const candidate = path.join(F1, 'candidate'), candidateSource = await records(candidate, true);
  assert.deepEqual(candidateSource, current, 'CANDIDATE_SOURCE_DIFFERS_FROM_CURRENT_FIXED_SOURCE');
  const candidateFiles = await records(candidate), manifest = JSON.parse(await readFile(path.join(candidate, 'release-artifacts/manifest.json'), 'utf8'));
  await save('source-vs-old.json', { oldSourceTreeSha256: old.sourceTreeSha256, changed: changes, removed: old.files.filter((f) => !f.path.startsWith('dist/') && !f.path.startsWith('release-artifacts/') && !current.some((n) => n.path === f.path)), rootOldBuildFilesVerified: oldAssets.length });
  await save('candidate-manifest.json', { schemaVersion: 1, candidate: 'B20-45-F1', sourceTreeSha256: sha(JSON.stringify(current)), sourceFiles: current, candidateFiles, releaseManifestSha256: sha(await readFile(path.join(candidate, 'release-artifacts/manifest.json'))), releaseFiles: manifest.files, publicSourceFiles: manifest.sourceFiles, browserReverification: 'NOT_RUN_BY_OWNER_ROOT_REQUIRED' });
  console.log(`FROZEN F1: ${current.length} source files; source ${sha(JSON.stringify(current))}; release manifest ${sha(await readFile(path.join(candidate, 'release-artifacts/manifest.json')))}; ${changes.length} source changes; ${oldAssets.length} old root build files unchanged.`);
} else throw new Error('UNKNOWN_MODE');
