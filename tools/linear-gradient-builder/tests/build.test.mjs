// 每案獨立暫存副本；未知檔保留，沒有清理原始專案的命令。
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
const root=fileURLToPath(new URL('../',import.meta.url));
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
async function fixture(){const d=await fs.mkdtemp(path.join(os.tmpdir(),'gradient-build-'));for(const p of ['public','scripts'])await fs.cp(root+p,path.join(d,p),{recursive:true});return d;}
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
const build=d=>spawnSync(process.execPath,['scripts/build.mjs'],{cwd:d,encoding:'utf8'});
// 執行下列具名固定斷言；只證受控案例，不換算產品品質分數。
test('deterministic explicit artifact, docs excluded',async()=>{const d=await fixture();assert.equal(build(d).status,0);const a=await fs.readFile(d+'/dist/manifest.json','utf8');assert.equal(JSON.parse(a).files.length,9);assert.equal(build(d).status,0);assert.equal(await fs.readFile(d+'/dist/manifest.json','utf8'),a);});
// 執行下列具名固定斷言；只證受控案例，不換算產品品質分數。
test('unknown source and missing source fail before packaging',async()=>{for(const extra of [true,false]){const d=await fixture();if(extra)await fs.writeFile(d+'/public/secret.txt','fixture');else await fs.rename(d+'/public/style.css',d+'/style.saved');assert.notEqual(build(d).status,0);}});
// 執行下列具名固定斷言；只證受控案例，不換算產品品質分數。
test('unknown output preserved',async()=>{const d=await fixture();assert.equal(build(d).status,0);await fs.writeFile(d+'/dist/keep.txt','preserve');assert.notEqual(build(d).status,0);assert.equal(await fs.readFile(d+'/dist/keep.txt','utf8'),'preserve');});
// 執行下列具名固定斷言；只證受控案例，不換算產品品質分數。
test('source and output symlinks rejected',async()=>{for(const output of [false,true]){const d=await fixture();if(output){await fs.mkdir(d+'/other');await fs.symlink(d+'/other',d+'/dist');}else{await fs.rename(d+'/public/style.css',d+'/saved.css');await fs.symlink(d+'/saved.css',d+'/public/style.css');}assert.notEqual(build(d).status,0);}});
