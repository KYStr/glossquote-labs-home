import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { safeAssetPath, validateTree, checkSource, PUBLIC_FILES, ROOT } from '../scripts/check.mjs';
import { build } from '../scripts/build.mjs';
import { resolveRequest } from '../scripts/serve.mjs';

async function cleanup(folder) {
  const absolute = resolve(folder);
  assert.equal(dirname(absolute), resolve(tmpdir()));
  assert.ok(basename(absolute).startsWith('gq39-scaffold-'));
  await rm(absolute, { recursive: true });
}
async function sourceCopy() {
  const folder = await mkdtemp(join(tmpdir(), 'gq39-scaffold-'));
  await writeFile(join(folder, 'package.json'), await readFile(join(ROOT, 'package.json')));
  for (const file of PUBLIC_FILES) {
    await mkdir(dirname(join(folder, 'public', file)), { recursive: true });
    await writeFile(join(folder, 'public', file), await readFile(join(ROOT, 'public', file)));
  }
  return folder;
}

test('closed source allowlist and relative paths', async () => {
  assert.deepEqual(await validateTree(join(ROOT, 'public')), [...PUBLIC_FILES].sort());
  for (const path of ['../x', '/x', 'C:/x', 'js\\x', 'js/./x', '%2e%2e/x', 'js//x']) assert.equal(safeAssetPath(path), false);
  assert.equal(safeAssetPath('js/core/session.mjs'), true);
});
test('unknown public files are rejected, never removed', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'gq39-scaffold-'));
  try {
    await mkdir(join(folder, 'js'));
    await writeFile(join(folder, 'private.txt'), 'synthetic');
    await assert.rejects(validateTree(folder, { complete: false }), /UNKNOWN_PUBLIC_ASSET/);
  } finally { await cleanup(folder); }
});
test('junction/symlink directories are rejected before traversing their contents', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'gq39-scaffold-'));
  try {
    await mkdir(join(folder, 'public')); await mkdir(join(folder, 'target'));
    await symlink(join(folder, 'target'), join(folder, 'public', 'js'), 'junction');
    await assert.rejects(validateTree(join(folder, 'public'), { complete: false }), /UNSAFE_ASSET_LINK/);
  } finally { await cleanup(folder); }
});
test('build refuses unknown existing output and preserves its bytes', async () => {
  const folder = await sourceCopy();
  try {
    await mkdir(join(folder, 'dist')); await writeFile(join(folder, 'dist', 'unexpected.txt'), 'synthetic-owned-file');
    await assert.rejects(build(folder), /UNKNOWN_PUBLIC_ASSET/);
    assert.equal(await readFile(join(folder, 'dist', 'unexpected.txt'), 'utf8'), 'synthetic-owned-file');
  } finally { await cleanup(folder); }
});
test('build copies exactly public byte-for-byte and retains noindex', async () => {
  const folder = await sourceCopy();
  try {
    assert.equal(await build(folder), PUBLIC_FILES.length);
    for (const file of PUBLIC_FILES) assert.deepEqual(await readFile(join(folder, 'dist', file)), await readFile(join(folder, 'public', file)));
  } finally { await cleanup(folder); }
});
test('check refuses dangerous APIs, external single-quoted resources, weakened CSP and wrong bilingual metadata', async () => {
  const mutations = [
    ['js/app.mjs', text => text + "\nfetch('/synthetic-only');", /FORBIDDEN_API/],
    ['index.html', text => text.replace('</main>', "<img src='https://invalid.example/synthetic.png'></main>"), /UNSAFE_HTML_RESOURCE/],
    ['index.html', text => text.replace("connect-src 'none'", "connect-src *"), /META_CSP_REQUIRED/],
    ['en/index.html', text => text.replace('<html lang="en">', '<html lang="fr">'), /LANGUAGE_METADATA_CONTRACT/],
    ['en/index.html', text => text.replace('Cover sensitive areas in an image</h1>', 'Wrong heading</h1>'), /LANGUAGE_METADATA_CONTRACT/],
  ];
  for (const [file, mutate, expected] of mutations) {
    const folder = await sourceCopy();
    try {
      const path = join(folder, 'public', file);
      await writeFile(path, mutate(await readFile(path, 'utf8')));
      await assert.rejects(checkSource(folder), expected);
    } finally { await cleanup(folder); }
  }
});
test('preview routing is exact, host bounded and method bounded without a listening server', () => {
  assert.deepEqual(resolveRequest('GET', '127.0.0.1:4219', '/'), { status: 200, file: 'index.html' });
  assert.deepEqual(resolveRequest('HEAD', 'localhost:4219', '/en/'), { status: 200, file: 'en/index.html' });
  assert.equal(resolveRequest('POST', '127.0.0.1:4219', '/').status, 405);
  assert.equal(resolveRequest('GET', 'evil.test:4219', '/').status, 403);
  for (const path of ['/../package.json', '/%2e%2e/package.json', '/_headers', '/unknown', '/index.html?q=a', '//index.html']) assert.equal(resolveRequest('GET', 'localhost:4219', path).status, 404);
});
