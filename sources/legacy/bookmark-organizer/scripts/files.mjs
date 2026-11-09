import { readdir, lstat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicRoot = path.join(root, 'public');
export async function listFiles(directory, prefix = '') {
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('Symlink/junction refused');
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const info = await lstat(full);
    if (info.isSymbolicLink()) throw new Error('Symlink/junction refused');
    const relative = prefix + entry.name;
    if (info.isDirectory()) output.push(...await listFiles(full, relative + '/'));
    else if (info.isFile()) output.push(relative);
    else throw new Error('Unknown file type');
  }
  return output.sort();
}
export const PUBLIC_FILES = Object.freeze(['index.html', 'en/index.html', 'css/app.css', 'js/app.js', 'js/ui.js', 'js/copy.js', 'js/parse-worker.js', ...['errors', 'utf8', 'entities', 'tokenizer', 'parser', 'urls', 'organizer', 'export-html', 'export-json', 'session'].map(name => `js/core/${name}.js`)].sort());
export function allowedFile(name) { return PUBLIC_FILES.includes(name); }
export async function sourceFiles() {
  const files = await listFiles(publicRoot);
  if (files.some(name => !allowedFile(name))) throw new Error('Unknown public file');
  if (PUBLIC_FILES.some(name => !files.includes(name))) throw new Error('Missing public file');
  return files;
}
export async function sourceMap() {
  return new Map(await Promise.all((await sourceFiles()).map(async name => [name, await readFile(path.join(publicRoot, name))])));
}
