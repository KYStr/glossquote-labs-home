import { mkdir, cp, lstat, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_ROOT, isWithin } from './serve.mjs';
import { checkProject } from './check.mjs';

const files = await checkProject();
const project = await realpath(PROJECT_ROOT);
const source = path.join(project, 'public');
const destination = path.resolve(project, 'dist');
if (!isWithin(project, destination) || path.relative(project, destination) !== 'dist') throw new Error('Unsafe build destination');
try {
  const existing = await lstat(destination);
  if (existing.isSymbolicLink() || !(existing.isDirectory()) || await realpath(destination) !== destination) throw new Error('Unsafe existing build destination');
  await rm(destination, { recursive: true });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(destination);
for (const file of files) {
  const relative = path.relative(source, file);
  const target = path.join(destination, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(file, target, { dereference: false, errorOnExist: true, force: false });
}
console.log(`PASS: built ${files.length} reviewed static files to dist.`);
