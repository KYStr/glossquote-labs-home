# 料理單位換算 / Cooking Measurement Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-cooking-measurement-converter-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

家庭料理者照美式食譜備料，手邊只有廚房秤，或反過來只有量杯量匙，需要把杯／湯匙／茶匙／毫升與公克互相換算。

- 桌面。備料前在電腦上把食譜的 2.5 杯麵粉、100 g 奶油逐項換成手邊工具能量的數量。
- 行動。站在廚房裡用手機查一匙可可粉是幾公克，不註冊、不連線。

重量與體積不是同一個量：換算只經一份固定的食材密度表，不用「1 杯＝240 g」這類對多數食材都錯的萬用係數。使用情境為日常備料。資料只保留在目前頁面草稿。

## scope

MVP 必做：單位 ml、tsp、tbsp、cup、g 五種互換；12 種食材的密度表（公克／杯）；目標單位為 cup 時附最接近的八分之一杯分數表示；固定報告下載。

非目標：盎司／磅等英制重量、250 ml 公制杯、英制量匙（20 ml）、溫度換算、食譜倍量／縮量、表外食材、自訂或編輯密度、煮熟後狀態的換算、液體盎司（fl oz）輸入。資料界線：全部常數寫死在程式內，無線上資料或外部服務依賴。性能界線：單一數量換算，同步純函數，無批次。

已與既有預案比對，最相近者的實質差異如下。

- 烘焙百分比（bakers-percentage）：算食譜內各食材相對麵粉的比例，不做單位換算；此處做單位與重量換算，不處理配方比例。
- 烤箱溫度換算（oven-temperature-converter）：只換溫度標度；此處只換體積與重量。
- 咖啡沖煮比例（coffee-brew-ratio）：算粉水比與用水量；此處是通用食材的單位換算，不限咖啡。

判定規則由本文定義。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「數量 / Amount」
- 欄位或說明「從 / From」「到 / To」（單位選單：毫升 ml、茶匙 tsp、湯匙 tbsp、杯 cup、公克 g）
- 欄位或說明「食材 / Ingredient」（13 個選項含「不指定（僅體積換算）/ None (volume only)」；密度表全文收在一層 disclosure，標明來源）
- 「換算 / Convert」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「換算結果 / Result」先顯示數值與目標單位，目標為 cup 時加一行「分數表示 / As a fraction」；用了密度表時註明該食材的公克／杯。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果區含數值、單位，及適用的分數表示與密度註記。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"amount":"","fromUnit":"cup","toUnit":"g","ingredient":"all-purpose-flour"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位順序固定為 amount、fromUnit、toUnit、ingredient；逐欄檢查，第一個失敗即整份失敗。每欄檢查順序固定：容量 INPUT_LIMIT → 不成對 surrogate UNICODE → 缺內容 EMPTY → 文法／列舉 → 範圍 RANGE。

- `amount`：字串。raw 最多 12 個 UTF-16 單元。文法 `^[0-9]+(\.[0-9]+)?$`（ASCII 數字、可選一個小數點與小數位；無正負號、空白、指數；前導零允許，如 `007`＝7；`.5` 與 `5.` 不合文法），不合為 DECIMAL_FORMAT。數值範圍 0 < v ≤ 100000，超出為 RANGE。
- `fromUnit`、`toUnit`：字串。raw 最多 4 單元。必須是 `ml`、`tsp`、`tbsp`、`cup`、`g` 之一（大小寫敏感），否則 ENUM。
- `ingredient`：字串。raw 最多 32 單元。必須是密度表 12 個 id 或 `none` 之一（大小寫敏感），否則 ENUM。

跨欄檢查（四欄逐欄檢查全過後才做）：恰有一邊是 `g`（另一邊是體積單位）且 `ingredient` 為 `none` 時，回 `{code:"INGREDIENT_REQUIRED", field:"ingredient", row:null}`。`g` 到 `g` 為恆等換算，不需要食材。

體積基準（全為整數，精確）：1 cup = 240 ml、1 tbsp = 15 ml、1 tsp = 5 ml。來源為 FDA 21 CFR 101.9(b)(5)(viii) 的家用量測定義（NIST Metric Kitchen 指南同列此組數值供家庭料理使用）。揭露：美國習慣單位的精確值是 1 cup = 236.588 ml、1 tbsp = 14.787 ml、1 tsp = 4.929 ml（NIST SP 811），本工具不採用；兩組定義下 1 cup = 16 tbsp、1 tbsp = 3 tsp 的比例皆精確。

密度表固定使用下列公克／杯數值。主要來源為 King Arthur Baking 食材重量表，奶油採同出版社教材的每杯值。乾貨以湯匙舀入量杯刮平（spooned & levelled）計，紅糖以壓實（packed）計。 [Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart)

| id | 繁中 | English | g/cup |
| --- | --- | --- | --- |
| water | 水 | Water | 227 |
| all-purpose-flour | 中筋麵粉 | All-Purpose Flour | 120 |
| granulated-sugar | 細砂糖 | Granulated Sugar | 198 |
| brown-sugar | 紅糖（壓實） | Brown Sugar (packed) | 213 |
| powdered-sugar | 糖粉 | Powdered Sugar | 113 |
| butter | 奶油 | Butter | 227 |
| vegetable-oil | 植物油 | Vegetable Oil | 198 |
| honey | 蜂蜜 | Honey | 336 |
| cocoa-powder | 可可粉（無糖） | Cocoa Powder (unsweetened) | 84 |
| milk | 牛奶 | Milk | 227 |
| long-grain-rice | 長米（生） | Long-Grain Rice (uncooked) | 198 |
| rolled-oats | 燕麥片 | Rolled Oats | 89 |

蜂蜜按重量表的 21 g／tbsp × 16 換算為 336 g／杯。水與牛奶使用重量表的 227 g／杯。燕麥片使用表中一般燕麥或快熟燕麥列的 89 g／杯，表中另列 King Arthur 品牌燕麥片 113 g／杯。 [Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart)

奶油採 King Arthur Baking《Easy As Pie》第 1 頁無鹽奶油的 227 g／杯。重量表另列半杯 4 oz／113 g，倍乘其已取整的公克數得到 226 g。工具採用教材直接列出的一杯值。 [Easy As Pie](https://shop.kingarthurbaking.com/content/class-pdfs/EasyAsPie_February2025.pdf#page=1)

模型將美國習慣杯的每杯重量套用到工具固定的 240 ml 杯，兩種杯量相差約 1.4%。例如純體積換算 1 杯等於 240 ml，選水做體積與重量換算則採 227 g／杯。

計算（精確有理數，不經浮點）：令 M(u) 為單位 u 的毫升數（ml=1、tsp=5、tbsp=15、cup=240），D 為所選食材的 g/cup。

1. 體積→體積：value = amount × M(from) / M(to)。
2. 體積→g：value = amount × M(from) × D / 240。
3. g→體積：value = amount × 240 / (D × M(to))。
4. g→g：value = amount。

成功回 `{ok:true,result}`，result 恰含五鍵：

- `value`：value 四捨五入（round half-up）至小數 2 位，只捨入一次，JSON 數字。
- `unit`：即 toUnit。
- `fractionText`：僅 toUnit 為 `cup` 時有值，否則 null。以未捨入的精確 value 計：eighths = floor(value × 8 + 1/2)；whole = eighths ÷ 8 商，rem = 餘數；rem = 0 時為 `"whole"`；whole = 0 時為約分後的 `"n/d"`；否則 `"whole n/d"`（rem/8 約分）。
- `ingredient`、`gramsPerCup`：實際查表的食材 id 與其 D；純體積、恆等與 g→g 換算不查表，兩者皆 null（即使畫面上選了食材）。

整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。錯誤訊息釘版：SCHEMA「資料格式不正確 / The data format is invalid」、INPUT_LIMIT「輸入超過長度上限 / Input exceeds the length limit」、UNICODE「輸入含有不完整的字元 / Input contains an unpaired character」、EMPTY「不可留空 / Must not be empty」、DECIMAL_FORMAT「請輸入數字（可含小數點）/ Enter a number, with an optional decimal point」、ENUM「請選擇有效的選項 / Choose a valid option」、RANGE「數值必須大於 0 且不超過 100,000 / Value must be greater than 0 and at most 100,000」、INGREDIENT_REQUIRED「重量與體積互換需要選擇食材 / Choose an ingredient to convert between weight and volume」、OUTPUT_LIMIT「報告超過大小上限 / The report exceeds the size limit」、INTERNAL 與 WORKER_ERROR「處理失敗，請重試 / Something went wrong. Try again.」。

固定下載 `cooking-measurement-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/cooking-measurement-converter/`。src/core.mjs 放純驗證、推導、格式化；核心以 BigInt 分子／分母做精確有理數運算，捨入與分數化簡皆在整數域完成，不依賴浮點。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。核心不讀 Date、不讀主機時區，結果與執行環境無關。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算」，畫面和完整報告符合核心 fixtures（含 14 筆成功值與分數表示），使用者取得對應產物。 |
| boundaries | 合法端點（100000、0.25、恆等換算）、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。20 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `example-cup-flour-to-grams` | 範例：1 杯麵粉＝120 g（查表） |
| `tbsp-sugar-to-grams` | 12.375 恰在半位，四捨五入至 12.38 |
| `tsp-to-ml-pure-volume` | 純體積不需食材 |
| `grams-butter-to-cup` | 227 g 奶油＝1 杯，分數為整數 |
| `grams-flour-to-cup-fraction` | 0.8333… 杯顯示 0.83 與 7/8 |
| `ml-to-tbsp` | 45 ml＝3 tbsp |
| `cup-water-to-ml` | 選了食材仍走純體積，ingredient 為 null |
| `grams-honey-to-tbsp` | 336 g 蜂蜜＝16 tbsp |
| `grams-rice-to-cup-half` | 99 g 長米＝1/2 杯 |
| `identity-grams-no-ingredient` | g→g 恆等，不需食材 |
| `ml-oil-to-grams` | 100 ml 植物油＝82.5 g |
| `cocoa-tsp-to-grams` | 3 tsp 可可粉＝5.25 g |
| `cup-to-tsp-quarter` | 0.25 cup＝12 tsp |
| `max-amount-boundary` | 數量上限 100000 與帶整數的分數 416 5/8 |
| `err-ingredient-required` | 跨重量／體積且食材 none |
| `err-decimal-format` | 兩個小數點 |
| `err-zero-range` | 0 合文法但出界 |
| `err-unit-enum` | oz 符合欄位容量但不在單位集合，回 ENUM |
| `err-unit-input-limit` | liter 超出來源單位容量，先回 INPUT_LIMIT |
| `err-input-limit` | 13 單元先於文法與範圍觸發 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限（100000.01 → RANGE、100001 → RANGE）、錯型別、額外欄、缺欄、accessor 不被呼叫、單獨 surrogate、`.5`／`5.`／`1e3` 文法拒絕、單位與食材 id 大小寫敏感（`Cup`、`Flour` → ENUM）、食材容量 32 單元邊界、惡意字串、快速改值及晚到訊息。驗證每列密度表至少被一筆成功案例或表值直查涵蓋；分數表示驗證 0、1/8、約分（2/8→1/4 由 eighths=2 構造）、進位成整數（eighths=8）與大整數帶分數。

候選 gate（均 NOT_RUN）

- 於 `tools/cooking-measurement-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「料理單位換算」，title「料理單位換算｜Gloss Tools」，description「把杯、湯匙、茶匙、毫升與公克互相換算；麵粉、糖、奶油等 12 種食材的重量換算只經一張固定密度表。」。英文 lang=en，H1 “Cooking Measurement Converter”，title “Cooking Measurement Converter | Gloss Tools”，description “Convert between cups, tablespoons, teaspoons, millilitres and grams, with weight conversions for 12 common ingredients through one fixed density table.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。這裡的 1 杯是幾毫升？釘版 240 ml（FDA 家用量測定義）；美國習慣單位的精確值是 236.588 ml，本工具不採用。 / How many millilitres is a cup here? A pinned 240 ml (the FDA household measure); the exact US customary cup is 236.588 ml and is not used.
- FAQ。為什麼 1 杯水不是 240 公克？工具採用 King Arthur Baking 食材重量表的 227 g／杯。純體積換算時，1 杯等於 240 ml。 / Why isn't a cup of water 240 grams? This tool uses King Arthur Baking’s ingredient weight chart value of 227 g per cup of water. For volume conversions, 1 cup equals 240 ml.
- FAQ。沒有我要的食材怎麼辦？重量與體積互換只能用表內 12 種食材；只換體積時選「不指定」即可，不需食材。 / What if my ingredient is not listed? Weight-to-volume conversion only works for the 12 table ingredients; for volume-only conversions choose "None".
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://cooking-measurement-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/cooking-measurement-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
