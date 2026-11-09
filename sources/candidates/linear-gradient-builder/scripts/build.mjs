// 僅封裝固定公開來源；遇未知檔、連結或不規則檔即停止，不清理使用者資料。
import fs from 'node:fs/promises';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import path from 'node:path';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {fileURLToPath} from 'node:url';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {createHash} from 'node:crypto';
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
export const root=fileURLToPath(new URL('../',import.meta.url));
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
export const files=['index.html','en/index.html','style.css','app.mjs','core.mjs','controller.mjs','i18n.mjs','robots.txt'];
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
export const headers="/*\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n";
// 遞迴列舉不跟隨符號連結，硬連結同樣拒絕。
async function scan(dir,prefix=''){const out=[];for(const name of await fs.readdir(dir)){const full=path.join(dir,name),rel=prefix+name,s=await fs.lstat(full);if(s.isSymbolicLink())throw Error('LINK_REJECTED');if(s.isDirectory())out.push(...await scan(full,rel+'/'));else{if(!s.isFile()||s.nlink!==1)throw Error('NONREGULAR_REJECTED');out.push(rel);}}return out;}
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
export async function build(){const src=path.join(root,'public'),dist=path.join(root,'dist');if((await fs.lstat(src)).isSymbolicLink())throw Error('LINK_REJECTED');const actual=(await scan(src)).sort();if(JSON.stringify(actual)!==JSON.stringify([...files].sort()))throw Error('SOURCE_ALLOWLIST');try{if((await fs.lstat(dist)).isSymbolicLink())throw Error('LINK_REJECTED');const existing=await scan(dist);if(existing.some(p=>![...files,'_headers','manifest.json'].includes(p)))throw Error('UNKNOWN_OUTPUT_PRESERVED');}catch(e){if(e.code!=='ENOENT')throw e;}await fs.mkdir(path.join(dist,'en'),{recursive:true});const manifest=[];for(const p of [...files,'_headers']){const bytes=p==='_headers'?Buffer.from(headers):await fs.readFile(path.join(src,p));await fs.writeFile(path.join(dist,p),bytes);manifest.push({path:p,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}await fs.writeFile(path.join(dist,'manifest.json'),JSON.stringify({files:manifest},null,2)+'\n');return manifest;}
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify({built:(await build()).length}));
