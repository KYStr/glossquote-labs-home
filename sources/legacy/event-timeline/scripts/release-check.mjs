import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { root, inspectTree, assets } from './files.mjs';
import { releaseSourceFiles, checkProduction, verifyFrozenPublic } from './production.mjs';

const expectedRootFiles = releaseSourceFiles.filter(path => !path.includes('/')).sort();
const foundRootFiles = [];
for (const name of await readdir(root)) {
  const info = await lstat(join(root, name));
  if (info.isSymbolicLink()) throw new Error('Linked release root entry');
  if (info.isDirectory()) {
    if (!['public', 'scripts', 'test', 'docs', 'dist', 'dist-production', '.git'].includes(name)) throw new Error('Unknown release directory');
    if (!['dist', 'dist-production', '.git'].includes(name)) await inspectTree(name, releaseSourceFiles.filter(path => path.startsWith(name + '/')).map(path => path.slice(name.length + 1)));
  } else {
    if (!info.isFile() || info.nlink !== 1) throw new Error('Unsafe release file');
    foundRootFiles.push(name);
  }
}
if (JSON.stringify(foundRootFiles.sort()) !== JSON.stringify(expectedRootFiles)) throw new Error('Unknown or missing release source');
await verifyFrozenPublic();
await checkProduction();
await inspectTree('dist');
for (const path of assets) if (!(await readFile(join(root, 'dist', path))).equals(await readFile(join(root, 'public', path)))) throw new Error('Preview drift');
const digests = [];
for (const path of releaseSourceFiles) {
  const bytes = await readFile(join(root, path));
  digests.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
console.log(`PASS: ${digests.length} allowlisted source files; no extra sources; M1 public unchanged; both candidate trees verified.`);
