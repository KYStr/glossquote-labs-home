import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm, symlink } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { ROOT, closedTree } from '../scripts/files.mjs';
import { check } from '../scripts/check.mjs';
import { build } from '../scripts/build.mjs';
import { routeRequest } from '../scripts/serve.mjs';

test('scaffold: closed public tree, Node24 and preview check', async () => {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24);
  assert.equal((await check()).status, 'PASS');
});
test('closed build rejects unknown input and stale output without deleting either', async () => {
  const base = join(ROOT, 'evidence', 'm1b');
  await mkdir(base, { recursive: true });
  const task = await mkdtemp(join(base, '.test-build-'));
  try {
    await cp(join(ROOT, 'public'), join(task, 'public'), { recursive: true });
    await cp(join(ROOT, 'package.json'), join(task, 'package.json'));
    await writeFile(join(task, 'public', 'unexpected.txt'), 'fake');
    await assert.rejects(closedTree(join(task, 'public')), /UNKNOWN_FILE/);
    await assert.rejects(build(task), /UNKNOWN_FILE/);
    await rm(join(task, 'public', 'unexpected.txt'));
    await mkdir(join(task, 'dist'));
    await writeFile(join(task, 'dist', 'preserve.txt'), 'fake');
    await assert.rejects(build(task), /UNKNOWN_FILE/);
  } finally {
    assert.ok(relative(base, task).startsWith('.test-build-'));
    await rm(task, { recursive: true });
  }
});
test('routing only admits exact loopback static paths; no server started', () => {
  assert.deepEqual(routeRequest('GET', '/', '127.0.0.1:4233'), { status: 200, path: 'index.html' });
  for (const path of ['/../package.json', '/%2e%2e', '//index.html', '/index.html?input=x', '/_headers', '/unknown']) assert.equal(routeRequest('GET', path, '127.0.0.1:4233').status, 404);
  assert.equal(routeRequest('POST', '/', '127.0.0.1:4233').status, 405);
  assert.equal(routeRequest('GET', '/', 'evil.test').status, 403);
  assert.equal(routeRequest('HEAD', '/404.html', '127.0.0.1:4233').status, 404);
});
test('check rejects forbidden API, remote resource, production canonical, and a missing initialization guard', async () => {
  const base=join(ROOT,'evidence','m1b'), task=await mkdtemp(join(base,'.test-check-'));
  try {
    await cp(join(ROOT,'public'),join(task,'public'),{recursive:true});
    await cp(join(ROOT,'package.json'),join(task,'package.json'));
    const file=join(task,'public','index.html'), original=await readFile(file,'utf8');
    const variants=[
      [original.replace('</body>','<script src="https://example.invalid/x.mjs"></script></body>'),/UNKNOWN_RESOURCE/],
      [original.replace('</head>','<link rel="canonical" href="https://example.invalid/">\n</head>'),/PREVIEW_INDEXING/],
      [original.replace('id="compare" class="primary" type="button" disabled','id="compare" class="primary" type="button"'),/STALE_LANGUAGE_PAGE|INITIALIZATION_NOT_DISABLED/]
    ];
    for (const [source,error] of variants) { await writeFile(file,source); await assert.rejects(check(task),error); }
    await writeFile(file,original);
    await writeFile(join(task,'public','js','app.mjs'),'globalThis.localStorage.setItem("fake","fake");\n');
    await assert.rejects(check(task),/FORBIDDEN_API/);
  } finally { assert.ok(relative(base,task).startsWith('.test-check-')); await rm(task,{recursive:true}); }
});
test('closedTree rejects a task-owned directory junction/symlink without following it', async () => {
  const base=join(ROOT,'evidence','m1b'), task=await mkdtemp(join(base,'.test-link-'));
  try {
    await mkdir(join(task,'target')); await mkdir(join(task,'public'));
    await symlink(join(task,'target'),join(task,'public','js'),process.platform==='win32'?'junction':'dir');
    await assert.rejects(closedTree(join(task,'public'),{complete:false}),/UNSAFE_LINK/);
    await rm(join(task,'public','js'));
  } finally { assert.ok(relative(base,task).startsWith('.test-link-')); await rm(task,{recursive:true}); }
});
