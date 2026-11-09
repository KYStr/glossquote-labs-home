import { lstat, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicFiles = Object.freeze([
  'index.html', 'en/index.html', 'styles/app.css', 'js/app.js',
  'js/core/decimal.mjs', 'js/core/quote.mjs',
  'js/core/safe-output.mjs', 'js/core/import.mjs',
]);

export async function inspectTree(directory, { complete = true } = {}) {
  const allowedDirectories = new Set(['', ...publicFiles.flatMap(file => {
    const segments = file.split('/');
    return segments.slice(0, -1).map((_, i) => segments.slice(0, i + 1).join('/'));
  })]);
  const found = [];
  async function walk(relative) {
    const target = path.join(directory, relative);
    const stat = await lstat(target);
    if (stat.isSymbolicLink()) throw new Error('LINK_REJECTED');
    if (await realpath(target) !== path.resolve(target)) throw new Error('REALPATH_REJECTED');
    if (stat.isDirectory()) {
      if (!allowedDirectories.has(relative)) throw new Error('UNKNOWN_DIRECTORY');
      for (const entry of await readdir(target)) {
        await walk(relative ? `${relative}/${entry}` : entry);
      }
    } else if (stat.isFile() && publicFiles.includes(relative)) {
      found.push(relative);
    } else {
      throw new Error('UNKNOWN_FILE');
    }
  }
  await walk('');
  if (complete && found.length !== publicFiles.length) throw new Error('MISSING_PUBLIC_FILE');
  return found.sort();
}

export const securityHeaders = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});
