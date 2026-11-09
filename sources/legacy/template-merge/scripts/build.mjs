import { mkdir, copyFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, assertPublicTree } from './assets.mjs';
import { checkProject } from './check.mjs';

export async function buildProject(output = path.join(ROOT, 'dist')) {
  await checkProject();
  // Never erase an unknown output to make a build pass.
  try { await assertPublicTree(output, { complete: false }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(output, { recursive: true });
  for (const file of PUBLIC_FILES) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    // A fresh check of the tree also rejects existing junctions in parent paths.
    await assertPublicTree(output, { complete: false });
    try { if ((await lstat(target)).isSymbolicLink()) throw new Error('Linked build target rejected.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await copyFile(path.join(ROOT, 'public', file), target);
  }
  await assertPublicTree(output);
  return { files: PUBLIC_FILES.length, output: 'dist', mode: 'preview-noindex' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await buildProject())}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
