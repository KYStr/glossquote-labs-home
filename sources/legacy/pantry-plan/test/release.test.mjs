import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, readdir, lstat, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, inside } from '../scripts/files.mjs';
import { REDIRECTS, validateDeployment } from '../scripts/deployment.mjs';
import { ORIGIN, TOOL_SLUG, SOURCE_PATHS, SOURCE_RECORDS_SHA256, buildRelease, checkRelease, runRelease } from '../scripts/release.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const EN = 'https://shopping-list.glossquote.com/en/index.html';
const ZH = 'https://shopping-list.glossquote.com/index.html';
async function scratch(fn) {
  const parent = join(ROOT, 'evidence/m2a'); await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, 'release-test-'));
  try {
    await cp(join(ROOT, 'public'), join(root, 'public'), { recursive: true });
    await cp(join(ROOT, 'wrangler.jsonc'), join(root, 'wrangler.jsonc'));
    await fn(root);
  }
  finally { assert.ok(inside(parent, root)); await rm(root, { recursive: true }); }
}
async function snapshot(root, metadata = false) {
  const files = [];
  async function walk(path) {
    for (const name of (await readdir(path)).sort()) {
      const full = join(path, name), stat = await lstat(full, { bigint: true });
      const logical = relative(root, full).split(sep).join('/');
      if (stat.isSymbolicLink()) files.push({ path: logical, type: 'link' });
      else if (stat.isDirectory()) { files.push({ path: logical, type: 'directory' }); await walk(full); }
      else {
        const bytes = await readFile(full);
        files.push({ path: logical, type: 'file', bytes: bytes.length, sha256: sha(bytes), ...(metadata ? { mtimeNs: stat.mtimeNs.toString() } : {}) });
      }
    }
  }
  await walk(root); return files;
}
async function assertRejectedWithoutMutation(root, pattern) {
  const output = join(root, 'release-artifacts'), before = await snapshot(output, true);
  await assert.rejects(checkRelease(root), pattern);
  await assert.rejects(buildRelease(root), pattern);
  assert.deepEqual(await snapshot(output, true), before);
}
async function updateAssetAndManifest(root, path, change, sourceToo = false) {
  const asset = join(root, 'release-artifacts/site', path), bytes = Buffer.from(change(await readFile(asset, 'utf8')));
  await writeFile(asset, bytes);
  const manifestPath = join(root, 'release-artifacts/manifest.json'), manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  Object.assign(manifest.files.find(file => file.path === path), { bytes: bytes.length, sha256: sha(bytes) });
  if (sourceToo) {
    await writeFile(join(root, 'public', path), bytes);
    Object.assign(manifest.sourceFiles.find(file => file.path === path), { bytes: bytes.length, sha256: sha(bytes) });
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

test('M1B fixed HTTPS origin, tool slug and independently recorded M1 source pin', () => {
  assert.equal(ORIGIN, 'https://shopping-list.glossquote.com'); assert.equal(TOOL_SLUG, 'pantry-plan');
  const url = new URL(ORIGIN);
  assert.deepEqual([url.protocol, url.port, url.username, url.password, url.search, url.hash, url.pathname], ['https:', '', '', '', '', '', '/']);
  assert.equal(SOURCE_RECORDS_SHA256, 'bd7f4bed29d52631cc9f24b3b93bcb226e441b3a7657eeb4c274f21dc7db4a56');
  assert.equal(SOURCE_PATHS.length, 14);
});
test('M2A both languages keep exact SEO, home links and body except four candidate suffixes', async () => scratch(async root => {
  const sourceBefore = await snapshot(join(root, 'public'));
  const result = await buildRelease(root); assert.equal(result.files, 16);
  for (const [path, canonical, lang] of [['index.html', ZH, 'zh-Hant'], ['en/index.html', EN, 'en']]) {
    const source = await readFile(join(root, 'public', path), 'utf8');
    const text = await readFile(join(root, 'release-artifacts/site', path), 'utf8');
    const head = /<head>[\s\S]*?<\/head>/.exec(text)[0];
    assert.ok(text.includes(`<html lang="${lang}"`));
    assert.equal((head.match(/rel="canonical"/g) ?? []).length, 1);
    assert.ok(head.includes(`<link rel="canonical" href="${canonical}">`));
    assert.equal((head.match(/rel="alternate"/g) ?? []).length, 3);
    for (const [language, href] of [['zh-Hant', ZH], ['en', EN], ['x-default', ZH]]) assert.ok(head.includes(`<link rel="alternate" hreflang="${language}" href="${href}">`));
    assert.equal((head.match(/name="robots"/g) ?? []).length, 1); assert.ok(head.includes('<meta name="robots" content="index,follow">'));
    const removals = lang === 'zh-Hant' ? [' · 預覽候選版', ' · 本地預覽，尚未正式發布'] : [' · Preview candidate', ' · Local preview, not a live release'];
    let expectedBody = source.replace(/<head>[\s\S]*?<\/head>/, '<head></head>');
    for (const marker of removals) {
      assert.equal(source.split(marker).length, 2);
      assert.equal(text.includes(marker), false);
      expectedBody = expectedBody.replace(marker, '');
    }
    assert.equal(text.replace(/<head>[\s\S]*?<\/head>/, '<head></head>'), expectedBody);
    const home = lang === 'zh-Hant' ? 'https://glossquote.com/index.html' : 'https://glossquote.com/en/index.html';
    assert.ok(text.includes(`href="${home}"`));
    assert.ok(source.includes('content="noindex,nofollow"')); assert.equal(source.includes('rel="canonical"'), false);
    assert.equal(text.includes('application/ld+json'), false);
  }
  assert.deepEqual(await snapshot(join(root, 'public')), sourceBefore);
}));
test('M1B source runtime, 404, CSS and every non-SEO asset keep exact bytes', async () => scratch(async root => {
  await buildRelease(root);
  const changed = new Set(['index.html', 'en/index.html', '_headers', 'robots.txt']);
  for (const path of SOURCE_PATHS.filter(path => !changed.has(path))) assert.deepEqual(await readFile(join(root, 'release-artifacts/site', path)), await readFile(join(root, 'public', path)), path);
}));
test('M1B robots, sitemap and complete existing security headers are exact and isolated from preview', async () => scratch(async root => {
  await buildRelease(root);
  const site = join(root, 'release-artifacts/site');
  assert.equal(await readFile(join(site, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://shopping-list.glossquote.com/sitemap.xml\n');
  const sitemap = await readFile(join(site, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [ZH, EN]);
  assert.equal(sitemap.includes('lastmod'), false); assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  const previewHeaders = await readFile(join(root, 'public/_headers'), 'utf8');
  const headers = await readFile(join(site, '_headers'), 'utf8');
  assert.equal(headers.replace('X-Robots-Tag: index, follow', 'X-Robots-Tag: noindex, nofollow'), previewHeaders);
  assert.ok(headers.includes("connect-src 'none'")); assert.ok(headers.includes("script-src 'self'"));
  await assert.rejects(lstat(join(root, 'public/sitemap.xml')), { code: 'ENOENT' });
  assert.equal(await readFile(join(root, 'public/robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
}));
test('M1B manifest independently hashes every sorted source and site file; excludes itself from site', async () => scratch(async root => {
  await buildRelease(root); const output = join(root, 'release-artifacts');
  const raw = await readFile(join(output, 'manifest.json'));
  const manifest = JSON.parse(raw);
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
  assert.deepEqual([manifest.schemaVersion, manifest.mode, manifest.origin, manifest.toolSlug], [1, 'release-candidate', 'https://shopping-list.glossquote.com', 'pantry-plan']);
  assert.equal(manifest.files.length, 16); assert.equal(manifest.sourceFiles.length, 14);
  for (const [key, folder] of [['files', join(output, 'site')], ['sourceFiles', join(root, 'public')]]) {
    const list = manifest[key]; assert.deepEqual(list.map(file => file.path), list.map(file => file.path).sort());
    assert.equal(new Set(list.map(file => file.path)).size, list.length);
    for (const file of list) { const bytes = await readFile(join(folder, file.path)); assert.deepEqual(file, { path: file.path, bytes: bytes.length, sha256: sha(bytes) }); }
  }
  assert.equal(sha(Buffer.from(JSON.stringify(manifest.sourceFiles))), SOURCE_RECORDS_SHA256);
  assert.equal(raw.toString(), JSON.stringify(manifest, null, 2) + '\n');
  assert.equal(raw.toString().includes(root), false); assert.equal(raw.toString().includes('generatedAt'), false);
  await assert.rejects(lstat(join(output, 'site/manifest.json')), { code: 'ENOENT' });
}));
test('M1B two fresh builds are byte-deterministic; valid rebuild changes no managed bytes or mtimes', async () => scratch(async root => {
  await buildRelease(root); const first = await snapshot(join(root, 'release-artifacts'), true);
  assert.equal((await buildRelease(root)).action, 'VERIFIED_EXISTING'); assert.equal((await checkRelease(root)).status, 'PASS');
  assert.deepEqual(await snapshot(join(root, 'release-artifacts'), true), first);
  await scratch(async second => {
    await buildRelease(second);
    assert.deepEqual(await snapshot(join(second, 'release-artifacts')), await snapshot(join(root, 'release-artifacts')));
  });
}));
test('M1B asset tampering is rejected without repairing it', async () => scratch(async root => {
  await buildRelease(root); await writeFile(join(root, 'release-artifacts/site/js/app.mjs'), '// tampered\n');
  await assertRejectedWithoutMutation(root, /ARTIFACT_BYTES_MISMATCH/);
}));
test('M1B manifest+runtime tampering together still rejects reconstructed expected bytes', async () => scratch(async root => {
  await buildRelease(root); await updateAssetAndManifest(root, 'js/app.mjs', text => `${text}\n// paired tampering\n`);
  await assertRejectedWithoutMutation(root, /ARTIFACT_BYTES_MISMATCH/);
}));
test('M1B manifest+canonical/hreflang tampering together still rejects wrong origin', async () => scratch(async root => {
  await buildRelease(root); await updateAssetAndManifest(root, 'en/index.html', text => text.replaceAll('https://shopping-list.glossquote.com', 'https://wrong.invalid'));
  await assertRejectedWithoutMutation(root, /ARTIFACT_BYTES_MISMATCH/);
}));
for (const variant of ['extra-file', 'extra-directory', 'missing-file', 'manifest-in-site']) {
  test(`M1B ${variant} rejected with all pre-existing output preserved`, async () => scratch(async root => {
    await buildRelease(root); const site = join(root, 'release-artifacts/site');
    if (variant === 'extra-file') await writeFile(join(site, 'extra.txt'), 'preserve this unknown file');
    if (variant === 'extra-directory') await mkdir(join(site, 'unknown-empty-directory'));
    if (variant === 'missing-file') await rm(join(site, 'styles/app.css'));
    if (variant === 'manifest-in-site') await cp(join(root, 'release-artifacts/manifest.json'), join(site, 'manifest.json'));
    await assertRejectedWithoutMutation(root, /UNKNOWN_FILE|UNKNOWN_DIRECTORY|MISSING_FILE/);
  }));
}
for (const field of ['origin', 'mode', 'toolSlug', 'schemaVersion', 'sourceFiles', 'files']) {
  test(`M1B manifest ${field} tampering rejected`, async () => scratch(async root => {
    await buildRelease(root); const path = join(root, 'release-artifacts/manifest.json'); const manifest = JSON.parse(await readFile(path, 'utf8'));
    if (field === 'sourceFiles' || field === 'files') manifest[field][0].sha256 = '0'.repeat(64);
    else manifest[field] = field === 'schemaVersion' ? 2 : 'incorrect';
    await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
    await assertRejectedWithoutMutation(root, /MANIFEST_IDENTITY|MANIFEST_RECORD_MISMATCH/);
  }));
}
test('M1B public source drift rejected even if output+manifest source hashes are also updated', async () => scratch(async root => {
  await buildRelease(root); await updateAssetAndManifest(root, 'js/app.mjs', text => `${text}\n// source changed too\n`, true);
  await assertRejectedWithoutMutation(root, /SOURCE_CHANGED_FROM_M1/);
}));
test('M1B invalid, missing and extra input rejected before output creation', async () => {
  for (const variant of ['changed', 'extra', 'missing']) await scratch(async root => {
    if (variant === 'changed') await writeFile(join(root, 'public/styles/app.css'), '/* changed */');
    if (variant === 'extra') await writeFile(join(root, 'public/extra.txt'), 'unknown');
    if (variant === 'missing') await rm(join(root, 'public/404.html'));
    await assert.rejects(buildRelease(root), /SOURCE_CHANGED_FROM_M1|UNKNOWN_FILE|MISSING_FILE/);
    await assert.rejects(lstat(join(root, 'release-artifacts')), { code: 'ENOENT' });
  });
});
test('M1B unmanaged or partial output cannot be overwritten', async () => {
  for (const variant of ['unmanaged', 'partial', 'empty']) await scratch(async root => {
    const output = join(root, 'release-artifacts'); await mkdir(output);
    if (variant === 'unmanaged') await writeFile(join(output, 'notes.txt'), 'keep me');
    if (variant === 'partial') await writeFile(join(output, 'manifest.json'), '{}\n');
    await assertRejectedWithoutMutation(root, /UNKNOWN_FILE|MISSING_FILE/);
  });
});
test('M1B input/output junctions and links reject without following or altering targets', async () => {
  for (const variant of ['source', 'output-root', 'output-child']) await scratch(async root => {
    const external = join(root, 'external'); await mkdir(external); await writeFile(join(external, 'sentinel.txt'), 'untouched');
    const link = process.platform === 'win32' ? 'junction' : 'dir';
    if (variant === 'source') await symlink(external, join(root, 'public/js/link'), link);
    if (variant === 'output-root') await symlink(external, join(root, 'release-artifacts'), link);
    if (variant === 'output-child') { await buildRelease(root); await symlink(external, join(root, 'release-artifacts/site/js/link'), link); }
    await assert.rejects(buildRelease(root), /REPARSE_POINT|UNSAFE_DIRECTORY/);
    if (variant !== 'source') await assert.rejects(checkRelease(root), /REPARSE_POINT|UNSAFE_DIRECTORY/);
    assert.equal(await readFile(join(external, 'sentinel.txt'), 'utf8'), 'untouched');
  });
});
test('M1B CLI no args, wrong mode, extra args and origin override fail before work', async () => {
  for (const args of [[], ['deploy'], ['BUILD'], ['build', 'extra'], ['check', '--origin=https://evil.invalid'], ['--help']]) {
    await assert.rejects(runRelease(args), /USAGE_EXPECTED_BUILD_OR_CHECK/);
    const child = spawnSync(process.execPath, [join(ROOT, 'scripts/release.mjs'), ...args], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 10000 });
    assert.equal(child.status, 1); assert.equal(child.stdout, ''); assert.equal(child.stderr.trim(), 'USAGE_EXPECTED_BUILD_OR_CHECK');
  }
});

test('M2A deployment profile is exactly assets-only with the approved host and all observability off', async () => {
  assert.deepEqual(JSON.parse(await readFile(join(ROOT, 'wrangler.jsonc'), 'utf8')), {
    name: 'glossquote-pantry-plan', compatibility_date: '2026-10-24',
    workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'shopping-list.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    build: { command: 'node scripts/release.mjs build' },
  });
  assert.deepEqual(await validateDeployment(), { deploymentConfig: 'wrangler.jsonc', deploymentMode: 'assets-only' });
});

test('M2A changed deployment permissions, routes, fallback, build and unknown fields stop before output', async () => {
  const mutations = [
    config => { config.main = 'worker.mjs'; },
    config => { config.account_id = 'not-an-account'; },
    config => { config.env = { production: {} }; },
    config => { config.kv_namespaces = []; },
    config => { config.assets.binding = 'ASSETS'; },
    config => { config.compatibility_date = '2026-10-25'; },
    config => { config.workers_dev = true; },
    config => { config.preview_urls = true; },
    config => { config.send_metrics = true; },
    config => { config.observability.enabled = true; },
    config => { config.observability.logs.enabled = true; },
    config => { config.observability.logs.invocation_logs = true; },
    config => { config.observability.traces.enabled = true; },
    config => { config.routes[0].pattern = 'wrong.invalid'; },
    config => { config.routes[0].custom_domain = false; },
    config => { config.routes.push({ pattern: 'extra.invalid', custom_domain: true }); },
    config => { config.assets.directory = './dist'; },
    config => { config.assets.run_worker_first = true; },
    config => { config.assets.html_handling = 'auto-trailing-slash'; },
    config => { config.assets.not_found_handling = 'single-page-application'; },
    config => { config.build.command = 'node scripts/serve.mjs'; },
    config => { delete config.observability; },
  ];
  for (const mutate of mutations) await scratch(async root => {
    const path = join(root, 'wrangler.jsonc'), config = JSON.parse(await readFile(path, 'utf8'));
    mutate(config); await writeFile(path, JSON.stringify(config, null, 2) + '\n');
    await assert.rejects(validateDeployment(root), /DEPLOYMENT_CONFIG_MISMATCH/);
    await assert.rejects(buildRelease(root), /DEPLOYMENT_CONFIG_MISMATCH/);
    await assert.rejects(lstat(join(root, 'release-artifacts')), { code: 'ENOENT' });
  });
});

test('M2A malformed, duplicate-key and noncanonical configuration cannot bypass the closed profile', async () => {
  for (const variant of ['invalid-json', 'duplicate-key', 'bom', 'missing', 'directory', 'junction']) await scratch(async root => {
    const path = join(root, 'wrangler.jsonc'), original = await readFile(path, 'utf8');
    if (variant === 'invalid-json') await writeFile(path, '{} trailing data');
    if (variant === 'duplicate-key') await writeFile(path, original.replace('{', '{\n  "send_metrics": true,'));
    if (variant === 'bom') await writeFile(path, `\ufeff${original}`);
    if (['missing', 'directory', 'junction'].includes(variant)) await rm(path);
    if (variant === 'directory') await mkdir(path);
    if (variant === 'junction') {
      const target = join(root, 'external-config'); await mkdir(target);
      await writeFile(join(target, 'sentinel.txt'), 'untouched');
      await symlink(target, path, process.platform === 'win32' ? 'junction' : 'dir');
    }
    await assert.rejects(buildRelease(root), /DEPLOYMENT_CONFIG_MISMATCH|UNSAFE_DEPLOYMENT_CONFIG|ENOENT/);
    await assert.rejects(lstat(join(root, 'release-artifacts')), { code: 'ENOENT' });
    if (variant === 'junction') assert.equal(await readFile(join(root, 'external-config/sentinel.txt'), 'utf8'), 'untouched');
  });
});

test('M2A existing artifact is preserved if deployment configuration changes after its build', async () => scratch(async root => {
  await buildRelease(root);
  const path = join(root, 'wrangler.jsonc');
  await writeFile(path, (await readFile(path, 'utf8')).replace('"send_metrics": false', '"send_metrics": true'));
  await assertRejectedWithoutMutation(root, /DEPLOYMENT_CONFIG_MISMATCH/);
}));

test('M2A redirects contain only the three exact LF-terminated 301 rules and enter the release manifest', async () => scratch(async root => {
  await buildRelease(root);
  const expected = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
  const bytes = await readFile(join(root, 'release-artifacts/site/_redirects'));
  assert.equal(REDIRECTS, expected); assert.deepEqual(bytes, Buffer.from(expected));
  const manifest = JSON.parse(await readFile(join(root, 'release-artifacts/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.files.find(file => file.path === '_redirects'), { path: '_redirects', bytes: bytes.length, sha256: sha(bytes) });
  await assert.rejects(lstat(join(root, 'public/_redirects')), { code: 'ENOENT' });
}));

test('M2A paired redirects and manifest tampering cannot add rules, change routes, status or newline bytes', async () => {
  for (const change of [
    text => `${text}/* /index.html 200\n`,
    text => text.replace('/index.html 301', '/en/index.html 301'),
    text => text.replace(' 301', ' 302'),
    text => text.replaceAll('\n', '\r\n'),
    text => text.slice(0, -1),
  ]) await scratch(async root => {
    await buildRelease(root); await updateAssetAndManifest(root, '_redirects', change);
    await assertRejectedWithoutMutation(root, /ARTIFACT_BYTES_MISMATCH/);
  });
  await scratch(async root => {
    await buildRelease(root); await rm(join(root, 'release-artifacts/site/_redirects'));
    await assertRejectedWithoutMutation(root, /MISSING_FILE/);
  });
});

test('M2A release-only candidate copy cannot be restored through paired HTML and manifest tampering', async () => scratch(async root => {
  await buildRelease(root);
  await updateAssetAndManifest(root, 'index.html', text => text.replace('本機處理 · 不自動保存', '本機處理 · 不自動保存 · 預覽候選版'));
  await assertRejectedWithoutMutation(root, /ARTIFACT_BYTES_MISMATCH/);
}));
