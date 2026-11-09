import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm, link, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { request, createServer } from 'node:http';
import { PROJECT_ROOT, PUBLIC_FILES, validatePublic, validateHtml, inside, verifyRoot, htmlTags } from '../scripts/validation.mjs';
import { build } from '../scripts/build.mjs';
import { startPreview } from '../scripts/serve.mjs';

async function fixture(callback) {
  const root = await mkdtemp(join(PROJECT_ROOT, 'test', '.sandbox-'));
  try {
    await cp(join(PROJECT_ROOT, 'public'), join(root, 'public'), { recursive: true });
    await cp(join(PROJECT_ROOT, 'package.json'), join(root, 'package.json'));
    await callback(root);
  } finally {
    assert.equal(inside(join(PROJECT_ROOT, 'test'), root), true);
    await verifyRoot(root);
    await rm(root, { recursive: true, force: true });
  }
}
const get = (port, path = '/', method = 'GET', host = `127.0.0.1:${port}`) => new Promise((yes, no) => {
  const req = request({ hostname: '127.0.0.1', port, path, method, headers: { Host: host } }, res => {
    const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => yes({ status: res.statusCode, headers: res.headers, bytes: Buffer.concat(chunks) }));
  }); req.on('error', no); req.end();
});

test('check validates real assets, syntax, references and locale structure', async () => {
  assert.deepEqual(await validatePublic(), PUBLIC_FILES);
  const en = await readFile(join(PROJECT_ROOT, 'public/en/index.html'), 'utf8');
  assert.throws(() => validateHtml(en.replace('href="/styles/app.css"', 'href="//example.invalid/app.css"'), 'en'), /HTML_REFERENCE/);
  assert.throws(() => validateHtml(en.replace('type="text"', 'type="text" maxlength="32"'), 'en'), /SILENT_TRUNCATION/);
  assert.throws(() => validateHtml(en.replace('id="limit"', 'id="limit" oninput="alert(1)"'), 'en'), /HTML_ACTIVE_ATTRIBUTE/);
  assert.throws(() => validateHtml(en.replace('href="/styles/app.css"', 'href="/styles/app.css" href="/index.html"'), 'en'), /DUPLICATE_ATTRIBUTE/);
  assert.equal(htmlTags('<html lang="en"><p title="a > b">x</p></html>')[1].attrs.get('title'), 'a > b');
});
test('build output exactly matches allowed public bytes, twice', async () => fixture(async root => {
  assert.deepEqual(await build(root), PUBLIC_FILES);
  for (const file of PUBLIC_FILES) assert.deepEqual(await readFile(join(root, 'dist', file)), await readFile(join(root, 'public', file)));
  assert.deepEqual(await build(root), PUBLIC_FILES);
}));
test('unknown output sentinel blocks build before any overwrite or deletion', async () => fixture(async root => {
  await build(root); await writeFile(join(root, 'dist/sentinel.txt'), 'SYNTHETIC_SENTINEL');
  await writeFile(join(root, 'dist/index.html'), 'original reviewed dummy output');
  await assert.rejects(build(root), /UNKNOWN_ASSET/);
  assert.equal(await readFile(join(root, 'dist/sentinel.txt'), 'utf8'), 'SYNTHETIC_SENTINEL');
  assert.equal(await readFile(join(root, 'dist/index.html'), 'utf8'), 'original reviewed dummy output');
}));
test('hardlink targets are refused without modifying the linked sentinel', async () => fixture(async root => {
  await mkdir(join(root, 'dist')); await writeFile(join(root, 'sentinel.txt'), 'SYNTHETIC_SENTINEL');
  await link(join(root, 'sentinel.txt'), join(root, 'dist/index.html'));
  await assert.rejects(build(root), /HARDLINK_REFUSED/);
  assert.equal(await readFile(join(root, 'sentinel.txt'), 'utf8'), 'SYNTHETIC_SENTINEL');
}));
test('junction/symlink source and target escape are refused; sentinel remains', async () => fixture(async root => {
  await mkdir(join(root, 'outside')); await writeFile(join(root, 'outside/sentinel.txt'), 'SYNTHETIC_SENTINEL');
  await symlink(join(root, 'outside'), join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(build(root), /LINK_REFUSED/);
  assert.equal(await readFile(join(root, 'outside/sentinel.txt'), 'utf8'), 'SYNTHETIC_SENTINEL');
}));
test('source hardlinks and unapproved assets fail validation', async () => fixture(async root => {
  await writeFile(join(root, 'public/unknown.json'), '{}'); await assert.rejects(validatePublic(root), /UNKNOWN_ASSET/);
  await rm(join(root, 'public/unknown.json'));
  await link(join(root, 'public/index.html'), join(root, 'sentinel.html'));
  await assert.rejects(validatePublic(root), /HARDLINK_REFUSED/);
}));
test('preview binds only loopback and rejects methods, bad hosts, hidden/traversal/unknown paths', async () => {
  const preview = await startPreview({ port: 0 });
  try {
    assert.equal(preview.server.address().address, '127.0.0.1');
    for (const [path, mime] of [['/', 'text/html; charset=utf-8'], ['/en/', 'text/html; charset=utf-8'], ['/js/app.mjs', 'text/javascript; charset=utf-8'], ['/styles/app.css', 'text/css; charset=utf-8']]) {
      const res = await get(preview.assignedPort, path); assert.equal(res.status, 200); assert.equal(res.headers['content-type'], mime); assert.equal(res.headers['cache-control'], 'no-store');
    }
    const head = await get(preview.assignedPort, '/', 'HEAD'); assert.equal(head.status, 200); assert.equal(head.bytes.length, 0);
    for (const path of ['/../package.json', '/%2e%2e/package.json', '/%2e%2e%5cpackage.json', '/.hidden', '/test/packing-list.test.mjs', '/package.json', '/styles/missing.css', '/index.html%00']) assert.equal((await get(preview.assignedPort, path)).status, 404);
    assert.equal((await get(preview.assignedPort, '/%', 'GET')).status, 400);
    for (const method of ['POST', 'PUT', 'DELETE']) assert.equal((await get(preview.assignedPort, '/', method)).status, 405);
    assert.equal((await get(preview.assignedPort, '/', 'GET', 'example.invalid')).status, 400);
  } finally { await new Promise(done => preview.server.close(done)); }
});
test('occupied requested port falls back to OS-assigned loopback port, leaves owner alive', async () => {
  const owner = createServer(); await new Promise(done => owner.listen(0, '127.0.0.1', done));
  const occupied = owner.address().port; const preview = await startPreview({ port: occupied });
  try { assert.notEqual(preview.assignedPort, occupied); assert.equal(preview.requestedPort, occupied); assert.equal(owner.listening, true); assert.equal(preview.server.address().address, '127.0.0.1'); }
  finally { await new Promise(done => preview.server.close(done)); await new Promise(done => owner.close(done)); }
});
test('server refuses a junction public root', async () => fixture(async root => {
  const alias = join(root, 'alias'); await mkdir(alias); await symlink(join(root, 'public'), join(alias, 'public'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(startPreview({ root: alias, port: 0 }), /LINK_REFUSED/);
}));
test('inside() boundary refuses siblings sharing a prefix', () => {
  assert.equal(inside(PROJECT_ROOT, resolve(PROJECT_ROOT, '../22-packing-list-evil/file')), false);
  assert.equal(inside(PROJECT_ROOT, join(PROJECT_ROOT, 'dist/index.html')), true);
});
