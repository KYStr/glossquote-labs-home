import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const assets = Object.freeze(['index.html', 'en/index.html', '404.html', '_headers', 'robots.txt', 'styles/app.css', 'js/app.js', 'js/core/parse-clock.js', 'js/core/parse-duration.js', 'js/core/validation.js', 'js/core/schedule.js', 'js/core/report.js']);
export const scriptFiles = Object.freeze(['files.mjs', 'serve.mjs', 'check.mjs', 'build.mjs', 'production.mjs', 'build-production.mjs', 'check-production.mjs', 'preview-production.mjs', 'release-check.mjs']);
export const securityHeaders = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), clipboard-write=(self)',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'"
});

export async function inspectTree(directory, expected = assets) {
  const base = resolve(root, directory);
  if (!relative(root, base) || relative(root, base).startsWith('..')) throw new Error('Unsafe tree root');
  if (expected.some(path => path.includes('\\') || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..'))) throw new Error('Unsafe allowlist path');
  const found = [];
  const directories = new Set(['']);
  for (const path of expected) {
    const parts = path.split('/');
    for (let index = 1; index < parts.length; index++) directories.add(parts.slice(0, index).join('/'));
  }
  async function visit(path) {
    const info = await lstat(path);
    if (info.isSymbolicLink() || await realpath(path) !== path) throw new Error('Unsafe linked path');
    if (info.isDirectory()) {
      if (!directories.has(relative(base, path).replaceAll('\\', '/'))) throw new Error('Unexpected directory');
      for (const entry of await readdir(path)) await visit(join(path, entry));
    } else {
      if (!info.isFile() || info.nlink !== 1) throw new Error('Unsafe file');
      found.push(relative(base, path).replaceAll('\\', '/'));
    }
  }
  await visit(base);
  if (JSON.stringify(found.sort()) !== JSON.stringify([...expected].sort())) throw new Error(`Unexpected ${directory} file set`);
  return base;
}

export async function inspectSource() {
  await inspectTree('public');
  for (const path of assets) {
    const body = await readFile(join(root, 'public', path), 'utf8');
    if (path.endsWith('.html')) {
      if (!body.includes('name="robots" content="noindex,nofollow"') || /canonical|hreflang|ld\+json|property="og:/.test(body)) throw new Error('Preview metadata mismatch');
      if (/<script(?![^>]*\bsrc=)[\s>]|\son\w+=|<style[\s>]|\sstyle=/.test(body)) throw new Error('Inline code');
      const sources = [...body.matchAll(/\b(?:src|href)="([^"]*)"/g)].map(match => match[1]);
      for (const source of sources) if (!source.startsWith('#') && !['/index.html', '/en/index.html', '/styles/app.css', '/js/app.js', 'https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(source)) throw new Error('Unexpected resource or link');
      if (/<(?:img|iframe|object|embed|base|link\b[^>]*rel="(?:preconnect|dns-prefetch))\b/.test(body)) throw new Error('Unexpected resource element');
    }
    if (path.endsWith('.js')) {
      if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|localStorage|sessionStorage|indexedDB|caches|console|innerHTML|outerHTML|insertAdjacentHTML|DOMParser|eval|execCommand)\b|\bFunction\s*\(|\bimport\s*\(|\b(?:sendBeacon|serviceWorker|cookie|pushState|replaceState)\b/.test(body)) throw new Error(`Prohibited application API: ${path}`);
      for (const match of body.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
        if (!match[1].startsWith('./')) throw new Error('Nonlocal module');
        const target = relative(join(root, 'public'), resolve(root, 'public', dirname(path), match[1])).replaceAll('\\', '/');
        if (!assets.includes(target)) throw new Error('Module outside allowlist');
      }
    }
    if (path.endsWith('.css') && /@import|url\s*\(/i.test(body)) throw new Error('Unexpected CSS resource');
  }
  const expectedHeaders = '/*\n' + Object.entries(securityHeaders).map(([key, value]) => `  ${key}: ${value}`).join('\n') + '\n';
  if (await readFile(join(root, 'public/_headers'), 'utf8') !== expectedHeaders) throw new Error('Header policy mismatch');
  if (await readFile(join(root, 'public/robots.txt'), 'utf8') !== 'User-agent: *\nDisallow: /\n') throw new Error('Preview robots mismatch');
}
