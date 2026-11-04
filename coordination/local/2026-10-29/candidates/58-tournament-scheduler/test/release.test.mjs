import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, copyFile, readFile, writeFile, readdir, lstat, rm, rename, symlink, link, access } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, PUBLIC_FILES, tokenizeHtml } from '../scripts/check.mjs';
import { buildRelease, checkRelease, parseReleaseArgs, validateDeploymentConfig, RELEASE_ORIGIN, TOOL_SLUG } from '../scripts/release.mjs';

const workspaces = join(PROJECT_ROOT, 'evidence/m2a/release-test-workspaces');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function withFixture(run) {
  await mkdir(workspaces, { recursive: true });
  const root = await mkdtemp(join(workspaces, 'owned-'));
  try {
    await cp(join(PROJECT_ROOT, 'public'), join(root, 'public'), { recursive: true });
    await cp(join(PROJECT_ROOT, 'dist'), join(root, 'dist'), { recursive: true });
    await mkdir(join(root, 'scripts'));
    for (const file of ['check.mjs', 'serve.mjs', 'release.mjs', 'deployment-config.mjs']) await copyFile(join(PROJECT_ROOT, 'scripts', file), join(root, 'scripts', file));
    await copyFile(join(PROJECT_ROOT, 'wrangler.jsonc'), join(root, 'wrangler.jsonc'));
    await run(root);
  } finally {
    const target = resolve(root);
    if (!target.startsWith(`${resolve(workspaces)}${sep}`) || target === resolve(workspaces)) throw new Error('UNSAFE_RELEASE_FIXTURE_CLEANUP');
    await rm(target, { recursive: true }); // Only this verified mkdtemp-owned tree.
  }
}

async function tree(root) {
  const result = [];
  const visit = async prefix => {
    for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const info = await lstat(join(root, path));
      if (info.isSymbolicLink()) result.push({ path, type: 'link' });
      else if (info.isDirectory()) { result.push({ path, type: 'directory' }); await visit(path); }
      else { const bytes = await readFile(join(root, path)); result.push({ path, type: 'file', bytes: bytes.length, sha256: hash(bytes) }); }
    }
  };
  await visit('');
  return result.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

async function tamper(root, path, transform, rewriteManifest = true) {
  const file = join(root, 'release-artifacts/site', path);
  const bytes = Buffer.from(transform(await readFile(file, 'utf8')), 'utf8');
  await writeFile(file, bytes);
  if (rewriteManifest) {
    const manifestPath = join(root, 'release-artifacts/manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const entry = manifest.files.find(item => item.path === path);
    entry.bytes = bytes.length;
    entry.sha256 = hash(bytes);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

test('M1B fixed HTTPS origin and slug; no arbitrary mode, origin, path or extra CLI args', async () => {
  assert.equal(RELEASE_ORIGIN, 'https://round-robin.glossquote.com');
  assert.equal(TOOL_SLUG, 'tournament-scheduler');
  const url = new URL(RELEASE_ORIGIN);
  assert.deepEqual([url.protocol, url.hostname, url.port, url.username, url.password, url.pathname, url.search, url.hash], ['https:', 'round-robin.glossquote.com', '', '', '', '/', '', '']);
  assert.equal(parseReleaseArgs(['build']), 'build');
  assert.equal(parseReleaseArgs(['check']), 'check');
  for (const args of [[], ['deploy'], ['--help'], ['build', 'extra'], ['check', '--origin=https://evil.invalid'], ['build', '--root', 'other']]) assert.throws(() => parseReleaseArgs(args), /RELEASE_USAGE/);
  await withFixture(async root => {
    await assert.rejects(buildRelease({ root, origin: 'https://evil.invalid' }), /RELEASE_OPTIONS/);
    for (const args of [[], ['deploy'], ['build', 'extra'], ['check', '--origin=https://evil.invalid'], ['build', '--root', 'other']]) {
      const child = spawnSync(process.execPath, [join(root, 'scripts/release.mjs'), ...args], { cwd: root, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 262144 });
      assert.equal(child.status, 1);
      assert.match(child.stderr, /RELEASE_USAGE/);
      await assert.rejects(access(join(root, 'release-artifacts')), { code: 'ENOENT' });
    }
  });
});

test('M2A both pages keep exact SEO and M1 body except the explicitly authorized footer candidate marker', async () => {
  await withFixture(async root => {
    await buildRelease({ root });
    for (const [file, lang] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
      const html = await readFile(join(root, 'release-artifacts/site', file), 'utf8');
      const original = await readFile(join(root, 'public', file), 'utf8');
      const tags = tokenizeHtml(html), sourceTags = tokenizeHtml(original);
      const head = tokenizeHtml(html.slice(html.indexOf('<head>'), html.indexOf('</head>') + 7));
      assert.equal(tags.find(tag => tag.tag === 'html').attrs.lang, lang);
      assert.deepEqual(head.filter(tag => tag.tag === 'link' && tag.attrs.rel === 'canonical').map(tag => tag.attrs.href), [`https://round-robin.glossquote.com/${file}`]);
      assert.deepEqual(head.filter(tag => tag.tag === 'link' && tag.attrs.rel === 'alternate').map(tag => [tag.attrs.hreflang, tag.attrs.href]), [
        ['zh-Hant', 'https://round-robin.glossquote.com/index.html'], ['en', 'https://round-robin.glossquote.com/en/index.html'], ['x-default', 'https://round-robin.glossquote.com/index.html']
      ]);
      assert.deepEqual(head.filter(tag => tag.tag === 'meta' && tag.attrs.name === 'robots').map(tag => tag.attrs.content), ['index,follow']);
      const marker = lang === 'en' ? '<span>Gloss Tools by GlossQuote · Preview candidate</span>' : '<span>Gloss Tools by GlossQuote · 預覽候選</span>';
      assert.equal(original.split(marker).length, 2);
      assert.equal(html.slice(html.indexOf('</head>')), original.slice(original.indexOf('</head>')).replace(marker, '<span>Gloss Tools by GlossQuote</span>'));
      for (const tag of ['title', 'h1']) assert.equal(tags.find(item => item.tag === tag).text, sourceTags.find(item => item.tag === tag).text);
      for (const name of ['description']) assert.equal(head.find(tag => tag.tag === 'meta' && tag.attrs.name === name).attrs.content, sourceTags.find(tag => tag.tag === 'meta' && tag.attrs.name === name).attrs.content);
      assert.equal(html.includes(marker), false);
      assert.ok(html.includes('<span>Gloss Tools by GlossQuote</span>'));
      assert.ok(tags.some(tag => tag.tag === 'a' && tag.attrs.href === (lang === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html')));
    }
  });
});

test('M1B source public and existing dist remain byte-identical/noindex; six runtime JS/CSS assets are copied exactly', async () => {
  await withFixture(async root => {
    const beforePublic = await tree(join(root, 'public')), beforeDist = await tree(join(root, 'dist'));
    await buildRelease({ root });
    await checkRelease({ root });
    assert.deepEqual(await tree(join(root, 'public')), beforePublic);
    assert.deepEqual(await tree(join(root, 'dist')), beforeDist);
    for (const file of PUBLIC_FILES) {
      const source = await readFile(join(root, 'public', file));
      if (!file.endsWith('.html')) assert.deepEqual(await readFile(join(root, 'release-artifacts/site', file)), source);
      else for (const directory of ['public', 'dist']) {
        const html = await readFile(join(root, directory, file), 'utf8');
        assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
        assert.equal(html.includes('rel="canonical"'), false);
        assert.equal(html.includes('rel="alternate"'), false);
      }
    }
  });
});

test('M1B generated robots/sitemap/header configuration has two URLs and preserves all original security rules', async () => {
  await withFixture(async root => {
    await buildRelease({ root });
    const site = join(root, 'release-artifacts/site');
    assert.equal(await readFile(join(site, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://round-robin.glossquote.com/sitemap.xml\n');
    const xml = await readFile(join(site, 'sitemap.xml'), 'utf8');
    assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(match => match[1]), ['https://round-robin.glossquote.com/index.html', 'https://round-robin.glossquote.com/en/index.html']);
    assert.equal(xml.includes('lastmod'), false);
    const text = await readFile(join(site, '_headers'), 'utf8');
    assert.equal(text, [
      '/*',
      "  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      '  X-Content-Type-Options: nosniff', '  Referrer-Policy: no-referrer', '  Cache-Control: no-store', '  X-Robots-Tag: index, follow',
      '  Cross-Origin-Resource-Policy: same-origin', '  Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()', ''
    ].join('\n'));
  });
});

test('M2A exact manifest schema/closed 12-file site, independent bytes/SHA; repeat build is byte-deterministic', async () => {
  await withFixture(async root => {
    const manifest = await buildRelease({ root });
    assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
    assert.deepEqual([manifest.schemaVersion, manifest.mode, manifest.origin, manifest.toolSlug], [1, 'release-candidate', 'https://round-robin.glossquote.com', 'tournament-scheduler']);
    assert.deepEqual(manifest.files.map(file => file.path), ['_headers', '_redirects', 'en/index.html', 'index.html', 'js/app.js', 'js/core/circle.mjs', 'js/core/output.mjs', 'js/core/teams.mjs', 'js/core/timing.mjs', 'robots.txt', 'sitemap.xml', 'styles/app.css']);
    assert.equal(manifest.sourceFiles.length, 8);
    for (const [entries, directory] of [[manifest.files, 'release-artifacts/site'], [manifest.sourceFiles, 'public']]) for (const item of entries) {
      assert.deepEqual(Object.keys(item), ['path', 'bytes', 'sha256']);
      const bytes = await readFile(join(root, directory, item.path));
      assert.equal(item.bytes, bytes.length);
      assert.equal(item.sha256, hash(bytes));
    }
    const before = await tree(join(root, 'release-artifacts'));
    assert.deepEqual(await buildRelease({ root }), manifest);
    assert.deepEqual(await tree(join(root, 'release-artifacts')), before);
    const raw = await readFile(join(root, 'release-artifacts/manifest.json'), 'utf8');
    assert.equal(raw.includes(root), false);
    assert.equal(/generatedAt|timestamp|lastmod/u.test(raw), false);
    assert.equal(manifest.files.some(item => item.path === 'manifest.json'), false);
  });
});

test('M1B asset-only tampering is rejected; build does not overwrite modified managed output', async () => {
  await withFixture(async root => {
    await buildRelease({ root });
    await tamper(root, 'js/app.js', source => `${source}\n// synthetic tamper\n`, false);
    const before = await tree(join(root, 'release-artifacts'));
    await assert.rejects(checkRelease({ root }), /RELEASE_ASSET_CHANGED/);
    await assert.rejects(buildRelease({ root }), /RELEASE_ASSET_CHANGED/);
    assert.deepEqual(await tree(join(root, 'release-artifacts')), before);
  });
});

test('M1B coordinated asset+manifest tampering cannot authorize altered runtime, SEO, sitemap, robots or CSP', async () => {
  for (const [file, transform] of [
    ['js/app.js', text => `${text}\n// altered runtime\n`],
    ['index.html', text => text.replace('https://round-robin.glossquote.com/index.html', 'https://evil.invalid/index.html')],
    ['en/index.html', text => text.replace('hreflang="x-default"', 'hreflang="en-US"')],
    ['sitemap.xml', text => text.replace('/en/index.html', '/wrong.html')],
    ['robots.txt', text => text.replace('Allow: /', 'Disallow: /')],
    ['_redirects', text => text.replace('/ /index.html 301', '/ https://evil.invalid/ 301')],
    ['_redirects', text => `${text}/* /index.html 200\n`],
    ['_headers', text => text.replace("connect-src 'none'", 'connect-src *')]
  ]) await withFixture(async root => {
    await buildRelease({ root });
    await tamper(root, file, transform);
    const before = await tree(join(root, 'release-artifacts'));
    await assert.rejects(checkRelease({ root }), /RELEASE_MANIFEST_CHANGED/);
    await assert.rejects(buildRelease({ root }), /RELEASE_MANIFEST_CHANGED/);
    assert.deepEqual(await tree(join(root, 'release-artifacts')), before);
  });
});

test('M1B wrong origin, schema, mode, duplicate or polluted manifest records are rejected', async () => {
  for (const transform of [
    manifest => { manifest.origin = 'https://evil.invalid'; }, manifest => { manifest.schemaVersion = 2; },
    manifest => { manifest.mode = 'production'; }, manifest => { manifest.files.push(manifest.files[0]); },
    manifest => { manifest.files[0].path = '../outside.txt'; }, manifest => { manifest.extra = true; }
  ]) await withFixture(async root => {
    await buildRelease({ root });
    const path = join(root, 'release-artifacts/manifest.json');
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    transform(manifest);
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
    await assert.rejects(checkRelease({ root }), /RELEASE_MANIFEST_CHANGED/);
  });
});

test('M1B extra and missing output files/directories are rejected without deleting original bytes', async () => {
  for (const mutate of [
    root => writeFile(join(root, 'release-artifacts/site/unmanaged.txt'), 'preserve synthetic bytes'),
    root => writeFile(join(root, 'release-artifacts/site/_worker.js'), 'export default {fetch(){return new Response("synthetic")}}'),
    root => writeFile(join(root, 'release-artifacts/site/_routes.json'), '{"version":1,"include":["/*"],"exclude":[]}'),
    root => mkdir(join(root, 'release-artifacts/site/unmanaged-directory')),
    root => rm(join(root, 'release-artifacts/site/robots.txt')),
    root => rm(join(root, 'release-artifacts/manifest.json')),
    root => writeFile(join(root, 'release-artifacts/unmanaged.txt'), 'preserve sibling')
  ]) await withFixture(async root => {
    await buildRelease({ root });
    await mutate(root);
    const before = await tree(join(root, 'release-artifacts'));
    await assert.rejects(checkRelease({ root }), /RELEASE_(?:UNKNOWN|MISSING)_OUTPUT/);
    await assert.rejects(buildRelease({ root }), /RELEASE_(?:UNKNOWN|MISSING)_OUTPUT/);
    assert.deepEqual(await tree(join(root, 'release-artifacts')), before);
  });
});

test('M1B unmanaged/partial preexisting output stops before writes; missing candidate check fails', async () => {
  await withFixture(async root => {
    await assert.rejects(checkRelease({ root }), /RELEASE_NOT_BUILT/);
    await mkdir(join(root, 'release-artifacts'));
    await mkdir(join(root, 'release-artifacts/site'));
    await writeFile(join(root, 'release-artifacts/site/index.html'), 'unmanaged partial candidate');
    const before = await tree(join(root, 'release-artifacts'));
    await assert.rejects(buildRelease({ root }), /RELEASE_MISSING_OUTPUT/);
    assert.deepEqual(await tree(join(root, 'release-artifacts')), before);
  });
});

test('M1B public source change is rejected even if sourceFiles manifest is updated; original candidate remains intact', async () => {
  await withFixture(async root => {
    await buildRelease({ root });
    const file = join(root, 'public/js/app.js');
    await writeFile(file, `${await readFile(file, 'utf8')}\n// changed input\n`);
    const path = join(root, 'release-artifacts/manifest.json');
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    const bytes = await readFile(file);
    Object.assign(manifest.sourceFiles.find(item => item.path === 'js/app.js'), { bytes: bytes.length, sha256: hash(bytes) });
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
    const before = await tree(join(root, 'release-artifacts'));
    await assert.rejects(checkRelease({ root }), /RELEASE_SOURCE_CHANGED/);
    await assert.rejects(buildRelease({ root }), /RELEASE_SOURCE_CHANGED/);
    assert.deepEqual(await tree(join(root, 'release-artifacts')), before);
  });
});

test('M1B unknown source file/header constant source changes reject before creating output', async () => {
  await withFixture(async root => {
    await writeFile(join(root, 'public/extra.js'), 'synthetic unknown');
    await assert.rejects(buildRelease({ root }), /UNKNOWN_FILE/);
    await assert.rejects(access(join(root, 'release-artifacts')), { code: 'ENOENT' });
  });
  await withFixture(async root => {
    await writeFile(join(root, 'scripts/serve.mjs'), '// synthetic changed header source\n');
    await assert.rejects(buildRelease({ root }), /RELEASE_HEADER_SOURCE_CHANGED/);
    await assert.rejects(access(join(root, 'release-artifacts')), { code: 'ENOENT' });
  });
});

test('M1B input/output junctions are rejected without following or overwriting their target', async () => {
  await withFixture(async root => {
    await rename(join(root, 'public/js'), join(root, 'owned-source-target'));
    await symlink(join(root, 'owned-source-target'), join(root, 'public/js'), 'junction');
    await assert.rejects(buildRelease({ root }), /LINK_REJECTED/);
    await assert.rejects(access(join(root, 'release-artifacts')), { code: 'ENOENT' });
  });
  await withFixture(async root => {
    await buildRelease({ root });
    await rename(join(root, 'release-artifacts/site/js'), join(root, 'owned-output-target'));
    await symlink(join(root, 'owned-output-target'), join(root, 'release-artifacts/site/js'), 'junction');
    const before = await tree(join(root, 'owned-output-target'));
    await assert.rejects(checkRelease({ root }), /RELEASE_OUTPUT_LINK/);
    await assert.rejects(buildRelease({ root }), /RELEASE_OUTPUT_LINK/);
    assert.deepEqual(await tree(join(root, 'owned-output-target')), before);
  });
});

test('M2A Wrangler file is the exact assets-only contract with no executable entrypoint, bindings or telemetry', async () => {
  const bytes = await readFile(join(PROJECT_ROOT, 'wrangler.jsonc'));
  const actual = JSON.parse(bytes);
  const expected = {
    name: 'glossquote-tournament-scheduler', compatibility_date: '2026-10-24',
    workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'round-robin.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    build: { command: 'node scripts/release.mjs build' }
  };
  assert.deepEqual(actual, expected);
  assert.deepEqual(bytes, Buffer.from(`${JSON.stringify(expected, null, 2)}\n`));
  assert.deepEqual(await validateDeploymentConfig(), { path: 'wrangler.jsonc', bytes: bytes.length, sha256: hash(bytes) });
});

test('M2A unsafe/unknown Wrangler keys, expanded routes and changed privacy/assets settings reject before output writes', async () => {
  const mutations = [
    value => { value.name = 'wrong-worker'; }, value => { value.compatibility_date = '2026-10-27'; },
    value => { value.workers_dev = true; }, value => { value.preview_urls = true; }, value => { value.send_metrics = true; },
    value => { value.main = 'worker.js'; }, value => { value.vars = { FAKE_VALUE: 'synthetic' }; },
    value => { value.kv_namespaces = [{ binding: 'UNAPPROVED', id: 'synthetic-id' }]; },
    value => { value.account_id = 'synthetic-account'; }, value => { value.env = { production: { workers_dev: true } }; },
    value => { value.routes[0].pattern = '040141.xyz'; }, value => { value.routes[0].custom_domain = false; },
    value => { value.routes.push({ pattern: 'extra.glossquote.com', custom_domain: true }); },
    value => { value.observability.enabled = true; }, value => { value.observability.logs.enabled = true; },
    value => { value.observability.logs.invocation_logs = true; }, value => { value.observability.traces.enabled = true; },
    value => { value.observability.traces.head_sampling_rate = 1; },
    value => { value.assets.directory = '../unapproved'; }, value => { value.assets.run_worker_first = true; },
    value => { value.assets.html_handling = 'auto-trailing-slash'; }, value => { value.assets.not_found_handling = 'single-page-application'; },
    value => { value.build.command = 'npx wrangler deploy'; }, value => { value.build.extra = true; }
  ];
  await withFixture(async root => {
    const original = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
    for (const mutate of mutations) {
      const value = structuredClone(original); mutate(value);
      await writeFile(join(root, 'wrangler.jsonc'), `${JSON.stringify(value, null, 2)}\n`);
      await assert.rejects(validateDeploymentConfig({ root }), /RELEASE_WRANGLER_CONFIG/);
      await assert.rejects(buildRelease({ root }), /RELEASE_WRANGLER_CONFIG/);
      await assert.rejects(checkRelease({ root }), /RELEASE_WRANGLER_CONFIG/);
      await assert.rejects(access(join(root, 'release-artifacts')), { code: 'ENOENT' });
    }
    // Duplicate keys are rejected too; they cannot exploit different JSON/JSONC parser choices.
    await writeFile(join(root, 'wrangler.jsonc'), `${JSON.stringify(original, null, 2).replace('"workers_dev": false,', '"workers_dev": true,\n  "workers_dev": false,')}\n`);
    await assert.rejects(buildRelease({ root }), /RELEASE_WRANGLER_CONFIG/);
  });
});

test('M2A redirects are the three exact 301 aliases with no external target, wildcard, loop or extra rule', async () => {
  await withFixture(async root => {
    const manifest = await buildRelease({ root });
    const bytes = await readFile(join(root, 'release-artifacts/site/_redirects'));
    assert.equal(bytes.toString('utf8'), '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
    const rules = bytes.toString('utf8').trimEnd().split('\n').map(line => line.split(' '));
    assert.deepEqual(rules, [['/', '/index.html', '301'], ['/en', '/en/index.html', '301'], ['/en/', '/en/index.html', '301']]);
    assert.equal(new Set(rules.map(rule => rule[0])).size, 3);
    for (const [from, to, status] of rules) {
      assert.equal(status, '301'); assert.equal(new URL(to, RELEASE_ORIGIN).origin, RELEASE_ORIGIN);
      assert.equal(rules.some(rule => rule[0] === to), false); assert.equal(from.includes('*') || to.includes('*'), false);
    }
    assert.deepEqual(manifest.files.filter(file => file.path === '_redirects'), [{ path: '_redirects', bytes: bytes.length, sha256: hash(bytes) }]);
    await tamper(root, '_redirects', text => text.replace('/en/ /en/index.html 301', '/en/ /en/ 301'));
    const before = await tree(join(root, 'release-artifacts'));
    await assert.rejects(checkRelease({ root }), /RELEASE_MANIFEST_CHANGED/);
    await assert.rejects(buildRelease({ root }), /RELEASE_MANIFEST_CHANGED/);
    assert.deepEqual(await tree(join(root, 'release-artifacts')), before);
  });
});

test('M2A configuration hardlinks and directories reject without reading unrelated targets or creating output', async () => {
  await withFixture(async root => {
    await link(join(root, 'wrangler.jsonc'), join(root, 'owned-config-alias'));
    await assert.rejects(validateDeploymentConfig({ root }), /RELEASE_WRANGLER_FILE/);
    await assert.rejects(buildRelease({ root }), /RELEASE_WRANGLER_FILE/);
    await assert.rejects(access(join(root, 'release-artifacts')), { code: 'ENOENT' });
  });
  await withFixture(async root => {
    await rm(join(root, 'wrangler.jsonc'));
    await mkdir(join(root, 'wrangler.jsonc'));
    await assert.rejects(validateDeploymentConfig({ root }), /RELEASE_WRANGLER_FILE/);
    await assert.rejects(access(join(root, 'release-artifacts')), { code: 'ENOENT' });
  });
});

test('M2A check CLI resolves its module graph and validates configuration without an unsettled top-level await', () => {
  const result = spawnSync(process.execPath, ['scripts/check.mjs'], { cwd: PROJECT_ROOT, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000, maxBuffer: 262144 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /fixed assets-only Wrangler configuration/u);
});
