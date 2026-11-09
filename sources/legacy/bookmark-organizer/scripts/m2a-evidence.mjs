import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, listFiles } from './files.mjs';
import { runRelease } from './release.mjs';
import { checkDeploymentConfig } from './release-config.mjs';
const directory = 'evidence/m2a';
const candidateName = `${directory}/M2A-CANDIDATE.json`, checksumName = `${directory}/M2A-CANDIDATE.sha256`, sourceSetName = `${directory}/SOURCE-SET.json`;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function record(name) { const bytes = await readFile(path.join(root, name)); return { path: name, bytes: bytes.length, sha256: digest(bytes) }; }
async function sourceSet() {
  const names = ['.gitignore', 'package.json', 'wrangler.jsonc', 'AGENTS.md', 'ACCEPTANCE.md', 'HANDOFF.md', 'M1B-RELEASE.md', 'PRODUCT.md', 'README.md', 'START-HERE.md', 'TASK-ENTRY.md', 'TASKS.md', 'TECHNICAL.md', 'UX-SEO.md', 'evidence/m1/CANDIDATE-MANIFEST.json'];
  for (const folder of ['public', 'scripts', 'test', 'docs']) names.push(...(await listFiles(path.join(root, folder))).map(name => `${folder}/${name}`));
  assert.equal(new Set(names).size, names.length);
  return { schemaVersion: 1, toolSlug: 'bookmark-organizer', scope: 'reviewable M2A source set; no publication performed', files: await Promise.all(names.sort().map(record)) };
}
async function protectedFiles() {
  const names = [];
  for (const folder of ['public', 'dist', 'evidence/m1', 'evidence/m1b']) names.push(...(await listFiles(path.join(root, folder))).map(name => `${folder}/${name}`));
  return Promise.all(names.sort().map(record));
}
async function evidenceNames(folder = directory) {
  const names = [];
  for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
    const name = `${folder}/${entry.name}`, info = await lstat(path.join(root, name));
    assert(!info.isSymbolicLink());
    if (folder === directory && ['test-workspaces', 'M2A-CANDIDATE.json', 'M2A-CANDIDATE.sha256', 'SOURCE-SET.json'].includes(entry.name)) continue;
    if (info.isDirectory()) names.push(...await evidenceNames(name)); else { assert(info.isFile()); names.push(name); }
  }
  return names.sort();
}
async function snapshot(sources) {
  const original = JSON.parse(await readFile(path.join(root, directory, 'protected-before.json'), 'utf8'));
  assert.deepEqual(await protectedFiles(), original.files, 'Protected public/dist/historical evidence changed');
  const old = JSON.parse(await readFile(path.join(root, directory, 'pre-m2a-release/inventory.json'), 'utf8'));
  const archive = `${directory}/pre-m2a-release/release-artifacts`;
  const actualArchive = await Promise.all((await listFiles(path.join(root, archive))).map(name => record(`${archive}/${name}`)));
  assert.deepEqual(actualArchive.map(item => ({ ...item, path: item.path.slice(archive.length + 1) })), old.files, 'Preserved release copy changed');
  assert.equal(old.manifestSha256, '94ee4bd3206130a3977c5b42f3e3704e4e4f25370c0a153fa500f22c11aab52d');
  const config = await checkDeploymentConfig(), release = await runRelease(['check']);
  const artifactFiles = await Promise.all((await listFiles(path.join(root, 'release-artifacts'))).map(name => record(`release-artifacts/${name}`)));
  return { schemaVersion: 1, candidateId: 'B20-49-M2A-2026-10-27-r1', scope: 'offline predeployment preparation only; no M2B/GitHub/deployment/homepage action', config: { path: 'wrangler.jsonc', bytes: config.length, sha256: digest(config), validation: 'strict offline task contract; provider CLI not executed' }, release, sourceSet: { path: sourceSetName, bytes: Buffer.byteLength(JSON.stringify(sources, null, 2) + '\n'), sha256: digest(Buffer.from(JSON.stringify(sources, null, 2) + '\n')), files: sources.files.length }, artifactFiles, evidenceFiles: await Promise.all((await evidenceNames()).map(record)), protectedFiles: original.files.length, preservedReleaseFiles: actualArchive.length, preservedManifestSha256: old.manifestSha256 };
}
const args = process.argv.slice(2);
assert(args.length === 1 && ['record', 'verify'].includes(args[0]), 'Explicit record/verify required');
const sources = await sourceSet(), sourceBytes = Buffer.from(JSON.stringify(sources, null, 2) + '\n');
if (args[0] === 'record') {
  const candidate = await snapshot(sources), bytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n');
  await writeFile(path.join(root, sourceSetName), sourceBytes, { flag: 'wx' });
  await writeFile(path.join(root, candidateName), bytes, { flag: 'wx' });
  await writeFile(path.join(root, checksumName), `${digest(bytes)}  M2A-CANDIDATE.json\n`, { flag: 'wx' });
  process.stdout.write(`FIXED M2A ${sources.files.length} source files, ${candidate.artifactFiles.length} artifacts; SHA-256 ${digest(bytes)}\n`);
} else {
  assert((await readFile(path.join(root, sourceSetName))).equals(sourceBytes), 'Source-set bytes changed');
  const bytes = await readFile(path.join(root, candidateName));
  assert.deepEqual(await snapshot(sources), JSON.parse(bytes), 'M2A frozen bytes changed');
  assert.equal(await readFile(path.join(root, checksumName), 'utf8'), `${digest(bytes)}  M2A-CANDIDATE.json\n`);
  process.stdout.write(`PASS fixed M2A bytes; SHA-256 ${digest(bytes)}\n`);
}
