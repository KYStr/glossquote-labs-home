import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { ASSETS, HEADERS } from './manifest.mjs';
import { inspectTree, compareTrees } from './files.mjs';

export function validatePackage(pkg) {
  assert.equal(pkg.private, true); assert.equal(pkg.type, 'module'); assert.equal(pkg.engines.node, '>=24 <25');
  for (const name of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) assert.equal(Object.keys(pkg[name] ?? {}).length, 0, 'EXTERNAL_DEPENDENCY');
  assert.deepEqual(pkg.scripts, {
    test: 'node --test', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', dev: 'node scripts/dev.mjs',
    'build:production': 'node scripts/production.mjs', 'check:production': 'node scripts/production.mjs --check',
    'preview:production': 'node scripts/preview-production.mjs', 'release:check': 'node scripts/release-check.mjs'
  });
}
export function validateHeaders(text) {
  const lines = text.trimEnd().split(/\r?\n/);
  assert.equal(lines.shift(), '/*');
  const pairs = lines.map(line => { const match = /^  ([A-Za-z-]+): (.+)$/.exec(line); assert.ok(match, 'INVALID_HEADER'); return [match[1], match[2]]; });
  assert.equal(new Set(pairs.map(([key]) => key)).size, pairs.length, 'DUPLICATE_HEADER');
  assert.deepEqual(Object.fromEntries(pairs), HEADERS);
}
export function validateHtml(html, language, file) {
  assert.ok(html.startsWith('<!doctype html>\n'));
  assert.ok(html.includes(`<html lang="${language}">`));
  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(!/<(?:form|iframe|object|embed)\b|\bon[a-z]+\s*=|<script(?![^>]*\bsrc=)|\btype="file"|\bname="(?:srt|seconds|direction)/i.test(html), 'UNSAFE_MARKUP');
  assert.ok(!/rel="canonical"|application\/ld\+json/.test(html), 'PREMATURE_PRODUCTION_METADATA');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'DUPLICATE_ID');
  for (const match of html.matchAll(/\b(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id), 'MISSING_LABEL_TARGET');
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
    const ref = match[1]; assert.ok(!/[:?#\\]/.test(ref));
    const path = ref.startsWith('/') ? ref.slice(1) : posix.normalize(posix.join(posix.dirname(file), ref));
    assert.ok(ASSETS.includes(path), 'UNKNOWN_PAGE_ASSET');
  }
  if (file === '404.html') return;
  const home = language === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
  assert.ok(html.includes(`href="${home}"`));
  assert.ok(html.includes(language === 'en' ? '<title>Subtitle Time Shift | GlossQuote Tools</title>' : '<title>字幕時間平移｜GlossQuote Tools</title>'));
  for (const id of ['srt-input', 'direction', 'seconds', 'shift', 'clear']) assert.match(html, new RegExp(`<[^>]+id="${id}"[^>]+disabled`));
  assert.match(html, /<textarea id="srt-output" readonly/);
  assert.match(html, /<option value="earlier" selected>/);
  assert.match(html, /id="seconds"[^>]*value="0"/);
  assert.match(html, /id="download"[^>]*download="subtitles-shifted\.srt"[^>]*aria-disabled="true"/);
  assert.match(html, /<dialog id="confirm"/);
  assert.match(html, /https:\/\/www\.loc\.gov\/preservation\/digital\/formats\/fdd\/fdd000569\.shtml/);
}
export function validateClientSource(text, file) {
  // A bounded static regression check, supplemented by tests and manual source
  // review. It does not prove observed browser Network/Storage behavior.
  assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon|serviceWorker|innerHTML|outerHTML|insertAdjacentHTML|eval)\b|\bnew\s+Function\b|\bconsole\s*\.|document\s*\.\s*cookie|navigator\s*\.\s*clipboard|window\s*\.\s*(?:print|confirm)|\.click\s*\(/.test(text), 'FORBIDDEN_CLIENT_API');
  for (const match of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
    assert.ok(match[1].startsWith('./'), 'NONLOCAL_IMPORT');
    const resolved = posix.normalize(posix.join(posix.dirname(file), match[1]));
    assert.ok(ASSETS.includes(resolved), 'UNKNOWN_MODULE');
  }
  assert.ok(!/\bimport\s*\(/.test(text), 'DYNAMIC_IMPORT');
}
export async function validateSource(root) {
  const inventory = await inspectTree(join(root, 'public'));
  validatePackage(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')));
  for (const file of ASSETS) {
    const text = await readFile(join(root, 'public', file), 'utf8');
    if (file.endsWith('.html')) validateHtml(text, file.startsWith('en/') ? 'en' : 'zh-Hant', file);
    if (file.endsWith('.mjs')) validateClientSource(text, file);
    if (file === '_headers') validateHeaders(text);
    if (file === 'styles.css') { assert.ok(!/@import|url\(/i.test(text)); assert.ok(text.includes('prefers-reduced-motion')); assert.ok(text.includes('min-width: 48rem') && text.includes('min-width: 75rem')); }
    if (file === 'robots.txt') assert.equal(text, 'User-agent: *\nDisallow: /\n');
  }
  const app = await readFile(join(root, 'public/app.mjs'), 'utf8');
  for (const file of ['index.html', 'en/index.html']) {
    const html = await readFile(join(root, 'public', file), 'utf8');
    for (const match of app.matchAll(/get\('([^']+)'\)/g)) assert.ok(html.includes(`id="${match[1]}"`), 'MISSING_APP_TARGET');
  }
  return inventory;
}
export async function validateExistingBuild(root) {
  try { await lstat(join(root, 'dist')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  return compareTrees(join(root, 'public'), join(root, 'dist'));
}
