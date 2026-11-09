import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, requireNode24, assertPublicTree } from './assets.mjs';
import { PUBLIC_FILES } from './assets.mjs';
import { renderPage } from './pages.mjs';

const SEO = Object.freeze({
  'zh-Hant': { title: '批次文字套版｜依名單產生個人化通知', description: '貼上 CSV 名單和通知範本，逐筆預覽個人化文字，找出缺值後下載 TXT 或 JSON；不會寄送訊息。', h1: '一份通知，逐人套入名單' },
  en: { title: 'Personalize Text from a CSV List | Preview Every Message', description: 'Add a CSV list and a {{column}} template, review each generated message, and download text or JSON. Nothing is sent.', h1: 'Turn one template into reviewed messages' },
});

export function validatePreviewHtml(source, file) {
  const language = file === 'en/index.html' ? 'en' : 'zh-Hant';
  const expected = SEO[language];
  for (const [pattern, value] of [[/<title>([^<]*)<\/title>/g, expected.title], [/<h1>([^<]*)<\/h1>/g, expected.h1], [/<meta name="description" content="([^"]*)">/g, expected.description]]) {
    const matches = [...source.matchAll(pattern)];
    if (matches.length !== 1 || matches[0][1] !== value) throw new Error('Preview title/description/H1 mismatch.');
  }
  if (!source.includes(`<html lang="${language}">`) || [...source.matchAll(/<meta name="robots" content="([^"]*)">/g)].length !== 1 ||
      !source.includes('<meta name="robots" content="noindex,nofollow">') || /rel="canonical"|application\/ld\+json|sitemap/i.test(source)) throw new Error('Preview SEO contract failed.');
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate element ID.');
  for (const id of ['csv', 'csv-file', 'template', 'allow-blank', 'row-number', 'copy-text']) {
    if (!ids.includes(id) || !source.includes(`<label for="${id}">`)) throw new Error('Missing field or visible label.');
  }
  for (const attribute of ['aria-describedby', 'aria-labelledby', 'for']) {
    for (const match of source.matchAll(new RegExp(`\\b${attribute}="([^"]+)"`, 'g'))) {
      for (const id of match[1].split(/\s+/)) if (!ids.includes(id)) throw new Error('Broken label/help relationship.');
    }
  }
  for (const match of source.matchAll(/\b(?:src|href|action)="([^"]*)"/g)) {
    const url = match[1];
    if (/^https?:/.test(url)) {
      const home = `https://glossquote.com/${language === 'en' ? 'en/' : ''}index.html`;
      if (url !== home || !match[0].startsWith('href=')) throw new Error('Unapproved external resource or wrong-language homepage.');
    } else if (url.startsWith('#')) {
      if (!ids.includes(url.slice(1))) throw new Error('Broken in-page route.');
    } else {
      if (/^(?:\/\/|[a-z]+:)/i.test(url) || /[?#\\]/.test(url)) throw new Error('Non-local or state-bearing resource.');
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), url));
      if (!PUBLIC_FILES.includes(target)) throw new Error('Unknown local resource.');
    }
  }
  if (/\son[a-z]+\s*=|<(?:iframe|object|embed|base|form)\b/i.test(source)) throw new Error('Unsafe HTML capability.');
  if (!source.includes('role="status"') || !source.includes('aria-live="polite"') || !source.includes('<noscript>')) throw new Error('Missing status or no-script path.');
}

export function validateBrowserSource(source, file) {
  if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|Function|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|SharedWorker)\b|\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\s*\(|\bdocument\.write\b|\bconsole\.|\bsendBeacon\b|\bimport\s*\(/.test(source)) throw new Error(`Forbidden browser capability: ${file}`);
  for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) throw new Error('Only relative local modules are allowed.');
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
    if (!PUBLIC_FILES.includes(target)) throw new Error('Unknown module dependency.');
  }
}

export async function checkProject() {
  requireNode24();
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.private !== true || pkg.type !== 'module' || pkg.engines?.node !== '>=24' ||
      ['dependencies', 'devDependencies', 'optionalDependencies'].some(key => Object.keys(pkg[key] ?? {}).length)) {
    throw new Error('Package must be private ESM, Node 24+, without dependencies.');
  }
  const files = await assertPublicTree(path.join(ROOT, 'public'));
  let checked = 0;
  for (const file of files) {
    const source = await readFile(path.join(ROOT, 'public', file), 'utf8');
    if (/\.(?:m?js)$/.test(file)) {
      validateBrowserSource(source, file);
      const result = spawnSync(process.execPath, ['--check', path.join(ROOT, 'public', file)], { shell: false, windowsHide: true, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`ESM syntax check failed: ${file}`);
      checked++;
    }
    if (file.endsWith('.html')) {
      validatePreviewHtml(source, file);
      if (source !== renderPage(file === 'en/index.html' ? 'en' : 'zh-Hant')) throw new Error('Static pages are out of sync; run node scripts/pages.mjs --write.');
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(source)) throw new Error('Remote or embedded CSS resource rejected.');
  }
  if ((await readFile(path.join(ROOT, 'public/robots.txt'), 'utf8')).trim() !== 'User-agent: *\nDisallow: /') throw new Error('Preview robots must disallow all.');
  const headers = await readFile(path.join(ROOT, 'public/_headers'), 'utf8');
  for (const value of ["connect-src 'none'", "object-src 'none'", "base-uri 'none'", 'X-Content-Type-Options: nosniff', 'Referrer-Policy: no-referrer', 'X-Robots-Tag: noindex, nofollow']) if (!headers.includes(value)) throw new Error('Missing preview security header.');
  const scripts = (await readdir(path.join(ROOT, 'scripts'))).filter(file => file.endsWith('.mjs'));
  for (const file of scripts) {
    const result = spawnSync(process.execPath, ['--check', path.join(ROOT, 'scripts', file)], { shell: false, windowsHide: true });
    if (result.status !== 0) throw new Error(`Script syntax check failed: ${file}`);
  }
  return { publicFiles: files.length, browserModules: checked, scripts: scripts.length, note: 'Static scan is not browser or security acceptance.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await checkProject())}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
