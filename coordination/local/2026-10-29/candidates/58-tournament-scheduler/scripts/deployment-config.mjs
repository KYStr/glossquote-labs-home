import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Independent from check/release modules so a check CLI top-level await never
// waits for a module that imports its still-evaluating entrypoint.
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = code => { throw new Error(code); };
export const WRANGLER_CONFIG = Object.freeze({
  name: 'glossquote-tournament-scheduler',
  compatibility_date: '2026-10-24',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  routes: Object.freeze([Object.freeze({ pattern: 'round-robin.glossquote.com', custom_domain: true })]),
  observability: Object.freeze({ enabled: false, logs: Object.freeze({ enabled: false, invocation_logs: false }), traces: Object.freeze({ enabled: false }) }),
  assets: Object.freeze({ directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }),
  build: Object.freeze({ command: 'node scripts/release.mjs build' })
});

export async function validateDeploymentConfig(options = { root: defaultRoot }) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).join('|') !== 'root' || typeof options.root !== 'string') fail('RELEASE_OPTIONS');
  const root = resolve(options.root), normalized = value => process.platform === 'win32' ? value.toLowerCase() : value;
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || normalized(await realpath(root)) !== normalized(root)) fail('RELEASE_LINK_OR_DIRECTORY');
  const path = join(root, 'wrangler.jsonc'), info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 16384) fail('RELEASE_WRANGLER_FILE');
  const bytes = await readFile(path);
  // Canonical JSON in .jsonc rejects unknown/duplicate keys, expanded routes,
  // bindings/entrypoints and telemetry without ambiguous parser behavior.
  if (!bytes.equals(Buffer.from(`${JSON.stringify(WRANGLER_CONFIG, null, 2)}\n`, 'utf8'))) fail('RELEASE_WRANGLER_CONFIG');
  return { path: 'wrangler.jsonc', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
