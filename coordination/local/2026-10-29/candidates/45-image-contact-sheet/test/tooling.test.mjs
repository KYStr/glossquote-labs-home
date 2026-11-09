import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, readSources } from '../scripts/files.mjs';
import { buildTo } from '../scripts/build.mjs';
import { routeRequest, SECURITY_HEADERS } from '../scripts/serve.mjs';

test('preview routing checks methods, exact host, traversal and MIME without opening any server', () => {
  const request = (url, method = 'GET', host = '127.0.0.1:4225') => routeRequest({ method, host, url });
  assert.deepEqual(request('/'), { status: 200, file: 'index.html', type: 'text/html; charset=utf-8' });
  assert.equal(request('/en/', 'HEAD').file, 'en/index.html');
  assert.equal(request('/js/core/generate.mjs').type, 'text/javascript; charset=utf-8');
  for (const url of ['/missing', '/_headers', '/manifest.json', '/package.json', '/../AGENTS.md', '/%2e%2e/secret', '//en/', '/index.html?x=a', '/js\\app.js']) assert.equal(request(url).status, 404);
  assert.equal(request('/', 'POST').status, 405); assert.equal(request('/', 'GET', 'evil.example').status, 403);
  assert.equal(SECURITY_HEADERS['X-Robots-Tag'], 'noindex, nofollow');
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /connect-src 'none'/u);
});
test('build copies exact bytes/hashes and refuses unknown/stale output instead of deleting it', async () => {
  const evidence = path.join(ROOT, 'evidence', 'm1b'); await mkdir(evidence, { recursive: true });
  const sandbox = await mkdtemp(path.join(evidence, 'tooling-test-'));
  assert.ok(path.resolve(sandbox).startsWith(path.resolve(evidence) + path.sep));
  const destination = path.join(sandbox, 'output');
  // No recursive deletion: remove only the specific files/directories this test created.
  async function clean(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) { await clean(absolute); await rmdir(absolute); }
      else await unlink(absolute);
    }
  }
  try {
    const records = await buildTo({ destination });
    assert.equal(records.length, 13);
    const sources = await readSources();
    for (const file of PUBLIC_FILES) {
      const bytes = await readFile(path.join(destination, file)); assert.deepEqual(bytes, sources.get(file));
      assert.equal(records.find((r) => r.path === file).sha256, createHash('sha256').update(bytes).digest('hex'));
    }
    await writeFile(path.join(destination, 'stale.txt'), 'keep me');
    await assert.rejects(buildTo({ destination }), /FILE_ALLOWLIST_MISMATCH/u);
    assert.equal(await readFile(path.join(destination, 'stale.txt'), 'utf8'), 'keep me');
  } finally { await clean(sandbox); await rmdir(sandbox); }
});
test('both language copies have all fixed error codes and localized states', async () => {
  const { copy } = await import('../public/js/copy.mjs');
  const codes = ['TOO_MANY_FILES', 'FILE_TOO_LARGE', 'TOTAL_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'ANIMATED_PNG', 'IMAGE_HEADER_INVALID', 'EXIF_INVALID', 'PIXEL_LIMIT', 'EDGE_LIMIT', 'SHEET_PIXEL_LIMIT', 'DECODE_FAILED', 'ORIENTATION_MISMATCH', 'CANVAS_UNAVAILABLE', 'PNG_EXPORT_FAILED', 'OUTPUT_TOO_LARGE', 'CANCELLED'];
  assert.deepEqual(Object.keys(copy.en.errors).sort(), codes.sort());
  assert.deepEqual(Object.keys(copy['zh-TW'].errors).sort(), codes.sort());
  assert.deepEqual(Object.keys(copy.en).sort(), Object.keys(copy['zh-TW']).sort());
});
