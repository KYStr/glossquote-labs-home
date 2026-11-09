// 有限靜態檢查不是全面安全認證。
import {readFile} from 'node:fs/promises';
// Node 子程序只用來語法檢查，不跑外部套件。
import {spawnSync} from 'node:child_process';
// 檔案定位限定工具根。
import {fileURLToPath} from 'node:url';
// 雙語鍵集合需要完全對等。
import {messages,errors} from '../i18n.mjs';
// 固定模組清單避免意外掃入其他工具。
const root=fileURLToPath(new URL('../',import.meta.url)),files=['app.mjs','i18n.mjs','download.mjs','core/errors.mjs','core/input.mjs','core/product.mjs','core/export.mjs','core/session.mjs'];
// 雙語標籤與固定錯碼都有兩份非空文字。
if(JSON.stringify(Object.keys(messages.zh).sort())!==JSON.stringify(Object.keys(messages.en).sort())||Object.values(errors).some(x=>x.length!==2||x.some(v=>!v)))throw Error('TRANSLATION_KEYS');
// 禁止持久儲存、遙測、動態程式與外部模組；允許已核首頁連結。
for(const f of files){const text=await readFile(root+f,'utf8');if(/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|eval)\s*[.(]|\.innerHTML\s*=|document\.cookie/.test(text)||/import\s*\(/.test(text))throw Error('FORBIDDEN_RUNTIME_API '+f);if(spawnSync(process.execPath,['--check',root+f]).status!==0)throw Error('SYNTAX '+f);for(const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g))if(!m[1].startsWith('./')&&!m[1].startsWith('../'))throw Error('EXTERNAL_IMPORT');}
// 預覽兩語明確 noindex，沒有假 origin 的正式 canonical。
for(const f of ['index.html','en/index.html']){const t=await readFile(root+f,'utf8');if(!t.includes('noindex,nofollow')||/rel="canonical"|https?:\/\//.test(t))throw Error('PREVIEW_POLICY');}console.log('CHECK_PASS_STATIC_LIMITED');
