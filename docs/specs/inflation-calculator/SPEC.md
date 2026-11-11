# 通膨計算機 / Inflation Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-inflation-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

把一筆金額在不同物價水準之間換算的人，要同時拿到名目與實質兩個方向的答案，而不是自己猜哪個除哪個。

- 桌面。比較跨年薪資或房租的人，輸入十年前與現在的兩期 CPI（如主計總處發布的指數），把當年金額換成今天的等值金額，並註明期別標籤。
- 行動。存錢的人輸入假設通膨率與年數，核對手邊存款在未來的實質購買力與逐年變化，判斷利率是否跑贏通膨。

使用情境為設計假設。資料只保留在目前頁面草稿。成功結果：每個數字都可由本文釘版的公式、運算順序與捨入規則重算得到。

## scope

兩種模式都屬 MVP 必做。固定利率模式：金額、年通膨率、年數 → 未來名目金額、實質購買力、累計通膨百分比、逐年表（第 0..N 年）。CPI 模式：金額、兩期使用者輸入的 CPI 指數與期別標籤、可選相隔年數 → 換算金額、累計變化百分比、等值年通膨率（給年數時）。

非目標如下。

- **不內建任何 CPI 資料集**：指數一律由使用者輸入。若日後要附官方 CPI 表（例如主計總處歷年指數），須另以固定來源版次、擷取日期與逐值核對立約，不在本案範圍。
- 不即時抓取外部數據、不連網、不匯率換算（跨幣別是 currency-converter 的範圍；本案跨的是時間與物價水準）。
- 不支援逐年不同利率的路徑、不支援月複利或連續複利、不畫圖表、不儲存歷史紀錄。

已與 registry r807 的 130 份預案及本批同梯規格比對，最相近者的實質差異如下。

- 複利與儲蓄目標是名目餘額的逐月模擬成長，其 scope 明示排除 inflation adjustment。此處不模擬帳戶，而是以固定利率或 CPI 指數做物價水準換算，輸出實質購買力與等值年率。 [compound-interest-calculator](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/docs/specs/compound-interest-calculator/SPEC.md)
- 存錢目標解的是年金公式的月存額或達標月數。此處沒有存款流，只有單筆金額的跨期換算。

判定規則由本文定義，無線上資料或外部服務依賴。核心邏輯確定、不讀主機時區與日期。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式切換「模式 / Mode」：分段控制「固定通膨率 / Constant rate」與「CPI 指數 / CPI index」。切換模式保留各模式自己的草稿，不互相覆寫；切換本身使任何已顯示結果失效（回 dirty）。
- 固定利率欄位「金額 / Amount」、「年通膨率（%）/ Annual inflation rate (%)」、「年數 / Years」。
- CPI 欄位「金額 / Amount」、「起始 CPI 指數 / Starting CPI index」、「目標 CPI 指數 / Ending CPI index」、「起始期標籤 / Start period label」、「目標期標籤 / End period label」、「相隔年數（選填）/ Years between (optional)」。
- 「計算換算 / Calculate conversion」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（`rate-basic`，固定利率模式），切換到該模式、明示範例並等待手動執行。
- 固定利率結果先摘要「未來名目金額 / Future nominal amount」、「實質購買力 / Real purchasing power」、「累計通膨變化 / Cumulative inflation」，再列「逐年表 / Year-by-year table」（欄位：年 / Year、名目金額 / Nominal amount、實質購買力 / Real purchasing power）。逐年表在有 label 的區域捲動；超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。
- CPI 結果先顯示期別標籤（起始期 → 目標期），再摘要「換算金額 / Converted amount」、「累計通膨變化 / Cumulative inflation」，給了相隔年數才顯示「等值年通膨率 / Equivalent annual rate」。
- 兩模式結果旁常駐方法說明（釘版原文，見 tests 節）：「固定利率模式假設通膨率每年相同，是簡化模型；CPI 模式的結果取決於你輸入的指數來源與期別。/ Constant-rate mode assumes the same inflation rate every year — a simplification. CPI mode results depend on the index source and periods you enter.」
- 成功才顯示「下載報告 / Download report」。文字可手動選取。購買力為 null 的列（見 inputsOutputs 的非有限規則）顯示「—」並附註「超出可計算範圍 / Beyond the computable range」，不用 Infinity 或空白冒充數值。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、模式或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，切換回固定利率模式，復原預設 `{"mode":"rate","amount":"100000","annualRatePercent":"2","years":"10"}` 並聚焦金額欄。CPI 模式第一次切入時的草稿為 `{"mode":"cpi","amount":"100000","cpiFrom":"100.0","cpiTo":"102.0","labelFrom":"","labelTo":"","yearsBetween":null}`。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數為普通物件，只讀 own data；JSON fixture 即介面。未知鍵、缺鍵、錯型別、accessor 皆 SCHEMA，field、row 皆 null。先驗結構：(1) input 為普通物件且只有 own data 屬性；(2) `mode` 為字串 `"rate"` 或 `"cpi"`；(3) 鍵集合恰等於該模式的鍵集合；(4) 除 `yearsBetween` 可為 null 外，每個值都是字串。任一不合即 SCHEMA。

欄位依模式固定順序驗證。逐欄順序固定：容量 INPUT_LIMIT（raw 字串 UTF-16 單元數超限）→ 不成對 surrogate UNICODE → 缺內容 EMPTY → 文法（DECIMAL_FORMAT／INTEGER_FORMAT）→ 範圍 RANGE。第一個失敗即回 `{ok:false,error:{code,field,row}}`，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL／WORKER_ERROR，不回傳堆疊。

| 欄位 | 模式 | 文法 | raw 上限 | 範圍（解析後） | 備註 |
| --- | --- | --- | --- | --- | --- |
| amount | 兩者 | DECIMAL，≤2 位小數 | 12 單元 | 0 – 999,999,999.99 | 0 合法（退化全零） |
| annualRatePercent | rate | DECIMAL，可帶前置 `-`，≤3 位小數 | 8 單元 | > −100 且 ≤ 1000 | 負值即通縮；恰 −100 為 RANGE |
| years | rate | INTEGER | 3 單元 | 0 – 200 整數 | 0 合法（因子 1） |
| cpiFrom | cpi | DECIMAL，≤3 位小數 | 9 單元 | > 0 且 ≤ 99,999.999 | 0 為 RANGE（不得為除數） |
| cpiTo | cpi | DECIMAL，≤3 位小數 | 9 單元 | > 0 且 ≤ 99,999.999 | 可小於 cpiFrom（物價下跌） |
| labelFrom | cpi | 文字 | 24 單元 | 去空白後 1 – 24 單元 | 見標籤規則 |
| labelTo | cpi | 文字 | 24 單元 | 去空白後 1 – 24 單元 | 見標籤規則 |
| yearsBetween | cpi | null 或 INTEGER | 3 單元 | 給值時 1 – 200 整數 | null 表示不算等值年率；0 為 RANGE |

- DECIMAL 文法：可選前置 `-`（僅 annualRatePercent 允許，其他欄位出現 `-` 即 DECIMAL_FORMAT）、一或多位 ASCII 數字、可選的小數點加一或多位 ASCII 數字。小數位數上限依欄位（amount 2 位、其餘 3 位），超過為 DECIMAL_FORMAT。不接受 `+` 號、空白、指數、`1.`、`.5`、全形數字或空字串（空字串先在 EMPTY 步驟攔截）。前置零合法（`"007"` = 7）。
- INTEGER 文法：一或多位 ASCII 數字，不接受符號、小數點、空白或指數。前置零合法。
- 標籤規則：raw 先查容量與 surrogate；EMPTY 判定與輸出值都用「去除前後 U+0020 空格」後的字串。內部字元（含 tab、全形字）原樣保留。結果回傳修剪後標籤。
- 文法通過後以 `Number(str)` 解析（ECMAScript 正確捨入解析，確定）。`"-0"` 解析為 −0，視為 0。

計算（IEEE-754 雙精度，運算順序釘版，中間值不捨入）。

1. rate 模式。a＝amount、r＝annualRatePercent、n＝years。base ＝ 1 ＋ r／100（先除後加）。factor ＝ Math.pow(base, n)。
2. futureValue ＝ round2(a × factor)；purchasingPower ＝ round2(a ／ factor)；cumulativePercent ＝ round2((factor − 1) × 100)。
3. yearTable 第 k 列（k＝0..n，每列獨立重算，不用迭代乘法）：fk ＝ Math.pow(base, k)；nominalValue ＝ round2(a × fk)；purchasingPower ＝ round2(a ／ fk)。第 n 列恆等於標題三值中的前兩項對應值。
4. cpi 模式。a＝amount、f＝cpiFrom、t＝cpiTo。ratio ＝ t ／ f（先除）。adjustedAmount ＝ round2(a × ratio)；cumulativePercent ＝ round2((ratio − 1) × 100)。
5. yearsBetween 非 null 時：exponent ＝ 1 ／ yearsBetween；equivalentAnnualRatePercent ＝ round4((Math.pow(ratio, exponent) − 1) × 100）。為 null 時該欄位為 null。

捨入釘版：roundD(x, d) ＝ Math.floor(x × 10^d ＋ 0.5) ／ 10^d，d 為 2（金額與累計百分比）或 4（等值年率）。每個輸出只從未捨入的雙精度原值捨入一次；不做二次捨入、不以已捨入值反推其他輸出。本規則對負數即向 +∞ 方向逢半進位，與全組 r(x) 家族一致。

非有限規則：rate 模式 factor 可能因指數下溢成為 +0（如 r＝−99.999、n＝200），此時 a／factor 為 Infinity（a>0）或 NaN（a＝0）。凡 a／fk 計算結果不是有限數，purchasingPower 輸出 null（標題與逐年表各列各自判定）；nominalValue 照常（fk＝+0 時為 0）。其餘輸出在合法範圍內恆為有限數：factor 最大 11^200 ≈ 1.9e208，a × factor ≤ 約 1.9e217，不溢位。此規則是契約的一部分，不得以 Infinity、NaN 或 0 冒充購買力。

結果形狀（鍵集合固定）。

- rate：`{cumulativePercent, futureValue, purchasingPower, yearTable}`；yearTable 為 `{year, nominalValue, purchasingPower}` 陣列，長度 n＋1。
- cpi：`{adjustedAmount, cumulativePercent, equivalentAnnualRatePercent, fromLabel, toLabel}`。

固定下載 `inflation-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

錯誤訊息釘版（欄位錯誤另以欄位標籤指出欄位）。

| code | zh-Hant | en |
| --- | --- | --- |
| SCHEMA | 輸入結構不正確 | The input structure is invalid. |
| INPUT_LIMIT | 輸入太長 | Input is too long. |
| UNICODE | 輸入包含不完整的 Unicode 字元 | Input contains an unpaired surrogate. |
| EMPTY | 此欄必填 | This field is required. |
| DECIMAL_FORMAT | 請輸入有效的小數 | Enter a valid decimal number. |
| INTEGER_FORMAT | 請輸入有效的整數 | Enter a valid whole number. |
| RANGE | 數值超出允許範圍 | Value is outside the allowed range. |
| OUTPUT_LIMIT | 報告太大，無法產生 | The report is too large to generate. |
| INTERNAL／WORKER_ERROR | 處理失敗，請重試 | Processing failed. Try again. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/inflation-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- 核心只用 `Number` 解析（文法已驗）、`Math.pow` 與基本運算及上述 roundD；不讀 Date、主機時區或任何隨機來源；同一輸入在任何環境得到同一輸出。`Math.pow` 的跨引擎差異以 ulp 計，fixtures 全部選在離捨入邊界夠遠處（量測紀錄見 AUTHOR-CHECK.md），不得改用迭代乘法或以已捨入值推導。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算換算」兩模式，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的兩模式主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。24 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected；fixtures 的數值由作者以精確有理數（分數）高精度手算推導、再以 IEEE-754 雙精度腳本照釘版順序獨立重算，雙推導與邊界餘裕紀錄見 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。

| 案例 ID | 驗證行為 |
| --- | --- |
| `rate-basic` | 固定利率基本例與逐年表（第 n 列＝標題值） |
| `rate-zero-rate` | 利率 0：恆等輸出 |
| `rate-deflation` | 負利率：名目縮小、購買力上升、累計為負 |
| `rate-years-zero` | 年數 0：因子 1、逐年表一列 |
| `rate-fractional` | 小數金額與三位小數利率 |
| `rate-high` | 10%、30 年、31 列逐年表 |
| `rate-max-years` | 年數上限 200：201 列 |
| `rate-floor` | 利率 −99.999、pow(x,1) 精確、累計捨入為 −100 |
| `rate-max-rate` | 利率上限 1000：因子 121 |
| `cpi-basic` | CPI 基本例、yearsBetween 為 null 時等值年率 null |
| `cpi-with-years` | 等值年率 4 位小數 |
| `cpi-deflation` | 指數下跌：換算縮小、等值年率為負 |
| `cpi-same-index` | 指數相同：恆等、累計與年率 0 |
| `err-amount-format` | 金額三位小數 DECIMAL_FORMAT |
| `err-amount-limit` | 金額 13 字元 INPUT_LIMIT（先於文法） |
| `err-rate-floor` | 利率恰 −100 為 RANGE |
| `err-rate-format` | 利率四位小數 DECIMAL_FORMAT |
| `err-years-range` | 年數 201 為 RANGE |
| `err-years-format` | 年數 1.5 為 INTEGER_FORMAT |
| `err-cpi-zero` | 起始 CPI 0 為 RANGE |
| `err-label-empty` | 標籤全空白去空白後 EMPTY |
| `err-yearsbetween-zero` | 相隔年數 0 為 RANGE |
| `err-field-order` | 兩欄同錯先報金額 |
| `err-schema-extra` | 未知鍵 SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。指定檢查：金額 `"999999999.99"` 合法、`"1000000000"` 為 RANGE、`"99999999.999"`（12 單元）為 DECIMAL_FORMAT；利率 `"1000"` 合法、`"1000.001"` 為 RANGE、`"-100.001"` 為 RANGE；CPI `"99999.999"` 合法、`"100000"` 為 RANGE；年數 `"200"` 合法、`" 10"` 為 INTEGER_FORMAT。性質檢查：r＝0 或指數相同恆等；固定金額與年數時 futureValue 對 r 嚴格遞增；逐年表末列與標題一致；cumulativePercent 符號與 factor−1（或 ratio−1）一致。極端下溢檢查：rate 模式 amount `"1000"`、利率 `"-99.999"`、年數 `"200"` → factor 為 +0，futureValue 0、purchasingPower null、cumulativePercent −100，逐年表中 a／fk 非有限的列 purchasingPower 為 null（此檢查斷言標題與 null 規則，不逐列字面比對）。

候選 gate（均 NOT_RUN）

- 於 `tools/inflation-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、兩模式錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「通膨計算機」，title「通膨計算機｜Gloss Tools」，description「以固定年通膨率或兩期消費者物價指數，換算金額的未來名目值與實質購買力。」。英文 lang=en，H1 “Inflation Calculator”，title “Inflation Calculator | Gloss Tools”，description “Convert an amount between price levels with a constant annual inflation rate or two CPI index values — future nominal value and real purchasing power.”。兩頁靜態呈現操作、限制、方法說明、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 方法說明（常駐結果旁，釘版原文）。固定利率模式假設通膨率每年相同，是簡化模型；CPI 模式的結果取決於你輸入的指數來源與期別。 / Constant-rate mode assumes the same inflation rate every year — a simplification. CPI mode results depend on the index source and periods you enter.
- FAQ。固定利率模式假設什麼？每年同一個通膨率、逐年複利；實際通膨逐年不同。 / What does constant-rate mode assume? The same rate every year, compounded; real inflation varies year by year.
- FAQ。CPI 指數從哪裡來？本工具不內建任何 CPI 資料；請填官方發布的指數（例如主計總處 CPI），並在標籤註明期別。 / Where do CPI values come from? The tool bundles no CPI data; enter officially published indices (such as DGBAS CPI) and label the periods.
- FAQ。可以輸入負通膨率嗎？可以；大於 −100% 的負值代表通縮，未來名目金額會比現在小、購買力上升。 / Can the rate be negative? Yes; a rate above −100% models deflation — the future nominal amount shrinks and purchasing power rises.
- FAQ。等值年通膨率是什麼？把兩期 CPI 的總變化，換算成每年相同、複利後得到相同總變化的年率；需要相隔年數才計算。 / What is the equivalent annual rate? The constant yearly rate that compounds to the total CPI change; it needs the years between the two indices.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://inflation-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/inflation-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
