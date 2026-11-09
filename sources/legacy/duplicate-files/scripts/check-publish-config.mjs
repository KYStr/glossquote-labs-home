import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './check.mjs';

// A narrow, deterministic contract check; not a Wrangler schema/dry-run claim.
export function validatePublishConfig(config) {
  assert.deepEqual(config, {
    name: 'glossquote-duplicate-files', compatibility_date: '2026-10-24',
    workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'duplicates.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    build: { command: 'node scripts/release.mjs build' }
  }, 'Publish config must match the bounded pure-static M2A policy');
  return config;
}
export async function readPublishConfig(root = ROOT) {
  const path = resolve(root, 'wrangler.jsonc'), stat = await lstat(path);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Config must be a regular file');
  // This .jsonc deliberately uses the valid strict-JSON subset; no dependency.
  return validatePublishConfig(JSON.parse(await readFile(path, 'utf8')));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2, 'No config overrides are accepted');
  await readPublishConfig();
  console.log('PASS pure-static publish config: fixed 2026-10-24 / duplicates domain / no Worker code / metrics and observability disabled; no Wrangler execution');
}
