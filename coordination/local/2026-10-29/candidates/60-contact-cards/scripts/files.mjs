import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  '_headers', 'robots.txt', 'index.html', 'en/index.html', 'styles/app.css',
  'js/app.js', 'js/core/csv.mjs', 'js/core/map-contacts.mjs', 'js/core/vcard.mjs'
]);
export const MIME = Object.freeze({ '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.mjs': 'text/javascript;charset=utf-8', '.txt': 'text/plain;charset=utf-8' });

export async function inspectTree(directory, allowedFiles = PUBLIC_FILES, { missing = false } = {}) {
  let stat;
  try { stat = await lstat(directory); } catch (error) { if (error.code === 'ENOENT' && missing) return []; throw error; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('UNSAFE_ROOT');
  const allowed = new Set(allowedFiles), found = [];
  async function walk(relative = '') {
    const entries = await readdir(join(directory, relative), { withFileTypes: true });
    for (const entry of entries) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const item = await lstat(join(directory, name));
      if (item.isSymbolicLink()) throw new Error(`LINK_REJECTED:${name}`);
      if (item.isDirectory()) {
        if (![...allowed].some((file) => file.startsWith(`${name}/`))) throw new Error(`UNKNOWN_DIRECTORY:${name}`);
        await walk(name);
      } else if (item.isFile() && allowed.has(name)) found.push(name);
      else throw new Error(`UNKNOWN_FILE:${name}`);
    }
  }
  await walk();
  if (!missing && (found.length !== allowed.size || [...allowed].some((name) => !found.includes(name)))) throw new Error('MISSING_FILE');
  return found.sort();
}

export async function readPublic(directory = resolve(ROOT, 'public')) {
  await inspectTree(directory);
  const files = new Map();
  for (const file of PUBLIC_FILES) files.set(file, await readFile(join(directory, file)));
  return files;
}
