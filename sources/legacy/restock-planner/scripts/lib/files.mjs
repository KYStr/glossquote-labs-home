import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const ASSETS = Object.freeze([
  'en/index.html', 'index.html', 'js/app.js', 'js/copy.mjs', 'js/state.mjs', 'js/core/calculate.mjs', 'js/core/report.mjs', 'js/core/schema.mjs', 'styles/app.css', 'styles/tokens.css',
]);
export const MIME = Object.freeze({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8' });
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export async function inventory(directory, expected = ASSETS, { allowMissing = false } = {}) {
  if (!Array.isArray(expected) || new Set(expected).size !== expected.length || expected.some(file => typeof file !== 'string' || !/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(file) || file.split('/').some(part => part === '.' || part === '..') || (file !== '_headers' && !MIME[path.posix.extname(file)]))) throw new Error('Unsafe asset manifest');
  const allowed = new Set(expected);
  const folders = new Set(['']);
  for (const file of expected) {
    let parent = path.posix.dirname(file);
    while (parent !== '.') { folders.add(parent); parent = path.posix.dirname(parent); }
  }
  const files = [];
  async function walk(relative) {
    const absolute = path.join(directory, relative);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error('Symbolic link or junction rejected');
    if (stat.isDirectory()) {
      if (!folders.has(relative)) throw new Error('Unknown asset directory');
      for (const name of (await readdir(absolute)).sort()) await walk(relative ? `${relative}/${name}` : name);
    } else {
      if (!stat.isFile() || stat.nlink !== 1 || !allowed.has(relative)) throw new Error('Unknown or linked asset');
      const bytes = await readFile(absolute);
      files.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  await walk('');
  const actual = files.map(file => file.path).sort();
  if (!allowMissing && (actual.length !== expected.length || actual.some((file, i) => file !== [...expected].sort()[i]))) throw new Error('Missing asset');
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

export async function exists(target) {
  try { await lstat(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
