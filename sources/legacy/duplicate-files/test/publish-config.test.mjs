import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, lstat, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { validatePublishConfig, readPublishConfig } from '../scripts/check-publish-config.mjs';
import { ROOT } from '../scripts/check.mjs';

test('M2A Wrangler is pure static, exact domain/build/date and every privacy toggle is disabled', async () => {
  const config = await readPublishConfig();
  assert.deepEqual(Object.keys(config), ['name', 'compatibility_date', 'workers_dev', 'preview_urls', 'send_metrics', 'routes', 'observability', 'assets', 'build']);
  assert.equal(config.name, 'glossquote-duplicate-files'); assert.equal(config.compatibility_date, '2026-10-24');
  assert.deepEqual(config.routes, [{ pattern: 'duplicates.glossquote.com', custom_domain: true }]);
  assert.deepEqual([config.workers_dev, config.preview_urls, config.send_metrics, config.observability.enabled, config.observability.logs.enabled, config.observability.logs.invocation_logs, config.observability.traces.enabled], Array(7).fill(false));
  assert.equal(config.assets.directory, './release-artifacts/site'); assert.equal(config.assets.run_worker_first, false);
  assert.equal(config.assets.html_handling, 'none'); assert.equal(config.assets.not_found_handling, 'none');
  assert.equal(config.build.command, 'node scripts/release.mjs build');
  for (const field of ['main', 'account_id', 'vars', 'services', 'r2_buckets', 'kv_namespaces', 'd1_databases', 'triggers', 'env']) assert(!(field in config));
});

test('M2A rejects the superseded future date, unknown resources, telemetry, extra domains and unsafe build/assets', async () => {
  const original = JSON.parse(await readFile(resolve(ROOT, 'wrangler.jsonc'), 'utf8'));
  const mutations = [
    config => { config.compatibility_date = '2026-10-25'; }, config => { config.name = 'wrong'; },
    ...['workers_dev', 'preview_urls', 'send_metrics'].map(field => config => { config[field] = true; }),
    config => { config.observability.enabled = true; }, config => { config.observability.logs.enabled = true; },
    config => { config.observability.logs.invocation_logs = true; }, config => { config.observability.traces.enabled = true; },
    config => { delete config.observability.logs.invocation_logs; }, config => { config.main = 'runtime-worker.js'; },
    config => { config.vars = { SYNTHETIC: 'NO' }; }, config => { config.routes.push({ pattern: 'other.glossquote.com', custom_domain: true }); },
    config => { config.routes[0].pattern = '040141.xyz'; }, config => { config.routes[0].custom_domain = false; },
    config => { config.assets.directory = '../outside'; }, config => { config.assets.run_worker_first = true; },
    config => { config.assets.html_handling = 'auto-trailing-slash'; }, config => { config.assets.not_found_handling = 'single-page-application'; },
    config => { config.build.command = 'SYNTHETIC_UNAUTHORIZED_COMMAND'; }, config => { config.send_metrics = 'false'; }
  ];
  for (const mutate of mutations) { const config = structuredClone(original); mutate(config); assert.throws(() => validatePublishConfig(config)); }
});

test('M2A config parser rejects malformed or unreviewed values in a task-owned copy', async () => {
  const directory = await mkdtemp(resolve(ROOT, 'test/.tmp-config-'));
  try {
    const path = resolve(directory, 'wrangler.jsonc');
    for (const text of ['not JSON', '{}', '{"name":"wrong"}', 'null']) { await writeFile(path, text); await assert.rejects(readPublishConfig(directory)); }
    await assert.rejects(readPublishConfig(resolve(directory, 'absent')), { code: 'ENOENT' });
  } finally {
    const inside = relative(resolve(ROOT, 'test'), directory);
    assert(!isAbsolute(inside) && inside.startsWith('.tmp-config-') && !inside.includes('..') && !/[\\/]/.test(inside));
    const stat = await lstat(directory); assert(stat.isDirectory() && !stat.isSymbolicLink()); await rm(directory, { recursive: true });
  }
});
