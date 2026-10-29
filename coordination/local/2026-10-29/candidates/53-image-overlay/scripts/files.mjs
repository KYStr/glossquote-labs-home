import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', '404.html', '_headers', 'styles/app.css',
  'js/app.mjs', 'js/controller.mjs', 'js/locales/zh-Hant.mjs', 'js/locales/en.mjs',
  'js/core/image-header.mjs', 'js/core/pixels.mjs', 'js/core/geometry.mjs', 'js/core/session.mjs'
]);
export const MIME = Object.freeze({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' });

export async function closedTree(root, { complete = true } = {}) {
  const allowed = new Set(PUBLIC_FILES);
  const directories = new Set(PUBLIC_FILES.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
  }));
  const found = [];
  async function walk(path, prefix = '') {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('UNSAFE_TREE');
    for (const name of await readdir(path)) {
      const relative = prefix ? `${prefix}/${name}` : name;
      const target = join(path, name);
      const item = await lstat(target);
      if (item.isSymbolicLink()) throw new Error('UNSAFE_LINK');
      if (item.isDirectory()) {
        if (!directories.has(relative)) throw new Error('UNKNOWN_DIRECTORY');
        await walk(target, relative);
      } else if (item.isFile() && allowed.has(relative)) found.push(relative);
      else throw new Error('UNKNOWN_FILE');
    }
  }
  await walk(root);
  if (complete && (found.length !== PUBLIC_FILES.length || PUBLIC_FILES.some(file => !found.includes(file)))) throw new Error('MISSING_PUBLIC_FILE');
  return found.sort();
}

export async function publicTexts(root) {
  await closedTree(root);
  return new Map(await Promise.all(PUBLIC_FILES.map(async file => [file, await readFile(join(root, file), 'utf8')])));
}
