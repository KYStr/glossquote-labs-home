import { lstat, readdir, readFile } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', '404.html', '_headers', 'robots.txt',
  'styles/app.css', 'js/app.mjs', 'js/controller.mjs',
  'js/locales/zh-Hant.mjs', 'js/locales/en.mjs',
  'js/core/quantities.mjs', 'js/core/shopping.mjs',
  'js/core/schema.mjs', 'js/core/session.mjs',
]);

export function inside(root, target) {
  const part = relative(resolve(root), resolve(target));
  return part !== '' && !part.startsWith(`..${sep}`) && part !== '..' && !part.includes(':');
}

export async function scanTree(root) {
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('UNSAFE_DIRECTORY');
  const files = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const stat = await lstat(path);
      if (!inside(root, path) || stat.isSymbolicLink()) throw new Error('UNSAFE_PATH');
      if (stat.isDirectory()) {
        const rel = relative(root, path).split(sep).join('/');
        if (!PUBLIC_FILES.some(file => file.startsWith(`${rel}/`))) throw new Error('UNKNOWN_DIRECTORY');
        await visit(path);
      } else if (stat.isFile()) files.push(relative(root, path).split(sep).join('/'));
      else throw new Error('UNSAFE_FILE');
    }
  }
  await visit(root);
  return files.sort();
}

export async function validatePublic(root) {
  const actual = await scanTree(root);
  if (JSON.stringify(actual) !== JSON.stringify([...PUBLIC_FILES].sort())) throw new Error('PUBLIC_ALLOWLIST');
  const texts = new Map();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for (const name of actual) texts.set(name, decoder.decode(await readFile(join(root, name))));
  return texts;
}
