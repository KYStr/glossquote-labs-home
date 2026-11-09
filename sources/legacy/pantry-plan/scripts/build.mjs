import { mkdir, copyFile, lstat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, validatePublic, scanTree } from './files.mjs';
import { inspectPublic } from './check.mjs';

export async function build(root = ROOT) {
  const source = join(root, 'public');
  const output = join(root, 'dist');
  inspectPublic(await validatePublic(source));
  try {
    await lstat(output);
    const existing = await scanTree(output);
    if (existing.some(name => !PUBLIC_FILES.includes(name))) throw new Error('UNKNOWN_OUTPUT');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const name of PUBLIC_FILES) {
    const target = join(output, name);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(source, name), target);
  }
  await validatePublic(output);
  return { files: PUBLIC_FILES.length, output: 'dist', mode: 'preview-noindex' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify({ status: 'PASS', ...await build() })); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
