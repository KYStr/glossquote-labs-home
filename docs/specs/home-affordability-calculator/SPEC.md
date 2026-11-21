# 購屋能力試算 / Home Affordability Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-home-affordability-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

準備買房的人，先輸入年收入、頭期款、房貸利率、年期與每月其他債務，依 28/36 負擔比率算出最高月付、最高貸款與最高房價，再決定要看哪個價位的房子。

- 桌面。桌面填上年收入、頭期款、房貸年利率、年期、每月其他債務與前後端負擔上限，逐步確認在給定上限下月付與房價的天花板、以及是哪一個上限綁住了額度。
- 行動。手機在看房現場核對一組收入與利率假設下的最高房價，不查詢任何即時資料。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具是依使用者輸入假設的試算，不是財務建議、銀行報價或核貸保證；28/36 是傳統經驗法則，不是法定上限（見 inputsOutputs 的來源說明）。

## scope

固定年利率、等額本息的負擔能力反推模型：月收入為年收入除以 12，前端上限為月收入乘以前端比率，後端上限為月收入乘以後端比率再扣每月其他債務，取較小者為最高月付，再以年金公式反推最高貸款，加頭期款得最高房價。月付只計房貸本金加利息（P&I），不含稅金、保險、管理費。非目標為稅費／保險／管理費、房貸成數（LTV）限制、逐月還款表顯示、即時利率查詢、多物件比較、賣房成本、把結果當財務建議或銀行核貸保證、儲存設定檔。

已與本 checkout 的 `docs/specs/` 比對（2026-11-21，基線 13ffe058e4330f675b113a75827c35d4fbaa4381，103 份規格），最相近者的實質差異如下。

- mortgage-amortization（房貸還款表）：給定一筆貸款，產出逐月還款分攤表（本金／利息／餘額）與提前還款比較；其第 1 節明列 affordability underwriting（負擔能力核貸）為非目標。本案正是該缺口：給定收入與負擔上限，反推最高月付、最高貸款與最高房價，不產出逐月表。 [spec-mortgage-amortization](https://github.com/KYStr/glossquote-labs-home/blob/13ffe058e4330f675b113a75827c35d4fbaa4381/docs/specs/mortgage-amortization/SPEC.md)（本 checkout 的基線 commit；連結僅供對照，生產前重查）
- rent-budget（租金負擔能力）：給定收入，算每月負擔得起多少租金，是一次性的租金負擔上限。此處是購屋的負擔能力反推，產出最高房價與最高貸款，含利率與年期的年金反推。本 checkout 的 `docs/specs/` 內無 rent-budget 規格，僅在舊稽核清單見已部署站台路徑；生產承接前須對新鮮 registry 重查。
- rent-vs-buy-calculator（租屋 vs 買房）：假設房價已知，比較租與買在多年內的總成本，產出損益平衡年數。此處房價未知、由收入與負擔上限反推，產出最高房價與最高月付。本 checkout 的 `docs/specs/` 內無 rent-vs-buy-calculator 規格；生產承接前須對新鮮 registry 重查。

判定規則由本文定義，無線上資料或外部服務依賴。金額以新台幣標示，但算術與幣別無關。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「年收入、頭期款 / Annual income and down payment」
- 欄位或說明「房貸年利率、年期、每月其他債務 / Mortgage rate, term and other monthly debts」
- 欄位或說明「前端上限、後端上限 / Front-end cap and back-end cap」
- 「計算購屋能力 / Calculate home affordability」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「最高月付、最高貸款與最高房價 / Maximum monthly payment, loan and home price」先摘要再列細節：月收入、前端上限金額、後端上限金額、最高月付、綁定的上限（前端／後端／相等）、最高貸款、最高房價、最高月付時的 front-end 與 back-end 比率、是否仍有貸款額度；綁定的上限以文字及符號標示，不只用顏色。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"annualIncome":"1200000","downPayment":"2000000","mortgageRate":"2","years":"30","otherDebts":"0","frontEndCapPct":"28","backEndCapPct":"36"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 欄位順序即驗證順序：annualIncome、downPayment、mortgageRate、years、otherDebts、frontEndCapPct、backEndCapPct。每欄 raw 最多 12 字元，超限 INPUT_LIMIT；空字串 EMPTY；文法錯 INTEGER_FORMAT（整數欄）或 DECIMAL_FORMAT（比率欄）；範圍錯 RANGE；最後跨欄檢查前後端上限，後端低於前端 CAP_ORDER，field 為 backEndCapPct。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。
- 整數欄（annualIncome、downPayment、years、otherDebts）：ASCII 十進整數字串，「0」或非零開頭，無空白／符號／小數／指數。annualIncome 1–1,000,000,000 元／年；downPayment 0–1,000,000,000 元；years 1–40 年；otherDebts 0–1,000,000 元／月。
- 比率欄（mortgageRate、frontEndCapPct、backEndCapPct）：ASCII 十進小數字串，整數部分「0」或非零開頭，可選小數點後 1 至若干位；前置負號（含「-0」）一律 DECIMAL_FORMAT。mortgageRate 0–30%，小數至多 4 位；frontEndCapPct 10–50%，小數至多 2 位；backEndCapPct 20–60%，小數至多 2 位。
- 預設 annualIncome 1200000、downPayment 2000000、mortgageRate 2、years 30、otherDebts 0、frontEndCapPct 28、backEndCapPct 36。

DTI 上限的來源與釘版（概念筆記第 13 條寫「例如 28/36」，已對照具名來源核實）：

- DTI 定義依美國消費者金融保護局（CFPB）「What is a debt-to-income ratio?」：DTI 為全部每月債務還款除以稅前月收入（gross monthly income）；「Different loan products and lenders will have different DTI limits.」——沒有單一法定上限。
- 28/36 是傳統經驗法則，不是法定上限：住房支出不超過稅前月收入 28%（前端），全部債務不超過 36%（後端）。CFPB 的 Your Home Loan Toolkit 稱 28% 為房貸經驗法則（rule of thumb）；Cornell LII（Wex）同樣記載 28%/36% 為傳統說法。本工具以 28/36 為預設值，並允許在釘死的範圍內調整。
- 舊的 43% 數字已不再是法定上限：原 General QM 的 43% DTI 上限已由 CFPB 2020 年 12 月的 General QM Final Rule 改為價格制（price-based）標準，強制適用日延至 2022 年 10 月 1 日。本工具不以 43% 為上限或預設。
- 各方案上限僅作背景，不進模型：傳統房貸人工核貸後端上限約 36%、有補償因素可至 45%、經 Fannie Mae Desktop Underwriter 可至 50%（Fannie Mae Selling Guide B3-6-02）；FHA 約 31/43（HUD Handbook 4000.1）；VA 以 41% 為參考值並看剩餘收入；USDA 約 29/41。本工具的前端 10–50%、後端 20–60% 可調範圍覆蓋上述各方案，但不宣稱任一方案的核貸結果。

模型（全部金額為整數元；比率為精確有理數；四捨五入皆為 half-up，.5 進位，另有指明者除外）：

1. 月收入 monthlyGrossIncome = round-half-up(annualIncome / 12)。前端上限金額 frontEndLimit = round-half-up(annualIncome × frontEndCapPct / 1200)（精確有理數一次取整，不以先取整的月收入再乘比率，避免二次取整差 1 元）。後端上限金額 backEndLimit = round-half-up(annualIncome × backEndCapPct / 1200) − otherDebts（先取整再扣債務；可為負數，負數表示其他債務已超過後端上限）。
2. 最高月付 maxMonthlyPayment = max(0, min(frontEndLimit, backEndLimit))。bindingCap：frontEndLimit < backEndLimit 時 "front"，backEndLimit < frontEndLimit 時 "back"，相等時 "equal"（即使最高月付為 0 也照此判定）。
3. 期數 n = years × 12 個月。月利率 i = mortgageRate / 1200（精確有理數；mortgageRate 以百分比計）。
4. 最高貸款 maxLoanAmount：maxMonthlyPayment = 0 時為 0；i = 0 時為 maxMonthlyPayment × n；否則為 floor(maxMonthlyPayment × (1 − (1+i)^(−n)) / i)，向下取整（保守取整：貸款絕不超過上限月付所能支撐的金額）。最高房價 maxHomePrice = maxLoanAmount + downPayment。
5. affordable = maxMonthlyPayment > 0。affordable 為 false 時 maxLoanAmount 為 0、maxHomePrice 等於 downPayment（僅能全現金購屋，貸款額度為零），結果仍為成功，不作錯誤。
6. 最高月付時的比率（皆為 1 位小數的百分比數字，half-up）：frontEndPctAtMax = round-half-up-1dp(maxMonthlyPayment / monthlyGrossIncome × 100)；backEndPctAtMax = round-half-up-1dp((maxMonthlyPayment + otherDebts) / monthlyGrossIncome × 100)。分母一律用已取整的 monthlyGrossIncome。

結果 `{monthlyGrossIncome,frontEndLimit,backEndLimit,maxMonthlyPayment,bindingCap,maxLoanAmount,maxHomePrice,frontEndPctAtMax,backEndPctAtMax,affordable}`，金額皆為整數元（backEndLimit 可為負）；bindingCap 為 "front"、"back" 或 "equal"；frontEndPctAtMax 與 backEndPctAtMax 為 1 位小數的百分比數字；affordable 為布林值。結果不含逐月表。

固定下載 `home-affordability-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

錯誤訊息（雙語，{label} 為欄位雙語標籤，{raw} 為原輸入）：INPUT_LIMIT「{label}輸入過長。 / {label} input is too long.」；EMPTY「請輸入{label}。 / Enter {label}.」；INTEGER_FORMAT「{label}須為整數，你輸入的是「{raw}」。 / {label} must be an integer; you entered “{raw}”.」；DECIMAL_FORMAT「{label}格式不正確，你輸入的是「{raw}」。 / {label} has an invalid format; you entered “{raw}”.」；RANGE「{label}須介於 {min} 至 {max} 之間，你輸入的是「{raw}」。 / {label} must be between {min} and {max}; you entered “{raw}”.」；CAP_ORDER「後端上限不可低於前端上限，你輸入的前端上限是 {front}%，後端上限是 {back}%。 / The back-end cap must not be lower than the front-end cap; you entered a front-end cap of {front}% and a back-end cap of {back}%.」。

試算聲明（雙語，結果區上方固定顯示，不得刪改）：「本工具僅依你輸入的假設與 28/36 負擔比率試算；月付只計房貸本金加利息，不含稅金、保險、管理費與房貸成數限制，不是財務建議、銀行報價或核貸保證。」/ "This tool estimates only from the assumptions you enter and the 28/36 debt-to-income guideline. The monthly payment counts mortgage principal and interest only, excluding taxes, insurance, management fees and loan-to-value limits, and is not financial advice, a bank quotation or a loan approval guarantee."

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/home-affordability-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- 核心算術必須與整數元規則逐位一致：前端／後端上限金額用精確有理數（整數先乘後除）再一次 half-up 取整，不得以先取整的月收入乘比率（二次取整會差 1 元，例如年收入 1,000,006 元時精確前端上限為 23,333 元，先取整月收入 83,334 元再乘 28% 會得 23,334 元）。最高貸款的年金反推因子可用高精度十進位，但結果必須與 fixtures 的整數最高貸款一致；向下取整後，以年金公式（half-up 取整）重算該貸款的月付，恆不得超過 maxMonthlyPayment（見 AUTHOR-CHECK.md 的不變式核對，10 筆有效案例皆恰等於最高月付）。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算購屋能力」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；最高月付、綁定的上限、最高貸款與最高房價一致。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；零利率、零頭期款、一年期、高利率、債務超過後端上限、上下限相等、自訂上限的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；綁定的上限以文字及符號標示。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。15 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `typical-taipei` | 典型情境，前端上限綁定，最高房價 9,575,358 元 |
| `debts-bind-back-end` | 其他債務 15,000 元，後端上限綁定，最高月付 21,000 元 |
| `zero-rate` | 零利率，最高貸款為月付乘以期數（全手算） |
| `one-year-term` | 一年期，12 期年金反推 |
| `high-rate` | 利率 8%，最高房價降至 5,815,937 元 |
| `zero-down-payment` | 零頭期款，最高房價等於最高貸款 |
| `debts-exceed-back-cap` | 其他債務超過後端上限，無貸款額度，affordable 為 false |
| `equal-caps` | 前後端上限相等，bindingCap 為 equal |
| `custom-caps` | 自訂上限 25/40，利率 3%、20 年 |
| `income-not-divisible` | 年收入 1,000,000 元，月收入非整數，取整邊界 |
| `cap-order-error` | 後端上限低於前端上限，CAP_ORDER |
| `rate-out-of-range` | 房貸利率 31%，RANGE |
| `income-zero` | 年收入 0，RANGE |
| `too-many-decimals` | 前端上限 3 位小數，DECIMAL_FORMAT |
| `negative-debts` | 其他債務為負數，INTEGER_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 years=1/40/41、mortgageRate=30/30.0001、frontEndCapPct=10/50、backEndCapPct=20/60、backEndCapPct 等於 frontEndCapPct、backEndCapPct 比 frontEndCapPct 少 0.01、otherDebts 恰使 backEndLimit 為 0、最高貸款向下取整後重算月付不超過最高月付、利率上升時最高房價不上升、頭期款增加時最高房價等額增加。所有已接受的結果皆滿足 maxHomePrice = maxLoanAmount + downPayment；affordable 為 false 時 maxLoanAmount 恆為 0。

候選 gate（均 NOT_RUN）

- 於 `tools/home-affordability-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「購屋能力試算」，title「購屋能力試算｜Gloss Tools」，description「輸入年收入、頭期款、房貸利率、年期與其他債務，依 28/36 負擔比率算出最高房價與最高月付。」。英文 lang=en，H1 “Home Affordability Calculator”，title “Home Affordability Calculator | Gloss Tools”，description “Enter annual income, down payment, mortgage rate, term and other debts to find your maximum home price and monthly payment under the 28/36 debt-to-income guideline.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。28/36 是銀行的硬性上限嗎？不是。28/36 是傳統經驗法則：住房支出不超過稅前月收入 28%，全部債務不超過 36%。美國 CFPB 說不同貸款產品與銀行的 DTI 上限各不相同；舊的 43% 合格房貸上限已改為價格制。本工具以 28/36 為預設，你可以在範圍內調整。 / Is 28/36 a hard bank limit? No. It is a traditional guideline: housing costs at or below 28% of gross monthly income, and all debts at or below 36%. The US CFPB says different loan products and lenders set different DTI limits, and the old 43% Qualified Mortgage cap was replaced with a price-based standard. This tool uses 28/36 as the default, and you can adjust it within the allowed range.
- FAQ。為什麼最高房價只算本金加利息？因為稅金、保險、管理費因地而異、無法由收入反推；本工具的月付只計房貸本金加利息，試算聲明已明載，實際每月支出會更高。 / Why does the maximum price only count principal and interest? Taxes, insurance and management fees vary by location and cannot be derived from income, so this tool's monthly payment counts mortgage principal and interest only, as the disclaimer states; your actual monthly cost will be higher.
- FAQ。其他債務太多、算出來沒有貸款額度，代表什麼？代表在你設定的後端上限下，其他債務已經吃掉全部額度；最高房價等於頭期款，只能全現金購屋，或先降低其他債務、再調高上限假設重算。 / What does it mean when other debts leave no loan room? Under your back-end cap, your other debts already use up the whole allowance, so the maximum home price equals your down payment: a cash-only purchase, unless you lower other debts or raise the cap assumption and recalculate.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://home-affordability-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/home-affordability-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
