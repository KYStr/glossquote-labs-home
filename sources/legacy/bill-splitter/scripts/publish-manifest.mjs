import { readFile, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, allowedAssets, checkDist } from './check.mjs';
import { safeDirectory } from './validate.mjs';

export const sourcePaths = Object.freeze([
  '.gitignore', 'package.json', 'wrangler.jsonc', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md',
  'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/PRIVACY-SECURITY.md', 'docs/RELEASE.md', 'docs/TEST-RESULTS.md',
  ...[...allowedAssets].map(file => `public/${file}`),
  ...['serve','check','build','validate','release','publish-manifest'].map(file => `scripts/${file}.mjs`),
  ...['money','split','quick','report','scaffold','release','controller','ui-contract'].map(file => `test/${file}.test.mjs`)
].sort());
const secretPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{30,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/;

export async function sourceEntries() {
  await safeDirectory(root);
  const entries = [];
  for (const file of sourcePaths) {
    const absolute = path.resolve(root, file);
    if (!absolute.startsWith(path.resolve(root) + path.sep)) throw new Error('SOURCE_SCOPE');
    await safeDirectory(path.dirname(absolute));
    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('UNSAFE_SOURCE');
    const bytes = await readFile(absolute);
    if (secretPattern.test(bytes.toString('utf8'))) throw new Error(`SOURCE_SECRET_PATTERN: ${file}`);
    entries.push({ path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return entries;
}
export async function publicationManifest() {
  return { schemaVersion: 1, tool: 'bill-splitter', sourceFiles: await sourceEntries(), selfExcluded: 'source-manifest.json', productionAssets: await checkDist(true) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('UNKNOWN_ARGUMENT');
  const manifest = await publicationManifest();
  await writeFile(path.join(root, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`SOURCE MANIFEST PASS: ${manifest.sourceFiles.length} reviewed files; ${manifest.productionAssets.files.length} production assets`);
}
