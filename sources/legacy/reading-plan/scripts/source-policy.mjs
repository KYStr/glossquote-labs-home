import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { ROOT, ASSETS, sha256 } from './files.mjs';
export const SOURCE_FILES = Object.freeze([
  '.gitignore', 'package.json', 'wrangler.jsonc', 'README.md',
  'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md',
  'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/PRIVACY-SECURITY.md', 'docs/RELEASE.md', 'docs/GIT-PUBLICATION-SAFETY.md',
  ...ASSETS.map(p => `public/${p}`),
  ...['build', 'check', 'files', 'pages', 'serve', 'production', 'm1-oracle', 'build-production', 'check-production', 'preview-production', 'source-policy', 'release-check'].map(p => `scripts/${p}.mjs`),
  ...['civil-date', 'reading-plan', 'report', 'site-build', 'ui-contract', 'production'].map(p => `test/${p}.test.mjs`),
  'test/helpers/dom-harness.mjs', 'test/helpers/fixtures.mjs'
].sort());
const INTERNAL_FILES = Object.freeze(['AGENTS.md', 'DISPATCH.md', 'HANDOFF.md', 'START-HERE.md', 'TASK-ENTRY.md', 'project.json', 'docs/RELEASE-CANDIDATE.md']);

export async function checkSourceTree(root = ROOT, { publishingCopy = false } = {}) {
  const base = resolve(root); const initial = await lstat(base);
  if (!initial.isDirectory() || initial.isSymbolicLink()) throw new Error('UNSAFE_SOURCE_ROOT');
  const actualRoot = await realpath(base);
  const expected = new Set([...SOURCE_FILES, ...(publishingCopy ? [] : INTERNAL_FILES)]);
  const directories = new Set(['']);
  for (const name of expected) { const parts = name.split('/'); parts.pop(); while (parts.length) { directories.add(parts.join('/')); parts.pop(); } }
  const found = new Set();
  async function walk(rel) {
    for (const entry of await readdir(join(base, rel), { withFileTypes: true })) {
      const name = rel ? `${rel}/${entry.name}` : entry.name;
      const stat = await lstat(join(base, name));
      const resolved = await realpath(join(base, name)); const within = relative(actualRoot, resolved);
      if (stat.isSymbolicLink() || within.startsWith('..') || within.includes(':')) throw new Error('SOURCE_LINK_OR_ESCAPE');
      if (['dist', 'dist-production', 'test/.tmp', '.git'].includes(name)) { if (!stat.isDirectory()) throw new Error('UNSAFE_GENERATED_DIRECTORY'); continue; }
      if (stat.isDirectory()) { if (!directories.has(name)) throw new Error('UNKNOWN_SOURCE_DIRECTORY'); await walk(name); }
      else { if (!stat.isFile() || stat.nlink !== 1 || !expected.has(name)) throw new Error('UNKNOWN_OR_LINKED_SOURCE_FILE'); found.add(name); }
    }
  }
  await walk('');
  if (SOURCE_FILES.some(name => !found.has(name))) throw new Error('MISSING_RELEASE_SOURCE');
  const manifest = [];
  for (const path of SOURCE_FILES) {
    const bytes = await readFile(join(base, path));
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9]{30,}\b/.test(bytes.toString('utf8'))) throw new Error('SOURCE_SECRET_PATTERN_STOP');
    manifest.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return manifest;
}
