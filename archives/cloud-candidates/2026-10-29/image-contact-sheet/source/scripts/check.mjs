import { lstat, readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { page } from './pages.mjs';
// 閉合發布清單，文件、測試與證據不會進入網站。
export const root = fileURLToPath(new URL('../', import.meta.url));
export const assets = Object.freeze(['404.html','_headers','en/index.html','index.html','js/app.mjs','js/core.mjs','js/words.mjs','robots.txt','styles/app.css']);
// 拒絕檔案和資料夾 symlink，避免越過指定根目錄。
export async function listFiles(directory) {
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('SYMLINK_REJECTED');
  const output = [];
  async function visit(path) {
    for (const entry of await readdir(path, {withFileTypes:true})) {
      const full = resolve(path, entry.name); const stat = await lstat(full);
      if (stat.isSymbolicLink()) throw new Error('SYMLINK_REJECTED');
      if (stat.isDirectory()) await visit(full);
      else if (stat.isFile()) { if (stat.nlink !== 1) throw new Error('HARDLINK_REJECTED'); output.push(relative(directory, full).replaceAll('\\','/')); }
      else throw new Error('FILE_TYPE_REJECTED');
    }
  }
  await visit(directory); return output.sort();
}
export async function audit() {
  const source = resolve(root, 'public');
  if (JSON.stringify(await listFiles(source)) !== JSON.stringify(assets)) throw new Error('PUBLIC_ALLOWLIST_MISMATCH');
  for (const [path,lang] of [['index.html','zh-Hant'],['en/index.html','en']]) {
    const html = await readFile(resolve(source,path), 'utf8');
    if (html !== page(lang)) throw new Error('STATIC_PAGE_OUT_OF_DATE');
    if (!html.includes('noindex,nofollow') || /rel="canonical"|sitemap|<script(?! type="module" src=)/u.test(html)) throw new Error('PREVIEW_METADATA_INVALID');
  }
  for (const file of assets.filter(path => /\.(mjs|html|css)$/.test(path))) {
    const sourceText = await readFile(resolve(source,file),'utf8');
    if (/\b(innerHTML|outerHTML|insertAdjacentHTML|eval|localStorage|sessionStorage|indexedDB|serviceWorker|XMLHttpRequest|WebSocket)\b|\bfetch\s*\(|console\.|@import|https?:\/\/(?!glossquote\.com\/)/u.test(sourceText)) throw new Error('FORBIDDEN_SOURCE_PATTERN: ' + file);
  }
  for (const folder of ['public/js','scripts','test']) for (const file of await listFiles(resolve(root,folder))) {
    if (!file.endsWith('.mjs')) continue;
    const checked = spawnSync(process.execPath,['--check',resolve(root,folder,file)],{encoding:'utf8'});
    if (checked.status !== 0) throw new Error(checked.stderr);
  }
  const pkg = JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
  if (pkg.dependencies || pkg.devDependencies || !pkg.private || pkg.type !== 'module') throw new Error('PACKAGE_CONTRACT');
  return assets;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { await audit(); console.log('CHECK PASS: syntax, allowlist, generated bilingual pages and static policy scan'); }
