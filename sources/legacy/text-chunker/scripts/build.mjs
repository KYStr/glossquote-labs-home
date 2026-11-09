import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProject, validateTree, assertPlainPath, PUBLIC_FILES, manifest } from './validation.mjs';
import { buildProduction } from './release.mjs';

export async function buildPublic(projectRoot) {
  const root = path.resolve(projectRoot);
  const source = path.join(root, 'public');
  const target = path.join(root, 'dist');
  await assertPlainPath(root);
  const checked = await validateProject(root);
  try {
    await lstat(target);
    await validateTree(target, { complete: false });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(target);
  }
  // All existing targets are checked before the first write; no stale-file deletion.
  for (const file of PUBLIC_FILES) {
    const destination = path.join(target, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await assertPlainPath(target, path.dirname(file).replaceAll(path.sep, '/') === '.' ? '' : path.dirname(file).replaceAll(path.sep, '/'));
    await writeFile(destination, await readFile(await assertPlainPath(source, file)), { flag: 'w' });
  }
  await validateTree(target);
  const built = await manifest(target, PUBLIC_FILES);
  if (checked.runtime.digest !== built.digest) throw new Error('BUILD_DIGEST_MISMATCH');
  return { ok: true, stage: 'M1-preview', target: 'dist', manifest: built };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--production')) throw new Error('UNKNOWN_BUILD_ARGUMENT');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    console.log(JSON.stringify(await (args.length ? buildProduction(root) : buildPublic(root)), null, 2));
  } catch (error) {
    console.error(`BUILD_FAILED: ${error.code ?? error.message}`);
    process.exitCode = 1;
  }
}
