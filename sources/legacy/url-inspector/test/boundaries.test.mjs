import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { cp, mkdtemp, mkdir, writeFile, readFile, link, lstat, symlink, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { check } from '../scripts/check.mjs';
import { projectRoot, createStaticServer, listen } from '../scripts/serve.mjs';
import { validateHtml } from '../scripts/validation.mjs';

async function fixture(t) {
  const parent = process.env.GQ_TEST_ARTIFACTS ?? os.tmpdir();
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'url-boundary-'));
  if (!process.env.GQ_TEST_ARTIFACTS) t.after(() => rm(root, { recursive: true, force: true }));
  const tool = path.join(root, 'tool'); await mkdir(tool);
  for (const dir of ['scripts', 'public', 'test']) await cp(path.join(projectRoot, dir), path.join(tool, dir), { recursive: true });
  await cp(path.join(projectRoot, 'wrangler.jsonc'), path.join(tool, 'wrangler.jsonc'));
  return { root, tool, run: script => spawnSync(process.execPath, [path.join(tool, 'scripts', script)], { cwd: tool, encoding: 'utf8' }) };
}
test('AUDIT-13 P1 hardlinked output rejects without changing sibling sentinel', async t => {
  const { root, tool, run } = await fixture(t);
  const sentinel = path.join(root, 'sentinel.txt'), destination = path.join(tool, 'dist', 'index.html');
  await writeFile(sentinel, 'FAKE_OUTSIDE_HARDLINK_SENTINEL'); await mkdir(path.dirname(destination)); await link(sentinel, destination);
  assert.ok((await lstat(destination)).nlink >= 2);
  const result = run('build.mjs'); assert.notEqual(result.status, 0); assert.match(result.stderr, /Hardlinked/);
  assert.equal(await readFile(sentinel, 'utf8'), 'FAKE_OUTSIDE_HARDLINK_SENTINEL');
});
test('AUDIT-13 P2 stale output refuses a successful publishable build', async t => {
  const { tool, run } = await fixture(t); await mkdir(path.join(tool, 'dist'));
  await writeFile(path.join(tool, 'dist', 'stale-review-only.txt'), 'FAKE_STALE');
  const result = run('build.mjs'); assert.notEqual(result.status, 0); assert.match(result.stderr, /stale dist/);
  assert.equal(await readFile(path.join(tool, 'dist', 'stale-review-only.txt'), 'utf8'), 'FAKE_STALE');
});
test('AUDIT-13 P2 active HTML references: quote variants/case, comments, resources vs navigation', async t => {
  const { tool } = await fixture(t), file = path.join(tool, 'public', 'index.html'); const original = await readFile(file, 'utf8');
  for (const tag of ["<script type='module' src='https://example.invalid/a.mjs'></script>", '<SCRIPT TYPE=module SRC=https://example.invalid/a.mjs></SCRIPT>', '<script type="module" src="https://glossquote.com/index.html"></script>', '<link REL=stylesheet HREF=https://example.invalid/a.css>']) {
    await writeFile(file, original.replace('</head>', tag + '</head>')); await assert.rejects(check(path.join(tool, 'public')), /Nonlocal asset/);
  }
  await writeFile(file, original.replace('<meta name="robots" content="noindex,nofollow">', '<!-- <meta name="robots" content="noindex,nofollow"> -->'));
  await assert.rejects(check(path.join(tool, 'public')), /active robots/);
  await writeFile(file, original.replace('<meta name="robots" content="noindex,nofollow">', "<META NAME=robots CONTENT='noindex,nofollow'>"));
  await check(path.join(tool, 'public'));
  validateHtml('<!-- <script src="https://example.invalid/a"></script> --><META NAME=robots CONTENT="noindex,nofollow"><SCRIPT TYPE=module SRC=/js/app.mjs></SCRIPT>', ['js/app.mjs']);
  assert.throws(() => validateHtml('<meta name=robots content=noindex,nofollow><script src=/js/app.mjs type=module onload=x></script>', ['js/app.mjs']), /active HTML attribute/);
});
test('AUDIT-13 P2 junction ancestor rejected by configurable check and server roots', async t => {
  const { root, tool } = await fixture(t); const alias = path.join(root, 'junction-alias');
  await symlink(tool, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const indirect = path.join(alias, 'public'); assert.equal((await lstat(indirect)).isSymbolicLink(), false);
  await assert.rejects(check(indirect), /Symlink\/junction/);
  const server = createStaticServer(indirect); const { port } = await listen(server); t.after(() => new Promise(resolve => server.close(resolve)));
  const res = await fetch(`http://127.0.0.1:${port}/index.html`); assert.equal(res.status, 404);
});
