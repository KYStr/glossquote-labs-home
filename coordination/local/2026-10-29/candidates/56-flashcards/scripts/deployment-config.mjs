import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './files.mjs';

// The complete M2A contract: no executable Worker, binding, environment override or extra route.
const CONTRACT = {
  name: 'glossquote-flashcards',
  compatibility_date: '2026-10-24',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  routes: [{ pattern: 'flashcards.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
  build: { command: 'node scripts/release.mjs build' }
};
function matches(value, expected) {
  if (expected === null || typeof expected !== 'object') return value === expected;
  if (Array.isArray(expected)) return Array.isArray(value) && value.length === expected.length && expected.every((item, index) => matches(value[index], item));
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === Object.keys(expected).length && Object.keys(expected).every(key => Object.hasOwn(value, key) && matches(value[key], expected[key]));
}
export function readDeploymentConfig(root = ROOT) {
  const path = 'wrangler.jsonc', absolute = join(root, path), info = lstatSync(absolute, { throwIfNoEntry: false });
  if (!info?.isFile() || info.isSymbolicLink() || info.size > 8192) throw new Error('DEPLOY_CONFIG_FILE');
  const bytes = readFileSync(absolute); let text, value;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); value = JSON.parse(text); }
  catch { throw new Error('DEPLOY_CONFIG_JSON'); }
  if (!matches(value, CONTRACT)) throw new Error('DEPLOY_CONFIG_CONTRACT');
  // Canonical plain JSON is valid JSONC and rejects duplicate keys, BOM and ambiguous comments.
  if (text !== `${JSON.stringify(value, null, 2)}\n`) throw new Error('DEPLOY_CONFIG_FORMAT');
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
