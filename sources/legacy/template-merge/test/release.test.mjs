// Offline release fixtures only. No browser, server, credential, or real product mutation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, readdir, lstat, realpath, rm, unlink, copyFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, PUBLIC_FILES } from '../scripts/assets.mjs';
import { ORIGIN, SOURCE_BASELINE_SHA256 } from '../scripts/release.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const text = value => Buffer.from(value);
async function snapshot(root) {
  const records = [];
  async function visit(relative = '') {
    for (const name of (await readdir(path.join(root, relative))).sort()) {
      const file = relative ? `${relative}/${name}` : name;
      const info = await lstat(path.join(root, file));
      if (info.isSymbolicLink()) { records.push([file, 'link']); continue; }
      if (info.isDirectory()) { records.push([`${file}/`, 'directory']); await visit(file); }
      else records.push([file, hash(await readFile(path.join(root, file)))]);
    }
  }
  await visit();
  return records;
}

async function fixture(t, { linkedPublic = false } = {}) {
  const scratch = path.resolve(ROOT, 'evidence/m2a/.scratch');
  await mkdir(scratch, { recursive: true });
  if ((await lstat(scratch)).isSymbolicLink()) throw new Error('Unsafe scratch root.');
  const root = await mkdtemp(path.join(scratch, 'release-'));
  t.after(async () => {
    const absolute = path.resolve(root);
    const physical = await realpath(root);
    const boundary = await realpath(scratch);
    if (!absolute.startsWith(`${scratch}${path.sep}`) || !physical.startsWith(`${boundary}${path.sep}`)) throw new Error('Unsafe fixture cleanup.');
    await rm(absolute, { recursive: true, force: true });
  });
  await mkdir(path.join(root, 'scripts'));
  for (const file of ['assets.mjs', 'release.mjs']) await copyFile(path.join(ROOT, 'scripts', file), path.join(root, 'scripts', file));
  await copyFile(path.join(ROOT, 'wrangler.jsonc'), path.join(root, 'wrangler.jsonc'));
  for (const directory of ['public', 'dist']) {
    const target = linkedPublic && directory === 'public' ? 'linked-source' : directory;
    for (const file of PUBLIC_FILES) {
      await mkdir(path.dirname(path.join(root, target, file)), { recursive: true });
      await copyFile(path.join(ROOT, directory, file), path.join(root, target, file));
    }
  }
  if (linkedPublic) await symlink(path.join(root, 'linked-source'), path.join(root, 'public'), process.platform === 'win32' ? 'junction' : 'dir');
  const api = await import(pathToFileURL(path.join(root, 'scripts/release.mjs')).href);
  const output = path.join(root, 'release-artifacts');
  const site = path.join(output, 'site');
  const manifestPath = path.join(output, 'manifest.json');
  return { root, output, site, manifestPath, api,
    manifest: async () => JSON.parse(await readFile(manifestPath, 'utf8')),
    storeManifest: async manifest => writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
  };
}
async function rejectsWithoutWriting(h) {
  const before = await snapshot(h.root);
  await assert.rejects(h.api.checkRelease());
  await assert.rejects(h.api.buildRelease());
  assert.deepEqual(await snapshot(h.root), before);
}
async function updateManifestFile(h, file, bytes) {
  const manifest = await h.manifest();
  const item = manifest.files.find(item => item.path === file);
  Object.assign(item, { bytes: bytes.length, sha256: hash(bytes) });
  await h.storeManifest(manifest);
}
function cli(h, args, env = {}) {
  return spawnSync(process.execPath, [path.join(h.root, 'scripts/release.mjs'), ...args], {
    cwd: h.root, env, encoding: 'utf8', shell: false, windowsHide: true,
  });
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/\b([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

test('M2A complete candidate: formal bilingual SEO/footer, redirects, unchanged runtime/preview and CSP', async t => {
  const h = await fixture(t);
  const inputBefore = { public: await snapshot(path.join(h.root, 'public')), dist: await snapshot(path.join(h.root, 'dist')) };
  const built = await h.api.buildRelease();
  assert.equal(built.files, 15); assert.equal(built.sourceFiles, 13);
  assert.equal(built.origin, 'https://templates.glossquote.com');
  assert.deepEqual(await h.api.checkRelease(), Object.fromEntries(Object.entries(built).filter(([key]) => key !== 'reused')));
  const manifest = await h.manifest();
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.mode, 'release-candidate');
  assert.equal(manifest.origin, 'https://templates.glossquote.com'); assert.equal(manifest.toolSlug, 'template-merge');
  const siteFiles = [...new Set([...PUBLIC_FILES, '_redirects', 'sitemap.xml'])].sort();
  assert.deepEqual(manifest.files.map(file => file.path), siteFiles);
  assert.deepEqual(manifest.sourceFiles.map(file => file.path), [...PUBLIC_FILES].sort());
  for (const [records, base] of [[manifest.files, h.site], [manifest.sourceFiles, path.join(h.root, 'public')]]) {
    assert.equal(new Set(records.map(file => file.path)).size, records.length);
    for (const record of records) {
      assert.deepEqual(Object.keys(record), ['path', 'bytes', 'sha256']);
      const bytes = await readFile(path.join(base, record.path));
      assert.equal(bytes.length, record.bytes); assert.equal(hash(bytes), record.sha256);
    }
  }
  const links = { 'zh-Hant': `${ORIGIN}/index.html`, en: `${ORIGIN}/en/index.html`, 'x-default': `${ORIGIN}/index.html` };
  for (const file of ['index.html', 'en/index.html']) {
    const source = await readFile(path.join(h.root, 'public', file), 'utf8');
    const html = await readFile(path.join(h.site, file), 'utf8');
    const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
    const tags = [...head.matchAll(/<(?:link|meta)\b[^>]*>/g)].map(match => attributes(match[0]));
    assert.deepEqual(tags.filter(tag => tag.rel === 'canonical').map(tag => tag.href), [`${ORIGIN}/${file}`]);
    assert.deepEqual(Object.fromEntries(tags.filter(tag => tag.rel === 'alternate').map(tag => [tag.hreflang, tag.href])), links);
    assert.equal(tags.filter(tag => tag.rel === 'alternate').length, 3);
    assert.deepEqual(tags.filter(tag => tag.name === 'robots').map(tag => tag.content), ['index,follow']);
    const candidate = file.startsWith('en/') ? 'Local preview candidate' : '本地預覽候選';
    const restoredFooter = html.replace('<span>Gloss Tools by GlossQuote</span>', `<span>Gloss Tools by GlossQuote · ${candidate}</span>`);
    const restored = restoredFooter.replace(/^  <link rel="(?:canonical|alternate)"[^>]*>\n/gm, '').replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">');
    assert.equal(restored, source, 'Only the allowed head SEO and candidate footer bytes may change.');
    assert.equal(restoredFooter.slice(restoredFooter.indexOf('</head>')), source.slice(source.indexOf('</head>')));
    assert.ok(!html.includes(candidate));
  }
  for (const file of PUBLIC_FILES.filter(file => !['index.html', 'en/index.html', 'robots.txt', '_headers'].includes(file))) {
    assert.deepEqual(await readFile(path.join(h.site, file)), await readFile(path.join(h.root, 'public', file)));
  }
  assert.equal(await readFile(path.join(h.site, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://templates.glossquote.com/sitemap.xml\n');
  assert.equal(await readFile(path.join(h.site, '_redirects'), 'utf8'), '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
  const sitemap = await readFile(path.join(h.site, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [links['zh-Hant'], links.en]);
  assert.ok(!sitemap.includes('lastmod'));
  const headers = await readFile(path.join(h.site, '_headers'), 'utf8');
  assert.equal(headers.replace('X-Robots-Tag: index, follow', 'X-Robots-Tag: noindex, nofollow'), await readFile(path.join(h.root, 'public/_headers'), 'utf8'));
  assert.deepEqual(await snapshot(path.join(h.root, 'public')), inputBefore.public);
  assert.deepEqual(await snapshot(path.join(h.root, 'dist')), inputBefore.dist);
  assert.equal(SOURCE_BASELINE_SHA256, 'faa77fd2ec6893118a60b4ea23ae0ed34e0971776081b94c72f56aafdede74ee');
});

test('M2A deployment config has only the approved assets-only domain/build/privacy contract', async t => {
  const h = await fixture(t);
  const bytes = await readFile(path.join(h.root, 'wrangler.jsonc'));
  assert.deepEqual(JSON.parse(bytes), {
    name: 'glossquote-template-merge', compatibility_date: '2026-10-24',
    workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'templates.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    build: { command: 'node scripts/release.mjs build' },
  });
  assert.equal((await h.api.buildRelease()).configurationSha256, hash(bytes));
});

for (const [name, mutate] of [
  ['extra rule', value => `${value}/foreign /index.html 301\n`],
  ['changed destination', value => value.replace('/en /en/index.html 301', '/en /index.html 301')],
  ['missing rule', value => value.replace('/en/ /en/index.html 301\n', '')],
  ['changed status', value => value.replace('301', '302')],
  ['CRLF bytes', value => value.replaceAll('\n', '\r\n')],
]) {
  test(`M2A redirects reject ${name}, even when manifest digest is changed to match`, async t => {
    const h = await fixture(t); await h.api.buildRelease();
    const bytes = text(mutate(await readFile(path.join(h.site, '_redirects'), 'utf8')));
    await writeFile(path.join(h.site, '_redirects'), bytes);
    await updateManifestFile(h, '_redirects', bytes);
    await rejectsWithoutWriting(h);
  });
}

test('M2A missing redirects and removed manifest record fail closed', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  await unlink(path.join(h.site, '_redirects'));
  const manifest = await h.manifest(); manifest.files = manifest.files.filter(file => file.path !== '_redirects');
  await h.storeManifest(manifest); await rejectsWithoutWriting(h);
});

const configMutations = [
  ['Worker name', c => { c.name = 'another-worker'; }],
  ['date', c => { c.compatibility_date = '2026-10-27'; }],
  ['workers.dev', c => { c.workers_dev = true; }],
  ['preview URLs', c => { c.preview_urls = true; }],
  ['metrics', c => { c.send_metrics = true; }],
  ['observability', c => { c.observability.enabled = true; }],
  ['logs', c => { c.observability.logs.enabled = true; }],
  ['invocation logs', c => { c.observability.logs.invocation_logs = true; }],
  ['traces', c => { c.observability.traces.enabled = true; }],
  ['asset directory', c => { c.assets.directory = './public'; }],
  ['Worker first', c => { c.assets.run_worker_first = true; }],
  ['HTML handling', c => { c.assets.html_handling = 'auto-trailing-slash'; }],
  ['404 fallback', c => { c.assets.not_found_handling = '404-page'; }],
  ['SPA fallback', c => { c.assets.not_found_handling = 'single-page-application'; }],
  ['runtime entry', c => { c.main = 'worker.mjs'; }],
  ['vars', c => { c.vars = {}; }],
  ['environment overrides', c => { c.env = {}; }],
  ['binding', c => { c.assets.binding = 'ASSETS'; }],
  ['domain', c => { c.routes[0].pattern = 'foreign.example.invalid'; }],
  ['custom_domain', c => { c.routes[0].custom_domain = false; }],
  ['additional domain', c => { c.routes.push({ pattern: 'extra.example.invalid', custom_domain: true }); }],
  ['route extra key', c => { c.routes[0].zone_name = 'glossquote.com'; }],
  ['build command', c => { c.build.command = 'node unexpected.mjs'; }],
  ['build extra key', c => { c.build.cwd = '.'; }],
  ['logs extra key', c => { c.observability.logs.head_sampling_rate = 1; }],
  ['missing key', c => { delete c.send_metrics; }],
  ['wrong type', c => { c.workers_dev = 'false'; }],
  ['null section', c => { c.assets = null; }],
];
for (const [name, mutate] of configMutations) {
  test(`M2A strict configuration rejects ${name} before any build write, and after build`, async t => {
    for (const built of [false, true]) {
      const h = await fixture(t);
      if (built) await h.api.buildRelease();
      const configPath = path.join(h.root, 'wrangler.jsonc');
      const config = JSON.parse(await readFile(configPath, 'utf8')); mutate(config);
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
      await rejectsWithoutWriting(h);
      if (!built) await assert.rejects(lstat(h.output), { code: 'ENOENT' });
    }
  });
}

test('M2A invalid, duplicate-key, oversized, missing and linked config inputs are refused', async t => {
  for (const kind of ['invalid', 'duplicate', 'oversized', 'missing', 'linked']) {
    const h = await fixture(t); const file = path.join(h.root, 'wrangler.jsonc');
    if (kind === 'invalid') await writeFile(file, '{');
    if (kind === 'duplicate') await writeFile(file, (await readFile(file, 'utf8')).replace('  "workers_dev": false,', '  "workers_dev": true,\n  "workers_dev": false,'));
    if (kind === 'oversized') await writeFile(file, ' '.repeat(8193));
    if (kind === 'missing' || kind === 'linked') await unlink(file);
    if (kind === 'linked') {
      const target = path.join(h.root, 'config-target'); await mkdir(target);
      // A directory junction needs no Windows symlink privilege; it is rejected as a linked entry.
      await symlink(target, file, process.platform === 'win32' ? 'junction' : 'dir');
    }
    await rejectsWithoutWriting(h);
  }
});

test('M1B deterministic rebuild is a read-only no-op with identical manifest and site bytes', async t => {
  const h = await fixture(t); const first = await h.api.buildRelease();
  const before = await snapshot(h.output);
  const second = await h.api.buildRelease();
  assert.equal(first.reused, false); assert.equal(second.reused, true);
  assert.equal(second.artifactTreeSha256, first.artifactTreeSha256);
  assert.equal(second.manifestSha256, first.manifestSha256);
  assert.deepEqual(await snapshot(h.output), before);
});
test('M1B changed output is refused by check/build and preserved', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  await writeFile(path.join(h.site, 'js/app.js'), 'FAKE MODIFIED RUNTIME');
  await rejectsWithoutWriting(h);
});
test('M1B missing asset or manifest is refused without recreating it', async t => {
  for (const missing of ['site/index.html', 'manifest.json']) {
    const h = await fixture(t); await h.api.buildRelease();
    await unlink(path.join(h.output, missing));
    await rejectsWithoutWriting(h);
  }
});
test('M1B extra site file is refused and preserved', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  await writeFile(path.join(h.site, 'unmanaged-private.txt'), 'FAKE PRIVATE');
  await rejectsWithoutWriting(h);
});
test('M1B extra empty output directory is refused and preserved', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  await mkdir(path.join(h.site, 'unknown-empty'));
  await rejectsWithoutWriting(h);
});
test('M1B extra sibling file outside site is refused and preserved', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  await writeFile(path.join(h.output, 'foreign.txt'), 'FAKE FOREIGN');
  await rejectsWithoutWriting(h);
});
test('M1B manifest plus asset tampering cannot pass independent expected-byte checks', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  const bytes = text('FAKE MODIFIED RUNTIME');
  await writeFile(path.join(h.site, 'js/app.js'), bytes);
  await updateManifestFile(h, 'js/app.js', bytes);
  await rejectsWithoutWriting(h);
});
test('M1B wrong canonical/hreflang domain plus coordinated manifest tampering is refused', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  for (const file of ['index.html', 'en/index.html']) {
    const bytes = text((await readFile(path.join(h.site, file), 'utf8')).replaceAll('https://templates.glossquote.com', 'https://wrong.example.invalid'));
    await writeFile(path.join(h.site, file), bytes); await updateManifestFile(h, file, bytes);
  }
  const manifest = await h.manifest(); manifest.origin = 'https://wrong.example.invalid'; await h.storeManifest(manifest);
  await rejectsWithoutWriting(h);
});
test('M1B malformed schema, duplicated/traversal paths and altered source records are refused', async t => {
  for (const mutate of [m => { m.schemaVersion = 2; }, m => { m.files.push(m.files[0]); }, m => { m.files[0].path = '../outside'; }, m => { m.sourceFiles.pop(); }, m => { m.extra = true; }, m => { m.toolSlug = 'another-tool'; }]) {
    const h = await fixture(t); await h.api.buildRelease();
    const manifest = await h.manifest(); mutate(manifest); await h.storeManifest(manifest);
    await rejectsWithoutWriting(h);
  }
});
test('M1B changed source before build fails before creating any release directory', async t => {
  const h = await fixture(t);
  await writeFile(path.join(h.root, 'public/js/app.js'), 'FAKE NEW SOURCE');
  const before = await snapshot(h.root);
  await assert.rejects(h.api.buildRelease(), /RELEASE_SOURCE_CHANGED/);
  assert.deepEqual(await snapshot(h.root), before);
  await assert.rejects(lstat(h.output), { code: 'ENOENT' });
});
test('M1B coordinated source, asset and manifest mutation still fails the frozen M1 baseline', async t => {
  const h = await fixture(t); await h.api.buildRelease();
  const bytes = text('FAKE COORDINATED NEW RUNTIME');
  await writeFile(path.join(h.root, 'public/js/app.js'), bytes); await writeFile(path.join(h.site, 'js/app.js'), bytes);
  const manifest = await h.manifest();
  for (const list of [manifest.files, manifest.sourceFiles]) Object.assign(list.find(file => file.path === 'js/app.js'), { bytes: bytes.length, sha256: hash(bytes) });
  await h.storeManifest(manifest); await rejectsWithoutWriting(h);
});
test('M1B unknown source files or directories are refused before output creation', async t => {
  for (const kind of ['file', 'directory']) {
    const h = await fixture(t);
    if (kind === 'file') await writeFile(path.join(h.root, 'public/foreign.txt'), 'FAKE');
    else await mkdir(path.join(h.root, 'public/foreign'));
    const before = await snapshot(h.root);
    await assert.rejects(h.api.buildRelease()); assert.deepEqual(await snapshot(h.root), before);
  }
});
test('M1B linked public root is refused without following or modifying the target', async t => {
  const h = await fixture(t, { linkedPublic: true });
  await rejectsWithoutWriting(h);
});
test('M1B linked output root is refused without modifying its target', async t => {
  const h = await fixture(t); const target = path.join(h.root, 'output-target');
  await mkdir(target); await writeFile(path.join(target, 'keep.txt'), 'FAKE KEEP');
  await symlink(target, h.output, process.platform === 'win32' ? 'junction' : 'dir');
  await rejectsWithoutWriting(h);
  assert.equal(await readFile(path.join(target, 'keep.txt'), 'utf8'), 'FAKE KEEP');
});
test('M1B nested output junction is refused before any output write', async t => {
  const h = await fixture(t); const target = path.join(h.root, 'linked-target');
  await mkdir(target); await mkdir(h.site, { recursive: true });
  await symlink(target, path.join(h.site, 'js'), process.platform === 'win32' ? 'junction' : 'dir');
  await rejectsWithoutWriting(h);
});
test('M1B unmanaged empty/partial output is preserved rather than adopted or overwritten', async t => {
  for (const partial of [false, true]) {
    const h = await fixture(t); await mkdir(h.site, { recursive: true });
    if (partial) await writeFile(path.join(h.site, 'index.html'), 'FAKE OWNER CONTENT');
    await rejectsWithoutWriting(h);
  }
});
test('M1B CLI rejects missing/unknown/multiple arguments without writing anything', async t => {
  const h = await fixture(t); const before = await snapshot(h.root);
  for (const args of [[], ['deploy'], ['BUILD'], ['build', 'check'], ['build', '--origin=https://wrong.example.invalid'], ['check', 'extra']]) {
    const result = cli(h, args);
    assert.equal(result.status, 1); assert.match(result.stderr, /^USAGE:/);
  }
  assert.deepEqual(await snapshot(h.root), before);
});
test('M1B CLI build/check use the fixed origin even with fake process environment overrides', async t => {
  const h = await fixture(t);
  const built = cli(h, ['build'], { ORIGIN: 'https://wrong.example.invalid', TEMPLATE_MERGE_ORIGIN: 'http://127.0.0.1:9999' });
  assert.equal(built.status, 0, built.stderr); assert.equal(JSON.parse(built.stdout).origin, 'https://templates.glossquote.com');
  const checked = cli(h, ['check']); assert.equal(checked.status, 0, checked.stderr);
  assert.equal(JSON.parse(checked.stdout).toolSlug, 'template-merge');
});
