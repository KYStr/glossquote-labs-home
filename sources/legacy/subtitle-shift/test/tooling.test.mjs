import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validatePackage, validateHeaders, validateHtml, validateClientSource } from '../scripts/validate.mjs';
import { ASSETS, HEADERS } from '../scripts/manifest.mjs';
import { assertNode, assertAssetPath } from '../scripts/files.mjs';
import { makeHandler } from '../scripts/server.mjs';
const load = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('T01 package and dependency changes fail validation', async () => {
  const pkg = JSON.parse(await load('package.json')); validatePackage(pkg);
  for (const patch of [{ dependencies: { fake: '1' } }, { devDependencies: { fake: '1' } }, { private: false }, { scripts: { ...pkg.scripts, check: 'node -e "0"' } }]) assert.throws(() => validatePackage({ ...pkg, ...patch }));
});
test('T02 headers exactness, duplicate merging and unsafe CSP fail', async () => {
  const headers = await load('public/_headers'); validateHeaders(headers);
  for (const text of [headers + '  X-Robots-Tag: index\n', headers.replace("worker-src 'self'", "worker-src *"), headers.replace("connect-src 'none'", "connect-src 'self'"), headers.replace('noindex, nofollow', 'index')]) assert.throws(() => validateHeaders(text));
});
test('T03 HTML gates reject noindex, language, inline/event/form and missing label regressions', async () => {
  const html = await load('public/index.html'); validateHtml(html, 'zh-Hant', 'index.html');
  for (const source of [html.replace('noindex, nofollow', 'index'), html.replace('lang="zh-Hant"', 'lang="en"'), html.replace('</head>', '<script>0</script></head>'), html.replace('<body>', '<body onclick="0">'), html.replace('<body>', '<body><form>'), html.replace('for="srt-input"', 'for="missing-id"'), html.replace('id="srt-output" readonly', 'id="srt-output"'), html.replace('autocomplete="off" spellcheck="false" aria-describedby="seconds-help error" disabled', 'autocomplete="off" spellcheck="false" aria-describedby="seconds-help error"')]) assert.throws(() => validateHtml(source, 'zh-Hant', 'index.html'));
});
test('T04 source checks reject storage, networking, markup and external imports', () => {
  for (const source of ['fetch("/")', 'localStorage.x = 1', 'element.innerHTML = x', 'console.log(x)', 'from "https://example.invalid/a.mjs"', 'import("./core.mjs")', 'navigator.clipboard.writeText(x)', 'button.click()']) assert.throws(() => validateClientSource(source, 'app.mjs'));
});
test('T05 closed asset manifest and file node checks reject unsafe entries', () => {
  assert.equal(ASSETS.length, 13);
  for (const path of ['../README.md', 'secret.txt', '/index.html', 'en/../index.html', 'node_modules/anything']) assert.throws(() => assertAssetPath(path));
  const regular = { isSymbolicLink: () => false, isDirectory: () => false, isFile: () => true, nlink: 1 };
  assertNode(regular, false);
  for (const patch of [{ isSymbolicLink: () => true }, { nlink: 2 }, { isFile: () => false }]) assert.throws(() => assertNode({ ...regular, ...patch }, false));
});
function responseFor(path, method = 'GET', host = '127.0.0.1:4216') {
  const assets = new Map(ASSETS.map(file => [file, Buffer.from(file === '404.html' ? '<meta name="robots" content="noindex">404' : file)]));
  let response;
  makeHandler(assets)({ url: path, method, headers: { host } }, { writeHead(status, headers) { response = { status, headers }; }, end(body) { response.body = body; } });
  return response;
}
test('T06 HTTP model exact routes, methods, Host and preview headers', () => {
  for (const [path, status, method, host] of [['/index.html', 200], ['/en/', 200], ['/worker.mjs', 200], ['/_headers', 404], ['/missing', 404], ['/../README.md', 404], ['/%2e%2e/README.md', 404], ['/index.html?text=FAKE', 404], ['/index.html', 405, 'POST'], ['/index.html', 421, 'GET', 'outside.invalid']]) {
    const out = responseFor(path, method, host); assert.equal(out.status, status);
    for (const [key, value] of Object.entries(HEADERS)) assert.equal(out.headers[key], value);
    if (status === 405) assert.equal(out.headers.Allow, 'GET, HEAD');
  }
  const head = responseFor('/index.html', 'HEAD'); assert.equal(head.body, undefined); assert.equal(head.headers['Content-Length'], '10');
});
test('T07 both language pages have matching app targets and no GET form transport', async () => {
  for (const [file, lang] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    const html = await load('public/' + file); validateHtml(html, lang, file); assert.equal((html.match(/<textarea\b/g) ?? []).length, 2); assert.ok(!/<form\b|\bname="srt/.test(html));
  }
});
