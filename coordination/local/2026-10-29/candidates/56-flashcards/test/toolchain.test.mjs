import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { ROOT, PUBLIC_FILES, closedTree } from '../scripts/files.mjs';
import { checkProject } from '../scripts/check.mjs';
import { buildProject } from '../scripts/build.mjs';
import { staticResponse } from '../scripts/serve.mjs';

function fixture(run) {
  const parent = resolve(ROOT, 'evidence/m2a/fixtures');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, 'toolchain-fixture-'));
  try {
    cpSync(join(ROOT, 'public'), join(directory, 'public'), { recursive: true });
    cpSync(join(ROOT, 'package.json'), join(directory, 'package.json'));
    cpSync(join(ROOT, 'wrangler.jsonc'), join(directory, 'wrangler.jsonc'));
    run(directory);
  } finally {
    if (!resolve(directory).startsWith(`${parent}${sep}toolchain-fixture-`)) throw new Error('UNSAFE_CLEANUP');
    rmSync(directory, { recursive: true });
  }
}

test('T00 check/build produce exact preview files and bytes', () => fixture(directory => {
  assert.equal(checkProject(directory).files, PUBLIC_FILES.length);
  assert.equal(buildProject(directory).preview, 'noindex,nofollow');
  assert.deepEqual(closedTree(join(directory, 'dist'), PUBLIC_FILES), [...PUBLIC_FILES].sort());
  for (const file of PUBLIC_FILES) assert.deepEqual(readFileSync(join(directory, 'dist', file)), readFileSync(join(directory, 'public', file)));
}));
test('check rejects an unknown public file', () => fixture(directory => {
  writeFileSync(join(directory, 'public/secret.txt'), 'FAKE');
  assert.throws(() => checkProject(directory), /UNKNOWN_FILE/);
}));
test('check rejects remote CSS and unsafe DOM', () => fixture(directory => {
  writeFileSync(join(directory, 'public/styles/app.css'), '@import "https://example.invalid/f.css";');
  assert.throws(() => checkProject(directory), /EXTERNAL_CSS/);
  cpSync(join(ROOT, 'public/styles/app.css'), join(directory, 'public/styles/app.css'));
  writeFileSync(join(directory, 'public/js/app.mjs'), 'document.body.innerHTML = "test";');
  assert.throws(() => checkProject(directory), /UNSAFE_JS/);
}));
test('build preserves and rejects unknown stale output', () => fixture(directory => {
  mkdirSync(join(directory, 'dist'));
  writeFileSync(join(directory, 'dist/stale.txt'), 'preserve');
  assert.throws(() => buildProject(directory), /UNKNOWN_FILE/);
  assert.equal(readFileSync(join(directory, 'dist/stale.txt'), 'utf8'), 'preserve');
}));
test('build rejects a junction, without traversing it', () => fixture(directory => {
  mkdirSync(join(directory, 'outside'));
  symlinkSync(join(directory, 'outside'), join(directory, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => buildProject(directory), /UNSAFE_TREE/);
}));
test('static response routing, methods, Host and traversal are checked without a server', () => fixture(directory => {
  buildProject(directory);
  const request = { method: 'GET', host: '127.0.0.1:4236', path: '/' };
  assert.equal(staticResponse(request, directory).status, 200);
  assert.equal(staticResponse({ ...request, path: '/missing' }, directory).status, 404);
  assert.equal(staticResponse({ ...request, path: '/package.json' }, directory).status, 404);
  assert.equal(staticResponse({ ...request, method: 'POST' }, directory).status, 405);
  assert.equal(staticResponse({ ...request, host: 'evil.invalid' }, directory).status, 403);
  for (const path of ['/../package.json', '/%2e%2e/package.json', '/en\\index.html', '//evil.invalid', '/?q=fake']) assert.ok([400, 404].includes(staticResponse({ ...request, path }, directory).status));
  assert.equal(staticResponse({ ...request, method: 'HEAD', path: '/en/' }, directory).headers['Content-Type'], 'text/html; charset=utf-8');
}));
