import { readdir, readFile, lstat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, publicFiles } from './files.mjs';

const files = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function walk(relative) {
  const absolute = path.join(root, relative);
  const stat = await lstat(absolute);
  if (stat.isSymbolicLink()) throw new Error('FREEZE_LINK_REJECTED');
  if (stat.isDirectory()) {
    for (const name of (await readdir(absolute)).sort()) {
      if (relative === 'test' && name === '.scratch') continue;
      await walk(`${relative}/${name}`);
    }
  } else {
    const bytes = await readFile(absolute);
    files.push({ path: relative, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
}
for (const relative of ['.gitignore', 'package.json', 'public', 'scripts', 'test', 'AGENTS.md', 'START-HERE.md', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md', 'docs', 'HANDOFF.md', 'TASK-ENTRY.md']) await walk(relative);
files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
const dist = [];
for (const file of publicFiles) {
  const built = await readFile(path.join(root, 'dist', file));
  const source = await readFile(path.join(root, 'public', file));
  if (!built.equals(source)) throw new Error('DIST_SOURCE_MISMATCH');
  dist.push({ path: `dist/${file}`, bytes: built.byteLength, sha256: hash(built) });
}
const manifest = { task: 'B20-57-M1', status: 'FROZEN_LOCAL_CANDIDATE_PENDING_PRIMARY_REVIEW', algorithm: 'SHA-256', files, dist, sourceBytes: files.reduce((sum, file) => sum + file.bytes, 0), sourceCount: files.length, distCount: dist.length };
await writeFile(path.join(root, 'evidence/m1/source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Frozen ${files.length} source/document files; ${dist.length} dist files match source bytes.`);
