#!/usr/bin/env node
// Checks the generated preview output (dist-preview/).
// Usage: node scripts/check-generated.mjs
// Verifies: dist-preview exists, its file set equals public/ plus the
// generated js/worker-source.mjs, the embedded worker source is exactly
// the core bytes plus the fixed handler (hash match), and the generated
// pages still carry the preview noindex metadata. Exit 0 = pass.

import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files;
}

async function main() {
  const outDir = path.join(root, 'dist-preview');
  try {
    await stat(outDir);
  } catch {
    fail('dist-preview missing: run "npm run build:preview" first');
    process.exit(1);
  }

  const publicFiles = await listFiles(path.join(root, 'public'));
  const generatedFiles = await listFiles(outDir);
  const expected = [...publicFiles, 'js/worker-source.mjs'].sort();
  if (JSON.stringify(generatedFiles) !== JSON.stringify(expected)) {
    fail(`dist-preview file set mismatch: got ${generatedFiles.join(', ')}`);
  } else {
    console.log(`ok: dist-preview file set (${generatedFiles.length} files)`);
  }

  // Generated worker source must be exactly core + handler bytes.
  const core = await readFile(path.join(root, 'public/js/core/validate.mjs'), 'utf8');
  const handler = await readFile(path.join(root, 'scripts/worker-handler.mjs'), 'utf8');
  const expectedSource = `${core}\n${handler}`;
  const expectedHash = sha256(Buffer.from(expectedSource, 'utf8'));
  const generatedPath = path.join(outDir, 'js/worker-source.mjs');
  const generatedModule = await import(`file://${generatedPath}?v=${expectedHash}`);
  if (generatedModule.WORKER_SOURCE !== expectedSource) {
    fail('worker-source.mjs: embedded source does not equal core + handler bytes');
  }
  if (generatedModule.WORKER_SOURCE_SHA256 !== expectedHash) {
    fail('worker-source.mjs: embedded SHA-256 does not match recomputed hash');
  }
  console.log(`ok: worker source embedded exactly (sha256 ${expectedHash.slice(0, 16)}…)`);

  // Generated pages keep preview metadata.
  for (const page of ['index.html', 'en/index.html']) {
    const html = await readFile(path.join(outDir, page), 'utf8');
    if (!html.includes('<meta name="robots" content="noindex,nofollow">')) {
      fail(`${page}: missing robots noindex,nofollow meta`);
    }
    if (/rel="canonical"/.test(html) || /rel="alternate"/.test(html)) {
      fail(`${page}: canonical/hreflang links must not appear in preview`);
    }
  }
  console.log('ok: generated pages carry preview metadata');

  if (failures.length > 0) {
    console.error(`${failures.length} generated-output check(s) failed`);
    process.exit(1);
  }
  console.log('all generated-output checks passed');
}

main().catch((error) => {
  console.error(`check-generated failed: ${error.message}`);
  process.exit(1);
});
