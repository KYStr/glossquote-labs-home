import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildRelease } from '../scripts/build.mjs';
import {
  APPROVED_ASSETS, PRODUCTION_ORIGIN, inspectReleaseTree, releaseAssets,
  validateRelease, validateReleaseOptions,
} from '../scripts/check.mjs';
import { readSafeFile, tokenizeHtml, ValidationError } from '../scripts/validation.mjs';

const PROJECT = fileURLToPath(new URL('../', import.meta.url));
const INPUTS = [
  'package.json', 'wrangler.jsonc', 'scripts/build.mjs', 'scripts/check.mjs',
  'scripts/serve.mjs', 'scripts/validation.mjs', 'scripts/build-worker.mjs',
  'test/scaffold.test.mjs', 'test/checksum.test.mjs', 'test/session.test.mjs',
  'test/worker.test.mjs', 'test/ui-contract.test.mjs', 'test/release.test.mjs',
  ...APPROVED_ASSETS.map(name => 'public/' + name),
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const isCode = code => error => error instanceof ValidationError && error.code === code;
async function fixture(t) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'glossquote-checksum-release-'));
  const absoluteBase = path.resolve(base);
  t.after(async () => {
    // Delete only this identified fake-data workspace, after checking its target.
    assert.equal(path.resolve(base), absoluteBase);
    assert.equal(path.dirname(absoluteBase), path.resolve(os.tmpdir()));
    assert.ok(path.basename(absoluteBase).startsWith('glossquote-checksum-release-'));
    assert.equal((await fs.lstat(absoluteBase)).isSymbolicLink(), false);
    assert.equal(path.resolve(await fs.realpath(absoluteBase)), absoluteBase);
    await fs.rm(absoluteBase, { recursive: true, force: false });
  });
  const root = path.join(base, 'project');
  for (const name of INPUTS) {
    const target = path.join(root, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, await fs.readFile(path.join(PROJECT, name)), { flag: 'wx' });
  }
  return { base, root, production: path.join(root, 'dist-production'), preview: path.join(root, 'dist-preview') };
}
async function snapshot(root, names) {
  return Promise.all(names.map(async name => {
    const bytes = await fs.readFile(path.join(root, name));
    return { path: name, bytes: bytes.length, sha256: digest(bytes) };
  }));
}
const absent = target => assert.rejects(fs.lstat(target), error => error.code === 'ENOENT');
const activeTokens = html => tokenizeHtml(html).filter(token => !token.closing);
const meta = (tokens, key, value) => tokens.filter(token => token.name === 'meta' && token.attrs.get(key) === value);
const cli = (root, script, args) => spawnSync(process.execPath, [path.join(root, script), ...args],
  { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 });

test('production SEO is bilingual; runtime and source stay frozen; only preview body copy changes', async t => {
  const f = await fixture(t);
  const before = await snapshot(f.root, INPUTS);
  const result = await buildRelease(f.root);
  assert.equal(result.origin, 'https://checksum.glossquote.com');
  assert.equal(result.manifest.length, 17);
  assert.deepEqual(await snapshot(f.root, INPUTS), before);
  const config = JSON.parse(await fs.readFile(path.join(f.root, 'wrangler.jsonc'), 'utf8'));
  assert.equal(config.name, 'glossquote-file-checksum');
  assert.equal(config.compatibility_date, '2026-10-19');
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.send_metrics, false);
  assert.deepEqual(config.observability, { enabled: false, logs: { enabled: false }, traces: { enabled: false } });
  assert.deepEqual(config.assets, { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' });
  assert.deepEqual(config.routes, [{ pattern: 'checksum.glossquote.com', custom_domain: true }]);
  assert.equal('main' in config || 'build' in config, false);
  const headers = await fs.readFile(path.join(f.production, '_headers'), 'utf8');
  for (const [page, lang, title, name, ogLocale, home] of [
    ['index.html', 'zh-Hant', '檔案 SHA-256 校驗與比對｜GlossQuote', '檔案 SHA-256 校驗', 'zh_TW', 'https://glossquote.com/index.html'],
    ['en/index.html', 'en', 'File SHA-256 Checksum &amp; Verification | GlossQuote', 'File SHA-256 Checksum', 'en_US', 'https://glossquote.com/en/index.html'],
  ]) {
    const html = await fs.readFile(path.join(f.production, page), 'utf8');
    const source = await fs.readFile(path.join(f.root, 'public', page), 'utf8');
    const previewSentence = page === 'index.html' ? '這是開發預覽，尚未正式發布。' : ' This is a development preview and has not been released.';
    const warning = page === 'index.html' ? '切換語言會離開當前結果。' : 'Switching languages leaves the current result.';
    assert.ok(source.includes(previewSentence));
    assert.equal(html.includes(previewSentence), false);
    assert.ok(html.includes('<p class="help">' + warning + '</p>'));
    assert.equal(html.slice(html.indexOf('<body>')), source.slice(source.indexOf('<body>')).replace(previewSentence, ''));
    assert.ok(html.includes('<title>' + title + '</title>'));
    const tokens = activeTokens(html);
    const icon = tokens.filter(token => token.name === 'link' && token.attrs.get('rel') === 'icon');
    assert.equal(icon.length, 1);
    assert.equal(icon[0].attrs.get('href'), '/favicon.svg');
    assert.equal(icon[0].attrs.get('type'), 'image/svg+xml');
    assert.equal(tokens.find(token => token.name === 'html').attrs.get('lang'), lang);
    assert.equal(meta(tokens, 'name', 'robots').length, 1);
    assert.equal(meta(tokens, 'name', 'robots')[0].attrs.get('content'), 'index,follow');
    const links = tokens.filter(token => token.name === 'link' && token.attrs.get('rel') === 'canonical');
    assert.equal(links.length, 1);
    assert.equal(links[0].attrs.get('href'), 'https://checksum.glossquote.com/' + page);
    const alternates = tokens.filter(token => token.name === 'link' && token.attrs.get('rel') === 'alternate');
    assert.deepEqual(alternates.map(token => [token.attrs.get('hreflang'), token.attrs.get('href')]), [
      ['zh-Hant', 'https://checksum.glossquote.com/index.html'],
      ['en', 'https://checksum.glossquote.com/en/index.html'],
      ['x-default', 'https://checksum.glossquote.com/index.html'],
    ]);
    assert.equal(meta(tokens, 'property', 'og:url')[0].attrs.get('content'), 'https://checksum.glossquote.com/' + page);
    assert.equal(meta(tokens, 'property', 'og:locale')[0].attrs.get('content'), ogLocale);
    assert.equal(meta(tokens, 'property', 'og:description')[0].attrs.get('content'), meta(tokens, 'name', 'description')[0].attrs.get('content'));
    const scripts = tokens.filter(token => token.name === 'script');
    assert.equal(scripts.length, 2);
    assert.equal(scripts.filter(token => token.attrs.get('type') === 'module' && token.attrs.has('src')).length, 1);
    const json = scripts.find(token => token.attrs.get('type') === 'application/ld+json');
    assert.ok(json && !json.attrs.has('src'));
    const data = JSON.parse(json.content);
    assert.deepEqual(Object.keys(data).sort(), ['@context', '@type', 'applicationCategory', 'description', 'inLanguage', 'isAccessibleForFree', 'name', 'operatingSystem', 'url'].sort());
    assert.equal(data['@type'], 'WebApplication');
    assert.equal(data.name, name);
    assert.equal(data.inLanguage, lang);
    assert.equal(data.url, 'https://checksum.glossquote.com/' + page);
    assert.equal(data.isAccessibleForFree, true);
    assert.equal(data.description, meta(tokens, 'name', 'description')[0].attrs.get('content'));
    assert.ok(headers.includes("'sha256-" + createHash('sha256').update(json.content).digest('base64') + "'"));
    assert.ok(tokens.some(token => token.name === 'a' && token.attrs.get('href') === home));
    assert.equal(tokens.filter(token => token.name === 'details').length, 5);
    const faq = html.slice(html.indexOf('<section class="help-section" aria-labelledby="faq-title">'));
    assert.equal(activeTokens(faq).filter(token => token.name === 'details').length, 4);
    assert.equal(/noindex|hash\.glossquote\.com|localhost|127\.0\.0\.1/.test(html), false);
  }
  for (const name of APPROVED_ASSETS.filter(name => !name.endsWith('.html'))) {
    assert.deepEqual(await fs.readFile(path.join(f.production, name)), await fs.readFile(path.join(f.root, 'public', name)));
  }
  assert.match(headers, /default-src 'none'; script-src 'self' 'sha256-/);
  assert.match(headers, /connect-src 'none'; worker-src blob:/);
  assert.match(headers, /object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'/);
  assert.equal(/unsafe-inline|unsafe-eval|connect-src \*|script-src \*|X-Robots-Tag/.test(headers), false);
  assert.ok(headers.split('\n').every(line => line.length <= 2000));
  const favicon = await fs.readFile(path.join(f.production, 'favicon.svg'), 'utf8');
  assert.match(favicon, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 64 64">/);
  assert.equal(/script|foreignObject|href|\bon[a-z]+\s*=|url\(/i.test(favicon), false);
  assert.equal(await fs.readFile(path.join(f.production, '_redirects'), 'utf8'),
    '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n/favicon.ico /favicon.svg 301\n');
  const sitemap = await fs.readFile(path.join(f.production, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [
    'https://checksum.glossquote.com/index.html', 'https://checksum.glossquote.com/en/index.html',
  ]);
  assert.equal(await fs.readFile(path.join(f.production, 'robots.txt'), 'utf8'),
    'User-agent: *\nAllow: /\nSitemap: https://checksum.glossquote.com/sitemap.xml\n');
  assert.deepEqual((await validateRelease(f.root)).manifest, [...result.manifest].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  assert.deepEqual((await buildRelease(f.root)).manifest, result.manifest);
});

test('preview remains byte-exact and noindex with no canonical or sitemap', async t => {
  const f = await fixture(t);
  const first = await buildRelease(f.root, { mode: 'preview' });
  assert.equal(first.origin, null);
  assert.equal(first.manifest.length, 15);
  for (const name of APPROVED_ASSETS) assert.deepEqual(await fs.readFile(path.join(f.preview, name)), await fs.readFile(path.join(f.root, 'public', name)));
  for (const page of ['index.html', 'en/index.html']) {
    const html = await fs.readFile(path.join(f.preview, page), 'utf8');
    assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.equal(/canonical|application\/ld\+json|checksum\.glossquote\.com/.test(html), false);
  }
  assert.equal(await fs.readFile(path.join(f.preview, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
  assert.match(await fs.readFile(path.join(f.preview, '_headers'), 'utf8'), /X-Robots-Tag: noindex,nofollow/);
  await absent(path.join(f.preview, 'sitemap.xml'));
  const second = await buildRelease(f.root, { mode: 'preview' });
  assert.deepEqual(second.manifest, first.manifest);
  await validateRelease(f.root, 'preview');
});

test('exact origin, modes and CLI arguments fail closed before output', async t => {
  const f = await fixture(t);
  for (const origin of ['https://hash.glossquote.com', 'http://checksum.glossquote.com', 'https://checksum.glossquote.com/',
    'https://user@checksum.glossquote.com', 'https://checksum.glossquote.com:443',
    'https://checksum.glossquote.com?x=1', 'https://checksum.glossquote.com#x',
    'https://checksum.glossquote.com.evil.invalid', 'https://evil.invalid', '', null]) {
    assert.throws(() => validateReleaseOptions('production', origin), isCode('PRODUCTION_ORIGIN_INVALID'));
  }
  for (const mode of ['prod', '', null]) assert.throws(() => validateReleaseOptions(mode), isCode('RELEASE_MODE_INVALID'));
  await assert.rejects(buildRelease(f.root, { origin: 'https://evil.invalid' }), isCode('PRODUCTION_ORIGIN_INVALID'));
  const command = cli(f.root, 'scripts/build.mjs', ['--production', '--origin', 'https://evil.invalid']);
  assert.equal(command.error, undefined);
  assert.equal(command.status, 1);
  assert.match(command.stderr, /PRODUCTION_ORIGIN_INVALID/);
  assert.equal(cli(f.root, 'scripts/build.mjs', ['--production', '--skip-check']).status, 1);
  assert.equal(cli(f.root, 'scripts/check.mjs', ['--releasegate']).status, 1);
  await absent(f.production);
  await absent(f.preview);
});

test('static configuration rejects a server, extra bindings or a changed destination before writes', async t => {
  const f = await fixture(t);
  const filename = path.join(f.root, 'wrangler.jsonc');
  const original = JSON.parse(await fs.readFile(filename, 'utf8'));
  for (const config of [{ ...original, main: 'server.mjs' }, { ...original, vars: { FAKE: 'fake' } },
    { ...original, assets: { ...original.assets, directory: '.' } },
    { ...original, assets: { ...original.assets, not_found_handling: 'single-page-application' } },
    { ...original, workers_dev: true }, { ...original, observability: { enabled: true } }]) {
    await fs.writeFile(filename, JSON.stringify(config));
    await assert.rejects(buildRelease(f.root), isCode('STATIC_CONFIG_INVALID'));
    await absent(f.production);
  }
});

test('production output tampering and injected private files never pass or get removed', async t => {
  const f = await fixture(t);
  await buildRelease(f.root);
  const headers = path.join(f.production, '_headers');
  const original = await fs.readFile(headers);
  await fs.writeFile(headers, original.toString().replace("connect-src 'none'", "connect-src *"));
  await assert.rejects(validateRelease(f.root), isCode('RELEASE_BYTES_MISMATCH'));
  await fs.writeFile(headers, original);
  const page = path.join(f.production, 'en/index.html');
  const html = await fs.readFile(page, 'utf8');
  await fs.writeFile(page, html.replace('https://checksum.glossquote.com/en/index.html', 'https://evil.invalid/en/index.html'));
  await assert.rejects(validateRelease(f.root), isCode('RELEASE_BYTES_MISMATCH'));
  await fs.writeFile(page, html);
  const sentinel = path.join(f.production, 'private-fixture.txt');
  await fs.writeFile(sentinel, 'FAKE_PRIVATE_SENTINEL');
  const before = await snapshot(f.production, [...releaseAssets('production'), 'private-fixture.txt']);
  await assert.rejects(buildRelease(f.root), isCode('UNAPPROVED_ASSET'));
  await assert.rejects(validateRelease(f.root), isCode('UNAPPROVED_ASSET'));
  assert.deepEqual(await snapshot(f.production, [...releaseAssets('production'), 'private-fixture.txt']), before);
});

test('release destination hardlinks, junctions and unsafe ancestors preserve external bytes', async t => {
  for (const mode of ['preview', 'production']) await t.test(mode + ' hardlink', async child => {
    const f = await fixture(child);
    const output = mode === 'production' ? f.production : f.preview;
    await fs.mkdir(output);
    const external = path.join(f.base, 'sentinel.txt');
    await fs.writeFile(external, 'FAKE_EXTERNAL_SENTINEL');
    await fs.link(external, path.join(output, '_headers'));
    await assert.rejects(buildRelease(f.root, { mode }), isCode('HARDLINK_FORBIDDEN'));
    assert.equal(await fs.readFile(external, 'utf8'), 'FAKE_EXTERNAL_SENTINEL');
    assert.deepEqual(await fs.readdir(output), ['_headers']);
  });
  await t.test('whole output junction', async child => {
    const f = await fixture(child);
    const external = path.join(f.base, 'external-output');
    await fs.mkdir(external);
    await fs.writeFile(path.join(external, 'sentinel.txt'), 'FAKE_EXTERNAL_SENTINEL');
    await fs.symlink(external, f.production, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(buildRelease(f.root), isCode('SYMLINK_FORBIDDEN'));
    assert.equal(await fs.readFile(path.join(external, 'sentinel.txt'), 'utf8'), 'FAKE_EXTERNAL_SENTINEL');
    assert.deepEqual(await fs.readdir(external), ['sentinel.txt']);
  });
  await t.test('nested output ancestor junction', async child => {
    const f = await fixture(child);
    const external = path.join(f.base, 'external-styles');
    await fs.mkdir(external);
    await fs.writeFile(path.join(external, 'app.css'), 'FAKE_EXTERNAL_SENTINEL');
    await fs.mkdir(f.production);
    await fs.symlink(external, path.join(f.production, 'styles'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(buildRelease(f.root), isCode('SYMLINK_FORBIDDEN'));
    assert.equal(await fs.readFile(path.join(external, 'app.css'), 'utf8'), 'FAKE_EXTERNAL_SENTINEL');
    assert.deepEqual(await fs.readdir(external), ['app.css']);
  });
});

test('missing asset and stale nested directory are explicit required gate failures', async t => {
  const f = await fixture(t);
  const missing = cli(f.root, 'scripts/check.mjs', ['--releasegate', '--required']);
  assert.equal(missing.status, 1);
  await buildRelease(f.root, { mode: 'preview' });
  await buildRelease(f.root);
  const gate = cli(f.root, 'scripts/check.mjs', ['--releasegate', '--required']);
  assert.equal(gate.error, undefined);
  assert.equal(gate.status, 0, gate.stderr);
  await fs.unlink(path.join(f.production, 'sitemap.xml'));
  await assert.rejects(validateRelease(f.root), isCode('MISSING_ASSET'));
  await fs.mkdir(path.join(f.preview, 'docs'));
  await fs.writeFile(path.join(f.preview, 'docs', 'private.txt'), 'FAKE_PRIVATE_SENTINEL');
  await assert.rejects(inspectReleaseTree(f.preview, 'preview'), isCode('UNAPPROVED_DIRECTORY'));
  await assert.rejects(buildRelease(f.root, { mode: 'preview' }), isCode('UNAPPROVED_DIRECTORY'));
  assert.equal(await fs.readFile(path.join(f.preview, 'docs', 'private.txt'), 'utf8'), 'FAKE_PRIVATE_SENTINEL');
});

// An offline HTTP model of the reviewed static rules. This is not a Cloudflare
// runtime or browser acceptance result; live MIME, headers and routing need their
// own release evidence after deployment.
async function modelServer(t, directory) {
  const headersText = await fs.readFile(path.join(directory, '_headers'), 'utf8');
  const headers = Object.fromEntries(headersText.split('\n').filter(line => line.startsWith('  ')).map(line => {
    const split = line.indexOf(':'); return [line.slice(2, split), line.slice(split + 1).trim()];
  }));
  const redirects = new Map((await fs.readFile(path.join(directory, '_redirects'), 'utf8')).trim().split('\n')
    .map(line => { const [source, destination, status] = line.split(' '); return [source, { destination, status: Number(status) }]; }));
  const allowed = new Set(releaseAssets('production').filter(name => !name.startsWith('_')));
  const mimes = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8' };
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = request.url.split('?')[0];
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Length': '0' }); response.end(); return;
      }
      if (redirects.has(pathname)) {
        const rule = redirects.get(pathname);
        response.writeHead(rule.status, { Location: rule.destination, 'Content-Length': '0' }); response.end(); return;
      }
      const safe = pathname.startsWith('/') && !pathname.startsWith('//') && !/[%\\\\]/.test(pathname)
        && pathname.split('/').filter(Boolean).every(part => part !== '.' && part !== '..' && !part.startsWith('.'));
      const requested = pathname.slice(1);
      const exists = safe && allowed.has(requested);
      const name = exists ? requested : pathname.startsWith('/en/') ? 'en/404.html' : '404.html';
      const bytes = await readSafeFile(path.join(directory, name));
      response.writeHead(exists ? 200 : 404, { ...headers, 'Content-Type': mimes[path.extname(name)], 'Content-Length': String(bytes.length) });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(500); response.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return server.address().port;
}
function request(port, target, method = 'GET') {
  return new Promise((resolve, reject) => {
    const outgoing = http.request({ host: '127.0.0.1', port, path: target, method, headers: { Host: 'evil.invalid' } }, response => {
      const chunks = [];
      response.on('data', bytes => chunks.push(bytes));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }));
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}
test('production HTTP model covers exact redirects, both locales, MIME, HEAD, 405 and strict localized 404', async t => {
  const f = await fixture(t);
  await buildRelease(f.root);
  const port = await modelServer(t, f.production);
  for (const [target, destination] of [['/', '/index.html'], ['/en', '/en/index.html'], ['/en/', '/en/index.html'], ['/favicon.ico', '/favicon.svg']]) {
    const redirect = await request(port, target);
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.location, destination);
    assert.equal((await request(port, destination)).status, 200);
  }
  for (const [target, type] of [['/index.html', 'text/html'], ['/en/index.html', 'text/html'],
    ['/styles/app.css', 'text/css'], ['/js/app.mjs', 'text/javascript'], ['/js/hash.worker.mjs', 'text/javascript'],
    ['/js/worker-source.mjs', 'text/javascript'], ['/robots.txt', 'text/plain'], ['/sitemap.xml', 'application/xml'],
    ['/favicon.svg', 'image/svg+xml']]) {
    const get = await request(port, target);
    assert.equal(get.status, 200, target);
    assert.ok(get.headers['content-type'].startsWith(type), target);
    assert.equal(get.headers['x-content-type-options'], 'nosniff');
    assert.match(get.headers['content-security-policy'], /connect-src 'none'; worker-src blob:/);
    assert.equal(get.headers['x-robots-tag'], undefined);
    assert.deepEqual(get.bytes, await fs.readFile(path.join(f.production, target.slice(1))));
    const head = await request(port, target, 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.bytes.length, 0);
    assert.equal(Number(head.headers['content-length']), get.bytes.length);
    const post = await request(port, target, 'POST');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');
  }
  for (const target of ['/missing', '/nested/missing.html', '/en/missing', '/en/deep/missing.css',
    '/_headers', '/_redirects', '/package.json', '/wrangler.jsonc', '/docs/RELEASE.md', '/test/release.test.mjs',
    '/.env', '/../package.json', '/%2e%2e/package.json', '/js%2fapp.mjs', '//js/app.mjs']) {
    const result = await request(port, target);
    assert.equal(result.status, 404, target);
    assert.match(result.headers['content-type'], /^text\/html/);
    const html = result.bytes.toString();
    const english = target.startsWith('/en/');
    assert.ok(html.includes('<html lang="' + (english ? 'en' : 'zh-Hant') + '">'), target);
    assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.equal(/<script|canonical|role="status"/.test(html), false);
    assert.ok(html.includes('href="' + (english ? '/en/index.html' : '/index.html') + '"'));
  }
  const query = await request(port, '/index.html?origin=https://evil.invalid');
  assert.equal(query.status, 200);
  assert.ok(query.bytes.toString().includes('rel="canonical" href="https://checksum.glossquote.com/index.html"'));
  assert.equal(query.bytes.toString().includes('evil.invalid'), false);
});
