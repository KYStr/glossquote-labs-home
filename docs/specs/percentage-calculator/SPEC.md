# 百分比計算機 / Percentage Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-percentage-calculator-20261109` · 2026-11-09 · v1

[預案品質與補庫說明](../../SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

日常對帳與比價時，使用者反覆要回答三種百分比問題：某數的百分之幾是多少、一個數佔另一個數的百分之幾、從一個數到另一個數增減了多少百分比。目前只能開試算表逐格打公式，或用只支援單一算法、遇到除以零給出奇怪結果的線上小工具。

- 桌面。行政／會計人員在電腦上對帳：算一筆金額的 5%、某筆支出佔部門預算的百分比、本月金額比上月的增減百分比。
- 行動。消費者在店裡用手機看標價：特價品佔原價的百分之幾、從原價到特價跌了多少百分比。

使用情境為日常核對。資料只保留在目前頁面草稿。

## scope

MVP 必做：三種模式（`of` 求百分之幾的值、`share` 求佔比、`change` 求變化率）、兩個十進位運算元、精確十進位運算、固定的值與顯示捨入、除零固定錯誤、可下載 JSON 報告、雙語靜態頁。非目標為：反推原值（已知變化率或佔比反求基數）、百分點（percentage point）差、折扣／稅率預設與連續疊加計算（屬折扣計算機範疇）、多筆資料的統計或圖表、歷史紀錄、儲存、分享；數字無單位語意，不處理貨幣、稅制或四捨五入到分的規則。

已比對 registry、`docs/specs/` 全部預案及 `tools/`、`sources/` 現有工具，沒有 `percentage-calculator` 同名或同功能者。最相近者的實質差異如下。

- 對一組資料算加權百分位與分位統計。此處是單次兩個運算元的三種百分比關係，不是資料集統計。[weighted-percentile 預案](../weighted-percentile/SPEC.md)
- 以麵粉重量為 100 的烘焙配方比例。此處是通用百分比，運算元、情境與輸出語意都不同。[bakers-percentage-calculator 預案](../bakers-percentage-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「計算模式 / Calculation mode」：三選一段位控制（radio），值為 `of`、`share`、`change`，標籤見 tests 節。切換模式會使舊結果失效（進 dirty），但不清除已輸入的數字。
- 欄位或說明「數值 / Values」：兩個數字欄 `first`、`second`，標籤隨模式切換（見 tests 節的欄位標籤表）。模式切換只改標籤，不改欄位值。
- 「計算百分比 / Calculate percentage」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「計算結果 / Result」先顯示一句完整敘述（句型見 tests 節），再列精確值，`change` 模式另列方向標籤。`share`／`change` 的 display 後由頁面接固定後綴「%」，`of` 不接。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、模式、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果句與精確值對應同一快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"of","first":"20","second":"150"}` 並聚焦模式控制。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含確切欄位 `{mode, first, second}` 的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field、row 皆 null。JSON fixture 即介面。輸入以 DOM 的字串值為準，不修剪空白、不補猜單位或小數慣例。

1. `mode` 必須是字串且恰為 `of`、`share`、`change` 之一。缺欄或非字串依 SCHEMA；是字串但不在集合內回 MODE_INVALID，field 為 `mode`。
2. `first`、`second` 必須是字串（非字串依 SCHEMA）。每欄依序驗證，`first` 先於 `second`，第一個錯誤即整份失敗：
   - raw 長度（UTF-16 code units）超過 24 → INPUT_LIMIT。
   - 含未成對 surrogate → UNICODE。
   - 恰為空字串 → EMPTY。
   - 不符合十進位文法 → NUMBER_FORMAT。文法為 `^-?(0|[1-9][0-9]*)(\.[0-9]+)?$`，僅 ASCII。不接受空白、正號、千分位逗號、指數（`1e3`）、前置小數點（`.5`）、尾隨小數點（`5.`）、前導零（`007`）、百分號。
   - 絕對值大於 999,999,999,999 → RANGE（恰等於上限合法）。
   - `-0`、`-0.00` 合法且值為 0。
3. 除零以精確值判 0（含 `-0`、`0.00`）：`share` 且 second 為 0 → DIVISION_BY_ZERO，field 為 `second`；`change` 且 first 為 0 → DIVISION_BY_ZERO，field 為 `first`。`of` 不做除法，任一欄為 0 都合法。

整份失敗回 `{ok:false,error:{code,field,row}}`，本工具 row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

4. 計算以精確有理數進行，不經浮點。`of`：result ＝ first × second ÷ 100。`share`：result ＝ first ÷ second × 100。`change`：result ＝ (second − first) ÷ first × 100，字面套用；first 為負數時不另做正規化或取絕對值。
5. result 為 `{mode, value, display, direction}`：
   - `value`：精確結果以 half away from zero 捨入到小數第 10 位的正規字串。
   - `display`：**精確結果本身**（不是已捨入的 `value`）以 half away from zero 捨入到小數第 2 位的正規字串。禁止以 value 二次捨入得到 display。
   - `direction`：僅 `change` 有值。second 大於 first 為 `increase`，小於為 `decrease`，相等為 `none`；由 second − first 的精確正負決定，與 result 的正負號獨立（first 為負時兩者可不同，見 `change-negative-base`）。`of`、`share` 為 null。
   - 正規字串規則：小數去尾隨零；整數部分必有（`0.5` 不寫 `.5`）；小數點用 `.`；無千分位、無指數、無正號；零一律寫 `0`（無負號）；負數才有前置 `-`。`value`、`display` 皆不含 `%`，機器值不隨 locale 改。

頁面結果句中的 `{first}`、`{second}` 以正規化回顯代入：輸入值轉為與上述相同的正規字串（去小數尾隨零、`-0` 顯示 `0`、文法已驗證的形狀不變）。

固定下載 `percentage-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/percentage-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精確運算：每欄解析為（sign, BigInt mantissa, scale），值 ＝ sign × mantissa × 10^(−scale)。三種模式一律以 BigInt 有理數（分子／分母）完成，不得經浮點數。`value` 與 `display` 的捨入在有理數上以「2×餘數與分母比較」實作 half away from zero；`display` 從精確有理數直接捨入，不得讀取已捨入的 `value`。`direction` 以 BigInt 比較 second − first 的正負。核心不得以 Number 表示運算元或結果（字串長度與索引除外）。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換模式、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 畫面與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算百分比」，三種模式的畫面結果句、精確值和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（絕對值恰 999,999,999,999、raw 恰 24 字元）、剛好越界、除零兩欄、第一個錯誤、欄位驗證順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、切換模式、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。21 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `percent-of-basic` | 首個可觀察案例：20% 的 150 = 30 |
| `percent-of-decimal` | 小數百分比，精確值 66.3267、display 捨入到 2 位 |
| `display-tie-half-up` | 精確值 2.525 的 display 同點進位 |
| `of-zero-base` | of 模式基數為 0 合法，結果 0 |
| `share-basic` | 45 是 180 的 25% |
| `share-repeating-down` | 1/3 循環小數，10 位捨去、display 33.33 |
| `share-repeating-up` | 2/3 循環小數，10 位進位、display 66.67 |
| `change-increase` | 80 到 100，+25，increase |
| `change-decrease` | 250 到 190，−24，decrease |
| `change-repeating` | 190 到 250，循環小數的 value 與 display |
| `change-none` | 兩值相等，0 且 direction none |
| `change-negative-base` | 原始值為負，字面公式得 −150 且 direction increase |
| `share-division-by-zero` | share 的全部為 0，DIVISION_BY_ZERO／second |
| `change-division-by-zero` | change 的原始值為 0，DIVISION_BY_ZERO／first |
| `number-format` | 千分位逗號不接受 |
| `empty-field` | 空字串 EMPTY |
| `input-limit` | raw 25 字元 INPUT_LIMIT |
| `range-overflow` | 10^12 超出絕對值上限 RANGE |
| `mode-invalid` | 未知模式字串 MODE_INVALID |
| `unknown-field` | 額外欄位 SCHEMA |
| `first-error-wins` | 兩欄皆錯，只回先驗證的 first |
| `state-dirty-error` | 先產出真結果，再改為除零輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（絕對值恰 999,999,999,999、raw 恰 24 字元）、文法邊界（`0.5` 合法；`.5`、`5.`、`007`、`+5`、`1e3`、` 5`、`50%` 不合法）、`-0` 與 `0.00` 的除零判定、錯型別、缺欄、accessor、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 display 不經 value 二次捨入：構造精確值在 10 位捨入後跨過 2 位同點的案例（例如精確值 2.3449999999999），display 必須依精確值給 2.34，不得因 value 先進位成 2.345 再給 2.35。

候選 gate（均 NOT_RUN）

- 於 `tools/percentage-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、切換模式、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「百分比計算機」，title「百分比計算機｜Gloss Tools」，description「三種百分比一次算清：某數的百分之幾、佔了百分之幾、從 A 到 B 增減了多少百分比；精確十進位計算，不上傳。」。英文 lang=en，H1 “Percentage Calculator”，title “Percentage Calculator | Gloss Tools”，description “Three everyday percentage questions in one place: X% of a number, a share as a percentage, and percentage change, computed exactly on your device.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 模式標籤：`of`「百分之幾是多少 / Percent of a number」；`share`「佔多少百分比 / Share as a percentage」；`change`「百分比變化 / Percentage change」。
- 欄位標籤：`of` 的 first「百分比（%）/ Percentage (%)」、second「基數 / Base number」；`share` 的 first「部分 / Part」、second「全部 / Whole」；`change` 的 first「原始值 / Starting value」、second「新值 / New value」。
- 方向標籤：increase「增加 / Increase」；decrease「減少 / Decrease」；none「不變 / No change」。
- 結果句型（`{first}`、`{second}` 為正規化回顯，`{display}` 為核心 display，`{direction}` 為方向標籤）：`of`：「{first}% 的 {second} 是 {display}」／ “{first}% of {second} is {display}”；`share`：「{first} 是 {second} 的 {display}%」／ “{first} is {display}% of {second}”；`change`：「從 {first} 到 {second}，變化 {display}%（{direction}）」／ “From {first} to {second}: {display}% ({direction})”。
- 錯誤訊息（繁中／英文）：SCHEMA「輸入格式不正確。／ The input is malformed.」；MODE_INVALID「請選擇計算模式。／ Choose a calculation mode.」；INPUT_LIMIT「輸入太長。／ The input is too long.」；UNICODE「輸入含有不完整的文字字元。／ The input contains an incomplete text character.」；EMPTY「此欄不可空白。／ This field is required.」；NUMBER_FORMAT「請輸入十進位數字，例如 12.5。／ Enter a decimal number, such as 12.5.」；RANGE「數值超出允許範圍（絕對值最多 999,999,999,999）。／ The number is outside the allowed range (absolute value up to 999,999,999,999).」；DIVISION_BY_ZERO 依 field 選句，first「原始值不可為 0。／ The starting value cannot be zero.」、second「全部不可為 0。／ The whole cannot be zero.」；INTERNAL／WORKER_ERROR「計算失敗，請重試。／ Something went wrong. Try again.」；OUTPUT_LIMIT「報告太大，無法下載。／ The report is too large to download.」。
- FAQ。百分比變化怎麼算？（新值 − 原始值）÷ 原始值 × 100；原始值為 0 時無法計算。 / How is percentage change calculated? (new − start) ÷ start × 100; a starting value of zero cannot be used.
- FAQ。畫面為什麼只顯示兩位小數？畫面把精確結果四捨五入到兩位並去掉尾隨零；下載報告保留十位小數的值。 / Why does the page show two decimals? The page rounds the exact result to two decimals and trims trailing zeros; the downloadable report keeps the ten-decimal value.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://percentage-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 id 為 `labs-percentage-calculator-spec-20261109`，由主代理（parent）登記，作者不自行執行 registry 操作。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/percentage-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
