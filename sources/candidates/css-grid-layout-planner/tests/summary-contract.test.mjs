import test from 'node:test'; // 此定向測試僅核摘要契約，不冒原生可見證據。
import assert from 'node:assert/strict'; // 使用明確固定預期。
import { readFileSync } from 'node:fs'; // 讀實際摘要組裝來源。
import { messages } from '../public/i18n.mjs'; // 使用產品兩語鍵。
test('摘要採快照列欄與具名跨度格數',()=>{ // 只檢新增輸出欄位連接。
  const source=readFileSync(new URL('../public/app.mjs',import.meta.url),'utf8'); // 不呼叫隱藏handler。
  for(const token of ['${t.gridSize}: ${v.rows} × ${v.columns}','${t.rowSpan}: ${b.rowSpan}','${t.columnSpan}: ${b.columnSpan}','${t.cells}: ${b.cells}'])assert.ok(source.includes(token)); // 四個必要欄位不能再漏。
  assert.equal(messages.zh.rowSpan,'列跨度');assert.equal(messages.en.rowSpan,'Row span');assert.equal(messages.zh.cells,'格數');assert.equal(messages.en.cells,'Cells'); // 雙語標籤具體可讀。
}); // 新增定向測試完成。
