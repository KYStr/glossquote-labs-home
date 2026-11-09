import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', 'styles/app.css', 'js/app.js', 'js/planner-worker.js',
  'js/core/validate.mjs', 'js/core/graph.mjs', 'js/core/calendar.mjs', 'js/core/backplan.mjs', 'js/core/output.mjs'
]);

export async function inspectTree(directory, { requireAll = true } = {}) {
  const root = resolve(directory);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || await realpath(root) !== root) throw new Error('UNSAFE_TREE_ROOT');
  const paths = [];
  const allowedDirectories = new Set(PUBLIC_FILES.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }));
  async function visit(relative) {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const path = resolve(root, name);
      if (!path.startsWith(root + sep) || entry.isSymbolicLink()) throw new Error('UNSAFE_TREE_ENTRY');
      const stat = await lstat(path);
      if (stat.isSymbolicLink() || await realpath(path) !== path) throw new Error('UNSAFE_TREE_ENTRY');
      if (stat.isDirectory()) {
        if (!allowedDirectories.has(name)) throw new Error('UNKNOWN_DIRECTORY');
        await visit(name);
      } else if (stat.isFile() && PUBLIC_FILES.includes(name)) paths.push(name);
      else throw new Error('UNKNOWN_FILE');
    }
  }
  await visit('');
  if (requireAll && (paths.length !== PUBLIC_FILES.length || PUBLIC_FILES.some(file => !paths.includes(file)))) throw new Error('MISSING_FILE');
  return paths.sort();
}

export async function sourceBytes(directory) {
  await inspectTree(directory);
  return new Map(await Promise.all(PUBLIC_FILES.map(async file => [file, await readFile(join(directory, file))])));
}
