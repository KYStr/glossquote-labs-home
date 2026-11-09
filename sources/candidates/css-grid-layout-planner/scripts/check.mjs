import { readFile,readdir } from 'node:fs/promises'; // 檢查自足來源。
import { spawnSync } from 'node:child_process'; // 僅執行本機Node語法檢查。
import { messages } from '../public/i18n.mjs'; // 字典鍵對等。
import assert from 'node:assert/strict'; // 明確失敗終態。
const root=new URL('../',import.meta.url);assert.deepEqual(Object.keys(messages.zh).sort(),Object.keys(messages.en).sort()); // 不漏狀態翻譯。
for(const folder of ['public','scripts','tests'])for(const file of await readdir(new URL(folder+'/',root))){if(!file.endsWith('.mjs'))continue;const path=new URL(folder+'/'+file,root),s=await readFile(path,'utf8');assert.equal(spawnSync(process.execPath,['--check',path.pathname]).status,0);for(const line of s.split('\n'))if(line.trim())assert.match(line,/[\u3400-\u9fff]/,`${folder}/${file} missing Chinese line comment`);} // 每非空作者程式行要中文註解。
for(const file of ['app.mjs','controller.mjs','core.mjs']){const s=await readFile(new URL('public/'+file,root),'utf8');assert.doesNotMatch(s,/\.innerHTML\s*=|\.cssText\s*=|insertRule\s*\(|eval\s*\(|new Function|localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|execCommand/);} // 有限靜態掃描不是安全品質分。
for(const file of ['index.html','en/index.html']){const s=await readFile(new URL('public/'+file,root),'utf8');assert.match(s,/style-src-attr 'none'/);assert.match(s,/noindex,nofollow/);assert.doesNotMatch(s,/style="|https?:\/\//);} // preview不夾外部資源。
console.log('Syntax, bilingual keys, Chinese comments and limited sink checks passed'); // 不冒原生行為已測。
