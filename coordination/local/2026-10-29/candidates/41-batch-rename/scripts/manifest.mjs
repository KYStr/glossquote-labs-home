import { createHash } from 'node:crypto';
import { readFile, writeFile, lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, PUBLIC_FILES, inspectTree, assertPublicTree } from './check.mjs';

// A closed, reviewable source set. Evidence/dist never enter the source set.
const top = ['.gitignore', 'ACCEPTANCE.md', 'AGENTS.md', 'HANDOFF.md', 'PRODUCT.md', 'README.md', 'START-HERE.md', 'TASK-ENTRY.md', 'TASKS.md', 'TECHNICAL.md', 'UX-SEO.md', 'package.json'];
const scripts = ['build.mjs', 'check.mjs', 'manifest.mjs', 'serve.mjs', 'verify-zip.mjs'];
const tests = ['boundary.test.mjs', 'filename-planner.test.mjs', 'privacy-contract.test.mjs', 'scaffold.test.mjs', 'ui-contract.test.mjs', 'verify-zip.py', 'zip-store.test.mjs'];
const docs = ['BRAND.md', 'DESIGN-SYSTEM.md', 'ENGINEERING.md', 'GIT-PUBLICATION-SAFETY.md', 'PRIVACY-SECURITY.md'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function exact(folder, expected) {
  if (JSON.stringify(await inspectTree(join(ROOT, folder))) !== JSON.stringify([...expected].sort())) throw new Error('SOURCE_ALLOWLIST');
}
async function entries(paths) {
  const records = [];
  for (const path of [...paths].sort()) {
    const absolute = join(ROOT, path); const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('UNSAFE_SOURCE');
    const bytes = await readFile(absolute); records.push({ path, bytes: bytes.length, sha256: sha(bytes) });
  }
  return records;
}
await assertPublicTree(); await assertPublicTree(join(ROOT, 'dist'));
await exact('scripts', scripts); await exact('test', tests); await exact('docs', docs);
const allowedRoot = new Set([...top, 'docs', 'public', 'scripts', 'test', 'dist', 'evidence']);
for (const name of await readdir(ROOT)) if (!allowedRoot.has(name)) throw new Error('UNREVIEWED_ROOT_FILE');
const sources = await entries([...top, ...PUBLIC_FILES.map(p => `public/${p}`), ...scripts.map(p => `scripts/${p}`), ...tests.map(p => `test/${p}`), ...docs.map(p => `docs/${p}`)]);
const output = await entries(PUBLIC_FILES.map(p => `dist/${p}`));
for (const file of output) {
  const original = sources.find(source => source.path === file.path.replace('dist/', 'public/'));
  if (file.sha256 !== original.sha256 || file.bytes !== original.bytes) throw new Error('DIST_MISMATCH');
}
const canonical = records => records.map(file => `${file.path}\t${file.bytes}\t${file.sha256}\n`).join('');
const manifest = { candidate: 'NEW22-41-M1 / 0.1.0', generatedForDate: '2026-10-22 Asia/Taipei', sourceFiles: sources.length,
  sourceBytes: sources.reduce((sum, file) => sum + file.bytes, 0), sourceSetSha256: sha(canonical(sources)), sources,
  distFiles: output.length, distBytes: output.reduce((sum, file) => sum + file.bytes, 0), distSetSha256: sha(canonical(output)), dist: output,
  note: 'Local noindex candidate. All B gates NOT_RUN_USER_FOCUS_INCIDENT. No source commit or live release.' };
await writeFile(join(ROOT, 'evidence', 'm1', 'source-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: 'PASS', sourceFiles: manifest.sourceFiles, sourceBytes: manifest.sourceBytes, sourceSetSha256: manifest.sourceSetSha256, distFiles: manifest.distFiles, distBytes: manifest.distBytes, distSetSha256: manifest.distSetSha256 }));
