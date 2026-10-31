// 只建noindex preview；任何未知檔或link都先拒絕，不靜默刪未知dist。
import { checkSnapshot } from './policy.mjs';
import { mkdir, mkdtemp, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_FILES, sourceSnapshot, snapshot, snapshotOptional, equalSnapshots } from './files.mjs';
if(process.argv.length!==2)throw new Error('Preview-only build does not accept flags.');
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Node 24 or later is required.');
const root=fileURLToPath(new URL('../',import.meta.url));
const source=await sourceSnapshot(root);
checkSnapshot(source);
const files=new Map(PUBLIC_FILES.map(path=>[path,source.get(`public/${path}`)]));
const destination=join(root,'dist');
const previous=await snapshotOptional(destination);
const stage=await mkdtemp(join(root,'.build-stage-'));
let backup=null, moved=false, installed=false;
try {
  for(const [path,bytes]of files) { await mkdir(dirname(join(stage,path)),{recursive:true});await writeFile(join(stage,path),bytes,{flag:'wx'}); }
  await snapshot(stage);
  if(!equalSnapshots(files,await snapshot(join(root,'public')))||!equalSnapshots(previous,await snapshotOptional(destination)))throw new Error('Source or output changed during build.');
  if(previous) { backup=await mkdtemp(join(root,'.build-backup-'));await rename(destination,join(backup,'previous'));moved=true; }
  await rename(stage,destination);installed=true;
  if(moved) {
    // 移除前再次核完整內容；出現新增/改動就留下backup，不盲目刪除。
    if(!equalSnapshots(previous,await snapshot(join(backup,'previous'))))throw new Error('Previous output changed; backup retained.');
    await rm(backup,{recursive:true});
  }
  console.log(`Built ${PUBLIC_FILES.length} noindex preview files; no server or deployment started.`);
} catch(error) {
  if(moved&&!installed)await rename(join(backup,'previous'),destination);
  throw error;
} finally {
  if(!installed) {
    // 本次建立的stage若完整且完全同bytes才刪；否則留給人工核對。
    try { if(equalSnapshots(files,await snapshot(stage)))await rm(stage,{recursive:true}); } catch { /* 保留不確定暫存。 */ }
  }
}
