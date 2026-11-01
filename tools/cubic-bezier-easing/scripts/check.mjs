import fs from 'node:fs/promises'; // 檢查固定原始碼檔案而不執行產品 UI。
import path from 'node:path'; // 固定專案檔案定位。
import {spawnSync} from 'node:child_process'; // 只啟動既有 Node 的語法檢查。
import {root, payload} from './build.mjs'; // 使用建置白名單核必要產物。
import assert from 'node:assert/strict'; // 所有靜態失敗直接阻止作者交驗。
for (const name of payload) { // 逐檔檢查危險 sink 與必要中文說明。
  const text = await fs.readFile(path.join(root, name), 'utf8'); // 不讀任何外部資料。
  if (name.endsWith('.mjs')) { // JavaScript 使用引擎語法檢查。
    const result = spawnSync(process.execPath, ['--check', path.join(root, name)], {encoding: 'utf8'}); assert.equal(result.status, 0, result.stderr); // 固定命令無 shell 插值。
    for (const line of text.trimEnd().split('\n')) assert.match(line, /\/\/.*[\u4e00-\u9fff]/, `${name}: missing Chinese line comment`); // 每行 JS 必須有具體中文註解。
    assert.doesNotMatch(text, /innerHTML|outerHTML|insertAdjacentHTML|eval\s*\(|new\s+Function|document\.write|localStorage|sessionStorage|indexedDB|execCommand/); // 不准危險輸出或持久化 API。
  } // 結束 JavaScript 靜態檢查。
  if (name.endsWith('.html')) { assert.equal((text.match(/<h1>/g) || []).length, 1); assert.match(text, /noindex, nofollow/); assert.doesNotMatch(text, /<style|\sstyle=|\son[a-z]+=/i); assert.match(text, /readonly/); } // 雙語文件保留單一標題與無 inline 行為。
} // 結束所有固定產物檢查。
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')); assert.equal(pkg.dependencies, undefined); assert.equal(pkg.devDependencies, undefined); // 不新增套件安裝需求。
console.log('Static syntax, safe sinks, bilingual document structure and zero-dependency checks passed.'); // 清楚描述靜態檢查，非原生驗收。
