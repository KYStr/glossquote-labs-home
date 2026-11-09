// 建置路徑從來源檔定位，不依賴 shell 目錄。
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { lstat, readdir } from 'node:fs/promises';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const within = (base, target) => { const path = relative(base, target); return path === '' || !path.startsWith('..') && !isAbsolute(path); };
// 拒絕符號連結與特殊檔案，避免讀取目錄外。
export async function listFiles(base) {
  const info = await lstat(base);
  if (info.isSymbolicLink() || !info.isDirectory()) throw Error('DIRECTORY_REJECTED');
  const files = [];
  for (const entry of await readdir(base, { withFileTypes: true })) {
    const path = resolve(base, entry.name);
    if (!within(base, path) || entry.isSymbolicLink()) throw Error('PATH_REJECTED');
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
    else throw Error('FILE_REJECTED');
  }
  return files.sort();
}
