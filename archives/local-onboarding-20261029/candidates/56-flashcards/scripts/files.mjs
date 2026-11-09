import { lstatSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', '404.html', '_headers', 'robots.txt',
  'styles/app.css', 'js/app.mjs', 'js/core/schema.mjs', 'js/core/csv.mjs', 'js/core/deck.mjs', 'js/core/export.mjs',
  'js/controller.mjs', 'js/locales/zh-Hant.mjs', 'js/locales/en.mjs',
]);

export function closedTree(directory, allowed, { required = true } = {}) {
  const base = resolve(directory);
  const rootInfo = lstatSync(base, { throwIfNoEntry: false });
  if (!rootInfo) {
    if (required) throw new Error('MISSING_TREE');
    return [];
  }
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('UNSAFE_TREE');
  const directories = new Set(['']);
  for (const path of allowed) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('UNSAFE_ALLOWLIST');
    const parts = path.split('/');
    parts.pop();
    while (parts.length) { directories.add(parts.join('/')); parts.pop(); }
  }
  const found = [];
  function visit(relative) {
    for (const name of readdirSync(join(base, relative))) {
      const path = relative ? `${relative}/${name}` : name;
      const info = lstatSync(join(base, path));
      if (info.isSymbolicLink()) throw new Error('LINK_REJECTED');
      if (info.isDirectory()) {
        if (!directories.has(path)) throw new Error('UNKNOWN_DIRECTORY');
        visit(path);
      } else if (info.isFile() && allowed.includes(path)) found.push(path);
      else throw new Error('UNKNOWN_FILE');
    }
  }
  visit('');
  if (required && allowed.some(path => !found.includes(path))) throw new Error('MISSING_FILE');
  return found.sort();
}
