# 儲蓄尾款與達標月份 / Savings goal plan upgrade

**既有工具升級提案（existing-tool-upgrade），待獨立文件維護審查** · `spec-savings-goal-calculator-20261109` · 2026-11-11

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

已經決定要存到一筆錢的人，手上有三個已知數：目標金額、目前存款、一個假設年利率。他們卡在兩個反問題上，用試誤法在試算表裡湊很久還不確定對不對：

- 期限已定（例如 12 個月後要付頭期款）：每個月到底要存多少才剛好達標？
- 每月能存的金額已定（例如薪水扣完固定支出後剩 3000）：幾個月後會達標？最後一個月還需要存全額嗎？

既有複利工具已有兩種反算。本提案聚焦第二個情境（模式 B）。使用者取得最早達標月份、該月需存的尾款，以及照計畫存款後的期末餘額。模式 A 的每月需存金額保留為計算模型的回歸參考。

- 桌面。桌面在做年度預算時輸入目標與期限，立刻比對每月要存的金額是否排得進月度現金流。
- 行動。手機上改一下每月金額，確認達標月份有沒有落在預定的旅行或繳費日期之前。

使用情境為規劃假設，利率是使用者自己輸入的假設值，不是任何商品的報酬承諾。資料只保留在目前頁面草稿。

## scope

升級範圍是模式 B 的有界達標計畫。以精確有理數計算每月複利，存款在月底入帳，月間保留未捨入利息。結果列出目標金額、1,200 個月內首次達標的月份、最後一月的整分尾款、照計畫存款的期末餘額與存全額時的期末餘額。已達標及未達標原因以固定 status 和 reason 表示。模式 A 仍供文件和合成案例驗算。

本輪交付限於文件與案例。後續產品整合需另案決定計息模型如何呈現，保留既有逐月捨入、表格、有效年利率與 CSV 行為。試算假設固定利率與月底存款。

既有 #44 規格及 #80 固定介面都已有兩種反算。既有模型按月把利息捨入到分，達標搜尋限 600 個月。提案模型保留每月的精確利息，新增按整分尾款計算的計畫餘額，達標搜尋限 1,200 個月。例如初始 0.01、目標 0.02、年率 12%、月存 0，提案第 70 月達標，既有模型每月入帳利息為 0.00，餘額保持 0.01。 [#44 固定規格](https://github.com/KYStr/glossquote-labs-home/blob/5a9acc11b5b23200c3d4cda32adaafbbd389532e/docs/specs/compound-interest-calculator/SPEC.md) · [#80 固定介面](https://github.com/KYStr/glossquote-labs-home/blob/e42ebf56853ad8e46964ea8fc1ebf9623c6c2bb1/tools/compound-interest-calculator/public/en/index.html#L33-L34)

判定規則由本文定義，無線上資料或外部服務依賴；利率與金額全部由使用者輸入，無內建市場資料。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式切換「求解模式 / Solve mode」：`payment` = 「算每月要存多少 / Find the monthly deposit」；`months` = 「算幾個月達標 / Find the months needed」。兩模式共用目標金額、目前存款、年利率欄位，切換模式不清除共用欄位。
- 欄位或說明「目標金額、目前存款、年利率 / Goal amount, current savings, annual rate」
- 模式 A 欄位「期限（月）/ Term (months)」；模式 B 欄位「每月存款 / Monthly deposit」。非作用中模式的欄位停用顯示，但其值保留在草稿中。
- 「計算儲蓄計畫 / Calculate savings plan」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 的 `months-with-interest` 合成案例，明示範例並等待手動執行。
- 「儲蓄計畫結果 / Savings plan result」先摘要（狀態句＋主數字）再列細節。模式 B 分列「目標金額 / Goal amount」、「最後一月存款 / Final month's deposit」、「計畫期末餘額 / Planned ending balance」和「存全額的期末餘額 / Ending balance with full deposits」。未達標時顯示目標及原因，省略無法推導的計畫數值。成功回應才顯示「下載報告 / Download report」。文字可手動選取。
- 結果旁說明計息假設。「每月保留未捨入的利息，存款於月底計入。 / Interest carries forward without monthly rounding. Deposits are added at month-end.」
- 結果旁常駐揭露句（雙語釘版，見 inputsOutputs 第 7 點）。狀態為 `already-funded`、`growth-sufficient`、`unreachable` 時，摘要區顯示對應的釘版狀態句（見 inputsOutputs），不用顏色暗示成功或失敗。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。含語意狀態（already-funded 等）時以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"payment","targetAmount":"100000","initialAmount":"10000","annualRate":"3","months":"60","monthlyPayment":"3000"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。明示檔案欄才處理原始 bytes；本工具無檔案欄。

欄位（順序即驗證順序）：

| 欄位 | 文法 | raw 上限 | 值域 | 預設 |
| --- | --- | --- | --- | --- |
| `mode` | 恰為 `payment` 或 `months` | 16 單元 | — | `payment` |
| `targetAmount` | 金額文法（見下） | 16 單元 | 0.01–999,999,999.99 | `100000` |
| `initialAmount` | 金額文法 | 16 單元 | 0–999,999,999.99 | `10000` |
| `annualRate` | 利率文法（見下），單位 % | 8 單元 | 0–100 | `3` |
| `months` | 整數文法 | 8 單元 | 1–600（僅模式 A） | `60` |
| `monthlyPayment` | 金額文法 | 16 單元 | 0–999,999,999.99（僅模式 B） | `3000` |

- 金額文法：ASCII 數字、可選一個小數點與 1–2 位小數（`^[0-9]+(\.[0-9]{1,2})?$`）。無正負號、空白、千分位、指數。前導零允許（`007.50` = 7.50）。違反為 DECIMAL_FORMAT。
- 利率文法：同金額文法（最多 2 位小數），違反為 DECIMAL_FORMAT。解析為基點 bp = 值 × 100 的整數（3.5% → 350）。
- 整數文法：`^[0-9]+$`，違反為 INTEGER_FORMAT。
- `mode` 為空字串為 EMPTY；非空但不是兩個釘版值之一為 ENUM。
- 非作用中模式的欄位（模式 A 的 `monthlyPayment`、模式 B 的 `months`）只驗容量 INPUT_LIMIT，其餘檢查全部跳過、內容忽略。這讓兩模式可共用同一份草稿物件而不互相污染。

每欄驗證順序：容量 INPUT_LIMIT → 未成對 surrogate UNICODE → EMPTY → 文法（ENUM／DECIMAL_FORMAT／INTEGER_FORMAT）→ RANGE。先由 SCHEMA 檢查整體形狀。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

運算（全部精確有理數，禁用浮點決定任何一位數字；金額先解析為整數分，利率解析為整數 bp）：

1. 記 FV = 目標金額（分）、PV = 目前存款（分）、PMT = 每月存款（分）、n = 期限。月利率 i = bp / 120000（即年利率 ÷ 12 的精確有理數），成長因子 q = (120000 + bp) / 120000。
2. 餘額函數 B(k)：bp > 0 時 B(k) = PV × q^k + PMT × (q^k − 1) / i；bp = 0 時 B(k) = PV + PMT × k。B(k) 是「每月月底存入 PMT、連續 k 個月後」的期末餘額。零利率分支以 bp == 0（解析後整數）判定，線性公式精確成立，不用 epsilon 近似、不用除以 i。
3. 模式 A（解 PMT，n 已知）：
   1. PV ≥ FV → status `already-funded`：monthlyPayment `0.00`、totalDeposits `0.00`、finalBalance = halfUp(B₀(n))（B₀ 為 PMT = 0 的餘額函數，即 PV × q^n；bp = 0 時即 PV）、totalInterest = finalBalance − PV。
   2. 否則 bp > 0 且 PV × q^n ≥ FV → status `growth-sufficient`：輸出同上（需存 0，但期末餘額照算）。
   3. 否則 status `ok`：精確月存 PMT* = (FV − PV × q^n) × i / (q^n − 1)；bp = 0 時 PMT* = (FV − PV) / n。令 P = ceil(PMT*)，為顯示的整分月存 monthlyPayment。totalDeposits = P × n。finalBalance = halfUp(PV × q^n + P × (q^n − 1) / i)（bp = 0 時為 PV + P × n）。totalInterest = finalBalance − PV − totalDeposits。
4. 模式 B（解月數，PMT 已知）：
   1. PV ≥ FV → status `already-funded`：monthsRequired 0、finalMonthPayment `0.00`、balanceIfFullPayment 與 finalBalance 皆為 initialAmount 的顯示值、totalDeposits 與 totalInterest 皆 `0.00`、reason null。
   2. 否則 PMT = 0 且（PV = 0 或 bp = 0）→ status `unreachable`、reason `no-growth`。六個推導值（monthsRequired、finalMonthPayment、balanceIfFullPayment、totalDeposits、totalInterest、finalBalance）皆為 null。
   3. 先設定所有餘額評估與乘冪的索引上限為 1200。只接受 0–1200 的整數索引，通過檢查後才執行精確運算。精確比較 B(1200) 與 FV。若 B(1200) < FV，回 `unreachable`、reason `beyond-horizon`，六個推導值皆為 null。
   4. 其餘情形在 [1, 1200] 求最小 k，使 B(k−1) < FV ≤ B(k)。bp = 0 可直接用整數進位除法 `ceil((FV − PV) / PMT)`。bp > 0 時用整數二分。每次以區間整數中點 m 比較精確的 B(m) 與 FV，達標則上界設為 m，未達則下界設為 m+1，直至兩界相同。初始下界前一月為 B(0)=PV<FV，上界 B(1200)≥FV。B 非遞減，區間每步保留首次達標月，最多 11 次中點比較。
   5. 回 status `ok`、reason null。令尾款前餘額 `beforeTail = B(k−1) × q`。以整數分表示的尾款 `tail = ceil(max(0, FV − beforeTail))`，範圍 0–PMT。若最後一月利息已使餘額達標，尾款為 0。以顯示的整分尾款計算 `finalBalance = halfUp(beforeTail + tail)`，`balanceIfFullPayment = halfUp(B(k))`，`totalDeposits = PMT × (k−1) + tail`，`totalInterest = finalBalance − PV − totalDeposits`。因此目標金額、實際計畫餘額及全額存款餘額各有明確語意。
5. 結果形狀。模式 A：`{mode:"payment", status, months, monthlyPayment, totalDeposits, totalInterest, finalBalance}`，months 為輸入 n 的 JSON 整數。模式 B：`{mode:"months", status, reason, targetAmount, monthsRequired, finalMonthPayment, balanceIfFullPayment, totalDeposits, totalInterest, finalBalance}`。所有模式 B 成功回應的 targetAmount 為正規化輸入目標的兩位小數金額字串。reason 為 `null`、`"no-growth"` 或 `"beyond-horizon"`，monthsRequired 為 JSON 整數或 null。
6. 以精確餘額比較是否達標，付款金額（monthlyPayment、finalMonthPayment）無條件進位到整數分，確保照計畫可達輸入目標。餘額金額（兩模式的 finalBalance 與模式 B 的 balanceIfFullPayment）以 halfUp 顯示，即 `floor(x + 1/2)`。存款加總採實際顯示的整分付款。利息由顯示餘額減本金與存款得到。計算到月末前不捨入。尾款為零時，當月利息可能使期末餘額高於目標超過一分，見字面案例。
7. 金額字串格式：整數分 → `D.CC`（元為整數部、小數恰 2 位），無千分位、無正負號、無貨幣符號；機器值不隨 locale 改。結果旁常駐揭露句（釘版原文）：「報酬率為假設值，試算結果不保證實際收益。 / The rate is an assumption; results do not guarantee actual returns.」
8. 語意狀態句（釘版原文，雙語）：`already-funded`：「目前存款已達目標，不需再存。 / Your current savings already reach the goal; no deposit is needed.」`growth-sufficient`：「不需新增存款，目前存款單獨成長即可在期限內達標。 / No new deposits are needed; your current savings alone grow to the goal by the deadline.」`unreachable` + `no-growth`：「在目前條件下餘額永遠不會成長，達不到目標。 / Under these inputs the balance never grows, so the goal can never be reached.」`unreachable` + `beyond-horizon`：「以目前條件，1,200 個月（100 年）內未達目標。 / Under these inputs, the balance does not reach the goal within 1,200 months (100 years).」

固定下載 `savings-goal-report.json`。內容為 `{input, result}` 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。input 包含兩模式的原始草稿欄位。下載旁註明「報告包含兩種模式的輸入草稿與本次計算結果。 / The report includes draft inputs for both modes and the result of this calculation.」字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

後續若整合，沿用既有 `tools/compound-interest-calculator/` 的原生 HTML/CSS/ESM、Node 24 built-ins 與兩語入口。下列描述是尾款計畫的實作契約。純核心負責驗證、計算與格式化，controller 管草稿、工作世代及資源，畫面用安全 DOM API 綁表單。建置限工具 allowlist，使用固定來源。

- 核心運算採 BigInt 有理數。精確餘額入口與 BigInt 冪入口先驗證整數索引 0–1200，模式 A 期限另受輸入上限 600 約束。最大未約分成長因子分子為 130000^1200，共 6137 位十進數字。模式 B 先比較 B(1200)，再求界內最早達標月。後續取 B(k) 及 B(k−1) 時也走同一受限入口。零利率比較、月數、尾款及顯示分位均用整數或有理數算術。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

本輪維護審查面向為 `spec-corrections`、`exact-fixtures`、`provenance-and-scope`，由非作者針對同一固定維護候選驗證。以下九面向保留給未來另行立案的產品整合，分數皆 null、狀態均 NOT_RUN。屆時由未參與製作的 reviewer 對同一開啟 PR head 驗證，每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 用真實輸入執行模式 B 升級試算，畫面和報告符合相應 fixtures，目標、尾款與計畫餘額分列。另回歸既有兩個反算入口。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、零利率、1,200／1,201 月、正利率超期、一分尾款、受限月份評估與三個 controller 案例。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；語意狀態句可被非工程背景使用者理解。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow；兩瀏覽器的 BigInt 結果逐分一致。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。23 個字面核心案例與 3 個 controller 案例。用獨立有理數遞推核對每個 expected。後續產品交驗時比對實際下載的 canonical bytes 和 SHA-256。

| 案例 ID | 驗證行為 |
| --- | --- |
| `payment-basic-zero-rate` | 零利率模式 A 基本除法 |
| `payment-zero-rate-ceiling` | 零利率月存進位到分，期末略高於目標 |
| `payment-with-interest` | 年金公式一般案例，進位後期末 100000.02 |
| `payment-one-month-timing` | 月底存款時點：單月存款不計息 |
| `payment-long-horizon` | 360 個月 BigInt 精確冪 |
| `payment-already-funded` | 模式 A 已達標狀態 |
| `payment-growth-sufficient` | 模式 A 不需新增存款狀態 |
| `months-exact-zero-rate` | n* 恰整數，進位不跳一月 |
| `months-ceiling-boundary` | 第 30 月差 10 元未達、第 31 月跨越，尾款 10.00 |
| `months-with-interest` | 第 42 月首次達標，尾款 152.88，目標 20000.00，計畫期末 20000.01、利息 2547.13 |
| `months-growth-only-crossing` | 月存 0 靠成長在第 10 月達標，尾款 0.00，計畫期末 11046.22、利息 1046.22 |
| `months-already-funded` | 模式 B 已達標，月數 0 |
| `months-unreachable-no-growth` | 永遠達不到（no-growth），目標保留、六個推導值 null |
| `months-unreachable-horizon` | 超過 1200 個月（beyond-horizon），目標保留、六個推導值 null |
| `months-at-horizon` | 第 1200 月剛好達標，尾款 1.00 |
| `months-first-over-horizon` | 第 1200 月差 1.00。第 1201 月才會達標，回 beyond-horizon |
| `months-positive-rate-beyond-horizon` | 年率 0.01%，第 1200 月餘額約 1.01005 分，回 beyond-horizon |
| `months-unrounded-growth-small-balance` | 初始 0.01、目標 0.02。精確模型第 70 月達標，既有逐月捨入下餘額不成長 |
| `months-one-cent-tail` | 尾款前 50.5 分，目標 51 分。尾款 0.01，期末 0.52，利息 0.01 |
| `error-months-zero` | 月數 0 → RANGE |
| `error-rate-format` | 利率 3 位小數 → DECIMAL_FORMAT |
| `error-money-format` | 金額千分位逗號 → DECIMAL_FORMAT |
| `error-mode-enum` | 未知模式 → ENUM |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。以固定種子驗證模式 A 的整分月存最小性，及模式 B 的首次達標不等式 B(k−1) < FV ≤ B(k)。模式 B 正尾款須滿足 `beforeTail + tail − 1 < FV ≤ beforeTail + tail`。零尾款須滿足 `beforeTail ≥ FV`。兩模式只要回傳期末餘額，就須滿足 `finalBalance = initialAmount + totalDeposits + totalInterest`。以記錄的評估索引證明搜尋先查 B(1200) 且無超界評估。用整數加法複核零利率案例。

候選 gate（均 NOT_RUN）

- 後續產品整合在既有 `tools/compound-interest-calculator/` 路徑驗核心／狀態、HTML、下載和建置。記 Node 24.x、該固定候選的測試與建置命令、exit 和重建 SHA-256。測試使用合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 沿用既有繁中 `lang=zh-Hant` 和英文 `lang=en` 頁面。兩語於結果旁說明尾款、計畫期末餘額、計息模型和 1,200 個月上限，並提供對等的狀態、錯誤與 FAQ。
- FAQ。存款是什麼時候存入？每月月底（普通年金），本月存入的錢下個月才開始計息。 / When are deposits made? At the end of each month (ordinary annuity); a deposit starts earning interest the following month.
- FAQ。尾款和期末餘額怎麼算？尾款進位到整分，期末餘額以這筆尾款及該月利息計算。若利息已讓餘額達標，尾款為零，計畫期末餘額仍可能高於目標。 / How are the final deposit and ending balance calculated? The final deposit rounds up to a whole cent. The ending balance includes that deposit and the month's interest. If interest alone reaches the goal, the final deposit is zero and the ending balance can still exceed the goal.
- FAQ。報酬率是保證的嗎？不是。利率是你輸入的假設，結果只是該假設下的試算，不保證任何實際收益。 / Is the return guaranteed? No. The rate is your own assumption and the result is only a projection under it, not a promise of any actual return.
- FAQ。為什麼兩種計息方式的達標月份可能不同？既有複利試算每月把入帳利息捨入到分。尾款計畫保留月間的精確利息。例如從 0.01 存到 0.02，年率 12% 且每月存 0，尾款計畫第 70 月達標，逐月捨入時利息每月捨為 0.00。 / Why can the two interest models give different goal dates? The existing calculator rounds interest to cents each month. The final-deposit plan carries exact interest forward. At 12% annually, with 0.01 saved, a goal of 0.02 and no deposits, the plan reaches the goal in month 70. With monthly rounding, interest rounds to 0.00 each month.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 後續若整合及發布，驗既有工具的正式 HTTPS、雙語 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、MIME、安全標頭、404、root redirects 及同語首頁回鏈。使用經主統籌核對的正式 origin。

## handoff

維護候選保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，以固定 commit 與開啟 PR 提交三項維護面向的獨立審查。原 task、owner、PR 與固定來源沿用歷史登記。原預案八節審查和 REG-01 登記契約問題另案處理。本升級提案不計入新工具 ready 庫存。 [原候選 #245](https://github.com/KYStr/glossquote-labs-home/pull/245)

產品整合需另行立案，在既有工具路徑取得有效 claim，確認既有模型、尾款模型與雙語介面的整合方式。產品九面向、正式發布與使用者外驗維持各自的 gate。
