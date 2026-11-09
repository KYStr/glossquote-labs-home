import { lstat, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', 'styles/app.css', 'js/app.mjs', 'js/i18n.mjs', 'js/session.mjs', 'js/draft.mjs',
  'js/core/date.mjs', 'js/core/zone.mjs', 'js/core/event.mjs', 'js/core/ics.mjs',
]);

export async function inventory(directory) {
  const rootStat = await lstat(directory);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('UNSAFE_ROOT');
  const files = [];
  const dirs = new Set(PUBLIC_FILES.flatMap(file => {
    const pieces = file.split('/');
    return pieces.slice(0, -1).map((_, i) => pieces.slice(0, i + 1).join('/'));
  }));
  async function walk(relative = '') {
    for (const name of await readdir(path.join(directory, relative))) {
      const sub = relative ? `${relative}/${name}` : name;
      const stat = await lstat(path.join(directory, sub));
      if (stat.isSymbolicLink()) throw new Error('UNSAFE_LINK');
      if (stat.isDirectory() && dirs.has(sub)) await walk(sub);
      else if (stat.isFile() && PUBLIC_FILES.includes(sub)) files.push(sub);
      else throw new Error('UNKNOWN_PUBLIC_PATH');
    }
  }
  await walk();
  return files.sort();
}

export async function check() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.private !== true || pkg.type !== 'module' || pkg.engines?.node !== '>=24' ||
      Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length) throw new Error('PACKAGE_CONTRACT');
  const files = await inventory(path.join(ROOT, 'public'));
  if (JSON.stringify(files) !== JSON.stringify([...PUBLIC_FILES].sort())) throw new Error('MISSING_PUBLIC_FILE');
  const sources = [];
  for (const file of files) {
    const content = await readFile(path.join(ROOT, 'public', file), 'utf8');
    auditText(file, content);
    if (file.endsWith('.mjs')) {
      const syntax = spawnSync(process.execPath, ['--check', path.join(ROOT, 'public', file)], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 10_000 });
      if (syntax.status !== 0) throw new Error('ESM_SYNTAX');
    }
    sources.push(file);
  }
  for (const name of await readdir(path.join(ROOT, 'scripts'))) {
    if (!name.endsWith('.mjs')) continue;
    const syntax = spawnSync(process.execPath, ['--check', path.join(ROOT, 'scripts', name)], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 10_000 });
    if (syntax.status !== 0) throw new Error('SCRIPT_SYNTAX');
  }
  return sources;
}

export function auditText(file, content) {
  if (content.charCodeAt(0) === 0xfeff || content.includes('\0')) throw new Error('INVALID_SOURCE_ENCODING');
  if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|localStorage|sessionStorage|indexedDB|serviceWorker|XMLHttpRequest|WebSocket)\b|\bfetch\s*\(|\bnavigator\.(?:sendBeacon|clipboard)\b|\bconsole\s*\.|\bdocument\.write\s*\(|\bnew\s+Function\b|\bimport\s*\(/.test(content)) throw new Error('FORBIDDEN_WEB_API');
  if (file.endsWith('.html')) {
    if (!content.includes('<meta name="robots" content="noindex, nofollow">') || !content.includes('<h1>') ||
        /<(?:iframe|object|embed|base)\b|\b(?:on\w+|style)\s*=|\bhttp-equiv\s*=|<script(?![^>]*\bsrc=)[^>]*>/i.test(content)) throw new Error('HTML_CONTRACT');
    const links = new Set(['/styles/app.css', '/js/app.mjs', '/index.html', '/en/index.html', '#main', 'https://glossquote.com/index.html', 'https://glossquote.com/en/index.html']);
    for (const match of content.matchAll(/\s(src|href|action)\s*=\s*(["'])(.*?)\2/gi)) {
      if (match[1].toLowerCase() === 'action' || !links.has(match[3])) throw new Error('RESOURCE_NOT_ALLOWED');
      if (match[1].toLowerCase() === 'src' && match[3] !== '/js/app.mjs') throw new Error('RESOURCE_NOT_ALLOWED');
    }
    if ((content.match(/<script\b/gi) ?? []).length !== 1 || !content.includes('<script type="module" src="/js/app.mjs"></script>') || !content.includes('<link rel="stylesheet" href="/styles/app.css">')) throw new Error('HTML_RESOURCE_CONTRACT');
    if (/rel=["'](?:canonical|alternate)["']/i.test(content)) throw new Error('PREVIEW_URL_NOT_RELEASED');
  }
  if (file.endsWith('.css') && /@import|url\s*\(/i.test(content)) throw new Error('EXTERNAL_STYLE');
  if (file.endsWith('.mjs')) {
    if (file.startsWith('js/core/') && /\b(?:document|window|navigator|Blob)\b/.test(content)) throw new Error('IMPURE_CORE');
    for (const match of content.matchAll(/\b(?:from|import)\s*['"]([^'"]+)['"]/g)) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
      if ((!match[1].startsWith('./') && !match[1].startsWith('../')) || !PUBLIC_FILES.includes(resolved)) throw new Error('IMPORT_NOT_LOCAL');
    }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { process.stdout.write(`CHECK PASS: ${(await check()).length} closed public files; ESM syntax and static restrictions.\n`); }
  catch (error) { process.stderr.write(`CHECK FAIL: ${error.message}\n`); process.exitCode = 1; }
}
