import { readdir, lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', 'styles/app.css', 'js/app.js', 'js/conflict-worker.js',
  'js/core/validate.mjs', 'js/core/analyse.mjs', 'js/core/output.mjs'
]);
const directories = new Set(['en', 'styles', 'js', 'js/core']);
export class ProjectError extends Error {
  constructor(code) { super(code); this.name = 'ProjectError'; this.code = code; }
}
export function inside(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.startsWith('/') || /^[A-Za-z]:/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new ProjectError('UNSAFE_PATH');
  const target = path.resolve(root, ...relative.split('/'));
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) throw new ProjectError('UNSAFE_PATH');
  return target;
}
export async function inspectTree(root, { complete = true, optional = false } = {}) {
  let rootInfo;
  try { rootInfo = await lstat(root); } catch (error) { if (optional && error.code === 'ENOENT') return new Map(); throw new ProjectError('TREE_MISSING'); }
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new ProjectError('TREE_LINK_OR_TYPE');
  const found = new Map();
  async function visit(relative = '') {
    const current = relative ? inside(root, relative) : root;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const item = relative ? `${relative}/${entry.name}` : entry.name;
      const target = inside(root, item);
      const info = await lstat(target);
      if (info.isSymbolicLink()) throw new ProjectError('TREE_LINK_OR_TYPE');
      if (info.isDirectory()) {
        if (!directories.has(item)) throw new ProjectError('UNKNOWN_DIRECTORY');
        await visit(item);
      } else if (info.isFile()) {
        if (!PUBLIC_FILES.includes(item)) throw new ProjectError('UNKNOWN_FILE');
        if (info.size > 512 * 1024) throw new ProjectError('ASSET_TOO_LARGE');
        found.set(item, await readFile(target));
      } else throw new ProjectError('TREE_LINK_OR_TYPE');
    }
  }
  await visit();
  if (complete && PUBLIC_FILES.some(file => !found.has(file))) throw new ProjectError('ASSET_MISSING');
  return found;
}
