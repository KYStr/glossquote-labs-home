# 匯率換算 / Currency Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-currency-converter-20261109` · 2026-11-11 · v2 maintenance candidate

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者想用銀行或匯兌服務商提供的匯率，在兩種幣別之間核對一筆金額。匯率欄初載留空，使用者填入自己的匯率後可正向乘、反向除，並查看反向匯率與快速對照表。想練習時可主動載入清楚標示的合成範例。

- 旅遊與網購。手機輸入住宿或商品價格與銀行查到的匯率，當場換算成本國幣別金額，再反向確認預算夠不夠。
- 匯款與收款。桌面輸入匯款金額與服務商報價，正反兩向核對對方收到的金額，並下載報告留存比價。

使用情境為單一匯率、兩種幣別、單筆金額。資料只保留在目前頁面草稿。

## scope

MVP：一個手填或主動載入的合成範例匯率、兩枚自由幣別代碼、一個金額、兩個換算方向（來源→目標乘匯率，目標→來源除匯率），加上由同一匯率精確推導的反向匯率顯示與 1／10／100／1000 快速對照表。全程精確有理數運算，只在釘版位置捨入。

非目標（明確排除）：取得、顯示或暗示任何即時／市場匯率（不連線、不內建匯率表、不預填「今日匯率」）；多幣別籃子或連鎖換算；歷史匯率與走勢；手續費、買賣價差或匯款成本建模；幣別代碼對照 ISO 4217 清單驗證（理由見 inputsOutputs）；幣別符號與在地化金額格式（不加千分位、不加貨幣符號）。

與既有及同批預案比對，最相近者的實質差異如下。

- 舊作 unit-converter 是即時通用單位換算，五類皆為物理量（長度、面積、質量、容量、溫度），單位集合固定、沒有任何幣別或匯率概念。此處是貨幣換算，匯率由使用者輸入、方向語義與反向匯率是核心。（sources/legacy/unit-converter）
- 加價率與毛利率換算處理成本／售價的百分比恆等式，明確不綁幣別、沒有匯率。（markup-margin-calculator，本批 run 5 規格）
- 含稅未稅換算是單一幣別內 5% 稅率的內外換算，不跨幣別。（tax-included-converter，本批 run 5 規格）
- 料理單位換算的密度表是體積↔重量，與匯率無關。（cooking-measurement-converter，本批 run 5 規格）

判定規則由本文定義。匯率方向慣例釘版為「rate ＝ 每 1 單位來源幣別可換得的目標幣別數量」，在欄位標籤與方向句中逐字呈現，不依賴任何外部匯率來源。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「來源幣別代碼 / From currency code」與「目標幣別代碼 / To currency code」：自由文字欄，輸入 3 個英文字母（大小寫不拘，見 inputsOutputs）。
- 欄位或說明「匯率（每 1 單位來源幣別可換得的目標幣別數量）/ Rate (units of the to currency per 1 unit of the from currency)」：方向慣例逐字寫在標籤上，不只放在說明文字裡。
- 欄位或說明「金額 / Amount」。
- 選項組「換算方向 / Direction」：兩個選項「來源 → 目標（金額是來源幣別）/ From → To (the amount is in the from currency)」與「目標 → 來源（金額是目標幣別）/ To → From (the amount is in the to currency)」。
- 輸入區及成功結果旁常駐同一段雙語免責聲明，逐字見 tests 的兩語靜態內容。
- 「換算 / Convert」是主要操作。只有「載入範例 / Load example」會填入 [fixtures.json](fixtures.json) 的合成案例 `default-forward`（31.5），並等待使用者按換算。
- 匯率欄旁依目前來源顯示「請輸入匯率 / Enter an exchange rate」（`null`）、「手填匯率 / Manually entered rate」（`manual`）或「合成範例匯率 / Synthetic example rate」（`example`）。成功結果旁重複顯示該次換算的來源文字。用可讀文字及適當狀態語義，維持來源標籤在兩語畫面可見。
- 結果先顯示換算句：「{amount} {amountCode} = {converted} {convertedCode}」，其中 amountCode／convertedCode 依方向決定（a-to-b 時 amountCode＝fromCode、convertedCode＝toCode；b-to-a 時相反），金額皆為固定兩位小數。再列方向句兩行：「1 {fromCode} = {rateDisplay} {toCode}」與「1 {toCode} = {inverseRate} {fromCode}」，第二行前置標籤「反向匯率 / Inverse rate」。最後是「快速對照 / Quick table」：固定四列（來源幣別 1、10、100、1000 單位 → 目標幣別金額），永遠是來源→目標方向，與所選換算方向無關。結果旁再次顯示上述免責聲明（與輸入區同一段逐字文字）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，匯率空白且來源為 null，無結果或下載，提示輸入匯率或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變（含切換方向、改代碼），立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 換算句、方向句、反向匯率、快速對照表與免責聲明齊全。表單、結果及報告使用同一次換算的匯率來源。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

初載、重設與 bfcache 恢復時使用相同草稿 `{"fromCode":"USD","toCode":"TWD","rate":"","amount":"100","direction":"a-to-b"}`。按「重設 / Reset」會停止工作、清除匯率來源與產物，並聚焦來源幣別代碼欄。預設草稿直接提交會得到 `EMPTY/rate`。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `fromCode`、`toCode`：幣別代碼字串，raw 每欄最多 8 單元。文法：恰 3 個 ASCII 英文字母（A–Z 或 a–z）；通過後正規化為全大寫，正規化只做 ASCII 大小寫轉換。**不對照 ISO 4217 清單驗證**：清單會增刪改（新幣別、改碼、歷史幣別），用過期清單驗證會誤拒使用者手上合法的代碼；工具對代碼不賦予任何語義，任意 3 字母組合（含來源與目標相同）皆合法。格式不符為 CODE_FORMAT。
- `rate`：匯率字串，全 ASCII，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$`（小數最多 6 位），raw 最多 14 單元。值域：rateMicro（匯率×10^6 的整數）為 1–1,000,000,000,000，即匯率 >0 且 ≤1,000,000；0 為 RANGE（文法合法、不在值域）。
- `amount`：金額字串，全 ASCII，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`（小數最多 2 位），raw 最多 12 單元。值域：amountCents（金額×100 的整數）為 0–999,999,999，即金額 0–9,999,999.99；金額 0 合法（換算結果 0，對照表照常產生）。
- `direction`：列舉字串，恰為 `a-to-b` 或 `b-to-a`，raw 最多 8 單元，非列舉值為 ENUM。
- 合成範例 `default-forward` 的輸入為 `{"fromCode":"USD","toCode":"TWD","rate":"31.5","amount":"100","direction":"a-to-b"}`。
- Controller 草稿另持有 `rateSource`。初載或重設為 `null`，載入範例為 `"example"`。使用者編輯匯率後，有值為 `"manual"`、清空為 `null`，即使手填 31.5 也標為手填。修改其他欄位或取消會保留目前來源。來源由操作決定，無須依匯率數字推測。純核心的輸入、輸出與錯誤 schema 均維持原契約。

驗證與計算順序如下，整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 先驗整體形狀（SCHEMA，field=null）：鍵集合恰為 {fromCode, toCode, rate, amount, direction}，五欄皆為字串；未知、缺欄、錯型別、accessor 皆 SCHEMA。
2. 依欄位順序 fromCode → toCode → rate → amount → direction 逐欄驗證，每欄順序固定：容量 INPUT_LIMIT（UTF-16 單元數超過上限）、不成對 surrogate UNICODE、缺內容 EMPTY（空字串）、格式（CODE_FORMAT／DECIMAL_FORMAT／ENUM）、值域 RANGE（僅 rate、amount 有值域）。
3. 精確解析，不經浮點：rateMicro ＝ 整數部×10^6 ＋ 小數部（不足 6 位右補 0）；amountCents ＝ 整數部×100 ＋ 小數部（不足 2 位右補 0）。全程 BigInt。
4. 捨入函式釘版：roundHalfUpDiv(n, d)（n ≥ 0、d > 0）以整數除法取商 q 與餘數 r，2r ≥ d 時取 q+1，否則取 q（恰一半進位）。本工具所有量皆非負，無負值捨入分支。
5. 換算：direction＝`a-to-b` 時 convertedCents ＝ roundHalfUpDiv(amountCents × rateMicro, 10^6)（即 amount × rate）。direction＝`b-to-a` 時 convertedCents ＝ roundHalfUpDiv(amountCents × 10^6, rateMicro)（即 amount ÷ rate）。**反向換算以輸入匯率精確相除**。`reverse-display-rounding-regression` 用 30000 ÷ 3 釘版，正確結果為 1000000 分。若誤用六位有效數字的顯示值 0.333333 回乘，會得到 999999 分。`reverse-repeating` 保留循環小數捨入的 317 分案例，該組輸入用兩種算法均得到 317 分。
6. 快速對照表 quickTable：來源幣別金額階梯固定 [1, 10, 100, 1000] 單位，即 amountCents [100, 1000, 10000, 100000]；每列 convertedCents ＝ roundHalfUpDiv(該列 amountCents × rateMicro, 10^6)，**每列各自從精確乘積獨立捨入，不由其他列倍增推得**（案例 `small-rate-inverse`：匯率 0.0066 時 1 單位列為 0.66 分 → 1 分、10 單位列為 6.6 分 → 7 分，不互為 10 倍）。對照表永遠是來源→目標，與 direction 無關。
7. 反向匯率 inverseRate（字串，僅供顯示）：精確值為有理數 10^6 / rateMicro，取 **6 位有效數字**（不是小數 6 位：小匯率如 0.0066 的反向值 151.515… 與大匯率如 1000000 的反向值 0.000001 都需要有效數字規則才有意義）。釘版算法：(a) 找整數 p 使 10^p ≤ inv < 10^(p+1)（只用整數／有理數比較，不用浮點 log）；(b) m ＝ roundHalfUp(inv × 10^(5−p))，為 6 位整數；若 m ＝ 1000000（進位溢出），改 m ＝ 100000、p ＝ p+1；(c) 以 m 的 6 位數字與小數點位置 p 寫成十進字串，去除小數尾隨 0 與孤立小數點。例：rate 31.5 → "0.031746"；rate 0.0066 → "151.515"；rate 2.5 → "0.4"；rate 1 → "1"；rate 0.000001 → "1000000"；rate 1000000 → "0.000001"。
8. 結果 {fromCode, toCode, direction, amountCents, rateMicro, convertedCents, inverseRate, quickTable}，代碼為正規化後的大寫。結果整數皆為安全整數：convertedCents 上限出現在正向（999,999,999 分 × 1,000,000 ＝ 999,999,999,000,000）與反向（999,999,999 × 10^6 ÷ 1 ＝ 同值），皆 < 2^53；對照表最大 100,000 × 10^12 ÷ 10^6 ＝ 10^11。
9. 顯示格式：金額由 cents 以「整數部.兩位小數」呈現（315000 → "3150.00"），不加千分位、不加幣別符號（代碼以文字相鄰呈現）。rateDisplay 由 rateMicro 呈現：整數部＋小數部去除尾隨 0（31,500,000 → "31.5"；6,600 → "0.0066"；1,000,000 → "1"）。機器值不隨 locale 改。

固定下載 `currency-converter-report.json`。報告物件恰有八個核心 result 欄位及 controller 在成功時加入的 `rateSource`。該欄限 `"manual"` 或 `"example"`，取自被接受的該次工作快照。序列化為 compact JSON，object own keys 按 UTF-16 code units 升序遞迴排列（`rateSource` 排在 `rateMicro` 後、`toCode` 前），array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。錯誤不產生下載。

本地化錯誤訊息（核心只回 code/field，頁面依下表顯示）：SCHEMA「輸入格式不正確 / The input is malformed.」；INPUT_LIMIT「輸入太長 / Input is too long.」；UNICODE「輸入含有不完整的字元 / Input contains an incomplete character.」；EMPTY「必填 / This field is required.」；CODE_FORMAT「幣別代碼須為恰好 3 個英文字母 / A currency code must be exactly 3 letters.」；DECIMAL_FORMAT「請輸入有效的數字 / Enter a valid number.」；ENUM「請選擇換算方向 / Choose a conversion direction.」；RANGE（rate）「匯率須大於 0 且不超過 1000000 / The rate must be greater than 0 and at most 1000000.」；RANGE（amount）「金額須不超過 9999999.99 / The amount must be at most 9999999.99.」。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/currency-converter/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Controller 依工作世代記錄五欄草稿與 `rateSource` 的快照。Worker 只收五欄純核心輸入與世代號，回傳純核心結果或錯誤。Controller 只接受目前世代且 busy 的結果，成功後從該世代的快照取得來源，供結果標示與下載。取消、編輯、載入範例、重設、替換或 pagehide 會使舊世代失效，terminate 並釋放結果及 URL。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。**禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker；特別是任何向匯率服務發出的請求都屬缺陷，不只是隱私問題而是功能違規。**工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 正反兩向的換算句、方向句、反向匯率、快速對照表符合核心 fixtures。手填與合成範例各自核對表單、成功結果與完整下載報告的來源一致。 |
| boundaries | 合法端點（匯率 0.000001 與 1000000、金額 0 與 9999999.99）、剛好越界、第一個錯誤、欄位順序與全部 controller cases，含初載／重設空匯率、來源切換及晚到訊息。 |
| privacy | 靜態載入後從使用到重設的零工作請求（特別核對沒有任何匯率 API 或第三方請求），並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；方向慣例在標籤上可見。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含免責聲明逐字）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。22 個字面核心案例與 4 個 controller 案例。對每個 expected 深度比對，兩種報告來源用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `default-forward` | 主動載入的合成範例輸入，核心核對正向乘匯率、反向匯率 6 位有效數字、快速對照表 |
| `reverse-exact` | 反向除匯率恰好整除；對照表與方向無關 |
| `reverse-repeating` | 循環小數換算至 317 分，兩種算法在此輸入的分值相同 |
| `reverse-display-rounding-regression` | 30000 ÷ 3 的正確分值為 1000000，使用顯示逆率 0.333333 回乘則為 999999 |
| `small-rate-inverse` | 匯率 0.0066：反向 151.515（有效數字非小數位）；對照表每列獨立捨入 |
| `half-up-tie` | 恰半分平局 half-up 進位（與銀行家捨入分歧點） |
| `lowercase-codes` | 小寫代碼正規化為大寫 |
| `zero-amount` | 金額 0 合法，對照表與反向匯率照常 |
| `yen-rate` | 149.85 乘積 .75 進位；反向 0.00667334 |
| `min-rate-tie` | 最小匯率 0.000001：主換算恰 0.5 分進位、對照表全 0、反向為整數 1000000 |
| `rate-cap-boundary` | 匯率上限 1000000 含邊界合法；反向 0.000001 |
| `same-codes` | 來源與目標同碼合法，匯率 1 恆等 |
| `rate-zero` | 匯率 0 為 RANGE（文法合法、值域外） |
| `rate-too-precise` | 匯率小數 7 位 DECIMAL_FORMAT |
| `rate-over-cap` | 匯率 1000000.000001 在容量內、文法通過、值域 RANGE |
| `amount-format` | 金額小數 3 位 DECIMAL_FORMAT |
| `amount-over-limit` | 金額 13 單元 INPUT_LIMIT，先於文法與範圍 |
| `amount-over-range` | 金額 99999999.99 在容量內、文法通過、值域 RANGE |
| `code-format` | 代碼 4 字母 CODE_FORMAT |
| `code-empty` | 目標代碼空白 EMPTY |
| `direction-enum` | 方向非列舉值 ENUM |
| `schema-extra-field` | 未知鍵（刻意命名 live）→ SCHEMA，先於逐欄驗證 |
| `state-dirty-error` | 先產出真結果，再把匯率改為 0，舊結果及所有下載立即失效，重跑得 RANGE。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。`state-dirty-error`、`state-cancel-late`、`state-replace-late` 的非空草稿匯率均以手填方式設定。`state-dirty-error` 先 run initial，再 edit 成 edit 並重新執行。`state-cancel-late` 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。`state-replace-late` 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。

`state-rate-source` 依 `input.steps` 的陣列次序執行。每步的 `at` 對應一個 expected checkpoint。`initial` 觀察初載，`loadExample` 使用 `default-forward` 的 input，`edit` 編輯指定欄位，`start` 以 `job` 命名並掛起工作，`finish` 以指定 job 的原快照產生核心回覆，`reset` 執行重設。每個 checkpoint 核對表單來源、結果來源和下載可用性，並按 expected 中所列欄位核對 draft、error 或報告 bytes 與 SHA-256。此案例含空匯率提交、非匯率欄位編輯、同值手填、清空、重設，以及編輯或重設之後的舊範例成功回覆。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 rateMicro 1 與 10^12、amountCents 0 與 999,999,999、反向匯率進位溢出（m＝1000000 改記 100000 並 p+1 的輸入，例如 inv 恰在 999999.5×10^k 附近）、對照表每列不由鄰列倍增、反向換算不用顯示反向匯率回算。

候選 gate（均 NOT_RUN）

- 於 `tools/currency-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁檢查初載空匯率、顯式範例、實際手填、來源標籤、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「匯率換算」，title「匯率換算｜Gloss Tools」，description「用你自己輸入的匯率，把金額在兩種幣別之間雙向換算，附反向匯率與 1、10、100、1000 快速對照表。本工具不提供即時匯率。」。英文 lang=en，H1 “Currency Converter”，title “Currency Converter | Gloss Tools”，description “Convert an amount between two currencies in both directions using a rate you enter, with the inverse rate and a 1 / 10 / 100 / 1000 quick table. This tool does not provide live rates.”。兩頁靜態呈現操作、限制、FAQ 與免責聲明。全部狀態及錯誤使用對等本地化訊息。
- 免責聲明（兩語頁面逐字常駐）：「請輸入你要使用的匯率。本工具不會取得或提供即時匯率。載入範例會填入供練習的合成匯率。實際交易的匯率與費用，請向你的銀行或匯兌服務商確認。」/ “Enter the rate you want to use. This tool does not fetch or provide live exchange rates. Load example fills in a synthetic rate for practice. Check with your bank or exchange provider for the actual rate and fees.”
- FAQ。匯率從哪裡來？匯率欄一開始是空白。請輸入你的匯率，或按「載入範例」填入有標示的合成匯率。本工具不連線到匯率服務。 / Where does the rate come from? The rate field starts blank. Enter your rate or select “Load example” to fill it with a labeled synthetic rate. This tool does not connect to a rate service.
- FAQ。反方向怎麼算？直接除以匯率欄中的值，最後才把換算金額捨入。反向匯率只取 6 位有效數字供顯示。 / How is the reverse conversion calculated? It divides by the value in the rate field and rounds the converted amount at the end. The inverse rate is rounded to 6 significant digits for display.
- FAQ。幣別代碼可以打任何 3 個英文字母嗎？可以。代碼不對照 ISO 4217 清單驗證，因為清單會變動，過期清單反而會誤拒合法代碼；工具對代碼不賦予語義，來源與目標相同也合法。 / Can I enter any 3 letters as a currency code? Yes. Codes are not checked against the ISO 4217 list, because the list changes and a stale list would wrongly reject valid codes; the tool assigns no meaning to a code, and using the same code on both sides is allowed.
- FAQ。換算結果會和銀行實際扣款一樣嗎？不一定。實際交易還有手續費與買入／賣出價差；請把你在銀行或服務商實際面對的匯率輸入，再用結果核對。 / Will the result match what my bank actually charges? Not necessarily. Real transactions add fees and a buy/sell spread; enter the rate your bank or provider actually offers you and use the result to check it.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://currency-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

本文件維護候選由獨立 reviewer 核對三項維護面向。原 [PR #258](https://github.com/KYStr/glossquote-labs-home/pull/258) 及原作者的 task、claim、候選皆保留。後續依共用規則處理正式規格登記與八節獨評，產品九面向仍待產品交驗。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/currency-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
