import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, mkdir, readdir, lstat, rm, unlink, symlink, link, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, PUBLIC_FILES } from '../scripts/contract.mjs';
import { buildRelease, checkRelease, ORIGIN, TOOL_SLUG, SITE_FILES } from '../scripts/release.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const site = (root, file) => path.join(root, 'release-artifacts/site', file);
const manifestFile = root => path.join(root, 'release-artifacts/manifest.json');
async function fixture(run) {
  const parent = path.resolve(ROOT, 'evidence/m2a');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, '.release-fixture-'));
  try {
    await cp(path.join(ROOT, 'public'), path.join(root, 'public'), { recursive: true });
    await cp(path.join(ROOT, 'wrangler.jsonc'), path.join(root, 'wrangler.jsonc'));
    await run(root);
  }
  finally {
    const resolved = path.resolve(root);
    if (!resolved.startsWith(parent + path.sep) || !path.basename(resolved).startsWith('.release-fixture-') || (await lstat(resolved)).isSymbolicLink()) throw new Error('UNSAFE_FIXTURE_CLEANUP');
    await rm(resolved, { recursive: true, force: true });
  }
}
async function tree(root) {
  const files = [];
  async function walk(relative = '') {
    for (const name of await readdir(path.join(root, relative))) {
      const next = relative ? relative + '/' + name : name;
      const stat = await lstat(path.join(root, next));
      if (stat.isSymbolicLink()) { files.push({ path: next, type: 'link' }); continue; }
      if (stat.isDirectory()) { files.push({ path: next, type: 'directory' }); await walk(next); }
      else { const bytes = await readFile(path.join(root, next)); files.push({ path: next, bytes: bytes.length, sha256: hash(bytes) }); }
    }
  }
  await walk(); return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
async function saveManifest(root, mutate) {
  const manifest = JSON.parse(await readFile(manifestFile(root), 'utf8')); mutate(manifest);
  await writeFile(manifestFile(root), JSON.stringify(manifest, null, 2) + '\n');
}
async function updateManifestAsset(root, name) {
  const bytes = await readFile(site(root, name));
  await saveManifest(root, manifest => { const record = manifest.files.find(file => file.path === name); record.bytes = bytes.length; record.sha256 = hash(bytes); });
}
async function refusesWithoutMutation(root, pattern) {
  const before = await tree(root);
  await assert.rejects(checkRelease(root), pattern);
  await assert.rejects(buildRelease(root), pattern);
  assert.deepEqual(await tree(root), before, 'all original files remain exact after rejection');
}

test('M2A fixed origin and exact deterministic manifest schema cover all source/site/config files', async () => fixture(async root => {
  assert.equal(ORIGIN, 'https://moving-boxes.glossquote.com'); assert.equal(TOOL_SLUG, 'moving-boxes');
  const result = await buildRelease(root); assert.equal(result.created, true);
  const manifest = await checkRelease(root);
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'configFiles']);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.mode, 'release-candidate');
  assert.deepEqual(manifest.files.map(file => file.path), [...SITE_FILES]);
  assert.deepEqual(manifest.sourceFiles.map(file => file.path), [...PUBLIC_FILES].sort());
  const config = await readFile(path.join(root, 'wrangler.jsonc'));
  assert.deepEqual(manifest.configFiles, [{ path: 'wrangler.jsonc', bytes: config.length, sha256: hash(config) }]);
  assert.equal(manifest.files.some(file => file.path === 'wrangler.jsonc'), false);
  for (const record of manifest.files) {
    assert.deepEqual(Object.keys(record), ['path', 'bytes', 'sha256']);
    assert.equal(Buffer.byteLength(await readFile(site(root, record.path))), record.bytes); assert.match(record.sha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(manifest.files.some(file => file.path.includes('manifest')), false);
}));
test('M1B both language pages have unique canonical, reciprocal alternates and index robots; only heads change', async () => fixture(async root => {
  const before = await tree(path.join(root, 'public')); await buildRelease(root);
  for (const [file, lang, canonical] of [['index.html', 'zh-Hant', 'https://moving-boxes.glossquote.com/index.html'], ['en/index.html', 'en', 'https://moving-boxes.glossquote.com/en/index.html']]) {
    const original = await readFile(path.join(root, 'public', file), 'utf8'); const html = await readFile(site(root, file), 'utf8');
    assert.ok(html.includes('<html lang="' + lang + '">')); assert.ok(html.includes('content="index,follow"'));
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map(match => Object.fromEntries([...match[0].matchAll(/([a-z-]+)="([^"]*)"/g)].map(entry => [entry[1], entry[2]])));
    assert.deepEqual(links.filter(link => link.rel === 'canonical').map(link => link.href), [canonical]);
    assert.deepEqual(links.filter(link => link.rel === 'alternate').map(link => [link.hreflang, link.href]), [['zh-Hant', 'https://moving-boxes.glossquote.com/index.html'], ['en', 'https://moving-boxes.glossquote.com/en/index.html'], ['x-default', 'https://moving-boxes.glossquote.com/index.html']]);
    assert.equal(html.replace(/<head>[\s\S]*?<\/head>/, ''), original.replace(/<head>[\s\S]*?<\/head>/, ''));
    assert.ok(original.includes('content="noindex,nofollow"')); assert.equal(original.includes('rel="canonical"'), false);
  }
  assert.deepEqual(await tree(path.join(root, 'public')), before);
}));
test('M1B runtime/404 bytes and all security headers are preserved; robots/sitemap only use the fixed domain', async () => fixture(async root => {
  await buildRelease(root);
  for (const name of PUBLIC_FILES.filter(name => !['index.html', 'en/index.html', '_headers', 'robots.txt'].includes(name))) assert.deepEqual(await readFile(site(root, name)), await readFile(path.join(root, 'public', name)));
  const source = await readFile(path.join(root, 'public/_headers'), 'utf8');
  assert.equal(await readFile(site(root, '_headers'), 'utf8'), source.replace('X-Robots-Tag: noindex, nofollow', 'X-Robots-Tag: index, follow'));
  assert.equal(await readFile(site(root, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://moving-boxes.glossquote.com/sitemap.xml\n');
  const sitemap = await readFile(site(root, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://moving-boxes.glossquote.com/index.html', 'https://moving-boxes.glossquote.com/en/index.html']);
  assert.equal(sitemap.includes('lastmod'), false);
}));
test('M1B rebuilding identical input is an exact no-op with no timestamps or absolute paths', async () => fixture(async root => {
  await buildRelease(root); const before = await tree(root); const result = await buildRelease(root);
  assert.equal(result.created, false); assert.deepEqual(await tree(root), before);
  const text = await readFile(manifestFile(root), 'utf8'); assert.equal(text.includes(root), false); assert.equal(/timestamp|createdAt|lastmod/.test(text), false);
}));
test('M1B tampered runtime rejects check/build and is never overwritten', async () => fixture(async root => {
  await buildRelease(root); await writeFile(site(root, 'js/app.mjs'), 'tampered'); await refusesWithoutMutation(root, /RELEASE_OUTPUT_MISMATCH/);
}));
test('M1B extra file rejects check/build and is preserved', async () => fixture(async root => {
  await buildRelease(root); await writeFile(site(root, 'unknown.txt'), 'preserve me'); await refusesWithoutMutation(root, /UNKNOWN_RELEASE_OUTPUT/);
}));
test('M1B extra empty directory and sibling file reject before mutation', async () => fixture(async root => {
  await buildRelease(root); await mkdir(site(root, 'unknown-directory')); await refusesWithoutMutation(root, /UNKNOWN_RELEASE_OUTPUT/);
  await writeFile(path.join(root, 'release-artifacts/unmanaged.txt'), 'preserve'); await refusesWithoutMutation(root, /UNKNOWN_RELEASE_OUTPUT/);
}));
test('M1B missing output rejects without recreating it or touching original files', async () => fixture(async root => {
  await buildRelease(root); await unlink(site(root, 'styles/app.css')); await refusesWithoutMutation(root, /RELEASE_OUTPUT_MISMATCH/);
}));
test('M1B asset and manifest changed together still reject against reconstructed bytes', async () => fixture(async root => {
  await buildRelease(root); await writeFile(site(root, 'js/app.mjs'), 'tampered together'); await updateManifestAsset(root, 'js/app.mjs');
  await refusesWithoutMutation(root, /RELEASE_MANIFEST_MISMATCH/);
}));
test('M1B wrong SEO and its manifest hash changed together still reject', async () => fixture(async root => {
  await buildRelease(root); const file = site(root, 'en/index.html'); await writeFile(file, (await readFile(file, 'utf8')).replaceAll('https://moving-boxes.glossquote.com/', 'https://wrong.invalid/')); await updateManifestAsset(root, 'en/index.html');
  await refusesWithoutMutation(root, /RELEASE_MANIFEST_MISMATCH/);
}));
test('M1B changed public source is rejected even with an updated source manifest entry', async () => fixture(async root => {
  await buildRelease(root); const file = path.join(root, 'public/js/app.mjs'); const bytes = Buffer.from((await readFile(file, 'utf8')) + '\n// changed source\n'); await writeFile(file, bytes);
  await saveManifest(root, manifest => { const record = manifest.sourceFiles.find(file => file.path === 'js/app.mjs'); record.bytes = bytes.length; record.sha256 = hash(bytes); });
  await refusesWithoutMutation(root, /SOURCE_CHANGED_FROM_M1/);
}));
test('M1B wrong origin/schema/mode/tool/unknown manifest fields reject, never trusted', async () => fixture(async root => {
  await buildRelease(root); const original = await readFile(manifestFile(root));
  for (const mutate of [m => { m.origin = 'https://wrong.invalid'; }, m => { m.schemaVersion = 2; }, m => { m.mode = 'deployed'; }, m => { m.toolSlug = 'wrong'; }, m => { m.extra = true; }, m => { m.files[0].path = '../outside'; }]) {
    await writeFile(manifestFile(root), original); await saveManifest(root, mutate); await refusesWithoutMutation(root, /RELEASE_MANIFEST_MISMATCH/);
  }
}));
test('M1B missing manifest and unmanaged known output are preserved instead of overwritten', async () => fixture(async root => {
  await mkdir(path.join(root, 'release-artifacts/site'), { recursive: true }); await writeFile(site(root, 'index.html'), 'unmanaged original'); await refusesWithoutMutation(root, /MISSING_RELEASE_MANIFEST/);
}));
test('M1B linked output root is refused', async () => fixture(async root => {
  await mkdir(path.join(root, 'outside')); await symlink(path.join(root, 'outside'), path.join(root, 'release-artifacts'), 'junction'); await refusesWithoutMutation(root, /UNSAFE_RELEASE_LINK/);
}));
test('M1B nested output junction is refused and preserved', async () => fixture(async root => {
  await buildRelease(root);
  const from = path.resolve(site(root, 'js/core')), to = path.resolve(root, 'preserved-output-core');
  for (const target of [from, to]) if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('UNSAFE_FIXTURE_MOVE');
  await rename(from, to); await symlink(to, from, 'junction'); await refusesWithoutMutation(root, /UNSAFE_RELEASE_LINK/);
}));
test('M1B nested source junction is refused before any output creation', async () => fixture(async root => {
  const from = path.resolve(root, 'public/js/core'), to = path.resolve(root, 'preserved-source-core');
  for (const target of [from, to]) if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('UNSAFE_FIXTURE_MOVE');
  await rename(from, to); await symlink(to, from, 'junction'); const before = await tree(root);
  await assert.rejects(buildRelease(root), /UNSAFE_LINK/); assert.deepEqual(await tree(root), before);
}));
test('M1B hard-linked output file is refused without touching its other path', async () => fixture(async root => {
  await buildRelease(root); await unlink(site(root, 'styles/app.css')); await writeFile(path.join(root, 'outside.txt'), 'preserve original'); await link(path.join(root, 'outside.txt'), site(root, 'styles/app.css')); await refusesWithoutMutation(root, /UNSAFE_RELEASE_LINK/);
}));
test('M1B unknown public inputs are rejected without any release mutations', async () => fixture(async root => {
  await writeFile(path.join(root, 'public/unapproved.txt'), 'fake'); const before = await tree(root); await assert.rejects(buildRelease(root), /UNKNOWN_FILE/); assert.deepEqual(await tree(root), before);
}));
test('M1B real CLI rejects missing/unknown/multiple options before writing any output', async () => fixture(async root => {
  const before = await tree(root);
  for (const args of [[], ['unknown'], ['build', '--origin=https://wrong.invalid'], ['check', 'extra'], ['build', 'check']]) {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/release.mjs'), ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1); assert.equal(result.stderr.trim(), 'USAGE_RELEASE_BUILD_OR_CHECK_ONLY');
  }
  assert.deepEqual(await tree(root), before);
}));

test('M2A deploy config is the fixed assets-only domain/date with every telemetry option false', async () => fixture(async root => {
  const config = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  assert.deepEqual(config, {
    name: 'glossquote-moving-boxes', compatibility_date: '2026-10-24',
    workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'moving-boxes.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    build: { command: 'node scripts/release.mjs build' }
  });
  await buildRelease(root); await checkRelease(root);
}));
test('M2A every deploy authority/telemetry/asset override rejects before first output and preserves inputs', async () => fixture(async root => {
  const original = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
  const variants = [
    value => { value.name = 'unreviewed'; }, value => { value.compatibility_date = '2026-10-25'; },
    ...['workers_dev', 'preview_urls', 'send_metrics'].map(key => value => { value[key] = true; }),
    value => { value.routes[0].pattern = 'wrong.invalid'; }, value => { value.routes[0].custom_domain = false; },
    value => { value.routes.push({ pattern: 'second.invalid', custom_domain: true }); },
    value => { value.observability.enabled = true; }, value => { value.observability.logs.enabled = true; },
    value => { value.observability.logs.invocation_logs = true; }, value => { value.observability.traces.enabled = true; },
    value => { delete value.observability.logs.invocation_logs; },
    value => { value.assets.directory = './public'; }, value => { value.assets.run_worker_first = true; },
    value => { value.assets.html_handling = 'auto-trailing-slash'; }, value => { value.assets.not_found_handling = 'single-page-application'; },
    value => { value.build.command = 'npm install'; }, value => { value.main = 'worker.mjs'; },
    value => { value.vars = { FAKE: 'test-only' }; }, value => { value.kv_namespaces = []; },
    value => { value.bindings = []; }, value => { value.assets.binding = 'ASSETS'; }, value => { value.unknown = true; }
  ];
  for (const mutate of variants) {
    const config = JSON.parse(original); mutate(config);
    await writeFile(path.join(root, 'wrangler.jsonc'), JSON.stringify(config, null, 2) + '\n');
    await refusesWithoutMutation(root, /DEPLOY_CONFIG_MISMATCH/);
  }
}));
test('M2A missing and noncanonical deploy config are refused without creating output', async () => fixture(async root => {
  const file = path.join(root, 'wrangler.jsonc'), original = await readFile(file);
  await unlink(file); await refusesWithoutMutation(root, /MISSING_DEPLOY_CONFIG/);
  for (const bytes of [Buffer.from('{}\n'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), original]), Buffer.from('// unreviewed\n' + original), Buffer.from(original.toString().replaceAll('\n', '\r\n'))]) {
    await writeFile(file, bytes); await refusesWithoutMutation(root, /DEPLOY_CONFIG_MISMATCH/);
  }
}));
test('M2A hard-linked deploy config is refused without changing either file', async () => fixture(async root => {
  const file = path.join(root, 'wrangler.jsonc'), original = path.join(root, 'original-config.json');
  await rename(file, original); await link(original, file);
  await refusesWithoutMutation(root, /UNSAFE_DEPLOY_CONFIG/);
}));
test('M2A a deploy config directory/junction is refused before output mutation', async () => fixture(async root => {
  const file = path.join(root, 'wrangler.jsonc'); await unlink(file);
  await mkdir(path.join(root, 'outside-config')); await symlink(path.join(root, 'outside-config'), file, 'junction');
  await refusesWithoutMutation(root, /UNSAFE_DEPLOY_CONFIG/);
}));
test('M2A deploy config and its manifest hash changed together cannot authorize new settings', async () => fixture(async root => {
  await buildRelease(root);
  const file = path.join(root, 'wrangler.jsonc');
  const bytes = Buffer.from((await readFile(file, 'utf8')).replace('"send_metrics": false', '"send_metrics": true'));
  await writeFile(file, bytes);
  await saveManifest(root, manifest => { manifest.configFiles[0].bytes = bytes.length; manifest.configFiles[0].sha256 = hash(bytes); });
  await refusesWithoutMutation(root, /DEPLOY_CONFIG_MISMATCH/);
}));
test('M2A config manifest metadata is required, closed and independently reconstructed', async () => fixture(async root => {
  await buildRelease(root); const original = await readFile(manifestFile(root));
  for (const mutate of [value => { delete value.configFiles; }, value => { value.configFiles = []; }, value => { value.configFiles[0].path = '../wrangler.jsonc'; }, value => { value.configFiles[0].sha256 = '0'.repeat(64); }, value => { value.configFiles[0].extra = true; }]) {
    await writeFile(manifestFile(root), original); await saveManifest(root, mutate);
    await refusesWithoutMutation(root, /RELEASE_MANIFEST_MISMATCH/);
  }
}));
test('M2A redirects are exactly three internal 301 rules, 65 bytes with trailing LF, release-only', async () => fixture(async root => {
  await buildRelease(root); const bytes = await readFile(site(root, '_redirects'));
  assert.equal(bytes.toString(), '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
  assert.equal(bytes.length, 65); assert.equal(hash(bytes), '9e47a2579b08f461b1124de1e42a1bde7a79ca29d77401104f6f432d8be90e1e');
  assert.equal(PUBLIC_FILES.includes('_redirects'), false);
  await assert.rejects(readFile(path.join(root, 'public/_redirects')), { code: 'ENOENT' });
}));
test('M2A a missing redirects file is refused and never recreated in existing output', async () => fixture(async root => {
  await buildRelease(root); await unlink(site(root, '_redirects'));
  await refusesWithoutMutation(root, /RELEASE_OUTPUT_MISMATCH/);
}));
test('M2A redirect status/target/wildcard tampering plus matching manifest still fails closed', async () => fixture(async root => {
  await buildRelease(root); const originalManifest = await readFile(manifestFile(root));
  const variants = [
    '/ /index.html 302\n/en /en/index.html 301\n/en/ /en/index.html 301\n',
    '/ https://wrong.invalid/ 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n',
    '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n/* /index.html 200\n',
    '/ /index.html 301\r\n/en /en/index.html 301\r\n/en/ /en/index.html 301\r\n'
  ];
  for (const text of variants) {
    await writeFile(manifestFile(root), originalManifest); await writeFile(site(root, '_redirects'), text);
    await updateManifestAsset(root, '_redirects'); await refusesWithoutMutation(root, /RELEASE_MANIFEST_MISMATCH/);
  }
}));
