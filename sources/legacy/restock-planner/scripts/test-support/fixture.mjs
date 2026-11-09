import { mkdtemp, mkdir, copyFile, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, ASSETS } from '../lib/files.mjs';

const scratchParent = path.join(ROOT, 'scripts');
export function ownedPath(root, relative = '') {
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== scratchParent || !path.basename(resolved).startsWith('.scratch-restock-')) throw new Error('Unowned fixture root');
  const target = path.resolve(resolved, relative);
  if (target !== resolved && !target.startsWith(`${resolved}${path.sep}`)) throw new Error('Fixture traversal');
  return target;
}
export async function fixture() {
  const root = await mkdtemp(path.join(scratchParent, '.scratch-restock-'));
  for (const file of ASSETS) { const destination = ownedPath(root, `public/${file}`); await mkdir(path.dirname(destination), { recursive: true }); await copyFile(path.join(ROOT,'public',file),destination); }
  const icon=ownedPath(root,'scripts/assets/favicon.svg');await mkdir(path.dirname(icon),{recursive:true});await copyFile(path.join(ROOT,'scripts/assets/favicon.svg'),icon);
  return root;
}
export async function cleanupFixture(root) {
  const target = ownedPath(root);
  const stat = await lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Refuse linked fixture cleanup');
  await rm(target, { recursive: true, force: false });
}
