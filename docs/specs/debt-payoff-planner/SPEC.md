# 債務清償規劃 / Debt Payoff Planner

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-debt-payoff-planner-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)（本輪製作簡報見 run 6 SPEC-AUTHOR-BRIEF.md，概念第 9 條）

## goal

同時背著多筆債務（信用卡、信貸、店內分期）的人，想知道每個月固定拿出多少錢、照什麼順序還，才能最快還清、利息最少。

- 桌面。桌面填上每一筆債務的餘額、年利率、最低還款，再填每月能多還的金額，比較雪球法與雪崩法各自要幾個月還清、總利息多少、每一筆何時還清。
- 行動。手機在和家人討論還款計畫時，核對兩種策略的月數與利息差，不啟動任何轉帳或聯繫銀行。

使用情境為還款規劃的試算。資料只保留在目前頁面草稿；本工具不連接銀行、不讀取帳戶、不執行還款。

免責聲明（頁面必須逐字顯示，中英對照）：「本工具以你輸入的固定年利率與固定月還款做推算，實際利率、最低還款與費用會隨銀行規定改變，結果僅供規劃參考，不是理財建議。」/ “This tool projects from the fixed APRs and fixed monthly payments you enter. Real rates, minimum payments and fees change with each lender; results are for planning only, not financial advice.”

## scope

多筆債務（1–12 筆）的固定月還款模擬：每筆有餘額、年利率、最低還款；外加每月額外還款。兩種策略各算一次：雪球法（餘額由小到大）與雪崩法（年利率由高到低），輸出還清月數、總利息、每筆還清月份與逐月彙總表。非目標為單一貸款的等額本息／等額本金攤還表、即時利率查詢、費用／保險／稅務計算、債務協商或整合貸款推薦、儲存個人財務檔案，以及任何「銀行會用相同捨入」的宣稱。

已與本 checkout 的 `docs/specs/` 與 `tools/` 比對，最相近者的實質差異如下。

- 單張信用卡的還清試算（`tools/credit-card-payoff-calculator`，單卡餘額／年利率／最低還款 → 還清月數與利息）。此處是多筆債務的整體規劃：跨筆排序、最低還款釋出後的滾動、兩種策略比較；單卡只是本工具退化為一筆時的特例。
- 單一房貸的攤還表（`docs/specs/mortgage-amortization/`）。此處不做等額本息／等額本金分期表，不處理寬限期與分段利率；此處的每筆債務只有餘額、年利率、最低還款三個欄位。
- 複利成長與儲蓄目標（`docs/specs/compound-interest-calculator/`）。彼處是錢變多（存款＋利息），此處是債變少（還款－利息）；方向相反，不可共用公式。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 債務表，每列四欄：「名稱 / Name」「餘額 / Balance」「年利率 APR / APR」「最低還款 / Minimum payment」，附「新增一筆債務 / Add a debt」（上限 12 筆）與每列「移除 / Remove」（至少留 1 筆）。
- 欄位或說明「每月額外還款 / Extra monthly payment」。
- 「比較兩種策略 / Compare both strategies」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果先顯示比較摘要（兩種策略的還清月數、總利息、省下的利息與月數），再分雪球法／雪崩法兩區，各顯示排序、每筆還清月份、逐月彙總表（月份、當月還款、當月利息、剩餘總額）。超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設（3 筆債務：Credit Card 5000.00 / 19.99% / 150.00；Personal Loan 8000.00 / 9.50% / 200.00；Store Card 1200.00 / 24.99% / 50.00；每月額外還款 200.00）並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 輸入形狀：`{debts: [{name, balance, apr, minimum} × 1–12], extraMonthly}`。全部金額欄與年利率欄皆為十進位字串，無空白／符號／逗號／指數；金額為整數或小數點後 1–2 位（`100`、`100.5`、`100.50` 皆可；`100.`、`.5`、`100.005` 不可）；年利率同形。raw 每欄最多 15 單元，名稱最多 40 單元。
- 欄位範圍：balance（餘額）> 0 且 ≤ 10,000,000.00；apr（年利率）0–99.99；minimum（最低還款）0–1,000,000.00；extraMonthly（每月額外還款）0–1,000,000.00。名稱 1–40 字元，不可為空或全空白；名稱以輸入原樣比較是否重複（區分大小寫，不修剪）。
- 預設如 userFlow 所述。`extraMonthly` 預設 `200.00`。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 債務列或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 輸入非普通物件、缺 `debts` 或 `extraMonthly`、`debts` 非陣列，皆 SCHEMA，field,row=null。
2. `debts` 列數為 0 → EMPTY（field `debts`）；> 12 → ROW_LIMIT（field `debts`）。
3. 逐列（第 1 列起）依 `name`、`balance`、`apr`、`minimum` 順序驗證。raw 超限 INPUT_LIMIT；空值 EMPTY；名稱含控制字元（U+0000–U+001F、U+007F）或不成對 surrogate → UNICODE；金額文法 MONEY_FORMAT；年利率文法 APR_FORMAT；範圍 RANGE；field 即該欄名，row 即該列號。
4. 全部列的欄位皆通過後，掃描名稱重複：後出現的重複名 → DUPLICATE_NAME，field `name`，row 為後出現列的列號。
5. 驗證 `extraMonthly`：raw 超限 INPUT_LIMIT、空值 EMPTY、文法 MONEY_FORMAT、範圍 RANGE，field `extraMonthly`，row=null。
6. 跨欄檢查：全部最低還款之和＋`extraMonthly` 等於 0 → INSUFFICIENT_PAYMENT，field,row=null（每月完全沒有錢進來，任何策略都無法開始）。

### 模擬規則（兩種策略共用，僅排序不同）

- 金錢以整數分（cents）運算；年利率存為百分點的百分之一整數（例如 19.99% → 1999）。每月利息＝round-half-up（期初餘額分 × 年利率百分之一整數 ÷ 120000），以精確整數運算：`interest = floor((2 × balance × aprHundredths + 120000) / 240000)`；實作可用任何等價的精確方法，但結果必須與此逐位一致。禁止二進位浮點決定任何一分錢。
- 排序在計畫開始時依初始餘額／年利率固定一次，整個計畫不再重排。雪球法：餘額由小到大；同餘額取年利率高者先；再同取名稱 UTF-16 code units 升序；再同取輸入順序。雪崩法：年利率由高到低；同利率取餘額小者先；再同取名稱 UTF-16 升序；再同取輸入順序。
- 每月（第 1 月起，上限 600 個月）依序：(a) 利息：每筆未還清債務按上式計息並加入餘額；(b) 最低還款：依輸入順序，每筆支付 `min(最低還款，餘額)`；若餘額小於最低還款，多出的最低還款額度滾入當月額外池；(c) 額外池：`extraMonthly` ＋已還清債務的最低還款（自還清次月起）＋本月 (b) 滾入的剩餘額度，依策略順序逐筆支付 `min(池內餘額，該筆餘額)`，一筆還清後剩餘池額繼續滾向下一筆；池用完或無未還清債務即停。
- 每月總流出固定為「全部最低還款＋額外還款」，只有最後一個月因餘額不足而較少；還清一筆後釋出的最低還款不會讓每月總流出增加，只會改變流向。
- 還清順序 `payoffOrder` 是各筆實際歸零的順序：同月內先記 (b) 最低還款階段還清者（依輸入順序），再記 (c) 額外池階段還清者（依策略順序）。
- 全部歸零的月份即 `monthsToDebtFree`；600 個月仍未歸零 → `status: "not-debt-free"`、`monthsToDebtFree: null`、`monthsSimulated: 600`，並如實列出剩餘餘額，不虛構還清日。
- 恆等式（每種策略皆須成立，頁面可驗）：還清時 `totalPaidCents = totalInitialCents + totalInterestCents`；未還清時 `totalPaidCents + 最後剩餘 = totalInitialCents + totalInterestCents`。

### 輸出形狀

- `result: {totalInitialCents, extraMonthlyCents, strategies: {snowball, avalanche}, comparison}`。每種策略：`{status ("debt-free" | "not-debt-free"), order (策略順序，名稱陣列), payoffOrder (實際還清順序), monthsToDebtFree (整數或 null), monthsSimulated, totalInterestCents, totalPaidCents, payoffMonth ({名稱: 月份}，只含已還清者), monthly: [{month, paidCents, interestCents, remainingCents}]}`。未還清策略的 `monthly` 含完整 600 列；`comparison` 的四個欄位此時皆為 null（不可拿 600 個月的半截利息與已還清的總利息比較）。
- `comparison`（僅當兩種策略皆還清）：`{lowerInterestStrategy ("snowball" | "avalanche" | "tie"), interestDifferenceCents (絕對值), fewerMonthsStrategy (同前), monthsDifference (絕對值)}`。
- 金額顯示一律千分位＋恰 2 位小數；年利率顯示 2 位小數；月數為整數。機器值不隨 locale 改。

###  worked 範例（規範性，以固定模擬產生，見 fixtures `snowball-vs-avalanche`）

Store Card 600.00 / 24.00% / 50.00、Personal Loan 1200.00 / 6.00% / 100.00、Credit Card 300.00 / 18.00% / 25.00，每月額外還款 100.00。雪球順序 [Credit Card, Store Card, Personal Loan]，8 個月還清，總利息 89.60，總還款 2189.60；雪崩順序 [Store Card, Credit Card, Personal Loan]，8 個月還清，總利息 85.20，總還款 2185.20；雪崩省利息 4.40，月數相同。第 1 月兩種策略皆為：利息 22.50、還款 275.00、剩餘 1847.50。半進位例：餘額 9.00、年利率 6% 時第 1 月利息為 4.5 分 → 進為 5 分（見 fixtures `interest-rounding-half-cent`）。

固定下載 `debt-payoff-plan.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/debt-payoff-planner/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。
- 利息乘積以 BigInt（或等價精確整數）計算：餘額上限 10,000,000.00（10^9 分）× 年利率上限 9999（百分之一整數）≈ 10^13，雖在 float53 整數範圍內，但捨入判決不得依賴浮點；月利息必須逐位等於第 4 節公式。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「比較兩種策略」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `snowball-vs-avalanche` | 展示案例：兩種排序與利息皆不同，同為 8 個月，雪崩省 440 分 |
| `single-debt-zero-apr` | 單筆零利率，10 個月，利息 0，兩策略相同 |
| `zero-apr-all` | 全部零利率，6 個月，利息 0，兩策略月數相同 |
| `extra-rolls-after-payoff` | 還清後釋出的最低還款滾入額外池，4 個月 |
| `minimum-exceeds-balance` | 最低還款超過餘額，剩餘額度同月滾向下一筆，3 個月 |
| `interest-rounding-half-cent` | 4.5 分 half-up 進為 5 分，2 個月，總利息 7 分 |
| `treads-water` | 最低還款恰等於月利息，600 個月仍未還清（部分字面斷言，見下） |
| `tie-break-orders` | 同餘額取高利率先、同利率取小餘額先，兩策略排序不同 |
| `minimum-only-with-interest` | 只繳最低還款且有利息，含 152.5 分 half-up，3 個月 |
| `duplicate-name` | 兩筆同名 → DUPLICATE_NAME，第 2 列 |
| `bad-money-format` | 餘額三位小數 → MONEY_FORMAT，第 1 列 |
| `too-many-debts` | 13 筆 → ROW_LIMIT |
| `zero-total-payment` | 全部還款皆零 → INSUFFICIENT_PAYMENT |
| `bad-apr-format` | 年利率三位小數 → APR_FORMAT，第 1 列 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

`treads-water` 的部分字面斷言：fixture 只含摘要、`monthlyHead`（第 1–3 月）與 `monthlyTail`（第 600 月），因完整 600 列逐字手寫不可行；其完整逐月表改以兩條性質驗證：(a) 恆等式 `remaining[m] = remaining[m-1] + interest[m] − paid[m]` 對全部 600 個月成立；(b) 600 列完全相同（每月利息 5000 分、還款 5000 分、剩餘 500000 分）。其餘核心案例皆為完整逐月字面比對。

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證餘額上限 10,000,000.00 與超一分、年利率 99.99 與 100.00、12 筆與 13 筆、最低還款 0、額外還款 0、雪球／雪崩同餘額同利率的名稱決勝、600 個月上限與第 600 個月恰好還清。所有已接受的每月總流出除最後一月外等於全部最低還款＋額外還款；移除任一筆債務後重算，剩餘筆的結果不變。

候選 gate（均 NOT_RUN）

- 於 `tools/debt-payoff-planner/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「債務清償規劃」，title「債務清償規劃｜Gloss Tools」，description「同時背著多筆債務時，比較雪球法與雪崩法各自要幾個月還清、總利息差多少。」。英文 lang=en，H1 “Debt Payoff Planner”，title “Debt Payoff Planner | Gloss Tools”，description “Compare snowball and avalanche payoff plans for multiple debts: months to debt-free and total interest for each.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。雪球法和雪崩法差在哪？雪球先還餘額最小的，雪崩先還利率最高的；雪崩通常利息較少，雪球通常先看到一筆還清。 / What is the difference between snowball and avalanche? Snowball pays the smallest balance first; avalanche pays the highest APR first. Avalanche usually costs less interest; snowball usually clears one debt sooner.
- FAQ。還清一筆後，它的最低還款會怎樣？從下個月起併入額外還款池，繼續滾向下一筆；每月總流出不變。 / What happens to a paid-off debt's minimum payment? From the next month it joins the extra-payment pool and rolls to the next debt; the total monthly outflow stays the same.
- FAQ。最低還款比利息少會怎樣？該筆餘額會越滾越大；若 600 個月內還不清，工具會如實顯示未還清與剩餘餘額。 / What if a minimum payment is less than the interest? That balance grows; if it cannot be cleared within 600 months, the tool says so and shows the remaining balance.
- FAQ。會連到我的銀行嗎？不會。全部計算都在本頁完成，不上傳任何資料。 / Does it connect to my bank? No. All calculations run on this page and nothing is uploaded.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://debt-payoff-planner.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/debt-payoff-planner/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
