import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  '_headers', 'robots.txt', 'index.html', 'en/index.html', 'styles/app.css',
  'js/app.js', 'js/copy.mjs', 'js/core/errors.mjs', 'js/core/image-preflight.mjs',
  'js/core/layout.mjs', 'js/core/index-text.mjs', 'js/core/generate.mjs', 'js/core/session.mjs',
]);

export async function treeFiles(root, { optional = false } = {}) {
  let rootStat;
  try { rootStat = await lstat(root); } catch (error) {
    if (optional && error.code === 'ENOENT') return [];
    throw error;
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('UNSAFE_TREE_ROOT');
  if (path.resolve(root).toLowerCase() !== (await realpath(root)).toLowerCase()) throw new Error('ALIASED_TREE_ROOT');
  const found = [];
  async function walk(directory, relative = '') {
    for (const entry of await readdir(directory)) {
      const absolute = path.join(directory, entry);
      const stat = await lstat(absolute);
      const name = relative + entry;
      if (!/^[A-Za-z0-9._/-]+$/u.test(name) || entry === '.' || entry === '..' || stat.isSymbolicLink()) throw new Error('UNSAFE_TREE_ENTRY');
      if (stat.isDirectory()) {
        // Empty/unexpected directories are also rejected by the closed allowlist.
        if (!PUBLIC_FILES.some((file) => file.startsWith(name + '/'))) throw new Error('UNKNOWN_DIRECTORY');
        await walk(absolute, name + '/');
      } else if (stat.isFile()) found.push(name);
      else throw new Error('UNSAFE_TREE_ENTRY');
    }
  }
  await walk(root);
  return found.sort();
}

export function assertAllowlist(files, expected = PUBLIC_FILES, { subset = false } = {}) {
  if (files.some((file) => !expected.includes(file)) || (!subset && expected.some((file) => !files.includes(file)))) throw new Error('FILE_ALLOWLIST_MISMATCH');
}

export async function readSources(root = path.join(ROOT, 'public')) {
  const names = await treeFiles(root);
  assertAllowlist(names);
  const map = new Map();
  for (const name of names) map.set(name, await readFile(path.join(root, name)));
  return map;
}
