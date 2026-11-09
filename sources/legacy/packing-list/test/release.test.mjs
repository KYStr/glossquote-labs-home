import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, mkdir, readFile, writeFile, symlink, link } from 'node:fs/promises';
import { join } from 'node:path';
import { request } from 'node:http';
import { PROJECT_ROOT, verifyRoot, sha256 } from '../scripts/validation.mjs';
import { buildProduction, PRODUCTION_ORIGIN, assertOrigin } from '../scripts/production-build.mjs';
import { checkProduction, validateProductionHtml } from '../scripts/production-check.mjs';
import { startProductionPreview } from '../scripts/production-serve.mjs';
import { crc32, inspectZip, extractZip } from '../scripts/source-archive.mjs';

async function fixture(callback) {
  const root = await mkdtemp(join(PROJECT_ROOT, 'test/.sandbox-release-'));
  try { await cp(join(PROJECT_ROOT, 'public'), join(root, 'public'), { recursive: true }); for (const file of ['package.json', 'wrangler.jsonc']) await cp(join(PROJECT_ROOT, file), join(root, file)); await callback(root); }
  finally { await verifyRoot(root); await rm(root, { recursive: true, force: true }); }
}
const get = (port, path, method = 'GET') => new Promise((yes, no) => {
  const req = request({ hostname: '127.0.0.1', port, path, method }, res => { const chunks = []; res.on('data', data => chunks.push(data)); res.on('end', () => yes({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') })); }); req.on('error', no); req.end();
});
test('production has exact bilingual SEO/CSP/robots/sitemap and unchanged preview/runtime', async () => fixture(async root => {
  const before = await readFile(join(root, 'public/index.html')); await buildProduction(root); const result = await checkProduction(root);
  assert.equal(result.files.length, 12); assert.deepEqual(await readFile(join(root, 'public/index.html')), before);
  assert.match(before.toString(), /noindex,nofollow/); assert.equal(before.toString().includes('rel="canonical"'), false);
  assert.equal(await readFile(join(root, 'public/robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
  assert.equal(await readFile(join(root, 'dist/robots.txt'), 'utf8').catch(() => ''), '');
}));
test('production origin allowlist rejects alternate, insecure and suffixed origins', () => {
  assertOrigin(PRODUCTION_ORIGIN); for (const origin of ['http://packing.glossquote.com', 'https://packing.glossquote.com/', 'https://other.invalid', 'https://packing.glossquote.com.evil.invalid']) assert.throws(() => assertOrigin(origin));
});
test('wrong canonical and missing alternate do not pass the production verifier', async () => fixture(async root => {
  await buildProduction(root); const html = await readFile(join(root, 'dist-production/en/index.html'), 'utf8');
  assert.throws(() => validateProductionHtml(html.replace('rel="canonical" href="https://packing.glossquote.com/en/index.html"', 'rel="canonical" href="https://other.invalid/en/index.html"'), 'en', 'en/index.html'));
  assert.throws(() => validateProductionHtml(html.replace('hreflang="x-default"', 'hreflang="missing"'), 'en', 'en/index.html'));
}));
test('modified M1 source is rejected before production output changes', async () => fixture(async root => {
  await mkdir(join(root, 'dist-production')); await writeFile(join(root, 'dist-production/index.html'), 'SENTINEL');
  await writeFile(join(root, 'public/js/core/packing-list.mjs'), (await readFile(join(root, 'public/js/core/packing-list.mjs'), 'utf8')) + '\n');
  await assert.rejects(buildProduction(root), /M1_PREVIEW_CHANGED/); assert.equal(await readFile(join(root, 'dist-production/index.html'), 'utf8'), 'SENTINEL');
}));
test('stale unknown/hardlink/junction production targets fail closed without overwriting sentinel', async () => {
  for (const mode of ['unknown', 'hardlink', 'junction']) await fixture(async root => {
    await mkdir(join(root, 'outside')); await writeFile(join(root, 'outside/sentinel.txt'), 'SENTINEL');
    if (mode === 'junction') await symlink(join(root, 'outside'), join(root, 'dist-production'), process.platform === 'win32' ? 'junction' : 'dir');
    else { await mkdir(join(root, 'dist-production')); if (mode === 'unknown') await writeFile(join(root, 'dist-production/unknown.txt'), 'SENTINEL'); else await link(join(root, 'outside/sentinel.txt'), join(root, 'dist-production/index.html')); }
    await assert.rejects(buildProduction(root)); assert.equal(await readFile(join(root, 'outside/sentinel.txt'), 'utf8'), 'SENTINEL');
  });
});
test('local production HTTP has real missing404, correct MIME, CSP and method rejection', async () => fixture(async root => {
  await buildProduction(root); const preview = await startProductionPreview({ root });
  try {
    assert.equal(preview.server.address().address, '127.0.0.1');
    for (const [path, type] of [['/index.html', 'text/html'], ['/en/index.html', 'text/html'], ['/js/core/packing-list.mjs', 'text/javascript'], ['/styles/app.css', 'text/css'], ['/sitemap.xml', 'application/xml'], ['/robots.txt', 'text/plain']]) {
      const res = await get(preview.port, path); assert.equal(res.status, 200); assert.match(res.headers['content-type'], new RegExp(type)); assert.equal(res.headers['x-content-type-options'], 'nosniff'); assert.match(res.headers['content-security-policy'], /connect-src 'none'/);
    }
    for (const path of ['/missing', '/en/missing', '/js/missing.mjs', '/_headers']) { const res = await get(preview.port, path); assert.equal(res.status, 404); assert.match(res.headers['content-type'], /text\/html/); assert.equal(res.body.includes('id="add-item"'), false); }
    assert.match((await get(preview.port, '/en/missing')).body, /Page not found/);
    assert.equal((await get(preview.port, '/index.html', 'HEAD')).body, ''); assert.equal((await get(preview.port, '/index.html', 'POST')).status, 405);
  } finally { await new Promise(done => preview.server.close(done)); }
}));

// Minimal fake ZIP writer supplies adversarial archives; actual release uses Git archive.
function zip(name, data = Buffer.from('synthetic'), attrs = 0x81a40000) {
  const filename = Buffer.from(name), local = Buffer.alloc(30), central = Buffer.alloc(46), end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(0x314, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(attrs >>> 0, 38);
  const start = local.length + filename.length + data.length; end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + filename.length, 12); end.writeUInt32LE(start, 16);
  return Buffer.concat([local, filename, data, central, filename, end]);
}
test('ZIP verifies payload hashes and CRC; wrong data and symlinks are rejected', () => {
  const data = Buffer.from('synthetic'), files = [{ path: 'safe.txt', bytes: data.length, sha256: sha256(data) }];
  assert.equal(inspectZip(zip('safe.txt', data), files).files.length, 1);
  assert.throws(() => inspectZip(zip('safe.txt', Buffer.from('different')), files), /ZIP_BLOB_MISMATCH/);
  assert.throws(() => inspectZip(zip('safe.txt', data, 0xa1ff0000), files), /ZIP_LINK_OR_SPECIAL/);
  const corrupt = zip('safe.txt', data); corrupt[38] ^= 1; assert.throws(() => inspectZip(corrupt, files), /ZIP_CRC_OR_SIZE/);
});
test('ZIP traversal/absolute/device/unknown paths rejected before writes; extraction refuses populated targets', async () => fixture(async root => {
  const data = Buffer.from('synthetic'), files = [{ path: 'safe.txt', bytes: data.length, sha256: sha256(data) }];
  for (const path of ['../sentinel.txt', '/absolute.txt', 'C:/absolute.txt', 'dir/../sentinel.txt', 'NUL.txt', 'other.txt']) await assert.rejects(extractZip(zip(path, data), files, join(root, 'unpack'), root));
  const result = await extractZip(zip('safe.txt', data), files, join(root, 'unpack'), root); assert.equal(result.status, 'PASS_EXACT_GIT_BLOBS');
  assert.equal(await readFile(join(root, 'unpack/safe.txt'), 'utf8'), 'synthetic');
  await assert.rejects(extractZip(zip('safe.txt', data), files, join(root, 'unpack'), root), /NOT_EMPTY/);
}));
