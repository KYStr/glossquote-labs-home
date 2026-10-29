import assert from 'node:assert/strict';
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, PUBLIC_FILES, validRelativePath } from './check.mjs';

const manifestPath = join(PROJECT_ROOT, 'evidence/m1/candidate-manifest.json');
const fingerprint = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--verify')) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const record of [...manifest.sources, ...manifest.preview]) {
    assert.ok(validRelativePath(record.path));
    const bytes = await readFile(join(PROJECT_ROOT, record.path));
    assert.equal(bytes.length, record.bytes);
    assert.equal(fingerprint(bytes), record.sha256);
  }
  process.stdout.write(`PASS: frozen ${manifest.sources.length} source files and ${manifest.preview.length} preview files unchanged.\n`);
} else {
  const commands = JSON.parse(await readFile(join(PROJECT_ROOT, 'evidence/m1/final-commands/results.json'), 'utf8'));
  assert.deepEqual(commands.commands.map(item => [item.command, item.exit]), [['npm test', 0], ['npm run check', 0], ['npm run build', 0]]);
  const before = JSON.parse(await readFile(join(PROJECT_ROOT, 'evidence/m1/environment-before.json'), 'utf8'));
  const after = JSON.parse(await readFile(join(PROJECT_ROOT, 'evidence/m1/environment-after.json'), 'utf8'));
  assert.equal(before.Status, 'PASS'); assert.equal(after.Status, 'PASS');
  assert.deepEqual(after.Snapshots, before.Snapshots);
  const sources = [];
  const add = async path => {
    assert.ok(validRelativePath(path));
    const stat = await lstat(join(PROJECT_ROOT, path));
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = await readFile(join(PROJECT_ROOT, path));
    sources.push({ path, bytes: bytes.length, sha256: fingerprint(bytes) });
  };
  const visit = async path => {
    for (const entry of await readdir(join(PROJECT_ROOT, path), { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      assert.ok(!entry.isSymbolicLink());
      if (entry.isDirectory()) await visit(child); else await add(child);
    }
  };
  for (const entry of await readdir(PROJECT_ROOT, { withFileTypes: true })) if (entry.isFile() && (entry.name.endsWith('.md') || ['package.json', '.gitignore'].includes(entry.name))) await add(entry.name);
  for (const path of ['public', 'scripts', 'test', 'docs']) await visit(path);
  const preview = [];
  for (const file of PUBLIC_FILES) {
    const bytes = await readFile(join(PROJECT_ROOT, 'dist', file));
    assert.deepEqual(bytes, await readFile(join(PROJECT_ROOT, 'public', file)));
    preview.push({ path: relative(PROJECT_ROOT, join(PROJECT_ROOT, 'dist', file)).replaceAll('\\', '/'), bytes: bytes.length, sha256: fingerprint(bytes) });
  }
  sources.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  await writeFile(manifestPath, `${JSON.stringify({ schema: 'gq.m1-candidate', version: '0.1.0-m1', status: 'FROZEN_M1_CANDIDATE_BROWSER_GATES_PENDING', node: process.version, sources, preview }, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`PASS: frozen ${sources.length} source files and ${preview.length} identical preview files.\n`);
}
