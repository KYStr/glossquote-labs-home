import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, mkdtemp, writeFile, symlink, rm, cp, lstat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { startServer } from '../scripts/serve.mjs';
import { root, check, listFiles } from '../scripts/check.mjs';

function request(port, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: url, method }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end();
  });
}
test('T00 real public-only loopback server: MIME, HEAD, 404, methods, traversal, hidden, symlink', async () => {
  const server = await startServer({ port: 0 });
  try {
    assert.equal(server.address().address, '127.0.0.1');
    const port = server.address().port;
    for (const [url, type] of [['/', 'text/html'], ['/en/index.html', 'text/html'], ['/styles/app.css', 'text/css'], ['/js/app.mjs', 'text/javascript']]) {
      const get = await request(port, url);
      assert.equal(get.status, 200); assert.ok(get.headers['content-type'].startsWith(type));
      const head = await request(port, url, 'HEAD');
      assert.equal(head.status, 200); assert.equal(head.body, ''); assert.equal(head.headers['content-length'], get.headers['content-length']);
      assert.equal(get.headers['x-content-type-options'], 'nosniff');
    }
    for (const url of ['/missing', '/en/missing', '/deep/missing', '/package.json', '/AGENTS.md', '/../PRODUCT.md', '/%2e%2e/PRODUCT.md', '/%252e%252e/PRODUCT.md', '/.env', '/js/.hidden', '/js%2fapp.mjs', '/js\\app.mjs', '/%00', '/%zz']) assert.equal((await request(port, url)).status, 404, url);
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) { const r = await request(port, '/', method); assert.equal(r.status, 405); assert.equal(r.headers.allow, 'GET, HEAD'); }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const tempBase = path.join(root, '.test-tmp');
  await mkdir(tempBase, { recursive: true });
  const temp = await mkdtemp(path.join(tempBase, 'server-'));
  try {
    await mkdir(path.join(temp, 'public')); await mkdir(path.join(temp, 'outside'));
    await writeFile(path.join(temp, 'outside', 'leak.html'), 'PRIVATE_FIXTURE');
    await symlink(path.join(temp, 'outside'), path.join(temp, 'public', 'escape'), 'junction');
    const linked = await startServer({ root: path.join(temp, 'public'), port: 0 });
    try { assert.equal((await request(linked.address().port, '/escape/leak.html')).status, 404); }
    finally { await new Promise(resolve => linked.close(resolve)); }
  } finally { assert.ok(temp.startsWith(tempBase + path.sep)); await rm(temp, { recursive: true, force: true }); }
});
test('T00 check and build validate before replacing bounded dist; only allowlisted files copied', async () => {
  const assets = await check();
  const run = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(await listFiles(path.join(root, 'dist')), [...assets, 'robots.txt', 'sitemap.xml'].sort());
  for (const file of assets.filter(f => f !== '_headers')) assert.deepEqual(await readFile(path.join(root, 'dist', file)), await readFile(path.join(root, 'public', file)));
});
test('AUDIT-14-T00: root junction, quoted/unquoted remote resources and inactive robots reject before dist mutation', async () => {
  const evidence = path.join(root, '.test-tmp');
  await mkdir(evidence, { recursive: true });
  const temp = await mkdtemp(path.join(evidence, 'gate-regression-'));
  const copy = path.join(temp, 'copy');
  try {
    await mkdir(copy);
    await cp(path.join(root, 'scripts'), path.join(copy, 'scripts'), { recursive: true });
    await mkdir(path.join(copy, 'dist')); await writeFile(path.join(copy, 'dist', 'sentinel.txt'), 'DIST_UNCHANGED');
    const run = script => spawnSync(process.execPath, [`scripts/${script}.mjs`], { cwd: copy, encoding: 'utf8' });
    const reject = async () => {
      for (const script of ['check', 'build']) assert.notEqual(run(script).status, 0, script);
      assert.equal(await readFile(path.join(copy, 'dist', 'sentinel.txt'), 'utf8'), 'DIST_UNCHANGED');
    };
    const outside = path.join(temp, 'outside');
    await cp(path.join(root, 'public'), outside, { recursive: true });
    const outsideApp = await readFile(path.join(outside, 'js', 'app.mjs'));
    await symlink(outside, path.join(copy, 'public'), 'junction'); await reject();
    assert.deepEqual(await readFile(path.join(outside, 'js', 'app.mjs')), outsideApp);
    const fixtureLink = path.join(copy, 'public');
    assert.ok(fixtureLink.startsWith(temp + path.sep));
    assert.ok((await lstat(fixtureLink)).isSymbolicLink());
    await rm(fixtureLink);
    await cp(outside, fixtureLink, { recursive: true });
    const htmlPath = path.join(copy, 'public', 'index.html'), original = await readFile(htmlPath, 'utf8');
    for (const resource of ["<script type='module' src='https://example.invalid/test.mjs'></script>", '<SCRIPT TYPE=module SRC=https://example.invalid/test.mjs></SCRIPT>', '<script type="module" src="https://glossquote.com/index.html"></script>']) {
      await writeFile(htmlPath, original.replace('</head>', resource + '</head>')); await reject();
    }
    await writeFile(htmlPath, original.replace('<meta name="robots" content="noindex,nofollow">', '<!-- <meta name="robots" content="noindex,nofollow"> -->')); await reject();
    await writeFile(htmlPath, original);
    const cssPath = path.join(copy, 'public', 'styles', 'app.css'), css = await readFile(cssPath, 'utf8');
    for (const addition of ['@import url("https://example.invalid/test.css");', "@IMPORT 'https://example.invalid/test.css';", 'p {background:URL(https://example.invalid/image)}']) { await writeFile(cssPath, addition + css); await reject(); }
    await writeFile(cssPath, css);
    for (const script of ['check', 'build']) { const result = run(script); assert.equal(result.status, 0, result.stderr); }
    assert.ok(!(await listFiles(path.join(copy, 'dist'))).includes('sentinel.txt'));
  } finally { assert.ok(temp.startsWith(evidence + path.sep)); /* Keep the unique evidence fixture: append-only. */ }
});
