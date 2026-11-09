import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { root } from './files.mjs';
function reject(code) { const error = new Error(code); error.code = code; throw error; }
export const ASSETS_ONLY_CONFIG = Object.freeze({
  name: 'glossquote-labs-bookmark-organizer',
  compatibility_date: '2026-10-24',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  routes: Object.freeze([Object.freeze({ pattern: 'bookmarks.glossquote.com', custom_domain: true })]),
  observability: Object.freeze({ enabled: false, logs: Object.freeze({ enabled: false, invocation_logs: false }), traces: Object.freeze({ enabled: false }) }),
  assets: Object.freeze({ directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }),
  build: Object.freeze({ command: 'node scripts/release.mjs build' })
});
export const ASSETS_ONLY_CONFIG_BYTES = Buffer.from(JSON.stringify(ASSETS_ONLY_CONFIG, null, 2) + '\n');
// A deliberately canonical strict-JSON subset of JSONC. This rejects duplicate keys,
// comments, overrides and alternate spellings as well as unknown/type-changed fields.
export function validateDeploymentConfig(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 8192) reject('RELEASE_CONFIG_FORMAT');
  let parsed;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { reject('RELEASE_CONFIG_JSON'); }
  if (JSON.stringify(parsed) !== JSON.stringify(ASSETS_ONLY_CONFIG)) reject('RELEASE_CONFIG_CONTRACT');
  if (!bytes.equals(ASSETS_ONLY_CONFIG_BYTES)) reject('RELEASE_CONFIG_FORMAT');
  return parsed;
}
export async function checkDeploymentConfig() {
  const file = path.join(root, 'wrangler.jsonc');
  let info;
  try { info = await lstat(file); } catch { reject('RELEASE_CONFIG_MISSING'); }
  if (!info.isFile() || info.isSymbolicLink()) reject('RELEASE_CONFIG_TYPE');
  const bytes = await readFile(file);
  validateDeploymentConfig(bytes);
  return bytes;
}
