import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { root } from './files.mjs';

export const expectedDeploymentConfig = Object.freeze({
  name: 'glossquote-quote-builder',
  compatibility_date: '2026-10-24',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  routes: [{ pattern: 'quote.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
  build: { command: 'node scripts/release.mjs build' },
});

function exactValue(actual, expected) {
  if (actual === expected) return true;
  if (actual === null || expected === null || typeof actual !== 'object' || typeof expected !== 'object') return false;
  if (Array.isArray(actual) !== Array.isArray(expected)) return false;
  const keys = Object.keys(actual).sort(), expectedKeys = Object.keys(expected).sort();
  return keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index] && exactValue(actual[key], expected[key]));
}

export async function checkDeploymentConfig(rootDirectory = root) {
  const file = path.join(rootDirectory, 'wrangler.jsonc');
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536 || await realpath(file) !== path.resolve(file)) throw new Error('RELEASE_DEPLOYMENT_CONFIG_FILE');
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(file))); }
  catch { throw new Error('RELEASE_DEPLOYMENT_CONFIG_PARSE'); }
  if (!exactValue(value, expectedDeploymentConfig)) throw new Error('RELEASE_DEPLOYMENT_CONFIG_CHANGED');
  return value;
}
