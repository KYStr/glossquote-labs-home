// 建置測試只複製本工具至獨立暫存目錄，不移除任何原始使用者檔案。
import test from 'node:test';
// 使用內建嚴格斷言，沒有下載相依。
import assert from 'node:assert/strict';
// 所有破壞性 fixture 限於新建測試暫存副本。
import {mkdtemp,cp,readFile,writeFile,rename,symlink,link,mkdir} from 'node:fs/promises';
// 子程序只執行本工具的建置腳本。
import {spawnSync} from 'node:child_process';
// 來源永遠從本測試模組推導。
import {fileURLToPath} from 'node:url';
// 每個 fixture 有各自隔離目錄。
const source=fileURLToPath(new URL('../',import.meta.url));
// 回傳建置終態與 stdout/stderr，不把錯誤當成功。
const build=root=>spawnSync(process.execPath,['scripts/build.mjs'],{cwd:root,encoding:'utf8'});
// 複製原始碼但排除原 dist；不執行任何網路操作。
async function fixture(){const root=await mkdtemp('/tmp/optionmatrix-build-');await cp(source,root,{recursive:true,filter:p=>!p.startsWith(source+'dist')});return root;}
// 兩個乾淨目錄的 manifest 與所有輸出必須逐 byte 相等。
test('T09 clean reproducible output',async()=>{const a=await fixture(),b=await fixture();assert.equal(build(a).status,0);assert.equal(build(b).status,0);const ma=await readFile(a+'/dist/manifest.json');assert.deepEqual(ma,await readFile(b+'/dist/manifest.json'));for(const {path} of JSON.parse(ma).files)assert.deepEqual(await readFile(a+'/dist/'+path),await readFile(b+'/dist/'+path));});
// 未知輸出必須保留且使建置失敗，不能自動清理。
test('T09 unknown output preserved',async()=>{const root=await fixture();await mkdir(root+'/dist');await writeFile(root+'/dist/keep.txt','USER_DATA');assert.notEqual(build(root).status,0);assert.equal(await readFile(root+'/dist/keep.txt','utf8'),'USER_DATA');});
// 缺少必要來源時，應在寫入之前失敗。
test('T09 missing source fails',async()=>{const root=await fixture();await rename(root+'/app.mjs',root+'/app.saved');assert.notEqual(build(root).status,0);});
// 來源檔案的 symlink 與 hardlink 均拒絕。
test('T09 source links rejected',async()=>{for(const type of ['symbolic','hard']){const root=await fixture();await rename(root+'/app.mjs',root+'/app.saved');if(type==='symbolic')await symlink('app.saved',root+'/app.mjs');else await link(root+'/app.saved',root+'/app.mjs');assert.notEqual(build(root).status,0);}});
// 來源及輸出祖先目錄 symlink 不得被跟隨。
test('T09 directory links rejected',async()=>{for(const dir of ['core','dist']){const root=await fixture();if(dir==='core')await rename(root+'/core',root+'/saved-core');else await mkdir(root+'/saved-core');await symlink('saved-core',root+'/'+dir);assert.notEqual(build(root).status,0);}});
