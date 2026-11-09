# 3D 列印線材用量換算 / Filament Usage Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-filament-usage-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

FDM 3D 列印使用者在備料與開印前，用手邊已知的線徑、材料、長度、秤重與價格，當場回答四件事：一段線材有多重、一段重量有多長、手邊這捲還剩多少、這一件要花多少線材錢。

- 桌面。桌機在切片軟體旁核對：切片說用量 250 g，秤上整捲 640 g，確認剩料夠不夠、多多少。
- 行動。手機在材料櫃前輸入整捲秤重與空軸重，決定要不要先買新料。

使用情境為備料估算。資料只保留在目前頁面草稿。

## scope

MVP 必做：四種模式（長度換重量、重量換長度、線軸剩餘、列印成本）；線徑 1.75／2.85 mm；六種材料固定密度表；每公尺重量附帶顯示於所有結果。非目標為讀取 G-code／切片檔、依擠出路徑／流量／支撐／裙邊計算、線材直徑實測誤差校正、即時比價或幣別換算（幣別僅為顯示標籤）、庫存管理與歷史紀錄、把結果當成切片軟體用量的保證。

已比對 base `ce8931f2` 的 `docs/specs/` 全部預案、`tools/` 與 registry：沒有任何線材／3D 列印工具，本案非改名重複。最相近者的實質差異如下。

- `parcel-billable-weight`（計費重量）：把包裹尺寸換成貨運計費重量，本案把線材長度與重量依材料密度互換並估線軸剩餘，輸入、常數與用途皆不同。
- `concrete-bag-calculator`（混凝土用量）：體積換算成預拌袋數，本案是連續材料的長度↔重量換算，無離散包裝單位。

密度為業界切片軟體材料設定常用的標稱值，由本文固定為資料表（見 inputsOutputs），不連外查詢、不允許執行時改表；自訂密度不在 MVP。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「模式、線徑、材料 / Mode, diameter and material」
- 欄位或說明「依模式顯示的數值欄位 / The numeric fields of the selected mode」
- 「計算換算 / Calculate」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果先摘要再列細節：每公尺重量恆顯示，模式專屬輸出逐項列出。成功才顯示「下載報告 / Download report」。文字可手動選取。結果區固定附揭露句（見 tests 的雙語靜態內容），不可摺疊隱藏。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"length","diameter":"1.75","material":"pla","lengthM":"10","weightG":"100","grossWeightG":"850","emptySpoolPreset":"200","emptySpoolCustomG":"200","spoolPrice":"599","spoolNetWeightG":"1000","usageG":"100","currency":"TWD"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

固定欄位（12 個，全為字串）：

| 欄位 | 語法 | 範圍／值域 | raw 上限（UTF-16 單元） |
| --- | --- | --- | --- |
| `mode` | 列舉 | `length`／`weight`／`spool`／`cost` | 8 |
| `diameter` | 列舉 | `1.75`／`2.85`（mm） | 4 |
| `material` | 列舉 | `pla`／`petg`／`abs`／`tpu`／`asa`／`pc` | 4 |
| `lengthM` | 十進位，最多 3 位小數 | >0 且 ≤100000（m） | 10 |
| `weightG` | 十進位，最多 2 位小數 | >0 且 ≤1000000（g） | 10 |
| `grossWeightG` | 十進位，最多 1 位小數 | >0 且 ≤100000（g） | 8 |
| `emptySpoolPreset` | 列舉 | `140`／`200`／`250`／`custom`（g） | 6 |
| `emptySpoolCustomG` | 十進位，最多 1 位小數 | 0–10000（g） | 7 |
| `spoolPrice` | 十進位，最多 2 位小數 | >0 且 ≤1000000 | 10 |
| `spoolNetWeightG` | 十進位，最多 1 位小數 | 1–100000（g） | 8 |
| `usageG` | 十進位，最多 1 位小數 | >0 且 ≤1000000（g） | 10 |
| `currency` | 列舉（僅顯示，不換算） | `TWD`／`USD`／`EUR`／`JPY` | 3 |

十進位文法固定 `^(0|[1-9][0-9]*)(\.[0-9]+)?$` 再依欄位小數位上限判定；無空白／正負號／指數／前導零（`0` 本身與 `0.x` 除外）。預設值即 userFlow 的重設值；`spoolNetWeightG` 預設 `1000`（常見 1 kg 裝）。

材料密度表（固定資料，g/cm³，業界切片軟體材料設定的常用標稱值）：

| code | 繁中 | English | 密度 |
| --- | --- | --- | --- |
| `pla` | PLA（聚乳酸） | PLA | 1.24 |
| `petg` | PETG | PETG | 1.27 |
| `abs` | ABS | ABS | 1.05 |
| `tpu` | TPU（軟料） | TPU (flexible) | 1.21 |
| `asa` | ASA | ASA | 1.07 |
| `pc` | PC（聚碳酸酯） | PC | 1.20 |

幣別符號（僅顯示）：`TWD`→`NT$`、`USD`→`US$`、`EUR`→`€`、`JPY`→`¥`。

生效欄位依 `mode` 決定：`length` 用 lengthM；`weight` 用 weightG；`spool` 用 grossWeightG、emptySpoolPreset，且 `emptySpoolPreset="custom"` 時才用 emptySpoolCustomG；`cost` 用 spoolPrice、spoolNetWeightG、usageG、currency。diameter、material 在所有模式皆生效。不生效欄位只做 SCHEMA 型別、raw 上限與 surrogate 檢查，不驗值（保留草稿原字串，切換模式不清除）。

驗證順序（第一錯即停）：

1. SCHEMA：非普通物件、欄位集合不符（缺欄／多欄）、任一值非字串、accessor → `{code:"SCHEMA",field:null,row:null}`。
2. 逐欄（固定欄位序 mode、diameter、material、lengthM、weightG、grossWeightG、emptySpoolPreset、emptySpoolCustomG、spoolPrice、spoolNetWeightG、usageG、currency）先 INPUT_LIMIT（raw 超上限），再 UNICODE（不成對 surrogate）。
3. 值驗證只針對生效欄位，依同一欄位序：列舉欄位值不在值域 → ENUM；數值欄位空字串 → EMPTY；文法或小數位不符 → DECIMAL_FORMAT；超出範圍 → RANGE。`mode` 先驗（ENUM），其值決定生效集合；mode 本身永遠生效。
4. `spool` 跨欄：解析後 empty = preset 數值或 custom 值；grossWeightG < empty → NEGATIVE_REMAINING，field 為 `grossWeightG`。grossWeightG == empty 合法，剩餘為 0。

整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆 null；field 的 JSON Pointer 等價路徑為 `"/"+field`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（全程 IEEE-754 double，不做任何中間捨入；π 取 `Math.PI`）：

- 截面積 `A = π × (d/2)²`（mm²）。1 m 線材體積 = A mm² × 1000 mm = A×1000 mm³ = A cm³，故每公尺重量 `gpm = A × ρ`（g/m，ρ 為密度 g/cm³）。
- `length`：`weight = lengthM × gpm`。
- `weight`：`length = weightG / gpm`。
- `spool`：`remainingG = grossWeightG − empty`；`remainingM = remainingG / gpm`。
- `cost`：`cost = spoolPrice × usageG / spoolNetWeightG`；`usageLength = usageG / gpm`。

輸出與捨入（每值只捨入一次，round-half-up：`floor(x×10^n + 0.5) / 10^n`，再格式化為固定小數字串）：

| 模式 | result 欄位 |
| --- | --- |
| 共同 | `gramsPerMetre`（2 位小數） |
| `length` | `weightG`（1 位小數，g） |
| `weight` | `lengthM`（2 位小數，m） |
| `spool` | `remainingG`（1 位小數，g）、`remainingM`（2 位小數，m） |
| `cost` | `cost`（2 位小數）、`currency`（原列舉值）、`usageLengthM`（2 位小數，m） |

捨入安全性：fixtures 全部輸出值與最近進位平局點的距離 ≥0.0024（見 AUTHOR-CHECK），遠大於 double 誤差（約 1e-12 相對量級）；實作不得對 gpm 或中間量先行捨入，否則結果可能跨界。機器值不隨 locale 改。

固定下載 `filament-usage-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/filament-usage-calculator/`。src/core.mjs 放純驗證、推導、格式化（含固定密度表與幣別符號表）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算換算」四模式，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、NEGATIVE_REMAINING 與剩餘為零、以及三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。11 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `length-pla-175` | 基準：1.75 mm PLA、100 m → 298.3 g |
| `length-petg-285` | 2.85 mm 線徑、PETG、25 m |
| `weight-pla-175` | 重量換長度：500 g PLA → 167.64 m |
| `weight-abs-175` | 重量換長度：250 g ABS |
| `spool-petg-preset` | 線軸剩餘：preset 空軸 200 g |
| `spool-tpu-custom` | 線軸剩餘：2.85 mm、TPU、自訂空軸 175 g |
| `spool-exactly-empty` | 總重等於空軸重，剩餘 0 合法 |
| `spool-negative` | 總重小於空軸重 → NEGATIVE_REMAINING |
| `cost-pla-twd` | 成本：599／1000 g、用 250 g → 149.75 |
| `length-zero-range` | 長度 0 → RANGE |
| `weight-format` | 重量小數位超限 → DECIMAL_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 lengthM 上限 100000／100000.001、weightG 恰 1000000、gross 等於 empty／少 0.1、custom 空軸 0、spoolNetWeightG 為 0 → RANGE、mode 非法 → ENUM 且優先於其他欄位錯誤、不生效欄位亂值不擋下計算。所有模式的 gramsPerMetre 與獨立重算一致。

候選 gate（均 NOT_RUN）

- 於 `tools/filament-usage-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「3D 列印線材用量換算」，title「3D 列印線材用量換算｜Gloss Tools」，description「依線徑與材料密度，把 3D 列印線材的長度換算成重量、重量換算回長度，並估算線軸剩餘量與單次列印的線材成本。」。英文 lang=en，H1 “Filament Usage Calculator”，title “Filament Usage Calculator | Gloss Tools”，description “Convert 3D-printing filament length to weight and back by diameter and material density, estimate what is left on a spool, and price a print's filament.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 錯誤訊息對照（固定）：SCHEMA「資料格式不正確。/ The data format is invalid.」；INPUT_LIMIT「輸入過長。/ Input is too long.」；UNICODE「含有不完整的字元。/ Input contains an incomplete character.」；EMPTY「此欄必填。/ This field is required.」；ENUM「請選擇有效的選項。/ Choose a valid option.」；DECIMAL_FORMAT「請輸入有效的數字。/ Enter a valid number.」；RANGE「數值超出允許範圍。/ Value is outside the allowed range.」；NEGATIVE_REMAINING「總重小於空軸重，請確認秤重與空軸設定。/ Gross weight is less than the empty spool weight. Check the scale reading and spool setting.」；INTERNAL／WORKER_ERROR「處理失敗，請重試。/ Something went wrong. Try again.」；OUTPUT_LIMIT「報告過大，無法下載。/ The report is too large to download.」
- 結果揭露句（固定，附於每次結果）：「密度為各材料的常見標稱值，實際線材會因品牌與配方不同而略有差異；結果供備料與估算參考。/ Densities are common nominal values; actual filament varies by brand and blend. Treat results as planning estimates.」
- FAQ。為什麼切片軟體的重量和這裡不同？切片軟體依實際擠出路徑與流量計算，這裡依線徑與密度的標稱值換算，兩者可略有差異。 / Why does my slicer's weight differ? Slicers compute from actual extrusion paths and flow; this tool converts from nominal diameter and density, so small differences are expected.
- FAQ。空軸重怎麼量？用完一軸後秤空軸，或查品牌公布值；同品牌不同批也可能不同。 / How do I get the empty spool weight? Weigh a finished spool of the same kind or check the maker's published value; it can vary between batches.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://filament-usage-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

規格任務 id `labs-filament-usage-calculator-spec-20261109`（由主代理以本人身分登記，作者不自行跑 registry 指令）。本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/filament-usage-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
