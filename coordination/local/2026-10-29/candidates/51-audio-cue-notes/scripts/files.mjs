import { readdir, lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', 'css/app.css',
  'js/app.js', 'js/ui.js', 'js/i18n.js', 'js/audio-controller.js',
  'js/downloads.js', 'js/workspace.js', 'js/core/notes.js',
  'js/core/validate-json.js', 'js/core/serialize-json.js', 'js/core/serialize-markdown.js'
]);
export const root = new URL('../', import.meta.url);

export function requireNode24() {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Node.js 24 is required for this candidate.');
}

export async function closedTree(base, { complete = true, allowMissing = false } = {}) {
  const files = [];
  try {
    // lstat on a directory URL ending in '/' can inspect its target on POSIX.
    // Resolve the decoded native path first, preserving filesystem roots while
    // removing non-root trailing separators, then inspect the link itself.
    const nativeBase = resolve(base instanceof URL ? fileURLToPath(base) : base);
    if ((await lstat(nativeBase)).isSymbolicLink()) throw new Error('Refusing linked tree root.');
  } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return files;
    throw error;
  }
  const visit = async (folder, prefix = '') => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = prefix + entry.name;
      const target = new URL(entry.name, folder);
      const stats = await lstat(target);
      if (stats.isSymbolicLink()) throw new Error(`Refusing linked entry: ${path}`);
      if (stats.isDirectory()) {
        if (!PUBLIC_FILES.some(file => file.startsWith(`${path}/`))) throw new Error(`Unknown directory: ${path}`);
        await visit(new URL(`${entry.name}/`, folder), `${path}/`);
      } else {
        if (!stats.isFile() || !PUBLIC_FILES.includes(path)) throw new Error(`Unknown file: ${path}`);
        files.push(path);
      }
    }
  };
  await visit(base);
  if (complete && (files.length !== PUBLIC_FILES.length || PUBLIC_FILES.some(file => !files.includes(file)))) {
    throw new Error('Static file tree is incomplete.');
  }
  return files.sort();
}

export async function previewMetadata(base) {
  for (const file of ['index.html', 'en/index.html']) {
    const html = await readFile(new URL(file, base), 'utf8');
    if (!html.includes('<meta name="robots" content="noindex, nofollow, noarchive">')) {
      throw new Error(`Preview robots missing: ${file}`);
    }
  }
}
