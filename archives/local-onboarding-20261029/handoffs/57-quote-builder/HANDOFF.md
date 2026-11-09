# 報價單快速製作 — B20-57-M1 交接

2026-10-23（Asia/Taipei）。**M1 雙語本地候選已實作並凍結，等待主代理獨立檢查。** 原始狀態為「規格已準備，尚未實作／驗收／公開／部署」；此文件記錄本輪實際進展。原有六份規格、起點、AGENTS 與 docs 保持只讀，其「尚未實作」是原規格狀態；目前狀態以本交接與 [TASK-ENTRY](TASK-ENTRY.md) 為準。

| 範圍 | 狀態與證據 |
| --- | --- |
| Node 自動驗收 | PASS，31/31 tests，0 fail/skip；check/build exit 0 |
| 固定 A01–A20 | PASS，限純核心、離線 controller / DOM fixture 範圍，詳下表 |
| 真瀏覽器／實際下載／視覺／Network/Storage／原生／真機 | NOT_RUN_USER_FOCUS_INCIDENT |
| loopback server 啟動／真 HTTP socket | NOT_RUN_BY_TASK_NO_SERVER；本輪指令禁止啟動 server |
| Windows Environment 前後完整 Snapshots | PASS，相同，見 [final comparison](evidence/m1/environment-final-comparison.json) |
| GitHub／正式網址／共享首頁 | NOT_PUBLISHED；僅 M1，未獲 M2 放行 |
| 外部驗收 | NOT_RUN；不是完整產品驗收或正式發布 |

requested `gpt-6.1-sol/max`；沒有以自述宣稱實際 backend 已獨立確認。本輪未開 chat、未委派子代理。

## 實作與差異

本工具起始僅 14 份文件，整個目錄在根 Git 為 untracked。新增 `package.json`、`.gitignore`、8 個 `public` 檔案、7 個 `scripts`、9 個 `test` 檔案、`TASK-ENTRY.md`，更新本 `HANDOFF.md`；`dist` 為 8 個 allowlist 檔案的生成拷貝。任務證據只在 `evidence/m1/`。共 28 個新增／更新的實作與任務檔案，13 個原有只讀規格／契約保留；完整 bytes / SHA-256 見 [source manifest](evidence/m1/source-manifest.json)。沒有修改共享首頁、看板、兄弟工具、GlossGate、既有交付包或系統設定。

- `public/js/core/decimal.mjs`：純十進位字串、BigInt parser、固定兩位金額與最多三位數量格式化；不經浮點金額轉換。
- `public/js/core/quote.mjs`：exact schema、Unicode scalar、控制字元／surrogate 檢查、1–50 筆、固定折扣與單次稅額 half-up。
- `public/js/core/safe-output.mjs`：固定雙語靜態文件、`& < > " '` 跳脫、僅輸入欄位的 JSON、原子 HTML+JSON UTF-8 byte gate。
- `public/js/core/import.mjs`：fatal UTF-8、512 KiB、bounded parser（6 層／2000 節點）、tokenizer 階段重複鍵拒絕、精確 schema 復驗。
- `public/js/app.js`：雙語表單、增刪品項、DOM textContent 真預覽、整批錯誤摘要與欄位連結、FileReader 取消／確認、generation 失效、Blob URL 清理、clear / pagehide / BFCache blank resume。
- `public/index.html`、`public/en/index.html`、`public/styles/app.css`：指定 title/description/H1/FAQ、同語首頁、雙語互鏈、noindex；Wide 40% editor / 60% quote，Standard/Compact 以具名切換給完整畫布。44px、雙層 focus、減少動態為已實作樣式，實際外觀仍未驗。
- `scripts`：check 的必要檔／21 ESM syntax／資源與 API 掃描、封閉 allowlist build、拒 symlink/junction 與未知輸出（不刪檔湊成功）；受限 dev handler、gates 紀錄、產物證據及 freeze。

資料只存在目前頁面記憶體。保存草稿需主動下載 JSON，再選檔、預覽欄位數與名稱並確認整份取代；不背景儲存。空名稱輸出「未填／Not provided」。預覽成功只保留同版 bytes，Blob URL 延至明確點下載才建立；同時符合成對產物與禁止自動下載的要求。修改／匯入讀取開始即使舊預覽和下載失效。清除採頁內確認，不呼叫原生 confirm/print/save dialog。

## 順序任務與實際命令

T00 scaffold → T01 parser → T02 quote → T03 安全輸出／匯入 → T04 工作區 → T05 生命週期 → T06 雙語內容／樣式 → T07 工具鏈 → T08 最終驗收與 freeze。各階段固定預期與歷史失敗保留於 [iterations](evidence/m1/iterations.md)。T04/T06 真頁面操作及視覺部分依禁止 browser 指令停止在 NOT_RUN；已完成其可獨立的來源、Node 接線與靜態檢查。

本機 Node **v24.14.0**。無 runtime/dev dependency，未執行 npm install。為在 Windows 隱藏執行並保留要求的 npm scripts，`scripts/run-gates.mjs` 以現有 `node.exe` 呼叫相鄰 `node_modules/npm/bin/npm-cli.js`，child `shell:false`、`windowsHide:true`。check 的語法 child 亦同。

| 最終命令 | exit | 結果 |
| --- | ---: | --- |
| `node scripts/run-gates.mjs` → `npm test` | 0 | 31 tests、31 PASS、0 FAIL/CANCEL/SKIP/TODO |
| 同 runner → `npm run check` | 0 | 8 public files、21 ESM syntax；靜態 local-resource/API 檢查 |
| 同 runner → `npm run build` | 0 | 8 preview files；兩頁均 noindex,nofollow |
| `node scripts/produce-evidence.mjs` | 0 | 實寫／重讀 4 份 UTF-8 產物，固定內容、hash、JSON restore 驗證 |
| `check-persistent-environment.ps1` 前／最終後及完整比較 | 0 | 兩次 Status PASS；FullSnapshotsEqual=true |
| `node scripts/freeze.mjs` | 0 | 41 source/document files 與 8 dist 文件清單，dist 逐檔等於 public bytes |

正式最終紀錄：[commands](evidence/m1/commands.json)、[test](evidence/m1/final-test.log)、[check](evidence/m1/final-check.log)、[build](evidence/m1/final-build.log)。匯入欄位數最後修正前的 passing logs 另保留 `review-before-count-*`，不抹除歷史。

## 固定 oracle 對照

| ID | Node 證據與固定 expected | 狀態 |
| --- | --- | --- |
| A01 | decimal/quote：2500、1999、4998n、49.98 | PASS |
| A02 | 0.001×5.00 → 1n 分 | PASS |
| A03 | 最大數量／單價 → 100000000000000000n 分 | PASS |
| A04 | 0.001×0 → 0n | PASS |
| A05 | subtotal 5998n、折後 5000n、tax 250n、total 5250n | PASS |
| A06 | 一分×50% → tax 一分、total 兩分 | PASS |
| A07 | 0.000 / 1000000.001 → DECIMAL_RANGE | PASS |
| A08 | 多位小數、指數、空白、正負號拒絕 | PASS |
| A09 | 價格上界接受、+0.01／三位小數拒絕 | PASS |
| A10 | 折扣等於小計 → 0；多一分拒絕 | PASS |
| A11 | rate 0 / 100 接受；100.01／三位小數拒絕 | PASS |
| A12 | 50 筆有序、subtotal 50n；51 筆拒絕；大總額 10000000000000000000n 精確 | PASS |
| A13 | textContent fixture 保留惡意字面；HTML 逐值編碼，tag/attribute 掃描無執行結構 | PASS（Node／靜態） |
| A14 | CRLF、END:VCARD、`<img onerror=x>` 留作文字 | PASS（Node／靜態） |
| A15 | schema1 restore/recompute；unknown/version/surrogate/duplicate（含 escaped key）拒絕 | PASS |
| A16 | **固定** 520669 個前綴零的合法數量字串；HTML+JSON = 524288 接受，加 1 byte → EXPORT_LIMIT / 524289，無部分內容 | PASS |
| A17 | edit 同步 preview=null、撤銷兩 URL；無效 retry 不復活 | PASS（離線 controller／fixture） |
| A18 | reader cancel、pending cancel 保留原草稿；晚到 load 不改狀態 | PASS（離線 reader adapter） |
| A19 | clear / pagehide 撤銷、abort、清引用；pageshow 空白恢復 | PASS（離線 controller／fixture） |
| A20 | 51 項／超限 JSON／錯誤匯入／超限輸出，各自失敗無舊結果，有效 retry 成功 | PASS（Node） |

A16 的 fixture padding 與 524288/524289 expected 為固定常數，不在測試中由被測函式反推。前綴零符合十進位語法，JSON 保留可編輯原值，HTML 正規顯示；無放寬 Unicode 上限或假造「validated」物件。

另外：UTF-8 512 KiB 匯入邊界、max depth/nodes、稀疏陣列、Unicode scalar 120/2000、讀取失敗、Blob 第二份失敗撤銷第一份、整份確認取代、兩語實際頁面事件接線、build 未知輸入／stale 輸出／junction 拒絕與保留未知檔均有測試。

## 真實產物

均為合成測資，不含使用者內容；固定結果 TWD 小計 59.98、折扣 9.98、折後 50.00、自訂 5.00%、稅 2.50、總額 **52.50**。檔案已實際寫入後重開驗 bytes 和文字，JSON 重匯與重算；不是瀏覽器下載證據。

| 檔案 | bytes | SHA-256 |
| --- | ---: | --- |
| [中文 HTML](evidence/m1/outputs/quote-zh-Hant.html) | 3624 | `9577c78fd791b6f0a0f19e0aaa924dc925dbd2ac86b1031f9a0c9a93787bc4cc` |
| [中文 JSON](evidence/m1/outputs/quote-zh-Hant.json) | 561 | `4b41695558d45a3fc946b1052aee324855ecf8fe3bf4d624ed8df1346964dc46` |
| [English HTML](evidence/m1/outputs/quote-en.html) | 3658 | `c399ea1c1fb022b0ecf09526f3c2f1fd1036be06fe4625b2a2bba5e587a99e4d` |
| [English JSON](evidence/m1/outputs/quote-en.json) | 561 | `4b41695558d45a3fc946b1052aee324855ecf8fe3bf4d624ed8df1346964dc46` |

完整收據：[output-receipt.json](evidence/m1/output-receipt.json)。來源與 dist bytes/hash：[source-manifest.json](evidence/m1/source-manifest.json)。manifest 不包含自己，避免自參照；來源凍結後不再修改。此對話不另製交付 ZIP，由主代理依單一整合 ZIP 契約封裝。

## 環境與安全證據

前置／最終後 guard：[before](evidence/m1/environment-before.json)、[after](evidence/m1/environment-after-final.json)、[full comparison](evidence/m1/environment-final-comparison.json)。比較包括完整 Snapshots，而非僅 PATH。

| Scope | PATH type / length / ephemeral count | PATH SHA-256 | 全 Environment-key fingerprint |
| --- | --- | --- | --- |
| HKCU | ExpandString / 834 / 0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String / 1227 / 0 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

前後 TEMP/TMP hash/type/length、Environment value count 亦相同。guard 已記錄的既有 duplicate PATH 項目前後一致，沒有修正或擴大清理範圍。未讀憑證／token／browser profile；未安裝、改 PATH／registry／持久設定；無 Git config/auth 操作、commit/push/deploy。現有程序／分頁保留，未啟動或停止 server。

## 未驗收與剩餘風險

- B01 320px 真頁面／頁籤／兩種實際下載：**NOT_RUN_USER_FOCUS_INCIDENT**。
- B02 200% zoom／真鍵盤／focus 可見與遮擋：**NOT_RUN_USER_FOCUS_INCIDENT**。
- B03 真 Network/Storage、BFCache 與各瀏覽器 API：**NOT_RUN_USER_FOCUS_INCIDENT**。來源無 network/storage 呼叫及靜態掃描僅為來源證據。
- B04 瀏覽器開啟下載 HTML、外觀／惡意字串、固定檔名：**NOT_RUN_USER_FOCUS_INCIDENT**。Node 只驗檔案內容。
- B05 原生保存／其他裝置／手機匯入：**NOT_RUN_USER_FOCUS_INCIDENT**，本輪不觸發 OS dialogs。
- dev 真 listen、port collision、HTTP socket：**NOT_RUN_BY_TASK_NO_SERVER**。僅 `respond()` 的離線 request/response fixture 驗 GET/HEAD、404/405、Host/traversal、MIME、headers；不宣稱真 HTTP PASS。
- 未執行 screenshot／視覺對比量測；CSS 已使用契約 tokens，但實際換行、200% 與瀏覽器支援仍待主代理安全隔離機制。
- 不承諾安全抹除 JavaScript 記憶體或刪除已下載檔案；無稅率適用性、發票、法律效力判斷。

source commit：NOT_COMMITTED；reviewed commit：NOT_REVIEWED；released commit：NOT_RELEASED；GitHub visibility／URL、正式 hosting URL、首頁 inclusion 均 NOT_PUBLISHED。只有主代理完成必要 browser gate 並給 M2 指令後才進下一 milestone。沒有輪詢等待，也沒有把本地候選稱作已上線或外部驗收完成。


## M1B 追加：B20-RP-57 離線發布準備（2026-10-23）

本節是目前最新工具鏈狀態；以上 M1 原始交接、固定 source manifest 與 evidence/m1 全部保留歷史，不覆寫其 hash。主代理已驗核心／CLI；本輪只完成最新 batch20-release-prep TASK 的有界 M1B。**離線候選已產生，等待主代理獨立回收；不是 M2 放行或上線。** requested gpt-6.1-sol/max，實際 backend 身分未以自述確認。

### 本輪實際 diff

- 修改 package.json：新增 build:release = node scripts/release.mjs build、check:release = node scripts/release.mjs check；原 test/check/build/dev 保留。
- 修改 .gitignore：追加 release-artifacts/，與原 preview dist 分開。
- 新增 scripts/release.mjs：固定 origin https://quote.glossquote.com / slug quote-builder、8 檔 M1 bytes/hash 來源鎖、獨立 release 產生與重建檢查、嚴格 CLI、既有輸出保護。
- 新增 test/release.test.mjs：12 項改動相關測試，負例均在本工具 test/.scratch 的任務自有 copy；無真 root 修改／刪除負例。
- 新增 scripts/m1b-gates.mjs：四條最終命令，child shell:false / windowsHide:true，證據只寫 evidence/m1b。
- 新增 [M1B-RELEASE.md](M1B-RELEASE.md)，本 HANDOFF 與 TASK-ENTRY 只追加；共 8 個實作／任務檔案新增或修改。
- 新增 release-artifacts/site 的 11 個候選資產與 sibling manifest.json；新證據僅 evidence/m1b。public、原 dist、13 份只讀契約、原 scripts/test 及全部舊 M1 evidence 不改。

完整差異見 [implementation.diff](evidence/m1b/implementation.diff)、[scope audit](evidence/m1b/scope-audit.json)。前置 74 檔快照中除 4 個本輪明確允許修改的既有檔外，其餘 **70 檔逐 bytes/hash 未變**（public 8、dist 8、舊 M1 evidence 25、其他契約與原 scripts/test 29）；見 [protected files](evidence/m1b/protected-files-unchanged.json)。HANDOFF/TASK-ENTRY 的前置 bytes 為目前檔案完整前綴，保留原文歷史。

### 十項契約驗收

| 契約 | 本輪結果與證據 |
| --- | --- |
| 1. build/check:release 與嚴格參數 | PASS；兩 script 已執行，無參數／deploy／多參數／origin 參數／--help 共 5 個 CLI 反例 exit 1 |
| 2. 固定預定 origin / slug | PASS；程式常數 quote.glossquote.com、quote-builder，無 process.env / 可變 CLI / upload / deployment route |
| 3. 輸出隔離、allowlist、拒修改輸出 | PASS；site 11 檔，manifest 在 sibling；來源／輸出未知檔、未知空目錄、缺檔、junction、非管理輸出均拒絕，保留負例 bytes；合法重建不改 mtime |
| 4. 僅 HTML head SEO、runtime 不變 | PASS；兩語 body 與非 SEO head 原文相同，6 個 runtime 資產逐 byte 等於 M1；候選文案保留 |
| 5. robots / sitemap / preview | PASS；robots 明確 Allow /，sitemap 僅兩 canonical 無 lastmod；public/dist 仍 noindex，無 production metadata 注入 preview |
| 6. 安全 headers | PASS（設定檔）；依 scripts/files.mjs 的 securityHeaders（serve.mjs 原匯入來源）產生，所有 CSP / privacy 值保留，僅 X-Robots-Tag 改 index, follow；未啟動 serve，非實際 hosting headers 證明 |
| 7. manifest 與獨立 expected bytes | PASS；schemaVersion 1 / mode release-candidate，11 site files + 8 complete public sourceFiles，相對路徑排序、bytes/SHA-256；不依賴可竄改 manifest 推定安全 |
| 8. 測試與最終 gates | PASS；新增 12/12、完整 43/43；兩語互返、錯域名、preview/runtime 保留、跨 root 確定、tamper/extra/missing、asset+manifest 同改、source 改變、CLI 均涵蓋 |
| 9. 證據／文件／Environment guard | PASS；本節、M1B-RELEASE、來源／產物 hash、before/after 完整 Snapshots 相同；舊 M1 不覆蓋 |
| 10. 有界交接 | PASS；沒有新 chat／子代理、GitHub、部署、首頁整合、安裝、付費或系統/Git/auth 修改；交主代理獨立驗收 |

### 最終實際命令

Node v24.14.0。先跑針對性 node --test test/release.test.mjs：12/12、exit 0。固定實作後 node scripts/m1b-gates.mjs 依序執行一次完整 suite 與要求的三條檢查，runner exit 0：

| 命令 | exit | 實際結果 |
| --- | ---: | --- |
| npm test | 0 | 43 tests / 43 PASS / 0 FAIL、SKIP、CANCEL、TODO（原 31 + release 12） |
| npm run check | 0 | 8 public files / 24 ESM syntax；靜態 API/resource checks |
| npm run build:release | 0 | 11 site files / 8 pinned sources，建立獨立候選 |
| npm run check:release | 0 | 從來源鎖重建 expected bytes，全部現有候選相符 |

[commands](evidence/m1b/commands.json)、[test log](evidence/m1b/final-test.log)、[check log](evidence/m1b/final-check.log)、[build:release log](evidence/m1b/final-build-release.log)、[check:release log](evidence/m1b/final-check-release.log)。原 preview build 未重跑；原 public/dist 未變，完整 npm test 只因本輪契約要求執行，不是 browser 通過證據。

### 固定產物／來源

browser 驗收者應使用 release-artifacts/site/，中文 index.html、英文 en/index.html。固定預定 canonical 為 https://quote.glossquote.com/index.html 與 https://quote.glossquote.com/en/index.html；每頁 zh-Hant/en/x-default 互返，x-default 中文。此為未上線預定網址。

site **11 檔／69392 bytes**；sibling manifest **3011 bytes**，SHA-256：

f97df627677ae457e1f61d47b572648f1adbbad08e6e357446c407d06ed33df1

完整 [artifact receipt](evidence/m1b/artifact-receipt.json)、[release manifest](release-artifacts/manifest.json)、[本輪 source / artifact bytes 與 SHA-256](evidence/m1b/source-manifest.json)。manifest 不進 site；不含時間、隨機值或本機絕對路徑。來源鎖為原 M1 public，不自動接受 source change；產品後續有合法修改也要另經主代理有界指令更新來源鎖，不能直接覆寫受保護輸出。

### 環境與未驗範圍

[before](evidence/m1b/environment-before.json)、[after](evidence/m1b/environment-after.json)、[完整比較](evidence/m1b/environment-comparison.json)：Status PASS，FullSnapshotsEqual=true。HKCU PATH ExpandString / 834 / ephemeral 0；HKLM PATH String / 1227 / ephemeral 0。PATH SHA、Registry type、長度、entry count、完整 Environment-key fingerprints 與 TEMP/TMP protected values 全相同。

B01–B05 的真瀏覽器、視覺、手機、200% zoom、鍵盤、真下載、HTML 開啟、Network/Storage／原生／真機仍 **NOT_RUN_USER_FOCUS_INCIDENT**。真 HTTP/server 仍 **NOT_RUN_BY_TASK_NO_SERVER**。_headers 只是設定；沒有實際 Cloudflare 回應或 hosting CSP 證明。沒有用離線 Node／fixture 冒充上述 gate。

沒有新的依賴、權限需求或產品規格矛盾；無需主代理做額外技術選擇。本輪不開放發布：仍需主代理核可隔離 browser gate、獨立產物驗收與後續明確 M2 指令。source/reviewed/released commit、GitHub、hosting、首頁及外部驗收狀態保持未建立／未發布／未執行。單一整合 ZIP 由主代理製作，本對話不另建交付包。


## M2A 追加 — B20-57-M2A（2026-10-27，Asia/Taipei）

**assets-only 正式發布準備已完成，尚未 push／部署／更新首頁。** 這一節是本產品最新狀態；以上 M1/M1B 交接及既有 evidence 均保留原歷史。M1B 的「候選 footer 保留／11 files」描述只適用當時凍結版本，不當成目前正式資產內容。

root 的 b20-57-r1 真瀏覽器結果已讀原始 result：**32 PASS / 8 NOT_RUN / 0 FAIL，failures 0、prohibited 0**；root 回報 isolation 及 parent cleanup PASS。本輪綁定 result、boundary、browser-boundary、parent-cleanup、cleanup-job、runner 原檔 hash，沒有重跑 browser 或以 Node 結果替代原生／真機。

8 個原始 NOT_RUN 如下，保持未驗：

- BR57-11 / zh-Hant: NOT_RUN_READER_BUSY_WINDOW_NOT_OBSERVED
- BR57-18 / zh-Hant: NOT_RUN_TRUE_200_PERCENT_ZOOM
- BR57-19 / zh-Hant: NOT_RUN_MANUAL_NATIVE_DEVICE_AT
- BR57-20 / zh-Hant: NOT_RUN_PRIVATE_READER_CALLBACK_INTERNALS
- BR57-11 / en: NOT_RUN_READER_BUSY_WINDOW_NOT_OBSERVED
- BR57-18 / en: NOT_RUN_TRUE_200_PERCENT_ZOOM
- BR57-19 / en: NOT_RUN_MANUAL_NATIVE_DEVICE_AT
- BR57-20 / en: NOT_RUN_PRIVATE_READER_CALLBACK_INTERNALS

### 實際修改與保留

- 新增 wrangler.jsonc：name glossquote-quote-builder，compatibility_date 2026-10-24；workers_dev / preview_urls / send_metrics false。只有 quote.glossquote.com custom_domain true。
- observability.enabled、logs.enabled、logs.invocation_logs、traces.enabled 全 false；沒有 main、vars、account ID、binding、額外 route 或可執行 Worker。
- assets 固定 ./release-artifacts/site，run_worker_first false、html_handling none、not_found_handling none；build command 固定 node scripts/release.mjs build。
- 新增 scripts/deployment-config.mjs；scripts/check.mjs、build:release、check:release 都檢查精確 config keys/types/values、檔案與 junction／大小限制。20 組錯誤設定負例均在任務自有 copy，失敗不改既有產物。
- scripts/release.mjs 只新增精確三列 _redirects 與正式 footer 前綴移除。原 public source lock 8 檔、runtime 6 檔、原 CSP/隱私 headers、功能與輸出格式不變；preview public/dist 原文與 noindex 不變。
- 只將正式 HTML 的完整 span「本地候選版本 · 不自動儲存草稿」換為「不自動儲存草稿」；英文對應 Local candidate · 前綴移除。沒有重設排版、主流程、其他文案或頁面 runtime。
- 更新 test/release.test.mjs 對齊 12 檔閉合清單與精確 footer 差異；新增 test/deployment-config.test.mjs，6 個案例包含 redirect+manifest 一起竄改、config 漂移、非法檔案、舊候選不得自動升級。
- 新增 [M2A-RELEASE.md](M2A-RELEASE.md)；本 HANDOFF 與 TASK-ENTRY 只追加。package scripts、原 M1/M1B 證據、兄弟工具、共享首頁／看板及 GlossGate 不變。

### 舊資產與安全遷移

先以原 release check 驗 M1B：exit 0，11 site files / 8 pinned sources。再逐檔核對完整舊輸出的 12 份 bytes/SHA、拒 symlink、檢查 resolved absolute source/destination 都在允許 workspace／owner 範圍，將整個舊 release-artifacts rename 至本輪 owner 的 previous-release-artifacts。原 manifest f97df627677ae457e1f61d47b572648f1adbbad08e6e357446c407d06ed33df1 及所有舊 bytes 完整保留。

builder 沒有新增 force、清空、不明輸出刪除或隱式版本升級。既有輸出若與當前 expected 不符仍拒絕，合法輸出則只驗證不改 mtime。這次封存是本輪已授權的精確管理資產遷移；未觸碰其他檔案／程序。

### 最終命令與固定產物

Node v24.14.0；無新增依賴、npm install 或 Wrangler 執行。先跑改動相關 release/deployment tests 18/18 exit 0；固定實作後本輪 runner 依序完整跑一次：

| 命令 | exit | 結果 |
| --- | ---: | --- |
| npm test | 0 | 49 tests / 49 PASS / 0 FAIL / 0 SKIP / 0 CANCEL / 0 TODO |
| npm run check | 0 | 8 public / 26 ESM syntax，另驗 assets-only 固定 config |
| npm run build | 0 | 8 preview files，bytes 保持不變、noindex |
| npm run build:release | 0 | 12 site files / 8 pinned sources，獨立新版產物 |
| npm run check:release | 0 | 獨立重建 expected bytes；config / SEO / 完整資產 / manifest 相符 |

site 12 files／**69416 bytes**；sibling manifest **3154 bytes**，SHA-256：

093b67039932ddc0f5c82bd3bb5f4e6642d88dcfbdd1a2193878955c85b5f71e

wrangler.jsonc **597 bytes**，SHA-256：

db970a2b963ece3e5da44dc67e9275b76b3cd8143382fc22add2c8ee60fc9c63

_redirects **65 bytes**，SHA-256：

9e47a2579b08f461b1124de1e42a1bde7a79ca29d77401104f6f432d8be90e1e

三列必須為 / → /index.html 301、/en → /en/index.html 301、/en/ → /en/index.html 301，含最後 LF。離線規則圖各只有一個 hop，canonical .html 目標均存在；配合 html_handling none 避免平台另作 HTML beautification。**未部署，不能把離線規則當成真 Cloudflare HTTP 單次301 PASS。**

兩語唯一 canonical 與 zh-Hant/en/x-default 互返均實查，x-default 中文；中文兩個首頁連結指 glossquote.com/index.html，英文指 glossquote.com/en/index.html，未拜訪首頁外連。正式 headers bytes 與封存的原 M1B _headers 相同。

### 證據、環境與剩餘邊界

本輪唯一工作證據位於 workspace 的 .runs/batch20-completion-2026-10-27/owner-57-release/。其中 commands.json、final-*.log、iterations.md、artifact-archive.json、browser-evidence-reference.json、artifact-receipt.json、source-manifest.json、implementation.diff、scope-audit.json 提供命令、歷史失敗、原檔綁定、差異及每檔 bytes/SHA-256。只有 scripts/check.mjs 的 before snapshot 在加入 config check 後反向還原精確 patch 取得，並以任務開始時捕捉的長度與 SHA 驗為完全相同，沒有猜測或變更實際產品回復值。

Windows persistent environment guard 前後 Status PASS；FullSnapshotsEqual=true。HKCU PATH ExpandString / 834 / ephemeral 0，HKLM String / 1227 / ephemeral 0；PATH hash/type/length/entries、完整 Environment fingerprint、TEMP/TMP protected values 均相同。沒有憑證讀取、global/system Git/auth 設定、持久 Windows 修改、UI、browser、server、程序關閉、付費、push、deploy 或首頁改動。

本輪用 workers-best-practices 作設定核對；指定日期與全部觀測 false 是明確任務要求，優先於技能預設。官方規則依據與重現方式列於 M2A-RELEASE.md。尚未執行 Wrangler schema/dry-run、Cloudflare 免費帳戶／live HTTP／正式 headers／實際三入口301、GitHub／正式發布或外驗。既有8個 NOT_RUN不升級，不能聲稱真人／原生／真機全過。

source commit / reviewed commit / released commit 仍未建立；root 另做來源發布與部署放行。本輪無核心產品修正或新增權限需求，也沒有額外產品選擇待確認；交 root 核實固定來源與產物後續處理，單一 ZIP 仍由 root 整合。


## M2B 追加 — B20-57-M2B 公開原始碼發布

2026-10-27 Asia/Taipei。已完成本輪 source-only 發布：[KYStr/glossquote-labs-quote-builder](https://github.com/KYStr/glossquote-labs-quote-builder)，public，main 固定提交 [14fd0e81a23e63040d3f2a29025f3af2b09823c7](https://github.com/KYStr/glossquote-labs-quote-builder/commit/14fd0e81a23e63040d3f2a29025f3af2b09823c7)。GitHub API、remote HEAD/main 及全新 no-checkout clone 均指向此提交；逐份取回50個已追蹤 Git blob，bytes/SHA-256 全部等於審核副本。沒有部署 Cloudflare 或修改共享首頁，不能據此宣稱網站上線或外部驗收通過。

### 乾淨副本與驗證

發布副本在 .runs/batch20-completion-2026-10-27/owner-57-publish/publishing-copy/。32份 public/scripts/test/fixtures/package/config/.gitignore 與root核准副本逐byte相同；13份重建正式產物亦完全相同。公開內容另含17份可攜文件與一份 .gitattributes（只固定換行bytes），排除工作區私有運作紀錄、machine paths、evidence/.runs、node_modules、生成dist/release-artifacts、憑證與其他產品。五份M1規格保留歷史原文，README/VALIDATION/RELEASE說明目前狀態；17個相對文件連結全可解析。

乾淨checkout依序 npm run build（8 preview files，先供既有測試建立隔離測資）、npm test（49 PASS / 0 FAIL / 0 SKIP）、npm run check（8 public / 26 ESM）、npm run build:release（12 site files / 8 pinned sources）、npm run check:release，全部exit0。未安裝套件，未改runtime/scripts/tests/config來迎合發布。正式manifest SHA-256維持 093b67039932ddc0f5c82bd3bb5f4e6642d88dcfbdd1a2193878955c85b5f71e。

### 收據、安全守門與後續

[publication receipt](evidence/m2b/publication-receipt.json) 包含公開性、branch/commit、releaseManifestSha256及publishingCopy；[tracked inventory](evidence/m2b/tracked-inventory.json) 列出50檔path/bytes/SHA-256；[commands](evidence/m2b/commands.json)、[publication operations](evidence/m2b/publication-commands.json) 與 [clean-copy audit](evidence/m2b/clean-copy-audit.json) 留存完整範圍。owner-only audit helper曾把manifest檔名寫錯，修正為實際manifest.json後通過；產品未修改，沒有把失敗刪除或當PASS。

[Windows Environment比較](evidence/m2b/environment-comparison.json) FullSnapshotsEqual=true；HKCU PATH ExpandString/834/ephemeral0、HKLM String/1227/ephemeral0，PATH hash、registry type、length及完整Environment fingerprints皆不變。[Git settings比較](evidence/m2b/git-settings-comparison.json) 三個已捕捉設定檔之existence/bytes/SHA-256全相同。只使用既有CLI登入及per-command Git選項，沒有auth setup/login/refresh、global/system設定寫入、token讀取、UI、原生對話框、安裝、付費或程序清理。

沿用root b20-57-r1的32 PASS / 8 NOT_RUN / 0 FAIL（prohibited0）；BR57-11/18/19/20在zh-Hant與en的8個未驗原因完整保留於receipt，這次不重跑或提升為PASS。正式hosting、真Cloudflare redirects/headers、免費帳戶驗證、雙語首頁發布與外部review由root後續milestone處理。原始碼發布已驗；整體工具尚未宣稱完成，單一ZIP交付仍由root整合。
