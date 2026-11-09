# 活動借用周轉檢查 / Loan Kit Turnover Check

規格 ID `spec-loan-kit-turnover-20261109` · v1 · 2026-11-09 · B 組預案
產品實作與產品驗收狀態 `NOT_RUN`。

## goal

活動承辦人有多種可重複借出的道具，已知各場領取與歸還時間。先把歸還後的整理時間也算在佔用內，找出在哪一段會缺幾件。

用桌面按道具查看借用時段、可用件數與短缺清單，從第一段短缺追到同時占用的借用代號。

在器材台用手機切換道具，先讀第一段短缺與需求，再展開對應的借用代號。

## scope

同日領取、歸還與各道具固定的周轉分鐘數，允許整理延伸到隔日最多兩小時。逐道具輸出尖峰、最多需增備件數與每個短缺區間。

範圍外包括借用預約、物品序號分配、費用、通知和跨日領取。

**既有規格差異**。題目從 2026-11-09 的 130 筆登記中比對，以下是相近任務的實際交付差異。

- `spec-37-restock-planner` 用平均用量、庫存和到貨天數建議補貨。本件沿具體時段重複借用同一批物件，含歸還後佔用。
- `spec-61-agenda-conflicts` 找成對時段衝突。本件總合可共用的多件容量，數出各段短缺及相關借用。

## userFlow

採 Gloss Tools Product App 工作區。首畫面保留主要欄位、工作物與「找出道具短缺 / Check kit shortages」。清除和語言連結次要。寬畫面保留至少一半寬度給工作物，`<48rem` 改為單欄，結果依關係堆疊。使用者以標題與具名欄位定位，核心操作可用鍵盤、指標或觸控。

1. 填道具代號、可借件數與每次歸還後的整備分鐘。
2. 以借用代號和道具類型填領取、歸還及數量。時間從同日 00:00 計，24:00 只作歸還端點。
3. 查看尖峰及短缺起訖，點一個區間看同時占用者。調整約定或件數後重算。

狀態規則如下。

- 初始為 `empty`，看得到帶單位的欄位及填寫提示。部分輸入為 `dirty`，只顯示草稿和缺欄，結果區保持空白。可明確載入與 `loan-kit-turnover.turnover-overlap` 相同的假資料，範例載入仍為 `dirty`。
- 每次編輯在同一事件立即清除舊結果及結果區互動，並使活動 runId 失效。表單送出錯誤進 `error`，保留草稿，聚焦第一個錯欄。修正回 `dirty`。有效但無解或不足的結果顯示規格所列原因與下一步。
- 有效執行進 `busy`，操作鈕當下顯示「計算中 / Working」，提供「取消 / Cancel」。執行中重送被忽略。結算僅在目前 runId 相同且仍 busy 時生效，正常為 `ready`，純核心錯誤為 `error`。取消回 `dirty`，保留輸入。
- 清除要求一次明確的「清除草稿 / Clear draft」，返回初始值、取消活動 runId、清除錯誤與結果，焦點移到首欄。語言連結旁標示離頁重設，返回或重新整理清除工作記憶體，含 bfcache 還原事件。靜態資源載入完成後可斷線操作，初始化失敗顯示「重新載入 / Reload」。
- 結果與錯誤使用一個節制的狀態區。驗證錯誤以文字、圖示及欄位連結表示。無登入流程及輸出檔案流程。

## inputsOutputs

純函式 `solve(data)` 接收無副作用、精確鍵集合的 JSON 物件。表單只把已驗證資料映射到下列核心型別。所有欄位必填，除非表內明列可空。預設值由表單顯示並送入核心。陣列次序在複製快照後固定。輸入上限為 JSON UTF-8 65536 bytes，超出在根回 `SIZE`。表單文字欄先限長 128 UTF-16 code units，數字欄限 12，時間另依本規格格式。

- `I[a,b]` 為 JavaScript 安全整數含端點。原始表單只收 ASCII 十進位整數，非負形式 `0|[1-9][0-9]*`，允許負數的欄位另外接受 `-[1-9][0-9]*`。拒絕前後空白、前導零、全形數字、指數、正號、小數與 `-0`。核心亦拒絕 `-0`、字串型數字和非整數。
- `N` 是自訂識別用的短名。去除頭尾 U+0020 後 NFC 正規化，長度 1–24 Unicode 碼點，首字元為 Unicode 字母或數字，其餘限字母、組合標記、數字、ASCII 空格、連字號或底線。大小寫有別，參照同樣正規化。必要時用 `Map` 做鍵對照，輸出顯示正規名。
- `B` 為真正的 JSON boolean。`null` 與空陣列只有明列時合法。原始語法錯誤用 `SYNTAX`，核心型別用 `TYPE`、超界 `RANGE`、錯誤鍵集合 `SHAPE`、枚舉 `ENUM`、正規化重名 `DUPLICATE`、無法解析參照 `REF`。錯誤格式 `{status:"error",error:{code,path}}`，`path` 是 JSON Pointer，根為空字串。
- 先拒絕整體大小與物件形狀，再依下表欄位及陣列輸入次序驗證。跨欄約束在全部欄位型別合法後執行，依實作節所列先後。未知鍵回該物件固定路徑。缺少鍵回該已知鍵路徑。重名指向第二個重名欄位。錯誤訊息只使用固定代碼與已知路徑，界面中英對譯並給出修正方法。

| 欄位 | 型別、界線與預設 |
| --- | --- |
| `kits` | 1–12 列 `{name:N,count:I[0,1000],turnMin:I[0,120]}`，道具名唯一。初始一空白列，turnMin 預設 0。 |
| `loans` | 0–60 列 `{name:N,kit:N,start:I[0,1439],end:I[1,1440],qty:I[1,1000]}`，借用短名唯一且 kit 參照已知道具。初始 []。時間欄只收 `HH:MM`，`24:00` 僅允許歸還。 |

有效輸出一律為 `{status:"ok",result:{…}}`。結果固定欄位如下。

`{kits}`，道具依輸入序列 `{name,peak,minExtra,shortages}`。每段 `{from,to,demand,extra,loans}`，from/to 為午夜起的分鐘，loans 是此段借用短名、依輸入序，from 升序。大於 1440 的值顯示隔日標記與時刻，等於 1440 顯示 24:00。

除下方指定者，計量保持整數且不四捨五入。需比較的比例先算精確分數、交叉相乘，不用顯示字串回算。凡稱「一位小數」的正值，規則為 half-up，先以整數算 `floor((20*n+d)/(2*d))` 得十分位，再格式化。用 `Intl.NumberFormat` 排版已算出的顯示值。結果同列格式在兩種語言保持欄位與次序一致。

## implementation

使用原生 HTML、CSS 和瀏覽器 ESM。Node.js 24 與內建模組負責建置和 `node --test`。純核心保留可直接測試的公開 `solve`，DOM 控制器只處理欄位和工作階段。版本 1 採以下規則。

1. 依借用輸入序驗 kit 參照，再驗 end>start。佔用段為 `[start,end+turnMin)`。
2. 各道具收集端點，由小到大去重。對每個相鄰端點 a,b，以 `start≤a<end+turnMin` 取活動借用並加 qty。時間相接時釋出先於領取。
3. peak 為最大段需求，無借用為 0。`minExtra=max(0,peak−count)`。需求嚴格大於 count 才列 `[a,b)` 短缺，extra=demand−count。逐端點段獨立列出。

未知 kit 回 `REF`，倒序和零長借用回 `ORDER` 指向 end。庫存 0 仍可建立試算。

工作界線為 12 道具、60 借用、全體至多 120 個輸入區間端點，掃描至多 7,200 個借用區間測試。純核心在下一個事件迴圈工作項執行。進入 busy 即配置 runId，排程前取消或編輯時撤銷該工作項。已經返回的回覆交由 runId 閘門。維持同一結果接口，並以最大資料列驗證互動可用。

結果中任何自訂短名以 `textContent` 建立。動態圖僅用驗證後的尺寸與內建元素。載入只請求同源靜態資產。其後無互動網路請求。輸入、結果、錯誤狀態只留頁面記憶體，不寫 URL、日誌、cookie、Local/Session Storage、IndexedDB、CacheStorage 或 service worker。範例內嵌固定假資料。採本機系統字型與共用設計權杖。CSP 用 HTTP 標頭限定 `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`，回應另帶 `X-Content-Type-Options: nosniff`。

頁面與靜態 SEO 設定如下。

| 語言 | 路徑／語言標記 | Title | Description | 同語首頁 |
| --- | --- | --- | --- | --- |
| 繁體中文 | `/index.html` / `zh-Hant` | 活動借用周轉檢查｜Gloss Tools | 以借出、歸還與整備時間查活動道具的占用尖峰和短缺區間。 | `https://glossquote.com/index.html` |
| English | `/en/index.html` / `en` | Loan Kit Turnover Check \| Gloss Tools | Check when shared event kits run short, including the time needed to turn them around. | `https://glossquote.com/en/index.html` |

兩頁的 H1 使用產品名，各自有可讀語言連結。預覽兩頁設 `noindex,nofollow`，robots 封鎖探索且沒有正式 sitemap。正式建置必須輸入主責確認的 HTTPS origin，同語頁自指 canonical，互設 `zh-Hant`、`en` alternate 及中文 `x-default`。正式 sitemap 只列兩個 HTTPS canonical，robots 公告該 sitemap 並允許抓取，且移除預覽 noindex。兩語的空白提示、欄名、單位、驗證、按鈕、結果、限制、取消、清除與範例都用對應語言，產品數值使用同一核心。

## acceptance

九個固定必要面向逐項由非作者審查固定產品 commit。每項最低 90，面向所需檢查均完成才可接受產品。預案文件以八節、字面案例、來源和界線核對，文件 ready 與產品驗收分別記錄。

| 面向 | 必驗項 |
| --- | --- |
| `functionality` | 重現全部固定案例及短缺區間需量等於同時未釋出的件數總和，提供完整可讀結果。 |
| `boundaries` | 精確驗證輸入界線、重算與取消，核對上限 12 道具、60 借用、全體至多 120 個輸入區間端點，掃描至多 7,200 個借用區間測試。 |
| `privacy` | 檢查實際 Network 與 Storage，確認工作資料僅留頁面記憶體。 |
| `security` | 拒絕非契約資料，固定錯誤路徑，所有使用者文字以文字節點呈現。 |
| `usability` | 依操作案例完成「找出道具短缺」，從結果直接取得下一步。 |
| `accessibility` | 證明鍵盤、觸控、可讀錯誤、焦點、重排、縮放與減少動態完整可用。 |
| `localization-seo` | 驗證雙語內容、語言互換、同語首頁及預覽與正式索引設定。 |
| `toolchain-provenance` | 在固定候選以 Node 24 離線建置、測試並記錄檔案與證據來源。 |
| `compatibility` | 實際在獨立隔離的 Chrome、Edge 及行動寬度走完必要流程。 |

可及性門檻包括原生標籤及錯誤關聯、可見焦點、結果的真實表格或語意清單、正文字對比至少 4.5:1、互動界線至少 3:1、主要觸控 44 CSS px、320 CSS px 頁寬無橫向捲動、200% 真縮放、節制 live 區和減少動態。具名的圖表區可內部捲動並提供等價文字。

## tests

[字面案例](fixtures.json) 的 `solve` 列直接用 `node:test` 與 `assert.deepStrictEqual` 比較整個結果或錯誤。單獨測試輸入上限前後各一、錯誤固定路徑、未知鍵、數字語法、NFC 及文字注入。適用於時間的產品另測同端點相接。測試只使用假資料，建置及純測試離線執行。此版預案共列 8 案，逐案推導見 [作者檢查](AUTHOR-CHECK.md)。

`flow` 案是受控執行器腳本。edit 換成完整字面草稿，run 配置編號並捕捉當下草稿，settle 交付該次 `solve` 回覆，cancel 撤銷該編號。比較 `{phase,result}`，只在 ready 含當前有效結果。增加 reset、空白送出、錯誤修正與載入假資料測試，並檢查較舊 error 回覆也無法覆寫新狀態。

真實瀏覽器需在已驗證隔離、與桌面鍵盤／IME／剪貼簿無共享的環境，實際啟動 Chrome 和 Edge 並分別記錄版本、commit、語言路徑、視窗、操作與觀察值。測寬畫面、320 CSS px、200% 真縮放、只用鍵盤、觸控或隔離觸控模擬、偏好減少動態及焦點次序。同一案例將整備改成 0，確認相接時間無重疊。320 CSS px 可讀短缺起訖與借用代號。確認斷線後完成工作，Network 無資料請求、Storage 無新增，輸入與輸出無 URL 或記錄殘留。無獨立環境時瀏覽器 gate 維持 `NOT_RUN_USER_FOCUS_INCIDENT`。

正式另在同一審閱產物的實際 HTTPS 站點逐頁核對 HTTP 狀態、標頭、版本位元組、雙語導航、SEO、robots、sitemap、同語首頁與工作旅程。每項記實際觀察的 PASS／FAIL／NOT_RUN。此文件提供待執行條件。

## handoff

固定產物為本檔、[製作簡報](BRIEF.md)、[字面案例](fixtures.json) 與 [作者檢查](AUTHOR-CHECK.md)。由非作者核對固定 GitHub 版本的八節和案例後登記預案 ready。後續另立 P3 製作任務，依最新 GitHub registry ACK／唯一 claim／精確讀回再開始。規格路徑 `docs/specs/loan-kit-turnover/`，製作路徑 `tools/loan-kit-turnover/`，共用 repo `KYStr/glossquote-labs-home`。建立 `codex/<task>-<actor>` 分支、固定 commit 與 PR，在 PR head 相同時提交。建議製作請求模型 `gpt-6.1-sol`、推理強度 `max`，以任務實際回報記錄。

製作檔案包括 `package.json`、`src/core.mjs`、`src/app.mjs`、`src/i18n.mjs`、`src/styles.css`、`scripts/build.mjs`、`scripts/check-generated.mjs`、`test/*.test.mjs`、`HANDOFF.md`。 `package.json` 以 ESM、空依賴，定義 `npm.cmd test`、`npm.cmd run check`、`npm.cmd run build:preview`、`npm.cmd run check:generated:preview`、`npm.cmd run build:production -- --origin <已確認 HTTPS origin>` 及 `npm.cmd run check:generated:production`。預覽與正式產物分置 `dist/`、`dist-production/`。必要本機 HTTP 預覽只綁 `127.0.0.1`。

交付時記固定 SHA、PR、檔案雜湊、命令與九面向證據。修正回原承接者，新的 head 重新交驗。文件 ready、產品 accepted、正式發布及雙語 catalog 更新為各自獨立步驟，使用既有批准範圍。首輪實作先凍結本規格與案例，再做純核心與狀態，最後才做雙語頁、產物檢查與獨立瀏覽器驗證。
