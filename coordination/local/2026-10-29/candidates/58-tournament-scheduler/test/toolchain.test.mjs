import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, readFile, writeFile, rm, rename, symlink, readdir } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { PROJECT_ROOT, PUBLIC_FILES, inspectSite, inspectHtml, checkModuleSyntax, closedTree, validRelativePath } from '../scripts/check.mjs';
import { buildPreview } from '../scripts/build.mjs';
import { createRequestHandler, resolveRequest, DEV_HOST, DEV_PORT } from '../scripts/serve.mjs';

const workspaces = join(PROJECT_ROOT, 'evidence', 'm2a', 'test-workspaces');
async function withFixture(run) {
  await mkdir(workspaces, { recursive: true });
  const directory = await mkdtemp(join(workspaces, 'owned-'));
  try {
    await cp(join(PROJECT_ROOT, 'public'), join(directory, 'public'), { recursive: true });
    await run(directory, join(directory, 'public'));
  } finally {
    const target = resolve(directory);
    if (!target.startsWith(`${resolve(workspaces)}${sep}`) || target === resolve(workspaces)) throw new Error('UNSAFE_CLEANUP');
    await rm(target, { recursive: true }); // Only the verified mkdtemp-owned fixture, never existing user data.
  }
}

test('actual ESM parser rejects invalid syntax, no subprocess shell or package install', () => {
  checkModuleSyntax('export const valid = 1;');
  assert.throws(() => checkModuleSyntax('export const = ;'), /ESM_SYNTAX/);
});

test('closed public tree has exactly eight known files; noinline/external APIs and both preview pages inspect', async () => {
  const result = await inspectSite(join(PROJECT_ROOT, 'public'));
  assert.deepEqual([...result.keys()].sort(), ['en/index.html', 'index.html', 'js/app.js', 'js/core/circle.mjs', 'js/core/output.mjs', 'js/core/teams.mjs', 'js/core/timing.mjs', 'styles/app.css']);
});

test('static semantic counterexamples: wrong copy/language, missing noindex, canonical and external/inline code fail', async () => {
  const original = await readFile(join(PROJECT_ROOT, 'public/index.html'), 'utf8');
  for (const invalid of [
    original.replace('lang="zh-Hant"', 'lang="en"'), original.replace('循環賽賽程表｜Gloss Tools', 'Wrong title'),
    original.replace('noindex,nofollow', 'index,follow'), original.replace('<title>', '<link rel="canonical" href="https://example.invalid/"><title>'),
    original.replace('<title>', '<meta http-equiv="refresh" content="0;url=https://example.invalid/"><title>'),
    original.replace('src="js/app.js"', 'src="https://example.invalid/app.js"'), original.replace('id="create"', 'onclick="alert(1)" id="create"'),
    original.replace('id="teams"', 'id="cycles"'), original.replace('奇數隊會怎麼排？', 'Missing FAQ')
  ]) assert.throws(() => inspectHtml(invalid, 'index.html'));
});

test('unknown, missing and junction source paths fail closed; traversal is never allowlisted', async () => {
  for (const path of ['../x', '/x', 'a/../x', 'C:/x', 'js\\x', 'a//x', './index.html']) assert.equal(validRelativePath(path), false);
  await withFixture(async (directory, source) => {
    await writeFile(join(source, 'unknown.txt'), 'synthetic');
    await assert.rejects(inspectSite(source), /UNKNOWN_FILE/);
    await rm(join(source, 'unknown.txt'));
    await rename(join(source, 'js'), join(directory, 'owned-link-target'));
    await symlink(join(directory, 'owned-link-target'), join(source, 'js'), 'junction');
    await assert.rejects(closedTree(source), /LINK_REJECTED/);
  });
  await withFixture(async (_, source) => {
    await rm(join(source, 'js/core/teams.mjs'));
    await assert.rejects(closedTree(source), /MISSING_OR_STALE_FILE/);
  });
});

test('runtime resource and dangerous DOM counterexamples fail static policy checks', async () => {
  await withFixture(async (_, source) => {
    await writeFile(join(source, 'js/app.js'), 'export const bad = () => document.body.innerHTML = "x";');
    await assert.rejects(inspectSite(source), /PROHIBITED_API/);
    await writeFile(join(source, 'js/app.js'), 'export const bad = () => fetch("https://example.invalid");');
    await assert.rejects(inspectSite(source), /PROHIBITED_API/);
  });
});

test('build exact bytes, no extra files, repeated build idempotent; stale/unknown outputs preserved and rejected', async () => {
  await withFixture(async (directory, source) => {
    const target = join(directory, 'dist');
    const result = await buildPreview({ source, target });
    assert.equal(result.length, 8);
    for (const file of PUBLIC_FILES) assert.deepEqual(await readFile(join(target, file)), await readFile(join(source, file)));
    assert.deepEqual(await buildPreview({ source, target }), result);
    await writeFile(join(target, 'index.html'), 'synthetic stale bytes');
    await assert.rejects(buildPreview({ source, target }), /STALE_OUTPUT/);
    assert.equal(await readFile(join(target, 'index.html'), 'utf8'), 'synthetic stale bytes');
    await writeFile(join(target, 'do-not-delete.txt'), 'synthetic unrelated output');
    await assert.rejects(buildPreview({ source, target }), /UNKNOWN_FILE/);
    assert.equal(await readFile(join(target, 'do-not-delete.txt'), 'utf8'), 'synthetic unrelated output');
    assert.ok((await readdir(target)).includes('do-not-delete.txt'));
  });
});

test('offline request-handler contract: fixed loopback, full GET/HEAD bytes/MIME/security headers, 404/405/Host/traversal', async () => {
  assert.equal(DEV_HOST, '127.0.0.1');
  assert.equal(DEV_PORT, 4238);
  const handler = await createRequestHandler(); // No createServer/listen/network operation.
  const invoke = (method, url, host = '127.0.0.1:4238') => {
    let result;
    handler({ method, url, headers: { host } }, {
      writeHead(status, headers) { result = { status, headers }; },
      end(body) { result.body = body; }
    });
    return result;
  };
  for (const [route, file] of [['/', 'index.html'], ['/en/', 'en/index.html'], ...PUBLIC_FILES.map(file => [`/${file}`, file])]) {
    const get = invoke('GET', route), head = invoke('HEAD', route);
    const bytes = await readFile(join(PROJECT_ROOT, 'public', file));
    assert.equal(get.status, 200);
    assert.deepEqual(get.body, bytes);
    assert.equal(get.headers['Content-Length'], String(bytes.length));
    assert.deepEqual(head.headers, get.headers);
    assert.equal(head.body, undefined);
    assert.equal(get.headers['X-Robots-Tag'], 'noindex, nofollow');
    assert.equal(get.headers['Cache-Control'], 'no-store');
    assert.ok(get.headers['Content-Security-Policy'].includes("connect-src 'none'"));
    assert.match(get.headers['Content-Type'], file.endsWith('html') ? /^text\/html/ : file.endsWith('css') ? /^text\/css/ : /^text\/javascript/);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'CONNECT']) {
    const result = invoke(method, '/');
    assert.equal(result.status, 405);
    assert.equal(result.headers.Allow, 'GET, HEAD');
  }
  for (const route of ['/unknown', '/AGENTS.md', '/package.json', '/en', '/?teams=A', '/js/app.js?x=1']) assert.equal(invoke('GET', route).status, 404);
  for (const route of ['/../AGENTS.md', '/%2e%2e/AGENTS.md', '/%252e%252e/AGENTS.md', '/js/./app.js', '/js\\app.js', '//evil.invalid/', '/\u0000']) assert.equal(invoke('GET', route).status, 400);
  for (const host of ['evil.invalid', 'localhost:4238', '127.0.0.1:80', ['127.0.0.1:4238']]) assert.equal(invoke('GET', '/', host).status, 403);
  assert.equal(resolveRequest({ method: 'GET', url: '/', host: undefined }).status, 403);
});
