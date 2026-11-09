import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, inside } from './validation.mjs';
import { validateReleaseConfig } from './production.mjs';

export const SOURCE_FILES = Object.freeze([
  '.gitignore', 'ACCEPTANCE.md', 'AGENTS.md', 'DISPATCH.md', 'HANDOFF.md',
  'PRODUCT.md', 'README.md', 'START-HERE.md', 'TASK-ENTRY.md', 'TASKS.md', 'TECHNICAL.md', 'UX-SEO.md',
  'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/GIT-PUBLICATION-SAFETY.md',
  'docs/PRIVACY-SECURITY.md', 'docs/RELEASE-CANDIDATE.md', 'docs/RELEASE.md', 'package.json', 'project.json',
  'public/404.html', 'public/en/index.html', 'public/index.html', 'public/js/app.mjs',
  'public/js/core/subscription-budget.mjs', 'public/js/i18n.mjs', 'public/robots.txt', 'public/styles.css',
  'scripts/build-production.mjs', 'scripts/build.mjs', 'scripts/check-production.mjs', 'scripts/check.mjs',
  'scripts/production.mjs', 'scripts/release-check.mjs', 'scripts/serve-production.mjs', 'scripts/serve.mjs', 'scripts/validation.mjs',
  'test/app.test.mjs', 'test/core.test.mjs', 'test/fake-dom.mjs', 'test/production.test.mjs', 'test/toolchain.test.mjs', 'wrangler.jsonc'
].sort());

const M1_PUBLIC_HASHES = Object.freeze({
  'public/404.html': '1b5baf095b8e9996d89f5220cde24d941f63dc33499c5193862f6980b90bf12d',
  'public/en/index.html': 'e840972d00d8f23be86d72b3fd9e868b678ebc6952c5af9c75122482e9f5d559',
  'public/index.html': 'eac849150d678ca18a9675cc80f0814c6e283968c56f8aee1a87fe8a5cae9252',
  'public/js/app.mjs': '14d97531c10c77d781a885afb413fb0aa6d4fe0a3f476d16205582850ef73475',
  'public/js/core/subscription-budget.mjs': '1f93f9cf222108f5fb43a1be26b080c378e79f2c5ea76bb4478fdaa2602c0690',
  'public/js/i18n.mjs': '43e91a85a7136a8a8d1d4de12915d18acb22b7a4ff1615bb4039d39a8e7641c7',
  'public/robots.txt': '331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1',
  'public/styles.css': '9924e8dc95f03c4e79038745e02f354916d184d64bf572f28a8204c6898a52e6'
});

export async function releaseSourceRecords(base = ROOT) {
  const rootInfo = await lstat(base);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('RELEASE_UNSAFE_ROOT');
  const records = [];
  async function walk(prefix = '') {
    for (const entry of await readdir(prefix ? inside(base, prefix) : base, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const info = await lstat(inside(base, relative));
      if (info.isSymbolicLink()) throw new Error('RELEASE_LINK');
      if (!prefix && ['.git', 'dist', 'dist-production'].includes(entry.name)) {
        if (!info.isDirectory()) throw new Error('RELEASE_UNSAFE_EXCLUSION');
        continue;
      }
      if (info.isDirectory()) {
        if (!SOURCE_FILES.some(file => file.startsWith(`${relative}/`))) throw new Error('RELEASE_UNKNOWN_DIRECTORY');
        await walk(relative);
      } else {
        // Reject unknown files before opening any content (including .env files).
        if (!SOURCE_FILES.includes(relative)) throw new Error('RELEASE_UNKNOWN_FILE');
        if (!info.isFile() || info.nlink !== 1) throw new Error('RELEASE_UNSAFE_FILE');
        const bytes = await readFile(inside(base, relative));
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        if (Object.hasOwn(M1_PUBLIC_HASHES, relative) && M1_PUBLIC_HASHES[relative] !== sha256) throw new Error('M1_PUBLIC_CHANGED');
        records.push({ path: relative, bytes: bytes.length, sha256 });
      }
    }
  }
  await walk();
  records.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (JSON.stringify(records.map(file => file.path)) !== JSON.stringify(SOURCE_FILES)) throw new Error('RELEASE_MISSING_SOURCE');
  return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await validateReleaseConfig();
  const records = await releaseSourceRecords();
  process.stdout.write(`PASS release source: ${records.length} allowlisted files; 8 M1 public hashes unchanged; no build artifacts, dependencies or unknown files in publication inputs\n`);
}
