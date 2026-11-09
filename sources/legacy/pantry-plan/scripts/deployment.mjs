import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './files.mjs';

// Closed, assets-only deployment profile approved for B20-54-M2A.
const CONFIGURATION = {
  name: 'glossquote-pantry-plan',
  compatibility_date: '2026-10-24',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  routes: [{ pattern: 'shopping-list.glossquote.com', custom_domain: true }],
  observability: {
    enabled: false,
    logs: { enabled: false, invocation_logs: false },
    traces: { enabled: false },
  },
  assets: {
    directory: './release-artifacts/site',
    run_worker_first: false,
    html_handling: 'none',
    not_found_handling: 'none',
  },
  build: { command: 'node scripts/release.mjs build' },
};
const expected = Buffer.from(`${JSON.stringify(CONFIGURATION, null, 2)}\n`);

export const REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';

export async function validateDeployment(root = ROOT) {
  const path = join(root, 'wrangler.jsonc'), stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('UNSAFE_DEPLOYMENT_CONFIG');
  // Canonical bytes also reject duplicate keys, comments, unknown fields and BOMs.
  if (!(await readFile(path)).equals(expected)) throw new Error('DEPLOYMENT_CONFIG_MISMATCH');
  return { deploymentConfig: 'wrangler.jsonc', deploymentMode: 'assets-only' };
}
