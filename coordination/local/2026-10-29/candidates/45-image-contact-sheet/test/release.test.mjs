import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, copyFile, readdir, lstat, readFile, writeFile, unlink, rmdir, rename, symlink } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PUBLIC_FILES } from '../scripts/files.mjs';
import { buildRelease, checkRelease, RELEASE_ORIGIN, TOOL_SLUG, SITE_FILES, ReleaseError, assertReleaseSeo } from '../scripts/release.mjs';

const ORIGIN = 'https://contact-sheet.glossquote.com'; // independent literal oracle
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const casesRoot = path.join(ROOT, 'evidence', 'm1b', 'release-test-cases');
async function snapshot(directory) {
  const files = [];
  async function walk(relative = '') {
    let entries;
    try { entries = await readdir(path.join(directory, relative)); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries.sort()) {
      const name = relative ? relative + '/' + entry : entry, absolute = path.join(directory, name), stat = await lstat(absolute);
      if (stat.isSymbolicLink()) files.push({ path: name, kind: 'link' });
      else if (stat.isDirectory()) { files.push({ path: name, kind: 'directory' }); await walk(name); }
      else files.push({ path: name, bytes: stat.size, sha256: sha(await readFile(absolute)) });
    }
  }
  await walk(); return files;
}
async function clean(directory) {
  // Verified absolute, task-owned workspace; no recursive rm and no traversal through links.
  assert.ok(path.resolve(directory).startsWith(path.resolve(casesRoot) + path.sep));
  for (const entry of await readdir(directory)) {
    const absolute = path.join(directory, entry), stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      try { await unlink(absolute); } catch (error) {
        if (process.platform !== 'win32' || !['EPERM', 'EISDIR'].includes(error.code)) throw error;
        await rmdir(absolute); // non-recursive removal of this junction only
      }
    } else if (stat.isDirectory()) { await clean(absolute); await rmdir(absolute); }
    else await unlink(absolute);
  }
}
async function withCopy(action) {
  await mkdir(casesRoot, { recursive: true });
  const root = await mkdtemp(path.join(casesRoot, 'case-'));
  assert.ok(path.resolve(root).startsWith(path.resolve(casesRoot) + path.sep));
  try {
    const files = ['package.json', 'wrangler.jsonc', 'scripts/files.mjs', 'scripts/release.mjs', 'scripts/release-inputs.json',
      ...PUBLIC_FILES.map((p) => 'public/' + p), ...PUBLIC_FILES.map((p) => 'dist/' + p), 'dist/manifest.json'];
    for (const name of files) {
      await mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await copyFile(path.join(ROOT, name), path.join(root, name));
    }
    await action(root);
  } finally { await clean(root); await rmdir(root); }
}
function cli(root, args) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'release.mjs'), ...args], {
    cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 15_000,
  });
}
async function rejectedWithoutWrites(root, action) {
  const before = await snapshot(root);
  await assert.rejects(action, (error) => error instanceof ReleaseError);
  assert.deepEqual(await snapshot(root), before, 'A rejected operation must preserve every input and existing output byte.');
}
async function updateManifest(root, change) {
  const target = path.join(root, 'release-artifacts', 'manifest.json');
  const manifest = JSON.parse(await readFile(target, 'utf8')); change(manifest);
  await writeFile(target, JSON.stringify(manifest, null, 2) + '\n');
}
function links(html) {
  const head = /<head>([\s\S]*?)<\/head>/u.exec(html)[1];
  return [...head.matchAll(/<link\b([^>]+)>/gu)].map((match) => Object.fromEntries(
    [...match[1].matchAll(/([\w-]+)="([^"]*)"/gu)].map((m) => [m[1], m[2]])));
}

test('release fixed origin/slug and complete approved F1 pins; only session differs from M1', async () => {
  assert.equal(RELEASE_ORIGIN, ORIGIN); assert.equal(TOOL_SLUG, 'image-contact-sheet');
  assert.equal(SITE_FILES.length, 15); assert.equal(new Set(SITE_FILES).size, 15);
  const pins = JSON.parse(await readFile(path.join(ROOT, 'scripts/release-inputs.json'), 'utf8'));
  const old = JSON.parse(await readFile(path.join(ROOT, 'evidence/m1/source-inventory.json'), 'utf8'));
  const baseline = old.files.filter((f) => f.path.startsWith('public/')).map((f) => ({ ...f, path: f.path.slice(7) }));
  assert.deepEqual(pins.files.map((f) => f.path), baseline.map((f) => f.path));
  assert.deepEqual(pins.files.filter((f) => baseline.find((b) => b.path === f.path).sha256 !== f.sha256).map((f) => f.path), ['js/core/session.mjs']);
  for (const file of pins.files) {
    const actual = await readFile(path.join(ROOT, 'public', file.path));
    assert.deepEqual(file, { path: file.path, bytes: actual.length, sha256: sha(actual) });
  }
});
test('both release heads have one correct canonical and exact zh-Hant/en/x-default reciprocal links', async () => withCopy(async (root) => {
  await buildRelease({ root });
  for (const [name, route, lang] of [['index.html', '/index.html', 'zh-TW'], ['en/index.html', '/en/index.html', 'en']]) {
    const html = await readFile(path.join(root, 'release-artifacts/site', name), 'utf8');
    const tags = links(html);
    assert.deepEqual(tags.filter((t) => t.rel === 'canonical'), [{ rel: 'canonical', href: ORIGIN + route }]);
    assert.deepEqual(tags.filter((t) => t.rel === 'alternate'), [
      { rel: 'alternate', hreflang: 'zh-Hant', href: ORIGIN + '/index.html' },
      { rel: 'alternate', hreflang: 'en', href: ORIGIN + '/en/index.html' },
      { rel: 'alternate', hreflang: 'x-default', href: ORIGIN + '/index.html' },
    ]);
    assert.ok(html.includes(`<html lang="${lang}">`));
    assert.equal((html.match(/<meta name="robots" content="index,follow">/gu) ?? []).length, 1);
    const original = await readFile(path.join(root, 'public', name), 'utf8');
    const undoHeadChanges = html.replace(/  <link rel="(?:canonical|alternate)"[^>]*>\n/gu, '').replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">');
    const candidateLabel = name === 'index.html' ? '<span>照片聯絡表 · 本地候選預覽</span>' : '<span>Photo contact sheet · Local candidate preview</span>';
    const productionLabel = name === 'index.html' ? '<span>照片聯絡表</span>' : '<span>Photo contact sheet</span>';
    assert.equal(undoHeadChanges.replace(productionLabel, candidateLabel), original, 'Only SEO and the exact candidate footer label may change.');
    assert.equal(html.slice(html.indexOf('</head>')), original.slice(original.indexOf('</head>')).replace(candidateLabel, productionLabel));
  }
  await checkRelease({ root });
}));
test('release robots/sitemap/header exact oracles; manifest stays outside site', async () => withCopy(async (root) => {
  const manifest = await buildRelease({ root }); const site = path.join(root, 'release-artifacts/site');
  assert.equal(await readFile(path.join(site, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://contact-sheet.glossquote.com/sitemap.xml\n');
  const sitemap = await readFile(path.join(site, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => m[1]), [ORIGIN + '/index.html', ORIGIN + '/en/index.html']);
  assert.doesNotMatch(sitemap, /lastmod/iu);
  const headers = await readFile(path.join(site, '_headers'), 'utf8');
  assert.equal(headers, (await readFile(path.join(root, 'public/_headers'), 'utf8')).replace('X-Robots-Tag: noindex, nofollow', 'X-Robots-Tag: index, follow'));
  assert.match(headers, /connect-src 'none'; font-src 'none'/u);
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'deploymentFiles']);
  assert.equal(manifest.schemaVersion, 2); assert.equal(manifest.mode, 'production'); assert.equal(manifest.origin, ORIGIN);
  assert.equal(manifest.files.length, 15); assert.equal(manifest.sourceFiles.length, 13);
  assert.equal(manifest.files.some((f) => f.path === 'manifest.json'), false);
  assert.equal((await snapshot(site)).filter((f) => f.kind !== 'directory').length, 15);
}));
test('release leaves runtime/public/preview byte-identical and rebuilding is deterministic', async () => withCopy(async (root) => {
  const preview = await snapshot(path.join(root, 'dist')), sources = await snapshot(path.join(root, 'public'));
  await buildRelease({ root });
  const before = await snapshot(path.join(root, 'release-artifacts'));
  await buildRelease({ root }); await checkRelease({ root });
  assert.deepEqual(await snapshot(path.join(root, 'release-artifacts')), before);
  assert.deepEqual(await snapshot(path.join(root, 'public')), sources); assert.deepEqual(await snapshot(path.join(root, 'dist')), preview);
  for (const name of PUBLIC_FILES.filter((f) => !['index.html', 'en/index.html', '_headers', 'robots.txt'].includes(f))) {
    assert.deepEqual(await readFile(path.join(root, 'release-artifacts/site', name)), await readFile(path.join(root, 'public', name)));
  }
  const bytes = await readFile(path.join(root, 'release-artifacts/manifest.json'), 'utf8');
  assert.doesNotMatch(bytes, /generatedAt|timestamp|C:\\|Users[\\/]/u);
  for (const page of ['index.html', 'en/index.html']) assert.match(await readFile(path.join(root, 'dist', page), 'utf8'), /noindex,nofollow/u);
}));
test('release CLI rejects empty/wrong/extra arguments before filesystem effects; explicit build/check succeed', async () => withCopy(async (root) => {
  const before = await snapshot(root);
  for (const args of [[], ['deploy'], ['build', 'extra'], ['check', 'extra'], ['build', '--origin', 'https://evil.example'], ['--help'], ['build', 'check']]) {
    const result = cli(root, args); assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /EXPECTED_BUILD_OR_CHECK_ONLY/u); assert.deepEqual(await snapshot(root), before);
  }
  assert.equal(cli(root, ['build']).status, 0); assert.equal(cli(root, ['check']).status, 0);
  const source = await readFile(path.join(ROOT, 'scripts/release.mjs'), 'utf8');
  assert.doesNotMatch(source, /process\.env/u);
}));
test('release check with no candidate fails without creating output', async () => withCopy(async (root) => {
  await rejectedWithoutWrites(root, () => checkRelease({ root }));
}));
test('modified output is rejected by build and check without replacing it', async () => withCopy(async (root) => {
  await buildRelease({ root }); await writeFile(path.join(root, 'release-artifacts/site/js/app.js'), '// tampered synthetic output\n');
  await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
}));
test('manifest plus asset tampering cannot bless a changed runtime', async () => withCopy(async (root) => {
  await buildRelease({ root }); const bytes = Buffer.from('// jointly tampered asset\n');
  await writeFile(path.join(root, 'release-artifacts/site/js/app.js'), bytes);
  await updateManifest(root, (m) => Object.assign(m.files.find((f) => f.path === 'js/app.js'), { bytes: bytes.length, sha256: sha(bytes) }));
  await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
}));
test('bad canonical/domain/hreflang/robots and coordinated SEO manifest tampering fail', async () => {
  for (const mutate of [
    (s) => s.replace('rel="canonical" href="https://contact-sheet.glossquote.com/index.html"', 'rel="canonical" href="https://wrong.example/index.html"'),
    (s) => s.replace('hreflang="en"', 'hreflang="fr"'),
    (s) => s.replace('index,follow', 'noindex,nofollow'),
    (s) => s.replace('</head>', '<link rel="canonical" href="https://contact-sheet.glossquote.com/index.html"></head>'),
  ]) await withCopy(async (root) => {
    await buildRelease({ root }); const target = path.join(root, 'release-artifacts/site/index.html');
    const bytes = Buffer.from(mutate(await readFile(target, 'utf8'))); await writeFile(target, bytes);
    await updateManifest(root, (m) => Object.assign(m.files.find((f) => f.path === 'index.html'), { bytes: bytes.length, sha256: sha(bytes) }));
    await rejectedWithoutWrites(root, () => checkRelease({ root }));
    assert.throws(() => assertReleaseSeo(bytes.toString(), '/index.html'), (e) => e instanceof ReleaseError);
  });
});
test('extra files and unknown empty directories are rejected and preserved', async () => {
  for (const [name, directory] of [['site/unowned.txt', false], ['site/unknown-empty', true], ['other', true], ['site/manifest.json', false]]) await withCopy(async (root) => {
    await buildRelease({ root }); const target = path.join(root, 'release-artifacts', name);
    if (directory) await mkdir(target); else await writeFile(target, 'preserve synthetic unowned data');
    await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
test('missing output or manifest is rejected without repairing the candidate', async () => {
  for (const name of ['site/en/index.html', 'manifest.json']) await withCopy(async (root) => {
    await buildRelease({ root }); await unlink(path.join(root, 'release-artifacts', name));
    await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
test('manifest wrong origin/schema/source digest/path/unknown properties are rejected', async () => {
  for (const mutate of [
    (m) => { m.origin = 'https://wrong.example'; }, (m) => { m.schemaVersion = 3; },
    (m) => { m.sourceFiles[0].sha256 = '0'.repeat(64); }, (m) => { m.files[0].path = '../outside.txt'; },
    (m) => { m.extra = 'unexpected'; },
  ]) await withCopy(async (root) => {
    await buildRelease({ root }); await updateManifest(root, mutate);
    await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
test('source change is rejected even with a coordinated sourceFiles digest edit', async () => withCopy(async (root) => {
  await buildRelease({ root }); const target = path.join(root, 'public/js/app.js'), bytes = await readFile(target);
  bytes[0] ^= 1; await writeFile(target, bytes);
  await updateManifest(root, (m) => Object.assign(m.sourceFiles.find((f) => f.path === 'js/app.js'), { bytes: bytes.length, sha256: sha(bytes) }));
  await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
}));
test('missing/extra public input rejects before any new release output', async () => {
  for (const mode of ['missing', 'extra', 'empty-directory']) await withCopy(async (root) => {
    if (mode === 'missing') await unlink(path.join(root, 'public/js/app.js'));
    if (mode === 'extra') await writeFile(path.join(root, 'public/extra.txt'), 'synthetic');
    if (mode === 'empty-directory') await mkdir(path.join(root, 'public/unknown'));
    await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
test('unmanaged partial output is never overwritten; an entirely empty output root is usable', async () => {
  await withCopy(async (root) => {
    await mkdir(path.join(root, 'release-artifacts/site/js'), { recursive: true });
    await writeFile(path.join(root, 'release-artifacts/site/js/app.js'), 'unmanaged file');
    await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
  await withCopy(async (root) => { await mkdir(path.join(root, 'release-artifacts')); await buildRelease({ root }); await checkRelease({ root }); });
});
test('source/output junctions or directory symlinks are rejected without following or changing their targets', async () => {
  for (const mode of ['source', 'output', 'output-root']) await withCopy(async (root) => {
    let location;
    if (mode === 'source') location = path.join(root, 'public/js');
    else {
      await buildRelease({ root });
      location = mode === 'output-root' ? path.join(root, 'release-artifacts') : path.join(root, 'release-artifacts/site/js');
    }
    const target = path.join(root, 'link-target'); await rename(location, target);
    await symlink(target, location, process.platform === 'win32' ? 'junction' : 'dir');
    await rejectedWithoutWrites(root, () => buildRelease({ root }));
    if (mode !== 'source') await rejectedWithoutWrites(root, () => checkRelease({ root }));
  });
});


test('M2A exact assets-only config and deployment digest stay outside the 15-file site', async () => withCopy(async (root) => {
  const bytes = await readFile(path.join(root, 'wrangler.jsonc'));
  assert.deepEqual(JSON.parse(bytes), {
    name: 'glossquote-image-contact-sheet', compatibility_date: '2026-10-24',
    workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'contact-sheet.glossquote.com', custom_domain: true }],
    build: { command: 'node scripts/release.mjs build' },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  });
  const manifest = await buildRelease({ root });
  assert.deepEqual(manifest.deploymentFiles, [{ path: 'wrangler.jsonc', bytes: bytes.length, sha256: sha(bytes) }]);
  assert.equal(manifest.files.some((f) => /wrangler|worker|\.jsonc$/u.test(f.path)), false);
  assert.equal(await readFile(path.join(root, 'release-artifacts/site/_redirects'), 'utf8'), '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
  await checkRelease({ root });
}));
test('M2A config rejects setting/permission/routing expansion despite coordinated manifest digests', async () => {
  for (const [fields, value] of [
    ['name', 'other-tool'], ['compatibility_date', '2026-10-25'], ['workers_dev', true], ['preview_urls', true], ['send_metrics', true],
    ['routes.0.pattern', 'wrong.example'], ['routes.0.custom_domain', false], ['routes.1', { pattern: 'extra.example', custom_domain: true }],
    ['assets.directory', './public'], ['assets.run_worker_first', true], ['assets.html_handling', 'auto-trailing-slash'],
    ['assets.not_found_handling', 'single-page-application'], ['assets.binding', 'ASSETS'], ['observability.enabled', true],
    ['observability.logs.enabled', true], ['observability.logs.invocation_logs', true], ['observability.traces.enabled', true],
    ['main', 'worker.js'], ['vars', {}], ['kv_namespaces', []], ['env', {}], ['compatibility_flags', ['nodejs_compat']],
  ]) await withCopy(async (root) => {
    await buildRelease({ root });
    const target = path.join(root, 'wrangler.jsonc'), config = JSON.parse(await readFile(target, 'utf8'));
    const parts = fields.split('.'), last = parts.pop(); let container = config;
    for (const part of parts) container = container[part]; container[last] = value;
    const bytes = Buffer.from(JSON.stringify(config, null, 2) + '\n'); await writeFile(target, bytes);
    await updateManifest(root, (m) => Object.assign(m.deploymentFiles[0], { bytes: bytes.length, sha256: sha(bytes) }));
    JSON.parse(await readFile(path.join(root, 'release-artifacts/manifest.json'), 'utf8'));
    await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
test('M2A missing/alternate/directory/junction deployment config fails before writes and preserves targets', async () => {
  for (const mode of ['missing', 'alternate', 'directory', 'junction']) await withCopy(async (root) => {
    const location = path.join(root, 'wrangler.jsonc');
    if (mode === 'alternate') await writeFile(path.join(root, 'wrangler.toml'), 'name = "synthetic-other"\n');
    else {
      await unlink(location);
      if (mode === 'directory') await mkdir(location);
      if (mode === 'junction') {
        const target = path.join(root, 'synthetic-config-target'); await mkdir(target);
        await writeFile(path.join(target, 'preserve.txt'), 'synthetic target must remain intact');
        await symlink(target, location, process.platform === 'win32' ? 'junction' : 'dir');
      }
    }
    await rejectedWithoutWrites(root, () => buildRelease({ root })); await rejectedWithoutWrites(root, () => checkRelease({ root }));
  });
});
test('M2A exact redirects reject status/destination/order/CRLF/LF/extra-rule tampering with coordinated manifests', async () => {
  for (const transform of [
    (s) => s.trimEnd(), (s) => s.replaceAll('\n', '\r\n'), (s) => s + '\n', (s) => s.replace('301', '302'),
    (s) => s.replace('/index.html 301', 'https://wrong.example/ 301'), (s) => s.replace('/en /en/index.html 301\n', ''),
    (s) => s + '/* /index.html 200\n', (s) => s.split('\n').filter(Boolean).reverse().join('\n') + '\n',
  ]) await withCopy(async (root) => {
    await buildRelease({ root }); const target = path.join(root, 'release-artifacts/site/_redirects');
    const bytes = Buffer.from(transform(await readFile(target, 'utf8'))); await writeFile(target, bytes);
    await updateManifest(root, (m) => Object.assign(m.files.find((f) => f.path === '_redirects'), { bytes: bytes.length, sha256: sha(bytes) }));
    JSON.parse(await readFile(path.join(root, 'release-artifacts/manifest.json'), 'utf8'));
    await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
test('M2A manifest rejects deployment record/mode/schema mutations without repairing output', async () => {
  for (const mutate of [
    (m) => { m.deploymentFiles[0].sha256 = '0'.repeat(64); }, (m) => { m.deploymentFiles[0].bytes++; },
    (m) => { m.deploymentFiles[0].path = '../outside.jsonc'; }, (m) => { m.deploymentFiles[0].extra = true; },
    (m) => { m.deploymentFiles = []; }, (m) => { delete m.deploymentFiles; },
    (m) => { m.mode = 'release-candidate'; }, (m) => { m.schemaVersion = 1; },
  ]) await withCopy(async (root) => {
    await buildRelease({ root }); await updateManifest(root, mutate);
    JSON.parse(await readFile(path.join(root, 'release-artifacts/manifest.json'), 'utf8'));
    await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
test('M2A canonical config bytes reject whitespace/comments/missing or unknown fields before output', async () => {
  for (const transform of [
    (s) => s.replaceAll('\n', '\r\n'), (s) => JSON.stringify(JSON.parse(s)) + '\n', (s) => s + '// synthetic comment\n',
    (s) => s.replace('"send_metrics": false,', '"send_metrics": false, "unknown": 1,'),
    (s) => { const c = JSON.parse(s); delete c.send_metrics; return JSON.stringify(c, null, 2) + '\n'; },
  ]) await withCopy(async (root) => {
    const target = path.join(root, 'wrangler.jsonc'); await writeFile(target, transform(await readFile(target, 'utf8')));
    await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});

test('M2A-F1 fixed build command rejects omissions/alternate commands/shell/extra fields despite coordinated manifest hashes', async () => {
  for (const mutate of [
    (c) => { delete c.build; }, (c) => { c.build = {}; }, (c) => { c.build = null; },
    (c) => { c.build.command = 'node scripts/release.mjs check'; },
    (c) => { c.build.command = 'node scripts/release.mjs build extra'; },
    (c) => { c.build.command = 'node scripts/release.mjs build && node synthetic-worker.js'; },
    (c) => { c.build.command = 'npm run build:release'; },
    (c) => { c.build.command = ['node', 'scripts/release.mjs', 'build']; },
    (c) => { c.build.cwd = './'; }, (c) => { c.build.watch_dir = 'public'; },
  ]) await withCopy(async (root) => {
    await buildRelease({ root }); const target = path.join(root, 'wrangler.jsonc');
    const config = JSON.parse(await readFile(target, 'utf8')); mutate(config);
    const bytes = Buffer.from(JSON.stringify(config, null, 2) + '\n'); await writeFile(target, bytes);
    await updateManifest(root, (m) => Object.assign(m.deploymentFiles[0], { bytes: bytes.length, sha256: sha(bytes) }));
    JSON.parse(await readFile(path.join(root, 'release-artifacts/manifest.json'), 'utf8'));
    await rejectedWithoutWrites(root, () => checkRelease({ root })); await rejectedWithoutWrites(root, () => buildRelease({ root }));
  });
});
