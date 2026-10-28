import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { ROOT, inventory, PUBLIC_FILES } from './check.mjs';

const manifestPath = resolve(ROOT, 'evidence/m1/candidate-manifest.json');
const specifications = ['AGENTS.md', 'START-HERE.md', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md', 'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/GIT-PUBLICATION-SAFETY.md', 'docs/PRIVACY-SECURITY.md'];
async function flatSources(folder) {
  const entries = await readdir(resolve(ROOT, folder), { withFileTypes: true });
  assert(entries.every(entry => entry.isFile() && !entry.isSymbolicLink() && entry.name.endsWith('.mjs')), 'Source folder contains an unexpected item');
  return entries.map(entry => `${folder}/${entry.name}`);
}
async function record(path) {
  assert(!path.startsWith('/') && !path.includes('..') && !path.includes('\\'), 'Portable relative path required');
  const location = resolve(ROOT, path), stat = await lstat(location);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Regular files only');
  const bytes = await readFile(location);
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
async function snapshot() {
  const sourceNames = ['package.json', '.gitignore', 'HANDOFF.md', 'TASK-ENTRY.md', ...PUBLIC_FILES.map(path => `public/${path}`), ...await flatSources('scripts'), ...await flatSources('test')].sort();
  assert.deepEqual(await inventory(resolve(ROOT, 'dist')), [...PUBLIC_FILES].sort());
  const sources = await Promise.all(sourceNames.map(record));
  const dist = await Promise.all(PUBLIC_FILES.map(path => record(`dist/${path}`)));
  for (const output of dist) {
    const source = sources.find(file => file.path === output.path.replace(/^dist\//, 'public/'));
    assert.equal(output.bytes, source.bytes); assert.equal(output.sha256, source.sha256);
  }
  return { schemaVersion: 1, candidate: 'B20-48-M1-2026-10-23', sourceSetSha256: createHash('sha256').update(JSON.stringify(sources)).digest('hex'), sources, dist, readOnlySpecifications: await Promise.all(specifications.map(record)) };
}
if (process.argv[2] === 'capture') {
  const candidate = await snapshot();
  await writeFile(manifestPath, JSON.stringify(candidate, null, 2) + '\n');
  console.log(`FROZEN ${candidate.sources.length} source files / ${candidate.dist.length} dist files: ${candidate.sourceSetSha256}`);
} else if (process.argv[2] === 'verify') {
  const stored = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.deepEqual(await snapshot(), stored, 'Frozen candidate drift');
  console.log(`PASS frozen candidate: ${stored.sourceSetSha256}`);
} else throw new Error('Use capture or verify');
