import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { PROJECT_ROOT, ProjectError } from './files.mjs';

export const ENTRY_REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';

export function expectedWranglerConfig() {
  return {
    name: 'glossquote-agenda-conflicts', compatibility_date: '2026-10-24', workers_dev: false, preview_urls: false, send_metrics: false,
    build: { command: 'node scripts/release.mjs build' }, routes: [{ pattern: 'agenda-check.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }
  };
}

export async function checkDeploymentConfig(root = PROJECT_ROOT) {
  const target = path.join(root, 'wrangler.jsonc');
  let info;
  try { info = await lstat(target); } catch { throw new ProjectError('DEPLOY_CONFIG_MISSING'); }
  if (!info.isFile() || info.isSymbolicLink() || info.size > 16384) throw new ProjectError('DEPLOY_CONFIG_TYPE');
  const bytes = await readFile(target);
  let actual;
  try { actual = JSON.parse(bytes.toString('utf8')); } catch { throw new ProjectError('DEPLOY_CONFIG_JSON'); }
  const expected = expectedWranglerConfig();
  if (!isDeepStrictEqual(actual, expected)) throw new ProjectError('DEPLOY_CONFIG_POLICY');
  // A strict canonical JSON subset of JSONC also rejects duplicate keys/comments
  // and formatting-only mutations instead of silently accepting another input.
  const canonical = Buffer.from(`${JSON.stringify(expected, null, 2)}\n`);
  if (!bytes.equals(canonical)) throw new ProjectError('DEPLOY_CONFIG_BYTES');
  return { path: 'wrangler.jsonc', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
