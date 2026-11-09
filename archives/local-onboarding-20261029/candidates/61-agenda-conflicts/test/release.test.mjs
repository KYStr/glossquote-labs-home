import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, readdir, lstat, rm, rmdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT, PUBLIC_FILES, inside } from '../scripts/files.mjs';
import { buildRelease, checkRelease, RELEASE_ORIGIN, TOOL_SLUG, RELEASE_FILES, removeCandidateFooter } from '../scripts/release.mjs';
import { checkDeploymentConfig } from '../scripts/deployment.mjs';
import { SECURITY_HEADERS } from '../scripts/serve.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = ['https://agenda-check.glossquote.com/index.html', 'https://agenda-check.glossquote.com/en/index.html'];
const manifestPath = root => path.join(root, 'release-artifacts/manifest.json');
const sitePath = (root, file) => inside(path.join(root, 'release-artifacts/site'), file);
const readManifest = async root => JSON.parse(await readFile(manifestPath(root), 'utf8'));
const saveManifest = (root, manifest) => writeFile(manifestPath(root), `${JSON.stringify(manifest, null, 2)}\n`);

async function fixture(t) {
  const parent = path.join(PROJECT_ROOT, 'evidence/m2a');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'release-test-workspace-'));
  t.after(async () => {
    const absolute = path.resolve(root);
    assert.ok(absolute.startsWith(`${path.resolve(parent)}${path.sep}release-test-workspace-`));
    assert.equal((await lstat(absolute)).isSymbolicLink(), false);
    await rm(absolute, { recursive: true, force: true });
  });
  await mkdir(path.join(root, 'scripts'));
  for (const file of ['files.mjs', 'check.mjs', 'serve.mjs', 'deployment.mjs', 'release.mjs']) await copyFile(path.join(PROJECT_ROOT, 'scripts', file), path.join(root, 'scripts', file));
  await copyFile(path.join(PROJECT_ROOT, 'package.json'), path.join(root, 'package.json'));
  await copyFile(path.join(PROJECT_ROOT, 'wrangler.jsonc'), path.join(root, 'wrangler.jsonc'));
  for (const directory of ['public', 'dist']) for (const file of PUBLIC_FILES) {
    const target = inside(path.join(root, directory), file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(inside(path.join(PROJECT_ROOT, directory), file), target);
  }
  return root;
}

async function treeBytes(root) {
  const files = [];
  async function visit(directory, prefix = '') {
    for (const entry of await readdir(directory)) {
      const absolute = path.join(directory, entry), relative = prefix ? `${prefix}/${entry}` : entry;
      const stat = await lstat(absolute);
      if (stat.isSymbolicLink()) files.push({ path: relative, link: true });
      else if (stat.isDirectory()) await visit(absolute, relative);
      else { const bytes = await readFile(absolute); files.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) }); }
    }
  }
  await visit(root);
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

async function tamper(root, file, text, updateManifest = true) {
  const bytes = Buffer.from(text);
  await writeFile(sitePath(root, file), bytes);
  if (updateManifest) {
    const manifest = await readManifest(root);
    Object.assign(manifest.files.find(entry => entry.path === file), { bytes: bytes.length, sha256: hash(bytes) });
    await saveManifest(root, manifest);
  }
}
async function rejectsWithoutMutation(root, code) {
  const directory = path.join(root, 'release-artifacts');
  const before = await treeBytes(directory);
  await assert.rejects(checkRelease(root), code ? { code } : undefined);
  await assert.rejects(buildRelease(root), code ? { code } : undefined);
  assert.deepEqual(await treeBytes(directory), before);
}

test('release package commands are exact and retain the four M1 commands', async () => {
  const pkg = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.scripts, { test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', dev: 'node scripts/serve.mjs',
    'build:release': 'node scripts/release.mjs build', 'check:release': 'node scripts/release.mjs check' });
  assert.equal(pkg.private, true); assert.equal(pkg.type, 'module'); assert.equal(pkg.engines.node, '>=24');
  assert.equal(pkg.dependencies, undefined); assert.equal(pkg.devDependencies, undefined);
  assert.equal(RELEASE_ORIGIN, 'https://agenda-check.glossquote.com'); assert.equal(TOOL_SLUG, 'agenda-conflicts');
});

test('both complete release HTML pages have unique reciprocal SEO at the fixed planned origin', async t => {
  const root = await fixture(t); await buildRelease(root);
  for (const [index, file] of ['index.html', 'en/index.html'].entries()) {
    const html = await readFile(sitePath(root, file), 'utf8');
    const original = await readFile(inside(path.join(root, 'public'), file), 'utf8');
    assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(match => match[1]), [canonical[index]]);
    assert.deepEqual([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(match => [match[1], match[2]]), [
      ['zh-Hant', canonical[0]], ['en', canonical[1]], ['x-default', canonical[0]]
    ]);
    assert.equal((html.match(/<meta name="robots" content="index,follow">/g) ?? []).length, 1);
    assert.equal(html.includes('noindex'), false);
    assert.equal(/<html lang="([^"]+)">/.exec(html)[1], index === 0 ? 'zh-Hant' : 'en');
    for (const name of ['title', 'h1']) {
      const pattern = new RegExp(`<${name}>([^<]+)<\\/${name}>`);
      assert.equal(pattern.exec(html)[1], pattern.exec(original)[1]);
    }
    assert.equal(/<meta name="description" content="([^"]+)">/.exec(html)[1], /<meta name="description" content="([^"]+)">/.exec(original)[1]);
    const marker = index === 0 ? '<span>Gloss Tools by GlossQuote · 本地候選預覽</span>' : '<span>Gloss Tools by GlossQuote · Local candidate preview</span>';
    assert.equal(html.slice(html.indexOf('</head>')), original.slice(original.indexOf('</head>')).replace(marker, '<span>Gloss Tools by GlossQuote</span>'));
    assert.equal(html.includes(index === 0 ? '本地候選預覽' : 'Local candidate preview'), false);
    assert.equal(html.includes('application/ld+json'), false);
  }
});

test('release touches only HTML SEO plus exact candidate footer and leaves every runtime/preview byte unchanged', async t => {
  const root = await fixture(t);
  const beforePublic = await treeBytes(path.join(root, 'public')), beforePreview = await treeBytes(path.join(root, 'dist'));
  await buildRelease(root); await checkRelease(root);
  assert.deepEqual(await treeBytes(path.join(root, 'public')), beforePublic);
  assert.deepEqual(await treeBytes(path.join(root, 'dist')), beforePreview);
  for (const file of PUBLIC_FILES) {
    const original = await readFile(inside(path.join(root, 'public'), file));
    if (!file.endsWith('.html')) assert.deepEqual(await readFile(sitePath(root, file)), original);
    else {
      const projected = (await readFile(sitePath(root, file), 'utf8'))
        .replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">')
        .replace(/^  <link rel="(?:canonical|alternate)"[^\n]*>\n/gm, '')
        .replace('<span>Gloss Tools by GlossQuote</span>', file === 'index.html' ? '<span>Gloss Tools by GlossQuote · 本地候選預覽</span>' : '<span>Gloss Tools by GlossQuote · Local candidate preview</span>');
      assert.equal(projected, original.toString('utf8'));
      assert.equal(original.toString('utf8').includes('canonical'), false);
    }
  }
});

test('robots/sitemap have exactly two canonical URLs and preserve all serve security constants', async t => {
  const root = await fixture(t); await buildRelease(root);
  assert.equal(await readFile(sitePath(root, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://agenda-check.glossquote.com/sitemap.xml\n');
  const sitemap = await readFile(sitePath(root, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), canonical);
  assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  assert.equal(/lastmod|changefreq|priority/.test(sitemap), false);
  const headerText = await readFile(sitePath(root, '_headers'), 'utf8');
  const headers = Object.fromEntries(headerText.trimEnd().split('\n').slice(1).map(line => {
    const match = /^  ([^:]+): (.+)$/.exec(line); return [match[1], match[2]];
  }));
  assert.deepEqual(headers, { ...SECURITY_HEADERS, 'X-Robots-Tag': 'index, follow' });
  assert.ok(headers['Content-Security-Policy'].includes("connect-src 'none'"));
  assert.ok(headers['Content-Security-Policy'].includes("worker-src 'self'"));
});

test('manifest is exact schema1, sorted, complete, independently byte/hash checked and outside site', async t => {
  const root = await fixture(t); const built = await buildRelease(root); const checked = await checkRelease(root);
  assert.equal(built.files, 12); assert.equal(checked.files, 12); assert.equal(checked.sourceFiles, 8);
  const manifest = await readManifest(root);
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'configFiles']);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.mode, 'release-candidate');
  assert.equal(manifest.origin, 'https://agenda-check.glossquote.com'); assert.equal(manifest.toolSlug, 'agenda-conflicts');
  assert.deepEqual(manifest.files.map(entry => entry.path), [...RELEASE_FILES].sort());
  assert.deepEqual(manifest.sourceFiles.map(entry => entry.path), [...PUBLIC_FILES].sort());
  assert.deepEqual(manifest.configFiles.map(entry => entry.path), ['wrangler.jsonc']);
  for (const [entries, directory] of [[manifest.files, path.join(root, 'release-artifacts/site')], [manifest.sourceFiles, path.join(root, 'public')], [manifest.configFiles, root]]) {
    assert.equal(new Set(entries.map(entry => entry.path)).size, entries.length);
    for (const entry of entries) {
      assert.deepEqual(Object.keys(entry), ['path', 'bytes', 'sha256']);
      assert.equal(entry.path.includes('..'), false); assert.equal(path.isAbsolute(entry.path), false);
      const bytes = await readFile(inside(directory, entry.path));
      assert.equal(entry.bytes, bytes.length); assert.equal(entry.sha256, hash(bytes));
    }
  }
  await assert.rejects(lstat(sitePath(root, 'manifest.json')), { code: 'ENOENT' });
  const text = await readFile(manifestPath(root), 'utf8');
  assert.equal(text.includes(PROJECT_ROOT), false); assert.equal(/lastmod|createdAt|generatedAt/.test(text), false);
});

test('legal rebuild is byte deterministic and does not rewrite managed files', async t => {
  const root = await fixture(t); await buildRelease(root);
  const directory = path.join(root, 'release-artifacts');
  const before = await treeBytes(directory);
  const stats = await Promise.all(before.map(entry => lstat(inside(directory, entry.path), { bigint: true })));
  assert.equal((await buildRelease(root)).reused, true);
  assert.deepEqual(await treeBytes(directory), before);
  for (const [index, entry] of before.entries()) assert.equal((await lstat(inside(directory, entry.path), { bigint: true })).mtimeNs, stats[index].mtimeNs);
  const secondRoot = await fixture(t); await buildRelease(secondRoot);
  assert.deepEqual(await treeBytes(path.join(secondRoot, 'release-artifacts')), before);
});

test('tampered runtime with the old manifest fails without overwriting anything', async t => {
  const root = await fixture(t); await buildRelease(root);
  await tamper(root, 'js/app.js', '/* SYNTHETIC TAMPER */\n', false);
  await rejectsWithoutMutation(root, 'RELEASE_MANIFEST_FILES');
});
test('tampered runtime plus matching altered manifest still fails against pinned source bytes', async t => {
  const root = await fixture(t); await buildRelease(root);
  await tamper(root, 'js/app.js', '/* SYNTHETIC TAMPER */\n');
  await rejectsWithoutMutation(root, 'RELEASE_SITE_BYTES');
});

for (const [label, transform] of [
  ['wrong canonical origin', text => text.replace('rel="canonical" href="https://agenda-check.glossquote.com/index.html"', 'rel="canonical" href="https://wrong.invalid/index.html"')],
  ['wrong alternate target', text => text.replace('hreflang="en" href="https://agenda-check.glossquote.com/en/index.html"', 'hreflang="en" href="https://agenda-check.glossquote.com/index.html"')],
  ['duplicate canonical', text => text.replace('</head>', '<link rel="canonical" href="https://agenda-check.glossquote.com/index.html"></head>')],
  ['wrong robots', text => text.replace('content="index,follow"', 'content="noindex,nofollow"')],
  ['changed visible body', text => text.replace('<span>Gloss Tools by GlossQuote</span>', '<span>SYNTHETIC_UNVERIFIED_PUBLISHED_CLAIM</span>')]
]) test(`matching manifest cannot authorize ${label}`, async t => {
  const root = await fixture(t); await buildRelease(root);
  await tamper(root, 'index.html', transform(await readFile(sitePath(root, 'index.html'), 'utf8')));
  await rejectsWithoutMutation(root);
});

test('matching manifest cannot authorize relaxed CSP or missing security headers', async t => {
  const root = await fixture(t); await buildRelease(root);
  const original = await readFile(sitePath(root, '_headers'), 'utf8');
  for (const changed of [original.replace("connect-src 'none'", 'connect-src *'), original.replace('  Referrer-Policy: no-referrer\n', '')]) {
    await tamper(root, '_headers', changed); await rejectsWithoutMutation(root, 'RELEASE_HEADERS');
  }
});
test('matching manifest cannot authorize extra sitemap URLs or a changed robots policy', async t => {
  const root = await fixture(t); await buildRelease(root);
  const sitemap = await readFile(sitePath(root, 'sitemap.xml'), 'utf8');
  await tamper(root, 'sitemap.xml', sitemap.replace('</urlset>', '<url><loc>https://wrong.invalid/</loc></url></urlset>'));
  await rejectsWithoutMutation(root, 'RELEASE_SITE_BYTES');
  await tamper(root, 'sitemap.xml', sitemap);
  await tamper(root, 'robots.txt', 'User-agent: *\nDisallow: /\n');
  await rejectsWithoutMutation(root, 'RELEASE_SITE_BYTES');
});

test('malformed, wrong-origin, duplicate, traversal and source manifests cannot authorize outputs', async t => {
  const root = await fixture(t); await buildRelease(root);
  const original = await readManifest(root);
  const changed = update => { const copy = structuredClone(original); update(copy); return copy; };
  for (const manifest of [
    changed(m => { m.schemaVersion = 2; }), changed(m => { m.mode = 'production'; }),
    changed(m => { m.origin = 'https://wrong.invalid'; }), changed(m => { m.toolSlug = 'another-tool'; }),
    changed(m => { m.files.push(m.files[0]); }), changed(m => { m.files[0].path = '../SYNTHETIC_PRIVATE'; }),
    changed(m => { m.sourceFiles[0].sha256 = '0'.repeat(64); }), changed(m => { m.extra = true; }),
    changed(m => { m.files.reverse(); })
  ]) { await saveManifest(root, manifest); await rejectsWithoutMutation(root); }
  await writeFile(manifestPath(root), '{not JSON'); await rejectsWithoutMutation(root, 'RELEASE_MANIFEST');
});
test('even reformatting an existing manifest is preserved and rejected, never silently overwritten', async t => {
  const root = await fixture(t); await buildRelease(root);
  await writeFile(manifestPath(root), JSON.stringify(await readManifest(root)));
  await rejectsWithoutMutation(root, 'RELEASE_MANIFEST_BYTES');
});
test('missing output fails without repair or mutation of remaining files', async t => {
  const root = await fixture(t); await buildRelease(root);
  await rm(sitePath(root, 'js/core/output.mjs'));
  await rejectsWithoutMutation(root, 'RELEASE_OUTPUT_INCOMPLETE');
});
test('extra output file or directory and unmanaged roots are preserved and rejected', async t => {
  for (const kind of ['file', 'directory', 'unmanaged']) {
    const root = await fixture(t);
    if (kind === 'unmanaged') { await mkdir(path.join(root, 'release-artifacts')); await writeFile(path.join(root, 'release-artifacts/notes.txt'), 'SYNTHETIC_KEEP'); }
    else {
      await buildRelease(root);
      if (kind === 'file') await writeFile(sitePath(root, 'extra.txt'), 'SYNTHETIC_KEEP');
      else await mkdir(path.join(root, 'release-artifacts/site/unknown'));
    }
    await rejectsWithoutMutation(root, 'RELEASE_OUTPUT_EXTRA');
    if (kind === 'directory') assert.equal((await lstat(path.join(root, 'release-artifacts/site/unknown'))).isDirectory(), true);
  }
});
test('empty unmanaged output root is rejected without adding managed files', async t => {
  const root = await fixture(t); await mkdir(path.join(root, 'release-artifacts'));
  await rejectsWithoutMutation(root, 'RELEASE_OUTPUT_INCOMPLETE');
});

test('any source byte change is rejected even when source/asset/manifest hashes are changed together', async t => {
  const root = await fixture(t); await buildRelease(root);
  const altered = '/* SYNTHETIC SOURCE CHANGE */\n';
  await writeFile(inside(path.join(root, 'public'), 'js/app.js'), altered);
  await tamper(root, 'js/app.js', altered);
  const manifest = await readManifest(root);
  Object.assign(manifest.sourceFiles.find(entry => entry.path === 'js/app.js'), { bytes: Buffer.byteLength(altered), sha256: hash(Buffer.from(altered)) });
  await saveManifest(root, manifest);
  await rejectsWithoutMutation(root, 'RELEASE_SOURCE_CHANGED');
});
test('unknown/missing sources and changed serve-header source block before creating output', async t => {
  for (const kind of ['extra', 'missing', 'header']) {
    const root = await fixture(t);
    if (kind === 'extra') await writeFile(path.join(root, 'public/unknown.json'), '{}');
    else if (kind === 'missing') await rm(path.join(root, 'public/js/app.js'));
    else await writeFile(path.join(root, 'scripts/serve.mjs'), '/* SYNTHETIC HEADER CHANGE */');
    await assert.rejects(buildRelease(root), { code: kind === 'extra' ? 'UNKNOWN_FILE' : kind === 'missing' ? 'ASSET_MISSING' : 'RELEASE_HEADER_SOURCE' });
    await assert.rejects(lstat(path.join(root, 'release-artifacts')), { code: 'ENOENT' });
  }
});
test('source and output junctions are rejected without following or changing their targets', async t => {
  for (const location of ['public', 'release-artifacts']) {
    const root = await fixture(t);
    const target = path.join(root, 'synthetic-link-target'); await mkdir(target);
    await writeFile(path.join(target, 'canary.txt'), 'SYNTHETIC_KEEP');
    if (location === 'public') {
      await rm(path.join(root, 'public/styles/app.css')); await rmdir(path.join(root, 'public/styles'));
      await symlink(target, path.join(root, 'public/styles'), process.platform === 'win32' ? 'junction' : 'dir');
    } else await symlink(target, path.join(root, 'release-artifacts'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(buildRelease(root), { code: location === 'public' ? 'TREE_LINK_OR_TYPE' : 'RELEASE_OUTPUT_LINK' });
    assert.equal(await readFile(path.join(target, 'canary.txt'), 'utf8'), 'SYNTHETIC_KEEP');
  }
});

test('release CLI rejects no mode, unknown mode, flags and additional arguments without creating artifacts', async t => {
  const root = await fixture(t);
  for (const args of [[], ['deploy'], ['Build'], ['check', 'extra'], ['build', '--origin=https://wrong.invalid'], ['build', 'check'], ['--help']]) {
    const child = spawnSync(process.execPath, [path.join(root, 'scripts/release.mjs'), ...args], { cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 10000 });
    assert.equal(child.status, 1); assert.equal(child.error, undefined);
    assert.equal(child.stderr, 'FAIL release: RELEASE_USAGE\n');
    assert.equal(child.stdout, '');
    await assert.rejects(lstat(path.join(root, 'release-artifacts')), { code: 'ENOENT' });
  }
});
test('release CLI build/check work inside an isolated copy without a listener or browser', async t => {
  const root = await fixture(t);
  for (const mode of ['build', 'check']) {
    const child = spawnSync(process.execPath, [path.join(root, 'scripts/release.mjs'), mode], { cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 10000 });
    assert.equal(child.status, 0, child.stderr); assert.equal(child.error, undefined);
    assert.ok(child.stdout.includes(`PASS release ${mode}: 12 files`));
    assert.ok(child.stdout.includes('planned origin https://agenda-check.glossquote.com; not deployed.'));
  }
});

test('M2A Wrangler config is exactly assets-only, fixed custom domain, all telemetry disabled', async t => {
  const root = await fixture(t);
  const bytes = await readFile(path.join(root, 'wrangler.jsonc'));
  assert.deepEqual(JSON.parse(bytes.toString('utf8')), {
    name: 'glossquote-agenda-conflicts', compatibility_date: '2026-10-24', workers_dev: false, preview_urls: false, send_metrics: false,
    build: { command: 'node scripts/release.mjs build' }, routes: [{ pattern: 'agenda-check.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }
  });
  assert.deepEqual(await checkDeploymentConfig(root), { path: 'wrangler.jsonc', bytes: bytes.length, sha256: hash(bytes) });
  await buildRelease(root);
  assert.deepEqual((await readManifest(root)).configFiles, [{ path: 'wrangler.jsonc', bytes: bytes.length, sha256: hash(bytes) }]);
  await assert.rejects(lstat(sitePath(root, 'wrangler.jsonc')), { code: 'ENOENT' });
});

test('M2A altered config cannot expand execution, domain, assets, vars, bindings or telemetry', async t => {
  const root = await fixture(t); await buildRelease(root);
  const original = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  const mutations = [
    value => { value.name = 'another-tool'; }, value => { value.compatibility_date = '2025-01-01'; },
    value => { value.compatibility_date = '2026-10-27'; },
    value => { value.workers_dev = true; }, value => { value.preview_urls = true; }, value => { value.send_metrics = true; },
    value => { value.observability.enabled = true; }, value => { value.observability.logs.enabled = true; },
    value => { value.observability.logs.invocation_logs = true; }, value => { value.observability.traces.enabled = true; },
    value => { value.routes[0].pattern = 'wrong.invalid'; }, value => { value.routes[0].custom_domain = false; },
    value => { value.routes.push({ pattern: 'extra.invalid', custom_domain: true }); },
    value => { value.assets.directory = '../outside'; }, value => { value.assets.run_worker_first = true; },
    value => { value.assets.html_handling = 'auto-trailing-slash'; }, value => { value.assets.not_found_handling = 'single-page-application'; },
    value => { value.main = 'worker.js'; }, value => { value.vars = {}; }, value => { value.kv_namespaces = []; },
    value => { value.assets.binding = 'ASSETS'; }, value => { value.build.command = 'npm run build'; },
    value => { value.env = { production: { workers_dev: true } }; }
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(original); mutate(changed);
    const bytes = Buffer.from(`${JSON.stringify(changed, null, 2)}\n`);
    await writeFile(path.join(root, 'wrangler.jsonc'), bytes);
    const manifest = await readManifest(root);
    manifest.configFiles = [{ path: 'wrangler.jsonc', bytes: bytes.length, sha256: hash(bytes) }]; await saveManifest(root, manifest);
    await rejectsWithoutMutation(root, 'DEPLOY_CONFIG_POLICY');
    assert.deepEqual(await readFile(path.join(root, 'wrangler.jsonc')), bytes);
  }
});

test('M2A config rejects missing, duplicate-key, comments, formatting and symlink inputs', async t => {
  const root = await fixture(t); await buildRelease(root);
  const original = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
  for (const text of [original.replace(/\n/g, '\r\n'), original.trimEnd(), JSON.stringify(JSON.parse(original)),
    original.replace('  "workers_dev": false,', '  "workers_dev": true,\n  "workers_dev": false,')]) {
    await writeFile(path.join(root, 'wrangler.jsonc'), text); await rejectsWithoutMutation(root, 'DEPLOY_CONFIG_BYTES');
  }
  await writeFile(path.join(root, 'wrangler.jsonc'), `// unexpected JSONC comment\n${original}`);
  await rejectsWithoutMutation(root, 'DEPLOY_CONFIG_JSON');
  await rm(path.join(root, 'wrangler.jsonc')); await rejectsWithoutMutation(root, 'DEPLOY_CONFIG_MISSING');
  const target = path.join(root, 'config-junction-target'); await mkdir(target); await writeFile(path.join(target, 'keep.txt'), 'SYNTHETIC_KEEP');
  await symlink(target, path.join(root, 'wrangler.jsonc'), process.platform === 'win32' ? 'junction' : 'dir');
  await rejectsWithoutMutation(root, 'DEPLOY_CONFIG_TYPE');
  assert.equal(await readFile(path.join(target, 'keep.txt'), 'utf8'), 'SYNTHETIC_KEEP');
});

test('M2A entry redirects are exactly three LF-terminated 301 rules', async t => {
  const root = await fixture(t); await buildRelease(root);
  const expected = Buffer.from('/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
  assert.deepEqual(await readFile(sitePath(root, '_redirects')), expected);
  assert.equal(expected.toString('utf8').trimEnd().split('\n').length, 3);
  assert.deepEqual((await readManifest(root)).files.find(entry => entry.path === '_redirects'), { path: '_redirects', bytes: expected.length, sha256: hash(expected) });
});

test('M2A redirect tamper plus matching manifest is rejected without repair', async t => {
  const root = await fixture(t); await buildRelease(root);
  const original = await readFile(sitePath(root, '_redirects'), 'utf8');
  for (const changed of [original.replace(/\n/g, '\r\n'), original.trimEnd(), `${original}/* /index.html 200\n`,
    original.replace('/en/ /en/index.html 301', '/en/ /en/ 301'), original.replace('301', '302'),
    original.replace('/ /index.html', '/ https://wrong.invalid/')]) {
    await tamper(root, '_redirects', changed); await rejectsWithoutMutation(root, 'RELEASE_REDIRECTS');
  }
  await rm(sitePath(root, '_redirects')); await rejectsWithoutMutation(root, 'RELEASE_OUTPUT_INCOMPLETE');
});

test('M2A closed manifest rejects missing/extra/duplicate/forged config records', async t => {
  const root = await fixture(t); await buildRelease(root); const original = await readManifest(root);
  for (const mutate of [value => { delete value.configFiles; }, value => { value.configFiles = []; },
    value => { value.configFiles.push(value.configFiles[0]); }, value => { value.configFiles[0].path = '../outside'; },
    value => { value.configFiles[0].sha256 = '0'.repeat(64); }, value => { value.configFiles[0].extra = true; },
    value => { value.deployReady = true; }]) {
    const changed = structuredClone(original); mutate(changed); await saveManifest(root, changed); await rejectsWithoutMutation(root);
  }
});

test('M2A footer transform removes one exact marker only and rejects unknown/duplicate markers', async () => {
  for (const file of ['index.html', 'en/index.html']) {
    const original = await readFile(inside(path.join(PROJECT_ROOT, 'public'), file), 'utf8');
    const marker = file === 'index.html' ? '<span>Gloss Tools by GlossQuote · 本地候選預覽</span>' : '<span>Gloss Tools by GlossQuote · Local candidate preview</span>';
    assert.equal(removeCandidateFooter(original, file), original.replace(marker, '<span>Gloss Tools by GlossQuote</span>'));
    const withOtherText = original.replace('<h1>', '<h1>Local candidate preview / 本地候選預覽 ');
    assert.ok(removeCandidateFooter(withOtherText, file).includes('<h1>Local candidate preview / 本地候選預覽 '));
    assert.throws(() => removeCandidateFooter(original.replace(marker, ''), file), { code: 'RELEASE_CANDIDATE_MARKER' });
    assert.throws(() => removeCandidateFooter(original.replace(marker, marker + marker), file), { code: 'RELEASE_CANDIDATE_MARKER' });
  }
});
