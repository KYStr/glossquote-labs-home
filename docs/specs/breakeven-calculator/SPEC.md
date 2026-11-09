# 損益平衡計算 / Breakeven Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-breakeven-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

小攤商、工作室或接案者要決定一個產品或服務賣多少才不會虧：他們手上有每月固定成本（租金、訂閱、薪資）、單位售價和單位變動成本（材料、包裝、運費），需要一個確定的數字——至少賣幾件、做到多少營收才打平——以及在預期銷量下離打平還有多遠、安全或危險。

- 桌面。桌面填入三個金額（和選填的預期銷量），立即核對損益平衡銷量與營收、邊際貢獻率與安全邊際。
- 行動。手機在談價或看店面時快速試算不同售價，確認某個價格是否根本不可能打平。

使用情境為試算假設。所有金額採同一幣別由使用者自理，本工具不換算、不標示幣別。資料只保留在目前頁面草稿。

## scope

MVP 必做：單一產品、單一幣別的損益平衡分析。輸入固定成本、單位售價、單位變動成本，輸出單位邊際貢獻、邊際貢獻率、損益平衡銷量（理論值與整數單位值）、損益平衡營收（理論值與整數單位值）；選填預期銷量時，另輸出安全邊際（單位與百分比）與該銷量下的預期利潤。

非目標：多產品組合與加權平均邊際、階梯定價或折扣、稅費與發票、折現與時間價值、成本隨量變化的非線性模型、圖表與損益平衡線圖資料、歷史紀錄或多情境比較。

已與本 repo 既有規格比對，實質差異如下。

- `docs/specs/compound-interest-calculator/` 與 `docs/specs/mortgage-amortization/` 是資金隨時間成長或攤還，沒有固定／變動成本的銷量打平概念。
- `docs/specs/meeting-cost-calculator/` 是把與會者時間換算成單次會議成本，沒有售價、邊際貢獻或打平銷量。
- 同批的 markup-margin-calculator（加價率與毛利率）只處理單一單位的成本↔售價比率換算，沒有固定成本，也沒有「賣幾件才打平」的銷量維度；本案的邊際貢獻率是損益平衡推導的一步，不是定價換算工具。

判定規則由本文定義，無線上資料或外部服務依賴。公式為管理會計的標準損益平衡模型（邊際貢獻法），不需要外部即時資料。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「固定成本、單位售價、單位變動成本 / Fixed costs, price per unit and variable cost per unit」
- 欄位或說明「預期銷量（選填）/ Expected sales volume (optional)」
- 「計算損益平衡 / Calculate breakeven」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（`ceil-rounds-up`），明示範例並等待手動執行。
- 「損益平衡結果 / Breakeven result」先摘要（整數單位銷量與其營收）再列全部數字。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含理論值與整數單位值並標示何者可直接採用（整數單位值）。預期銷量低於損益平衡銷量時，安全邊際區另以文字及符號標示「預期銷量低於損益平衡銷量 / Expected volume is below the breakeven volume」，不用顏色單獨傳達。 |
| error | 保留草稿，沒有結果。欄位錯誤顯示本地化錯誤並連結欄位，提交失敗時移焦首錯欄。NO_MARGIN 是整份輸入的語義結果，不是欄位錯誤：不標記任何欄位，改顯示專屬說明「單位變動成本必須低於單位售價，否則賣得越多虧得越多，沒有損益平衡點。 / Variable cost per unit must be below the price per unit; otherwise every sale loses money and no breakeven point exists.」，並把焦點移到狀態標題。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"fixedCost":"100000","price":"400","variableCost":"150","expectedUnits":""}` 並聚焦首欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

| 欄位 | 語法 | 範圍 | 必填 |
| --- | --- | --- | --- |
| `fixedCost` 固定成本 | 金額文法（見下），raw 最多 12 UTF-16 單元 | 0 – 999,999,999.99 | 是 |
| `price` 單位售價 | 金額文法，raw 最多 12 UTF-16 單元 | 0.01 – 999,999,999.99 | 是 |
| `variableCost` 單位變動成本 | 金額文法，raw 最多 12 UTF-16 單元 | 0 – 999,999,999.99 | 是 |
| `expectedUnits` 預期銷量 | 整數文法，raw 最多 9 UTF-16 單元 | 0 – 100,000,000 | 否，空白視為未提供 |

- 金額文法 DECIMAL_FORMAT：`^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`。只接受 ASCII 數字與至多一個小數點、1–2 位小數；無正負號、空白、千分位、指數；整數部分除單獨 `0` 外不接受前導零（`00.50`、`007` 皆 DECIMAL_FORMAT）。整數文法 INTEGER_FORMAT：`^(0|[1-9][0-9]*)$`。
- 驗證順序固定。先 SCHEMA（整份形狀）。再依欄位順序 fixedCost、price、variableCost、expectedUnits 逐欄驗證，每欄依序：容量 INPUT_LIMIT → 未成對 surrogate UNICODE → 必填空白 EMPTY（僅三個必填金額欄；expectedUnits 空白即未提供，跳過其餘檢查）→ 文法 DECIMAL_FORMAT／INTEGER_FORMAT → 範圍 RANGE。任一欄失敗即整份失敗，不再檢查後續欄位與語義。
- 整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列輸入）。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

語義檢查（全部欄位通過後才執行）：金額先換算為整數分（cents，BigInt）：cents = 整數部分 × 100 ＋ 小數部分補齊兩位。若 variableCost 的 cents ≥ price 的 cents，回 `{ok:false,error:{code:"NO_MARGIN",field:null,row:null}}`。這是語義結果不是欄位錯誤：每個單位的邊際貢獻 ≤ 0，任何銷量都無法攤平正的固定成本，數學上不存在損益平衡點，因此不產生 result。price 為 0 已在 RANGE 擋下，不會走到語義檢查。

成功計算全部以整數分與 BigInt 有理數運算，無浮點。令 F、P、V 為三金額的 cents，M = P − V（> 0），U 為損益平衡整數單位銷量：

1. `contributionMarginPerUnit`：M 直接格式化為金額字串（M 恆為整數分，無捨入）。
2. `contributionMarginRatioPercent`：有理數 q = M × 100 / P，以 R(q, 2) 捨入後格式化為固定兩位小數的百分比數值字串（不含 `%` 符號，符號由 UI 標籤呈現）。
3. `breakevenUnitsExact`：有理數 q = F / M，以 R(q, 4) 捨入、固定四位小數字串。僅供參考（理論值），不是可採用銷量。
4. `breakevenUnits`：F = 0 時為 0；否則為整數無條件進位 ceil(F / M) ＝ (F + M − 1) div M（整數除法）。進位是硬規則：取 floor 時總邊際貢獻 (U−1) × M < F，仍為虧損，未達損益平衡。U ≥ 1 時恆滿足 (U−1) × M < F ≤ U × M。
5. `breakevenRevenueExact`：有理數 F × P / M（單位為分），以 floor(x + 1/2) 捨入到整數分後格式化為金額。是假設可賣出小數單位時的理論營收，僅供參考。
6. `breakevenRevenue`：U × P 分，整數精確，格式化為金額。這是整數單位值對應的營收，為可直接採用的數字。未捨入的理論營收 ≤ breakevenRevenue，差距 < P（不到一個單位的售價）；兩者在 F / M 恰為整數時相等。顯示值因理論營收已捨入到分，顯示差可能差一分。
7. `marginOfSafety`：expectedUnits 未提供時為 null。提供時為物件：`expectedUnits`（整數 E 本人）、`units` = E − U（有號整數，可為負）、`percent`（E = 0 時為 null，因除以零無定義；否則有理數 (E − U) × 100 / E 以 R(q, 2) 捨入的固定兩位小數字串，可為負）、`expectedProfit` = E × M − F 分，整數精確格式化為金額字串（可為負，如 `-20000.00`；零恆為 `0.00`，無負零）、`belowBreakeven` = E < U（布林）。

捨入規則 R(q, d)：對有理數 q 與小數位數 d，R(q, d) = floor(q × 10^d + 1/2) / 10^d，floor 向 −∞。即小數第 d 位之後恰為 5 且其後皆 0 時向 +∞ 進位（half-up）；負數同式套用，tie 向 +∞。所有顯示捨入只套用本規則且只套用一次，來自未捨入的有理數，禁止先捨入中間量再二次捨入（例如不得由 breakevenUnitsExact 的顯示值反推任何其他輸出）。

金額格式化：整數分 c → 字串：負號（僅 c < 0）＋ 整數部分（c 的絕對值 div 100，無千分位）＋ `.` ＋ 兩位小數（絕對值 mod 100 補零）。百分比與單位理論值同理固定小數位格式化。`breakevenUnits`、`marginOfSafety.expectedUnits`、`marginOfSafety.units` 為 JSON 整數（由範圍上限保證 < 2^53，精確表示）。

成功僅為 `{ok:true,result}`，result 欄位恰為上列七個（marginOfSafety 物件欄位恰五個），無多餘欄位。

固定下載 `breakeven-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/breakeven-calculator/`。src/core.mjs 放純驗證、推導、格式化（金額解析為 BigInt cents、全部運算 BigInt 整數與有理數，禁止 Number 浮點參與任何輸出值）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算損益平衡」，畫面和完整報告符合核心 fixtures（含 NO_MARGIN 與安全邊際），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、進位不變式 (U−1)×M < F ≤ U×M、expectedUnits 為 0 與恰等於 U、2.675% 半進位案例的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、欄位錯誤、NO_MARGIN、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `ceil-rounds-up` | 理論銷量非整數時無條件進位，整數單位營收大於理論營收 |
| `exact-integer-units` | 理論銷量恰為整數，兩個營收相等 |
| `zero-fixed-cost` | 固定成本 0，銷量與營收皆 0 |
| `zero-variable-cost` | 變動成本 0，貢獻率 100% |
| `with-margin-of-safety` | 安全邊際與預期利潤為正 |
| `below-breakeven` | 安全邊際與預期利潤為負，belowBreakeven true |
| `expected-equals-breakeven` | 預期銷量恰等於 U，安全邊際 0、percent 0.00 |
| `expected-zero` | 預期銷量 0，percent 為 null、利潤為 −F |
| `no-margin-equal` | 變動成本等於售價，NO_MARGIN |
| `no-margin-negative` | 變動成本高於售價，NO_MARGIN |
| `price-zero-range` | 售價 0 是 RANGE 而非 NO_MARGIN |
| `money-three-decimals` | 金額三位小數，DECIMAL_FORMAT |
| `empty-price` | 必填空白，EMPTY |
| `fractional-cents` | 含分金額：理論營收 1999.9995 捨入跨元為 2000.00 |
| `input-limit-fixed` | raw 長度 13 先於文法觸發 INPUT_LIMIT |
| `expected-units-decimal` | 預期銷量含小數，INTEGER_FORMAT |
| `range-fixed-over-max` | 文法合法但超過金額上限，RANGE |
| `ratio-half-up-tie` | 貢獻率恰 2.675%，half-up 得 2.68（浮點或銀行家捨入會得 2.67） |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作得到 NO_MARGIN 後收到上一份工作的成功，保留目前語義結果。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作得到 NO_MARGIN，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證金額上下限 999999999.99／1000000000、售價 0.01／0、預期銷量 100000000／100000001、raw 長度恰 12／13 與 9／10、NO_MARGIN 在任一欄位錯誤存在時不出現（欄位錯誤優先）、F=0 且 E=0 時 marginOfSafety 為 percent null 且 belowBreakeven false。所有成功案例核對不變式 (U−1)×M < F ≤ U×M（U ≥ 1）與未捨入理論營收 ≤ 整數單位營收且差 < 售價。

候選 gate（均 NOT_RUN）

- 於 `tools/breakeven-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「損益平衡計算」，title「損益平衡計算｜Gloss Tools」，description「輸入固定成本、單位售價與單位變動成本，算出損益平衡銷量與營收、安全邊際與邊際貢獻率。」。英文 lang=en，H1 “Breakeven Calculator”，title “Breakeven Calculator | Gloss Tools”，description “Enter fixed costs, price per unit and variable cost per unit to find the breakeven volume and revenue, margin of safety and contribution margin ratio.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 錯誤與狀態訊息對譯（節錄固定文案）：INPUT_LIMIT「輸入太長 / Input is too long」；UNICODE「含有無效字元 / Contains an invalid character」；EMPTY「必填 / Required」；DECIMAL_FORMAT「金額格式不正確（最多兩位小數）/ Invalid amount (up to two decimal places)」；INTEGER_FORMAT「請輸入整數 / Enter a whole number」；RANGE「超出允許範圍 / Out of range」；NO_MARGIN 見 userFlow 的專屬說明全文。
- 結果標籤對譯：單位邊際貢獻 / Contribution margin per unit；邊際貢獻率 / Contribution margin ratio；損益平衡銷量（理論值）/ Breakeven volume (exact)；損益平衡銷量（整數單位）/ Breakeven volume (whole units)；損益平衡營收（理論值）/ Breakeven revenue (exact)；損益平衡營收（整數單位）/ Breakeven revenue (whole units)；安全邊際 / Margin of safety；預期利潤 / Expected profit。
- FAQ。為什麼損益平衡銷量要無條件進位？少賣一個單位就還有固定成本沒攤平，仍是虧損；整數單位值是第一個不虧的銷量。 / Why is the breakeven volume always rounded up? Selling one unit fewer leaves part of the fixed costs uncovered, so it still loses money; the whole-unit figure is the first volume that does not lose money.
- FAQ。為什麼有兩個營收數字？理論值假設可以賣出小數單位；整數單位值是第一個打平銷量的實際營收，兩者只差不到一個單位的售價。 / Why are there two revenue figures? The exact figure assumes fractional units could be sold; the whole-unit figure is the actual revenue at the first volume that breaks even, and they differ by less than one unit's price.
- FAQ。售價等於或低於變動成本時會怎樣？每個單位貢獻零或負數，賣再多也攤不平固定成本，數學上沒有損益平衡點，本工具直接說明而不給數字。 / What if the price is at or below variable cost? Each unit contributes zero or less, so no volume can cover fixed costs and no breakeven point exists; the tool explains this instead of showing a number.
- FAQ。安全邊際是什麼？預期銷量高出（或低於）損益平衡銷量的單位數與百分比，並附該銷量下的預期利潤或虧損。 / What is the margin of safety? How far the expected volume sits above (or below) the breakeven volume, in units and percent, together with the profit or loss at that volume.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://breakeven-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/breakeven-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
