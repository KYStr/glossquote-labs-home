import { mkdir, copyFile, lstat, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, ASSETS, checkedTree, isMain, verifyDist } from './files.mjs';
import { checkPreview } from './check.mjs';

export async function buildPreview(root = ROOT) {
  await checkPreview(root, { dist: false });
  const destination = join(root, 'dist');
  let exists = false;
  try { await lstat(destination); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  // Never recursively delete a directory or overwrite an unknown/link target.
  if (exists) await checkedTree(destination);
  else await mkdir(destination);
  for (const directory of ['en', 'styles', 'js', 'js/core']) await mkdir(join(destination, directory), { recursive: true });
  for (const file of ASSETS) await copyFile(join(root, 'public', file), join(destination, file));
  await realpath(destination);
  return verifyDist(root);
}
if (isMain(import.meta.url)) {
  try { const manifest = await buildPreview(); process.stdout.write(`PASS preview build: ${manifest.length} files, ${manifest.reduce((n, f) => n + f.bytes, 0)} bytes; source/output SHA-256 identical\n`); }
  catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}
