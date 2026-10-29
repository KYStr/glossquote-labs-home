// 僅 noindex 預覽；未定網址，不提供會假裝正式發布的旗標。
import { mkdir, mkdtemp, writeFile, rename, rmdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateTree, removeKnownTree, DIRECTORIES } from './files.mjs';
import { check } from './check.mjs';
if (process.argv.length !== 2) throw new Error('PREVIEW_ONLY_NO_ARGUMENTS');
const root = new URL('../',import.meta.url); const target = new URL('dist/',root);
const files = await check(); const existed = await validateTree(target,{allowMissing:true});
const stagePath = await mkdtemp(fileURLToPath(new URL('.build-stage-',root))); const stage = pathToFileURL(`${stagePath}/`);
let backup = null, moved = false, installed = false;
try {
  for (const relative of DIRECTORIES) await mkdir(new URL(`${relative}/`,stage));
  for (const [relative,bytes] of files) await writeFile(new URL(relative,stage),bytes,{flag:'wx'});
  await validateTree(stage); await validateTree(target,{allowMissing:!existed});
  if (existed) { backup = await mkdtemp(fileURLToPath(new URL('.build-backup-',root))); await rename(target,`${backup}/previous`); moved = true; }
  await rename(stage,target); installed = true;
  if (moved) { await removeKnownTree(pathToFileURL(`${backup}/previous/`)); await rmdir(backup); }
  console.log('BUILD PASS: dist/ noindex preview; no production or deployment.');
} catch (error) {
  if (moved && !installed) await rename(`${backup}/previous`,target);
  // 未知或不完整暫存檔不盲目刪除；保留供人工檢查。
  throw error;
}
