# 骰子模擬器 / Dice Roller

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-dice-roller-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

桌遊、TRPG 與程式測試的使用者需要擲骰時，要的是一個能立刻給出每顆骰子結果、而且事後能重現核對的工具：輸入 `2d6+3` 這樣的骰式，逐顆看到擲出的點數、修正值與總和；把同一個種子再輸入一次，得到完全相同的一組結果，可以拿來對帳、寫測試或向同桌玩家證明沒有重擲。

- 桌面。跑團主持人或測試工程師在瀏覽器輸入骰式與種子，逐顆核對結果並下載 JSON 報告留存。
- 行動。玩家在手機上臨時擲一組骰，種子留空由工具自動產生並顯示，日後可重現。

使用情境為決定性假隨機的擲骰模型。資料只保留在目前頁面草稿。

## scope

MVP 必做：單一骰式欄位（`NdM` 文法，可加 `+K`／`-K` 修正）加一種子欄位；種子化 mulberry32（位元級釘版，與本廠 lottery-number-picker 產品核心及 group-generator 規格相同）；每顆骰恰取一次亂數、依擲出順序輸出每顆結果、修正值、骰面總和與含修正的總和；固定 JSON 報告下載。種子留空時由 app 層以密碼學隨機填入並顯示，核心永遠不自產種子。

非目標：機率分布摘要、直方圖或理論機率（屬既有 `dice-sum-distribution` 的範圍）；平均、最大、最小等由結果衍生的統計顯示；擲骰動畫或音效；多組骰式、不同面數混骰（如 `2d6+1d20`）；爆骰（exploding）、保留／丟棄最高最低（keep/drop）、重擲等進階規則；擲骰歷史、儲存、分享或同步；賭博賠率建議或實體骰公平性主張。

資料與性能界線：骰數 N 1–100、面數 M 2–1000、修正絕對值 |K| ≤ 10000、種子為 uint32。最壞情況（100 顆）一次擲骰僅 100 次取數，同步完成。判定規則由本文定義，無線上資料或外部服務依賴；無日期、時間或時區輸入，結果與主機時區無關。

已與本 repo 既有規格、產品與來源快照比對，最相近者的實質差異如下。

- 骰子和的精確機率分布（`dice-sum-distribution`）：計算 NdM 所有可能總和的理論次數與精確分數機率，不使用亂數、不實際擲骰。本案相反：實際以種子化 PRNG 逐顆擲出一次結果，不提供任何分布或機率輸出。兩者互補，不重疊。
- 從號碼池以種子抽出號碼組合（產品 `tools/lottery-number-picker/`）：抽取是無放回的部分 Fisher–Yates 洗牌並排序輸出；本案是每顆獨立擲骰（有放回語義）、結果不排序、保留擲出順序。本案的 PRNG 定義、種子欄文法與「核心不自產種子、app 填入並顯示」契約即沿用其釘版，使全廠隨機工具行為一致。
- 隨機分組（`group-generator` 規格）：同樣釘版 mulberry32，但用途是洗牌名單後 round-robin 發牌，不擲骰。本案沿用同一 PRNG 定義，不更動其任何規則。
- 從清單隨機抽出單一選項（`decision-wheel-picker`）：抽單一贏家，不解析骰式、不逐顆輸出。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「骰式 / Dice notation」，說明「格式 NdM，可加 +K 或 -K，例如 2d6+3 / Format NdM with optional +K or -K, e.g. 2d6+3」
- 欄位或說明「種子 / Seed」，說明「留空時會自動產生一個種子並顯示出來，之後可用同一種子重現。/ Leave blank to have a seed generated and shown; reuse it to reproduce the same roll.」
- 「擲骰 / Roll dice」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。種子留空按「擲骰」時，app 先以密碼學隨機產生一個 uint32 種子、寫回種子欄顯示，再以該種子執行；該次執行快照含填入後的種子。
- 「每顆骰子與總和 / Dice and total」先摘要（正規化骰式、種子、總和）再依擲出順序列出每顆點數，修正值不為 0 時另列修正與骰面總和。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用位置。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"notation":"2d6","seed":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。明示檔案欄才處理原始 bytes；本工具無檔案欄。

輸入欄位（驗證順序即此順序，先 notation 後 seed）：

- `notation`：骰式字串，raw 最多 32 個 UTF-16 單位。預設 `2d6`。
- `seed`：種子字串，raw 最多 10 個 UTF-16 單位。預設空字串；空字串只允許出現在草稿，app 執行前必先填入（見 userFlow），核心收到空種子回 EMPTY。

整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。下文另有明示者，錯誤物件才多帶一個鍵：NOTATION 帶 `position`，notation 的 RANGE 帶 `component`。其餘錯誤不得多帶鍵。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

notation 欄驗證（依序，先欄位管線、後文法、再逐元件範圍）：

1. 容量：raw 長度 > 32 → INPUT_LIMIT。
2. 不成對 surrogate → UNICODE。
3. raw 為空字串 → EMPTY。
4. 文法掃描（位置皆為 0-based UTF-16 索引；不修剪、不允許任何空白或其他字元介於元件之間）：
   - countDigits：自索引 0 起的極大 `[0-9]*` 連續段（可為空）。
   - 其後必須是 `d` 或 `D`：索引已達字串結尾，或該字元不是 `d`/`D` → NOTATION，position 為該索引（結尾時為字串長度）。
   - 越過 `d`/`D` 後，sidesDigits 為極大 `[0-9]*` 連續段；若為空 → NOTATION，position 為目前索引（結尾時為字串長度，否則為該非數字字元的索引）。
   - 若尚未結尾：該字元必須是 `+` 或 `-`，否則 → NOTATION，position 為該索引。記下正負號後越過它，modifierDigits 為極大 `[0-9]*` 連續段；若為空 → NOTATION，position 為目前索引（規則同 sidesDigits）。
   - 掃描結束後索引未達字串結尾 → NOTATION，position 為該索引（尾隨字元）。
   - 全形數字、NUL、控制字元、空白與任何其他字元都只是不匹配字元，依上開規則在首次出現處回 NOTATION 與其 position。
5. 元件範圍（掃描全數通過後才檢查，依 count → sides → modifier 順序；任一元件的數字段長度 > 10 位 → 該元件直接 RANGE，不轉值）：
   - count：數字段為空時值為 1，否則為其十進位值（前導零允許，如 `007d6` 即 7 顆）；值須 1–100，否則 RANGE，component=`"count"`。
   - sides：十進位值須 2–1000，否則 RANGE，component=`"sides"`。
   - modifier：無修正段時值為 0；有修正段時為正負號乘以數字段值（前導零允許，`+0`、`-0` 皆為 0），絕對值須 ≤ 10000，否則 RANGE，component=`"modifier"`。

seed 欄驗證（依序）：

1. 容量：raw 長度 > 10 → INPUT_LIMIT。
2. 不成對 surrogate → UNICODE。
3. raw 為空字串 → EMPTY。
4. 文法：須符合 `^(0|[1-9][0-9]*)$`（無空白、符號、小數、指數、前導零），否則 INTEGER_FORMAT。
5. 範圍：值須 0–4294967295，否則 RANGE（seed 的 RANGE 不帶 component）。

PRNG（mulberry32，位元級釘版，與 `tools/lottery-number-picker/public/js/core/lottery.mjs` 的 `createPrng` 及 group-generator 規格所釘者完全相同）。狀態 state 為 uint32，初值 = 種子。每取一次：

- state ← (state + 0x6D2B79F5) mod 2^32；t ← state。
- t ← imul32(t XOR (t >>> 15), t OR 1)。
- t ← t XOR ((t + imul32(t XOR (t >>> 7), t OR 61)) mod 2^32)。
- 分子 k ← (t XOR (t >>> 14)) mod 2^32；回傳 r = k / 2^32，r ∈ [0, 1)。

所有位移為邏輯（無號）32 位元位移；imul32 為乘積的低 32 位元（JavaScript 以 `Math.imul` 與 `>>> 0` 實作）。抽取順序即契約，任何重排、預抽或丟棄都是缺陷。

擲骰演算法（釘版，無自由度）：以種子建立 PRNG 後，對第 i 顆骰（i = 1..N）恰呼叫一次 next()，得分子 k_i，該顆點數 = 1 + floor(k_i × M / 2^32)。k_i × M ≤ (2^32 − 1) × 1000 < 2^42，為精確整數，floor 以精確算術判定、無浮點歧義。不做拒絕取樣、不重擲、不排序；rolls 依擲出順序排列。骰面總和 sum = Σ rolls（最大 100 × 1000 = 100,000，精確整數）；total = sum + modifier，可為負，不夾限。

結果 `{expression, count, sides, modifier, seed, rolls, sum, total}`：

- `expression`：正規化骰式字串 `${count}d${sides}`（小寫 d、數值無前導零），modifier > 0 時加 `+${modifier}`、< 0 時加 `-${-modifier}`、= 0 時不加。
- `count`、`sides`、`modifier`（帶正負號，缺省 0）、`seed` 皆為數值；`rolls` 為點數陣列；`sum`、`total` 為整數。機器值不隨 locale 改。

固定下載 `dice-roller-report.json`，僅成功時提供。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

錯誤與狀態訊息（釘版雙語；`{n}` 為 NOTATION 的 position + 1，即 1-based 字元序）：

| code / 狀態 | 繁中 | English |
| --- | --- | --- |
| SCHEMA | 輸入格式不正確。 | Input is malformed. |
| INPUT_LIMIT | 輸入太長。 | Input is too long. |
| UNICODE | 輸入含有不完整的字元。 | Input contains an incomplete character. |
| EMPTY（notation） | 請輸入骰式。 | Enter dice notation. |
| EMPTY（seed） | 種子不可空白。 | Seed must not be blank. |
| NOTATION | 骰式格式不正確，請檢查第 {n} 個字元。 | Dice notation is invalid. Check character {n}. |
| RANGE（count） | 骰子數量必須介於 1 到 100。 | Dice count must be between 1 and 100. |
| RANGE（sides） | 骰子面數必須介於 2 到 1000。 | Sides per die must be between 2 and 1000. |
| RANGE（modifier） | 修正值必須介於 -10000 到 10000。 | Modifier must be between -10000 and 10000. |
| RANGE（seed） | 種子必須介於 0 到 4294967295。 | Seed must be between 0 and 4294967295. |
| INTEGER_FORMAT（seed） | 請輸入不含空白、符號或小數的十進位整數。 | Enter a decimal integer with no spaces, sign, decimals or exponent. |
| OUTPUT_LIMIT | 報告太大，無法下載。 | The report is too large to download. |
| INTERNAL | 處理失敗，請重試。 | Something went wrong. Try again. |
| dirty | 輸入已變更，請重新執行 | Input changed. Run again. |
| busy | 處理中 | Working |
| cancelled | 已取消，可重新執行 | Cancelled. You can run again. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/dice-roller/`。src/core.mjs 放純驗證、PRNG、擲骰與格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- app 層種子填入只發生在使用者明確執行且種子欄為空時：以 `crypto.getRandomValues` 取一個 uint32、寫回種子欄並納入該次快照；核心不呼叫任何隨機來源。Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「擲骰」，畫面和完整報告符合核心 fixtures（含同種子重現相同 rolls），使用者取得對應產物。 |
| boundaries | 合法端點（1d2、100d1000、修正 ±10000、種子 0 與 4294967295）、剛好越界、第一個錯誤、NOTATION 位置與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。21 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `example-2d6` | 範例：2d6、種子 42，逐顆 4、3 |
| `modifier-plus` | 同種子同骰數，rolls 與範例相同，僅總和加修正 |
| `implicit-count-d20` | 省略骰數預設 1 顆，正規化為 1d20 |
| `negative-modifier` | 負修正可使總和為負，不夾限 |
| `uppercase-d` | 大寫 D 接受，正規化為小寫 d |
| `seed-zero` | 種子 0 合法且決定性 |
| `caps-max` | 骰數、面數、修正、種子四項同時達上限 |
| `empty-notation` | 骰式空白回 EMPTY |
| `notation-missing-sides` | `2d` 結尾缺面數，NOTATION 位置為字串長度 |
| `notation-bad-character` | `2x6` 在 x 處回 NOTATION |
| `notation-space` | 骰式內空白不修剪，回 NOTATION |
| `notation-double-sign` | `2d6++3` 第二個正號回 NOTATION |
| `count-zero` | 骰數 0 回 RANGE/count |
| `count-over-cap` | 骰數 101 回 RANGE/count |
| `sides-below-min` | 面數 1 回 RANGE/sides |
| `sides-over-cap` | 面數 1001 回 RANGE/sides |
| `modifier-over-cap` | 修正 10001 回 RANGE/modifier |
| `notation-too-long` | 骰式超過 32 單位先回 INPUT_LIMIT |
| `seed-empty-core` | 核心收到空種子回 EMPTY（核心不自產種子） |
| `seed-leading-zero` | 種子前導零回 INTEGER_FORMAT |
| `seed-over-range` | 種子 4294967296 回 RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證種子 0 與最大種子、N=1 省略與明示等價（`d20` 與 `1d20` 同種子同結果）、modifier 存在但為 0 時正規化骰式不帶修正段、同快照重複執行結果逐位元相同。所有 rolls 皆在 1..M 內且長度恰為 N，sum 為 rolls 的算術和，total = sum + modifier。

候選 gate（均 NOT_RUN）

- 於 `tools/dice-roller/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「骰子模擬器」，title「骰子模擬器｜Gloss Tools」，description「輸入 NdM 骰式與可重現種子，逐顆擲出每顆骰子的結果與總和；同一種子永遠擲出同一組結果。」。英文 lang=en，H1 “Dice Roller”，title “Dice Roller | Gloss Tools”，description “Roll dice from NdM notation with a reproducible seed: per-die results in order plus the total — the same seed always rolls the same dice.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。`d20` 是什麼意思？只寫 d 和面數時，骰子數量預設為 1，所以 d20 就是擲一顆 20 面骰。 / What does "d20" mean? With no count, the count defaults to 1 — one 20-sided die.
- FAQ。為什麼同一種子擲出同樣結果？本工具使用 mulberry32 假隨機產生器，結果完全由種子決定，方便重現與核對。 / Why does the same seed roll the same dice? The tool uses the mulberry32 pseudorandom generator; results are fully determined by the seed, so any roll can be reproduced and checked.
- FAQ。種子留空會怎樣？執行時會以密碼學隨機產生一個種子並顯示在欄位中，之後可用同一種子重現。 / What happens if the seed is blank? At run time a cryptographically random seed is generated and shown in the field; reuse it to reproduce the roll.
- FAQ。這是真隨機嗎？不是；這是決定性的假隨機，適合桌遊、教學與程式測試，不應用於賭博或安全用途。 / Is this true randomness? No. It is deterministic pseudorandom output, fine for games, teaching and testing — not for gambling or security.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://dice-roller.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/dice-roller/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
