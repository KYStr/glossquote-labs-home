import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, writeFile, readFile, rm, symlink, lstat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { ROOT, PUBLIC_FILES, readPublic, inspectTree } from '../scripts/files.mjs';
import { checkProject } from '../scripts/check.mjs';
import { buildPreview } from '../scripts/build.mjs';
import { createRequestHandler } from '../scripts/serve.mjs';

async function fixture(t, { full = false } = {}) {
  const parent = resolve(ROOT, 'test');
  const root = await mkdtemp(join(parent, '.scratch-'));
  t.after(async () => {
    const exact = resolve(root);
    assert.ok(exact.startsWith(parent + sep) && exact.slice(parent.length + 1).startsWith('.scratch-'));
    assert.equal((await lstat(exact)).isSymbolicLink(), false);
    await rm(exact, { recursive: true });
  });
  await cp(resolve(ROOT, 'public'), join(root, 'public'), { recursive: true });
  if (full) {
    await cp(resolve(ROOT, 'scripts'), join(root, 'scripts'), { recursive: true });
    await cp(resolve(ROOT, 'package.json'), join(root, 'package.json'));
    await cp(resolve(ROOT, 'wrangler.jsonc'), join(root, 'wrangler.jsonc'));
    await mkdir(join(root, 'test')); await writeFile(join(root, 'test', 'synthetic.test.mjs'), 'export {};\n');
  }
  return root;
}

test('offline handler GET/HEAD, exact MIME and noindex/security headers; no listener', async () => {
  const files = await readPublic(); const handler = createRequestHandler(files);
  function request(path, method = 'GET', host = '127.0.0.1:4240') {
    let status, headers, body;
    handler({ method, url: path, headers: { host } }, { writeHead(s, h) { status = s; headers = h; }, end(b) { body = b; } });
    return { status, headers, body };
  }
  for (const [path, mime, file] of [['/', 'text/html;charset=utf-8', 'index.html'], ['/en/', 'text/html;charset=utf-8', 'en/index.html'], ['/styles/app.css', 'text/css;charset=utf-8', 'styles/app.css'], ['/js/core/csv.mjs', 'text/javascript;charset=utf-8', 'js/core/csv.mjs'], ['/js/app.js', 'text/javascript;charset=utf-8', 'js/app.js'], ['/robots.txt', 'text/plain;charset=utf-8', 'robots.txt']]) {
    const get = request(path), head = request(path, 'HEAD');
    assert.equal(get.status, 200); assert.equal(get.headers['Content-Type'], mime);
    assert.ok(get.body.equals(files.get(file))); assert.equal(head.status, 200); assert.equal(head.body, undefined);
    assert.equal(head.headers['Content-Length'], String(files.get(file).length));
    assert.equal(get.headers['X-Robots-Tag'], 'noindex, nofollow'); assert.equal(get.headers['Cache-Control'], 'no-store');
    assert.ok(get.headers['Content-Security-Policy'].includes("connect-src 'none'"));
  }
  for (const path of ['/missing', '/package.json', '/_headers', '/index.html?x=1']) assert.equal(request(path).status, 404);
  for (const path of ['/../package.json', '/./index.html', '/%2e%2e/file', '/%69ndex.html', '/\\x', '//example.test/', 'http://example.test/', '/%ZZ']) assert.equal(request(path).status, 400);
  for (const host of ['evil.test', 'localhost:4240', '127.0.0.1:80', undefined]) assert.equal(request('/', 'GET', host).status, host === undefined ? 200 : 400);
  // Explicit missing Host (the helper default above deliberately supplies the usual Host).
  let missingStatus; handler({ method: 'GET', url: '/', headers: {} }, { writeHead(s) { missingStatus = s; }, end() {} }); assert.equal(missingStatus, 400);
  const post = request('/', 'POST'); assert.equal(post.status, 405); assert.equal(post.headers.Allow, 'GET, HEAD');
});
test('build copies exactly closed assets, repeat is stable, no documents/evidence in dist', async (t) => {
  const root = await fixture(t); const first = await buildPreview(root), second = await buildPreview(root);
  assert.deepEqual(first, second); assert.equal(first.length, PUBLIC_FILES.length);
  assert.deepEqual(await inspectTree(join(root, 'dist')), [...PUBLIC_FILES].sort());
  const source = await readPublic(join(root, 'public')), output = await readPublic(join(root, 'dist'));
  for (const [name, bytes] of source) assert.ok(bytes.equals(output.get(name)));
});
test('unknown source/output or missing noindex fails before changing existing output', async (t) => {
  const root = await fixture(t); await buildPreview(root);
  const before = await readFile(join(root, 'dist', 'index.html'));
  await writeFile(join(root, 'dist', 'unexpected.txt'), 'keep');
  await assert.rejects(buildPreview(root), /UNKNOWN_FILE/);
  assert.equal(await readFile(join(root, 'dist', 'unexpected.txt'), 'utf8'), 'keep');
  assert.ok(before.equals(await readFile(join(root, 'dist', 'index.html'))));
  await writeFile(join(root, 'public', 'index.html'), '<h1>Missing noindex</h1>');
  await assert.rejects(buildPreview(root), /PREVIEW_NOINDEX_REQUIRED/);
  await writeFile(join(root, 'public', 'extra.txt'), 'source');
  await assert.rejects(buildPreview(root), /UNKNOWN_FILE/);
});
test('junction/symlink source and dist roots rejected without following or deleting targets', async (t) => {
  const root = await fixture(t); const target = join(root, 'target'); await mkdir(target);
  await symlink(target, join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildPreview(root), /UNSAFE_ROOT/);
  await symlink(target, join(root, 'public', 'unexpected-link'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(readPublic(join(root, 'public')), /LINK_REJECTED/);
  assert.equal((await lstat(target)).isDirectory(), true);
});
test('checker rejects wrong language SEO, unsafe DOM, and remote CSS via counterexamples', async (t) => {
  const root = await fixture(t, { full: true });
  const htmlPath = join(root, 'public', 'en', 'index.html'); const html = await readFile(htmlPath, 'utf8');
  await writeFile(htmlPath, html.replace('<html lang="en">', '<html lang="zh-Hant">'));
  await assert.rejects(checkProject(root)); await writeFile(htmlPath, html);
  const appPath = join(root, 'public', 'js', 'app.js'); const app = await readFile(appPath, 'utf8');
  await writeFile(appPath, app + '\nconst synthetic = node.innerHTML;\n');
  await assert.rejects(checkProject(root), /FORBIDDEN_API/); await writeFile(appPath, app);
  const cssPath = join(root, 'public', 'styles', 'app.css'); const css = await readFile(cssPath, 'utf8');
  await writeFile(cssPath, css + '\n@import "https://example.test/font.css";\n');
  await assert.rejects(checkProject(root));
});
