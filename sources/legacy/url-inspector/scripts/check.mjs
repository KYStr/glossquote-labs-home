import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir, lstat, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { projectRoot, publicRoot } from './serve.mjs';
import { messages } from '../public/js/i18n.mjs';
import { validateAncestors, validateHtml, htmlTags } from './validation.mjs';

export const ORIGIN = 'https://urls.glossquote.com';
export const approvedAssets = ['index.html', 'en/index.html', '404.html', '_headers', 'robots.txt', 'styles/tokens.css', 'styles/app.css', 'js/app.mjs', 'js/i18n.mjs', 'js/core/url.mjs'];
export const builtAssets = [...approvedAssets, 'sitemap.xml', 'asset-manifest.json'];
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export async function listFiles(root) {
  await validateAncestors(root);
  const result = [];
  async function walk(folder, prefix = '') {
    for (const entry of await readdir(folder)) {
      assert.ok(!entry.startsWith('.'), 'Hidden file refused');
      const relative = prefix + entry;
      const info = await lstat(path.join(folder, entry));
      assert.equal(info.isSymbolicLink(), false, 'Symlink refused');
      if (info.isDirectory()) await walk(path.join(folder, entry), relative + '/');
      else { assert.ok(info.isFile(), 'Non-file refused'); assert.equal(info.nlink, 1, 'Hardlinked file refused'); result.push(relative); }
    }
  }
  await walk(root);
  return result.sort();
}
export async function check(root = publicRoot, { built = false, production = false } = {}) {
  const expectedAssets = built ? builtAssets : approvedAssets;
  assert.deepEqual(await listFiles(root), [...expectedAssets].sort(), 'Public asset allowlist mismatch');
  assert.deepEqual(Object.keys(messages['zh-Hant']), Object.keys(messages.en), 'Locale message parity');
  assert.deepEqual(Object.keys(messages['zh-Hant'].errors), Object.keys(messages.en.errors), 'Error message parity');
  for (const relative of expectedAssets) {
    const file = path.join(root, relative);
    const source = await readFile(file, 'utf8');
    if (relative.endsWith('.mjs')) {
      const parsed = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      assert.equal(parsed.status, 0, `Syntax error: ${relative}`);
      assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|eval)\s*\(|\b(?:localStorage|sessionStorage|indexedDB)\b|\.innerHTML\b|sendBeacon|new\s+Function/u.test(source), `Forbidden runtime API: ${relative}`);
      assert.ok(!/\bimport\s*\(/u.test(source), 'Dynamic runtime import refused');
      for (const [, reference] of source.matchAll(/\b(?:from\s*|import\s*)['"]([^'"]+)['"]/gu)) {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), reference));
        assert.ok(reference.startsWith('.') && expectedAssets.includes(resolved), 'Nonlocal module import');
      }
    }
    if (relative.endsWith('.html')) {
      const index = relative !== '404.html';
      const tags = validateHtml(source, expectedAssets, production && index ? 'index,follow' : 'noindex,nofollow', production && index ? ORIGIN : null);
      if (index) {
        const locale = relative.startsWith('en/') ? 'en' : 'zh-Hant';
        assert.equal(tags.find(tag => tag.name === 'html').attrs.lang, locale);
        assert.equal(tags.filter(tag => tag.name === 'h1').length, 1);
        assert.ok(tags.some(tag => tag.name === 'meta' && tag.attrs.name === 'description' && tag.attrs.content));
        if (production) validateProductionMetadata(tags, relative);
      }
    }
    if (relative.endsWith('.css')) assert.ok(!/@import|url\s*\(|\\/iu.test(source), 'CSS resource or escape refused');
  }
  const headers = await readFile(path.join(root, '_headers'), 'utf8');
  assert.match(headers, /^\/\*\n/u); assert.match(headers, /connect-src 'none'/u); assert.match(headers, /X-Content-Type-Options: nosniff/u); assert.match(headers, /Referrer-Policy: no-referrer/u);
  const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
  assert.equal(robots, production ? `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
  if (built) {
    const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(match => match[1]);
    assert.deepEqual(locations, production ? [ORIGIN + '/index.html', ORIGIN + '/en/index.html'] : []);
    assert.equal(headers.includes('X-Robots-Tag: noindex, nofollow'), !production);
    const manifest = JSON.parse(await readFile(path.join(root, 'asset-manifest.json'), 'utf8'));
    assert.equal(manifest.mode, production ? 'production' : 'preview'); assert.equal(manifest.origin, production ? ORIGIN : null);
    assert.deepEqual(Object.keys(manifest.assets).sort(), builtAssets.filter(file => file !== 'asset-manifest.json').sort());
    for (const [file, hash] of Object.entries(manifest.assets)) assert.equal(hash, sha256(await readFile(path.join(root, file))), 'Built asset hash mismatch');
  }
  for (const folder of ['scripts', 'test']) {
    for (const name of await readdir(path.join(projectRoot, folder))) {
      if (name.endsWith('.mjs')) assert.equal(spawnSync(process.execPath, ['--check', path.join(projectRoot, folder, name)]).status, 0);
    }
  }
  const config = JSON.parse(await readFile(path.join(projectRoot, 'wrangler.jsonc'), 'utf8'));
  assert.equal(config.assets.directory, './dist'); assert.equal(config.assets.html_handling, 'none'); assert.equal(config.assets.not_found_handling, '404-page'); assert.ok(!config.main && !config.vars && !config.analytics_engine_datasets);
  assert.equal(config.workers_dev, false); assert.equal(config.preview_urls, false); assert.equal(config.observability.enabled, false);
  assert.deepEqual(config.routes, [{ pattern: 'urls.glossquote.com', custom_domain: true }]);
  return { assets: expectedAssets.length, mode: production ? 'production' : 'preview' };
}
function validateProductionMetadata(tags, relative) {
  const canonical = tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'canonical'); assert.equal(canonical.length, 1); assert.equal(canonical[0].attrs.href, ORIGIN + '/' + relative);
  const alternates = tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'alternate').map(tag => [tag.attrs.hreflang, tag.attrs.href]);
  assert.deepEqual(alternates, [['zh-Hant', ORIGIN + '/index.html'], ['en', ORIGIN + '/en/index.html'], ['x-default', ORIGIN + '/index.html']]);
  const title = tags.find(tag => tag.name === 'title').rawText;
  const description = tags.find(tag => tag.name === 'meta' && tag.attrs.name === 'description').attrs.content;
  for (const [property, value] of [['og:title', title], ['og:description', description], ['og:url', ORIGIN + '/' + relative], ['og:type', 'website']]) {
    const meta = tags.filter(tag => tag.name === 'meta' && tag.attrs.property === property); assert.equal(meta.length, 1); assert.equal(meta[0].attrs.content, value);
  }
  const scripts = tags.filter(tag => tag.name === 'script' && tag.attrs.type === 'application/ld+json'); assert.equal(scripts.length, 1);
  const data = JSON.parse(scripts[0].rawText); assert.equal(data.name, title); assert.equal(data.description, description); assert.equal(data.inLanguage, relative.startsWith('en/') ? 'en' : 'zh-Hant');
  assert.equal(data.applicationCategory, 'UtilitiesApplication');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const production = process.argv.includes('--production');
  console.log('CHECK PASS', await check(production ? path.join(projectRoot, 'dist') : publicRoot, { built: production, production }));
}
