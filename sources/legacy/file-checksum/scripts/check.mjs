import path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyWorkerSource } from './build-worker.mjs';
import {
  approvedDirectories, assertSafePath, containedPath, inspectTree, readSafeFile,
  requireCondition, resolveLocalReference, validatePreviewHtml,
} from './validation.mjs';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const APPROVED_ASSETS = Object.freeze([
  'index.html', 'en/index.html', 'styles/app.css', 'js/app.mjs',
  'js/core/checksum.mjs', 'js/core/session.mjs', 'js/hash.worker.mjs', 'js/worker-source.mjs',
  'js/controller.mjs', 'js/i18n.mjs',
]);
const TOOL_MODULES = ['scripts/serve.mjs', 'scripts/check.mjs', 'scripts/build.mjs', 'scripts/validation.mjs', 'scripts/build-worker.mjs',
  'test/scaffold.test.mjs', 'test/checksum.test.mjs', 'test/session.test.mjs', 'test/worker.test.mjs', 'test/ui-contract.test.mjs'];
const RUNTIME_FORBIDDEN = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|caches|serviceWorker)\b|\bnew\s+Function\b|\bimport\s*\(|\.cookie\b|clipboard\s*\.\s*read/;
export function decodeUtf8(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { requireCondition(false, 'UTF8_INVALID'); }
}
function checkModuleSyntax(target) {
  const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  requireCondition(!result.error && result.status === 0, 'ESM_SYNTAX_INVALID');
}
export async function validateProject(root = PROJECT_ROOT) {
  requireCondition(Number(process.versions.node.split('.')[0]) >= 24, 'NODE_24_REQUIRED');
  await assertSafePath(root);
  const packageInfo = JSON.parse(decodeUtf8(await readSafeFile(containedPath(root, 'package.json'))));
  requireCondition(packageInfo.private === true && packageInfo.type === 'module' && packageInfo.engines?.node === '>=24', 'PACKAGE_CONTRACT_INVALID');
  requireCondition(!packageInfo.dependencies || Object.keys(packageInfo.dependencies).length === 0, 'RUNTIME_DEPENDENCIES_FORBIDDEN');
  requireCondition(!packageInfo.devDependencies || Object.keys(packageInfo.devDependencies).length === 0, 'UNAPPROVED_DEPENDENCIES');
  for (const [name, command] of Object.entries({ dev: 'node scripts/serve.mjs', test: 'node --test', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs' })) {
    requireCondition(packageInfo.scripts?.[name] === command, 'PACKAGE_COMMAND_INVALID');
  }
  const publicRoot = containedPath(root, 'public');
  const names = await inspectTree(publicRoot, APPROVED_ASSETS);
  const workerSource = await verifyWorkerSource(root);
  const sources = new Map();
  for (const name of names) sources.set(name, await readSafeFile(containedPath(publicRoot, name)));
  const locales = ['index.html', 'en/index.html'].map(page => validatePreviewHtml(decodeUtf8(sources.get(page)), page, APPROVED_ASSETS, { mode: 'tool' }));
  requireCondition(JSON.stringify(locales[0]) === JSON.stringify(locales[1]), 'LOCALE_CONTROL_PARITY');
  for (const [name, bytes] of sources) {
    const source = decodeUtf8(bytes);
    if (name.endsWith('.mjs')) {
      requireCondition(!RUNTIME_FORBIDDEN.test(source), 'RUNTIME_API_FORBIDDEN');
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)(['"])([^'"]+)\1/g)) resolveLocalReference(name, match[2], APPROVED_ASSETS);
      checkModuleSyntax(containedPath(publicRoot, name));
      if (name === 'js/hash.worker.mjs') requireCondition(!/\bimport\b|\beval\s*\(|\bnew\s+Function\b/.test(source), 'WORKER_MUST_BE_SELF_CONTAINED');
    }
    if (name.endsWith('.css')) {
      requireCondition(!/@import\b|@font-face\b/i.test(source), 'CSS_REMOTE_OR_FONT_FORBIDDEN');
      for (const match of source.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi)) resolveLocalReference(name, match[2], APPROVED_ASSETS);
      requireCondition(!source.toLowerCase().includes('url(') || /url\(/i.test(source) && [...source.matchAll(/url\(/gi)].length === [...source.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi)].length, 'CSS_URL_INVALID');
    }
  }
  for (const name of TOOL_MODULES) {
    await readSafeFile(containedPath(root, name));
    checkModuleSyntax(containedPath(root, name));
  }
  const manifest = [...sources].map(([name, bytes]) => ({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }));
  return { root: path.resolve(root), publicRoot, sources, manifest, workerSource };
}
export function isEntryPoint(moduleUrl) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(moduleUrl);
}
export const PRODUCTION_ORIGIN = 'https://checksum.glossquote.com';
export const RELEASE_COMMANDS = Object.freeze({
  'build:production': 'node scripts/build.mjs --production',
  'check:production': 'node scripts/check.mjs --production',
  'release:check': 'node scripts/check.mjs --releasegate --required',
});
export const STATIC_CONFIG = Object.freeze({
  name: 'glossquote-file-checksum',
  compatibility_date: '2026-10-19',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  dependencies_instrumentation: { enabled: false },
  observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } },
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
  routes: [{ pattern: 'checksum.glossquote.com', custom_domain: true }],
});
const LOCALES = Object.freeze([
  {
    page: 'index.html', language: 'zh-Hant', ogLocale: 'zh_TW',
    title: '檔案 SHA-256 校驗與比對｜GlossQuote', name: '檔案 SHA-256 校驗',
    languageNotice: '切換語言會離開當前結果。', previewSentence: '這是開發預覽，尚未正式發布。',
    description: '在瀏覽器本機計算檔案 SHA-256，貼上預期校驗碼立即比對。支援單檔最多128 MiB，可複製或下載校驗碼，無需上傳檔案。',
  },
  {
    page: 'en/index.html', language: 'en', ogLocale: 'en_US',
    title: 'File SHA-256 Checksum & Verification | GlossQuote', name: 'File SHA-256 Checksum',
    languageNotice: 'Switching languages leaves the current result.', previewSentence: ' This is a development preview and has not been released.',
    description: "Calculate a file's SHA-256 locally in your browser and compare an expected checksum. Files up to 128 MiB; copy or download the result without uploading the file.",
  },
]);
function htmlAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
export function validateReleaseOptions(mode, origin = PRODUCTION_ORIGIN) {
  requireCondition(mode === 'preview' || mode === 'production', 'RELEASE_MODE_INVALID');
  // Exact comparison rejects aliases, ports, userinfo, path, query and fragment.
  requireCondition(origin === PRODUCTION_ORIGIN, 'PRODUCTION_ORIGIN_INVALID');
}
export function releaseAssets(mode) {
  validateReleaseOptions(mode);
  return [...APPROVED_ASSETS, '404.html', 'en/404.html', 'robots.txt', '_headers', '_redirects',
    ...(mode === 'production' ? ['sitemap.xml', 'favicon.svg'] : [])].sort();
}
function structuredData(locale) {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: locale.name, description: locale.description,
    url: PRODUCTION_ORIGIN + '/' + locale.page, inLanguage: locale.language,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true,
  }).replaceAll('<', '\\u003c');
}
export function releaseHeaders(mode) {
  validateReleaseOptions(mode);
  const hashes = mode === 'production' ? LOCALES.map(locale =>
    "'sha256-" + createHash('sha256').update(structuredData(locale)).digest('base64') + "'") : [];
  const headers = {
    'Content-Security-Policy': "default-src 'none'; script-src 'self'" + (hashes.length ? ' ' + hashes.join(' ') : '')
      + "; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'public, max-age=0, must-revalidate',
  };
  if (mode === 'preview') headers['X-Robots-Tag'] = 'noindex,nofollow';
  return headers;
}
function productionHtml(source, locale) {
  requireCondition(source.includes('<title>' + htmlAttribute(locale.title) + '</title>')
    && source.includes('<meta name="description" content="' + htmlAttribute(locale.description) + '">')
    && source.includes('<h1>' + locale.name + '</h1>'), 'RELEASE_METADATA_INVALID');
  const robots = '<meta name="robots" content="noindex,nofollow">';
  requireCondition(source.split(robots).length === 2 && source.split('</head>').length === 2, 'RELEASE_HEAD_INVALID');
  const previewNotice = '<p class="help">' + locale.languageNotice + locale.previewSentence + '</p>';
  requireCondition(source.split(previewNotice).length === 2, 'RELEASE_PREVIEW_NOTICE_INVALID');
  const lines = [
    '  <link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '  <link rel="canonical" href="' + PRODUCTION_ORIGIN + '/' + locale.page + '">',
    ...LOCALES.map(other => '  <link rel="alternate" hreflang="' + other.language + '" href="' + PRODUCTION_ORIGIN + '/' + other.page + '">'),
    '  <link rel="alternate" hreflang="x-default" href="' + PRODUCTION_ORIGIN + '/index.html">',
    '  <meta property="og:type" content="website">',
    '  <meta property="og:site_name" content="Gloss Tools by GlossQuote">',
    '  <meta property="og:title" content="' + htmlAttribute(locale.title) + '">',
    '  <meta property="og:description" content="' + htmlAttribute(locale.description) + '">',
    '  <meta property="og:url" content="' + PRODUCTION_ORIGIN + '/' + locale.page + '">',
    '  <meta property="og:locale" content="' + locale.ogLocale + '">',
    '  <meta property="og:locale:alternate" content="' + LOCALES.find(other => other !== locale).ogLocale + '">',
    '  <script type="application/ld+json">' + structuredData(locale) + '</script>',
  ];
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  return source.replace(robots, '<meta name="robots" content="index,follow">')
    .replace('</head>', lines.join(newline) + newline + '</head>')
    .replace(previewNotice, '<p class="help">' + locale.languageNotice + '</p>');
}
function notFoundHtml(english) {
  const language = english ? 'en' : 'zh-Hant';
  const title = english ? 'Page not found | GlossQuote' : '找不到頁面｜GlossQuote';
  const heading = english ? 'Page not found' : '找不到這個頁面';
  const message = english ? 'This address does not point to a page. Return to the checksum tool to choose a file.'
    : '這個網址沒有對應的頁面。請回到校驗工具選擇檔案。';
  const page = english ? '/en/index.html' : '/index.html';
  const home = english ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
  return '<!doctype html>\n<html lang="' + language + '">\n<head>\n'
    + '  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '  <meta name="robots" content="noindex,nofollow">\n  <title>' + title + '</title>\n'
    + '  <link rel="stylesheet" href="/styles/app.css">\n</head>\n<body>\n'
    + '  <header class="topbar"><a href="' + home + '">Gloss Tools by GlossQuote</a></header>\n'
    + '  <main><h1>' + heading + '</h1><p>' + message + '</p><p><a href="' + page + '">'
    + (english ? 'Return to checksum tool' : '回到檔案校驗工具') + '</a></p></main>\n'
    + '  <footer>Gloss Tools by GlossQuote</footer>\n</body>\n</html>\n';
}
export function createReleaseContent(source, mode, origin = PRODUCTION_ORIGIN) {
  validateReleaseOptions(mode, origin);
  const content = new Map([...source.sources].map(([name, bytes]) => [name, Buffer.from(bytes)]));
  if (mode === 'production') for (const locale of LOCALES) {
    content.set(locale.page, Buffer.from(productionHtml(decodeUtf8(content.get(locale.page)), locale)));
  }
  content.set('404.html', Buffer.from(notFoundHtml(false)));
  content.set('en/404.html', Buffer.from(notFoundHtml(true)));
  content.set('robots.txt', Buffer.from(mode === 'production'
    ? 'User-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml\n'
    : 'User-agent: *\nDisallow: /\n'));
  content.set('_headers', Buffer.from('/*\n' + Object.entries(releaseHeaders(mode)).map(([name, value]) => '  ' + name + ': ' + value).join('\n') + '\n'));
  // Exact convenience addresses redirect; unknown paths remain 404. The icon
  // alias also covers browsers that request favicon.ico despite the SVG link.
  content.set('_redirects', Buffer.from('/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n'
    + (mode === 'production' ? '/favicon.ico /favicon.svg 301\n' : '')));
  if (mode === 'production') content.set('favicon.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n'
    + '  <rect width="64" height="64" rx="14" fill="#111410"/>\n'
    + '  <path d="M19 12h18l10 10v30H19Z" fill="#c8f56a"/>\n'
    + '  <path d="M37 12v11h10M25 37l6 6 11-13" fill="none" stroke="#111410" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>\n'
    + '</svg>\n'));
  if (mode === 'production') content.set('sitemap.xml', Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + LOCALES.map(locale => '  <url><loc>' + origin + '/' + locale.page + '</loc></url>').join('\n') + '\n</urlset>\n'));
  return new Map([...content].sort(([left], [right]) => left.localeCompare(right)));
}
export async function validateReleaseSource(root = PROJECT_ROOT) {
  const inputs = new Map();
  for (const name of ['package.json', 'wrangler.jsonc', 'test/release.test.mjs']) inputs.set(name, await readSafeFile(containedPath(root, name)));
  const packageInfo = JSON.parse(decodeUtf8(inputs.get('package.json')));
  for (const [name, command] of Object.entries(RELEASE_COMMANDS)) requireCondition(packageInfo.scripts?.[name] === command, 'RELEASE_COMMAND_INVALID');
  const config = JSON.parse(decodeUtf8(inputs.get('wrangler.jsonc')));
  function sameStructure(left, right) {
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return left === right;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left).sort();
    return JSON.stringify(keys) === JSON.stringify(Object.keys(right).sort()) && keys.every(key => sameStructure(left[key], right[key]));
  }
  requireCondition(sameStructure(config, STATIC_CONFIG), 'STATIC_CONFIG_INVALID');
  checkModuleSyntax(containedPath(root, 'test/release.test.mjs'));
  return inputs;
}
export async function inspectReleaseTree(root, mode, { requireAll = true, allowMissing = false } = {}) {
  const names = releaseAssets(mode);
  const allowed = new Set(names);
  // The two Cloudflare control files are explicit root-only exceptions. The
  // existing extension/path grammar in validation.mjs remains unchanged.
  const directories = approvedDirectories(names.filter(name => name !== '_headers' && name !== '_redirects'));
  const rootStat = await assertSafePath(root, { allowMissing });
  if (!rootStat) return [];
  requireCondition(rootStat.isDirectory(), 'DIRECTORY_REQUIRED');
  const found = [];
  async function walk(relative) {
    const directory = containedPath(root, relative);
    await assertSafePath(directory);
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      const stat = await assertSafePath(containedPath(root, name));
      if (stat.isDirectory()) {
        requireCondition(directories.has(name), 'UNAPPROVED_DIRECTORY');
        await walk(name);
      } else {
        requireCondition(stat.isFile(), 'REGULAR_FILE_REQUIRED');
        requireCondition(allowed.has(name), 'UNAPPROVED_ASSET');
        requireCondition(stat.nlink === 1, 'HARDLINK_FORBIDDEN');
        found.push(name);
      }
    }
  }
  await walk('');
  if (requireAll) requireCondition(found.length === names.length && names.every(name => found.includes(name)), 'MISSING_ASSET');
  return found.sort();
}
export async function validateRelease(root = PROJECT_ROOT, mode = 'production', origin = PRODUCTION_ORIGIN) {
  validateReleaseOptions(mode, origin);
  const source = await validateProject(root);
  await validateReleaseSource(root);
  const content = createReleaseContent(source, mode, origin);
  const destination = containedPath(root, mode === 'production' ? 'dist-production' : 'dist-preview');
  const names = await inspectReleaseTree(destination, mode);
  const manifest = [];
  for (const name of names) {
    const bytes = await readSafeFile(containedPath(destination, name));
    requireCondition(bytes.equals(content.get(name)), 'RELEASE_BYTES_MISMATCH');
    manifest.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return { mode, origin: mode === 'production' ? origin : null, destination, manifest };
}
if (isEntryPoint(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      const result = await validateProject();
      await validateReleaseSource();
      console.log('PASS check: ' + result.manifest.length + ' approved preview assets; two interactive locales; ESM syntax, worker bytes and static release configuration');
    } else if (args.length === 1 && args[0] === '--production') {
      const result = await validateRelease();
      console.log('PASS production: ' + result.manifest.length + ' exact assets; canonical, alternates, JSON-LD, robots, sitemap, CSP and strict routing');
    } else {
      requireCondition(args.length === 2 && args[0] === '--releasegate' && args[1] === '--required', 'CHECK_ARGUMENT_INVALID');
      const preview = await validateRelease(PROJECT_ROOT, 'preview');
      const production = await validateRelease();
      console.log('PASS required releasegate: preview ' + preview.manifest.length + ' and production ' + production.manifest.length + ' assets; both outputs required; local artifact gate only');
    }
  } catch (error) {
    console.error(`FAIL check: ${error.code ?? 'CHECK_FAILED'}`);
    process.exitCode = 1;
  }
}
