import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, lstat, readdir, readFile, writeFile, rm, unlink, symlink } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, PUBLIC_FILES } from '../scripts/files.mjs';
import { SECURITY_HEADERS } from '../scripts/serve.mjs';
import { buildRelease, checkRelease, prepareRelease, verifyReleaseSeo, parseReleaseArgs, ORIGIN, TOOL_SLUG } from '../scripts/release.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const output = root => join(root, 'release-artifacts');
const site = (root, file) => join(output(root), 'site', file);

async function withCopy(run) {
  const parent = resolve(ROOT, 'evidence', 'm2a-2026-10-27');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, '.release-'));
  try {
    await cp(join(ROOT, 'public'), join(root, 'public'), { recursive: true });
    await cp(join(ROOT, 'scripts'), join(root, 'scripts'), { recursive: true });
    await cp(join(ROOT, 'wrangler.jsonc'), join(root, 'wrangler.jsonc'));
    await run(root);
  } finally {
    const target = resolve(root);
    if (!target.startsWith(parent + sep + '.release-') || target === parent || (await lstat(target)).isSymbolicLink()) throw new Error('UNSAFE_TEST_CLEANUP');
    await rm(target, { recursive: true, force: false });
  }
}

async function snapshot(root) {
  const files = [];
  async function walk(relative) {
    const path = join(root, relative);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) { files.push([relative, 'link']); return; }
    if (stat.isDirectory()) {
      files.push([relative, 'directory']);
      for (const name of (await readdir(path)).sort()) await walk(relative ? `${relative}/${name}` : name);
    } else files.push([relative, stat.size, sha(await readFile(path))]);
  }
  await walk('');
  return files;
}

async function bothRefuseWithoutWrites(root, pattern) {
  const before = await snapshot(output(root));
  await assert.rejects(checkRelease(root), pattern);
  await assert.rejects(buildRelease(root), pattern);
  assert.deepEqual(await snapshot(output(root)), before, 'negative checks and rebuild must preserve every existing byte and path');
}

test('M1B fixed origin, slug, manifest schema, exact asset set and complete source fingerprints', async () => {
  await withCopy(async root => {
    const p = await prepareRelease(root);
    assert.equal(ORIGIN, 'https://backplan.glossquote.com');
    assert.equal(TOOL_SLUG, 'project-backplan');
    assert.deepEqual(Object.keys(p.manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'configFiles']);
    assert.equal(p.manifest.schemaVersion, 1);
    assert.equal(p.manifest.mode, 'release-candidate');
    assert.equal(p.manifest.files.length, 14);
    assert.deepEqual(p.manifest.files.map(f => f.path), [...new Set([...PUBLIC_FILES, 'robots.txt', '_headers', '_redirects', 'sitemap.xml'])].sort());
    const config = await readFile(join(root, 'wrangler.jsonc'));
    assert.deepEqual(p.manifest.configFiles, [{ path: 'wrangler.jsonc', bytes: config.length, sha256: sha(config) }]);
    assert.deepEqual(p.manifest.sourceFiles.map(f => f.path), [...PUBLIC_FILES].sort());
    for (const f of p.manifest.sourceFiles) {
      const bytes = await readFile(join(root, 'public', f.path));
      assert.deepEqual(f, { path: f.path, bytes: bytes.length, sha256: sha(bytes) });
    }
    assert.equal(p.manifestBytes.includes(root), false);
    assert.equal(/lastmod|createdAt|timestamp/.test(p.manifestBytes.toString()), false);
    assert.equal(p.manifest.files.some(f => f.path === 'manifest.json'), false);
  });
});

test('M2A bilingual SEO and exact production-only candidate-footer removal preserve every other HTML byte', async () => {
  await withCopy(async root => {
    const p = await prepareRelease(root);
    const expectedCanonical = { 'index.html': 'https://backplan.glossquote.com/index.html', 'en/index.html': 'https://backplan.glossquote.com/en/index.html' };
    for (const file of Object.keys(expectedCanonical)) {
      const html = p.site.get(file).toString();
      const original = (await readFile(join(root, 'public', file))).toString();
      const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
      const links = [...head.matchAll(/<link rel="(canonical|alternate)"(?: hreflang="([^"]+)")? href="([^"]+)">/g)];
      assert.deepEqual(links.map(m => [m[1], m[2] ?? null, m[3]]), [
        ['canonical', null, expectedCanonical[file]],
        ['alternate', 'zh-Hant', 'https://backplan.glossquote.com/index.html'],
        ['alternate', 'en', 'https://backplan.glossquote.com/en/index.html'],
        ['alternate', 'x-default', 'https://backplan.glossquote.com/index.html']
      ]);
      assert.equal((head.match(/name="robots"/g) ?? []).length, 1);
      assert.ok(head.includes('<meta name="robots" content="index,follow">'));
      const candidateFooter = `<span>Gloss Tools by GlossQuote · ${file === 'index.html' ? '本地預覽候選' : 'Local preview candidate'}</span>`;
      const restored = html.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">')
        .replace(/^  <link rel="(?:canonical|alternate)"[^\n]+>\n/gm, '')
        .replace('<span>Gloss Tools by GlossQuote</span>', candidateFooter);
      assert.equal(restored, original, 'all original bytes outside the exact head/footer allowlist must be preserved');
      assert.equal(html.slice(html.indexOf('</head>')), original.slice(original.indexOf('</head>')).replace(candidateFooter, '<span>Gloss Tools by GlossQuote</span>'));
      assert.equal(html.includes(file === 'index.html' ? '本地預覽候選' : 'Local preview candidate'), false);
      assert.ok(original.includes(candidateFooter), 'preview keeps its truthful candidate marker');
    }
  });
});

test('M1B runtime JS/CSS remain byte-identical to preview source', async () => {
  await withCopy(async root => {
    const before = await snapshot(join(root, 'public'));
    await buildRelease(root);
    for (const file of PUBLIC_FILES.filter(f => !f.endsWith('.html'))) assert.deepEqual(await readFile(site(root, file)), await readFile(join(root, 'public', file)));
    assert.deepEqual(await snapshot(join(root, 'public')), before);
  });
});

test('M1B robots exact bytes, two canonical sitemap URLs, and original security headers with only robots changed', async () => {
  await withCopy(async root => {
    const p = await prepareRelease(root);
    assert.equal(p.site.get('robots.txt').toString(), 'User-agent: *\nAllow: /\nSitemap: https://backplan.glossquote.com/sitemap.xml\n');
    const xml = p.site.get('sitemap.xml').toString();
    assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), ['https://backplan.glossquote.com/index.html', 'https://backplan.glossquote.com/en/index.html']);
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
    assert.equal(xml.includes('lastmod'), false);
    const lines = p.site.get('_headers').toString().trimEnd().split('\n');
    assert.equal(lines.shift(), '/*');
    const headers = Object.fromEntries(lines.map(line => { const colon = line.indexOf(':'); return [line.slice(2, colon), line.slice(colon + 2)]; }));
    assert.deepEqual(headers, { ...SECURITY_HEADERS, 'X-Robots-Tag': 'index, follow' });
    assert.ok(headers['Content-Security-Policy'].includes("connect-src 'none'"));
    assert.equal(headers['Content-Security-Policy'].includes('blob:'), false);
    assert.equal(headers['Content-Security-Policy'].includes('data:'), false);
  });
});

test('M1B fresh build, check, and verified rebuild produce deterministic identical bytes', async () => {
  await withCopy(async root => {
    const first = await buildRelease(root);
    const before = await snapshot(output(root));
    assert.equal(first.disposition, 'created');
    assert.equal((await checkRelease(root)).disposition, 'verified');
    const second = await buildRelease(root);
    assert.equal(second.disposition, 'verified-existing');
    assert.equal(second.manifestSha256, first.manifestSha256);
    assert.deepEqual(await snapshot(output(root)), before);
    assert.equal((await readdir(output(root))).sort().join(','), 'manifest.json,site');
  });
});

test('M1B tampered existing asset is refused without repair or overwrite', async () => {
  await withCopy(async root => {
    await buildRelease(root);
    await writeFile(site(root, 'js/app.js'), (await readFile(site(root, 'js/app.js'))).toString() + '\n// synthetic tamper\n');
    await bothRefuseWithoutWrites(root, /RELEASE_ARTIFACT_MISMATCH/);
  });
});

test('M1B asset and manifest re-signed together are still rejected against independent pinned expected bytes', async () => {
  await withCopy(async root => {
    await buildRelease(root);
    const path = site(root, 'js/app.js');
    const bytes = Buffer.from(await readFile(path));
    bytes[0] ^= 1;
    await writeFile(path, bytes);
    const manifest = JSON.parse(await readFile(join(output(root), 'manifest.json')));
    Object.assign(manifest.files.find(f => f.path === 'js/app.js'), { bytes: bytes.length, sha256: sha(bytes) });
    await writeFile(join(output(root), 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    assert.equal(manifest.files.find(f => f.path === 'js/app.js').sha256, sha(await readFile(path)));
    await bothRefuseWithoutWrites(root, /RELEASE_MANIFEST_MISMATCH/);
  });
});

test('M1B missing output is refused; build does not silently regenerate it', async () => {
  await withCopy(async root => {
    await buildRelease(root);
    await unlink(site(root, 'js/planner-worker.js'));
    await bothRefuseWithoutWrites(root, /RELEASE_MISSING_FILE/);
  });
});

test('M1B extra file, extra empty site directory and extra sibling output are all refused', async () => {
  for (const kind of ['file', 'directory', 'sibling']) await withCopy(async root => {
    await buildRelease(root);
    if (kind === 'file') await writeFile(site(root, 'unexpected.txt'), 'synthetic preserve');
    if (kind === 'directory') await mkdir(site(root, 'unexpected'));
    if (kind === 'sibling') await writeFile(join(output(root), 'unexpected.txt'), 'synthetic preserve');
    await bothRefuseWithoutWrites(root, /RELEASE_(?:UNKNOWN_FILE|UNKNOWN_DIRECTORY|UNMANAGED_OUTPUT)/);
  });
});

test('M1B wrong origin/slug/schema, missing/duplicate manifest rows and noncanonical manifest are rejected', async () => {
  await withCopy(async root => {
    await buildRelease(root);
    const file = join(output(root), 'manifest.json');
    const original = await readFile(file);
    const changes = [
      m => { m.origin = 'https://wrong.glossquote.com'; }, m => { m.toolSlug = 'wrong'; }, m => { m.schemaVersion = 2; },
      m => { m.files.pop(); }, m => { m.files.push(m.files[0]); }, m => { m.sourceFiles = []; }
    ];
    for (const change of changes) {
      const modified = JSON.parse(original);
      change(modified);
      await writeFile(file, JSON.stringify(modified, null, 2) + '\n');
      await bothRefuseWithoutWrites(root, /RELEASE_MANIFEST_MISMATCH/);
    }
    await writeFile(file, JSON.stringify(JSON.parse(original)));
    await bothRefuseWithoutWrites(root, /RELEASE_MANIFEST_MISMATCH/);
  });
});

test('M1B semantic SEO verifier rejects duplicate/missing canonical, cross-domain alternates and wrong x-default/robots', async () => {
  const p = await prepareRelease();
  const html = p.site.get('index.html').toString();
  const canonical = '<link rel="canonical" href="https://backplan.glossquote.com/index.html">';
  const bad = [
    html.replace(canonical, ''), html.replace(canonical, canonical + canonical),
    html.replace('hreflang="en" href="https://backplan.glossquote.com/en/index.html"', 'hreflang="en" href="https://evil.example/en/index.html"'),
    html.replace('hreflang="x-default" href="https://backplan.glossquote.com/index.html"', 'hreflang="x-default" href="https://backplan.glossquote.com/en/index.html"'),
    html.replace('content="index,follow"', 'content="noindex,nofollow"'),
    html.replace('hreflang="en"', 'hreflang="zh-Hant"'),
    html.replace(canonical, '<link rel="canonical" href="https://backplan.glossquote.com/index.html" href="https://evil.example/">')
  ];
  for (const input of bad) assert.throws(() => verifyReleaseSeo(input, 'index.html'), /RELEASE_(?:CANONICAL|ALTERNATES|ROBOTS_META|HTML_DUPLICATE_ATTRIBUTE)/);
});

test('M1B source mutation is refused before first build and after build, even with updated manifest source hashes', async () => {
  for (const built of [false, true]) await withCopy(async root => {
    if (built) await buildRelease(root);
    const source = join(root, 'public', 'js/app.js');
    const bytes = Buffer.from(await readFile(source));
    bytes[0] ^= 1;
    await writeFile(source, bytes);
    if (built) {
      const file = join(output(root), 'manifest.json');
      const manifest = JSON.parse(await readFile(file));
      Object.assign(manifest.sourceFiles.find(f => f.path === 'js/app.js'), { bytes: bytes.length, sha256: sha(bytes) });
      await writeFile(file, JSON.stringify(manifest, null, 2) + '\n');
      await bothRefuseWithoutWrites(root, /RELEASE_SOURCE_CHANGED/);
    } else {
      await assert.rejects(buildRelease(root), /RELEASE_SOURCE_CHANGED/);
      await assert.rejects(lstat(output(root)), { code: 'ENOENT' });
    }
  });
});

test('M1B unknown/missing public source and changed header source are rejected without output creation', async () => {
  for (const kind of ['unknown', 'missing', 'header']) await withCopy(async root => {
    if (kind === 'unknown') await writeFile(join(root, 'public', 'unexpected.txt'), 'synthetic');
    if (kind === 'missing') await unlink(join(root, 'public', 'js/app.js'));
    if (kind === 'header') {
      const path = join(root, 'scripts', 'serve.mjs');
      await writeFile(path, (await readFile(path)).toString() + '\n');
    }
    await assert.rejects(buildRelease(root), /RELEASE_(?:SOURCE_TREE|HEADER_SOURCE_CHANGED)/);
    await assert.rejects(lstat(output(root)), { code: 'ENOENT' });
  });
});

test('M1B unmanaged existing output directory is preserved and refused', async () => {
  await withCopy(async root => {
    await mkdir(output(root));
    await bothRefuseWithoutWrites(root, /RELEASE_UNMANAGED_OUTPUT/);
    assert.deepEqual(await readdir(output(root)), []);
  });
});

test('M1B task-owned source/output junctions are refused; no target is followed or overwritten', async () => {
  await withCopy(async root => {
    const target = join(root, 'synthetic-target');
    await mkdir(target);
    const link = output(root);
    await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      await assert.rejects(buildRelease(root), /RELEASE_UNSAFE_DIRECTORY/);
      assert.deepEqual(await readdir(target), []);
    } finally { await unlink(link); }
    const sourceLink = join(root, 'public', 'linked');
    await symlink(target, sourceLink, process.platform === 'win32' ? 'junction' : 'dir');
    try { await assert.rejects(buildRelease(root), /RELEASE_SOURCE_TREE/); }
    finally { await unlink(sourceLink); }
  });
});

test('M1B CLI rejects no/unknown/multiple arguments and arbitrary origin without writing to the real root', async () => {
  await withCopy(async root => {
    const before = await snapshot(root);
    for (const args of [[], ['unknown'], ['build', 'check'], ['check', 'extra'], ['build', '--origin', 'https://evil.example'], ['--help']]) {
      assert.throws(() => parseReleaseArgs(args), /RELEASE_ARGUMENTS/);
      const child = spawnSync(process.execPath, [join(root, 'scripts', 'release.mjs'), ...args], { cwd: root, shell: false, windowsHide: true, timeout: 10000, encoding: 'utf8' });
      assert.equal(child.error, undefined);
      assert.equal(child.status, 1);
      assert.equal(child.stdout, '');
      assert.equal(child.stderr, 'Release rejected: RELEASE_ARGUMENTS\n');
    }
    assert.deepEqual(await snapshot(root), before);
  });
});

test('M1B copied CLI actually builds/checks the fixed candidate and fails check before output exists', async () => {
  await withCopy(async root => {
    const run = mode => spawnSync(process.execPath, [join(root, 'scripts', 'release.mjs'), mode], { cwd: root, shell: false, windowsHide: true, timeout: 10000, encoding: 'utf8' });
    assert.equal(run('check').status, 1);
    const built = run('build');
    assert.equal(built.status, 0, built.stderr);
    assert.equal(JSON.parse(built.stdout).origin, 'https://backplan.glossquote.com');
    assert.equal(JSON.parse(built.stdout).files, 14);
    const checked = run('check');
    assert.equal(checked.status, 0, checked.stderr);
    assert.equal(JSON.parse(checked.stdout).manifestSha256, JSON.parse(built.stdout).manifestSha256);
  });
});

test('M2A fixed assets-only configuration has exactly the approved disabled controls and redirect bytes', async () => {
  await withCopy(async root => {
    const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
    assert.deepEqual(config, {
      name: 'glossquote-project-backplan', compatibility_date: '2026-10-24',
      workers_dev: false, preview_urls: false, send_metrics: false,
      build: { command: 'node scripts/release.mjs build' },
      routes: [{ pattern: 'backplan.glossquote.com', custom_domain: true }],
      observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
      assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }
    });
    assert.equal(Object.hasOwn(config, 'main'), false);
    assert.equal(Object.hasOwn(config, 'vars'), false);
    assert.equal(Object.hasOwn(config.assets, 'binding'), false);
    await buildRelease(root);
    const redirects = await readFile(site(root, '_redirects'));
    assert.deepEqual(redirects, Buffer.from('/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n'));
    assert.equal(redirects.at(-1), 10);
    assert.equal(redirects.includes(13), false);
    assert.equal(redirects.toString().trimEnd().split('\n').length, 3);
  });
});

test('M2A config and re-signed manifest cannot enable telemetry/Worker/bindings or change fixed routing/date', async () => {
  await withCopy(async root => {
    await buildRelease(root);
    const configPath = join(root, 'wrangler.jsonc'), manifestPath = join(output(root), 'manifest.json');
    const originalConfig = await readFile(configPath), originalManifest = await readFile(manifestPath);
    const changes = [
      c => { c.workers_dev = true; }, c => { c.preview_urls = true; }, c => { c.send_metrics = true; },
      c => { c.observability.enabled = true; }, c => { c.observability.logs.enabled = true; }, c => { c.observability.logs.invocation_logs = true; }, c => { c.observability.traces.enabled = true; },
      c => { c.main = 'worker.js'; }, c => { c.vars = { SYNTHETIC: 'VALUE' }; }, c => { c.assets.binding = 'ASSETS'; },
      c => { c.kv_namespaces = []; }, c => { c.compatibility_date = '2026-10-25'; }, c => { c.routes[0].pattern = '*.glossquote.com'; },
      c => { c.assets.run_worker_first = true; }, c => { c.assets.html_handling = 'auto-trailing-slash'; }, c => { c.assets.not_found_handling = 'single-page-application'; },
      c => { c.assets.directory = './public'; }
    ];
    for (const change of changes) {
      const value = JSON.parse(originalConfig); change(value);
      const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
      await writeFile(configPath, bytes);
      const manifest = JSON.parse(originalManifest);
      manifest.configFiles = [{ path: 'wrangler.jsonc', bytes: bytes.length, sha256: sha(bytes) }];
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      await bothRefuseWithoutWrites(root, /RELEASE_CONFIG_MISMATCH/);
    }
    await writeFile(configPath, originalConfig); await writeFile(manifestPath, originalManifest);
    assert.equal((await checkRelease(root)).disposition, 'verified');
  });
});

test('M2A modified redirects plus matching manifest are refused, including CRLF, missing LF and extra routes', async () => {
  await withCopy(async root => {
    await buildRelease(root);
    const manifestPath = join(output(root), 'manifest.json');
    const original = await readFile(manifestPath);
    const values = [
      '/ /index.html 302\n/en /en/index.html 301\n/en/ /en/index.html 301\n',
      '/ /index.html 301\r\n/en /en/index.html 301\r\n/en/ /en/index.html 301\r\n',
      '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301',
      '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n/* /index.html 200\n',
      '/ /en/index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n'
    ];
    for (const text of values) {
      const bytes = Buffer.from(text); await writeFile(site(root, '_redirects'), bytes);
      const m = JSON.parse(original); Object.assign(m.files.find(f => f.path === '_redirects'), { bytes: bytes.length, sha256: sha(bytes) });
      await writeFile(manifestPath, JSON.stringify(m, null, 2) + '\n');
      await bothRefuseWithoutWrites(root, /RELEASE_MANIFEST_MISMATCH/);
    }
  });
});

test('M2A closed site rejects a Cloudflare Worker entry file and a copied deployment config', async () => {
  for (const filename of ['_worker.js', 'wrangler.jsonc']) await withCopy(async root => {
    await buildRelease(root);
    await writeFile(site(root, filename), 'SYNTHETIC EXTRA FILE');
    await bothRefuseWithoutWrites(root, /RELEASE_UNKNOWN_FILE/);
  });
});

test('M2A missing or wrong-type deployment config is rejected before creating output', async () => {
  for (const mode of ['missing', 'directory']) await withCopy(async root => {
    const path = join(root, 'wrangler.jsonc'); await unlink(path);
    if (mode === 'directory') await mkdir(path);
    await assert.rejects(buildRelease(root), error => mode === 'missing' ? error.code === 'ENOENT' : /RELEASE_UNSAFE_FILE/.test(error.message));
    await assert.rejects(lstat(output(root)), { code: 'ENOENT' });
  });
});
