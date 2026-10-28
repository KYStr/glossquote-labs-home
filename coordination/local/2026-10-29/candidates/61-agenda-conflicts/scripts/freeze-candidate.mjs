import assert from 'node:assert/strict';
import { readdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PROJECT_ROOT, PUBLIC_FILES, inspectTree } from './files.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const collect = async relatives => {
  const files = [];
  async function visit(relative) {
    const full = path.join(PROJECT_ROOT, relative);
    const info = await lstat(full);
    assert.equal(info.isSymbolicLink(), false);
    if (info.isDirectory()) {
      for (const item of await readdir(full)) await visit(`${relative}/${item}`);
    } else {
      assert.equal(info.isFile(), true);
      const bytes = await readFile(full);
      files.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  for (const relative of relatives) await visit(relative);
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
};
const contracts = ['AGENTS.md', 'START-HERE.md', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md', 'docs'];
const command = process.argv[2];
const evidence = path.join(PROJECT_ROOT, 'evidence/m1');
if (command === 'capture-contracts') {
  const before = await collect(contracts);
  await writeFile(path.join(evidence, 'contracts-before.json'), `${JSON.stringify(before, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`PASS captured ${before.length} immutable tool contracts.\n`);
} else if (command === 'freeze') {
  const before = JSON.parse(await readFile(path.join(evidence, 'contracts-before.json'), 'utf8'));
  assert.deepEqual(await collect(contracts), before);
  const envBefore = JSON.parse((await readFile(path.join(evidence, 'environment-before.json'), 'utf8')).replace(/^\uFEFF/, ''));
  const envAfter = JSON.parse((await readFile(path.join(evidence, 'environment-after.json'), 'utf8')).replace(/^\uFEFF/, ''));
  assert.equal(envBefore.Status, 'PASS'); assert.equal(envAfter.Status, 'PASS');
  assert.deepEqual(envAfter.Snapshots, envBefore.Snapshots);
  const source = await collect(['.gitignore', 'package.json', 'public', 'scripts', 'test', 'HANDOFF.md', 'TASK-ENTRY.md']);
  const built = await inspectTree(path.join(PROJECT_ROOT, 'dist'));
  const preview = [];
  for (const file of PUBLIC_FILES) {
    const bytes = await readFile(path.join(PROJECT_ROOT, 'public', file));
    assert.deepEqual(built.get(file), bytes);
    preview.push({ path: `dist/${file}`, bytes: bytes.length, sha256: hash(bytes) });
  }
  const manifest = { candidate: 'B20-61-M1-2026-10-23', version: '0.1.0-m1', node: process.version,
    sourceCommit: null, sourceManifestSha256: hash(Buffer.from(JSON.stringify(source))),
    source, immutableContracts: before, preview, environmentSnapshotsUnchanged: true,
    evidence: await collect(['evidence/m1/acceptance.json', 'evidence/m1/outputs']) };
  await writeFile(path.join(evidence, 'candidate-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`PASS frozen candidate: ${source.length} source files, ${preview.length} identical dist assets, ${before.length} unchanged contracts; environment snapshots identical.\nSource manifest SHA-256: ${manifest.sourceManifestSha256}\n`);
} else throw new Error('Use capture-contracts or freeze');
