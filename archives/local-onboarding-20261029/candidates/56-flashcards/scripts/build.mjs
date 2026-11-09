import { mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, closedTree } from './files.mjs';
import { checkProject } from './check.mjs';

export function buildProject(root = ROOT) {
  checkProject(root);
  const destination = join(root, 'dist');
  closedTree(destination, PUBLIC_FILES, { required: false });
  for (const file of PUBLIC_FILES) {
    const output = join(destination, file);
    mkdirSync(dirname(output), { recursive: true });
    copyFileSync(join(root, 'public', file), output);
  }
  closedTree(destination, PUBLIC_FILES);
  return { files: PUBLIC_FILES.length, output: 'dist', preview: 'noindex,nofollow' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.stdout.write(`${JSON.stringify(buildProject())}\n`); }
  catch (error) { process.stderr.write(`BUILD_FAILED ${/^[A-Z0-9_]+$/.test(error.message) ? error.message : 'IO_OR_SYNTAX'}\n`); process.exitCode = 1; }
}
