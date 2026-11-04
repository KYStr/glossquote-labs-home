// 有限靜態檢查不是安全或可及性認證。
import fs from 'node:fs/promises';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {spawnSync} from 'node:child_process';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {root,files} from './build.mjs';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {messages} from '../public/i18n.mjs';
// 執行下列具名固定斷言；只證受控案例，不換算產品品質分數。
for(const file of files.filter(p=>p.endsWith('.mjs'))){const result=spawnSync(process.execPath,['--check',root+'public/'+file],{encoding:'utf8'});if(result.status!==0)throw Error('SYNTAX');const src=await fs.readFile(root+'public/'+file,'utf8');if(/innerHTML|\.cssText|\beval\s*\(|new Function|localStorage|sessionStorage|indexedDB|serviceWorker|sendBeacon/.test(src))throw Error('PROHIBITED_API');}
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
if(JSON.stringify(Object.keys(messages.en).sort())!==JSON.stringify(Object.keys(messages.zh).sort()))throw Error('LOCALE_KEYS');
// 執行下列具名固定斷言；只證受控案例，不換算產品品質分數。
for(const f of ['index.html','en/index.html']){const html=await fs.readFile(root+'public/'+f,'utf8');if(!html.includes('noindex,nofollow')||/rel="canonical"|maxlength=|type="number"/.test(html)||!html.includes('id="work" disabled'))throw Error('HTML_CONTRACT');for(const match of html.matchAll(/data-text="([^"]+)"/g))if(!Object.hasOwn(messages.en,match[1]))throw Error('LOCALE_MISSING');}
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
console.log('CHECK_PASS_LIMITED');
