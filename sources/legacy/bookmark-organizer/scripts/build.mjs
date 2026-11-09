import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, listFiles, sourceMap } from './files.mjs';
const destination = path.join(root, 'dist');
assert.equal(path.dirname(destination), path.resolve(root));
const sources = await sourceMap();
try {
  assert(!(await lstat(destination)).isSymbolicLink(), 'dist symlink refused');
  const existing = await listFiles(destination);
  assert(existing.every(name => sources.has(name)), 'Unknown/stale dist file: refusing deletion');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const [name, buffer] of sources) {
  const target = path.join(destination, name);
  assert(target.startsWith(destination + path.sep));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  assert((await readFile(target)).equals(buffer));
}
assert.deepEqual(await listFiles(destination), [...sources.keys()].sort());
process.stdout.write(`PASS preview build: ${sources.size} files, byte-equal to public; noindex retained\n`);
