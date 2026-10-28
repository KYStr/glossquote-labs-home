import { mkdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSource, validateTree, PUBLIC_FILES, ROOT } from './check.mjs';

export async function build(root = ROOT) {
  await checkSource(root);
  const output = resolve(root, 'dist');
  try { await lstat(output); await validateTree(output, { complete: false }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(output, { recursive: true });
  for (const file of PUBLIC_FILES) {
    const destination = resolve(output, file);
    await mkdir(dirname(destination), { recursive: true });
    try {
      const current = await lstat(destination);
      if (!current.isFile() || current.isSymbolicLink()) throw new Error('UNSAFE_BUILD_TARGET');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(destination, await readFile(resolve(root, 'public', file)));
  }
  await validateTree(output);
  return PUBLIC_FILES.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`BUILD PASS: ${await build()} noindex preview assets.\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
