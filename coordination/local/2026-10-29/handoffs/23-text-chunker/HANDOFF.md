# 文字分段與字數限制交接

狀態（2026-10-13，Asia/Taipei）：CHUNK-M1-R1 已修正跨 state 的舊 copy 回呼碰撞，M1 新候選凍結，等待主代理重新驗收。59 項自動 gate PASS；原生負向 clipboard、真 BFCache/pending、真設備 IME 等缺口明列 NOT_RUN，未算 PASS。未進 M2，也不是已發布或外驗完成的版本。

- 原功能 chat：`01a133ac-06c5-7d23-8365-bb516cc8d53a`，host `local`；主對話 `01a0c75e-24c2-76e1-8c70-536ae1ad1fbf`。
- 要求配置：`gpt-6.1-sol / max`；DISPATCH 記錄 create_thread 接受此配置。backend identity 未獨立確認；DISPATCH.json 未改。
- 版本 `0.1.0`，active milestone `M1-T00`，零 runtime/development 依賴，Node `v24.14.0`、npm `11.9.0`。
- 實際預覽：`http://127.0.0.1:4203/index.html`、`http://127.0.0.1:4203/en/index.html`。主預覽 Node PID `28668`、exec session `27133` 保留供主驗；bind `127.0.0.1`，未發生 port fallback。
- 當前 R1 證據（相對孵化器根）：`.runs/text-chunker/m1-r1-20261013/`。初次 M1 的 `.runs/text-chunker/m1-2026-10-13-01a133ac/` 固定證據保留，不覆寫。

實作包含 exact-descriptor request schema、Unicode scalar 驗證、raw limit ASCII 解析、strict / prefer-lf、100000 UTF-16 / 1000 chunks 硬上限與整份拒絕。UI 保留完整 raw draft，不使用 maxlength、不自動分段，任何輸入或設定變更即清空舊結果。每頁 25 段可遍歷全部結果；片段文字不加序號或分隔符。單段 copy 保留 revision/requestId/single-flight，R1 另以 WeakMap 綁 ticket 的 state 身分，app 回呼捕捉原 state 並先比對目前實體。API 缺少或 reject 時只在目前有效請求選取同段 readonly textarea，不宣稱成功。pagehide 釋放應用程式引用，reload/pageshow 不恢復草稿。清除回初始空來源與預設 strict/280；280 是可修改的起始值，不代表任何平台限制。

## CHUNK-M1-R1 的具體修正

主驗受控重現顯示，舊、新 state 都可以產生 `{requestId:4,revision:2,index:1}`。舊 app 的 settled 閉包讀取 mutable global state，而 state helper 只看數值，因此舊 resolve/reject 可解鎖新 copy、報舊成功或選中新 fallback。這是已確認的程式缺陷；下方初次 M1 的「未驗」敘述是保留的歷史證據，不代表這個後續發現不存在。

- `public/js/state.mjs`：WeakMap 記錄每個實際 ticket 的 owner，`finishCopy` 同時驗 owner、disposed、busy、revision/requestId。ticket 的公開三個數值欄位不變，跨 state 的同值 ticket 和複製 ticket 均不能冒用。
- `public/js/app.mjs`：copy 開始即捕捉 `copyState`；snapshot 及 settlement 使用此實體，若 global state 已換代直接返回，DOM 提示/焦點/選取/鎖定均不變。
- `test/app-fixture.mjs`、`test/copy-lifecycle.test.mjs`：以最小 fake DOM/受控 Promise 直接 import 真正 production app.mjs ESM，不改寫 source、不重寫 settled 邏輯。兩語、舊 resolve/reject、新 resolve/reject 共 8 組覆蓋新 copy pending；另驗空的替換 state。每組核對文字、notice、busy、editing/copy locks、焦點和選取，並確認新請求自己的 resolve/reject 仍正常。
- `test/ui-contract.test.mjs`：驗兩個完全同值 ticket 的跨 state owner，舊回呼拒絕且新 busy 保留。
- `test/toolchain.test.mjs`：只把 test-owned fixtures 目錄改到 R1 evidence，使本輪 acceptance 不寫初次 M1 frozen records。
- 修正前：聚焦 19 項中 9 項按預期 FAIL（8 組實際 app 回呼 + 1 owner collision）。修正後：19/19 PASS；final npm test 59/59 PASS、0 skip。完整 red/green logs、actual trace、diff 在 R1 evidence。
- `integration-trace.json` 實測同值 tickets、舊 resolve/reject 均不被新 state 接受；8 組真 app 整合回呼不改新 DOM，新請求才解鎖/選取。這是受控離線整合，不是原生 clipboard 或真 BFCache PASS。

## 固定檔案

R1 `source-manifest.json` 固定全部 39 個工具 source（不含 dist），逐檔 bytes/SHA256；`code-manifest.json` 固定 21 個實作/測試/工具鏈檔；`runtime-manifest.json`、`dist-manifest.json` 各固定 8 個 allowlist assets。digest 定義：SHA256(JSON.stringify(sorted records) + LF)。

- R1 code digest：`538aeb379eff1e85b1998a14f00dd35e0de9d5e6e6ca0be1d8c3246b41259621`
- R1 runtime / dist digest：`3608f282455e7f666e967d11121e144463429bd9790a556b976ee77d19aa474c`（逐 bytes 相同）
- `baseline-source/`、`baseline-source-manifest.json` 保留改動前 37 個 source，且 R1 開始前逐檔核對原 M1 固定 hash 無重疊修改。`changes.patch` 與 `changes.json` 是實際 source diff/scope check；核心、HTML/CSS、i18n、DISPATCH、package、toolchain scripts 完全未改。
- 本輪 freeze 命令為 `node ../../.runs/text-chunker/m1-r1-20261013/freeze.mjs --full-source`。舊 `scripts/snapshot.mjs` 仍指向初次 M1 證據，因此本輪沒有執行它。
- 初次 `spec-initial-manifest.json` 留初始規格 hashes；靜態規格的 SPEC_ONLY/NOT_RUN 是初始歷史文字，當前執行狀態以本文件、TASK-ENTRY、project.json 與 R1 evidence 為準，核心規格未修改。

## 驗證

- R1 `& 'C:/Program Files/nodejs/npm.cmd' test`：exit 0，59/59 PASS，0 skip；涵蓋 A01–A28、原有 state/工具鏈及新增 actual app callback/owner regressions。初次 M1 假目錄清理 EISDIR 的歷史 log 保留。
- `& 'C:/Program Files/nodejs/npm.cmd' run check`：exit 0；實際 Node --check、雙語 HTML 結構/labels/local active refs、preview noindex/robots、固定 loopback 配置。有限 HTML subset/parser 與 source API 掃描不宣称完整安全審計。
- `& 'C:/Program Files/nodejs/npm.cmd' run build`：exit 0；只複製 8 個 reviewed public files。測試拒絕 traversal、hidden/unknown public、malformed syntax、unknown import、junction/source/target hardlink、未知 stale dist；外部 fake sentinel 未變。占用 port 的假服務保留，第二個服務 OS 分配 loopback port。
- R1 Windows guard：before/after 均 PASS，完整 Snapshots 相同，且 before 與初次 M1 after 相同。User/Machine PATH hash/type/length/ephemeral counts 與 Environment-key/TEMP/TMP fingerprints 不變。完整 JSON 與 comparison 留證。
- R1 真 browser affected flows：新獨立 IAB tab 載入修正 runtime，原 tab/主 preview 保留。繁中 strict/2 `A😀BC` → `A😀` / `BC`、原生 copy2 讀得 BC；edit limit 立即清掉全部片段/按鈕，limit4 新 copy 讀得 A😀BC。英文 strict/2 原生 copy1 讀得 A😀；320px 以 keyboard 切 prefer-lf/4，`ab\ncdEF` → `ab\n` / `cdEF`、clipboard 讀得 cdEF，scrollWidth305 ≤ innerWidth320。兩語 refresh 空來源/0片段/default280，最後 ABCDE → AB/CD/E 原生 copy2 讀得 CD。R1 screenshots/browser-results.json 留實際值。

以下為初次 M1 仍適用且未變動的證據範圍（原 evidence 保留，沒有宣稱本輪重做全部原生測量）：
- 真瀏覽器：Codex IAB 實際 renderer，繁中/英文 `A😀BC` → `A😀` / `BC`，來源 4 code points / 5 UTF-16 units；兩種模式重組等於當下 textarea.value；修改即失效。`ab\r\ncd\rEF\n尾😀\n` 由 browser textarea 正規化為 `ab\ncd\nEF\n尾😀\n`，僅以後者驗 UI，core CRLF/CR 另有固定測試。
- 320×720：兩語主流程、中文多行輸入實測。1000 段遍歷 40 頁、重組相等、最後 Z 可見可複製；40 頁 document scrollWidth 305 ≤ innerWidth 320，無整頁水平溢出。
- 鍵盤：source → limit → mode → Split → Clear → Copy；ArrowDown/Tab/Enter 完成 `ABCDE` → `AB` / `CD` / `E`。2px ink outline + 6px acid focus ring 實測；readonly 第 2 段可用 Select All 選取 [0,2]。
- Native clipboard 成功：點 Copy chunk 2 實際讀得 `BC`；末段第 1000 段讀得 `Z`。不是 clipboard mock。
- 組字回歸：byte-identical fixture 在真 renderer 收 synthetic compositionstart/input/end（isTrusted=false），來源沒有被應用程式改寫，組字期間 Split disabled，結束不自動分段，明確按鈕後成功。這不是原生 IME PASS。
- B11：兩語刷新提示可見，refresh 後 source 空、chunks 0，未恢復資料。

## 未驗與限制

| 項目 | 結果 |
|---|---|
| B04 真設備原生 IME / 虛擬鍵盤 | NOT_RUN；320px 中文輸入與 synthetic 事件回歸分開記錄 |
| B05 原生 API 不可用/reject 後自動選取 fallback、B07 原生拒絕觸發 fallback | NOT_RUN；主流程 keyboard/manual readonly selection 已測 |
| B06 原生 clipboard pending 時嘗試編輯 | NOT_RUN；single-flight/revision/requestId 離線測試 PASS |
| 真 BFCache 與原生 pending clipboard 的跨 state 生命週期 | NOT_RUN；R1 受控 actual app integration PASS 不替代此項 |
| B09 實際 200% browser zoom | NOT_RUN；viewport override 沒有冒充 zoom |
| B10 完整 DevTools Network / Storage | 各自 NOT_RUN；source review、CSP、refresh 不冒充完整 trace |
| 主代理 R1 獨立重新驗收 | NOT_RUN；初次主驗發現 copy instance 碰撞並要求 R1，仍需正式放行才可 M2 |

原生負向 clipboard 嘗試：Permissions Policy iframe 在 IAB 仍允許 copy，保留 FAIL-fixture-assumption 的實際輸出；opaque-origin 替代法的 visible/enabled Split 在 driver press 時超時，未安全測得負向路徑。未改產品 clipboard API、未用 mock 算 PASS、未盲重試。此為測量缺口，沒有據此推論產品程式缺陷。隔離 fixture 只在 evidence，應用程式 bytes/hash 與 runtime 完全相同；兩個 task-owned fixture servers 已停止（PID 66352 身分核對後停止，PID 16812 以 stdin close 正常退出），主 preview 未動。

browser-results.json 保留輸入/輸出/操作、320px widths、成功與失敗方法、全部分項 NOT_RUN；PNG 截圖、final-commands.json 與完整 command logs 可獨立檢視。

## 下一個 gate

主代理重新檢查 R1 固定 source/code/runtime/dist、actual diff、red/green regressions 與上述原生缺口；正式放行後本原功能 chat 才執行 M2。GitHub `https://github.com/KYStr/glossquote-labs-text-chunker` 尚未建立/發布，visibility/commit/固定 blob ZIP 全 NOT_RUN；Cloudflare `https://chunks.glossquote.com`、雙語首頁與外部複驗全 NOT_RUN。完整功能 goal 不因 M1/R1 凍結標 complete；其先前 blocked gate 記錄保留，這次按主代理指示修正 M1，未取得 M2 放行。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-text-chunker/commit/4744fdeb85de606b3dbd44b05da112a5ef426c2b（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑63測試及test / check / build / build:production / check:production全通過。39項正式HTTP回應及12資產核對通過；Cloudflare version 5a7fca28-4fb7-4972-9315-39d0ffaf5154。

正式站：[繁中](https://chunks.glossquote.com/index.html) / [English](https://chunks.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。原對話修正舊複製Promise回呼污染新狀態；主驗實際app回呼矩陣與Unicode分段。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `4744fdeb85de606b3dbd44b05da112a5ef426c2b` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：63項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->
