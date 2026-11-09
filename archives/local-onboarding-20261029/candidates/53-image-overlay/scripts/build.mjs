import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, closedTree, publicTexts } from './files.mjs';
import { check } from './check.mjs';

export async function build(root = ROOT) {
  await check(root);
  const texts = await publicTexts(join(root, 'public'));
  const output = join(root, 'dist');
  try {
    const item = await lstat(output);
    if (item.isSymbolicLink() || !item.isDirectory()) throw new Error('UNSAFE_DIST');
    await closedTree(output, { complete: false });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const [file, value] of texts) {
    const destination = join(output, file);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, value, 'utf8');
  }
  await closedTree(output);
  return { files: texts.size, status: 'PASS', mode: 'preview-noindex' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await build())}\n`); }
  catch (error) { process.stderr.write(`build failed: ${error.message}\n`); process.exitCode = 1; }
}
