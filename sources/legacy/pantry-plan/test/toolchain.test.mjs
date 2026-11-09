import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile, readFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, inside, validatePublic } from '../scripts/files.mjs';
import { inspectPublic } from '../scripts/check.mjs';
import { build } from '../scripts/build.mjs';
import { createHandler } from '../scripts/serve.mjs';

async function scratch(fn) {
  const parent = join(ROOT, 'evidence/m2a');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, 'sandbox-'));
  try { await cp(join(ROOT, 'public'), join(root, 'public'), { recursive: true }); await fn(root); }
  finally { if (!inside(parent, root)) throw new Error('UNSAFE_CLEANUP'); await rm(root, { recursive: true }); }
}

test('T00 closed public source and preview structure', async () => {
  const texts = await validatePublic(join(ROOT, 'public'));
  inspectPublic(texts);
  assert.equal(texts.size, 14);
});
test('T00 check rejects unsafe markup and indexing', async () => {
  const source = await validatePublic(join(ROOT, 'public'));
  for (const content of ['<script src="https://bad.invalid/x.js"></script>', '<div onclick="bad()">x</div>', '<script>eval("x")</script>', '<script>arbitrary()</script>', '<img src="https://glossquote.com/index.html">', '<iframe src="/index.html"></iframe>']) {
    const texts = new Map(source);
    texts.set('index.html', texts.get('index.html') + content);
    assert.throws(() => inspectPublic(texts));
  }
  const texts = new Map(source);
  texts.set('index.html', texts.get('index.html').replace('noindex,nofollow', 'index,follow'));
  assert.throws(() => inspectPublic(texts), /PREVIEW_INDEXING/);
});
test('check rejects a missing module, side-effect import outside public and duplicate ids', async () => {
  const source = await validatePublic(join(ROOT, 'public'));
  for (const script of ["import './missing.mjs';", "import '../outside.mjs';", "import 'some-package';"]) {
    const texts = new Map(source); texts.set('js/app.mjs', script); assert.throws(() => inspectPublic(texts));
  }
  const texts = new Map(source); texts.set('index.html', texts.get('index.html') + '<p id="workspace">duplicate</p>');
  assert.throws(() => inspectPublic(texts), /DUPLICATE_ID/);
});
test('build rejects junction directories, unknown directories and linked output without touching targets', async () => {
  await scratch(async root => {
    const external = join(root, 'external'); await mkdir(external); await writeFile(join(external, 'keep.txt'), 'untouched');
    await symlink(external, join(root, 'public/js/link'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(build(root), /UNSAFE_PATH/);
    assert.equal(await readFile(join(external, 'keep.txt'), 'utf8'), 'untouched');
    await rm(join(root, 'public/js/link'));
    await mkdir(join(root, 'public/unknown-dir')); await assert.rejects(build(root), /UNKNOWN_DIRECTORY/);
    await rm(join(root, 'public/unknown-dir'), { recursive: true });
    await symlink(external, join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(build(root), /UNSAFE_DIRECTORY/);
    assert.equal(await readFile(join(external, 'keep.txt'), 'utf8'), 'untouched');
  });
});
test('T00 build copies real bytes and rejects unknown source/output without deleting it', async () => {
  await scratch(async root => {
    assert.equal((await build(root)).files, 14);
    assert.deepEqual(await readFile(join(root, 'dist/index.html')), await readFile(join(root, 'public/index.html')));
    await writeFile(join(root, 'dist/keep.txt'), 'preserve');
    await assert.rejects(build(root), /UNKNOWN_OUTPUT/);
    assert.equal(await readFile(join(root, 'dist/keep.txt'), 'utf8'), 'preserve');
    await writeFile(join(root, 'public/unknown.txt'), 'reject');
    await assert.rejects(build(root), /PUBLIC_ALLOWLIST/);
  });
});
test('T00 HTTP handler contract in memory; no server started', async () => {
  const handler = await createHandler(join(ROOT, 'public'));
  function request(url, method = 'GET', host = '127.0.0.1:4234') {
    const result = {};
    handler({ url, method, headers: { host } }, { writeHead: (status, headers) => Object.assign(result, { status, headers }), end: body => { result.body = body; } });
    return result;
  }
  assert.equal(request('/').status, 200);
  assert.equal(request('/en/').status, 200);
  assert.equal(request('/js/core/schema.mjs').headers['Content-Type'], 'text/javascript; charset=utf-8');
  for (const path of ['/missing', '/_headers', '/../package.json', '/%2e%2e/package.json', '/index.html?data=x', '//index.html']) assert.equal(request(path).status, 404);
  assert.equal(request('/', 'POST').status, 405);
  assert.equal(request('/', 'GET', 'evil.invalid').status, 421);
  assert.equal(request('/', 'HEAD').body, undefined);
});
