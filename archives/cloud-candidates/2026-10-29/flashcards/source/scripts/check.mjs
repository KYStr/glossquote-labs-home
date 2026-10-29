// 聚合靜態gate不冒充瀏覽器或完整Network/Storage驗證。
import assert from 'node:assert/strict';
import { checkSnapshot } from './policy.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { sourceSnapshot, snapshot, snapshotOptional, equalSnapshots } from './files.mjs';
if(process.argv.length!==2)throw new Error('Unknown check flags.');
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Node 24 or later is required.');
const root=fileURLToPath(new URL('../',import.meta.url));
const files=await sourceSnapshot(root);
checkSnapshot(files);
for(const [path,bytes] of files) if(path.endsWith('.mjs')&&!path.startsWith('dist/')) {
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:bytes,encoding:'utf8'});
  assert.equal(result.status,0,`Syntax failed: ${path}`);
}
const dist=await snapshotOptional(join(root,'dist'));
if(dist)assert(equalSnapshots(await snapshot(join(root,'public')),dist),'Existing dist differs from public.');
console.log('PASS: exact tree, syntax, privacy-source, bilingual, noindex and optional dist byte gates. Browser checks remain separate.');
