import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm, rmdir, symlink, lstat } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_ROOT, PUBLIC_FILES, inside, inspectTree } from '../scripts/files.mjs';
import { checkProject, checkPage } from '../scripts/check.mjs';
import { buildProject } from '../scripts/build.mjs';
import { routeRequest, HOST, PORT, SECURITY_HEADERS } from '../scripts/serve.mjs';

async function sandbox(t) {
  const parent = path.join(PROJECT_ROOT, 'evidence', 'm2a');
  await mkdir(parent, { recursive: true });
  const temporary = await mkdtemp(path.join(parent, 'test-workspace-'));
  t.after(async () => {
    const absolute = path.resolve(temporary);
    assert.ok(absolute.startsWith(`${path.resolve(parent)}${path.sep}test-workspace-`));
    assert.equal((await lstat(absolute)).isSymbolicLink(), false);
    // Only the exact task-owned fixture directory; never follow a computed root.
    await rm(absolute, { recursive: true, force: true });
  });
  await copyFile(path.join(PROJECT_ROOT, 'package.json'), path.join(temporary, 'package.json'));
  await copyFile(path.join(PROJECT_ROOT, 'wrangler.jsonc'), path.join(temporary, 'wrangler.jsonc'));
  for (const file of PUBLIC_FILES) {
    const destination = inside(path.join(temporary, 'public'), file);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(inside(path.join(PROJECT_ROOT, 'public'), file), destination);
  }
  await mkdir(path.join(temporary, 'scripts'));
  for (const file of ['files.mjs', 'check.mjs', 'build.mjs', 'serve.mjs']) await copyFile(path.join(PROJECT_ROOT, 'scripts', file), path.join(temporary, 'scripts', file));
  return temporary;
}

test('toolchain check verifies both complete noindex pages and dependency-free manifest', async () => {
  assert.deepEqual(await checkProject(PROJECT_ROOT, { syntax: false }), { files: 8, pages: 2, syntax: false });
});
test('preview checks reject full title/description/H1/language/robots/navigation semantic counterexamples', async () => {
  const html = await readFile(path.join(PROJECT_ROOT, 'public/index.html'), 'utf8');
  for (const mutation of [
    html.replace('<title>多軌議程衝突檢查｜Gloss Tools</title>', '<title>Wrong product</title>'),
    html.replace('name="description" content="檢查同日多軌議程的房間重疊、講者撞期和轉場不足，並查看每房間、每位講者的完整時間表。"', 'name="description" content="Automatic rescheduling"'),
    html.replace('在發布前找出多軌議程撞期</h1>', '錯誤產品</h1>'),
    html.replace('lang="zh-Hant"', 'lang="en"'), html.replace('noindex,nofollow', 'index,follow'),
    html.replace('href="./en/index.html"', 'href="https://example.invalid/en/"'),
    html.replace('href="./styles/app.css"', 'href="https://example.invalid/app.css"'),
    html.replace('src="./js/app.js"', 'src="https://example.invalid/app.js"'),
    html.replace('aria-controls="source-panel"', 'aria-controls="missing-panel"'),
    html.replace('</head>', '<link rel="canonical" href="https://example.invalid/">\n</head>'),
    html.replace('<body ', '<body onload="alert(1)" '),
    html.replace('<body ', '<body onload=alert(1) '),
    html.replace('</head>', '<script>alert(1)</script></head>')
  ]) assert.throws(() => checkPage(mutation, 'index.html'));
});
test('all fixed UI DOM lookups and label references exist in both static pages', async () => {
  const app = await readFile(path.join(PROJECT_ROOT, 'public/js/app.js'), 'utf8');
  const lookups = [...app.matchAll(/\$\('([a-z][a-z-]+)'\)/g)].map(match => match[1]);
  for (const file of ['index.html', 'en/index.html']) {
    const html = await readFile(inside(path.join(PROJECT_ROOT, 'public'), file), 'utf8');
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const id of lookups) assert.ok(ids.has(id), `${file} missing ${id}`);
    assert.ok(html.includes('id="app" hidden'));
    assert.equal((html.match(/id="session-list"><\/div>/g) ?? []).length, 1);
  }
});
test('build copies exact allowlist bytes; rebuilding same output keeps identical bytes', async t => {
  const root = await sandbox(t);
  assert.equal((await buildProject(root, { syntax: false })).files, 8);
  const before = await inspectTree(path.join(root, 'dist'));
  await buildProject(root, { syntax: false });
  const after = await inspectTree(path.join(root, 'dist'));
  for (const file of PUBLIC_FILES) {
    assert.deepEqual(after.get(file), before.get(file));
    assert.deepEqual(after.get(file), await readFile(inside(path.join(root, 'public'), file)));
  }
});
test('unknown/stale dist files block build and are preserved byte-for-byte', async t => {
  const root = await sandbox(t);
  await mkdir(path.join(root, 'dist'));
  await writeFile(path.join(root, 'dist', 'stale.html'), 'DO_NOT_DELETE_SYNTHETIC');
  await assert.rejects(buildProject(root, { syntax: false }), { code: 'UNKNOWN_FILE' });
  assert.equal(await readFile(path.join(root, 'dist', 'stale.html'), 'utf8'), 'DO_NOT_DELETE_SYNTHETIC');
  await assert.rejects(readFile(path.join(root, 'dist', 'index.html')), { code: 'ENOENT' });
});
test('unknown public assets and unsafe DOM/network source block before dist creation', async t => {
  const root = await sandbox(t);
  await writeFile(path.join(root, 'public', 'unexpected.json'), '{}');
  await assert.rejects(buildProject(root, { syntax: false }), { code: 'UNKNOWN_FILE' });
  await assert.rejects(lstat(path.join(root, 'dist')), { code: 'ENOENT' });
  await rm(path.join(root, 'public', 'unexpected.json'));
  const script = path.join(root, 'public/js/app.js');
  const original = await readFile(script, 'utf8');
  for (const unsafe of ["element.innerHTML = input;", "fetch('https://example.invalid/');", "localStorage.setItem('x', input);", "console.log(input);"]) {
    await writeFile(script, `${original}\n${unsafe}`);
    await assert.rejects(checkProject(root, { syntax: false }), { code: 'UNSAFE_SCRIPT' });
  }
});
test('build rejects directory junctions in public and dist without following them', async t => {
  const root = await sandbox(t);
  const outside = path.join(root, 'outside'); await mkdir(outside);
  await writeFile(path.join(outside, 'canary.txt'), 'SYNTHETIC_TARGET_UNCHANGED');
  await rm(path.join(root, 'public/en/index.html'));
  await rmdir(path.join(root, 'public/en'));
  await symlink(outside, path.join(root, 'public/en'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(inspectTree(path.join(root, 'public')), { code: 'TREE_LINK_OR_TYPE' });
  await symlink(outside, path.join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(inspectTree(path.join(root, 'dist')), { code: 'TREE_LINK_OR_TYPE' });
  assert.equal(await readFile(path.join(outside, 'canary.txt'), 'utf8'), 'SYNTHETIC_TARGET_UNCHANGED');
});
test('path resolution refuses absolute, traversal, empty and Windows separator inputs', () => {
  for (const value of ['../secret', '/absolute', 'a/../b', 'a/./b', 'a//b', 'a\\b', '', 'C:/Windows']) assert.throws(() => inside(PROJECT_ROOT, value), { code: 'UNSAFE_PATH' });
});
test('dev pure routing: exact GET/HEAD bytes and MIME for every allowlisted asset', async () => {
  assert.equal(HOST, '127.0.0.1'); assert.equal(PORT, 4241);
  const files = await inspectTree(path.join(PROJECT_ROOT, 'public'));
  for (const file of PUBLIC_FILES) for (const method of ['GET', 'HEAD']) {
    const reply = routeRequest({ method, host: '127.0.0.1:4241', target: `/${file}` }, files);
    assert.equal(reply.status, 200);
    assert.equal(reply.headers['Content-Length'], files.get(file).length);
    assert.deepEqual(reply.body, method === 'HEAD' ? Buffer.alloc(0) : files.get(file));
    assert.equal(reply.headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(reply.headers['X-Robots-Tag'], 'noindex, nofollow');
    assert.ok(reply.headers['Content-Security-Policy'].includes("connect-src 'none'"));
    assert.equal(reply.headers['Content-Type'], file.endsWith('.html') ? 'text/html;charset=utf-8' : file.endsWith('.css') ? 'text/css;charset=utf-8' : 'text/javascript;charset=utf-8');
  }
  assert.equal(routeRequest({ method: 'GET', host: '127.0.0.1:4241', target: '/' }, files).status, 200);
  assert.equal(routeRequest({ method: 'GET', host: '127.0.0.1:4241', target: '/en/' }, files).status, 200);
});
test('dev pure routing: 404/405/Host/traversal guards never return workspace files', () => {
  const files = new Map([['index.html', Buffer.from('SYNTHETIC_PAGE')]]);
  const request = overrides => routeRequest({ method: 'GET', host: '127.0.0.1:4241', target: '/', ...overrides }, files);
  assert.equal(request({ target: '/package.json' }).status, 404);
  assert.equal(request({ target: '/some/route' }).status, 404);
  assert.equal(request({ method: 'POST' }).status, 405); assert.equal(request({ method: 'POST' }).headers.Allow, 'GET, HEAD');
  for (const host of ['evil.invalid', 'localhost:4241', '127.0.0.1', '127.0.0.1:4241.evil', undefined]) assert.equal(request({ host }).status, 403);
  for (const target of ['/../package.json', '/js/../../package.json', '/%2e%2e/AGENTS.md', '/%252e%252e/x', '/js\\app.js', '//evil.invalid', '/?x=1', '/#x', '/./index.html', 'http://127.0.0.1:4241/', '/\u0000']) assert.equal(request({ target }).status, 400);
  assert.equal(request({ method: 'HEAD', target: '/missing' }).body.length, 0);
  assert.equal(SECURITY_HEADERS['Cache-Control'], 'no-store');
});

test('family text/control color combinations meet their numeric contrast thresholds', async () => {
  const css = await readFile(path.join(PROJECT_ROOT, 'public/styles/app.css'), 'utf8');
  const colors = new Map([...css.matchAll(/--gq-color-([\w-]+):\s*(#[a-f\d]{6})/gi)].map(match => [match[1], match[2]]));
  const luminance = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  const ratio = (a, b) => { const x = luminance(colors.get(a)), y = luminance(colors.get(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  for (const [foreground, background] of [['text', 'paper'], ['text-muted', 'paper'], ['text-muted', 'surface'], ['ink', 'acid'], ['surface', 'ink'], ['danger-text', 'danger-surface'], ['danger-text', 'surface'], ['warning-text', 'surface'], ['info-text', 'info-surface']]) assert.ok(ratio(foreground, background) >= 4.5, `${foreground}/${background}`);
  for (const background of ['paper', 'surface']) assert.ok(ratio('control-border', background) >= 3);
});
