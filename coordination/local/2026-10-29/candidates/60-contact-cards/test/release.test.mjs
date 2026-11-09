import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, readFile, writeFile, readdir, rm, lstat, unlink, symlink, link } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildRelease, checkRelease, ORIGIN, TOOL_SLUG } from '../scripts/release.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://contacts.glossquote.com';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function fixture(t, { built = true } = {}) {
  const parent = resolve(ROOT, 'test'), root = await mkdtemp(join(parent, '.release-scratch-'));
  t.after(async () => {
    const exact = resolve(root);
    assert.ok(exact.startsWith(parent + sep) && exact.slice(parent.length + 1).startsWith('.release-scratch-'));
    assert.equal((await lstat(exact)).isSymbolicLink(), false);
    await rm(exact, { recursive: true });
  });
  await cp(join(ROOT, 'public'), join(root, 'public'), { recursive: true });
  await cp(join(ROOT, 'dist'), join(root, 'dist'), { recursive: true });
  await cp(join(ROOT, 'wrangler.jsonc'), join(root, 'wrangler.jsonc'));
  if (built) await buildRelease(root);
  return root;
}
async function snapshot(directory) {
  const records = [];
  async function walk(relative = '') {
    for (const name of (await readdir(join(directory, relative))).sort()) {
      const path = relative ? `${relative}/${name}` : name, stat = await lstat(join(directory, path));
      if (stat.isSymbolicLink()) records.push([path, 'LINK']);
      else if (stat.isDirectory()) { records.push([path, 'DIRECTORY']); await walk(path); }
      else records.push([path, sha(await readFile(join(directory, path)))]);
    }
  }
  await walk(); return records;
}
const outputPath = (root, path) => join(root, 'release-artifacts', 'site', path);
const manifestPath = (root) => join(root, 'release-artifacts', 'manifest.json');
const manifest = async (root) => JSON.parse(await readFile(manifestPath(root), 'utf8'));
const saveManifest = (root, value) => writeFile(manifestPath(root), JSON.stringify(value, null, 2) + '\n');
function tags(html, name) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]; assert.ok(head);
  return [...head.matchAll(new RegExp(`<${name}\\b([^>]+)>`, 'g'))].map((match) => {
    const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [attribute[1], attribute[2]]));
    return attributes;
  });
}

test('M2A bilingual SEO and exact candidate-prefix removal only; title/description/lang/rest of body preserved', async (t) => {
  const root = await fixture(t);
  assert.equal(ORIGIN, origin); assert.equal(TOOL_SLUG, 'contact-cards');
  const url = new URL(ORIGIN); assert.equal(url.protocol, 'https:'); assert.equal(url.port + url.username + url.password + url.search + url.hash, ''); assert.equal(url.pathname, '/');
  for (const [path, lang, title, heading] of [
    ['index.html', 'zh-Hant', '名單轉通訊錄｜Gloss Tools', '把 CSV 聯絡人整理成一個 VCF'],
    ['en/index.html', 'en', 'Contact List to vCard | Gloss Tools', 'Turn a CSV contact list into one VCF']
  ]) {
    const actual = await readFile(outputPath(root, path), 'utf8'), source = await readFile(join(root, 'public', path), 'utf8');
    assert.ok(actual.includes(`<html lang="${lang}">`)); assert.ok(actual.includes(`<title>${title}</title>`)); assert.ok(actual.includes(`<h1>${heading}</h1>`));
    const links = tags(actual, 'link');
    assert.deepEqual(links.filter((tag) => tag.rel === 'canonical'), [{ rel: 'canonical', href: `${origin}/${path}` }]);
    assert.deepEqual(links.filter((tag) => tag.rel === 'alternate'), [
      { rel: 'alternate', hreflang: 'zh-Hant', href: `${origin}/index.html` },
      { rel: 'alternate', hreflang: 'en', href: `${origin}/en/index.html` },
      { rel: 'alternate', hreflang: 'x-default', href: `${origin}/index.html` }
    ]);
    assert.deepEqual(tags(actual, 'meta').filter((tag) => tag.name === 'robots'), [{ name: 'robots', content: 'index,follow' }]);
    assert.deepEqual(tags(actual, 'meta').filter((tag) => tag.name === 'description'), tags(source, 'meta').filter((tag) => tag.name === 'description'));
    const prefix = path === 'index.html' ? '<p class="preview-label">本地候選版本 · ' : '<p class="preview-label">Local candidate · ';
    const expectedVisibleSource = source.replace(prefix, '<p class="preview-label">');
    assert.equal(actual.slice(actual.indexOf('</head>')), expectedVisibleSource.slice(expectedVisibleSource.indexOf('</head>')));
    const restored = actual.replace(/  <link rel="(?:canonical|alternate)"[^\n]+>\n/g, '').replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">');
    assert.equal(restored, expectedVisibleSource); // Only the approved exact prefix differs outside SEO.
    assert.equal(actual.includes(path === 'index.html' ? '本地候選版本' : 'Local candidate'), false);
    assert.ok(actual.includes(path === 'index.html' ? '手機實際匯入尚待驗證' : 'Device import has not been verified'));
  }
});
test('M1B exact robots/sitemap and all CSP/privacy headers preserved except indexing', async (t) => {
  const root = await fixture(t);
  assert.equal(await readFile(outputPath(root, 'robots.txt'), 'utf8'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  const sitemap = await readFile(outputPath(root, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]), [`${origin}/index.html`, `${origin}/en/index.html`]);
  assert.equal(/lastmod|changefreq|priority/i.test(sitemap), false);
  const source = await readFile(join(root, 'public', '_headers'), 'utf8'), actual = await readFile(outputPath(root, '_headers'), 'utf8');
  assert.equal(actual.replace('X-Robots-Tag: index, follow', 'X-Robots-Tag: noindex, nofollow'), source);
  assert.ok(actual.includes("connect-src 'none'")); assert.ok(actual.includes("script-src 'self'"));
});
test('M1B public/dist previews unchanged; JS/CSS bytes unchanged and no manifest inside site', async (t) => {
  const root = await fixture(t, { built: false }), publicBefore = await snapshot(join(root, 'public')), distBefore = await snapshot(join(root, 'dist'));
  await buildRelease(root); await checkRelease(root);
  assert.deepEqual(await snapshot(join(root, 'public')), publicBefore); assert.deepEqual(await snapshot(join(root, 'dist')), distBefore);
  for (const path of ['js/app.js', 'js/core/csv.mjs', 'js/core/map-contacts.mjs', 'js/core/vcard.mjs', 'styles/app.css']) assert.ok((await readFile(outputPath(root, path))).equals(await readFile(join(root, 'public', path))));
  for (const folder of ['public', 'dist']) for (const path of ['index.html', 'en/index.html']) {
    const html = await readFile(join(root, folder, path), 'utf8'); assert.ok(html.includes('content="noindex,nofollow"')); assert.equal(html.includes('rel="canonical"'), false);
  }
  await assert.rejects(readFile(outputPath(root, 'manifest.json')), { code: 'ENOENT' });
});
test('M2A exact manifest schema, sorted site/source/config inventories and independent digests', async (t) => {
  const root = await fixture(t), m = await manifest(root);
  assert.deepEqual(Object.keys(m), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'configFiles']);
  assert.equal(m.schemaVersion, 1); assert.equal(m.mode, 'release-candidate'); assert.equal(m.origin, origin); assert.equal(m.toolSlug, 'contact-cards');
  const expected = ['_headers', '_redirects', 'en/index.html', 'index.html', 'js/app.js', 'js/core/csv.mjs', 'js/core/map-contacts.mjs', 'js/core/vcard.mjs', 'robots.txt', 'sitemap.xml', 'styles/app.css'];
  assert.deepEqual(m.files.map((file) => file.path), expected);
  assert.deepEqual(m.sourceFiles.map((file) => file.path), expected.filter((path) => !['sitemap.xml', '_redirects'].includes(path)));
  assert.deepEqual(m.configFiles.map((file) => file.path), ['wrangler.jsonc']);
  for (const [files, directory] of [[m.files, join(root, 'release-artifacts', 'site')], [m.sourceFiles, join(root, 'public')], [m.configFiles, root]]) for (const file of files) {
    assert.deepEqual(Object.keys(file), ['path', 'bytes', 'sha256']); const bytes = await readFile(join(directory, file.path));
    assert.equal(file.bytes, bytes.length); assert.equal(file.sha256, sha(bytes)); assert.equal(file.path.includes('..'), false);
  }
  const raw = await readFile(manifestPath(root), 'utf8'); assert.equal(raw.includes(ROOT), false); assert.equal(/timestamp|createdAt|lastmod/i.test(raw), false);
});
test('M1B deterministic rebuild returns exact bytes without overwriting valid output', async (t) => {
  const root = await fixture(t), before = await snapshot(join(root, 'release-artifacts')), mtime = (await lstat(manifestPath(root))).mtimeMs;
  const result = await buildRelease(root);
  assert.equal(result.unchanged, true); assert.deepEqual(await snapshot(join(root, 'release-artifacts')), before);
  assert.equal((await lstat(manifestPath(root))).mtimeMs, mtime); assert.equal((await checkRelease(root)).files, 11);
});
for (const [name, mutate] of [
  ['tampered runtime output', async (root) => writeFile(outputPath(root, 'js/app.js'), '// modified\n')],
  ['tampered SEO output', async (root) => writeFile(outputPath(root, 'en/index.html'), (await readFile(outputPath(root, 'en/index.html'), 'utf8')).replace('hreflang="en"', 'hreflang="fr"'))],
  ['extra output file', async (root) => writeFile(outputPath(root, 'extra.txt'), 'retain synthetic bytes')],
  ['extra output directory', async (root) => mkdir(outputPath(root, 'unknown'))],
  ['missing output', async (root) => unlink(outputPath(root, 'robots.txt'))],
  ['wrong origin manifest', async (root) => saveManifest(root, { ...await manifest(root), origin: 'https://wrong.example.test' })],
  ['wrong mode manifest', async (root) => saveManifest(root, { ...await manifest(root), mode: 'published' })],
  ['duplicate manifest path', async (root) => { const m = await manifest(root); m.files.push(m.files[0]); await saveManifest(root, m); }],
  ['unsafe manifest path', async (root) => { const m = await manifest(root); m.files[0].path = '../outside'; await saveManifest(root, m); }],
  ['unknown manifest key', async (root) => saveManifest(root, { ...await manifest(root), extra: true })]
]) test(`M1B check/build both reject ${name} and preserve every existing byte`, async (t) => {
  const root = await fixture(t); await mutate(root); const before = await snapshot(join(root, 'release-artifacts'));
  await assert.rejects(checkRelease(root)); await assert.rejects(buildRelease(root));
  assert.deepEqual(await snapshot(join(root, 'release-artifacts')), before);
});
test('M1B asset+manifest together tampered still rejected against reconstructed expected bytes', async (t) => {
  const root = await fixture(t), path = 'en/index.html';
  const poisoned = Buffer.from((await readFile(outputPath(root, path), 'utf8')).replaceAll(origin, 'https://wrong.example.test'));
  await writeFile(outputPath(root, path), poisoned);
  const m = await manifest(root), item = m.files.find((file) => file.path === path); item.bytes = poisoned.length; item.sha256 = sha(poisoned); await saveManifest(root, m);
  const before = await snapshot(join(root, 'release-artifacts'));
  await assert.rejects(checkRelease(root), { code: 'MANIFEST_MISMATCH' }); await assert.rejects(buildRelease(root));
  assert.deepEqual(await snapshot(join(root, 'release-artifacts')), before);
});
test('M1B source drift rejected even when source+site+manifest inventories are edited together', async (t) => {
  const root = await fixture(t), path = 'styles/app.css';
  const poisoned = Buffer.concat([await readFile(join(root, 'public', path)), Buffer.from('\n/* synthetic drift */\n')]);
  await writeFile(join(root, 'public', path), poisoned); await writeFile(outputPath(root, path), poisoned);
  const m = await manifest(root);
  for (const files of [m.files, m.sourceFiles]) { const item = files.find((file) => file.path === path); item.bytes = poisoned.length; item.sha256 = sha(poisoned); }
  await saveManifest(root, m); const before = await snapshot(join(root, 'release-artifacts'));
  await assert.rejects(checkRelease(root), { code: 'SOURCE_CHANGED' }); await assert.rejects(buildRelease(root), { code: 'SOURCE_CHANGED' });
  assert.deepEqual(await snapshot(join(root, 'release-artifacts')), before);
});
test('M1B invalid/extra input rejected before creating any output', async (t) => {
  const root = await fixture(t, { built: false }); await writeFile(join(root, 'public', 'unexpected.txt'), 'synthetic');
  await assert.rejects(buildRelease(root), { code: 'EXTRA_FILE' }); await assert.rejects(lstat(join(root, 'release-artifacts')), { code: 'ENOENT' });
});
test('M1B unmanaged partial output is preserved and rejected', async (t) => {
  const root = await fixture(t, { built: false }); await mkdir(join(root, 'release-artifacts')); await mkdir(join(root, 'release-artifacts', 'site'));
  await writeFile(outputPath(root, 'index.html'), 'existing synthetic user bytes'); const before = await snapshot(join(root, 'release-artifacts'));
  await assert.rejects(buildRelease(root), { code: 'MISSING_FILE' }); assert.deepEqual(await snapshot(join(root, 'release-artifacts')), before);
});
test('M1B rejects source/output junctions and hardlinks without following targets', async (t) => {
  const outputRoot = await fixture(t, { built: false }), target = join(outputRoot, 'target'); await mkdir(target);
  await symlink(target, join(outputRoot, 'release-artifacts'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildRelease(outputRoot), { code: 'UNSAFE_TREE' }); assert.deepEqual(await readdir(target), []);
  const sourceRoot = await fixture(t, { built: false }); await symlink(target, join(sourceRoot, 'public', 'unexpected-link'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildRelease(sourceRoot), { code: 'LINK_REJECTED' });
  const hardRoot = await fixture(t); await link(outputPath(hardRoot, 'robots.txt'), join(hardRoot, 'hardlink-target'));
  await assert.rejects(checkRelease(hardRoot), { code: 'HARDLINK_REJECTED' });
});
test('M1B CLI rejects no/unknown/multiple args and origin overrides in task-owned copy', async (t) => {
  const root = await fixture(t, { built: false }); await mkdir(join(root, 'scripts')); const script = join(root, 'scripts', 'release.mjs'); await cp(join(ROOT, 'scripts', 'release.mjs'), script);
  for (const args of [[], ['deploy'], ['Build'], ['build', 'extra'], ['check', 'extra'], ['--origin=https://wrong.example.test'], ['build', '--origin=https://wrong.example.test'], ['build', '--force']]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8' });
    assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.equal(result.stderr, 'release rejected: USAGE_BUILD_OR_CHECK_ONLY\n');
  }
  await assert.rejects(lstat(join(root, 'release-artifacts')), { code: 'ENOENT' });
});
