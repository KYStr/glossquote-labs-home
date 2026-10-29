import { createHash } from 'node:crypto';
import { readdir, lstat, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, readSources } from './files.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const names = [];
async function collect(relative = '') {
  for (const name of await readdir(path.join(ROOT, relative))) {
    if (!relative && ['.git', 'dist', 'evidence', 'node_modules'].includes(name)) continue;
    const portable = relative ? relative + '/' + name : name;
    assert.ok(!portable.startsWith('/') && !portable.split('/').includes('..') && !portable.includes('\\'));
    const stat = await lstat(path.join(ROOT, portable)); assert.ok(!stat.isSymbolicLink(), 'UNSAFE_SOURCE_LINK');
    if (stat.isDirectory()) await collect(portable);
    else { assert.ok(stat.isFile()); names.push(portable); }
  }
}
await collect();
const records = [];
for (const name of names.sort()) {
  const bytes = await readFile(path.join(ROOT, name)); records.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
}
const inventory = { version: '0.1.0-m1', scope: 'Tool source + immutable specifications; excludes dist/evidence/.git/node_modules',
  sourceTreeSha256: sha(JSON.stringify(records)), files: records };
const target = path.join(ROOT, 'evidence', 'm1', 'source-inventory.json');
if (process.argv[2] === '--verify') {
  assert.deepEqual(JSON.parse((await readFile(target, 'utf8')).replace(/^\uFEFF/u, '')), inventory, 'SOURCE_INVENTORY_CHANGED');
  const manifest = JSON.parse(await readFile(path.join(ROOT, 'dist', 'manifest.json'), 'utf8'));
  const sources = await readSources();
  assert.equal(manifest.mode, 'preview-noindex'); assert.equal(manifest.files.length, sources.size);
  for (const [name, bytes] of sources) {
    assert.deepEqual(await readFile(path.join(ROOT, 'dist', name)), bytes);
    assert.deepEqual(manifest.files.find((f) => f.path === name), { path: name, bytes: bytes.length, sha256: sha(bytes) });
  }
  console.log(`PASS frozen inventory: ${records.length} files; source ${inventory.sourceTreeSha256}; build bytes match.`);
} else {
  assert.equal(process.argv.length, 2, 'UNKNOWN_INVENTORY_ARGUMENT');
  await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, JSON.stringify(inventory, null, 2) + '\n');
  console.log(`FROZEN ${records.length} source files; ${inventory.sourceTreeSha256}`);
}
