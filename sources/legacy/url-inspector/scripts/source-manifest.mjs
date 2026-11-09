import path from 'node:path';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { projectRoot } from './serve.mjs';
import { listFiles, approvedAssets, sha256 } from './check.mjs';
import { validateAncestors } from './validation.mjs';

export async function sourceManifest() {
  await validateAncestors(projectRoot);
  const files = ['.gitignore', 'package.json', 'project.json', 'README.md', 'AGENTS.md', 'TASK-ENTRY.md', 'START-HERE.md', 'TASKS.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'HANDOFF.md', 'wrangler.jsonc', ...approvedAssets.map(file => 'public/' + file)];
  const folders = { scripts: '.mjs', test: '.mjs', docs: '.md' };
  for (const [directory, extension] of Object.entries(folders)) {
    for (const relative of await listFiles(path.join(projectRoot, directory))) {
      if (relative.includes('/') || !relative.endsWith(extension)) throw new Error('Unapproved source file type');
      files.push(directory + '/' + relative);
    }
  }
  files.sort();
  const hashes = {};
  const secret = /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj|live)-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/u;
  for (const file of files) {
    const full = path.join(projectRoot, file); await validateAncestors(path.dirname(full));
    const info = await lstat(full);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) throw new Error('Unapproved source file link');
    const content = await readFile(full);
    if (secret.test(content.toString('utf8'))) throw new Error('Possible secret in approved source file');
    hashes[file] = sha256(content);
  }
  return { schemaVersion: 1, tool: 'glossquote-labs-url-inspector', policy: 'Reviewed source only; excludes dist, node_modules, .runs, credentials and other tools. Manifest excludes itself.', files: hashes };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await sourceManifest();
  const destination = path.join(projectRoot, 'SOURCE-MANIFEST.json');
  try { const info = await lstat(destination); if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) throw new Error('Unsafe manifest target'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(destination, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`SOURCE REVIEW PASS: ${Object.keys(manifest.files).length} files; no dependency or private artifact included`);
}
