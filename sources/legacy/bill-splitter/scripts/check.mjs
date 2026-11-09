import { readdir, readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeDirectory, validateHtml, validateCss } from './validate.mjs';
import { releaseHtml, robots, sitemap, headers, productionOrigin } from './release.mjs';
import { messages } from '../public/js/i18n.mjs';
import { reportText } from '../public/js/core/report.mjs';
import { securityHeaders } from './serve.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const allowedAssets = new Set(['index.html', 'en/index.html', '404.html', 'en/404.html', '_headers', 'styles/tokens.css', 'styles/app.css', 'js/app.mjs', 'js/i18n.mjs', 'js/core/money.mjs', 'js/core/split.mjs', 'js/core/report.mjs']);
export async function listFiles(directory, base = directory) {
  await safeDirectory(directory);
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const target = path.join(directory, name);
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || name.startsWith('.')) throw new Error('UNSAFE_ASSET');
    if (stat.isDirectory()) files.push(...await listFiles(target, base));
    else if (stat.isFile()) files.push(path.relative(base, target).replaceAll('\\', '/'));
    else throw new Error('UNSAFE_ASSET');
  }
  return files;
}
export async function check({ production = false } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const assets = await listFiles(path.join(root, 'public'));
  if (assets.length !== allowedAssets.size || assets.some(f => !allowedAssets.has(f))) throw new Error('ASSET_ALLOWLIST');
  const expectedHeaders = '/*\n' + Object.entries(securityHeaders).filter(([name]) => name !== 'X-Robots-Tag').map(([name, value]) => `  ${name}: ${value}\n`).join('');
  if (await readFile(path.join(root, 'public', '_headers'), 'utf8') !== expectedHeaders) throw new Error('SECURITY_HEADERS');
  for (const f of assets) {
    const content = await readFile(path.join(root, 'public', f), 'utf8');
    if (/\b(?:innerHTML|outerHTML|eval|localStorage|sessionStorage|indexedDB|sendBeacon|WebSocket|XMLHttpRequest)\b|\bfetch\s*\(|new\s+Function\b|clipboard\.read/.test(content)) throw new Error(`FORBIDDEN_API: ${f}`);
    if (f.endsWith('.mjs')) {
      const result = spawnSync(process.execPath, ['--check', path.join(root, 'public', f)], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`SYNTAX: ${f}`);
    }
    if (f.endsWith('.html')) {
      validateHtml(content, allowedAssets);
    }
    if (f.endsWith('.css')) validateCss(content);
  }
  if (Object.keys(messages.en).sort().join() !== Object.keys(messages['zh-Hant']).sort().join() || Object.keys(reportText.en).sort().join() !== Object.keys(reportText['zh-Hant']).sort().join()) throw new Error('LOCALE_PARITY');
  for (const file of assets.filter(f => f.endsWith('.mjs'))) {
    const source = await readFile(path.join(root, 'public', file), 'utf8');
    for (const match of source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
      if (!match[1].startsWith('.') || !allowedAssets.has(target)) throw new Error('MODULE_REFERENCE');
    }
    if (/\bimport\s*\(/.test(source)) throw new Error('DYNAMIC_IMPORT');
  }
  if (production) await checkDist(true);
  return assets;
}
export async function checkDist(production = false) {
  const directory = path.join(root, 'dist');
  const files = await listFiles(directory);
  const expected = [...allowedAssets, 'robots.txt', 'sitemap.xml'].sort();
  if (files.join() !== expected.join()) throw new Error('DIST_ALLOWLIST');
  const entries = [];
  for (const file of files) {
    const actual = await readFile(path.join(directory, file));
    let content;
    if (file === 'robots.txt') content = robots(production);
    else if (file === 'sitemap.xml') content = sitemap(production);
    else {
      content = await readFile(path.join(root, 'public', file), 'utf8');
      if (production && file.endsWith('.html')) content = releaseHtml(content, file);
      if (file === '_headers') content = headers(content, production);
    }
    if (!actual.equals(Buffer.from(content))) throw new Error(`DIST_CONTENT: ${file}`);
    if (file.endsWith('.html')) validateHtml(actual.toString('utf8'), allowedAssets, { production: production && ['index.html','en/index.html'].includes(file) });
    entries.push({ path: file, bytes: actual.length, sha256: createHash('sha256').update(actual).digest('hex') });
  }
  return { schemaVersion: 1, mode: production ? 'production' : 'preview', origin: production ? productionOrigin : null, files: entries };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(arg => arg !== '--production')) throw new Error('UNKNOWN_ARGUMENT');
  console.log(`CHECK PASS: ${(await check({ production: process.argv.includes('--production') })).length} public assets${process.argv.includes('--production') ? ' and production dist' : ''}`);
}
