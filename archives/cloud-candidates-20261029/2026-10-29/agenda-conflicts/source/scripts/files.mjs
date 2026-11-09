// 精確靜態資產清單；所有入口共用，不接受未知、連結或非普通檔案。
import { lstatSync, readdirSync, realpathSync, openSync, closeSync, fstatSync, readFileSync } from 'node:fs';
import { constants } from 'node:fs';
import { resolve, join, dirname, parse } from 'node:path';
export const PUBLIC_FILES = Object.freeze(['404.html', '_headers', 'en/index.html', 'index.html', 'js/app.mjs', 'js/core.mjs', 'js/i18n.mjs', 'robots.txt', 'styles.css']);
const directories = new Set(['en', 'js']);
export function ordinaryDirectory(path) {
  const absolute = resolve(path), root = parse(absolute).root;
  // 從 filesystem root 逐段核對，連結祖先亦不可繞過。
  let current = root;
  for (const piece of absolute.slice(root.length).split('/').filter(Boolean)) {
    current = join(current, piece);
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Unsafe directory ancestry.');
  }
  if (realpathSync(absolute) !== absolute) throw new Error('Noncanonical directory.');
  return absolute;
}
export function validateTree(root, { allowAbsent = false } = {}) {
  const absolute = resolve(root); ordinaryDirectory(dirname(absolute));
  try { lstatSync(absolute); } catch (error) { if (allowAbsent && error.code === 'ENOENT') return false; throw error; }
  ordinaryDirectory(absolute);
  const found = [];
  const visit = (folder, prefix) => {
    for (const name of readdirSync(folder)) {
      const relative = prefix + name, path = join(folder, name), info = lstatSync(path);
      if (info.isSymbolicLink()) throw new Error('Symbolic link refused.');
      if (info.isDirectory()) {
        if (!directories.has(relative)) throw new Error('Unknown directory refused.');
        visit(path, `${relative}/`);
      } else {
        if (!info.isFile() || info.nlink !== 1) throw new Error('Nonregular or hard-linked file refused.');
        if (!PUBLIC_FILES.includes(relative)) throw new Error('Unknown file refused.');
        found.push(relative);
      }
    }
  };
  visit(absolute, '');
  if (found.sort().join('\n') !== PUBLIC_FILES.join('\n')) throw new Error('Missing static asset.');
  return true;
}
export function readRegular(path) {
  ordinaryDirectory(dirname(path));
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > 2_000_000) throw new Error('Unsafe file.');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.ino !== before.ino || opened.dev !== before.dev || opened.size > 2_000_000) throw new Error('File changed during open.');
    const bytes = readFileSync(fd), after = fstatSync(fd);
    if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.nlink !== 1) throw new Error('File changed while reading.');
    return bytes;
  } finally { closeSync(fd); }
}
export function snapshotTree(root) {
  validateTree(root);
  const files = new Map(PUBLIC_FILES.map(path => [path, readRegular(join(root, path))]));
  validateTree(root);
  for (const [path, bytes] of files) if (!bytes.equals(readRegular(join(root, path)))) throw new Error('Source changed during snapshot.');
  return files;
}
// package 與 public 構成同一份來源快照；讀取均拒連結，前後 package bytes 必須一致。
export function snapshotProject(root) {
  ordinaryDirectory(root);
  const packagePath = join(root, 'package.json');
  const packageBytes = readRegular(packagePath);
  const assets = snapshotTree(join(root, 'public'));
  if (!packageBytes.equals(readRegular(packagePath))) throw new Error('Package changed during snapshot.');
  return { packageBytes, assets };
}
