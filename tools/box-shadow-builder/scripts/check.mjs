import fs from 'node:fs/promises'; // 只讀本工具固定來源，不讀憑證。
import {spawnSync} from 'node:child_process'; // 語法核對不安裝套件。
import {messages} from '../public/i18n.mjs'; // 雙語鍵集須一致。
import assert from 'node:assert/strict'; // 明確失敗即非零退出。
assert.deepEqual(Object.keys(messages.zh).sort(),Object.keys(messages.en).sort()); // 不容許漏翻譯鍵。
for(const file of ['core.mjs','controller.mjs','app.mjs','i18n.mjs']){const path=new URL('../public/'+file,import.meta.url);const r=spawnSync(process.execPath,['--check',path.pathname],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const source=await fs.readFile(path,'utf8');assert.ok(!/\b(?:fetch|eval|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\s*[.(]/.test(source),file);for(const line of source.split('\n').filter(l=>l.trim()))assert.ok(line.includes('//'),`${file}: missing explanatory comment`);} // 防守性靜態檢查不是完整安全或品質評分。
for(const file of ['index.html','en/index.html']){const s=await fs.readFile(new URL('../public/'+file,import.meta.url),'utf8');assert.ok(s.includes("style-src-attr 'none'"));assert.ok(!/\son\w+=|https?:\/\/|<style/.test(s));assert.ok(s.includes('noindex,nofollow'));} // 不夾外部資源或假正式origin。
console.log('Static syntax, translation keys, comments and declared safety checks PASS'); // 只說明實際核過範圍。
