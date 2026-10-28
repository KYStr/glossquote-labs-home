import { readFileSync } from 'node:fs';
import { join, resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ROOT, PUBLIC_FILES, closedTree } from './files.mjs';
import { readDeploymentConfig } from './deployment-config.mjs';

export function checkProject(root = ROOT) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE24_REQUIRED');
  readDeploymentConfig(root);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (!pkg.private || pkg.type !== 'module' || pkg.engines?.node !== '>=24' || Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length) throw new Error('PACKAGE_CONTRACT');
  const files = closedTree(join(root, 'public'), PUBLIC_FILES);
  for (const file of files) {
    const path = join(root, 'public', file);
    const source = readFileSync(path, 'utf8');
    if (!source.isWellFormed() || source.includes('\uFFFD')) throw new Error('INVALID_SOURCE_TEXT');
    if (file.endsWith('.mjs')) {
      execFileSync(process.execPath, ['--check', path], { shell: false, windowsHide: true, stdio: 'pipe' });
      if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|Worker|SharedWorker|eval|Function)\b|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write|navigator\.(?:clipboard|sendBeacon|serviceWorker)|console\.|window\.print|\bimport\s*\(/.test(source)) throw new Error('UNSAFE_JS');
      if (file.startsWith('js/core/') && /\b(?:document|window|File|FileReader|Blob|URL|globalThis)\b/.test(source)) throw new Error('CORE_SIDE_EFFECT_BOUNDARY');
      for (const match of source.matchAll(/^\s*import\s+(?:[^'";]+?\s+from\s*)?['"]([^'"]+)['"]/gm)) {
        const target = posix.normalize(posix.join(posix.dirname(file), match[1]));
        if (!match[1].startsWith('.') || !PUBLIC_FILES.includes(target)) throw new Error('NONLOCAL_IMPORT');
      }
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(source)) throw new Error('EXTERNAL_CSS');
    if (file.endsWith('.html')) {
      if (!source.startsWith('<!doctype html>') || !/<meta charset="utf-8">/.test(source) || !/<meta name="robots" content="noindex,nofollow">/.test(source) || !/<title>[^<]+<\/title>/.test(source) || !/<meta name="description" content="[^"]+">/.test(source) || (source.match(/<h1(?:\s[^>]*)?>/g) ?? []).length !== 1) throw new Error('HTML_METADATA');
      if (/\son[a-z]+\s*=|<iframe|<base|http-equiv|<form|<script(?! type="module" src="[^"]+"><\/script>)/i.test(source) || /rel="canonical"|application\/ld\+json/.test(source)) throw new Error('UNSAFE_HTML');
      const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_HTML_ID');
      for (const match of source.matchAll(/\b(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g)) if (match[1].split(' ').some(id => !ids.includes(id))) throw new Error('BROKEN_LABEL_REFERENCE');
      for (const match of source.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
        if (!new RegExp(`<label\\b[^>]*for="${match[1]}"`).test(source) && !new RegExp(`<label\\b[^>]*><input\\b[^>]*id="${match[1]}"`).test(source)) throw new Error('MISSING_FIELD_LABEL');
      }
      for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
        const reference = match[1];
        if (reference.startsWith('#')) continue;
        if (reference.startsWith('https://')) {
          if (!['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(reference)) throw new Error('EXTERNAL_RESOURCE');
        } else {
          const target = reference.startsWith('/') ? reference.slice(1) : posix.normalize(posix.join(posix.dirname(file), reference));
          if (!PUBLIC_FILES.includes(target)) throw new Error('BROKEN_LOCAL_REFERENCE');
        }
      }
    }
  }
  const zh = readFileSync(join(root, 'public/index.html'), 'utf8');
  const en = readFileSync(join(root, 'public/en/index.html'), 'utf8');
  if (!zh.includes('lang="zh-Hant"') || !en.includes('lang="en"') || !zh.includes('https://glossquote.com/index.html') || !en.includes('https://glossquote.com/en/index.html') || !zh.includes('./en/index.html') || !en.includes('../index.html')) throw new Error('BILINGUAL_LINKS');
  if (JSON.stringify([...zh.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])) !== JSON.stringify([...en.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]))) throw new Error('BILINGUAL_STRUCTURE');
  const headers = readFileSync(join(root, 'public/_headers'), 'utf8');
  for (const token of ["default-src 'self'", "connect-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", 'nosniff', 'no-referrer', 'noindex, nofollow']) if (!headers.includes(token)) throw new Error('HEADERS');
  if (readFileSync(join(root, 'public/robots.txt'), 'utf8') !== 'User-agent: *\nDisallow: /\n') throw new Error('PREVIEW_ROBOTS');
  return { files: files.length, scope: 'static structure + syntax; not browser or security proof' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.stdout.write(`${JSON.stringify(checkProject())}\n`); }
  catch (error) { process.stderr.write(`CHECK_FAILED ${/^[A-Z0-9_]+$/.test(error.message) ? error.message : 'SYNTAX_OR_IO'}\n`); process.exitCode = 1; }
}
