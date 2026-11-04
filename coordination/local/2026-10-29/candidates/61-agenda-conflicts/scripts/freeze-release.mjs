import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PROJECT_ROOT } from './files.mjs';
import { checkRelease, RELEASE_ORIGIN, TOOL_SLUG } from './release.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const order = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
const readJson = async file => JSON.parse((await readFile(path.join(PROJECT_ROOT, file), 'utf8')).replace(/^\uFEFF/, ''));
async function collect(roots) {
  const entries = [];
  async function visit(relative) {
    const absolute = path.join(PROJECT_ROOT, relative);
    const info = await lstat(absolute);
    assert.equal(info.isSymbolicLink(), false);
    if (info.isDirectory()) for (const child of await readdir(absolute)) await visit(`${relative}/${child}`);
    else {
      assert.equal(info.isFile(), true);
      const bytes = await readFile(absolute);
      entries.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  for (const root of roots) await visit(root);
  return entries.sort(order);
}

const before = await readJson('evidence/m1b/environment-before.json');
const after = await readJson('evidence/m1b/environment-after.json');
assert.equal(before.Status, 'PASS'); assert.equal(after.Status, 'PASS');
assert.deepEqual(after.Snapshots, before.Snapshots);
const protectedBefore = (await readJson('evidence/m1b/protected-before.json')).sort(order);
assert.deepEqual(await collect(['public', 'dist', 'evidence/m1']), protectedBefore);
const prior = await readJson('evidence/m1/candidate-manifest.json');
for (const entry of prior.immutableContracts) {
  const bytes = await readFile(path.join(PROJECT_ROOT, entry.path));
  assert.equal(bytes.length, entry.bytes); assert.equal(hash(bytes), entry.sha256);
}
for (const file of ['final-test', 'final-check', 'final-build-release', 'final-check-release']) assert.equal((await readJson(`evidence/m1b/${file}-exit.json`)).exit, 0);
const tests = await readFile(path.join(PROJECT_ROOT, 'evidence/m1b/final-test.log'), 'utf8');
const count = Number(/\btests\s+(\d+)/.exec(tests)?.[1]);
assert.ok(count >= 108); assert.match(tests, /\bfail\s+0\b/); assert.match(tests, /\bskipped\s+0\b/);
const result = await checkRelease();
const source = await collect(['.gitignore', 'package.json', 'public', 'scripts', 'test', 'HANDOFF.md', 'TASK-ENTRY.md', 'M1B-RELEASE.md']);
const previousSource = new Map(prior.source.map(entry => [entry.path, entry]));
const changed = source.filter(entry => previousSource.get(entry.path)?.sha256 !== entry.sha256)
  .map(entry => ({ path: entry.path, change: previousSource.has(entry.path) ? 'modified' : 'added' }));
const artifacts = await collect(['release-artifacts']);
const manifest = { schemaVersion: 1, milestone: 'B20-RP-61-M1B', date: '2026-10-23', origin: RELEASE_ORIGIN, toolSlug: TOOL_SLUG,
  status: 'offline-release-candidate-not-published', sourceManifestSha256: hash(Buffer.from(JSON.stringify(source))),
  source, changedSinceM1: changed, artifacts, release: result, protectedFileCount: protectedBefore.length,
  protectedBytesUnchanged: true, environmentSnapshotsUnchanged: true, nodeTests: count,
  browser: 'NOT_RUN_USER_FOCUS_INCIDENT', hostingHeaders: 'NOT_RUN_NOT_DEPLOYED', publication: 'NOT_PUBLISHED',
  note: 'Original M1 manifest and evidence are preserved. This new manifest describes the M1B toolchain/docs additions; runtime and preview bytes are identical to M1.' };
await writeFile(path.join(PROJECT_ROOT, 'evidence/m1b/candidate-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`PASS M1B freeze: ${source.length} sources, ${changed.length} changed/added, ${artifacts.length} artifact files; ${protectedBefore.length} protected files unchanged; ${count} Node tests.\nSource manifest SHA-256: ${manifest.sourceManifestSha256}\nRelease manifest SHA-256: ${result.manifestHash}\n`);
