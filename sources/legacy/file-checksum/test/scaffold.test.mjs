import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { buildPreview } from '../scripts/build.mjs';
import { validateProject } from '../scripts/check.mjs';
import { createStaticServer, startPreviewServer } from '../scripts/serve.mjs';
import { validatePreviewHtml, ValidationError } from '../scripts/validation.mjs';

const PROJECT = fileURLToPath(new URL('../', import.meta.url));
const EXPECTED_ASSETS = ['en/index.html', 'index.html', 'js/app.mjs', 'js/controller.mjs', 'js/core/checksum.mjs', 'js/core/session.mjs', 'js/hash.worker.mjs', 'js/i18n.mjs', 'js/worker-source.mjs', 'styles/app.css'];
const FIXTURE_FILES = ['package.json', 'scripts/build.mjs', 'scripts/check.mjs', 'scripts/serve.mjs', 'scripts/validation.mjs', 'scripts/build-worker.mjs',
  'test/scaffold.test.mjs', 'test/checksum.test.mjs', 'test/session.test.mjs', 'test/worker.test.mjs', 'test/ui-contract.test.mjs', ...EXPECTED_ASSETS.map(name => `public/${name}`)];
const LEGACY_SCAFFOLD = "<!doctype html>\n<html lang=\"zh-Hant\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"robots\" content=\"noindex,nofollow\">\n  <meta name=\"description\" content=\"檔案 SHA-256 校驗工具的停用預覽。功能尚未開放，現在不會讀取或處理檔案。\">\n  <title>檔案 SHA-256 校驗 · 預覽｜GlossQuote</title>\n  <link rel=\"stylesheet\" href=\"./styles/app.css\">\n  <script type=\"module\" src=\"./js/app.mjs\"></script>\n</head>\n<body>\n  <a class=\"skip-link\" href=\"#workbench\">前往校驗工作區</a>\n  <header class=\"topbar\">\n    <a href=\"https://glossquote.com/index.html\">Gloss Tools by GlossQuote</a>\n    <nav aria-label=\"語言\"><a href=\"./en/index.html\" lang=\"en\" hreflang=\"en\">English</a></nav>\n  </header>\n  <main>\n    <h1>檔案 SHA-256 校驗</h1>\n    <p class=\"intro\">選擇一個檔案，核對它的 SHA-256 校驗碼。校驗碼相符只能協助確認內容一致，不能判斷檔案安全或證明發布者身份。</p>\n    <p class=\"preview-notice\" id=\"preview-status\" role=\"status\">預覽尚未開放計算。所有檔案與輸出操作暫時停用，不會讀取或處理檔案。</p>\n    <section class=\"workbench\" id=\"workbench\" aria-labelledby=\"workspace-title\">\n      <h2 id=\"workspace-title\">核對檔案內容</h2>\n      <div class=\"fields\">\n        <div class=\"field\">\n          <label for=\"file\">選擇檔案</label>\n          <p id=\"file-help\" class=\"help\">任意單一檔案，最多 128 MiB（134,217,728 bytes），包含空檔。</p>\n          <input id=\"file\" type=\"file\" aria-describedby=\"file-help\" disabled>\n        </div>\n        <div class=\"field\">\n          <label for=\"expected\">預期 SHA-256（選填）</label>\n          <p id=\"expected-help\" class=\"help\">來源提供的 64 位校驗碼。</p>\n          <textarea id=\"expected\" rows=\"3\" spellcheck=\"false\" aria-describedby=\"expected-help\" disabled></textarea>\n        </div>\n      </div>\n      <div class=\"actions\">\n        <button id=\"calculate\" class=\"primary\" type=\"button\" disabled>計算 SHA-256</button>\n        <button id=\"cancel\" type=\"button\" disabled>取消</button>\n        <button id=\"clear\" type=\"button\" disabled>清除</button>\n      </div>\n      <div class=\"result\" aria-labelledby=\"result-title\">\n        <h3 id=\"result-title\">SHA-256 校驗碼</h3>\n        <p id=\"status\" role=\"status\" aria-live=\"polite\">尚無校驗碼。功能開放後才能選檔與計算。</p>\n        <output id=\"checksum\" class=\"checksum\" aria-label=\"SHA-256 校驗碼\"></output>\n        <div class=\"actions\">\n          <button id=\"copy\" type=\"button\" disabled>複製校驗碼</button>\n          <button id=\"download\" type=\"button\" disabled>下載校驗碼</button>\n        </div>\n      </div>\n    </section>\n    <p class=\"help\">切換語言會離開這個頁面。這是開發預覽，尚未發布可用工具。</p>\n  </main>\n  <footer>Gloss Tools by GlossQuote</footer>\n</body>\n</html>\n";
const directoryLinkType = process.platform === 'win32' ? 'junction' : 'dir';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const isCode = code => error => error instanceof ValidationError && error.code === code;

async function fixture(t) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'glossquote-file-checksum-t00-'));
  const originalBase = path.resolve(base);
  t.after(async () => {
    // This is the only recursive cleanup: an identified task-owned fake-data workspace.
    assert.equal(path.resolve(base), originalBase);
    assert.equal(path.dirname(base), path.resolve(os.tmpdir()));
    assert.ok(path.basename(base).startsWith('glossquote-file-checksum-t00-'));
    assert.equal((await fs.lstat(base)).isSymbolicLink(), false);
    assert.equal(path.resolve(await fs.realpath(base)), originalBase);
    await fs.rm(base, { recursive: true, force: false });
  });
  const root = path.join(base, 'project');
  for (const name of FIXTURE_FILES) {
    const target = path.join(root, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, await fs.readFile(path.join(PROJECT, name)), { flag: 'wx' });
  }
  return { base, root, publicRoot: path.join(root, 'public'), dist: path.join(root, 'dist') };
}
async function inventory(root) {
  const result = [];
  async function walk(relative) {
    for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const target = path.join(root, name);
      const stat = await fs.lstat(target);
      if (stat.isSymbolicLink()) result.push({ path: name, link: await fs.readlink(target) });
      else if (stat.isDirectory()) { result.push({ path: `${name}/` }); await walk(name); }
      else result.push({ path: name, bytes: stat.size, sha256: sha256(await fs.readFile(target)) });
    }
  }
  await walk('');
  return result.sort((left, right) => left.path.localeCompare(right.path));
}
async function absent(target) { await assert.rejects(fs.lstat(target), error => error.code === 'ENOENT'); }
async function close(server) {
  const closed = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  server.closeAllConnections();
  await closed;
}
async function serverFor(t, publicRoot) {
  const result = await startPreviewServer({ publicRoot, port: 0 });
  t.after(() => close(result.server));
  return result;
}
function request(port, target, method = 'GET') {
  return new Promise((resolve, reject) => {
    // Use raw HTTP request paths: URL/fetch normalization would hide traversal probes.
    const operation = http.request({ hostname: '127.0.0.1', port, path: target, method, agent: false }, response => {
      const chunks = [];
      response.on('data', bytes => chunks.push(bytes));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    operation.on('error', reject);
    operation.setTimeout(5000, () => operation.destroy(new Error('TEST_HTTP_TIMEOUT')));
    operation.end();
  });
}

test('actual project validates two interactive preview locales and native ESM', async () => {
  const result = await validateProject();
  assert.deepEqual(result.manifest.map(item => item.path), EXPECTED_ASSETS);
  assert.equal(result.sources.size, 10);
  const script = result.sources.get('js/app.mjs').toString('utf8');
  assert.match(script, /export const MILESTONE = 'T02'/);
  assert.match(script, /mountChecksumApp/);
  assert.doesNotMatch(script, /arrayBuffer|digest\(/);
});

test('HTML uses active tags, case-insensitive names and real attribute boundaries', async t => {
  const source = LEGACY_SCAFFOLD;
  assert.equal(sha256(Buffer.from(source, 'utf8')), 'b8e2e4836fa63fb9ea163e7dd7d2ebfc945a9b22bd5a05b904d131010e57744a');
  const validVariants = [
    source.replace('<meta name="robots" content="noindex,nofollow">', "<META NAME='RoBoTs' CONTENT='NOINDEX, NOFOLLOW'>"),
    source.replace('<meta name="robots" content="noindex,nofollow">', '<!-- <meta name="robots" content="index,follow"><script src="https://example.invalid/ignored.mjs"></script> -->\n<meta name="robots" content="noindex,nofollow">'),
    source.replace('type="module" src="./js/app.mjs"', "TYPE='module' SRC=./js/app.mjs"),
    source.replace('disabled>計算', "disabled title='Preview > calculation'>計算"),
    source.replace('</textarea>', '<meta name="robots" content="index,follow"><script src="https://example.invalid/inert.mjs"></script></textarea>'),
    source.replace('</title>', '<meta name="robots" content="index,follow"><script src="https://example.invalid/inert.mjs"></script></title>'),
  ];
  for (let index = 0; index < validVariants.length; index += 1) {
    await t.test(`valid quoting/comment case ${index + 1}`, () => assert.doesNotThrow(() => validatePreviewHtml(validVariants[index], 'index.html', EXPECTED_ASSETS)));
  }
  const invalidVariants = [
    ['audit: robots literal inside textarea only', source.replace('<meta name="robots" content="noindex,nofollow">', '').replace('</textarea>', '<meta name="robots" content="noindex,nofollow"></textarea>'), 'PREVIEW_ROBOTS_REQUIRED'],
    ['audit: robots literal inside title only', source.replace('<meta name="robots" content="noindex,nofollow">', '').replace('</title>', '<meta name="robots" content="noindex,nofollow"></title>'), 'PREVIEW_ROBOTS_REQUIRED'],
    ['audit: head noscript is unsupported and fails closed', source.replace('<meta name="robots" content="noindex,nofollow">', '').replace('</head>', '<noscript><meta name="robots" content="noindex,nofollow"></noscript></head>'), 'HTML_ELEMENT_FORBIDDEN'],
    ['robots outside head', source.replace('<meta name="robots" content="noindex,nofollow">', '').replace('</body>', '<meta name="robots" content="noindex,nofollow"></body>'), 'HTML_METADATA_OUTSIDE_HEAD'],
    ['head implicitly ended by body element', source.replace('<meta name="robots" content="noindex,nofollow">', '<div><meta name="robots" content="noindex,nofollow"></div>'), 'HTML_HEAD_CONTENT_INVALID'],
    ['head implicitly ended by character data', source.replace('<meta name="robots" content="noindex,nofollow">', 'fake body text<meta name="robots" content="noindex,nofollow">'), 'HTML_TEXT_OUTSIDE_BODY'],
    ['text outside document element', `${source}fake trailing text`, 'HTML_TEXT_OUTSIDE_BODY'],
    ['nested head in body', source.replace('<meta name="robots" content="noindex,nofollow">', '').replace('</body>', '<head><meta name="robots" content="noindex,nofollow"></head></body>'), 'HTML_STRUCTURE_INVALID'],
    ['mismatched explicit head close', source.replace('</head>', '</body>'), 'HTML_STRUCTURE_INVALID'],
    ['comment-only robots', source.replace('<meta name="robots" content="noindex,nofollow">', '<!-- <meta name="robots" content="noindex,nofollow"> -->'), 'PREVIEW_ROBOTS_REQUIRED'],
    ['active index hidden behind comment', source.replace('<meta name="robots" content="noindex,nofollow">', '<!-- <meta name="robots" content="noindex,nofollow"> -->\n<META NAME=robots CONTENT=index,follow>'), 'PREVIEW_ROBOTS_INVALID'],
    ['duplicate robots', source.replace('</head>', '<meta name="robots" content="index,follow"></head>'), 'PREVIEW_ROBOTS_REQUIRED'],
    ['single-quoted uppercase remote script using approved navigation origin', source.replace('src="./js/app.mjs"', "SRC='https://glossquote.com/index.html'"), 'LOCAL_REFERENCE_REQUIRED'],
    ['unquoted remote script', source.replace('src="./js/app.mjs"', 'src=https://example.invalid/x.mjs'), 'LOCAL_REFERENCE_REQUIRED'],
    ['protocol-relative remote script', source.replace('src="./js/app.mjs"', "src='//example.invalid/x.mjs'"), 'LOCAL_REFERENCE_REQUIRED'],
    ['entity-encoded remote script scheme', source.replace('src="./js/app.mjs"', "src='https&#x3a;//glossquote.com/index.html'"), 'LOCAL_REFERENCE_REQUIRED'],
    ['duplicate script source', source.replace('src="./js/app.mjs"', 'src="./js/app.mjs" SRC="https://example.invalid/x.mjs"'), 'HTML_DUPLICATE_ATTRIBUTE'],
    ['inline script', source.replace('src="./js/app.mjs"></script>', '>window.preview = true;</script>'), 'INLINE_SCRIPT_FORBIDDEN'],
    ['inline event handler', source.replace('id="clear"', 'id="clear" onclick="location.href=1"'), 'HTML_ATTRIBUTE_FORBIDDEN'],
    ['base tag', source.replace('</head>', '<base href="https://example.invalid/"></head>'), 'HTML_ELEMENT_FORBIDDEN'],
    ['remote stylesheet', source.replace('href="./styles/app.css"', "HREF='https://example.invalid/style.css'"), 'LOCAL_REFERENCE_REQUIRED'],
    ['asset escape', source.replace('href="./styles/app.css"', 'href="../styles/app.css"'), 'REFERENCE_OUTSIDE_ROOT'],
    ['missing asset', source.replace('href="./styles/app.css"', 'href="./styles/missing.css"'), 'REFERENCE_MISSING'],
    ['enabled file input', source.replace('aria-describedby="file-help" disabled', 'aria-describedby="file-help"'), 'SCAFFOLD_CONTROLS_MUST_BE_DISABLED'],
    ['multiple file input', source.replace('type="file"', 'type="file" multiple'), 'SINGLE_ANY_FILE_REQUIRED'],
    ['missing file label', source.replace('for="file"', 'for="missing"'), 'VISIBLE_LABEL_REQUIRED'],
    ['malformed unterminated comment', source + '<!-- <meta name="robots" content="noindex,nofollow">', 'HTML_COMMENT_INVALID'],
  ];
  for (const [label, html, code] of invalidVariants) await t.test(label, () => assert.throws(() => validatePreviewHtml(html, 'index.html', EXPECTED_ASSETS), isCode(code)));
});

test('check rejects real syntax, dependency, locale, runtime and asset violations', async t => {
  const cases = [
    ['module syntax', 'public/js/app.mjs', source => `${source}\nconst = ;\n`, 'ESM_SYNTAX_INVALID'],
    ['tooling syntax', 'scripts/serve.mjs', source => `${source}\nconst = ;\n`, 'ESM_SYNTAX_INVALID'],
    ['runtime network', 'public/js/app.mjs', source => `${source}\nfetch('https://example.invalid/');\n`, 'RUNTIME_API_FORBIDDEN'],
    ['runtime storage', 'public/js/app.mjs', source => `${source}\nlocalStorage.setItem('fake', 'fake');\n`, 'RUNTIME_API_FORBIDDEN'],
    ['dynamic import', 'public/js/app.mjs', source => `${source}\nimport('./anything.mjs');\n`, 'RUNTIME_API_FORBIDDEN'],
    ['missing static import', 'public/js/app.mjs', source => `${source}\nimport './missing.mjs';\n`, 'REFERENCE_MISSING'],
    ['CSS remote import', 'public/styles/app.css', source => `${source}\n@IMPORT url('https://example.invalid/a.css');\n`, 'CSS_REMOTE_OR_FONT_FORBIDDEN'],
    ['CSS remote image', 'public/styles/app.css', source => `${source}\nbody { background-image: URL('https://example.invalid/a.png'); }\n`, 'LOCAL_REFERENCE_REQUIRED'],
    ['English locale', 'public/en/index.html', source => source.replace('lang="en"', 'lang="zh-Hant"'), 'HTML_LOCALE_INVALID'],
    ['dependencies', 'package.json', source => JSON.stringify({ ...JSON.parse(source), dependencies: { 'fake-not-installed': '1.0.0' } }), 'RUNTIME_DEPENDENCIES_FORBIDDEN'],
  ];
  for (const [label, filename, mutate, code] of cases) await t.test(label, async child => {
    const f = await fixture(child);
    const target = path.join(f.root, filename);
    await fs.writeFile(target, mutate(await fs.readFile(target, 'utf8')));
    await assert.rejects(validateProject(f.root), isCode(code));
    await absent(f.dist);
  });
});

test('build copies only approved public assets byte-for-byte and is reproducible', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'private-fixture.txt'), 'FAKE_PRIVATE_ROOT_SENTINEL\n');
  const first = await buildPreview(f.root);
  assert.deepEqual(first.manifest.map(item => item.path), EXPECTED_ASSETS);
  for (const name of EXPECTED_ASSETS) {
    const source = await fs.readFile(path.join(f.publicRoot, name));
    assert.deepEqual(await fs.readFile(path.join(f.dist, name)), source);
    assert.equal(first.manifest.find(item => item.path === name).sha256, sha256(source));
  }
  await absent(path.join(f.dist, 'package.json'));
  await absent(path.join(f.dist, 'private-fixture.txt'));
  const before = await inventory(f.dist);
  const second = await buildPreview(f.root);
  assert.deepEqual(second.manifest, first.manifest);
  assert.deepEqual(await inventory(f.dist), before);
});

test('unknown source assets and invalid source reject before any dist write', async t => {
  for (const name of ['unexpected.txt', '.hidden.txt', 'unknown/nested.css']) await t.test(name, async child => {
    const f = await fixture(child);
    const target = path.join(f.publicRoot, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, 'FAKE_UNAPPROVED_SOURCE\n');
    await assert.rejects(buildPreview(f.root), error => error instanceof ValidationError);
    await absent(f.dist);
    assert.equal(await fs.readFile(target, 'utf8'), 'FAKE_UNAPPROVED_SOURCE\n');
  });
  await t.test('invalid robots preserves already built dist', async child => {
    const f = await fixture(child);
    await buildPreview(f.root);
    const before = await inventory(f.dist);
    const target = path.join(f.publicRoot, 'index.html');
    await fs.writeFile(target, (await fs.readFile(target, 'utf8')).replace('noindex,nofollow', 'index,follow'));
    await assert.rejects(buildPreview(f.root), isCode('PREVIEW_ROBOTS_INVALID'));
    assert.deepEqual(await inventory(f.dist), before);
  });
});

test('unknown stale dist files/directories are rejected and preserved', async t => {
  for (const name of ['retained.txt', 'unknown/retained.txt', '.retained.txt']) await t.test(name, async child => {
    const f = await fixture(child);
    await buildPreview(f.root);
    const target = path.join(f.dist, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, 'FAKE_STALE_DIST_SENTINEL\n');
    const before = await inventory(f.dist);
    await assert.rejects(buildPreview(f.root), error => error instanceof ValidationError && ['UNAPPROVED_ASSET', 'UNAPPROVED_DIRECTORY'].includes(error.code));
    assert.deepEqual(await inventory(f.dist), before);
    assert.equal(await fs.readFile(target, 'utf8'), 'FAKE_STALE_DIST_SENTINEL\n');
  });
});

test('hardlinked dist cannot overwrite an external sentinel; source hardlinks also reject', async t => {
  await t.test('destination hardlink', async child => {
    const f = await fixture(child);
    await buildPreview(f.root);
    const sentinel = path.join(f.base, 'external-sentinel.mjs');
    const content = Buffer.from('FAKE_EXTERNAL_HARDLINK_SENTINEL\n');
    await fs.writeFile(sentinel, content, { flag: 'wx' });
    const linked = path.join(f.dist, 'js/app.mjs');
    await fs.unlink(linked);
    await fs.link(sentinel, linked);
    assert.equal((await fs.lstat(linked)).nlink, 2);
    const before = await inventory(f.dist);
    await assert.rejects(buildPreview(f.root), isCode('HARDLINK_FORBIDDEN'));
    assert.deepEqual(await fs.readFile(sentinel), content);
    assert.deepEqual(await inventory(f.dist), before);
  });
  await t.test('source hardlink', async child => {
    const f = await fixture(child);
    const source = path.join(f.publicRoot, 'js/app.mjs');
    const sentinel = path.join(f.base, 'external-source.mjs');
    const bytes = await fs.readFile(source);
    await fs.writeFile(sentinel, bytes);
    await fs.unlink(source);
    await fs.link(sentinel, source);
    await assert.rejects(buildPreview(f.root), isCode('HARDLINK_FORBIDDEN'));
    await absent(f.dist);
    assert.deepEqual(await fs.readFile(sentinel), bytes);
  });
});

test('source/destination junctions and linked ancestors fail before modification', async t => {
  await t.test('source asset ancestor', async child => {
    const f = await fixture(child);
    const external = path.join(f.base, 'external-styles');
    const original = path.join(f.publicRoot, 'styles');
    await fs.rename(original, external);
    await fs.symlink(external, original, directoryLinkType);
    const before = await inventory(external);
    await assert.rejects(buildPreview(f.root), isCode('SYMLINK_FORBIDDEN'));
    await absent(f.dist);
    assert.deepEqual(await inventory(external), before);
  });
  await t.test('whole dist junction', async child => {
    const f = await fixture(child);
    const external = path.join(f.base, 'external-dist');
    await fs.mkdir(external);
    await fs.writeFile(path.join(external, 'index.html'), 'FAKE_EXTERNAL_DIST\n');
    await fs.symlink(external, f.dist, directoryLinkType);
    const before = await inventory(external);
    await assert.rejects(buildPreview(f.root), isCode('SYMLINK_FORBIDDEN'));
    assert.deepEqual(await inventory(external), before);
  });
  await t.test('destination asset ancestor', async child => {
    const f = await fixture(child);
    await buildPreview(f.root);
    const external = path.join(f.base, 'external-output-styles');
    const original = path.join(f.dist, 'styles');
    await fs.rename(original, external);
    await fs.symlink(external, original, directoryLinkType);
    const before = await inventory(external);
    const beforeDist = await inventory(f.dist);
    await assert.rejects(buildPreview(f.root), isCode('SYMLINK_FORBIDDEN'));
    assert.deepEqual(await inventory(external), before);
    assert.deepEqual(await inventory(f.dist), beforeDist);
  });
  await t.test('project/public path through ancestor junction', async child => {
    const f = await fixture(child);
    const alias = path.join(f.base, 'alias-parent');
    await fs.symlink(f.root, alias, directoryLinkType);
    const sourceViaAncestor = path.join(alias, 'public');
    assert.equal((await fs.lstat(sourceViaAncestor)).isSymbolicLink(), false);
    await assert.rejects(createStaticServer(sourceViaAncestor), isCode('SYMLINK_FORBIDDEN'));
    // Root itself is not a symlink in this spelling; its parent is.
    const projectParent = path.join(f.base, 'alias-to-base');
    await fs.symlink(f.base, projectParent, directoryLinkType);
    await assert.rejects(buildPreview(path.join(projectParent, 'project')), isCode('SYMLINK_FORBIDDEN'));
    await absent(f.dist);
  });
});

test('server binds loopback; GET/HEAD have exact bytes, MIME and security headers', async t => {
  const f = await fixture(t);
  const { server, port } = await serverFor(t, f.publicRoot);
  assert.equal(server.address().address, '127.0.0.1');
  for (const [target, name, type] of [
    ['/', 'index.html', 'text/html; charset=utf-8'],
    ['/en/', 'en/index.html', 'text/html; charset=utf-8'],
    ['/en/index.html', 'en/index.html', 'text/html; charset=utf-8'],
    ['/styles/app.css', 'styles/app.css', 'text/css; charset=utf-8'],
    ['/js/app.mjs', 'js/app.mjs', 'text/javascript; charset=utf-8'],
    ['/index.html?preview=1', 'index.html', 'text/html; charset=utf-8'],
  ]) {
    const expected = await fs.readFile(path.join(f.publicRoot, name));
    const get = await request(port, target);
    assert.equal(get.status, 200);
    assert.deepEqual(get.bytes, expected);
    assert.equal(get.headers['content-type'], type);
    assert.equal(Number(get.headers['content-length']), expected.length);
    assert.equal(get.headers['x-content-type-options'], 'nosniff');
    assert.equal(get.headers['referrer-policy'], 'no-referrer');
    assert.equal(get.headers['x-robots-tag'], 'noindex, nofollow');
    assert.match(get.headers['content-security-policy'], /connect-src 'none'/);
    const head = await request(port, target, 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.bytes.length, 0);
    assert.equal(head.headers['content-type'], type);
    assert.equal(Number(head.headers['content-length']), expected.length);
  }
  for (const [name, type] of [['fake.txt', 'text/plain; charset=utf-8'], ['fake.xml', 'application/xml; charset=utf-8'], ['fake.js', 'text/javascript; charset=utf-8'], ['fake.svg', 'image/svg+xml']]) {
    await fs.writeFile(path.join(f.publicRoot, name), 'FAKE_STATIC_MIME\n');
    const result = await request(port, `/${name}`);
    assert.equal(result.status, 200);
    assert.equal(result.headers['content-type'], type);
  }
});

test('server returns genuine 404s and 405s; traversal/hidden/outside paths stay inaccessible', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'private-fixture.txt'), 'FAKE_ROOT_PRIVATE\n');
  await fs.writeFile(path.join(f.publicRoot, '.hidden.txt'), 'FAKE_HIDDEN\n');
  await fs.mkdir(path.join(f.publicRoot, '.hidden'));
  await fs.writeFile(path.join(f.publicRoot, '.hidden/file.txt'), 'FAKE_HIDDEN_ANCESTOR\n');
  const { port } = await serverFor(t, f.publicRoot);
  const denied = ['/missing', '/missing.html', '/deep/missing.html', '/en/missing.html', '/private-fixture.txt', '/package.json', '/.hidden.txt', '/.hidden/file.txt', '/%2ehidden.txt', '/../private-fixture.txt', '/%2e%2e/private-fixture.txt', '/en/../index.html', '/en/%2E%2E/index.html', '/styles/./app.css', '/styles%2fapp.css', '/styles%5capp.css', '/styles\\app.css', '//index.html', '/%252e%252e/private-fixture.txt', '/%00index.html', '/C:/private-fixture.txt', '/index.html.', '/%', 'http://example.invalid/index.html'];
  for (const target of denied) {
    const result = await request(port, target);
    assert.equal(result.status, 404, target);
    assert.equal(result.bytes.toString(), 'Not found\n', target);
    assert.doesNotMatch(result.bytes.toString(), /FAKE_|<html/);
  }
  const head = await request(port, '/en/missing.html', 'HEAD');
  assert.equal(head.status, 404);
  assert.equal(head.bytes.length, 0);
  assert.equal(Number(head.headers['content-length']), 10);
  const sourceBefore = await inventory(f.publicRoot);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const result = await request(port, '/index.html', method);
    assert.equal(result.status, 405);
    assert.equal(result.headers.allow, 'GET, HEAD');
    assert.equal(result.bytes.toString(), 'Method not allowed\n');
  }
  assert.deepEqual(await inventory(f.publicRoot), sourceBefore);
});

test('server cannot expose junction descendants or hardlinked external files', async t => {
  const f = await fixture(t);
  const external = path.join(f.base, 'external-assets');
  await fs.mkdir(external);
  const sentinel = path.join(external, 'sentinel.txt');
  const bytes = Buffer.from('FAKE_SERVER_EXTERNAL_SENTINEL\n');
  await fs.writeFile(sentinel, bytes);
  await fs.symlink(external, path.join(f.publicRoot, 'alias'), directoryLinkType);
  await fs.link(sentinel, path.join(f.publicRoot, 'linked.txt'));
  const { port } = await serverFor(t, f.publicRoot);
  for (const target of ['/alias/sentinel.txt', '/linked.txt']) {
    const result = await request(port, target);
    assert.equal(result.status, 404);
    assert.equal(result.bytes.toString(), 'Not found\n');
  }
  assert.deepEqual(await fs.readFile(sentinel), bytes);
});

test('occupied requested port uses OS fallback and preserves the existing server', async t => {
  const f = await fixture(t);
  const original = await serverFor(t, f.publicRoot);
  const fallback = await startPreviewServer({ publicRoot: f.publicRoot, port: original.port });
  t.after(() => close(fallback.server));
  assert.equal(fallback.fallback, true);
  assert.notEqual(fallback.port, original.port);
  assert.equal((await request(original.port, '/')).status, 200);
  assert.equal((await request(fallback.port, '/')).status, 200);
  assert.equal(original.server.listening, true);
});

test('dev CLI actually starts a loopback static server and rejects unsupported flags', async t => {
  const script = path.join(PROJECT, 'scripts/serve.mjs');
  const child = spawn(process.execPath, [script, '--port', '0'], { cwd: PROJECT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = once(child, 'exit');
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await exited;
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  const port = await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('DEV_START_TIMEOUT')), 5000);
    child.stdout.on('data', () => {
      const match = stdout.match(/Preview: http:\/\/127\.0\.0\.1:([0-9]+)\//);
      if (match) { clearTimeout(deadline); resolve(Number(match[1])); }
    });
    child.once('error', error => { clearTimeout(deadline); reject(error); });
  });
  assert.equal((await request(port, '/en/index.html')).status, 200);
  assert.equal(stderr, '');
  child.kill('SIGTERM');
  await exited;
  const invalid = spawn(process.execPath, [script, '--host', '0.0.0.0'], { cwd: PROJECT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let errorText = '';
  invalid.stderr.on('data', bytes => { errorText += bytes; });
  const [exitCode] = await once(invalid, 'exit');
  assert.equal(exitCode, 1);
  assert.equal(errorText.trim(), 'FAIL dev: CLI_ARGUMENT_INVALID');
});
