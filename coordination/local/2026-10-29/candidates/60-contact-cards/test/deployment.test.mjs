import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, lstat, rm, unlink, mkdir, link } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildRelease, checkRelease, validateReleaseConfig } from '../scripts/release.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const expectedConfig = {
  name: 'glossquote-contact-cards', compatibility_date: '2026-10-24', workers_dev: false, preview_urls: false, send_metrics: false,
  build: { command: 'node scripts/release.mjs build' }, routes: [{ pattern: 'contacts.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function fixture(t, built = false) {
  const parent = resolve(ROOT, 'test'), root = await mkdtemp(join(parent, '.deployment-scratch-'));
  t.after(async () => {
    const exact = resolve(root); assert.ok(exact.startsWith(parent + sep) && exact.slice(parent.length + 1).startsWith('.deployment-scratch-')); assert.equal((await lstat(exact)).isSymbolicLink(), false); await rm(exact, { recursive: true });
  });
  await cp(join(ROOT, 'public'), join(root, 'public'), { recursive: true });
  await cp(join(ROOT, 'wrangler.jsonc'), join(root, 'wrangler.jsonc'));
  if (built) await buildRelease(root); return root;
}
const manifestPath = (root) => join(root, 'release-artifacts/manifest.json');
const readManifest = async (root) => JSON.parse(await readFile(manifestPath(root), 'utf8'));
const saveConfig = (root, value) => writeFile(join(root, 'wrangler.jsonc'), JSON.stringify(value, null, 2) + '\n');

test('M2A exact assets-only configuration; all observation, metrics and public preview flags false', async (t) => {
  const root = await fixture(t), bytes = await readFile(join(root, 'wrangler.jsonc'));
  assert.deepEqual(JSON.parse(bytes), expectedConfig);
  assert.equal(bytes.toString(), JSON.stringify(expectedConfig, null, 2) + '\n');
  for (const forbidden of ['main', 'vars', 'env', 'account_id', 'compatibility_flags', 'kv_namespaces', 'r2_buckets', 'd1_databases', 'durable_objects', 'services']) assert.equal(Object.hasOwn(JSON.parse(bytes), forbidden), false);
  assert.deepEqual(await validateReleaseConfig(root), { path: 'wrangler.jsonc', bytes: bytes.length, sha256: sha(bytes) });
});
test('M2A exact three 301 redirect lines, terminal LF, generated only in release site', async (t) => {
  const root = await fixture(t, true), bytes = await readFile(join(root, 'release-artifacts/site/_redirects'));
  assert.ok(bytes.equals(Buffer.from('/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n')));
  assert.equal(bytes.at(-1), 10); assert.equal(bytes.includes(13), false); assert.equal(bytes.toString().split('\n').length, 4);
  await assert.rejects(readFile(join(root, 'public/_redirects')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(root, 'release-artifacts/site/wrangler.jsonc')), { code: 'ENOENT' });
  const manifest = await readManifest(root); assert.equal(manifest.files.length, 11); assert.equal(manifest.configFiles.length, 1); assert.equal(manifest.sourceFiles.length, 9);
});
for (const [name, mutate] of [
  ['workers_dev true', (c) => { c.workers_dev = true; }],
  ['preview_urls true', (c) => { c.preview_urls = true; }],
  ['send_metrics true', (c) => { c.send_metrics = true; }],
  ['observability enabled', (c) => { c.observability.enabled = true; }],
  ['logs enabled', (c) => { c.observability.logs.enabled = true; }],
  ['invocation logs enabled', (c) => { c.observability.logs.invocation_logs = true; }],
  ['traces enabled', (c) => { c.observability.traces.enabled = true; }],
  ['worker first', (c) => { c.assets.run_worker_first = true; }],
  ['HTML auto redirects', (c) => { c.assets.html_handling = 'auto-trailing-slash'; }],
  ['SPA fallback', (c) => { c.assets.not_found_handling = 'single-page-application'; }],
  ['wrong compatibility date', (c) => { c.compatibility_date = '2026-10-25'; }],
  ['wrong domain', (c) => { c.routes[0].pattern = '040141.xyz'; }],
  ['script main', (c) => { c.main = 'worker.js'; }],
  ['vars', (c) => { c.vars = { SYNTHETIC: 'not-permitted' }; }],
  ['binding', (c) => { c.assets.binding = 'ASSETS'; }],
  ['environment override', (c) => { c.env = { production: { send_metrics: true } }; }]
]) test(`M2A config rejects ${name} before any release output is created`, async (t) => {
  const root = await fixture(t), config = structuredClone(expectedConfig); mutate(config); await saveConfig(root, config);
  await assert.rejects(buildRelease(root), { code: 'CONFIG_MISMATCH' });
  await assert.rejects(lstat(join(root, 'release-artifacts')), { code: 'ENOENT' });
});
test('M2A missing, malformed and duplicate-key configuration are rejected without output', async (t) => {
  const root = await fixture(t), path = join(root, 'wrangler.jsonc'); await unlink(path);
  await assert.rejects(buildRelease(root), { code: 'CONFIG_MISSING' });
  await writeFile(path, '{invalid}'); await assert.rejects(buildRelease(root), { code: 'CONFIG_JSON' });
  await writeFile(path, JSON.stringify(expectedConfig).replace('"workers_dev":false', '"workers_dev":true,"workers_dev":false'));
  await assert.rejects(buildRelease(root), { code: 'CONFIG_MISMATCH' });
  await assert.rejects(lstat(join(root, 'release-artifacts')), { code: 'ENOENT' });
});
test('M2A config+manifest co-tampering cannot allow metrics or overwrite existing output', async (t) => {
  const root = await fixture(t, true), config = structuredClone(expectedConfig); config.send_metrics = true; await saveConfig(root, config);
  const manifest = await readManifest(root), bytes = await readFile(join(root, 'wrangler.jsonc'));
  manifest.configFiles[0] = { path: 'wrangler.jsonc', bytes: bytes.length, sha256: sha(bytes) };
  const poisoned = JSON.stringify(manifest, null, 2) + '\n'; await writeFile(manifestPath(root), poisoned);
  const assetBefore = await readFile(join(root, 'release-artifacts/site/index.html'));
  await assert.rejects(checkRelease(root), { code: 'CONFIG_MISMATCH' }); await assert.rejects(buildRelease(root), { code: 'CONFIG_MISMATCH' });
  assert.equal(await readFile(manifestPath(root), 'utf8'), poisoned); assert.ok(assetBefore.equals(await readFile(join(root, 'release-artifacts/site/index.html'))));
});
test('M2A redirect+manifest co-tampering is rejected and retained for review', async (t) => {
  const root = await fixture(t, true), path = join(root, 'release-artifacts/site/_redirects');
  const poisoned = Buffer.from('/ /index.html 302\n/en /en/index.html 301\n/en/ /en/index.html 301\n'); await writeFile(path, poisoned);
  const manifest = await readManifest(root), row = manifest.files.find((file) => file.path === '_redirects'); row.bytes = poisoned.length; row.sha256 = sha(poisoned);
  await writeFile(manifestPath(root), JSON.stringify(manifest, null, 2) + '\n');
  await assert.rejects(checkRelease(root), { code: 'MANIFEST_MISMATCH' }); await assert.rejects(buildRelease(root), { code: 'MANIFEST_MISMATCH' }); assert.ok(poisoned.equals(await readFile(path)));
});
test('M2A missing redirect, extra redirect and config manifest tampering are rejected', async (t) => {
  const root = await fixture(t, true), path = join(root, 'release-artifacts/site/_redirects'), original = await readFile(path);
  await unlink(path); await assert.rejects(checkRelease(root), { code: 'MISSING_FILE' });
  await writeFile(path, Buffer.concat([original, Buffer.from('/extra /index.html 301\n')])); await assert.rejects(checkRelease(root), { code: 'ARTIFACT_MISMATCH' });
  await writeFile(path, original); const manifest = await readManifest(root); manifest.configFiles = [];
  await writeFile(manifestPath(root), JSON.stringify(manifest, null, 2) + '\n'); await assert.rejects(checkRelease(root), { code: 'MANIFEST_MISMATCH' });
});
test('M2A non-file or hardlinked config is rejected without following alternate data', async (t) => {
  const root = await fixture(t), path = join(root, 'wrangler.jsonc'); await link(path, join(root, 'synthetic-hardlink'));
  await assert.rejects(validateReleaseConfig(root), { code: 'CONFIG_UNSAFE' }); await unlink(path); await mkdir(path);
  await assert.rejects(validateReleaseConfig(root), { code: 'CONFIG_UNSAFE' });
});
