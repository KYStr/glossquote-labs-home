import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const ASSETS = Object.freeze([
  'index.html', 'en/index.html', 'robots.txt', 'styles/app.css',
  'js/app.mjs', 'js/core/compare.mjs', 'js/state.mjs', 'js/render.mjs', 'js/wording.mjs'
]);
export const PUBLIC_ASSETS = Object.freeze([...ASSETS, '404.html', '_headers', 'sitemap.xml']);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function requireNode24() {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Node.js 24.x is required');
}

export async function walkFiles(root, relative = '') {
  const directory = path.resolve(root, relative);
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Unsafe directory');
  if (path.resolve(await realpath(directory)).toLowerCase() !== directory.toLowerCase()) throw new Error('Directory alias rejected');
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = (relative ? `${relative}/` : '') + entry.name;
    const filename = path.join(root, relativePath);
    const metadata = await lstat(filename);
    if (metadata.isSymbolicLink()) throw new Error('Symbolic link rejected');
    if (metadata.isDirectory()) files.push(...await walkFiles(root, relativePath));
    else if (metadata.isFile() && metadata.nlink === 1) files.push(relativePath);
    else throw new Error('Non-regular file or hardlink rejected');
  }
  return files.sort();
}

export async function readAssets(root, { production = false, source = path.basename(path.resolve(root)) === 'public' } = {}) {
  const actual = await walkFiles(root);
  const expected = production || source ? PUBLIC_ASSETS : ASSETS;
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) throw new Error('Asset tree differs from the fixed allowlist');
  const assets = new Map();
  for (const file of production ? PUBLIC_ASSETS : ASSETS) assets.set(file, await readFile(path.join(root, file)));
  return assets;
}

export async function fileRecords(root, files) {
  const records = [];
  for (const file of [...files].sort()) {
    const info = await lstat(path.join(root, file));
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) throw new Error('Unsafe source file');
    const bytes = await readFile(path.join(root, file));
    records.push({ path: file, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return records;
}
