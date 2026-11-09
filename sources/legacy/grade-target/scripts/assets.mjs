import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { renderPage } from './generate-pages.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicFiles = ['en/index.html', 'index.html', 'js/app.js', 'js/core/build-report.js', 'js/core/calculate-target.js', 'js/core/exact.js', 'js/lifecycle.js', 'styles/app.css'];
export const headers = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store'
};
export const extraFiles = {
  'robots.txt': 'User-agent: *\nDisallow: /\n',
  '404.html': '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>404 · Gloss Tools</title><h1>404</h1><p>找不到頁面 / Page not found</p></html>\n',
  '_headers': '/*\n' + Object.entries(headers).map(([key,value]) => `  ${key}: ${value}`).join('\n') + '\n'
};
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export async function inventory(directory) {
  const found = [];
  async function walk(path, relative = '') {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1))) throw new Error('unsafe-file-type');
    if (!stat.isDirectory()) { found.push(relative); return; }
    const entries = (await readdir(path)).sort();
    if (entries.length === 0) throw new Error('empty-directory');
    for (const entry of entries) await walk(join(path, entry), relative ? `${relative}/${entry}` : entry);
  }
  await walk(resolve(directory)); return found.sort();
}
export async function sourceContents() {
  const found = await inventory(join(root, 'public'));
  if (JSON.stringify(found) !== JSON.stringify([...publicFiles].sort())) throw new Error('unexpected-public-file');
  const files = new Map();
  for (const path of publicFiles) files.set(path, await readFile(join(root, 'public', path)));
  for (const [language, path] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) {
    if (files.get(path).toString() !== renderPage(language)) throw new Error('stale-html');
  }
  for (const [path, bytes] of files) {
    const text = bytes.toString('utf8');
    if (path.endsWith('.js') && /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|localStorage|sessionStorage|indexedDB|caches|serviceWorker|sendBeacon|console|innerHTML|outerHTML|eval)\b|\bnew\s+Function\b|document\s*\.\s*cookie|history\s*\./u.test(text)) throw new Error('forbidden-browser-capability');
    if (/\.(?:html|css)$/u.test(path) && /(?:https?:)?\/\/(?:fonts\.|cdn\.)|@import|on(?:click|submit|load)=/iu.test(text)) throw new Error('external-or-inline-code');
  }
  return files;
}
export async function expectedBuild() {
  const files = await sourceContents();
  for (const [path, text] of Object.entries(extraFiles)) files.set(path, Buffer.from(text));
  return files;
}
export async function verifyBuild() {
  const expected = await expectedBuild();
  const dir = join(root, 'dist');
  const found = await inventory(dir);
  if (JSON.stringify(found) !== JSON.stringify([...expected.keys(), 'manifest.json'].sort())) throw new Error('unexpected-build-file');
  const manifest = [];
  for (const [path, bytes] of [...expected].sort(([a],[b]) => a.localeCompare(b, 'en'))) {
    const actual = await readFile(join(dir, path));
    if (!bytes.equals(actual)) throw new Error('stale-build');
    manifest.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const recorded = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  if (JSON.stringify(recorded) !== JSON.stringify({ schemaVersion: 1, mode: 'preview', files: manifest })) throw new Error('invalid-manifest');
  return manifest;
}
