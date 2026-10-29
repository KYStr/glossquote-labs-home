import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { ROOT, publicTexts } from './files.mjs';
import zhLocale from '../public/js/locales/zh-Hant.mjs';
import enLocale from '../public/js/locales/en.mjs';
import { renderPage } from './pages.mjs';

export async function check(root = ROOT) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (pkg.private !== true || pkg.type !== 'module' || pkg.engines?.node !== '>=24' || pkg.dependencies || pkg.devDependencies) throw new Error('PACKAGE_CONTRACT');
  const files = await publicTexts(join(root, 'public'));
  for (const [file, source] of files) {
    if (source.includes('\uFFFD')) throw new Error(`UTF8_INVALID:${file}`);
    if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon|serviceWorker)\b|\b(?:fetch|Function)\s*\(|\bconsole\s*\./.test(source)) throw new Error(`FORBIDDEN_API:${file}`);
    if (file.endsWith('.mjs')) {
      const syntax = spawnSync(process.execPath, ['--check', join(root, 'public', file)], { shell: false, windowsHide: true, encoding: 'utf8' });
      if (syntax.status !== 0) throw new Error(`SYNTAX:${file}`);
      for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
        if (!match[1].startsWith('./') && !match[1].startsWith('../')) throw new Error(`EXTERNAL_IMPORT:${file}`);
        const destination = resolve(join(root, 'public', file, '..'), match[1]);
        if (![...files.keys()].some(key => resolve(root, 'public', key) === destination)) throw new Error(`UNKNOWN_IMPORT:${file}`);
      }
      if (file.startsWith('js/core/') && /\b(?:document|window|File|Blob|FileReader|URL|navigator|setTimeout)\b/.test(source)) throw new Error(`IMPURE_CORE:${file}`);
    }
    if (file.endsWith('.html')) {
      if (/\son\w+\s*=|<iframe|<object|<embed|<base\b|<script(?![^>]*\bsrc=)/i.test(source)) throw new Error(`UNSAFE_HTML:${file}`);
      if (!/<meta name="robots" content="noindex,nofollow">/.test(source) || /rel="canonical"|application\/ld\+json/.test(source)) throw new Error(`PREVIEW_INDEXING:${file}`);
      for (const match of source.matchAll(/(?:src|href|action)="([^"]+)"/g)) {
        const value = match[1];
        if (value.startsWith('#')) continue;
        if (value === 'https://glossquote.com/index.html' || value === 'https://glossquote.com/en/index.html') continue;
        const relative = value.replace(/^\//, '');
        if (!files.has(relative)) throw new Error(`UNKNOWN_RESOURCE:${file}`);
      }
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(source)) throw new Error('REMOTE_CSS');
  }
  const zh = files.get('index.html'), en = files.get('en/index.html');
  if (Object.keys(zhLocale).sort().join(',') !== Object.keys(enLocale).sort().join(',') || Object.keys(zhLocale.errors).sort().join(',') !== Object.keys(enLocale.errors).sort().join(',')) throw new Error('LOCALE_PARITY');
  if (zh !== renderPage(zhLocale) || en !== renderPage(enLocale)) throw new Error('STALE_LANGUAGE_PAGE');
  for (const [html, lang, home] of [[zh, 'zh-Hant', 'https://glossquote.com/index.html'], [en, 'en', 'https://glossquote.com/en/index.html']]) {
    if (!html.includes(`<html lang="${lang}">`) || !html.includes(`href="${home}"`) || !/<title>[^<]+<\/title>/.test(html) || !/<h1[^>]*>[^<]+<\/h1>/.test(html) || !/<meta name="description" content="[^"]+">/.test(html)) throw new Error('BILINGUAL_HEAD');
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_ID');
    for (const match of html.matchAll(/\bfor="([^"]+)"/g)) if (!ids.includes(match[1])) throw new Error('LABEL_TARGET');
    for (const match of html.matchAll(/aria-(?:describedby|labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) if (!ids.includes(id)) throw new Error('ARIA_TARGET');
    for (const id of ['left-file','right-file','compare','download-png','download-json']) if (!new RegExp(`id="${id}"[^>]*disabled`).test(html)) throw new Error('INITIALIZATION_NOT_DISABLED');
  }
  if (!zh.includes('href="/en/index.html"') || !en.includes('href="/index.html"')) throw new Error('LANGUAGE_LINK');
  const headers = files.get('_headers');
  for (const required of ["connect-src 'none'", "frame-ancestors 'none'", "default-src 'self'", 'nosniff', 'no-referrer', 'noindex, nofollow']) if (!headers.includes(required)) throw new Error('SECURITY_HEADERS');
  return { files: files.size, status: 'PASS', scope: 'static checks; not browser or security proof' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await check())}\n`); }
  catch (error) { process.stderr.write(`check failed: ${error.message}\n`); process.exitCode = 1; }
}
