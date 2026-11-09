import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { root, publicFiles, inspectTree, securityHeaders } from '../scripts/files.mjs';
import { buildPreview } from '../scripts/build.mjs';
import { respond } from '../scripts/serve.mjs';

async function scratch(work) {
  const parent = path.resolve(root, 'test', '.scratch');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'owned-'));
  try { await work(directory); }
  finally {
    const verified = path.resolve(directory);
    if (path.dirname(verified) !== parent || !path.basename(verified).startsWith('owned-')) throw new Error('UNSAFE_CLEANUP_TARGET');
    await rm(verified, { recursive: true, force: false });
  }
}
test('build copies exact bytes and rejects unknown input/output, metadata and junctions without deleting unknown files', async () => scratch(async directory => {
  const source = path.join(directory, 'public'), destination = path.join(directory, 'dist');
  for (const file of publicFiles) {
    await mkdir(path.dirname(path.join(source, file)), { recursive: true });
    await writeFile(path.join(source, file), await readFile(path.join(root, 'public', file)));
  }
  await buildPreview({ source, destination });
  for (const file of publicFiles) assert.deepEqual(await readFile(path.join(destination, file)), await readFile(path.join(source, file)));
  await writeFile(path.join(source, 'unexpected.txt'), 'do not remove');
  await assert.rejects(buildPreview({ source, destination }), /UNKNOWN_FILE/);
  assert.equal(await readFile(path.join(source, 'unexpected.txt'), 'utf8'), 'do not remove');
  await rm(path.join(source, 'unexpected.txt'));
  await writeFile(path.join(destination, 'stale.txt'), 'preserve me');
  await assert.rejects(buildPreview({ source, destination }), /UNKNOWN_FILE/);
  assert.equal(await readFile(path.join(destination, 'stale.txt'), 'utf8'), 'preserve me');
  await rm(path.join(destination, 'stale.txt'));
  const page = await readFile(path.join(source, 'index.html'), 'utf8');
  await writeFile(path.join(source, 'index.html'), page.replace('noindex,nofollow', 'index,follow'));
  await assert.rejects(buildPreview({ source, destination }), /PREVIEW_METADATA/);
  await writeFile(path.join(source, 'index.html'), page);
  const junction = path.join(directory, 'junction');
  await symlink(source, junction, 'junction');
  await assert.rejects(inspectTree(junction), /LINK_REJECTED/);
}));
test('offline request-handler unit cases: GET/HEAD, 404/405, host/traversal and headers; NO socket/server launched', async () => {
  async function request(url, method = 'GET', host = '127.0.0.1:4237') {
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } };
    await respond({ url, method, headers: { host } }, response);
    return response;
  }
  assert.equal((await request('/')).statusCode, 200);
  assert.equal((await request('/en/')).statusCode, 200);
  assert.equal((await request('/unknown')).statusCode, 404);
  const head = await request('/index.html', 'HEAD'); assert.equal(head.statusCode, 200); assert.equal(head.body, undefined);
  const post = await request('/', 'POST'); assert.equal(post.statusCode, 405); assert.equal(post.headers.Allow, 'GET, HEAD');
  assert.equal((await request('/', 'GET', 'evil.invalid')).statusCode, 403);
  for (const bad of ['/../package.json', '/%2e%2e/package.json', '/js/../../package.json', '//evil', '/js\\app.js', '/index.html?draft=secret', 'https://evil.invalid/']) assert.equal((await request(bad)).statusCode, 400);
  assert.equal((await request('/package.json')).statusCode, 404);
  const script = await request('/js/core/decimal.mjs'); assert.equal(script.statusCode, 200); assert.match(script.headers['Content-Type'], /^text\/javascript/);
  assert.deepEqual(Object.fromEntries(Object.keys(securityHeaders).map(key => [key, head.headers[key]])), securityHeaders);
});
test('bilingual preview metadata, navigation, fixed copy, labeled fields and CSS contracts (static, not visual)', async () => {
  const zh = await readFile(path.join(root, 'public/index.html'), 'utf8');
  const en = await readFile(path.join(root, 'public/en/index.html'), 'utf8');
  assert.ok(zh.includes('<title>報價單快速製作｜Gloss Tools</title>'));
  assert.ok(en.includes('<title>Simple Quote Builder | Gloss Tools</title>'));
  for (const [html, lang] of [[zh, 'zh-Hant'], [en, 'en']]) {
    assert.ok(html.includes(`<html lang="${lang}">`));
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.equal((html.match(/<details>/g) || []).length, 3);
    assert.doesNotMatch(html, /\b(?:canonical|hreflang)\b/);
    for (const input of html.matchAll(/<(?:input|textarea) id="([^"]+)"/g)) assert.ok(html.includes(`for="${input[1]}"`));
  }
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(zh.includes('https://glossquote.com/index.html'));
  assert.ok(en.includes('https://glossquote.com/en/index.html'));
  const css = await readFile(path.join(root, 'public/styles/app.css'), 'utf8');
  for (const expected of ['min-height: 44px', 'min-width: 48rem', 'min-width: 75rem', 'prefers-reduced-motion', ':focus-visible', 'minmax(0, 3fr)', '--gq-color-acid: #c8f56a']) assert.ok(css.includes(expected));
});
