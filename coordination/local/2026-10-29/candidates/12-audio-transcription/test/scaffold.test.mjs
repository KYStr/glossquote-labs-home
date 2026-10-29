import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm, realpath, lstat, symlink } from 'node:fs/promises';
import { createStaticServer, routePath, inside, projectRoot, publicRoot } from '../scripts/serve.mjs';
import { walk } from '../scripts/check.mjs';
import path from 'node:path';

async function withServer(server, action, cleanup = async () => {}) {
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
    });
    return await action();
  } finally {
    try {
      if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    } finally { await cleanup(); }
  }
}

async function removeOwnFixture(parent, fixture) {
  const allowed = await realpath(parent), target = await realpath(fixture), info = await lstat(fixture);
  assert.equal(info.isSymbolicLink(), false);
  assert.equal(info.isDirectory(), true);
  assert.equal(path.dirname(target), allowed);
  assert.equal(inside(allowed, target), true);
  assert.match(path.basename(target), /^scaffold-/u);
  await rm(target, { recursive: true });
}

test('native ESM package has meaningful commands and truthful preview', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.engines.node, '>=24');
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ['build', 'check', 'dev', 'test']);
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /noindex, nofollow/u);
  assert.match(html, /lang="zh-Hant"/u);
  assert.match(html, /辨識功能尚未開放/u);
  assert.doesNotMatch(html, /type="file"/u);
});

test('path canonicalization rejects traversal, hidden files, encoded separators and malformed URLs', () => {
  for (const url of ['/../package.json', '/%2e%2e/package.json', '/js/..%5cpackage.json', '/.env', '/%00', '//other/', '/%ZZ', '/js/%252e%252e/', '/C:/file']) assert.throws(() => routePath(url));
  assert.equal(routePath('/styles/app.css?ignored=1'), '/styles/app.css');
  assert.equal(inside(projectRoot, path.resolve(projectRoot, '..', 'sibling')), false);
});

test('loopback server serves only public, sends security headers, refuses uploads and directory listing', async () => {
  const server = createStaticServer();
  await withServer(server, async () => {
  assert.equal(server.address().address, '127.0.0.1');
  const request = (url, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: url, method }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject); req.end();
  });
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  assert.equal(home.headers['x-robots-tag'], 'noindex, nofollow');
  assert.match(home.headers['content-security-policy'], /frame-ancestors 'none'/u);
  assert.match((await request('/styles/app.css')).headers['content-type'], /^text\/css/u);
  assert.match((await request('/js/app.mjs')).headers['content-type'], /^text\/javascript/u);
  for (const url of ['/package.json', '/test/scaffold.test.mjs', '/docs/PRIVACY-SECURITY.md', '/styles/', '/missing.html']) assert.equal((await request(url)).status, 404);
  for (const url of ['/../package.json', '/%2e%2e/package.json', '/%00', '/.env']) assert.equal((await request(url)).status, 400);
  assert.equal((await request('/', 'POST')).status, 405);
  assert.equal((await request('/', 'HEAD')).body, '');
  });
});

test('junction escape and a replaced static root are refused', async () => {
  const temporaryParent = path.join(projectRoot, 'test', '.tmp');
  await mkdir(temporaryParent, { recursive: true });
  const temporary = await mkdtemp(path.join(temporaryParent, 'scaffold-'));
  const linked = path.join(temporary, 'linked');
  const server = createStaticServer({ route: pathname => pathname === '/root' ? { root: linked, relative: 'index.html' } : { root: temporary, relative: 'linked/index.html' } });
  await withServer(server, async () => {
    await symlink(publicRoot, linked, process.platform === 'win32' ? 'junction' : 'dir');
    for (const pathname of ['/escape', '/root']) assert.equal((await fetch(`http://127.0.0.1:${server.address().port}${pathname}`)).status, 403);
    await assert.rejects(walk(linked), /SYMLINK_SOURCE_ROOT/u);
    await assert.rejects(walk(temporary), /SYMLINK_SOURCE_FILE/u);
  }, () => removeOwnFixture(temporaryParent, temporary));
});

test('scaffold cleanup preserves another fixture in the shared parent', async () => {
  const parent = path.join(projectRoot, 'test/.tmp'); await mkdir(parent, { recursive: true });
  const owned = await mkdtemp(path.join(parent, 'scaffold-owned-'));
  const sibling = await mkdtemp(path.join(parent, 'scaffold-sibling-'));
  const sentinel = path.join(sibling, 'synthetic.txt'); let ownedRemoved = false;
  try {
    await writeFile(sentinel, 'synthetic-other-suite-fixture');
    await removeOwnFixture(parent, owned); ownedRemoved = true;
    assert.equal(await readFile(sentinel, 'utf8'), 'synthetic-other-suite-fixture');
  } finally {
    try { if (!ownedRemoved) await removeOwnFixture(parent, owned); }
    finally { await removeOwnFixture(parent, sibling); }
  }
});

test('owned server closes even when an assertion or fixture cleanup fails', async () => {
  for (const failure of ['assertion', 'cleanup']) {
    const server = createStaticServer();
    await assert.rejects(withServer(server, async () => {
      if (failure === 'assertion') assert.fail('EXPECTED_ASSERTION_FAILURE');
    }, async () => {
      if (failure === 'cleanup') throw new Error('EXPECTED_CLEANUP_FAILURE');
    }), /EXPECTED_(?:ASSERTION|CLEANUP)_FAILURE/u);
    assert.equal(server.listening, false);
  }
});
