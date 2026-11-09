import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Fixed M2A authority: no Worker entry, bindings, variables or credentials.
// Exact canonical bytes reject extra fields, duplicate keys and alternate
// environments instead of silently expanding deployment authority.
export const DEPLOYMENT_CONFIG = Object.freeze({
  name: 'glossquote-image-overlay',
  compatibility_date: '2026-10-24',
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  observability: {
    enabled: false,
    logs: { enabled: false, invocation_logs: false },
    traces: { enabled: false }
  },
  build: { command: 'node scripts/release.mjs build' },
  assets: {
    directory: './release-artifacts/site',
    run_worker_first: false,
    html_handling: 'none',
    not_found_handling: 'none'
  },
  routes: [{ pattern: 'image-proof.glossquote.com', custom_domain: true }]
});
const CONFIG_BYTES = Buffer.from(`${JSON.stringify(DEPLOYMENT_CONFIG,null,2)}\n`,'utf8');

export async function deploymentConfig(root) {
  const path=join(root,'wrangler.jsonc');
  let stat;
  try {stat=await lstat(path);}
  catch(error) {if(error.code==='ENOENT')throw new Error('RELEASE_CONFIG_MISSING');throw error;}
  if(stat.isSymbolicLink() || !stat.isFile())throw new Error('RELEASE_CONFIG_UNSAFE');
  if(stat.size!==CONFIG_BYTES.length)throw new Error('RELEASE_CONFIG_CHANGED');
  const bytes=await readFile(path);
  if(!bytes.equals(CONFIG_BYTES))throw new Error('RELEASE_CONFIG_CHANGED');
  return bytes;
}
