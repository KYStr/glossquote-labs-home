// 固定資產清單：來源和舊輸出都不得多檔、少檔或含任何連結。
import { lstat, readdir, open, unlink, rmdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const ASSETS = Object.freeze(['404.html','_headers','en/index.html','index.html','js/app.mjs','js/core.mjs','js/words.mjs','robots.txt','styles/app.css']);
export const DIRECTORIES = Object.freeze(['en','js','styles']);
export async function validateTree(root, { allowMissing = false } = {}) {
  let info;
  try { info = await lstat(fileURLToPath(root).replace(/\/$/u, '')); }
  catch (error) { if (allowMissing && error.code === 'ENOENT') return false; throw error; }
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('DIRECTORY_REQUIRED');
  const found = [], dirs = [];
  const visit = async (directory, prefix = '') => {
    for (const name of await readdir(directory)) {
      const relative = prefix + name; const target = new URL(name, directory); const item = await lstat(target);
      if (item.isSymbolicLink()) throw new Error('SYMLINK_REFUSED');
      if (item.isDirectory()) {
        if (!DIRECTORIES.includes(relative)) throw new Error('UNKNOWN_DIRECTORY');
        dirs.push(relative); await visit(new URL(`${name}/`, directory), `${relative}/`);
      } else {
        if (!item.isFile() || item.nlink !== 1) throw new Error('NONREGULAR_OR_HARDLINK');
        if (!ASSETS.includes(relative)) throw new Error('UNKNOWN_FILE'); found.push(relative);
      }
    }
  };
  await visit(root);
  if (found.sort().join('\n') !== ASSETS.join('\n') || dirs.sort().join('\n') !== DIRECTORIES.join('\n')) throw new Error('MISSING_ASSET');
  return true;
}
export async function snapshotTree(root) {
  await validateTree(root); const files = new Map();
  for (const relative of ASSETS) {
    const handle = await open(new URL(relative, root), constants.O_RDONLY | constants.O_NOFOLLOW);
    try { const info = await handle.stat(); if (!info.isFile() || info.nlink !== 1 || info.size > 2_000_000) throw new Error('UNSAFE_ASSET'); files.set(relative, await handle.readFile()); }
    finally { await handle.close(); }
  }
  await validateTree(root); return files;
}
export async function removeKnownTree(root) {
  // 不做 recursive rm：若期間出現未知檔案，rmdir 會失敗而保留它。
  await validateTree(root);
  for (const relative of ASSETS) {
    const info = await lstat(new URL(relative, root));
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) throw new Error('CLEANUP_REFUSED');
    await unlink(new URL(relative, root));
  }
  for (const relative of [...DIRECTORIES].reverse()) await rmdir(new URL(`${relative}/`, root));
  await rmdir(root);
}
