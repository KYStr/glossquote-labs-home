import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, copyFile, readFile, writeFile, readdir, lstat, unlink, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { root, PUBLIC_FILES } from '../scripts/files.mjs';
import { M1_SOURCES } from '../scripts/release-baseline.mjs';
import { validateDeploymentConfig } from '../scripts/release-config.mjs';
import { removeReleaseBanner } from '../scripts/release.mjs';
const ORIGIN = 'https://bookmarks.glossquote.com';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const workspaces = path.join(root, 'evidence', 'm2a', 'test-workspaces');
const BANNERS = { 'index.html': '<span class="candidate">本機候選版；尚未部署</span>', 'en/index.html': '<span class="candidate">Local candidate; not deployed</span>' };
async function fixture() {
  await mkdir(workspaces, { recursive: true });
  assert(!(await lstat(workspaces)).isSymbolicLink());
  const copy = await mkdtemp(path.join(workspaces, 'copy-'));
  assert(path.dirname(copy) === workspaces && copy.startsWith(path.resolve(root) + path.sep));
  for (const name of ['wrangler.jsonc', ...PUBLIC_FILES.map(file => `public/${file}`), ...['files', 'serve', 'release', 'release-baseline', 'release-config'].map(file => `scripts/${file}.mjs`)]) {
    await mkdir(path.dirname(path.join(copy, name)), { recursive: true });
    await copyFile(path.join(root, name), path.join(copy, name));
  }
  return copy;
}
function run(copy, args) {
  const result = spawnSync(process.execPath, [path.join(copy, 'scripts', 'release.mjs'), ...args], { cwd: copy, shell: false, windowsHide: true, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
  assert.equal(result.error, undefined, 'CLI did not execute');
  return result;
}
function passes(copy, mode) { const result = run(copy, [mode]); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); }
function fails(copy, args, code) { const result = run(copy, args); assert.equal(result.status, 1, result.stdout); assert.equal(result.stderr.trim(), code); }
const siteFile = (copy, name) => path.join(copy, 'release-artifacts', 'site', name);
const manifestFile = copy => path.join(copy, 'release-artifacts', 'manifest.json');
async function snapshot(directory) {
  const result = [];
  const visit = async (absolute, relative) => {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) { result.push([relative, 'link']); return; }
    if (stat.isFile()) { const bytes = await readFile(absolute); result.push([relative, bytes.length, digest(bytes)]); return; }
    result.push([relative, 'directory']);
    for (const name of (await readdir(absolute)).sort()) await visit(path.join(absolute, name), relative ? `${relative}/${name}` : name);
  };
  try { await visit(directory, ''); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return result;
}
async function noRepair(copy, code) {
  const before = await snapshot(path.join(copy, 'release-artifacts'));
  fails(copy, ['check'], code); fails(copy, ['build'], code);
  assert.deepEqual(await snapshot(path.join(copy, 'release-artifacts')), before, 'A failed preflight changed prior output');
}
async function alterAssetAndManifest(copy, name, edit) {
  const target = siteFile(copy, name);
  await writeFile(target, edit(await readFile(target, 'utf8')));
  const bytes = await readFile(target), manifest = JSON.parse(await readFile(manifestFile(copy), 'utf8'));
  const record = manifest.files.find(file => file.path === name);
  record.bytes = bytes.length; record.sha256 = digest(bytes);
  await writeFile(manifestFile(copy), JSON.stringify(manifest, null, 2) + '\n');
}
test('release: source pins match the unchanged historical M1 public inventory', async () => {
  const bytes = await readFile(path.join(root, 'evidence', 'm1', 'CANDIDATE-MANIFEST.json'));
  assert.equal(digest(bytes), '0964cc92266f8171a70879fdab953ce02d1850d3ebea914a8e7b1d7bae38e522');
  assert.deepEqual(M1_SOURCES, JSON.parse(bytes).files.filter(file => file.path.startsWith('public/')).map(file => ({ ...file, path: file.path.slice(7) })));
});
test('release: exact origin, two-language SEO and only the exact approved banner removed from the full body', async () => {
  const copy = await fixture(), original = await snapshot(path.join(copy, 'public'));
  assert.equal(passes(copy, 'build').files, 21); passes(copy, 'check');
  for (const page of ['index.html', 'en/index.html']) {
    const before = await readFile(path.join(copy, 'public', page), 'utf8'), after = await readFile(siteFile(copy, page), 'utf8');
    const links = [...after.matchAll(/<link\b([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]])));
    assert.deepEqual(links.filter(link => link.rel === 'canonical'), [{ rel: 'canonical', href: `${ORIGIN}/${page}` }]);
    assert.deepEqual(links.filter(link => link.rel === 'alternate'), [{ rel: 'alternate', hreflang: 'zh-Hant', href: `${ORIGIN}/index.html` }, { rel: 'alternate', hreflang: 'en', href: `${ORIGIN}/en/index.html` }, { rel: 'alternate', hreflang: 'x-default', href: `${ORIGIN}/index.html` }]);
    assert.equal((after.match(/<meta name="robots" content="index,follow">/g) ?? []).length, 1);
    assert.match(before, /<meta name="robots" content="noindex,nofollow,noarchive">/);
    assert(!before.includes('rel="canonical"'));
    assert.equal(after.slice(after.indexOf('</head>')), before.slice(before.indexOf('</head>')).replace(BANNERS[page], ''));
    const restored = after.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow,noarchive">').replace(/^  <link rel="(?:canonical|alternate)"[^\n]*>\n/gm, '');
    assert.equal(restored, before.replace(BANNERS[page], ''));
    assert(!after.includes(BANNERS[page]) && before.includes(BANNERS[page]));
  }
  assert.deepEqual(await snapshot(path.join(copy, 'public')), original);
});
test('release: all runtime bytes unchanged; deterministic manifest; rebuild performs no writes', async () => {
  const copy = await fixture(); passes(copy, 'build');
  for (const name of PUBLIC_FILES.filter(file => !file.endsWith('.html'))) assert((await readFile(siteFile(copy, name))).equals(await readFile(path.join(copy, 'public', name))));
  const manifestText = await readFile(manifestFile(copy), 'utf8'), manifest = JSON.parse(manifestText);
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
  assert.deepEqual([manifest.schemaVersion, manifest.mode, manifest.origin, manifest.toolSlug], [1, 'release-candidate', ORIGIN, 'bookmark-organizer']);
  assert.equal(manifest.files.length, 21); assert.equal(manifest.sourceFiles.length, 17);
  assert.deepEqual(manifest.files.map(file => file.path), [...manifest.files.map(file => file.path)].sort());
  assert.equal(new Set(manifest.files.map(file => file.path)).size, 21);
  assert(!manifest.files.some(file => file.path === 'manifest.json'));
  assert(!manifestText.includes(copy) && !/createdAt|lastmod|timestamp|generatedAt/.test(manifestText));
  const before = await snapshot(path.join(copy, 'release-artifacts')), modified = (await lstat(manifestFile(copy))).mtimeMs;
  assert.equal(passes(copy, 'build').build, 'reused-without-writes');
  assert.deepEqual(await snapshot(path.join(copy, 'release-artifacts')), before); assert.equal((await lstat(manifestFile(copy))).mtimeMs, modified);
});
test('release: robots, sitemap and every privacy/security header match explicit independent expectations', async () => {
  const copy = await fixture(); passes(copy, 'build');
  assert.equal(await readFile(siteFile(copy, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://bookmarks.glossquote.com/sitemap.xml\n');
  const sitemap = await readFile(siteFile(copy, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://bookmarks.glossquote.com/index.html', 'https://bookmarks.glossquote.com/en/index.html']);
  assert(!/lastmod|<!DOCTYPE|<!ENTITY/.test(sitemap));
  assert.equal(await readFile(siteFile(copy, '_redirects'), 'utf8'), '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
  assert.equal(await readFile(siteFile(copy, '_headers'), 'utf8'), "/*\n  X-Content-Type-Options: nosniff\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: index, follow\n  Content-Security-Policy: default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n");
});
test('release: missing, unknown and extra CLI arguments fail before creating output', async () => {
  const copy = await fixture();
  for (const args of [[], ['publish'], ['--help'], ['build', 'extra'], ['check', 'extra'], ['build', '--origin=https://wrong.example']]) fails(copy, args, 'RELEASE_ARGUMENTS');
  assert.deepEqual(await snapshot(path.join(copy, 'release-artifacts')), []);
});
test('release: simple asset tampering is refused without repairing prior bytes', async () => {
  const copy = await fixture(); passes(copy, 'build');
  await writeFile(siteFile(copy, 'js/app.js'), 'tampered');
  await noRepair(copy, 'RELEASE_MANIFEST_INVENTORY');
});
test('release: extra output files and unknown empty directories are refused without deletion', async () => {
  for (const kind of ['file', 'directory']) {
    const copy = await fixture(); passes(copy, 'build');
    if (kind === 'file') await writeFile(siteFile(copy, 'unmanaged.txt'), 'preserve'); else await mkdir(siteFile(copy, 'unmanaged'));
    await noRepair(copy, kind === 'file' ? 'RELEASE_UNKNOWN_FILE' : 'RELEASE_UNKNOWN_DIRECTORY');
  }
});
test('release: missing managed output is refused rather than silently reconstructed', async () => {
  const copy = await fixture(); passes(copy, 'build'); await unlink(siteFile(copy, 'css/app.css'));
  await noRepair(copy, 'RELEASE_OUTPUT_MISSING');
});
test('release: asset plus manifest hash tampering still fails rebuilt expected bytes', async () => {
  const copy = await fixture(); passes(copy, 'build');
  await alterAssetAndManifest(copy, 'js/app.js', source => source + '\n/* coordinated tamper */\n');
  await noRepair(copy, 'RELEASE_ASSET_CHANGED');
});
test('release: coordinated SEO, body, headers, robots and sitemap corruptions fail semantic/byte oracles', async () => {
  for (const [name, edit, code] of [
    ['index.html', text => text.replace('rel="canonical" href="https://bookmarks.glossquote.com/index.html"', 'rel="canonical" href="https://wrong.example/index.html"'), 'RELEASE_SEO_CANONICAL'],
    ['en/index.html', text => text.replace('hreflang="x-default" href="https://bookmarks.glossquote.com/index.html"', 'hreflang="x-default" href="https://bookmarks.glossquote.com/en/index.html"'), 'RELEASE_SEO_ALTERNATE'],
    ['en/index.html', text => text.replace('name="robots" content="index,follow"', 'name="robots" content="noindex"'), 'RELEASE_SEO_ROBOTS'],
    ['index.html', text => text.replace('</head>', '<link rel="canonical" href="https://bookmarks.glossquote.com/index.html">\n</head>'), 'RELEASE_SEO_COUNT'],
    ['en/index.html', text => text.replace('Review duplicate URLs and folders before exporting.', 'BR49_CHANGED_BODY'), 'RELEASE_BODY_CHANGED'],
    ['_headers', text => text.replace("connect-src 'none'", 'connect-src *'), 'RELEASE_ASSET_CHANGED'],
    ['robots.txt', text => text.replace('Allow: /', 'Disallow: /'), 'RELEASE_ASSET_CHANGED'],
    ['sitemap.xml', text => text.replace('</urlset>', '<url><loc>https://wrong.example/</loc></url></urlset>'), 'RELEASE_ASSET_CHANGED']
  ]) {
    const copy = await fixture(); passes(copy, 'build'); await alterAssetAndManifest(copy, name, edit); await noRepair(copy, code);
  }
});
test('release: wrong manifest origin, schema, duplicate record and corrupt JSON are refused', async () => {
  for (const [edit, code] of [
    [manifest => { manifest.origin = 'https://wrong.example'; }, 'RELEASE_MANIFEST_METADATA'],
    [manifest => { manifest.extra = true; }, 'RELEASE_MANIFEST_SCHEMA'],
    [manifest => { manifest.files.push(manifest.files[0]); }, 'RELEASE_MANIFEST_INVENTORY']
  ]) {
    const copy = await fixture(); passes(copy, 'build'); const manifest = JSON.parse(await readFile(manifestFile(copy), 'utf8')); edit(manifest); await writeFile(manifestFile(copy), JSON.stringify(manifest)); await noRepair(copy, code);
  }
  const copy = await fixture(); passes(copy, 'build'); await writeFile(manifestFile(copy), '{'); await noRepair(copy, 'RELEASE_MANIFEST_JSON');
});
test('release: changed source is refused even if site and both manifest inventories are changed with it', async () => {
  const copy = await fixture(); passes(copy, 'build');
  const name = 'js/app.js', bytes = Buffer.from((await readFile(path.join(copy, 'public', name), 'utf8')) + '\n// changed source\n');
  await writeFile(path.join(copy, 'public', name), bytes);
  await alterAssetAndManifest(copy, name, () => bytes.toString());
  const manifest = JSON.parse(await readFile(manifestFile(copy), 'utf8')), source = manifest.sourceFiles.find(file => file.path === name);
  source.bytes = bytes.length; source.sha256 = digest(bytes); await writeFile(manifestFile(copy), JSON.stringify(manifest, null, 2) + '\n');
  await noRepair(copy, 'RELEASE_SOURCE_CHANGED');
});
test('release: unknown/missing source files and empty source directories fail before creation', async () => {
  for (const kind of ['extra', 'missing', 'directory']) {
    const copy = await fixture();
    if (kind === 'extra') await writeFile(path.join(copy, 'public', 'unmanaged.txt'), 'preserve');
    if (kind === 'missing') await unlink(path.join(copy, 'public', 'css', 'app.css'));
    if (kind === 'directory') await mkdir(path.join(copy, 'public', 'unmanaged'));
    const before = await snapshot(path.join(copy, 'public'));
    fails(copy, ['build'], kind === 'extra' ? 'RELEASE_UNKNOWN_FILE' : kind === 'missing' ? 'RELEASE_SOURCE_MISSING' : 'RELEASE_UNKNOWN_DIRECTORY');
    assert.deepEqual(await snapshot(path.join(copy, 'release-artifacts')), []); assert.deepEqual(await snapshot(path.join(copy, 'public')), before);
  }
});
test('release: existing unowned or partial release roots are preserved and refused', async () => {
  for (const kind of ['empty', 'partial', 'unknown']) {
    const copy = await fixture(); await mkdir(path.join(copy, 'release-artifacts'));
    if (kind === 'partial') await writeFile(manifestFile(copy), '{}');
    if (kind === 'unknown') await writeFile(path.join(copy, 'release-artifacts', 'unmanaged.txt'), 'preserve');
    await noRepair(copy, kind === 'unknown' ? 'RELEASE_UNKNOWN_FILE' : 'RELEASE_OUTPUT_MISSING');
  }
});
test('release: source and output directory junctions/symlinks are refused without traversing their targets', async () => {
  for (const place of ['source', 'output']) {
    const copy = await fixture(), target = path.join(copy, 'owned-link-target');
    await mkdir(target); await writeFile(path.join(target, 'sentinel.txt'), 'preserve linked target');
    if (place === 'output') passes(copy, 'build');
    const link = place === 'source' ? path.join(copy, 'public', 'unmanaged-link') : siteFile(copy, 'unmanaged-link');
    await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert((await lstat(link)).isSymbolicLink());
    const before = await snapshot(target);
    if (place === 'output') await noRepair(copy, 'RELEASE_SYMLINK_OR_TYPE'); else fails(copy, ['build'], 'RELEASE_SYMLINK_OR_TYPE');
    assert.deepEqual(await snapshot(target), before);
    assert(path.dirname(copy) === workspaces && link.startsWith(copy + path.sep) && (await lstat(link)).isSymbolicLink());
    await unlink(link); // Only the identified disposable link; its target is retained.
  }
});
test('M2A config: exact assets-only deployment contract, no executable Worker or bindings', async () => {
  const bytes = await readFile(path.join(root, 'wrangler.jsonc'));
  const config = validateDeploymentConfig(bytes);
  assert.deepEqual(config, {
    name: 'glossquote-labs-bookmark-organizer', compatibility_date: '2026-10-24', workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'bookmarks.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    build: { command: 'node scripts/release.mjs build' }
  });
  assert(!['main', 'bindings', 'vars', 'env', 'permissions', 'compatibility_flags', 'account_id'].some(key => Object.hasOwn(config, key)));
});
test('M2A config: every fixed primitive rejects a type change; unknown nested/runtime overrides reject', async () => {
  const original = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  const leaves = [];
  const walk = (value, keys = []) => {
    if (value !== null && typeof value === 'object') for (const key of Object.keys(value)) walk(value[key], [...keys, key]);
    else leaves.push(keys);
  };
  walk(original);
  for (const keys of leaves) {
    const config = structuredClone(original); let parent = config;
    for (const key of keys.slice(0, -1)) parent = parent[key];
    const key = keys.at(-1); parent[key] = typeof parent[key] === 'boolean' ? 'false' : false;
    assert.throws(() => validateDeploymentConfig(Buffer.from(JSON.stringify(config, null, 2) + '\n')), error => error.code === 'RELEASE_CONFIG_CONTRACT', keys.join('.'));
  }
  for (const edit of [
    config => { config.main = 'worker.js'; }, config => { config.env = { production: {} }; }, config => { config.vars = { TEST_ONLY: 'fake' }; },
    config => { config.assets.binding = 'ASSETS'; }, config => { config.routes.push({ pattern: 'other.example', custom_domain: true }); },
    config => { config.observability.logs.extra = false; }, config => { config.permissions = []; }, config => { config.account_id = 'FAKE_ACCOUNT'; }
  ]) {
    const config = structuredClone(original); edit(config);
    assert.throws(() => validateDeploymentConfig(Buffer.from(JSON.stringify(config, null, 2) + '\n')), error => error.code === 'RELEASE_CONFIG_CONTRACT');
  }
});
test('M2A config: no wildcard/path/port/other domain, true logging, altered assets/build or ambiguous JSON', async () => {
  const text = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'), original = JSON.parse(text);
  const edits = [
    config => { config.routes[0].pattern = '*.glossquote.com'; }, config => { config.routes[0].pattern = 'bookmarks.glossquote.com/*'; },
    config => { config.routes[0].pattern = 'bookmarks.glossquote.com:443'; }, config => { config.routes[0].pattern = 'other.glossquote.com'; },
    config => { config.routes[0].custom_domain = false; }, config => { config.workers_dev = true; }, config => { config.preview_urls = true; }, config => { config.send_metrics = true; },
    config => { config.observability.enabled = true; }, config => { config.observability.logs.enabled = true; }, config => { config.observability.logs.invocation_logs = true; }, config => { config.observability.traces.enabled = true; },
    config => { config.assets.directory = '../public'; }, config => { config.assets.run_worker_first = true; }, config => { config.assets.html_handling = 'auto-trailing-slash'; },
    config => { config.assets.not_found_handling = 'single-page-application'; }, config => { config.compatibility_date = '2026-10-27'; }, config => { config.build.command = 'npm install'; }
  ];
  for (const edit of edits) {
    const config = structuredClone(original); edit(config);
    assert.throws(() => validateDeploymentConfig(Buffer.from(JSON.stringify(config, null, 2) + '\n')), error => error.code === 'RELEASE_CONFIG_CONTRACT');
  }
  for (const invalid of [text.replace('"send_metrics": false,', '"send_metrics": false,\n  "send_metrics": false,'), text + ' ', '\uFEFF' + text, '// comment\n' + text]) assert.throws(() => validateDeploymentConfig(Buffer.from(invalid)), error => ['RELEASE_CONFIG_FORMAT', 'RELEASE_CONFIG_JSON'].includes(error.code));
});
test('M2A config: CLI build/check refuse tampered configuration before touching managed outputs', async () => {
  const copy = await fixture(); passes(copy, 'build');
  const config = JSON.parse(await readFile(path.join(copy, 'wrangler.jsonc'), 'utf8')); config.observability.traces.enabled = true;
  await writeFile(path.join(copy, 'wrangler.jsonc'), JSON.stringify(config, null, 2) + '\n');
  await noRepair(copy, 'RELEASE_CONFIG_CONTRACT');
});
test('M2A banner: exact single element only; absence leaves every byte, duplicate or other page rejects', () => {
  for (const page of ['index.html', 'en/index.html']) {
    const text = `prefix\n${BANNERS[page]}\nsuffix`;
    assert.equal(removeReleaseBanner(text, page), 'prefix\n\nsuffix');
    assert.equal(removeReleaseBanner('no banner\n<span class="other">keep</span>\n', page), 'no banner\n<span class="other">keep</span>\n');
    assert.throws(() => removeReleaseBanner(BANNERS[page] + BANNERS[page], page), error => error.code === 'RELEASE_BANNER_COUNT');
  }
  assert.throws(() => removeReleaseBanner('', 'other.html'), error => error.code === 'RELEASE_BANNER_PAGE');
});
test('M2A full-body/banners: coordinated manifest tampering cannot reinsert/alter a banner or any other body content', async () => {
  for (const [name, edit] of [
    ['index.html', text => text.replace('</h1>', '</h1>' + BANNERS['index.html'])],
    ['en/index.html', text => text.replace('</h1>', '</h1><span class="candidate">Other text</span>')],
    ['index.html', text => text.replace('返回工具首頁', 'BR49_TAMPERED_FOOTER')],
    ['en/index.html', text => text.replace('<body>', '<body><p>BR49_EXTRA_BODY</p>')]
  ]) {
    const copy = await fixture(); passes(copy, 'build'); await alterAssetAndManifest(copy, name, edit); await noRepair(copy, 'RELEASE_BODY_CHANGED');
  }
});
test('M2A redirects: exact three LF rules are covered by manifest, together-tampered rules still reject', async () => {
  for (const edit of [
    text => text.replace('/ /index.html 301', '/ /en/index.html 301'), text => text.replace('/en/ /en/index.html 301\n', ''),
    text => text + '/* https://wrong.example/ 302\n', text => text.replaceAll('\n', '\r\n'), text => text.replaceAll('\n', '\\n')
  ]) {
    const copy = await fixture(); passes(copy, 'build'); await alterAssetAndManifest(copy, '_redirects', edit); await noRepair(copy, 'RELEASE_ASSET_CHANGED');
  }
});
async function makePinnedLegacy(copy) {
  passes(copy, 'build');
  for (const page of ['index.html', 'en/index.html']) await alterAssetAndManifest(copy, page, text => text.replace('</h1>', '</h1>' + BANNERS[page]));
  await unlink(siteFile(copy, '_redirects'));
  const manifest = JSON.parse(await readFile(manifestFile(copy), 'utf8')); manifest.files = manifest.files.filter(file => file.path !== '_redirects');
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  assert.equal(digest(bytes), '94ee4bd3206130a3977c5b42f3e3704e4e4f25370c0a153fa500f22c11aab52d', 'Legacy fixture must match the independent frozen manifest');
  await writeFile(manifestFile(copy), bytes);
}
test('M2A upgrade: only the exact pinned prior release migrates after a complete byte-equal preserved copy', async () => {
  const copy = await fixture(); await makePinnedLegacy(copy);
  const before = await snapshot(path.join(copy, 'release-artifacts'));
  assert.equal(passes(copy, 'build').build, 'upgraded-reviewed-banner-and-entrypoints');
  assert.deepEqual(await snapshot(path.join(copy, 'evidence/m2a/pre-m2a-release/release-artifacts')), before);
  passes(copy, 'check'); assert.equal(passes(copy, 'build').build, 'reused-without-writes');
});
test('M2A upgrade: poisoned preserved-copy directory stops migration without altering the prior release', async () => {
  const copy = await fixture(); await makePinnedLegacy(copy);
  const archive = path.join(copy, 'evidence/m2a/pre-m2a-release/release-artifacts');
  await mkdir(archive, { recursive: true }); await writeFile(path.join(archive, 'unmanaged.txt'), 'preserve');
  const before = await snapshot(path.join(copy, 'release-artifacts'));
  fails(copy, ['build'], 'RELEASE_UNKNOWN_FILE');
  assert.deepEqual(await snapshot(path.join(copy, 'release-artifacts')), before);
  assert.equal(await readFile(path.join(archive, 'unmanaged.txt'), 'utf8'), 'preserve');
});
