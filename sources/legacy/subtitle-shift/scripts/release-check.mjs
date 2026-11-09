import assert from 'node:assert/strict';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve, posix } from 'node:path';
import { ASSETS } from './manifest.mjs';
import { assertNode, sha256 } from './files.mjs';
import { validateSource, validateExistingBuild } from './validate.mjs';
import { checkProduction } from './production-lib.mjs';

export const SOURCE_FILES = Object.freeze([
  '.gitignore', 'ACCEPTANCE.md', 'AGENTS.md', 'HANDOFF.md', 'PRODUCT.md', 'README.md', 'START-HERE.md', 'TASK-ENTRY.md', 'TASKS.md', 'TECHNICAL.md', 'UX-SEO.md',
  'package.json', 'project.json', 'wrangler.jsonc', 'release-manifest.json', 'config/m1-public.json',
  ...ASSETS.map(file => 'public/' + file),
  ...['BRAND.md', 'DESIGN-SYSTEM.md', 'ENGINEERING.md', 'GIT-PUBLICATION-SAFETY.md', 'PRIVACY-SECURITY.md', 'RELEASE-CANDIDATE.md', 'RELEASE.md', 'M1-ACCEPTANCE-SUMMARY.md', 'M2-RELEASE.md'].map(file => 'docs/' + file),
  ...['build.mjs', 'check.mjs', 'dev.mjs', 'files.mjs', 'http-smoke.mjs', 'manifest.mjs', 'server.mjs', 'test-fixtures.mjs', 'validate.mjs', 'production-lib.mjs', 'production.mjs', 'production-server.mjs', 'production-http.mjs', 'preview-production.mjs', 'release-check.mjs'].map(file => 'scripts/' + file),
  ...['core.test.mjs', 'protocol.test.mjs', 'state.test.mjs', 'tooling.test.mjs', 'production.test.mjs'].map(file => 'test/' + file)
].sort());
export async function sourceInventory(root) {
  const found = [];
  async function walk(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name); const name = prefix + entry.name; const stat = await lstat(path);
      if (stat.isDirectory()) {
        assertNode(stat, true);
        if (prefix === '' && ['.git', 'dist', 'dist-production'].includes(entry.name)) continue;
        assert.ok(SOURCE_FILES.some(file => file.startsWith(name + '/')), 'UNKNOWN_SOURCE_DIRECTORY'); await walk(path, name + '/');
      } else { assertNode(stat, false); assert.ok(SOURCE_FILES.includes(name), 'UNKNOWN_SOURCE_FILE'); found.push(name); }
    }
  }
  await walk(root); assert.deepEqual(found.sort(), [...SOURCE_FILES], 'SOURCE_ALLOWLIST_MISMATCH');
  return Promise.all(SOURCE_FILES.map(async path => { const bytes = await readFile(join(root, path)); return { path, bytes: bytes.length, sha256: sha256(bytes) }; }));
}
export function validateMarkdownLinks(text, file, files = SOURCE_FILES) {
  for (const match of text.matchAll(/(?<!!)\[[^\]]+\]\(([^\s)]+)\)/g)) {
    const target = match[1]; if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
    assert.ok(!target.startsWith('/') && !target.includes('\\'), 'NONPORTABLE_DOCUMENT_LINK');
    const name = posix.normalize(posix.join(posix.dirname(file), decodeURIComponent(target.split('#')[0])));
    assert.ok(files.includes(name), 'BROKEN_DOCUMENT_LINK');
  }
}
export async function releaseCheck(root) {
  await validateSource(root); assert.ok(await validateExistingBuild(root), 'PREVIEW_BUILD_REQUIRED');
  const production = await checkProduction(root); const source = await sourceInventory(root);
  for (const file of SOURCE_FILES.filter(file => file.endsWith('.md'))) validateMarkdownLinks(await readFile(join(root, file), 'utf8'), file);
  return { status: 'PASS', mode: 'M2-local-static-release-check', deployed: false, sourceFiles: source.length, sourceInventorySha256: sha256(JSON.stringify(source) + '\n'),
    assets: production.files.length, assetInventorySha256: production.manifest.assetInventorySha256, m1PublicInventorySha256: production.manifest.m1PublicInventorySha256,
    browserAcceptance: 'Primary M1 GO with scoped PARTIAL/manual exclusions; production browser/live checks remain primary-owned' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(await releaseCheck(fileURLToPath(new URL('../', import.meta.url))), null, 2) + '\n'); }
  catch (error) { process.stderr.write(`RELEASE_CHECK_FAILED: ${String(error.message).slice(0, 500)}\n`); process.exitCode = 1; }
}
