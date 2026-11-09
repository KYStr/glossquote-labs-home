import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, listFiles } from './files.mjs';
import { runRelease } from './release.mjs';
const evidence = 'evidence/m1b';
const candidateName = `${evidence}/M1B-CANDIDATE.json`;
const checksumName = `${evidence}/M1B-CANDIDATE.sha256`;
const sourceNames = ['.gitignore', 'package.json', 'scripts/release.mjs', 'scripts/release-baseline.mjs', 'scripts/release-evidence.mjs', 'test/release.test.mjs', 'HANDOFF.md', 'TASK-ENTRY.md', 'M1B-RELEASE.md'].sort();
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
async function record(name) { const bytes = await readFile(path.join(root, name)); return { path: name, bytes: bytes.length, sha256: digest(bytes) }; }
async function protectedInventory() {
  const names = [];
  for (const directory of ['public', 'dist', 'evidence/m1']) names.push(...(await listFiles(path.join(root, directory))).map(name => `${directory}/${name}`));
  return Promise.all(names.sort().map(record));
}
async function snapshot() {
  const protectedBefore = JSON.parse(await readFile(path.join(root, evidence, 'protected-before.json'), 'utf8'));
  assert.deepEqual(await protectedInventory(), protectedBefore.files, 'Protected M1 bytes/paths changed');
  const release = await runRelease(['check']);
  const artifactNames = (await listFiles(path.join(root, 'release-artifacts'))).map(name => `release-artifacts/${name}`);
  const evidenceNames = (await readdir(path.join(root, evidence), { withFileTypes: true })).filter(entry => entry.isFile() && /\.(?:json|txt|md)$/.test(entry.name) && entry.name !== 'M1B-CANDIDATE.json').map(entry => `${evidence}/${entry.name}`).sort();
  return { candidateId: 'B20-RP-49-M1B-2026-10-23-r1', scope: 'offline release preparation only; browser/publication not authorized by this milestone', release, sourceFiles: await Promise.all(sourceNames.map(record)), artifactFiles: await Promise.all(artifactNames.sort().map(record)), evidenceFiles: await Promise.all(evidenceNames.map(record)), protectedM1Files: protectedBefore.files.length };
}
const args = process.argv.slice(2);
assert(args.length === 1 && ['record', 'verify'].includes(args[0]), 'Explicit record or verify required');
if (args[0] === 'record') {
  try { await access(path.join(root, candidateName)); throw new Error('M1B candidate already fixed'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const candidate = await snapshot(), bytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n');
  await writeFile(path.join(root, candidateName), bytes, { flag: 'wx' });
  await writeFile(path.join(root, checksumName), `${digest(bytes)}  M1B-CANDIDATE.json\n`, { flag: 'wx' });
  process.stdout.write(`FIXED ${candidate.sourceFiles.length} changed source/docs; ${candidate.artifactFiles.length} artifacts; ${candidate.protectedM1Files} unchanged M1 files; SHA-256 ${digest(bytes)}\n`);
} else {
  const bytes = await readFile(path.join(root, candidateName));
  assert.deepEqual(await snapshot(), JSON.parse(bytes), 'M1B fixed bytes changed');
  assert.equal(await readFile(path.join(root, checksumName), 'utf8'), `${digest(bytes)}  M1B-CANDIDATE.json\n`);
  process.stdout.write(`PASS fixed M1B candidate; SHA-256 ${digest(bytes)}\n`);
}
