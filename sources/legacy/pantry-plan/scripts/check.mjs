import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ROOT, validatePublic } from './files.mjs';
import { validateDeployment } from './deployment.mjs';

export function inspectPublic(texts) {
  for (const [name, text] of texts) {
    if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval|localStorage|sessionStorage|indexedDB|serviceWorker|XMLHttpRequest|WebSocket|sendBeacon)\b|\bfetch\s*\(|\bconsole\s*\.|\bimport\s*\(|\bnew\s+Function\b/i.test(text)) throw new Error('FORBIDDEN_CAPABILITY');
    if ((name.endsWith('.html') && /\bon[a-z]+\s*=|javascript:|data:text\/html/i.test(text)) || (name.endsWith('.css') && /@import|url\s*\(/i.test(text))) throw new Error('UNSAFE_MARKUP');
    if (name.endsWith('.mjs')) {
      for (const match of text.matchAll(/^[\t ]*import\s+(?:[^'";\r\n]*?\bfrom\s*)?['"]([^'"]+)['"]/gm)) {
        if (!match[1].startsWith('./') && !match[1].startsWith('../')) throw new Error('EXTERNAL_IMPORT');
        const url = new URL(match[1], `https://local.invalid/${name}`);
        if (!texts.has(url.pathname.slice(1)) || !url.pathname.startsWith('/js/')) throw new Error('MISSING_IMPORT');
      }
      if (name.startsWith('js/core/') && /\b(?:document|window|FileReader|Blob|URL|navigator|setTimeout|AbortController)\b/.test(text)) throw new Error('IMPURE_CORE');
    }
    if (name.endsWith('.html')) {
      if (!/<meta name="robots" content="noindex,nofollow">/.test(text) || /rel="canonical"|application\/ld\+json/.test(text)) throw new Error('PREVIEW_INDEXING');
      if (!/<html lang="(?:zh-Hant|en)"/.test(text) || !/<title>[^<]+<\/title>/.test(text) || !/<h1[^>]*>[^<]+<\/h1>/.test(text)) throw new Error('HTML_STRUCTURE');
      if ((text.match(/<h1\b/g) ?? []).length !== 1 || /<(?:iframe|object|embed|base|form|style)\b/i.test(text)) throw new Error('UNSAFE_HTML_ELEMENT');
      const scripts = [...text.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(match => match[0]);
      const expectedScripts = name === '404.html' ? [] : ['<script type="module" src="/js/app.mjs"></script>'];
      if (JSON.stringify(scripts) !== JSON.stringify(expectedScripts)) throw new Error('SCRIPT_ALLOWLIST');
      const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_ID');
      for (const match of text.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*?\b(src|href)="([^"]+)"/gi)) {
        const [, tag, attr, value] = match;
        if (value.startsWith('#')) continue;
        if (value.startsWith('https://glossquote.com/')) {
          if (tag !== 'a' || attr !== 'href' || !['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(value)) throw new Error('EXTERNAL_RESOURCE');
          continue;
        }
        if (!value.startsWith('/') || !texts.has(value.slice(1))) throw new Error('UNKNOWN_RESOURCE');
      }
    }
  }
  const zh = texts.get('index.html');
  const en = texts.get('en/index.html');
  const getIds = text => [...text.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]).sort();
  if (JSON.stringify(getIds(zh)) !== JSON.stringify(getIds(en))) throw new Error('BILINGUAL_STRUCTURE');
  for (const [text, lang, other, home] of [[zh, 'zh-Hant', '/en/index.html', '/index.html'], [en, 'en', '/index.html', '/en/index.html']]) {
    if (!text.includes(`<html lang="${lang}"`) || !text.includes(`href="${other}"`) || !text.includes(`href="https://glossquote.com${home}"`)) throw new Error('BILINGUAL_LINKS');
    if (!text.includes('id="workspace" disabled') || !text.includes('<noscript>')) throw new Error('FAIL_CLOSED_BOOT');
  }
  for (const [name, text] of texts) {
    if (name.endsWith('.mjs') && /(?:https?:|node:|\.\.\/\.\.\/\.\.\/)/.test(text)) throw new Error('SOURCE_BOUNDARY');
  }
  if (texts.get('robots.txt') !== 'User-agent: *\nDisallow: /\n') throw new Error('PREVIEW_ROBOTS');
  for (const directive of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "connect-src 'none'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", 'X-Content-Type-Options: nosniff', 'Referrer-Policy: no-referrer', 'X-Robots-Tag: noindex, nofollow']) {
    if (!texts.get('_headers').includes(directive)) throw new Error('MISSING_HEADER');
  }
}

export async function check(root = ROOT) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (!pkg.private || pkg.type !== 'module' || pkg.engines.node !== '>=24' || pkg.dependencies || pkg.devDependencies) throw new Error('PACKAGE_CONTRACT');
  const deployment = await validateDeployment(root);
  const texts = await validatePublic(join(root, 'public'));
  inspectPublic(texts);
  const files = [...texts.keys()].filter(n => n.endsWith('.mjs')).map(n => join(root, 'public', n));
  for (const dir of ['scripts', 'test']) {
    for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
      if (entry.isSymbolicLink() || !entry.isFile() || !entry.name.endsWith('.mjs')) throw new Error('UNSAFE_SOURCE');
      files.push(join(root, dir, entry.name));
    }
  }
  for (const path of files) {
    const result = spawnSync(process.execPath, ['--check', path], { shell: false, windowsHide: true, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('ESM_SYNTAX');
  }
  return { publicFiles: texts.size, syntaxFiles: files.length, ...deployment };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify({ status: 'PASS', ...await check() })); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
