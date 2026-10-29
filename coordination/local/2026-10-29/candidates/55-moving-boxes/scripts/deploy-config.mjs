import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';

const CONFIG = JSON.stringify({
  name: 'glossquote-moving-boxes',
  compatibility_date: '2026-10-24',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  routes: [{ pattern: 'moving-boxes.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
  build: { command: 'node scripts/release.mjs build' }
}, null, 2) + '\n';

// Exact reviewed bytes close the schema, including nested objects and command/domain overrides.
// This reads only the project config; it never invokes Wrangler or reads account credentials.
export async function validateDeploymentConfig(root) {
  const file = path.join(root, 'wrangler.jsonc');
  let stat;
  try { stat = await lstat(file); }
  catch (error) { if (error.code === 'ENOENT') throw new Error('MISSING_DEPLOY_CONFIG'); throw error; }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) throw new Error('UNSAFE_DEPLOY_CONFIG');
  const bytes = await readFile(file);
  if (!bytes.equals(Buffer.from(CONFIG))) throw new Error('DEPLOY_CONFIG_MISMATCH');
  return bytes;
}
