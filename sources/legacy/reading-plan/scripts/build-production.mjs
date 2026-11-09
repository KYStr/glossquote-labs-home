import { mkdir, lstat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, checkedTree, isMain } from './files.mjs';
import { checkPreview } from './check.mjs';
import { assertProductionInputs, expectedProduction, PRODUCTION_FILES } from './production.mjs';

export async function buildProduction(root = ROOT) {
  await checkPreview(root); await assertProductionInputs(root);
  const directory = join(root, 'dist-production');
  let exists = false;
  try { await lstat(directory); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (exists) await checkedTree(directory, PRODUCTION_FILES);
  else await mkdir(directory);
  for (const sub of ['en', 'styles', 'js', 'js/core']) await mkdir(join(directory, sub), { recursive: true });
  for (const [path, bytes] of await expectedProduction(root)) await writeFile(join(directory, path), bytes);
  return checkedTree(directory, PRODUCTION_FILES);
}
if (isMain(import.meta.url)) {
  try { const manifest = await buildProduction(); process.stdout.write(`PASS production build: ${manifest.length} files, ${manifest.reduce((n, x) => n + x.bytes, 0)} bytes; M1 public unchanged\n`); }
  catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}
