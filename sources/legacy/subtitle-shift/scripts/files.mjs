import { lstat, readdir, realpath, readFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { ASSETS } from './manifest.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const comparable = path => process.platform === 'win32' ? path.toLowerCase() : path;
export function assertNode(stat, directory) {
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) || (!directory && stat.nlink !== 1)) throw new Error('UNSAFE_FILE_NODE');
}
export function assertAssetPath(path) {
  if (!ASSETS.includes(path)) throw new Error('UNKNOWN_ASSET');
}
export async function inspectTree(root, partial = false) {
  const absolute = resolve(root);
  assertNode(await lstat(absolute), true);
  if (comparable(await realpath(absolute)) !== comparable(absolute)) throw new Error('REDIRECTED_TREE');
  const files = [];
  const allowedDirectories = new Set(ASSETS.flatMap(path => path.includes('/') ? [path.split('/')[0]] : []));
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const name = relative(absolute, path).split('\\').join('/');
      const stat = await lstat(path);
      if (stat.isDirectory()) {
        assertNode(stat, true);
        if (!allowedDirectories.has(name)) throw new Error('UNKNOWN_DIRECTORY');
        await walk(path);
      } else {
        assertNode(stat, false); assertAssetPath(name);
        const bytes = await readFile(path);
        files.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
      }
    }
  }
  await walk(absolute);
  files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (!partial && (files.length !== ASSETS.length || ASSETS.some(name => !files.some(file => file.path === name)))) throw new Error('INCOMPLETE_ASSETS');
  return files;
}
export async function compareTrees(source, destination) {
  const left = await inspectTree(source); const right = await inspectTree(destination);
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error('BUILD_BYTES_MISMATCH');
  return right;
}
