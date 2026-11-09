import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, PUBLIC_FILES, assertPublicTree } from '../scripts/assets.mjs';
import { validatePreviewHtml, validateBrowserSource } from '../scripts/check.mjs';
import { buildProject } from '../scripts/build.mjs';
import { createHandler, SECURITY_HEADERS } from '../scripts/serve.mjs';

for (const [file, language] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
  test(`${language}: static SEO, labels and routes with semantic rejection counterexamples`, async () => {
    const source = await readFile(path.join(ROOT, 'public', file), 'utf8');
    assert.doesNotThrow(() => validatePreviewHtml(source, file));
    for (const changed of [
      source.replace('noindex,nofollow', 'index,follow'),
      source.replace('<h1>', '<h1>Wrong'),
      source.replace('</head>', '<title>duplicate</title></head>'),
      source.replace('id="csv"', 'id="csv-missing"'),
      source.replace('</head>', '<link rel="canonical" href="https://example.invalid/"></head>'),
      source.replace('</head>', '<script src="https://example.invalid/remote.js"></script></head>'),
      source.replace('id="template-count"', 'id="csv"'),
    ]) assert.throws(() => validatePreviewHtml(changed, file));
    assert.throws(() => validatePreviewHtml(source.replace(language === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html', language === 'en' ? 'https://glossquote.com/index.html' : 'https://glossquote.com/en/index.html'), file));
  });
}
test('browser-module scanner rejects external imports, active content, storage and network', () => {
  for (const source of ["import x from 'https://example.invalid/a.js';", "import x from '../../outside.js';", 'node.innerHTML = value;', 'fetch(value)', 'localStorage.setItem(key, value)', 'new Worker(value)', 'console.log(value)', "import('./core/csv.mjs')"]) {
    assert.throws(() => validateBrowserSource(source, 'js/app.js'));
  }
  assert.doesNotThrow(() => validateBrowserSource("import { parseCsv } from './core/csv.mjs';", 'js/app.js'));
});

test('closed build allowlist copies exact bytes, refuses unknown outputs and junctions without deleting them', async () => {
  const scratchRoot = path.resolve(ROOT, 'evidence/m2a/.scratch');
  await mkdir(scratchRoot, { recursive: true });
  const temporary = await mkdtemp(path.join(scratchRoot, 'toolchain-'));
  try {
    const output = path.join(temporary, 'dist');
    const result = await buildProject(output);
    assert.equal(result.files, PUBLIC_FILES.length);
    for (const file of PUBLIC_FILES) assert.deepEqual(await readFile(path.join(output, file)), await readFile(path.join(ROOT, 'public', file)));
    await writeFile(path.join(output, 'unknown-private.txt'), 'FAKE-PRIVATE');
    await assert.rejects(buildProject(output), /Unknown public\/output file/);
    assert.equal(await readFile(path.join(output, 'unknown-private.txt'), 'utf8'), 'FAKE-PRIVATE');
    const linkedRoot = path.join(temporary, 'linked');
    const target = path.join(temporary, 'target');
    await mkdir(linkedRoot); await mkdir(target);
    await symlink(target, path.join(linkedRoot, 'js'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(assertPublicTree(linkedRoot, { complete: false }), /Linked asset/);
    const unknownDir = path.join(temporary, 'unknown-dir');
    await mkdir(path.join(unknownDir, 'mystery'), { recursive: true });
    await assert.rejects(assertPublicTree(unknownDir, { complete: false }), /Unknown asset directory/);
  } finally {
    // Only this task-owned disposable subtree; verify its absolute boundary first.
    const resolved = path.resolve(temporary);
    if (!resolved.startsWith(`${scratchRoot}${path.sep}`)) throw new Error('Unsafe test cleanup target.');
    await rm(resolved, { recursive: true, force: true });
  }
});

test('preview HTTP handler seam: exact methods/host/routes/MIME and headers; no listener opened', async () => {
  const handler = createHandler();
  async function request(url, method = 'GET', host = '127.0.0.1:4223') {
    const result = {};
    await handler({ url, method, headers: { host } }, {
      writeHead: (status, headers) => Object.assign(result, { status, headers }), end: body => { result.body = body; },
    });
    return result;
  }
  for (const url of ['/', '/en/', '/js/core/csv.mjs', '/styles/app.css']) {
    const response = await request(url);
    assert.equal(response.status, 200);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) assert.equal(response.headers[key], value);
  }
  const head = await request('/en/index.html', 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.body, undefined);
  assert.match(head.headers['Content-Type'], /text\/html/);
  assert.equal((await request('/index.html', 'POST')).status, 405);
  assert.equal((await request('/index.html', 'GET', 'example.invalid')).status, 403);
  for (const url of ['/../package.json', '/%2e%2e/package.json', '/_headers', '/unknown', '/js/../index.html', '/index.html?content=FAKE', '//index.html', '/%255c..%255cpackage.json']) assert.equal((await request(url)).status, 404);
  assert.equal((await request('/%xx')).status, 400);
});

test('shared palette pairs meet static text/control contrast thresholds (not rendered a11y)', () => {
  const luminance = color => {
    const c = color.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  const contrast = (a, b) => { const aa = luminance(a), bb = luminance(b); return (Math.max(aa, bb) + .05) / (Math.min(aa, bb) + .05); };
  for (const [text, background] of [['111410', 'f3f0e8'], ['55594f', 'f3f0e8'], ['55594f', 'ffffff'], ['111410', 'c8f56a'], ['245c16', 'e8f8c7'], ['713f00', 'fff0d5'], ['254f75', 'e6f1fa']]) assert.ok(contrast(text, background) >= 4.5);
  for (const background of ['ffffff', 'f3f0e8']) assert.ok(contrast('60645c', background) >= 3);
});
