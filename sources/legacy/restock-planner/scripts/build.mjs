import { mkdir, copyFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, ASSETS, exists, inventory } from './lib/files.mjs';
import { validatePublic } from './lib/validate.mjs';

export async function build(root = ROOT) {
  const source = path.join(root, 'public');
  const destination = path.join(root, 'dist');
  await validatePublic(source);
  if (await exists(destination)) await inventory(destination, ASSETS, { allowMissing: true }); // Reject unknown/linked output before any write.
  await mkdir(destination, { recursive: true });
  for (const file of ASSETS) {
    await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
    // Each destination directory was preflighted; no recursive removal or workspace copying.
    if ((await lstat(path.dirname(path.join(destination, file)))).isSymbolicLink()) throw new Error('Linked destination');
    await copyFile(path.join(source, file), path.join(destination, file));
  }
  const result = await inventory(destination);
  if (JSON.stringify(result) !== JSON.stringify(await inventory(source))) throw new Error('Build byte mismatch');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`PASS preview build: ${(await build()).length} assets\n`);
}
