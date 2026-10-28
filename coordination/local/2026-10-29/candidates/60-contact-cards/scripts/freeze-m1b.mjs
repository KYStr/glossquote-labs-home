import assert from 'node:assert/strict';
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES } from './files.mjs';

const evidence = join(ROOT, 'evidence', 'm1b');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const before = await json(join(evidence, 'environment-before.json')), after = await json(join(evidence, 'environment-after.json'));
assert.equal(before.Status, 'PASS'); assert.equal(after.Status, 'PASS'); assert.deepEqual(before.Snapshots, after.Snapshots);
async function record(path) {
  assert.equal((await lstat(join(ROOT, path))).isSymbolicLink(), false);
  const bytes = await readFile(join(ROOT, path)); return { path, bytes: bytes.length, sha256: sha(bytes) };
}
const protectedRecords = [];
async function walk(path) {
  const stat = await lstat(join(ROOT, path)); assert.equal(stat.isSymbolicLink(), false);
  if (stat.isDirectory()) for (const name of (await readdir(join(ROOT, path))).sort()) await walk(`${path}/${name}`);
  else { assert.equal(stat.isFile(), true); protectedRecords.push(await record(path)); }
}
for (const path of ['public', 'dist', 'evidence/m1']) await walk(path);
protectedRecords.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const baseline = (await json(join(evidence, 'protected-before.json'))).map(({ Path, Bytes, Sha256 }) => ({ path: Path, bytes: Bytes, sha256: Sha256 })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
assert.deepEqual(protectedRecords, baseline);
await writeFile(join(evidence, 'protected-after.json'), JSON.stringify(protectedRecords, null, 2) + '\n');
const commands = await json(join(evidence, 'commands.json'));
assert.equal(commands.results.length, 5); for (const command of commands.results) assert.equal(command.exit, 0);
const releaseManifest = await json(join(ROOT, 'release-artifacts', 'manifest.json'));
const artifactFiles = [];
for (const file of releaseManifest.files) {
  assert.ok(!file.path.startsWith('/') && !file.path.includes('..') && !file.path.includes('\\'));
  const actual = await record(`release-artifacts/site/${file.path}`);
  assert.equal(actual.bytes, file.bytes); assert.equal(actual.sha256, file.sha256); artifactFiles.push(actual);
}
artifactFiles.push(await record('release-artifacts/manifest.json'));
artifactFiles.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const sourcePaths = [
  '.gitignore', 'package.json', 'HANDOFF.md', 'TASK-ENTRY.md', 'M1B-RELEASE.md', ...PUBLIC_FILES.map((path) => `public/${path}`),
  ...['files', 'check', 'build', 'serve', 'verify-m1', 'freeze-m1', 'release', 'verify-m1b', 'freeze-m1b'].map((name) => `scripts/${name}.mjs`),
  ...['csv', 'map-contacts', 'vcard', 'lifecycle', 'tooling', 'release'].map((name) => `test/${name}.test.mjs`)
].sort();
const sourceFiles = []; for (const path of sourcePaths) sourceFiles.push(await record(path));
const sourceText = JSON.stringify({ task: 'B20-RP-60', mode: 'release-candidate', origin: releaseManifest.origin, files: sourceFiles }, null, 2) + '\n';
const artifactText = JSON.stringify({ task: 'B20-RP-60', mode: 'release-candidate', files: artifactFiles }, null, 2) + '\n';
await writeFile(join(evidence, 'source-manifest.json'), sourceText);
await writeFile(join(evidence, 'artifact-manifest.json'), artifactText);
const result = {
  task: 'B20-RP-60', mode: 'release-candidate', origin: releaseManifest.origin, toolSlug: releaseManifest.toolSlug,
  sourceFiles: sourceFiles.length, sourceBytes: sourceFiles.reduce((total, file) => total + file.bytes, 0), sourceManifestSha256: sha(sourceText),
  siteFiles: releaseManifest.files.length, siteBytes: releaseManifest.files.reduce((total, file) => total + file.bytes, 0),
  releaseManifestSha256: sha(await readFile(join(ROOT, 'release-artifacts', 'manifest.json'))), artifactInventorySha256: sha(artifactText),
  tests: commands.results.find((command) => command.tests !== null).tests, protectedFilesUnchanged: protectedRecords.length, environmentSnapshotsEqual: true,
  browser: 'NOT_RUN_USER_FOCUS_INCIDENT', http: 'NOT_RUN_TASK_NO_SERVER', publication: 'NOT_PUBLISHED', deployment: 'NOT_DEPLOYED'
};
await writeFile(join(evidence, 'freeze-result.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
