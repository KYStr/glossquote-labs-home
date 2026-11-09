import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, copyFile, writeFile, readFile, rm, link, symlink } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { request } from 'node:http';
import { ROOT, ASSETS, checkedTree, verifyDist } from '../scripts/files.mjs';
import { checkPreview } from '../scripts/check.mjs';
import { buildPreview } from '../scripts/build.mjs';
import { startPreview } from '../scripts/serve.mjs';

async function fixture(t) {
  const tmpRoot = resolve(ROOT, 'test/.tmp'); await mkdir(tmpRoot, { recursive: true });
  const directory = await mkdtemp(join(tmpRoot, 'site-'));
  t.after(async () => {
    const rel = relative(tmpRoot, resolve(directory));
    if (!rel || rel.startsWith('..') || rel.includes(':') || !rel.startsWith('site-')) throw new Error('UNSAFE_CLEANUP');
    await rm(directory, { recursive: true, force: false });
  });
  await copyFile(join(ROOT, 'package.json'), join(directory, 'package.json'));
  for (const file of ASSETS) { const parts = file.split('/'); parts.pop(); await mkdir(join(directory, 'public', ...parts), { recursive: true }); await copyFile(join(ROOT, 'public', file), join(directory, 'public', file)); }
  return directory;
}
test('real preview check/build creates only approved assets and detects stale output', async (t) => {
  const root = await fixture(t);
  assert.equal((await checkPreview(root)).length, 9);
  const built = await buildPreview(root); assert.equal(built.length, 9);
  assert.deepEqual(await checkedTree(join(root, 'public')), await verifyDist(root));
  await writeFile(join(root, 'dist/robots.txt'), 'stale');
  await assert.rejects(checkPreview(root), /STALE_BUILD/);
  await buildPreview(root); assert.equal(await readFile(join(root, 'dist/robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
});
test('unknown source/output files, nested directory, HTML drift and hardlinks fail closed', async (t) => {
  const root = await fixture(t); await buildPreview(root);
  await writeFile(join(root, 'dist/private.txt'), 'KEEP'); await assert.rejects(buildPreview(root), /UNEXPECTED_OR_LINKED_FILE/); assert.equal(await readFile(join(root, 'dist/private.txt'), 'utf8'), 'KEEP');
  await writeFile(join(root, 'public/private.txt'), 'CANARY'); await assert.rejects(checkedTree(join(root, 'public')), /UNEXPECTED_OR_LINKED_FILE/);
  const nested = await fixture(t); await mkdir(join(nested, 'public/unexpected')); await assert.rejects(checkedTree(join(nested, 'public')), /UNEXPECTED_DIRECTORY/);
  const drift = await fixture(t); await writeFile(join(drift, 'public/index.html'), '<h1>wrong</h1>'); await assert.rejects(checkPreview(drift), /PAGE_TEMPLATE_DRIFT/);
  const linked = await fixture(t); await link(join(linked, 'public/robots.txt'), join(linked, 'hardlink.txt')); await assert.rejects(checkedTree(join(linked, 'public')), /UNEXPECTED_OR_LINKED_FILE/);
});
test('junction/symlink root is rejected rather than traversed', async (t) => {
  const root = await fixture(t);
  const alias = join(root, 'alias');
  await symlink(join(root, 'public'), alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(checkedTree(alias), /UNSAFE_ROOT/);
});
test('preview has strict loopback routes, MIME, HEAD, 404/405, no SPA fallback', async (t) => {
  const server = await startPreview({ port: 0 }); t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1'); const port = server.address().port;
  async function get(path, method = 'GET') {
    return new Promise((resolve, reject) => { const req = request({ hostname: '127.0.0.1', port, path, method }, res => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })); }); req.on('error', reject); req.end(); });
  }
  for (const [path, type] of [['/index.html', 'text/html'], ['/en/index.html', 'text/html'], ['/styles/app.css', 'text/css'], ['/js/app.mjs', 'text/javascript'], ['/robots.txt', 'text/plain']]) {
    const res = await get(path); assert.equal(res.status, 200); assert(res.headers['content-type'].startsWith(type)); assert.equal(res.headers['x-content-type-options'], 'nosniff'); assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow');
    const head = await get(path, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(Number(head.headers['content-length']), res.body.length);
  }
  assert.equal((await get('/')).status, 200);
  for (const path of ['/en/', '/missing', '/package.json', '/../package.json', '/%2e%2e/package.json', '/js/../../package.json', '/index.html?title=x', '/sitemap.xml', '/docs/BRAND.md']) assert.equal((await get(path)).status, 404);
  const post = await get('/index.html', 'POST'); assert.equal(post.status, 405); assert.equal(post.headers.allow, 'GET, HEAD');
});
test('occupied port fallback preserves the existing task server', async (t) => {
  const first = await startPreview({ port: 0 }); t.after(() => new Promise(resolve => first.close(resolve)));
  const second = await startPreview({ port: first.address().port, fallback: true }); t.after(() => new Promise(resolve => second.close(resolve)));
  assert.notEqual(first.address().port, second.address().port); assert(first.listening); assert(second.listening);
});
