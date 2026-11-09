import { lstat, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const ASSETS = Object.freeze([
  '404.html', 'en/index.html', 'index.html', 'js/app.mjs',
  'js/core/subscription-budget.mjs', 'js/i18n.mjs', 'robots.txt', 'styles.css'
]);
export const HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store'
});

export function inside(base, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('UNSAFE_PATH');
  }
  const target = path.resolve(base, ...relative.split('/'));
  if (!target.startsWith(`${path.resolve(base)}${path.sep}`)) throw new Error('UNSAFE_PATH');
  return target;
}

export async function inspectTree(base, { optional = false, allowed = ASSETS } = {}) {
  let stat;
  try { stat = await lstat(base); } catch (error) {
    if (optional && error.code === 'ENOENT') return [];
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('UNSAFE_DIRECTORY');
  const files = [];
  async function walk(directory, prefix) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`;
      const absolute = inside(base, relative);
      const info = await lstat(absolute);
      if (info.isSymbolicLink()) throw new Error('LINK_REJECTED');
      if (info.isDirectory()) {
        if (!allowed.some(file => file.startsWith(`${relative}/`))) throw new Error('UNKNOWN_DIRECTORY');
        await walk(absolute, `${relative}/`);
      } else {
        if (!info.isFile() || info.nlink !== 1) throw new Error('LINK_OR_SPECIAL_FILE_REJECTED');
        if (!allowed.includes(relative)) throw new Error('UNKNOWN_ASSET');
        files.push(relative);
      }
    }
  }
  await walk(base, '');
  return files.sort();
}

export async function validateSource() {
  const publicDir = path.join(ROOT, 'public');
  const files = await inspectTree(publicDir);
  if (JSON.stringify(files) !== JSON.stringify(ASSETS)) throw new Error('MISSING_ASSET');
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  if (!pkg.private || pkg.type !== 'module' || pkg.dependencies || pkg.devDependencies || pkg.optionalDependencies) throw new Error('PACKAGE_CONTRACT');
  for (const file of ASSETS) {
    const text = await readFile(inside(publicDir, file), 'utf8');
    if (text.includes('\ufffd')) throw new Error('INVALID_UTF8_SOURCE');
    if (/\.(?:innerHTML|outerHTML)\b|\b(?:eval|Function)\s*\(|document\.write\b/.test(text)) throw new Error('UNSAFE_DOM');
    if (file.endsWith('.mjs')) {
      if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker)\b|document\.cookie|console\.|\b(?:location|history)\s*\./.test(text)) throw new Error('NETWORK_OR_PERSISTENCE_API');
      for (const match of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
        const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
        if (!match[1].startsWith('./') || !ASSETS.includes(dependency)) throw new Error('UNREVIEWED_IMPORT');
      }
    }
    if (file.endsWith('.html')) {
      if (!text.includes('content="noindex,nofollow"') || /rel="canonical"|application\/ld\+json|hreflang="x-default"/.test(text)) throw new Error('PREVIEW_INDEXING');
      if (/\son\w+\s*=|<style\b|style=|<script(?![^>]*src=)/.test(text)) throw new Error('INLINE_CODE');
      for (const match of text.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
        const reference = match[1];
        if (reference.startsWith('#')) continue;
        if (reference.startsWith('https:')) {
          if (!/^https:\/\/glossquote\.com\/(?:en\/)?index\.html$/.test(reference)) throw new Error('UNAPPROVED_EXTERNAL_LINK');
          continue;
        }
        const resolved = reference.startsWith('/') ? reference.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file), reference));
        if (!ASSETS.includes(resolved)) throw new Error('BROKEN_ASSET_REFERENCE');
      }
      if (file !== '404.html') {
        const lang = file.startsWith('en/') ? 'en' : 'zh-Hant';
        const home = lang === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
        if (!text.includes(`<html lang="${lang}">`) || !text.includes(`<noscript>`) || !text.includes(home)) throw new Error('LANGUAGE_CONTRACT');
        for (const id of ['example', 'clear', 'add', 'calculate', 'copy', 'download']) {
          if (!new RegExp(`<button\\b(?=[^>]*id="${id}")(?=[^>]*\\bdisabled)[^>]*>`).test(text)) throw new Error('NOSCRIPT_ACTION_ENABLED');
        }
        const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
        if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_DOM_ID');
        if ([...text.matchAll(/<details>/g)].length !== 5 || !text.includes('id="language-note"')) throw new Error('MISSING_HELP');
      }
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(text)) throw new Error('EXTERNAL_STYLE_ASSET');
  }
  return files;
}

export async function validateBuild() {
  const output = path.join(ROOT, 'dist');
  const files = await inspectTree(output);
  if (JSON.stringify(files) !== JSON.stringify(ASSETS)) throw new Error('BUILD_ASSET_SET');
  for (const file of ASSETS) {
    const [source, built] = await Promise.all([
      readFile(inside(path.join(ROOT, 'public'), file)), readFile(inside(output, file))
    ]);
    if (!source.equals(built)) throw new Error('STALE_BUILD');
  }
  return files;
}
