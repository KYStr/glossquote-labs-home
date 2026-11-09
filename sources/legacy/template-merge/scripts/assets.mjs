import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  '_headers', 'robots.txt', 'index.html', 'en/index.html',
  'styles/app.css', 'js/app.js',
  'js/core/errors.mjs', 'js/core/csv.mjs',
  'js/core/template.mjs', 'js/core/render.mjs', 'js/core/export.mjs',
  'js/session.mjs', 'js/strings.mjs',
]);

export function requireNode24() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 or later is required.');
}

export async function listSafeFiles(root) {
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('Unsafe asset root.');
  const files = [];
  async function visit(relative) {
    const entries = await readdir(path.join(root, relative), { withFileTypes: true });
    for (const entry of entries) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const info = await lstat(path.join(root, name));
      if (info.isSymbolicLink()) throw new Error(`Linked asset rejected: ${name}`);
      if (info.isDirectory()) await visit(name);
      else if (info.isFile()) files.push(name);
      else throw new Error('Non-file asset rejected.');
    }
  }
  await visit('');
  return files.sort();
}

export async function assertPublicTree(root, { complete = true } = {}) {
  const files = await listSafeFiles(root);
  const directories = new Set(PUBLIC_FILES.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }));
  async function checkDirectories(relative = '') {
    for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (!directories.has(name)) throw new Error('Unknown asset directory; preserve it for review.');
      await checkDirectories(name);
    }
  }
  await checkDirectories();
  if (files.some(file => !PUBLIC_FILES.includes(file))) throw new Error('Unknown public/output file; preserve it for review.');
  if (complete && files.join('\n') !== [...PUBLIC_FILES].sort().join('\n')) throw new Error('Missing public asset.');
  return files;
}
