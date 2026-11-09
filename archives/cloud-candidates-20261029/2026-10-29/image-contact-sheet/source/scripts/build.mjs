import { mkdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { root, assets, audit, listFiles } from './check.mjs';
// 只有預覽建置；沒有部署、正式網域或隱藏發佈模式。
if (process.argv.length > 2) throw new Error('PREVIEW_ONLY_NO_BUILD_ARGUMENTS');
await audit();
const destination = resolve(root,'dist');
try {
  const existing = await lstat(destination);
  if (existing.isSymbolicLink() || !existing.isDirectory()) throw new Error('OUTPUT_PATH_REJECTED');
  // 未知舊檔直接失敗，不藉刪除證據來湊出乾淨建置。
  const allowed = new Set([...assets,'build-manifest.json']);
  if ((await listFiles(destination)).some(path => !allowed.has(path))) throw new Error('UNKNOWN_OUTPUT_REJECTED');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(destination,{recursive:true});
const manifest = {mode:'preview-noindex', files:{}};
for (const file of assets) {
  const bytes = await readFile(resolve(root,'public',file));
  const target = resolve(destination,file); await mkdir(dirname(target),{recursive:true});
  await writeFile(target,bytes); manifest.files[file] = createHash('sha256').update(bytes).digest('hex');
}
await writeFile(resolve(destination,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`BUILD PASS: ${assets.length} preview assets, noindex, no deployment`);
