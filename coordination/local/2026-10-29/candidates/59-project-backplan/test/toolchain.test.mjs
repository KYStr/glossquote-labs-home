import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, cp, rm, symlink, lstat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { ROOT, PUBLIC_FILES, inspectTree } from '../scripts/files.mjs';
import { buildPreview } from '../scripts/build.mjs';
import { routeRequest } from '../scripts/serve.mjs';

async function scratch(run) {
  const parent = resolve(ROOT, 'evidence', 'm2a-2026-10-27');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, '.scratch-'));
  try { await run(directory); }
  finally {
    const target = resolve(directory);
    if (!target.startsWith(parent + sep + '.scratch-') || target === parent || (await lstat(target)).isSymbolicLink()) throw new Error('UNSAFE_CLEANUP');
    await rm(target, { recursive: true, force: false });
  }
}

test('preview builder copies all real source bytes, remains noindex, and refuses unknown stale output without deletion', async () => {
  await scratch(async root => {
    await cp(join(ROOT, 'public'), join(root, 'public'), { recursive: true });
    const result = await buildPreview(root);
    assert.equal(result.files, 10);
    for (const file of PUBLIC_FILES) assert.deepEqual(await readFile(join(root, 'dist', file)), await readFile(join(ROOT, 'public', file)));
    assert.ok((await readFile(join(root, 'dist', 'en/index.html'), 'utf8')).includes('content="noindex,nofollow"'));
    await writeFile(join(root, 'dist', 'stale.txt'), 'synthetic-preserve-me');
    await assert.rejects(buildPreview(root), /UNKNOWN_FILE/);
    assert.equal(await readFile(join(root, 'dist', 'stale.txt'), 'utf8'), 'synthetic-preserve-me');
  });
});
test('preview builder rejects unknown input and nested unknown directories before writing dist', async () => {
  await scratch(async root => {
    await cp(join(ROOT, 'public'), join(root, 'public'), { recursive: true });
    await mkdir(join(root, 'public', 'unexpected'));
    await assert.rejects(buildPreview(root), /UNKNOWN_DIRECTORY/);
    await assert.rejects(lstat(join(root, 'dist')), { code: 'ENOENT' });
  });
});
test('tree guard rejects a task-owned junction/symlink; no server or browser is started', async () => {
  await scratch(async root => {
    const source = join(root, 'source');
    await cp(join(ROOT, 'public'), source, { recursive: true });
    const link = join(root, 'link');
    await symlink(source, link, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(inspectTree(link), /UNSAFE_TREE_ROOT/);
    // Remove only the identified link; preserve target for exact scratch cleanup.
    await rm(link, { recursive: false });
  });
});
test('offline route contract only: exact GET/HEAD, MIME, noindex and private-data exclusion', async () => {
  const request = target => ({ method: 'GET', target, host: '127.0.0.1:4239' });
  for (const path of ['/', '/index.html', '/en/', '/en/index.html']) {
    const response = await routeRequest(request(path));
    assert.equal(response.status, 200);
    assert.ok(response.body.toString().includes('noindex,nofollow'));
    assert.equal(response.headers['Content-Type'], 'text/html;charset=utf-8');
    assert.equal(Number(response.headers['Content-Length']), response.body.length);
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.ok(response.headers['Content-Security-Policy'].includes("connect-src 'none'"));
  }
  for (const file of PUBLIC_FILES) {
    const response = await routeRequest({ ...request(`/${file}`), method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(response.body.length, 0);
    assert.ok(Number(response.headers['Content-Length']) > 0);
  }
  assert.equal((await routeRequest(request('/js/core/backplan.mjs'))).headers['Content-Type'], 'text/javascript;charset=utf-8');
  assert.equal((await routeRequest(request('/styles/app.css'))).headers['Content-Type'], 'text/css;charset=utf-8');
  for (const target of ['/missing', '/HANDOFF.md', '/package.json', '/test/helpers.mjs']) assert.equal((await routeRequest(request(target))).status, 404);
});
test('offline route contract only: method, Host, query, encoded and plain traversal rejection', async () => {
  const request = { method: 'GET', target: '/', host: '127.0.0.1:4239' };
  for (const method of ['POST', 'PUT', 'OPTIONS', 'DELETE']) {
    const response = await routeRequest({ ...request, method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.Allow, 'GET, HEAD');
  }
  for (const host of ['localhost:4239', 'evil.example', '127.0.0.1', '127.0.0.1:4240', '127.0.0.1:4239.evil']) assert.equal((await routeRequest({ ...request, host })).status, 421);
  for (const target of ['/../README.md', '/js/../index.html', '/%2e%2e/README.md', '/js%2fapp.js', '/\\README.md', '//index.html', '/?input=fake', '/#fake', 'http://127.0.0.1:4239/', '/\u0000']) assert.equal((await routeRequest({ ...request, target })).status, 400);
});
