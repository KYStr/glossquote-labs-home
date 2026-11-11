# 儲蓄目標計算 / Savings Goal Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-savings-goal-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

已經決定要存到一筆錢的人，手上有三個已知數：目標金額、目前存款、一個假設年利率。他們卡在兩個反問題上，用試誤法在試算表裡湊很久還不確定對不對：

- 期限已定（例如 12 個月後要付頭期款）：每個月到底要存多少才剛好達標？
- 每月能存的金額已定（例如薪水扣完固定支出後剩 3000）：幾個月後會達標？最後一個月還需要存全額嗎？

本工具只解這兩個反問題，答案以閉式年金公式配合精確有理數運算給出，捨入規則釘死，使任何人用同樣輸入在紙上或用另一實作重算，都得到同一個答案。成功結果是使用者拿到一個可直接照做的數字：每月存款金額（模式 A），或達標月數加最後一月的較小存款額（模式 B）。

- 桌面。桌面在做年度預算時輸入目標與期限，立刻比對每月要存的金額是否排得進月度現金流。
- 行動。手機上改一下每月金額，確認達標月份有沒有落在預定的旅行或繳費日期之前。

使用情境為規劃假設，利率是使用者自己輸入的假設值，不是任何商品的報酬承諾。資料只保留在目前頁面草稿。

## scope

MVP 必做：兩種求解模式共用一組輸入（目標金額、目前存款、名目年利率），每月複利、存款一律月底存入（普通年金），金額與利率以精確有理數運算（見 inputsOutputs），輸出釘版捨入。模式 A 由期限解每月需存金額；模式 B 由每月金額解達標月數、最後一月需存金額與全額存入時的期末餘額。已達標、不需新增存款、永遠達不到三種語意狀態以固定 status 回傳，不是錯誤。

非目標：逐月餘額路徑或年度明細表、有效年利率換算顯示、CSV、通膨調整、稅務、一次性或不定期存入、多個目標、月初存入（年金到期）模式、利率隨時間變動、投資建議或商品推薦、把結果當收益保證。

與既有功能的實質差異（已逐一讀過原文比對）：

- 正向模擬 vs 反向求解。[compound-interest-calculator](https://github.com/KYStr/glossquote-labs-home/blob/1160e69852cd6b5b76461d812d378999333f7c6a/docs/specs/compound-interest-calculator/SPEC.md) 是正向工具：給定本金與每月投入，逐月模擬成長並附每月／每年明細表、有效年利率與 CSV；它對目標問題的答案是對「每月逐月進位到分的模擬」做二元搜尋得出，其真相是模擬本身。本工具不模擬、不出明細表：只解兩個反問題，真相是閉式年金公式的精確有理數結果。因為兩者模型不同（逐月捨入 vs 不捨入的閉式解），同一組輸入下兩工具的答案可能差幾分錢；本工具頁面與 FAQ 明示此事，且本工具不顯示任何逐月數字，頁面內部不會自相矛盾。要逐月明細與有效年利率的使用者應使用前者；只要一個能照做的月存金額或達標月份的使用者用本工具。
- 負債側 vs 資產側。mortgage 類規格把債務以年金攤還到零；本工具讓資產成長到目標，方向相反、輸出不同，除整數分紀律外不共用排程語意。
- 一次性算術工具（分帳、單價）沒有時間維度，不處理利率與期限。

判定規則由本文定義，無線上資料或外部服務依賴；利率與金額全部由使用者輸入，無內建市場資料。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式切換「求解模式 / Solve mode」：`payment` = 「算每月要存多少 / Find the monthly deposit」；`months` = 「算幾個月達標 / Find the months needed」。兩模式共用目標金額、目前存款、年利率欄位，切換模式不清除共用欄位。
- 欄位或說明「目標金額、目前存款、年利率 / Goal amount, current savings, annual rate」
- 模式 A 欄位「期限（月）/ Term (months)」；模式 B 欄位「每月存款 / Monthly deposit」。非作用中模式的欄位停用顯示，但其值保留在草稿中。
- 「計算儲蓄計畫 / Calculate savings plan」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「儲蓄計畫結果 / Savings plan result」先摘要（狀態句＋主數字）再列細節。成功才顯示「下載報告 / Download report」。文字可手動選取。
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
   3. 否則 status `ok`：精確月存 PMT* = (FV − PV × q^n) × i / (q^n − 1)；bp = 0 時 PMT* = (FV − PV) / n。monthlyPayment = PMT* **無條件進位到分**（ceil，見第 6 點）。totalDeposits = monthlyPayment × n。finalBalance = halfUp(PV × q^n + PMT × (q^n − 1) / i)（bp = 0 時為 PV + PMT × n，本身是整數分）。totalInterest = finalBalance − PV − totalDeposits（由已顯示值相減，顯示恆等式 finalBalance = PV + totalDeposits + totalInterest 精確成立）。
4. 模式 B（解月數，PMT 已知）：
   1. PV ≥ FV → status `already-funded`：monthsRequired 0、finalMonthPayment `0.00`、balanceIfFullPayment 與 finalBalance 皆為 initialAmount 的顯示值、totalDeposits 與 totalInterest 皆 `0.00`、reason null。
   2. 否則 PMT = 0 且（PV = 0 或 bp = 0）→ status `unreachable`、reason `no-growth`：餘額永遠不變或永遠為 0。除 mode、status、reason 外，所有數值欄位（monthsRequired、finalMonthPayment、balanceIfFullPayment、totalDeposits、totalInterest、finalBalance）皆為 null。
   3. 否則取最小整數 k ≥ 1 使 B(k) ≥ FV：bp = 0 時 k = ceil((FV − PV) / PMT) 精確整數運算（n* 恰為整數時 k 即該整數，不加 1）；bp > 0 時先以浮點對數估計 k̂ = ln((FV × i + PMT) / (PV × i + PMT)) / ln(q)，再以精確有理數比較校正（B(k) < FV 則 k 加 1；k ≥ 2 且 B(k − 1) ≥ FV 則 k 減 1），校正後 k 為精確最小值，浮點誤差不影響結果。
   4. k > 1200 → status `unreachable`、reason `beyond-horizon`，數值欄位皆 null（1200 個月 = 100 年為本工具求解上限）。
   5. 否則 status `ok`、reason null：finalMonthPayment 的精確值 = FV − B(k − 1) × q（bp = 0 時 = FV − B(k − 1)），若為負截為 0（跨越發生在最後一月成長途中、該月不需存款時），顯示值**無條件進位到分**。balanceIfFullPayment = halfUp(B(k))（每月都存全額時的期末餘額，≥ FV）。totalDeposits = PMT × (k − 1) + finalMonthPayment 顯示值。finalBalance = targetAmount（照計畫於最後一月存入精確尾款時恰達目標）。totalInterest = finalBalance − PV − totalDeposits（由顯示值相減，恆等式成立；因尾款進位，顯示利息可能比精確利息少不到 1 分，FAQ 明示）。
5. 結果形狀釘版。模式 A：`{mode:"payment", status, months, monthlyPayment, totalDeposits, totalInterest, finalBalance}`，months 為輸入 n 的 JSON 整數。模式 B：`{mode:"months", status, reason, monthsRequired, finalMonthPayment, balanceIfFullPayment, totalDeposits, totalInterest, finalBalance}`，reason 為 `null`、`"no-growth"` 或 `"beyond-horizon"`，monthsRequired 為 JSON 整數或 null。
6. 捨入釘版（全部只在顯示／輸出時發生一次，內部運算不捨入）：付款類金額（monthlyPayment、finalMonthPayment）一律**無條件進位到分**（ceil 到整數分）——理由是少存 1 分就可能差 1 分沒達標，是比多存不到 1 分更糟的失敗；不用進位到整元，因為長期限下整元進位經年金放大可多存數十元。餘額類金額（finalBalance 模式 A、balanceIfFullPayment）以 halfUp 顯示（floor(x + 1/2)，所有值 ≥ 0）。利率不顯示換算值。所有顯示金額 ≥ 0（totalInterest 由恆等式保證不為負，證明見 AUTHOR-CHECK.md）。
7. 金額字串格式：整數分 → `D.CC`（元為整數部、小數恰 2 位），無千分位、無正負號、無貨幣符號；機器值不隨 locale 改。結果旁常駐揭露句（釘版原文）：「報酬率為假設值，試算結果不保證實際收益。 / The rate is an assumption; results do not guarantee actual returns.」
8. 語意狀態句（釘版原文，雙語）：`already-funded`：「目前存款已達目標，不需再存。 / Your current savings already reach the goal; no deposit is needed.」`growth-sufficient`：「不需新增存款，目前存款單獨成長即可在期限內達標。 / No new deposits are needed; your current savings alone grow to the goal by the deadline.」`unreachable` + `no-growth`：「在目前條件下餘額永遠不會成長，達不到目標。 / Under these inputs the balance never grows, so the goal can never be reached.」`unreachable` + `beyond-horizon`：「以目前每月金額，達標需要超過 1200 個月（100 年），超出本工具範圍。 / At this monthly amount the goal takes over 1,200 months (100 years), beyond this tool's horizon.」

固定下載 `savings-goal-report.json`。內容為 `{input, result}` 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/savings-goal-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心運算一律 BigInt 有理數：金額為 BigInt 整數分，i 與 q 為 BigInt 分子／分母，q^n 以 BigInt 冪精確計算。n ≤ 600、bp ≤ 10000 時 (120000 + bp)^600 約 3100 位數，BigInt 直接處理。模式 B 的對數估計只給校正起點，校正迴圈以精確比較收斂，上限 1300 次迭代防呆；零利率分支走整數路徑，不經對數。不許以浮點計算結果的任何一位數字。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算儲蓄計畫」兩模式，畫面和完整報告符合核心 fixtures（含 3 種語意狀態），使用者取得對應產物。 |
| boundaries | 合法端點（金額上限、利率 0 與 100、月數 1 與 600）、剛好越界、第一個錯誤、零利率雙模式、n* 恰整數邊界、1200 個月上限與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；語意狀態句可被非工程背景使用者理解。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow；兩瀏覽器的 BigInt 結果逐分一致。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

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
| `months-with-interest` | 對數估計＋精確校正，第 42 月首次跨越 |
| `months-growth-only-crossing` | 月存 0 靠成長跨越，尾款截為 0.00 |
| `months-already-funded` | 模式 B 已達標，月數 0 |
| `months-unreachable-no-growth` | 永遠達不到（no-growth），欄位 null |
| `months-unreachable-horizon` | 超過 1200 個月（beyond-horizon），欄位 null |
| `error-months-zero` | 月數 0 → RANGE |
| `error-rate-format` | 利率 3 位小數 → DECIMAL_FORMAT |
| `error-money-format` | 金額千分位逗號 → DECIMAL_FORMAT |
| `error-mode-enum` | 未知模式 → ENUM |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。性質測試（種子固定）：模式 A status ok 且月存 > 0 時，以顯示月存代入 B(n) 必 ≥ FV、以月存 −0.01 代入必 < FV（進位最小性）；模式 B status ok 時 B(k − 1) < FV ≤ B(k)（首次跨越）；兩模式所有成功結果滿足顯示恆等式 finalBalance = initialAmount + totalDeposits + totalInterest（模式 B already-funded 與 unreachable 除外，後者無數值）；零利率案例以純整數加法獨立複核。驗證 rate = 0 與 rate = 100、months = 1 與 600 與 601、金額恰 999,999,999.99 與多 1 分、期限估計恰落在 1200 與 1201 個月兩側。

候選 gate（均 NOT_RUN）

- 於 `tools/savings-goal-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「儲蓄目標計算」，title「儲蓄目標計算｜Gloss Tools」，description「輸入目標金額、目前存款與假設年利率，算出每月要存多少，或以固定月存金額算出幾個月達標；月底存款、精確有理數運算，結果不保證收益。」。英文 lang=en，H1 “Savings Goal Calculator”，title “Savings Goal Calculator | Gloss Tools”，description “Enter a goal, current savings and an assumed annual rate to find the monthly deposit you need, or the months a fixed deposit takes to reach the goal. End-of-month deposits and exact rational arithmetic; results are not a guarantee of returns.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。存款是什麼時候存入？每月月底（普通年金），本月存入的錢下個月才開始計息。 / When are deposits made? At the end of each month (ordinary annuity); a deposit starts earning interest the following month.
- FAQ。為什麼每月金額無條件進位到分？避免差不到一分錢沒達標；照顯示金額存，期末餘額會等於或略高於目標。最後一月的尾款也是同樣規則，所以顯示利息可能比精確值少不到一分。 / Why is the monthly amount rounded up to the cent? So the plan never falls a cent short; depositing the displayed amount ends at or slightly above the goal. The final month's smaller deposit follows the same rule, so the displayed interest can be under a cent below the exact figure.
- FAQ。報酬率是保證的嗎？不是。利率是你輸入的假設，結果只是該假設下的試算，不保證任何實際收益。 / Is the return guaranteed? No. The rate is your own assumption and the result is only a projection under it, not a promise of any actual return.
- FAQ。和複利計算機有什麼不同？複利計算機逐月模擬成長並提供每月明細，答案來自逐月進位到分的模擬；本工具只解兩個反問題，用不捨入的閉式公式精確計算，因此同樣輸入下兩者答案可能差幾分錢。 / How is this different from the Compound Interest Calculator? That tool simulates growth month by month with a full table, and its answers come from that cent-rounded simulation; this tool solves only the two inverse questions with unrounded closed-form math, so the two can differ by a few cents on the same inputs.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://savings-goal.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/savings-goal-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
