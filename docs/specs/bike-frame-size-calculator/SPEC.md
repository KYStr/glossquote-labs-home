# 單車車架尺寸計算 / Bike Frame Size Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-bike-frame-size-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

買車的人站在車店或網購頁面前，手上有兩個量到的數字——身高與跨高（inseam，書本法量測）——想知道該買幾公分的車架。沒有尺寸概念的人常犯兩個錯：只看身高對照表（同身高腿長可差 5 公分以上），或只拿到一個整數車架尺寸（例如「54 公分」）就以為是唯一答案，買回來才發現品牌標示方式不同、或落在兩個尺寸之間。

- 桌面。桌面填身高、跨高、選車型，一次看到三件事：建議車架尺寸中心值、建議範圍（公分與英吋對照）、對應尺碼字母，外加起始座墊高度與量測異常提醒，拿去對品牌尺寸表。
- 行動。手機在車店現場量完跨高，輸入後直接讀建議範圍，不啟動任何工作。

使用情境為購車前的尺寸起點估算，不是專業 fitting。資料只保留在目前頁面草稿。

## scope

身高＋跨高 → 三種車型（公路車 road、登山車 mountain、混合車 hybrid）的車架尺寸起點，公式與換算表釘版於 §4，出處具名。非目標為專業 bike fitting、stack／reach／上管長幾何、座墊前後／龍頭長度微調、童車輪徑選型、電動車／小折等其他車種、品牌即時庫存、售價或線上購買。

已與既有預案比對，最相近者的實質差異如下。

- running-pace-calculator（運動表現計算）：由運動距離與時間求配速、分段表，並以 Riegel 模型預測其他距離的完賽時間。本件不算速度、不算時間、不預測運動表現；它是購車前的車架幾何選型：由身體尺寸選車架尺寸。
- bicycle-gear-table（`spec-bicycle-gear-table-20261109`）：由前後齒數算齒比、每踩一圈的前進量與理論速度，是傳動系統的機械比。本件不碰齒輪、踏頻或速度；它是車架尺寸，與傳動無關。
- 另查 `docs/specs/` 與 registry，未見同名或同義的 bike-frame-size 預案；本件為新增缺口，不是改名重複。

判定規則由本文定義，無線上資料或外部服務依賴。所有尺寸皆為「建議起點」：品牌幾何不同，最終以品牌尺寸表與實車試騎為準，頁面必須在結果旁明示此句。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「身高 / Height」
- 欄位或說明「跨高（書本法） / Inseam (book method)」
- 欄位或說明「車型 / Bike type」：公路車／登山車／混合車三選一
- 「計算建議尺寸 / Calculate frame size」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「建議車架尺寸 / Recommended frame size」先摘要（中心值＋建議範圍＋尺碼字母）再列細節：公分與英吋對照、起始座墊高度、量測提醒。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"heightCm":"175","inseamCm":"80","bikeType":"road"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `heightCm`、`inseamCm`：ASCII 十進小數字串，可含一位小數，不可含空白／符號／指數；raw 每欄最多 6 單元。身高 120–220 公分，跨高 50–110 公分。
- `bikeType`：`road`、`mountain`、`hybrid` 三者之一，小寫 ASCII。
- 預設 heightCm 175、inseamCm 80、bikeType road。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

錯誤碼：`INPUT_LIMIT`（raw 超限）、`EMPTY`（缺內容）、`DECIMAL_FORMAT`（非數字、超過一位小數、或含空白／符號／指數）、`RANGE`（超出範圍或跨高大於身高）、`ENUM`（bikeType 不在三者之內）。

1. 依 heightCm、inseamCm、bikeType 順序驗證各欄：raw 超限 INPUT_LIMIT、缺內容 EMPTY、文法 DECIMAL_FORMAT、範圍 RANGE、列舉 ENUM，field 即上述欄名。
2. 跨欄：若 inseamCm > heightCm，回 RANGE，field 為 `inseamCm`。
3. 釘版公式（中心值，未捨入的中間值參與後續運算）：
   - 公路車：`roadCm = inseamCm × 0.67`。出處：Cyrille Guimard 於 1980 年代提出的公路車架公式，見 OmniCalculator〈Bike Size Calculator〉（https://www.omnicalculator.com/sports/bike-size），2026-11-21 核實。
   - 混合車（城市／旅行幾何）：`hybridCm = inseamCm × 0.64`。出處：同頁 trekking／city 車架公式（`inseam × 0.64`）。
   - 登山車：`mountainCm = roadCm − 11`，即 `inseamCm × 0.67 − 11`。出處：同頁登山車公式（公路車架減 11 公分，保留越野跨越間隙）。
   - 起始座墊高度（LeMond 法）：`saddleHeightCm = inseamCm × 0.883`，由五通中心沿座管量至座墊頂。出處：Greg LeMond 普及的座墊高度法，同頁及 Icebike 尺寸指南（https://www.icebike.org/bike-size-chart-how-to-choose-the-perfect-bicycle/）均載明 0.883。
   - 英吋換算：`1 in = 2.54 cm`（精確值）。`centreIn = centreCm ÷ 2.54`；英吋欄是公分中心值的算術換算對照，不是店家英吋標示——公路車與混合車在店家本來就不用英吋標示，登山車現代品牌也多改用尺碼字母；頁面必須在英吋欄旁標註「換算對照」。
4. 建議範圍：`rangeCm = [centreCm − 1.0, centreCm + 1.0]`（未捨入的中心值加減 1.0 公分）；`rangeIn` 端點為 rangeCm 端點各除以 2.54。輸出永遠是範圍，不是單一數字。
5. 尺碼字母：由身高查下表（半開區間，單位公分；合併 RoadBikeRider 公路車身高表 https://www.roadbikerider.com/bike-size-chart/ 與 Icebike 身高表，兩表在 170–178 → M、178–185 → L 等列一致，邊界取半開區間釘版）：

   | 身高 | 字母 |
   | --- | --- |
   | < 150 | XXS |
   | 150–<160 | XS |
   | 160–<168 | S |
   | 168–<178 | M |
   | 178–<185 | L |
   | 185–<193 | XL |
   | ≥ 193 | XXL |

   字母是身高的對照，不是車架公分的對照；腿長比例異常的騎士，字母與公分尺寸可能指向不同級距，這正是兩者並列的原因。
6. 量測提醒：`ratio = inseamCm ÷ heightCm`。ratio 在 [0.40, 0.50] 含端點內無提醒；超出則 warning 為 `{"code":"INSEAM_RATIO","ratio":<ratio 捨入至小數 3 位>}`，並顯示「跨高佔身高比例異常，請重新量測跨高（書本法） / Unusual inseam-to-height ratio. Re-measure your inseam with the book method.」。提醒不阻擋結果。典型書本法跨高約為身高的 45.5–46.5%（Icebike），提醒帶取較寬的 40–50% 以免誤報。
7. 捨入：半入（round half up，0.5 向上）至小數 1 位，只在輸出時套用；範圍端點由未捨入的中心值算出後再各自捨入；ratio 捨入至小數 3 位。無浮點誤差容忍：中間值以十進位精確運算，測試以字面值深度比對。

結果 shape：

```json
{"ok":true,"result":{"bikeType":"road","heightCm":175,"inseamCm":80,"centreCm":53.6,"centreIn":21.1,"rangeCm":{"low":52.6,"high":54.6},"rangeIn":{"low":20.7,"high":21.5},"letter":"M","saddleHeightCm":70.6,"warning":null}}
```

固定下載 `bike-frame-size-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

下列已核實的異說一律不採用，builder 不得替換係數：公路車另有 0.70 的刊載係數、登山車另有 inseam × 0.66（公分）與 inseam × 0.226（英吋）兩種算法、混合車另有 0.685／0.68 的係數。沒有任何標準機構制定這些係數（Icebike、ToolFigure 均明言此點），各家算法彼此並不一致（例如 inseam 80 公分時，0.66 公分法得登山車 52.8 公分，與 road−11 法的 42.6 公分相差整整一個以上級距）。本件釘版 Guimard 系單一自洽家族（公路車 0.67、混合車 0.64、登山車 road−11），並在 AUTHOR-CHECK.md 記錄此取捨。

跨高量測法（頁面必須附量測說明）：赤腳、背貼牆、雙腳相距約 15–20 公分，將硬皮書書脊朝上、用座墊般的力道上推至胯下，量地面至書脊頂的距離，量兩次取平均。褲子內長比騎乘跨高短約 1–2 英吋，不可直接代入。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/bike-frame-size-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算建議尺寸」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。9 個字面核心案例、3 個字面錯誤案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `road-typical` | 典型公路車：80 公分跨高 → 53.6 公分，範圍 52.6–54.6 公分 |
| `mtb-typical` | 同組數字登山車：road−11 → 42.6 公分 |
| `hybrid-typical` | 同組數字混合車：×0.64 → 51.2 公分 |
| `road-small` | 較矮騎士公路車，字母 S |
| `road-tall` | 較高騎士公路車，字母 XL |
| `mtb-tall` | 較高騎士登山車，中心值捨入邊界（47.96 → 48.0） |
| `hybrid-short` | 較矮騎士混合車，字母 XS |
| `road-min-inseam` | 跨高下限 50 公分＋比例提醒（ratio 0.294） |
| `road-max` | 身高／跨高上限，ratio 恰為 0.50 不提醒 |
| `inseam-below-min` | 跨高 49 公分 → RANGE |
| `height-two-decimals` | 身高兩位小數 → DECIMAL_FORMAT |
| `bike-type-gravel` | 車型 gravel → ENUM |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 height==120／220、inseam==50／110、inseam==height、ratio==0.40／0.50 含端點不提醒、ratio==0.399／0.501 提醒、三種車型同一跨高的中心值關係（road > hybrid > mountain，且 road − mountain == 11.0 公分未捨入值）。所有已接受的範圍端點皆為 centre ± 1.0 公分。

候選 gate（均 NOT_RUN）

- 於 `tools/bike-frame-size-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「單車車架尺寸計算」，title「單車車架尺寸計算｜Gloss Tools」，description「輸入身高與跨高，算出公路車、登山車、混合車的建議車架尺寸範圍（公分與英吋對照），再對品牌尺寸表與實車試騎確認。」。英文 lang=en，H1 “Bike Frame Size Calculator”，title “Bike Frame Size Calculator | Gloss Tools”，description “Enter your height and inseam to get a recommended frame-size range in centimetres and inches for road, mountain and hybrid bikes, then confirm against the brand size chart and a test ride.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。這個尺寸可以直接下單嗎？不行，這是建議起點；品牌幾何不同，最終以品牌尺寸表與實車試騎為準。 / Can I order this size directly? No — this is a starting point. Brands differ in geometry; confirm against the brand size chart and a test ride.
- FAQ。英吋欄是店家標示的尺寸嗎？不是，它是公分中心值的算術換算對照；公路車與混合車在店家本來就不用英吋標示。 / Is the inch figure the shop size? No — it is the arithmetic conversion of the centimetre figure. Road and hybrid bikes are not sold by inches in shops.
- FAQ。褲子內長可以直接填嗎？不行，褲子內長比騎乘跨高短約 1–2 英吋；請用書本法重新量測。 / Can I enter my trouser inseam? No — a trouser inseam runs about 1–2 inches shorter than a cycling inseam. Re-measure with the book method.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://bike-frame-size.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/bike-frame-size-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
