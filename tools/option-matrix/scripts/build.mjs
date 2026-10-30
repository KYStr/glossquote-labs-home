// 僅使用 Node 內建模組建立固定 allowlist 預覽，不部署。
import {readFile,writeFile,mkdir,lstat,readdir} from 'node:fs/promises';
// 路徑永遠相對此獨立工具，不接收使用者輸入。
import {fileURLToPath} from 'node:url';
// Manifest 使用逐檔 SHA256，不加入時間造成不可重現。
import {createHash} from 'node:crypto';
// 公開執行檔明確列出；測試與規格不混入 runtime。
export const files=['index.html','en/index.html','style.css','app.mjs','i18n.mjs','download.mjs','core/errors.mjs','core/input.mjs','core/product.mjs','core/export.mjs','core/session.mjs','robots.txt'];
// 根目錄從本模組推導，避免工作目錄錯誤覆寫其他專案。
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'dist/';
// 遞迴檢查只讀檔案與連結數；未知產物絕不刪除。
async function walk(dir,prefix=''){let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return[];throw e;}const result=[];for(const x of entries){const path=prefix+x.name,st=await lstat(dir+x.name);if(st.isSymbolicLink()||(!st.isDirectory()&&st.nlink!==1))throw Error('LINK_REJECTED');if(st.isDirectory())result.push(...await walk(dir+x.name+'/',path+'/'));else result.push(path);}return result;}
// 已有輸出只能是本工具完整 allowlist，不能清掉未知使用者資料。
for(const dir of ['dist','core','en']){try{if((await lstat(root+dir)).isSymbolicLink())throw Error('DIRECTORY_LINK_REJECTED');}catch(e){if(e.code!=='ENOENT')throw e;}}const existing=await walk(out);if(existing.some(x=>![...files,'manifest.json','_headers'].includes(x)))throw Error('UNKNOWN_OUTPUT');
// 每份來源先拒連結及缺檔，再讀入所有 bytes，寫入前完成檢查。
const payload=[];for(const path of files){const st=await lstat(root+path);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)throw Error('SOURCE_LINK_REJECTED');payload.push([path,await readFile(root+path)]);}
// 真 HTTP 標頭另由預覽伺服器呈現，不把 meta 當 frame-ancestors。
const headers="/*\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n";payload.push(['_headers',Buffer.from(headers)]);
// 所有固定檔案寫入自己的輸出樹，不移除任何其他路徑。
for(const[path,data]of payload){await mkdir(out+path.split('/').slice(0,-1).join('/'),{recursive:true});await writeFile(out+path,data);}
// Manifest 明確排除自身，避免遞迴雜湊。
const manifest={schemaVersion:1,mode:'preview-no-deployment',files:payload.map(([path,data])=>({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')}))};await writeFile(out+'manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({status:'BUILT_PREVIEW',files:payload.length}));
