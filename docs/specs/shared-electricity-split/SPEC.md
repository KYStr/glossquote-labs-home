# 分租電費分攤 / Shared Electricity Split

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-shared-electricity-split-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

分租住戶拿到一張已知總額的電費帳單時，依各房分電表度數分攤，公共用電先均分，各房金額加總恰好等於總額，不再出現對不上帳的尾差。

- 桌面。房東或主揪在電腦前對著帳單與電表照片逐房輸入起訖度數，印出或下載分攤表貼到群組。
- 行動。房客在手機上核對自己那一房的度數、占比與金額，不輸入資料。

使用情境為分攤試算。資料只保留在目前頁面草稿。

## scope

已知總額的分攤模型：2–10 間房、分電表起訖度數、選填總表度數差、公共用電均分前置、最大餘數法金額分攤。非目標為依台電級距／夏月費率計算電費本身、估算未裝分電表的用電、保存歷期帳單、多人同步、催繳、轉帳或連結台電帳號。

已與 base commit 的 `docs/specs/`、`tools/`、`sources/candidates/`、`sources/legacy/` 比對，最相近者的實質差異如下。

- 由用電度數與費率級距算出一張帳單的金額。此處帳單總額為已知輸入，做的是把總額分配到各房。 [electricity-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/910002e9276f2e2f1a086d4a42c2c5c971f1c051/docs/specs/electricity-cost-calculator/SPEC.md)
- 人與人之間的墊款結算（誰付多少、平均或按份數、誰付給誰）。此處沒有墊款與轉帳建議，權重來自分電表度數並含總表公共用電的均分前置。sources/legacy 的 `bill-splitter`。

判定規則由本文定義，無線上資料或外部服務依賴。度數、金額與分攤規則不引用台電費率表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「總電費與總表度數 / Total bill and total meter delta」。總電費必填（整數元）；總表度數差選填，旁註「留空表示沒有總表度數，只按各房度數比例分攤 / Leave blank if there is no total meter reading; the bill is then split by room usage only.」。
- 欄位或說明「各房分電表 / Room submeters」。每列為房間名稱、起始度數、結束度數（度，kWh，最多一位小數）。「新增房間 / Add room」與每列「移除 / Remove」調整列數，列數固定 2–10：達下限時移除鈕停用、達上限時新增鈕停用；核心仍驗證列數。
- 「計算分攤 / Calculate split」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每房應付金額 / Amount per room」先摘要再列細節：摘要固定顯示核對行「合計等於總電費 / Amounts sum exactly to the total bill」與總額；表格依輸入順序列房間、用電度數、公共分攤度數（僅在有總表度數時出現此欄）、計費度數、占比、金額。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、列增減或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新計算 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果表與合計核對行同時出現。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新計算 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"totalBill":"","totalDelta":"","rooms":[{"name":"","start":"","end":""},{"name":"","start":"","end":""}]}` 並聚焦總電費欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數為含確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA。JSON fixture 即介面。欄位值皆為表單原始字串；`totalDelta` 缺鍵或空字串表示未提供總表度數。

輸入欄位與上限：

- `totalBill`：必填。整數新台幣元，文法 `^(0|[1-9][0-9]*)$`，範圍 0–99,999,999，raw 最多 16 code units。
- `totalDelta`：選填。總電表本期度數差（kWh），文法 `^(0|[1-9][0-9]*)(\.[0-9])?$`（最多一位小數），範圍 0–999,999.9，raw 最多 16 code units。
- `rooms`：陣列，長度 2–10。每元素為含確切欄位 `name`、`start`、`end` 的普通物件，三者皆字串。
- `name`：raw 最多 64 code units。先 NFC 正規化、再去掉首尾 U+0020。正規化後 1–24 code points；第一個字元須為 Unicode letter 或 Nd 數字，其餘字元須為 letter、mark、Nd 數字、U+0020、hyphen-minus 或 underscore。
- `start`、`end`：必填。分電表起訖度數（kWh），文法與範圍同 `totalDelta`（最多一位小數，0–999,999.9），raw 最多 16 code units。

驗證順序固定如下，整份只回第一個錯誤 `{ok:false,error:{code,field,row}}`；`field` 為欄位名或 null，`row` 為 1-based 房間序號或 null。等價 JSON Pointer 路徑為 `/totalBill`、`/totalDelta`、`/rooms`、`/rooms/{row-1}/name|start|end`。

0. 整份輸入 JSON 序列化後 UTF-8 超過 65,536 bytes → `INPUT_LIMIT`，field/row=null。
1. 形狀錯誤 → `SCHEMA`：頂層形狀錯誤 field/row=null；某房元素形狀錯誤 field=null、row=該房序號。
2. `totalBill`：容量（raw 超限 `INPUT_LIMIT`）→ 未成對 surrogate（`UNICODE`）→ 空字串（`EMPTY`）→ 文法（`INTEGER_FORMAT`）→ 範圍（`RANGE`）。
3. `totalDelta`：有提供且非空時，順序同上，文法錯誤為 `DECIMAL_FORMAT`。
4. `rooms` 長度不在 2–10 → `ROOM_COUNT`，field=`rooms`、row=null。
5. 逐房依輸入順序驗證 `name`（容量 `INPUT_LIMIT` → surrogate `UNICODE` → 正規化後為空 `EMPTY` → 超過 24 code points `RANGE` → 字元規則 `NAME_CHARS`）、`start`、`end`（容量 `INPUT_LIMIT` → surrogate `UNICODE` → 空 `EMPTY` → 文法 `DECIMAL_FORMAT` → 範圍 `RANGE`）。
6. 房名重複：正規化後逐 code point 完全相同者，第二個出現處 → `DUPLICATE`，field=`name`、row=第二個的序號。
7. 度數倒退：逐房依序，`end < start` → `READING_REGRESSION`，field=`end`、row=該房序號。
8. 總表不足：有提供總表度數且各房用電合計大於總表度數差 → `TOTAL_DELTA_UNDER`，field=`totalDelta`、row=null。

資源或 Worker 失敗用固定 `INTERNAL`/`WORKER_ERROR`，不回傳堆疊。成功僅為 `{ok:true,result}`。

計算管線固定如下，全程整數運算（度數以十分之一度為單位，金額乘權重用 BigInt），無浮點、無未定義捨入：

1. `usageTenths_i = endTenths_i − startTenths_i`（≥0，由步驟 7 保證）。`N` 為房數，`sumUsage = Σ usageTenths_i`。
2. 有總表度數時：`commonTenths = totalDeltaTenths − sumUsage`（≥0，由步驟 8 保證），公共用電先均分——每房權重 `weight_i = usageTenths_i × N + commonTenths`，即每房先各得公共用電的 1/N 份額，再併入自己的度數形成權重。無總表度數時：`commonTenths = null`，`weight_i = usageTenths_i`。
3. `W = Σ weight_i`。`W > 0` 時對金額做最大餘數分攤：`num_i = totalBill × weight_i`，`floor_i = num_i div W`，`rem_i = num_i mod W`，`leftover = totalBill − Σ floor_i`（恆有 0 ≤ leftover < N）。依 `rem_i` 由大到小排序，同餘數者依輸入順序在前，前 `leftover` 名各 +1 元。恆有 `Σ amount_i = totalBill`。
4. `W = 0` 時（無總表度數且各房用電皆 0，或總表度數差為 0 且各房用電皆 0）改為均分：`base = totalBill div N`、`extra = totalBill mod N`，輸入順序前 `extra` 房各 +1 元，`equalSplitFallback = true`；其餘情形為 false。
5. 顯示值捨入函數 `roundHalfUp(a, b) = floor((2a + b) / (2b))`（a ≥ 0、b > 0，整數運算，四捨五入）。占比（百分點，顯示一位小數）`sharePercentTenths_i = roundHalfUp(weight_i × 1000, W)`；均分回退時為 `roundHalfUp(1000, N)`。占比只是顯示值，捨入後加總不保證 100.0；金額加總恆等於總電費，兩者不得互相遷就。
6. 度數顯示：`usageTenths` 為精確值。有總表度數時 `commonShareTenths = roundHalfUp(commonTenths, N)`、`billableTenths_i = roundHalfUp(weight_i, N)`；無總表度數時 `commonShareTenths = null`、`billableTenths_i = usageTenths_i`。顯示度數各自獨立捨入，加總可與總表度數差數個十分之一度；分攤一律以精確權重計算，不以顯示度數回算。

結果 `{rooms, totalUsageTenths, commonTenths, totalDeltaTenths, totalAmountTwd, equalSplitFallback}`；`rooms` 依輸入順序，每房 `{name, usageTenths, commonShareTenths, billableTenths, sharePercentTenths, amountTwd}`，`name` 為正規化後房名，`totalAmountTwd` 恆等於輸入 `totalBill`。不用綠色暗示金額已收款。

固定下載 `shared-electricity-split-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 `OUTPUT_LIMIT` 並停用所有產物。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/shared-electricity-split/`。`public/js/core/` 放純驗證、推導、格式化（不接觸 DOM／網路／storage，測試可直接 import）；`public/js/app.js` 管草稿、工作世代及資源並以安全 DOM API 綁表單；`public/index.html` 和 `public/en/index.html` 為兩個靜態入口；`scripts/` 只建置工具 allowlist（可重現 preview build、靜態 check、loopback serve），不取線上檔、不發布。`package.json` 固定 Node >=24、ESM、test/check/build:preview/check:generated:preview。測試放 `test/`。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算分攤」，畫面和完整報告符合核心 fixtures（含公共均分與最大餘數同餘數案例），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改、增減房間列和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。9 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `proportional-basic` | 無總表度數，純按各房度數比例，金額恰可整除 |
| `largest-remainder-tie` | 三房同餘數，剩餘 1 元依輸入順序給第一房 |
| `common-area-equal-first` | 公共用電先均分再併入權重，同餘數依輸入順序 |
| `common-only-equal-weights` | 各房用電皆 0 但有公共用電，權重相等 |
| `zero-usage-equal-fallback` | 總權重 0 時均分，餘元依輸入順序 |
| `decimal-readings` | 一位小數度數，顯示占比同為 50.0 但金額差 1 元 |
| `reading-regression` | 結束度數小於起始度數，第一個錯誤定位到該房 end |
| `total-delta-under` | 各房合計大於總表度數差 |
| `too-few-rooms` | 只有一房，低於下限 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限與剛好超限（totalBill 99,999,999 可、100,000,000 為 RANGE；度數 999,999.9 可、1,000,000.0 為 RANGE；10 房可、11 房 ROOM_COUNT）、房名重複 DUPLICATE、end 等於 start（用電 0）合法、單獨 surrogate UNICODE、惡意字串、快速改值及晚到訊息；並以固定種子案例檢查不變量：任何成功結果的金額加總恆等於 totalBill、leftover 恆小於房數。

候選 gate（均 NOT_RUN）

- 於 `tools/shared-electricity-split/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、增減房間列、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「分租電費分攤」，title「分租電費分攤｜Gloss Tools」，description「輸入總電費與各房分電表的起訖度數：公共用電先平均分攤，再用最大餘數法按用電比例分配，保證各房金額加總恰好等於總電費。」。英文 lang=en，H1 “Shared Electricity Split”，title “Shared Electricity Split | Gloss Tools”，description “Enter the total bill and each room's submeter readings: common-area usage is shared equally first, then the bill is allocated by usage with the largest remainder method, so the room amounts always sum exactly to the total.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。公共用電怎麼算？總表度數減各房分表度數之和，先平均分給每間房，再併入各房用電按比例分攤。 / How is common-area usage handled? The total meter delta minus the sum of the room submeters is split equally across rooms first, then added to each room's own usage before the proportional split.
- FAQ。為什麼占比加起來不是 100%？占比只顯示到小數一位，捨入後不一定恰好 100%；金額以最大餘數法分攤，加總一定等於總電費。 / Why don't the shares add up to 100%? Shares are shown to one decimal place and may not total exactly 100% after rounding; the amounts are allocated by the largest remainder method and always sum exactly to the bill.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://shared-electricity-split.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 `labs-shared-electricity-split-spec-20261109`（由主代理登記）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/shared-electricity-split/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
