import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, inventory, validatePublic } from './contract.mjs';

export async function build(root = ROOT) {
  const source = path.join(root, 'public');
  const target = path.join(root, 'dist');
  const files = await validatePublic(source);
  await inventory(target, { optional: true });
  for (const file of files) {
    await mkdir(path.dirname(path.join(target, file)), { recursive: true });
    await copyFile(path.join(source, file), path.join(target, file));
  }
  await validatePublic(target);
  return files;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts', 'build.mjs')) {
  build().then(files => process.stdout.write('PASS: preview dist built from ' + files.length + ' allowlisted files; no unknown output deleted.\n')).catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
