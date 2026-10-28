import assert from 'node:assert/strict'; // 引入斷言，確認測試設定本身正確。
import path from 'node:path'; // 建立平台相容路徑。
import { fileURLToPath } from 'node:url'; // 將路徑轉成 ES 模組網址。
import { readFile, writeFile, mkdir } from 'node:fs/promises'; // 讀取既有反例並保存本輪證據。
const root = path.resolve(process.argv[2] || fileURLToPath(new URL('../../../', import.meta.url))); // 第一參數是獨立解壓的工作副本。
assert(process.argv[3], 'NEW_OUTPUT_PATH_REQUIRED');
const destination = path.resolve(process.argv[3]); // 第二參數是新輸出檔，不覆寫交付證據。
const base = new URL('./', import.meta.url).href; // 固定候選的相對位置。
const api = await import(base + 'evidence.mjs'); // 載入實際受驗分類器。
const fixture = await import(base + 'offline-fixtures.mjs'); // 載入明確標為 synthetic 的收據，不啟動 CDP。
const observations = []; // 收集每一項預期與實際結果。
const identities = new Set(); // 避免重複案例識別碼。
function record(id, group, passed, details = {}) { // 統一記錄斷言結果，不在第一個失敗時丟失其他證據。
  assert(!identities.has(id), 'Duplicate test id'); identities.add(id); // 每筆案例必須有獨立識別碼。
  observations.push({ id, group, passed: Boolean(passed), ...details }); // 保存必要結果，不製造總體產品通過率。
} // 結束結果記錄函式。
function inspect(row, id, group, expected = 'reject') { // 執行單例分類並核對驗收邊界。
  let result, exception = null; // 捕捉分類器例外，不能把崩潰當成正常拒絕。
  const before = JSON.stringify(row); // 保存輸入序列化結果以驗證無副作用。
  try { result = api.classifyCase(row); } catch (error) { exception = String(error); } // 只執行純分類函式。
  const unchanged = JSON.stringify(row) === before; // 分類不能修改原收據。
  const boundary = result?.fullNetworkAccepted === false && result?.fullT02Accepted === false; // 診斷結果不能被升級成產品／發布通過。
  const verdict = expected === 'pass' ? result?.status === 'PASS' : expected === 'native-fail' ? result?.status === 'FAIL' && result.nativeFailures.length === 1 : result?.status !== 'PASS' && result?.evidenceStatus !== 'VALID_THREE_WAY_OBSERVATION'; // 分別核對正例、原生失敗與無效資料。
  record(id, group, !exception && unchanged && boundary && verdict, { expected, actual: result?.status ?? 'THREW', evidenceStatus: result?.evidenceStatus, reasons: result?.reasons, unchanged, boundary, exception }); // 保存真實輸出。
  return result; // 讓需要整組對照的呼叫端使用結果。
} // 結束單例檢查。
const nativeResponse = row => row.native.events.find(event => event.method === 'Network.responseReceived').response; // 取得固定 fixture 請求的 native response。
for (const original of fixture.cases()) { // 覆蓋六個獨立的 A/B namespace。
  inspect(original, `${original.id}/positive`, 'positive', 'pass'); // 正常合成收據仍應通過。
  inspect(JSON.parse(JSON.stringify(original)), `${original.id}/json-roundtrip`, 'positive', 'pass'); // 實際 JSON 序列化讀回不得改變結果。
  inspect(fixture.failNative(structuredClone(original)), `${original.id}/native-fail`, 'preserved-native-fail', 'native-fail'); // 已知 loadingFailed 必須保留為失敗。
  for (const counter of [2, 5, 17]) { // 合法寫入次數不可被過度綁死為原 fixture 的 3。
    const row = structuredClone(original); row.server.sourceWriteCalls = counter; if (row.mode === 'A') row.server.transportWriteCalls = counter; // 仍維持各策略原有關係。
    inspect(row, `${row.id}/valid-counter/${counter}`, 'positive', 'pass'); // 不放寬策略，只改合法計數。
  } // 結束合法計數對照。
  const lower = structuredClone(original); lower.server.responseHeaders = Object.fromEntries(Object.entries(lower.server.responseHeaders).map(([key, value]) => [key.toLowerCase(), value])); // header 名稱大小寫不影響實際語意。
  inspect(lower, `${lower.id}/header-case`, 'positive', 'pass'); // 驗證未誤擋合法 header 大小寫。
  for (const [index, bad] of [2.5, '3', Number.MAX_SAFE_INTEGER + 1, 0, 1, -1, null, true].entries()) { // 包含舊版會誤放行的 JSON 可表示值。
    const row = structuredClone(original); row.server.sourceWriteCalls = bad; if (row.mode === 'A') row.server.transportWriteCalls = bad; // 僅修改寫入次數。
    inspect(row, `${row.id}/counter/${index}`, 'new-counter-type'); // 不可能的寫入次數必須拒絕。
  } // 結束計數型別邊界。
  for (const field of ['networkReadyOrder', 'navigationSendOrder', 'runtimeSendOrder']) { // 操作序號應由 ++order 產生。
    for (const [index, value] of [String(original.control[field]), original.control[field] + 0.25, 0, -1, null, Number.MAX_SAFE_INTEGER + 1].entries()) { // 檢查字串、小數、無效範圍與不安全整數。
      const row = structuredClone(original); row.control[field] = value; // 保留其他收據不動。
      inspect(row, `${row.id}/order/${field}/${index}`, 'new-control-type'); // 不依賴比較運算的隱式轉型。
    } // 結束一個序號欄位。
  } // 結束全部操作序號。
  for (const [index, value] of ['20', '99999999999999999', null, true, -1].entries()) { // 導航時間必須是有限非負 number。
    const row = structuredClone(original); row.control.navigationSentAtMs = value; // 固定其餘時間與順序。
    inspect(row, `${row.id}/time/${index}`, 'new-control-type'); // 檢查時間型別。
  } // 結束時間檢查。
  for (let stage = 0; stage < 5; stage += 1) { // 固定成功 reader 的五階段。
    for (const field of ['receivedBytes', 'eof', 'hashChecked', 'hashOk', 'readerLocked', 'lockObserved', 'outcomeCode']) { // 覆蓋完整狀態欄位。
      for (const mutation of ['missing', 'string', 'boolean', 'null']) { // 延伸前輪的 0/1 翻轉，改驗缺失與型別錯置。
        const row = structuredClone(original), target = row.firstParty.receipts[stage]; // 每次建立獨立副本。
        if (mutation === 'missing') delete target[field]; else target[field] = mutation === 'string' ? String(target[field]) : mutation === 'boolean' ? Boolean(target[field]) : null; // 只修改選中的欄位。
        inspect(row, `${row.id}/phase/${stage}/${field}/${mutation}`, 'extended-phase-schema'); // 不能以 truthy 或隱式轉型接受。
      } // 結束欄位變異。
    } // 結束狀態欄位。
  } // 結束五階段。
  for (const field of Object.keys(fixture.SERVER_HEADERS)) { // 逐一驗證固定 server 的九個 header。
    for (const mutation of ['missing', 'mismatch']) { // 缺少欄位與內容矛盾都不能放行。
      const row = structuredClone(original); if (mutation === 'missing') delete row.server.responseHeaders[field]; else row.server.responseHeaders[field] = 'contradiction'; // 更改 server 端單一欄位。
      inspect(row, `${row.id}/server-header/${field}/${mutation}`, 'extended-header-schema'); // 比對另一份獨立完整 header。
    } // 結束 header 變異。
  } // 結束 server header。
  for (const field of ['content-length', 'cache-control']) { // native observer 固定保留的必要 header。
    for (const mutation of ['missing', 'mismatch']) { // 驗缺失與不一致。
      const row = structuredClone(original); if (mutation === 'missing') delete nativeResponse(row).headers[field]; else nativeResponse(row).headers[field] = 'contradiction'; // 只更改 native 觀測。
      inspect(row, `${row.id}/native-header/${field}/${mutation}`, 'extended-header-schema'); // 不讓獨立來源互相矛盾。
    } // 結束 native header 變異。
  } // 結束必要欄位。
} // 結束六例測試。
const receiptPath = path.join(root, '.runs/new-candidates-acceptance-2026-10-23/external/output/evidence/receipt-regression.json'); // 原外驗的完整矛盾輸入。
const saved = JSON.parse(await readFile(receiptPath, 'utf8')).results.filter(row => row.kind === 'negative'); // 讀取原有 90 反例，不重建成較弱版本。
assert.equal(saved.length, 90); // 確認完整載入。
for (const row of saved) inspect(structuredClone(row.input), `external/${row.id}/${row.name}`, 'external-90-replay'); // 重新對受驗候選分類。
for (const [index, bad] of [2.5, '3', Number.MAX_SAFE_INTEGER + 1].entries()) { // 驗證單例問題是否會污染整組結論。
  const rows = fixture.cases(); for (const row of rows) { row.server.sourceWriteCalls = bad; if (row.mode === 'A') row.server.transportWriteCalls = bad; } // 所有 namespace 都含同類錯誤。
  const actual = api.classifyRun(rows); // 執行六例總判定。
  record(`run/counter/${index}`, 'aggregate-negative', actual.conclusion === 'INVALID_OR_INCOMPLETE_COMPARISON' && !actual.fullNetworkAccepted && !actual.fullT02Accepted && actual.historicalFailedRetained === 69 && actual.historicalMissingTerminalsRetained === 3, { value: bad, conclusion: actual.conclusion }); // 拒絕誤稱歷史錯誤未重現。
} // 結束整組負例。
for (const name of ['positive', 'all-native-fail', 'A-native-fail']) { // 保留原有三種合法診斷分類。
  const rows = fixture.cases(); if (name !== 'positive') rows.filter(row => name === 'all-native-fail' || row.mode === 'A').forEach(fixture.failNative); // 生成指定原生結果。
  const actual = api.classifyRun(rows), expected = name === 'positive' ? 'HISTORY_NOT_REPRODUCED' : name === 'all-native-fail' ? 'BOTH_STRATEGIES_FAILED' : 'CONSISTENT_SUBMISSION_STRATEGY_DIFFERENCE'; // 固定明確預期。
  record(`run/${name}`, 'aggregate-positive', actual.conclusion === expected && !actual.fullNetworkAccepted && !actual.fullT02Accepted && actual.historicalFailedRetained === 69 && actual.historicalMissingTerminalsRetained === 3, { expected, actual: actual.conclusion }); // 不因新增防護抹掉歷史失敗。
} // 結束整組正例。
const groups = {}; // 各組分開計數，避免與其他 runner 重疊加總。
for (const row of observations) { groups[row.group] ??= { cases: 0, pass: 0, fail: 0 }; groups[row.group].cases += 1; groups[row.group][row.passed ? 'pass' : 'fail'] += 1; } // 從實際結果產生數字。
const output = { scope: 'OFFLINE_SYNTHETIC_CLASSIFIER_ONLY_NOT_BROWSER', runtime: process.version, total: observations.length, passed: observations.filter(row => row.passed).length, failed: observations.filter(row => !row.passed).length, groups, observations }; // 明確標記環境與範圍。
await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' }); // 保存完整可追查證據。
console.log(JSON.stringify({ scope: output.scope, total: output.total, passed: output.passed, failed: output.failed, groups }, null, 2)); // 命令列只顯示摘要。
process.exitCode = output.failed ? 1 : 0; // 異常輸入誤通過必須讓驗收命令失敗。
