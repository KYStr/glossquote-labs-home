import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const ASSETS = Object.freeze(['en/index.html', 'index.html', 'js/app.mjs', 'js/core/civil-date.mjs', 'js/core/reading-plan.mjs', 'js/core/report.mjs', 'js/i18n.mjs', 'robots.txt', 'styles/app.css']);
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const isMain = (url) => Boolean(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(url));

export async function checkedTree(directory, files = ASSETS) {
  const root = resolve(directory);
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('UNSAFE_ROOT');
  const actualRoot = await realpath(root);
  const expectedFiles = new Set(files);
  const expectedDirs = new Set(['']);
  for (const file of files) {
    const parts = file.split('/'); parts.pop();
    while (parts.length) { expectedDirs.add(parts.join('/')); parts.pop(); }
  }
  const found = [];
  async function walk(rel) {
    const full = join(root, rel);
    const entries = await readdir(full, { withFileTypes: true });
    for (const entry of entries) {
      const name = rel ? `${rel}/${entry.name}` : entry.name;
      const path = join(root, name);
      const stat = await lstat(path);
      const resolved = await realpath(path);
      const within = relative(actualRoot, resolved);
      if (within.startsWith('..') || within.includes(':') || stat.isSymbolicLink()) throw new Error('UNSAFE_LINK');
      if (stat.isDirectory()) {
        if (!expectedDirs.has(name)) throw new Error('UNEXPECTED_DIRECTORY');
        await walk(name);
      } else {
        if (!stat.isFile() || stat.nlink !== 1 || !expectedFiles.has(name)) throw new Error('UNEXPECTED_OR_LINKED_FILE');
        found.push(name);
      }
    }
  }
  await walk('');
  if (found.length !== files.length || files.some((name) => !found.includes(name))) throw new Error('MISSING_ASSET');
  return Promise.all([...files].sort().map(async (path) => {
    const bytes = await readFile(join(root, path));
    return { path, bytes: bytes.length, sha256: sha256(bytes) };
  }));
}

export async function verifyDist(root = ROOT) {
  const [source, output] = await Promise.all([checkedTree(join(root, 'public')), checkedTree(join(root, 'dist'))]);
  if (JSON.stringify(source) !== JSON.stringify(output)) throw new Error('STALE_BUILD');
  return output;
}
