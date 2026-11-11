# 加價率與毛利率換算 / Markup & Margin Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-markup-margin-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

定價時要分清楚兩個長得像、其實不同的百分比：加價率是利潤除以成本，毛利率是利潤除以售價。同樣賺 20 元，成本 80 元時加價率 25.00%、毛利率只有 20.00%；把兩者搞混，售價就會定錯。使用者給成本與售價，要同時看到兩個率；反過來給目標加價率或目標毛利率，要算回必須定的售價。

- 攤位與小店。手機輸入成本與預定售價，當場確認這筆生意的加價率與毛利率，再決定要不要照這個價賣。
- 出貨前定價。桌面輸入成本與目標毛利率，反推售價，並看到該售價對應的加價率與每單位利潤，下載報告留存。

使用情境為單一商品的定價與檢核。資料只保留在目前頁面草稿。

## scope

三種求解模式：`report`（成本＋售價 → 利潤、加價率、毛利率）、`solve-markup`（成本＋目標加價率 → 售價、利潤、毛利率）、`solve-margin`（成本＋目標毛利率 → 售價、利潤、加價率）。金額與百分比全程精確有理數運算，只在釘版位置捨入。非目標為多商品批次、含稅／未稅換算、損益平衡數量、折扣後價格、币別、價格歷史或儲存。

與既有及同批預案比對，最相近者的實質差異如下。

- 單一金額的百分比或折扣運算，沒有成本／售價雙率恆等式，也沒有由目標率反解售價。（discount-calculator、percentage-calculator，本批 run 4 規格）
- 以固定成本與單位變動成本求損益平衡數量與營收，輸入沒有目標毛利率、輸出不是售價。（breakeven-calculator，本批 run 5 規格）
- 通用分數與有理數運算工具，不處理定價語義、金額文法與無解狀態。（rational-arithmetic）
- 烘焙百分比以麵粉重量為基準的配方比例，與定價無關。（bakers-percentage-calculator）

判定規則由本文定義，金額不綁幣別；無線上資料或外部服務依賴。加價率與毛利率的定義為通行會計恆等式，非外部費率表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式選項組「計算方式 / Mode」：三個選項「由成本與售價算兩率 / Both rates from cost and price」、「由加價率求售價 / Price from target markup」、「由毛利率求售價 / Price from target margin」。切換模式立即把不屬於新模式的欄位設為 null（畫面清空並停用），草稿進入 dirty。
- 欄位或說明「成本 / Cost」；`report` 模式加欄位「售價 / Selling price」；`solve-markup` 模式加欄位「目標加價率（%）/ Target markup (%)」；`solve-margin` 模式加欄位「目標毛利率（%）/ Target margin (%)」。
- 「計算 / Calculate」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果標題：`report` 為「加價率與毛利率 / Markup and margin」；求解模式為「建議售價與換算 / Selling price and conversion」。先摘要（售價模式先顯示售價）再列細節：單位利潤、加價率、毛利率，百分比格式固定為整數部、點、兩位小數加 `%`。求解模式的另一率標示「由四捨五入後售價回算 / Derived from the rounded price」。`report` 且售價低於成本時，另以文字標示「售價低於成本，兩率為負值 / The price is below cost; both rates are negative.」；毛利率無法定義時以「毛利率無法定義（售價為零）/ Margin is undefined (the price is zero).」取代數字。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 靜態對照表「毛利率 ↔ 加價率對照 / Margin ↔ markup reference」在兩語頁面常駐（非計算結果）：毛利率 0%、10%、20%、25%、30%、40%、50%、60%、70%、75%、80%、90%、95% 對應加價率 0.00%、11.11%、25.00%、33.33%、42.86%、66.67%、100.00%、150.00%、233.33%、300.00%、400.00%、900.00%、1900.00%，由恆等式 加價率 ＝ 毛利率 ÷（100 − 毛利率）逐列推導、顯示至小數兩位。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變（含切換模式），立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。低於成本與毛利率無法定義以文字標示，不只靠顏色或正負號。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。NO_SOLUTION 顯示「目標毛利率達到或超過 100% 時，沒有有限售價能達成 / No finite price achieves a margin of 100% or more.」。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"report","cost":"80.00","price":"100.00","markupPercent":null,"marginPercent":null}` 並聚焦成本欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。JSON fixture 即介面。

- `mode`：列舉字串，恰為 `report`、`solve-markup` 或 `solve-margin`，raw 最多 12 單元。
- `cost`：金額字串，全 ASCII，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`，raw 最多 10 單元，值 0.01–999999.99（即分 1–99,999,999；成本為零無法定義加價率，值 0 為 RANGE）。
- `price`：金額字串或 null，同文法，raw 最多 10 單元，值 0–999999.99（分 0–99,999,999）。
- `markupPercent`、`marginPercent`：百分比字串或 null，全 ASCII，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$`，raw 最多 9 單元，值 0–99999.999（即千分之一百分比 0–99,999,999）。
- 模式與欄位對應：`report` 使用 price，兩個百分比欄必須為 null；`solve-markup` 使用 markupPercent，其餘兩欄必須為 null；`solve-margin` 使用 marginPercent，其餘兩欄必須為 null。
- 預設即範例：`{"mode":"report","cost":"80.00","price":"100.00","markupPercent":null,"marginPercent":null}`（與 fixtures 第一個案例相同）。

驗證與計算順序如下，整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 先驗整體形狀（SCHEMA，field=null）：鍵集合恰為 {mode, cost, price, markupPercent, marginPercent}，mode 與 cost 為字串，其餘三欄為字串或 null；未知、缺欄、錯型別、accessor 皆 SCHEMA。
2. 再驗 mode：容量 INPUT_LIMIT、不成對 surrogate UNICODE、缺內容 EMPTY、非列舉值 ENUM，field=mode。
3. 再驗模式一致性：依 mode 檢查三個可空欄位的 null 型態符合上表；不符為 SCHEMA，field=null。
4. 再驗 cost：容量 INPUT_LIMIT、UNICODE、EMPTY、文法 DECIMAL_FORMAT、範圍 RANGE（分 1–99,999,999），field=cost。
5. 再驗本模式的使用欄位（price 或 markupPercent 或 marginPercent）：容量（金額 10 單元、百分比 9 單元）INPUT_LIMIT、UNICODE、EMPTY、文法 DECIMAL_FORMAT、值範圍 RANGE（price 分 0–99,999,999；百分比千分之一值 0–99,999,999），field 即該欄名。
6. `solve-margin` 語意檢查：marginPercent 千分之一值 ≥ 100,000（即 ≥100%）時回 NO_SOLUTION，field=marginPercent。這不是 RANGE：字串文法與值域都合法，是方程式 price ＝ cost ÷（1 − 毛利率）在毛利率 ≥100% 時沒有有限解。與第 5 步 RANGE 的區別已在 tests 釘版案例。
7. 精確解析，不經浮點：金額 cents ＝ 整數部×100 ＋ 小數部（不足兩位右補 0）；百分比 milli ＝ 整數部×1000 ＋ 小數部（不足三位右補 0），即百分比×1000 的整數（25% → 25000，33.333% → 33333）。全程用 BigInt。
8. 捨入函式釘版：roundHalfUpDiv(n, d)（n ≥ 0、d > 0）以整數除法取商 q 與餘數 r，2r ≥ d 時取 q+1，否則取 q。roundRatio(n, d)（d > 0、n 可正可負）於 n＝0 時為 0，否則為 sign(n) × roundHalfUpDiv(|n|, d)，恰為一半時遠離零進位。百分比結果單位為百分之一百分比（hundredths：25.00% → 2500），顯示至小數兩位即此單位。
9. `report`：profitCents ＝ priceCents − costCents（可為負）。markupHundredths ＝ roundRatio(profitCents × 10000, costCents)。marginHundredths ＝ priceCents 為 0 時 null，否則 roundRatio(profitCents × 10000, priceCents)。belowCost ＝ profitCents ＜ 0。售價低於成本是合法報表結果，照常回傳負利潤與負百分比，不回錯誤。結果 {mode, costCents, priceCents, profitCents, markupHundredths, marginHundredths, belowCost}。
10. `solve-markup`：priceCents ＝ roundHalfUpDiv(costCents × (100000 ＋ markupMilli), 100000)，只捨入這一次；priceCents ＞ 99,999,999 時回 RANGE，field=markupPercent（與第 5 步同 code 同 field，結果不變）。profitCents ＝ priceCents − costCents ≥ 0。marginHundredths ＝ roundRatio(profitCents × 10000, priceCents)，由四捨五入後的售價回算，不承諾等於任何目標值。結果 {mode, costCents, markupPercentMilli, priceCents, profitCents, marginHundredths}。
11. `solve-margin`：priceCents ＝ roundHalfUpDiv(costCents × 100000, 100000 − marginMilli)，只捨入這一次；priceCents ＞ 99,999,999 時回 RANGE，field=marginPercent。profitCents ＝ priceCents − costCents ≥ 0。markupHundredths ＝ roundRatio(profitCents × 10000, costCents)，由四捨五入後的售價回算。結果 {mode, costCents, marginPercentMilli, priceCents, profitCents, markupHundredths}。
12. 結果整數皆為安全整數：金額 ≤ 99,999,999 分；百分比 hundredths 的絕對值上限出現在 report 的極端比例（成本 1 分、售價 99,999,999 分 → 999,999,980,000），仍遠小於 2^53。畫面金額以「整數部.兩位小數」呈現、負數冠負號，百分比同法再加 `%`；不加千分位、不加幣別符號（單位即輸入原幣別）；機器值不隨 locale 改。注意 report 的毛利率精確值恆小於 100%（成本為正時），但極端比例下顯示捨入後可呈現 100.00%，案例 `report-extreme-ratio` 釘版此行為，頁面 FAQ 亦揭露。

固定下載 `markup-margin-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。錯誤（含 NO_SOLUTION）不產生下載。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/markup-margin-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 金額（分）與百分比（千分之一）在核心內只以 BigInt 整數運算；禁止浮點參與價格求解與兩率計算，禁止以浮點百分比中轉。核心不讀 Date、locale 或主機時區，同一輸入在任何環境得同一結果。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算」，三種模式的畫面和完整報告符合核心 fixtures，含低於成本與無解狀態。 |
| boundaries | 合法端點、剛好越界、NO_SOLUTION 與 RANGE 的區別、第一個錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的三模式主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。32 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `report-basic` | 基本雙率：加價 25.00%、毛利 20.00% |
| `report-repeating-markup` | 加價率循環小數 33.333…% 捨入至 33.33 |
| `report-repeating-margin` | 毛利率循環小數 22.222…% 捨入至 22.22 |
| `report-below-cost` | 售價低於成本，負利潤與負百分比照常報表，負值捨入遠離零 |
| `report-free-price` | 售價為零，毛利率 null（無法定義），加價率 −100.00% |
| `report-zero-profit` | 售價等於成本，利潤與兩率皆零 |
| `report-half-tie` | 加價率恰 2.5（百分之一單位）遠離零進位、同案毛利率捨去 |
| `report-extreme-ratio` | 成本 1 分對最大售價，加價率大整數精確、毛利率顯示捨入為 100.00 |
| `solve-markup-basic` | 加價率 25% 反推售價 100.00 與毛利率 20.00% |
| `solve-markup-repeating` | 加價率 33.333% 反推售價捨入至分、毛利率由售價回算 |
| `solve-markup-zero` | 加價率 0%，售價等於成本 |
| `solve-markup-tie` | 售價恰半分進位（2.5 分 → 3 分） |
| `solve-markup-large` | 大金額加價率 7.5%，售價小數 .85 進位與毛利率回算 |
| `solve-margin-basic` | 毛利率 20% 反推售價 100.00 與加價率 25.00% |
| `solve-margin-half` | 毛利率 50% ↔ 加價率 100.00% |
| `solve-margin-repeating` | 毛利率 33.333% 反推售價 1500 分、加價率由售價回算 |
| `solve-margin-zero` | 毛利率 0%，售價等於成本 |
| `solve-margin-high` | 毛利率 99.9%，售價放大百倍、加價率 99900.00% |
| `solve-margin-hundred` | 毛利率恰 100% → NO_SOLUTION（非 RANGE） |
| `solve-margin-over-hundred` | 毛利率 150.5% → NO_SOLUTION（非 RANGE） |
| `solve-markup-price-over-cap` | 加價率 1% 使最大成本售價超出上限 → RANGE/markupPercent |
| `solve-margin-price-over-cap` | 毛利率 99.999% 使售價超出上限 → RANGE/marginPercent |
| `cost-zero` | 成本為零低於範圍 |
| `cost-over-range` | 成本文法通過但分值超過上限 |
| `cost-format` | 金額小數超過兩位 |
| `percent-format` | 百分比小數超過三位 |
| `percent-range` | 百分比文法通過但千分之一值超過上限 |
| `percent-empty` | 目標毛利率缺內容 |
| `price-input-limit` | 售價原始長度超過容量，先於文法與範圍失敗 |
| `mode-enum` | 模式不是列舉值 |
| `schema-extra-field` | 多出未知欄位 → SCHEMA |
| `schema-mode-mismatch` | report 模式欄位 null 型態不符 → SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（cost 0.01 與 999999.99、price 0 與 999999.99、百分比 0 與 99999.999、mode 三值）、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證所有 report 成功案例的未捨入恆等式 毛利率 ＝ 加價率 ÷（1 ＋ 加價率）（以有理數核對，不以顯示值核對）；驗證 solve 案例把售價代回 report 公式得到所列的另一率；驗證 NO_SOLUTION 只出現在 solve-margin 且 marginMilli ≥ 100,000，同值域內的字串永不回 RANGE。

候選 gate（均 NOT_RUN）

- 於 `tools/markup-margin-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「加價率與毛利率換算」，title「加價率與毛利率換算｜Gloss Tools」，description「輸入成本與售價，同時算出加價率與毛利率；或反過來，由目標加價率、目標毛利率反推售價。全程以整數分與千分之一百分比精確運算，百分比顯示至小數點後兩位。」。英文 lang=en，H1 “Markup & Margin Calculator”，title “Markup & Margin Calculator | Gloss Tools”，description “Enter cost and price to get markup and margin together, or work backwards from a target markup or margin to the required price. All arithmetic is exact integer cents and milli-percent; percentages display to two decimals.”。兩頁靜態呈現操作、限制、對照表、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。加價率和毛利率有什麼不同？兩者利潤相同，分母不同：加價率除以成本，毛利率除以售價。售價高於成本時毛利率恆小於加價率，且毛利率永遠到不了 100%。 / Markup and margin use the same profit over different bases: markup divides by cost, margin by price. When the price is above cost, margin is always smaller than markup, and margin can never reach 100%.
- FAQ。為什麼目標毛利率 100% 求不出售價？毛利率 100% 表示利潤等於全部售價，也就是成本必須為零；成本為正時售價要無限大才行，所以本工具回報無解，而不是輸入錯誤。 / Why is a 100% target margin unsolvable? A 100% margin means the profit equals the whole price, so the cost would have to be zero; with any positive cost the price would need to be infinite, so the tool reports no solution instead of an input error.
- FAQ。售價低於成本時會發生什麼事？照常計算，利潤與兩個百分比為負值並標示低於成本；這是有效的報表結果，不是錯誤。 / What happens when the price is below cost? It is still calculated: the profit and both percentages come out negative and are flagged as below cost — a valid report, not an error.
- FAQ。毛利率顯示 100.00% 是怎麼回事？成本相對售價極小時，精確毛利率非常接近但小於 100%，顯示捨入至小數兩位後呈現 100.00%；精確值永遠小於 100%。 / Why can the margin display as 100.00%? When the cost is tiny next to the price, the exact margin is very close to but below 100%; rounded to two decimals for display it shows 100.00%, while the exact value is always below 100%.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://markup-margin.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/markup-margin-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
