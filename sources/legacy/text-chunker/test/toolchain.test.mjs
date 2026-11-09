import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm, rmdir, link, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { PUBLIC_FILES, validateProject, manifest } from '../scripts/validation.mjs';
import { buildPublic } from '../scripts/build.mjs';
import { HOST, routePath, startPreview } from '../scripts/serve.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.resolve(project, 'test/.runs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(t) {
  await mkdir(evidence, { recursive: true });
  const root = await mkdtemp(path.join(evidence, 'fixture-'));
  const owned = path.resolve(root);
  assert.ok(owned.startsWith(evidence + path.sep) && path.basename(owned).startsWith('fixture-'));
  t.after(async () => {
    // This exact task-owned fixture is inside the checked evidence boundary.
    if (path.resolve(owned) !== root || !owned.startsWith(evidence + path.sep)) throw new Error('CLEANUP_BOUNDARY');
    await rm(owned, { recursive: true, force: true });
  });
  for (const file of PUBLIC_FILES) {
    const target = path.join(root, 'public', file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(project, 'public', file), target);
  }
  for (const file of ['validation.mjs', 'serve.mjs', 'check.mjs', 'build.mjs']) {
    await mkdir(path.join(root, 'scripts'), { recursive: true });
    await copyFile(path.join(project, 'scripts', file), path.join(root, 'scripts', file));
  }
  await copyFile(path.join(project, 'package.json'), path.join(root, 'package.json'));
  await mkdir(path.join(root, 'test'));
  await writeFile(path.join(root, 'test', 'fake.test.mjs'), '// Synthetic syntax fixture.\n');
  await mkdir(path.join(root, 'outside'));
  await writeFile(path.join(root, 'outside', 'sentinel.txt'), 'OUTSIDE_FAKE_SENTINEL\n');
  return root;
}
async function sentinelUnchanged(root, before) {
  assert.equal(hash(await readFile(path.join(root, 'outside', 'sentinel.txt'))), before);
}
function http(url, rawPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = request({ host: parsed.hostname, port: parsed.port, path: rawPath, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}
const close = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));

test('allowlist build is byte-identical; repeated build preserves outside sentinel', async t => {
  const root = await fixture(t);
  const sentinel = hash(await readFile(path.join(root, 'outside', 'sentinel.txt')));
  const built = await buildPublic(root);
  assert.equal(built.ok, true);
  assert.deepEqual(built.manifest, await manifest(path.join(root, 'public'), PUBLIC_FILES));
  assert.deepEqual(await buildPublic(root), built);
  await sentinelUnchanged(root, sentinel);
});
test('unreviewed public file, hidden directory and malformed syntax fail closed', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'public', 'private.txt'), 'FAKE_NOT_PUBLIC');
  await assert.rejects(validateProject(root), /UNKNOWN_PUBLIC_FILE/);
  await rm(path.join(root, 'public', 'private.txt'));
  await mkdir(path.join(root, 'public', '.hidden'));
  await assert.rejects(validateProject(root), /UNKNOWN_PUBLIC_DIRECTORY/);
  await rmdir(path.join(root, 'public', '.hidden'));
  await writeFile(path.join(root, 'public', 'js', 'core', 'text-chunker.mjs'), 'export function invalid( {');
  await assert.rejects(validateProject(root), /MODULE_SYNTAX_FAILED/);
});
test('unknown stale build target is retained and causes rejection before any write', async t => {
  const root = await fixture(t);
  await buildPublic(root);
  const before = await manifest(path.join(root, 'dist'), PUBLIC_FILES);
  await writeFile(path.join(root, 'dist', 'unexpected.txt'), 'FAKE_STALE');
  await assert.rejects(buildPublic(root), /UNKNOWN_PUBLIC_FILE/);
  assert.equal(await readFile(path.join(root, 'dist', 'unexpected.txt'), 'utf8'), 'FAKE_STALE');
  assert.deepEqual(await manifest(path.join(root, 'dist'), PUBLIC_FILES), before);
});
test('source hardlink rejected; external sentinel unchanged', async t => {
  const root = await fixture(t);
  const sentinel = hash(await readFile(path.join(root, 'outside', 'sentinel.txt')));
  await rm(path.join(root, 'public', 'robots.txt'));
  await link(path.join(root, 'outside', 'sentinel.txt'), path.join(root, 'public', 'robots.txt'));
  await assert.rejects(buildPublic(root), /HARDLINK_REJECTED/);
  await sentinelUnchanged(root, sentinel);
});
test('target hardlink rejected before overwriting external sentinel', async t => {
  const root = await fixture(t);
  const sentinel = hash(await readFile(path.join(root, 'outside', 'sentinel.txt')));
  await mkdir(path.join(root, 'dist'));
  await link(path.join(root, 'outside', 'sentinel.txt'), path.join(root, 'dist', 'index.html'));
  await assert.rejects(buildPublic(root), /HARDLINK_REJECTED/);
  await sentinelUnchanged(root, sentinel);
});
test('junction/symlink source and target escapes rejected, no sentinel writes', async t => {
  const root = await fixture(t);
  const sentinel = hash(await readFile(path.join(root, 'outside', 'sentinel.txt')));
  await symlink(path.join(root, 'outside'), path.join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildPublic(root), /LINK_REJECTED|RESOLVED_PATH_CHANGED/);
  await sentinelUnchanged(root, sentinel);
  // Remove only the exact owned link, not its external target.
  await rm(path.join(root, 'dist'));
  await rm(path.join(root, 'public', 'js'), { recursive: true });
  await symlink(path.join(root, 'outside'), path.join(root, 'public', 'js'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildPublic(root), /LINK_REJECTED|RESOLVED_PATH_CHANGED/);
  await sentinelUnchanged(root, sentinel);
});
test('active assets, local imports and preview indexing are checked', async t => {
  const root = await fixture(t);
  const app = path.join(root, 'public', 'js', 'app.mjs');
  const before = await readFile(app, 'utf8');
  await writeFile(app, before + '\nimport "./missing.mjs";\n');
  await assert.rejects(validateProject(root), /UNKNOWN_MODULE_IMPORT/);
  await writeFile(app, before + '\nfetch("https://fixture.invalid");\n');
  await assert.rejects(validateProject(root), /FORBIDDEN_RUNTIME_API/);
  await writeFile(app, before);
  await writeFile(path.join(root, 'public', 'robots.txt'), 'User-agent: *\nAllow: /\n');
  await assert.rejects(validateProject(root), /PREVIEW_ROBOTS_REQUIRED/);
});
test('static server rejects traversal, hidden/unknown files and methods; loopback only', async t => {
  const root = await fixture(t);
  const preview = await startPreview(root, 0);
  t.after(() => close(preview.server));
  assert.equal(preview.server.address().address, HOST);
  const page = await http(preview.url, '/index.html');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  assert.equal(page.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.match(page.headers['content-security-policy'], /connect-src 'none'/);
  assert.equal((await http(preview.url, '/en/')).status, 200);
  assert.equal((await http(preview.url, '/index.html', 'HEAD')).body, '');
  assert.equal((await http(preview.url, '/index.html', 'POST')).status, 405);
  for (const raw of ['/../package.json', '/%2e%2e/package.json', '/%252e%252e/package.json', '/js/%2e%2e/index.html', '/.hidden', '/scripts/serve.mjs', '/package.json', '/%00', '/js%5ccore/text-chunker.mjs', '//index.html', '/%zz']) {
    assert.equal(routePath(raw), null);
    assert.equal((await http(preview.url, raw)).status, 404);
  }
  assert.match((await http(preview.url, '/js/app.mjs')).headers['content-type'], /^text\/javascript/);
});
test('occupied port falls back to an OS-assigned port and retains existing service', async t => {
  const root = await fixture(t);
  const existing = await startPreview(root, 0);
  t.after(() => close(existing.server));
  const second = await startPreview(root, existing.port);
  t.after(() => close(second.server));
  assert.equal(second.fallback, true);
  assert.notEqual(second.port, existing.port);
  assert.equal(second.server.address().address, HOST);
  assert.equal((await http(existing.url, '/index.html')).status, 200);
  assert.equal((await http(second.url, '/index.html')).status, 200);
});

test('check rejects a changed loopback configuration', async t => {
  const root = await fixture(t);
  const server = path.join(root, 'scripts', 'serve.mjs');
  await writeFile(server, (await readFile(server, 'utf8')).replace("export const HOST = '127.0.0.1';", "export const HOST = '0.0.0.0';"));
  await assert.rejects(validateProject(root), /LOOPBACK_CONFIGURATION_REQUIRED/);
});
