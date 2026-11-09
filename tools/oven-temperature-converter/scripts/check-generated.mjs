#!/usr/bin/env node
// Checks the generated preview output (dist-preview/).
// Usage: node scripts/check-generated.mjs
// Verifies: dist-preview exists, its file set equals public/, every file
// is byte-identical to its public/ source, and the generated pages still
// carry the preview noindex metadata. Exit 0 = pass.

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(messageText) {
  failures.push(messageText);
  console.error(`FAIL: ${messageText}`);
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
  if (JSON.stringify(generatedFiles) !== JSON.stringify(publicFiles)) {
    fail(`dist-preview file set mismatch: got ${generatedFiles.join(', ')}; expected ${publicFiles.join(', ')}`);
  } else {
    console.log(`ok: dist-preview file set (${generatedFiles.length} files)`);
  }

  for (const file of publicFiles) {
    const source = await readFile(path.join(root, 'public', file));
    const generated = await readFile(path.join(outDir, file));
    if (!source.equals(generated)) fail(`dist-preview/${file}: bytes differ from public/${file}`);
  }
  console.log('ok: every generated file is byte-identical to public/');

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
