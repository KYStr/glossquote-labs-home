import test from 'node:test'; // 作者靜態契約檢查，不冒瀏覽器或讀屏證據。
import assert from 'node:assert/strict'; // 使用內建斷言。
import fs from 'node:fs'; // 只讀已凍結來源。
test('shared geometry remains visible once per language and mode retains references',()=>{ // 僅核模板與安全文字關聯。
 for(const path of ['public/index.html','public/en/index.html']){const html=fs.readFileSync(path,'utf8');assert.equal((html.match(/data-text="explain"/g)||[]).length,1);assert.ok(html.indexOf('id="geometry-help"')<html.indexOf('<form'));assert.match(html,/<p id="geometry-help" class="hint" data-text="explain"><\/p>/);} // 保留完整可見共享說明。
 const app=fs.readFileSync('public/app.mjs','utf8');assert.ok(app.includes("key==='mode'?`${t.outer} / ${t.inset}`"));assert.ok(app.includes('`${hint.id} geometry-help`'));assert.ok(app.includes("match[2]==='mode'?' geometry-help':''")); // 正常與首錯皆保持可達的說明關聯。
}); // 結束靜態契約，未主張原生輔助技術通過。
