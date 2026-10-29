import { lstat, readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_FILES = Object.freeze([
  '404.html', '_headers', 'en/index.html', 'index.html',
  'js/app.mjs', 'js/controller.mjs', 'js/core/format-headers.mjs',
  'js/core/geometry.mjs', 'js/core/session.mjs',
  'js/locales/en.mjs', 'js/locales/zh-Hant.mjs', 'styles/app.css',
]);
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; object-src 'none'; connect-src 'none'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

export function safeAssetPath(name) {
  return typeof name === 'string' && name.length > 0 && !name.includes('\\') &&
    !name.includes('%') && !name.includes(':') && !name.includes('\0') &&
    !isAbsolute(name) && name.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

export async function validateTree(root, { complete = true } = {}) {
  const found = [];
  const dirs = new Set(PUBLIC_FILES.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
  }));
  const walk = async (folder, prefix = '') => {
    const own = await lstat(folder);
    if (!own.isDirectory() || own.isSymbolicLink()) throw new Error('UNSAFE_ASSET_DIRECTORY');
    for (const name of await readdir(folder)) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (!safeAssetPath(path)) throw new Error('UNSAFE_ASSET_PATH');
      const item = await lstat(resolve(folder, name));
      if (item.isSymbolicLink()) throw new Error('UNSAFE_ASSET_LINK');
      if (item.isDirectory() && dirs.has(path)) await walk(resolve(folder, name), path);
      else if (item.isFile() && PUBLIC_FILES.includes(path)) found.push(path);
      else throw new Error('UNKNOWN_PUBLIC_ASSET');
    }
  };
  await walk(root);
  if (complete && (found.length !== PUBLIC_FILES.length || PUBLIC_FILES.some(file => !found.includes(file)))) {
    throw new Error('MISSING_PUBLIC_ASSET');
  }
  return found.sort();
}

const forbidden = [
  /\b(?:fetch|eval|Function|import)\s*\(/,
  /\b(?:XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|caches|cookie|serviceWorker|sendBeacon)\b/,
  /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/,
  /\bdocument\s*\.\s*write\s*\(/,
  /\bconsole\s*\./,
  /\b(?:confirm|prompt|alert)\s*\(/,
  /\b(?:pushState|replaceState)\s*\(/,
];

export async function checkSource(root = ROOT) {
  const publicRoot = resolve(root, 'public');
  await validateTree(publicRoot);
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  if (manifest.private !== true || manifest.type !== 'module' || manifest.engines?.node !== '>=24' ||
      Object.keys(manifest.dependencies ?? {}).length || Object.keys(manifest.devDependencies ?? {}).length) {
    throw new Error('PACKAGE_CONTRACT');
  }
  for (const file of PUBLIC_FILES) {
    const source = await readFile(resolve(publicRoot, file), 'utf8');
    if (file.endsWith('.mjs')) {
      if (forbidden.some(pattern => pattern.test(source))) throw new Error(`FORBIDDEN_API:${file}`);
      const syntax = spawnSync(process.execPath, ['--check', resolve(publicRoot, file)], { encoding: 'utf8', windowsHide: true });
      if (syntax.status !== 0) throw new Error(`ESM_SYNTAX:${file}`);
      for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
        const target = posix.normalize(posix.join(posix.dirname(file), match[1]));
        if (!match[1].startsWith('.') || !PUBLIC_FILES.includes(target)) throw new Error('UNSAFE_MODULE_IMPORT');
      }
    }
    if (file.endsWith('.html')) {
      if (!/<meta\s+name="robots"\s+content="noindex,nofollow"\s*\/?\s*>/i.test(source)) throw new Error('PREVIEW_NOINDEX_REQUIRED');
      if (/\b(?:canonical|hreflang)\s*=|<link[^>]+rel="canonical"|<dialog\b|\son\w+\s*=|<script(?![^>]*\bsrc=)/i.test(source)) throw new Error('UNSAFE_HTML');
      const metaCsp = source.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?\s*>/i)?.[1];
      if (metaCsp !== CSP.replace("; frame-ancestors 'none'", '')) throw new Error('META_CSP_REQUIRED');
      if (/<(?:script|link|img|a)\b[^>]*\b(?:src|href)\s*=\s*[^\s"'>]/i.test(source)) throw new Error('UNSAFE_HTML_RESOURCE');
      for (const match of source.matchAll(/<(script|link|img|a)\b[^>]*\b(?:src|href)\s*=\s*(["'])(.*?)\2/gi)) {
        const tag = match[1].toLowerCase(), value = match[3];
        if (tag === 'a' && ['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(value)) continue;
        const target = value.startsWith('/') ? value.slice(1) : posix.normalize(posix.join(posix.dirname(file), value));
        if (!PUBLIC_FILES.includes(target)) throw new Error('UNSAFE_HTML_RESOURCE');
      }
      const expected = {
        'index.html': { lang: 'zh-Hant', title: '圖片敏感資訊遮蔽工具｜GlossQuote', h1: '遮住圖片中的敏感區域', description: '在瀏覽器中以不透明黑色矩形遮住圖片區域，檢查扁平 PNG，再下載分享副本。由你手動選取；工具不會自動偵測敏感資訊。', home: 'https://glossquote.com/index.html' },
        'en/index.html': { lang: 'en', title: 'Image Redaction Tool | GlossQuote', h1: 'Cover sensitive areas in an image', description: 'Cover image areas with opaque black rectangles in your browser, inspect a flattened PNG, and download a copy. You choose each area; the tool does not detect sensitive information.', home: 'https://glossquote.com/en/index.html' },
      }[file];
      if (expected) {
        if (source.match(/<html\s+lang="([^"]+)"/i)?.[1] !== expected.lang || source.match(/<title>([^<]+)<\/title>/i)?.[1] !== expected.title ||
            source.match(/<h1>([^<]+)<\/h1>/i)?.[1] !== expected.h1 || source.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] !== expected.description ||
            !source.includes(`href="${expected.home}"`) || (source.match(/<h1\b/gi) ?? []).length !== 1) throw new Error('LANGUAGE_METADATA_CONTRACT');
      }
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(source)) throw new Error('EXTERNAL_STYLE_RESOURCE');
  }
  const headers = await readFile(resolve(publicRoot, '_headers'), 'utf8');
  if (!headers.includes(`Content-Security-Policy: ${CSP}`) || !headers.includes('X-Content-Type-Options: nosniff') || !headers.includes('Referrer-Policy: no-referrer')) throw new Error('HEADERS_REQUIRED');
  return PUBLIC_FILES.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`CHECK PASS: ${await checkSource()} allowlisted assets; static scan is not a security audit.\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
