// 僅建 noindex 預覽；先核對來源與既有輸出，再以同磁碟暫存樹置換。
import { mkdir, mkdtemp, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { snapshotTree, validateTree } from './files.mjs';
if(process.argv.length>2)throw new Error('Preview-only candidate: production/deployment flags are not supported.');
const root=new URL('../',import.meta.url);
const destination=new URL('dist/',root);
const files=await snapshotTree(new URL('public/',root));
const existed=await validateTree(destination,{allowMissing:true});
const stagePath=await mkdtemp(fileURLToPath(new URL('.build-stage-',root)));
const stage=pathToFileURL(`${stagePath}/`);
let backup=null;let movedOld=false;let installed=false;
try{
  for(const directory of ['en','js','js/core'])await mkdir(new URL(`${directory}/`,stage),{recursive:true});
  for(const [relative,bytes]of files)await writeFile(new URL(relative,stage),bytes,{flag:'wx'});
  await validateTree(stage);
  // 第二次檢查保留可能在準備期間新增的未知輸出，絕不盲目 rm(dist)。
  await validateTree(destination,{allowMissing:!existed});
  if(existed){backup=await mkdtemp(fileURLToPath(new URL('.build-backup-',root)));await rename(destination,`${backup}/previous`);movedOld=true;}
  await rename(stage,destination);installed=true;
  if(movedOld){await validateTree(pathToFileURL(`${backup}/previous/`));await rm(backup,{recursive:true});}
  console.log(`Built noindex preview only: ${fileURLToPath(destination)}`);
}catch(error){
  if(movedOld&&!installed)await rename(`${backup}/previous`,destination);
  throw error;
}finally{
  if(!installed){await validateTree(stage);await rm(stage,{recursive:true});}
}
