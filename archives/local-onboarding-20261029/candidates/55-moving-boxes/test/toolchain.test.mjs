import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, readFile, rm, mkdir, symlink, link } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, validatePublic } from '../scripts/contract.mjs';
import { build } from '../scripts/build.mjs';
import { route } from '../scripts/serve.mjs';

async function fixture(run) {
  await mkdir(path.join(ROOT, 'evidence/m2a'), { recursive: true });
  const root = await mkdtemp(path.join(ROOT, 'evidence/m2a/.toolchain-'));
  try { await cp(path.join(ROOT, 'public'), path.join(root, 'public'), { recursive: true }); await run(root); }
  finally {
    const resolved = path.resolve(root), allowed = path.resolve(ROOT, 'evidence/m2a') + path.sep;
    if (!resolved.startsWith(allowed) || !path.basename(resolved).startsWith('.toolchain-')) throw new Error('UNSAFE_TEST_CLEANUP');
    await rm(resolved, { recursive: true, force: true });
  }
}
test('T00 required closed static public files validate', async () => { assert.equal((await validatePublic(path.join(ROOT, 'public'))).length, 14); });
test('check rejects unknown input files', async () => fixture(async root => {
  await writeFile(path.join(root, 'public/unreviewed.txt'), 'fake');
  await assert.rejects(validatePublic(path.join(root, 'public')), /UNKNOWN_FILE/);
}));
test('build refuses stale unknown outputs and preserves them', async () => fixture(async root => {
  await mkdir(path.join(root, 'dist')); await writeFile(path.join(root, 'dist/unknown.txt'), 'preserve');
  await assert.rejects(build(root), /UNKNOWN_FILE/);
}));
test('build rejects junction output roots', async () => fixture(async root => {
  await mkdir(path.join(root, 'outside')); await symlink(path.join(root, 'outside'), path.join(root, 'dist'), 'junction');
  await assert.rejects(build(root), /UNSAFE_DIRECTORY/);
}));
test('check rejects unsafe DOM and remote resources', async () => fixture(async root => {
  const file = path.join(root, 'public/js/app.mjs');
  await writeFile(file, 'element.inner' + 'HTML = value;');
  await assert.rejects(validatePublic(path.join(root, 'public')), /FORBIDDEN_SOURCE/);
  await writeFile(file, 'import "https:' + '//example.invalid/code.mjs";');
  await assert.rejects(validatePublic(path.join(root, 'public')), /REMOTE_RESOURCE/);
}));
test('serve route is pure tested, never started: exact hosts, MIME routes and methods', () => {
  assert.deepEqual(route('GET', '127.0.0.1:4235', '/en/'), { status: 200, file: 'en/index.html' });
  assert.equal(route('GET', 'localhost:4235', '/').status, 400);
  assert.equal(route('POST', '127.0.0.1:4235', '/').status, 405);
  for (const url of ['/../AGENTS.md', '/%2e%2e/a', '/js\\app.mjs', '/missing', '/_headers', '/?input=fake']) assert.equal(route('GET', '127.0.0.1:4235', url).status, 404);
});
test('check rejects semantic metadata drift and unknown local assets', async () => fixture(async root => {
  const file = path.join(root, 'public/index.html'); const original = await readFile(file, 'utf8');
  await writeFile(file, original.replace('<h1>搬家裝箱與物品定位</h1>', '<h1>Unrelated heading</h1>'));
  await assert.rejects(validatePublic(path.join(root, 'public')), /SEMANTIC_METADATA_MISMATCH/);
  await writeFile(file, original.replace('src="/js/app.mjs"', 'src="/unknown.mjs"'));
  await assert.rejects(validatePublic(path.join(root, 'public')), /UNKNOWN_LOCAL_RESOURCE/);
}));
test('check rejects all inline handlers and a missing connect-src restriction', async () => fixture(async root => {
  const file = path.join(root, 'public/index.html'); const original = await readFile(file, 'utf8');
  await writeFile(file, original.replace('<body>', '<body onpointerdown="bad()">'));
  await assert.rejects(validatePublic(path.join(root, 'public')), /UNSAFE_PREVIEW_HTML/);
  await writeFile(file, original);
  const headers = path.join(root, 'public/_headers'); await writeFile(headers, (await readFile(headers, 'utf8')).replace("connect-src 'none'", 'connect-src *'));
  await assert.rejects(validatePublic(path.join(root, 'public')), /MISSING_SECURITY_HEADER/);
}));
test('build refuses hard-linked allowed outputs', async () => fixture(async root => {
  await mkdir(path.join(root, 'dist')); await writeFile(path.join(root, 'other.txt'), 'preserve');
  await link(path.join(root, 'other.txt'), path.join(root, 'dist/index.html'));
  await assert.rejects(build(root), /UNSAFE_FILE_LINK/);
  assert.equal(await readFile(path.join(root, 'other.txt'), 'utf8'), 'preserve');
}));
