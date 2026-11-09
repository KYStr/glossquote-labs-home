import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, copyFile, readFile, writeFile, readdir, lstat, rm, rename, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, publicFiles } from '../scripts/files.mjs';
import { checkDeploymentConfig } from '../scripts/deployment-config.mjs';
import { buildRelease, checkRelease } from '../scripts/release.mjs';

// Task-authored expected config, independent of the implementation constant.
const expectedConfig = {
  name: 'glossquote-quote-builder', compatibility_date: '2026-10-24', workers_dev: false, preview_urls: false, send_metrics: false,
  routes: [{ pattern: 'quote.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
  build: { command: 'node scripts/release.mjs build' },
};
const expectedRedirects = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(work) {
  const parent = path.resolve(root, 'test/.scratch');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'm2a-owned-'));
  try {
    await copyFile(path.join(root, 'wrangler.jsonc'), path.join(directory, 'wrangler.jsonc'));
    for (const file of publicFiles) {
      const target = path.join(directory, 'public', file);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(root, 'public', file), target);
    }
    await work(directory);
  } finally {
    const verified = path.resolve(directory);
    if (path.dirname(verified) !== parent || !path.basename(verified).startsWith('m2a-owned-')) throw new Error('UNSAFE_TEST_CLEANUP');
    await rm(verified, { recursive: true, force: false });
  }
}
async function outputSnapshot(directory) {
  const entries = [];
  async function walk(relative = '') {
    const base = path.join(directory, 'release-artifacts', relative);
    const stat = await lstat(base);
    assert.equal(stat.isSymbolicLink(), false);
    if (stat.isDirectory()) { entries.push({ path: relative, directory: true }); for (const name of (await readdir(base)).sort()) await walk(relative ? `${relative}/${name}` : name); }
    else { const bytes = await readFile(base); entries.push({ path: relative, bytes: bytes.length, sha256: sha(bytes), mtimeMs: stat.mtimeMs }); }
  }
  await walk(); return entries;
}
async function rejectedWithoutOverwrite(directory, pattern = /RELEASE_/) {
  const snapshot = await outputSnapshot(directory);
  await assert.rejects(checkRelease(directory), pattern);
  await assert.rejects(buildRelease(directory), pattern);
  assert.deepEqual(await outputSnapshot(directory), snapshot);
}
async function saveManifest(directory, manifest) { await writeFile(path.join(directory, 'release-artifacts/manifest.json'), JSON.stringify(manifest, null, 2) + '\n'); }

test('M2A: exact assets-only deploy contract, no executable/bindings/additional route or telemetry', async () => fixture(async directory => {
  const config = await checkDeploymentConfig(directory);
  assert.deepEqual(config, expectedConfig);
  assert.equal(Object.hasOwn(config, 'main'), false);
  assert.equal(Object.hasOwn(config, 'account_id'), false);
  assert.equal(Object.hasOwn(config, 'vars'), false);
  assert.equal(config.routes.length, 1);
  assert.equal(config.routes[0].pattern, 'quote.glossquote.com');
}));

test('M2A: exact three 301 entries, one-hop canonical policy and complete redirect manifest entry (offline)', async () => fixture(async directory => {
  await buildRelease(directory);
  const bytes = await readFile(path.join(directory, 'release-artifacts/site/_redirects'));
  assert.equal(bytes.toString('utf8'), expectedRedirects);
  const rules = bytes.toString('utf8').trimEnd().split('\n').map(line => line.split(' '));
  assert.deepEqual(rules, [['/', '/index.html', '301'], ['/en', '/en/index.html', '301'], ['/en/', '/en/index.html', '301']]);
  const routes = new Map(rules.map(([source, target, status]) => [source, { target, status }]));
  for (const [source, expected] of [['/', '/index.html'], ['/en', '/en/index.html'], ['/en/', '/en/index.html']]) {
    let current = source, hops = 0;
    while (routes.has(current) && hops < 5) { const route = routes.get(current); assert.equal(route.status, '301'); current = route.target; hops++; }
    assert.equal(hops, 1); assert.equal(current, expected);
    const html = await readFile(path.join(directory, 'release-artifacts/site', current.slice(1)), 'utf8');
    assert.ok(html.includes(`<link rel="canonical" href="https://quote.glossquote.com${current}">`));
  }
  const manifest = JSON.parse(await readFile(path.join(directory, 'release-artifacts/manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 12);
  assert.deepEqual(manifest.files.find(file => file.path === '_redirects'), { path: '_redirects', bytes: 65, sha256: sha(Buffer.from(expectedRedirects)) });
  assert.equal(manifest.files.filter(file => file.path === '_redirects').length, 1);
  assert.equal(manifest.sourceFiles.length, 8);
  assert.equal(manifest.sourceFiles.some(file => file.path === '_redirects' || file.path === 'wrangler.jsonc'), false);
}));

test('M2A: redirects + manifest jointly changed cannot bless 302 or an additional external redirect', async () => fixture(async directory => {
  await buildRelease(directory);
  const redirects = path.join(directory, 'release-artifacts/site/_redirects');
  const tampered = Buffer.from(expectedRedirects.replace('/ /index.html 301', '/ /index.html 302'));
  await writeFile(redirects, tampered);
  const manifest = JSON.parse(await readFile(path.join(directory, 'release-artifacts/manifest.json'), 'utf8'));
  Object.assign(manifest.files.find(file => file.path === '_redirects'), { bytes: tampered.length, sha256: sha(tampered) });
  await saveManifest(directory, manifest);
  await rejectedWithoutOverwrite(directory);
  const unsafe = Buffer.from(expectedRedirects + '/extra https://example.invalid/ 301\n');
  await writeFile(redirects, unsafe);
  Object.assign(manifest.files.find(file => file.path === '_redirects'), { bytes: unsafe.length, sha256: sha(unsafe) });
  await saveManifest(directory, manifest);
  await rejectedWithoutOverwrite(directory);
}));

test('M2A: fail closed on config drift before any overwrite of valid outputs', async () => fixture(async directory => {
  await buildRelease(directory);
  const mutations = [
    value => { value.name = 'another-tool'; }, value => { value.compatibility_date = '2026-10-27'; },
    value => { value.workers_dev = true; }, value => { value.preview_urls = true; }, value => { value.send_metrics = true; },
    value => { value.routes[0].pattern = 'other.glossquote.com'; }, value => { value.routes[0].custom_domain = false; },
    value => { value.routes.push({ pattern: '*.glossquote.com', custom_domain: true }); },
    value => { value.observability.enabled = true; }, value => { value.observability.logs.enabled = true; },
    value => { value.observability.logs.invocation_logs = true; }, value => { value.observability.traces.enabled = true; },
    value => { value.assets.directory = '../another-tool'; }, value => { value.assets.run_worker_first = true; },
    value => { value.assets.html_handling = 'auto-trailing-slash'; }, value => { value.assets.not_found_handling = 'single-page-application'; },
    value => { value.build.command = 'npm install'; }, value => { value.main = 'worker.js'; },
    value => { value.vars = { SYNTHETIC_SETTING: 'unapproved' }; }, value => { value.observability.logs.enabled = 'false'; },
  ];
  for (const mutate of mutations) {
    const altered = structuredClone(expectedConfig); mutate(altered);
    await writeFile(path.join(directory, 'wrangler.jsonc'), JSON.stringify(altered));
    await rejectedWithoutOverwrite(directory, /RELEASE_DEPLOYMENT_CONFIG_CHANGED/);
  }
}));

test('M2A: missing/malformed/oversize/junction configuration is rejected before creating release output', async () => fixture(async directory => {
  const config = path.join(directory, 'wrangler.jsonc');
  await rename(config, path.join(directory, 'config-before.json'));
  await assert.rejects(buildRelease(directory), { code: 'ENOENT' });
  await writeFile(config, '{"name":');
  await assert.rejects(buildRelease(directory), /RELEASE_DEPLOYMENT_CONFIG_PARSE/);
  await writeFile(config, ' '.repeat(65537));
  await assert.rejects(buildRelease(directory), /RELEASE_DEPLOYMENT_CONFIG_FILE/);
  await rm(config);
  const linkTarget = path.join(directory, 'config-directory'); await mkdir(linkTarget);
  await writeFile(path.join(linkTarget, 'sentinel'), 'do not modify');
  await symlink(linkTarget, config, 'junction');
  await assert.rejects(buildRelease(directory), /RELEASE_DEPLOYMENT_CONFIG_FILE/);
  assert.equal(await readFile(path.join(linkTarget, 'sentinel'), 'utf8'), 'do not modify');
  await assert.rejects(lstat(path.join(directory, 'release-artifacts')), { code: 'ENOENT' });
}));

test('M2A: previous candidate-shaped output is not silently repaired, deleted or upgraded by build', async () => fixture(async directory => {
  await buildRelease(directory);
  const manifest = JSON.parse(await readFile(path.join(directory, 'release-artifacts/manifest.json'), 'utf8'));
  await rm(path.join(directory, 'release-artifacts/site/_redirects'));
  manifest.files = manifest.files.filter(file => file.path !== '_redirects');
  for (const [file, from, to] of [['index.html', '<span>不自動儲存草稿</span>', '<span>本地候選版本 · 不自動儲存草稿</span>'], ['en/index.html', '<span>Drafts are not saved automatically</span>', '<span>Local candidate · Drafts are not saved automatically</span>']]) {
    const target = path.join(directory, 'release-artifacts/site', file);
    const bytes = Buffer.from((await readFile(target, 'utf8')).replace(from, to)); await writeFile(target, bytes);
    Object.assign(manifest.files.find(entry => entry.path === file), { bytes: bytes.length, sha256: sha(bytes) });
  }
  await saveManifest(directory, manifest);
  await rejectedWithoutOverwrite(directory);
}));
