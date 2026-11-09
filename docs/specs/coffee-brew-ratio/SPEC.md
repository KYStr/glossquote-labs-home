# 手沖咖啡沖煮比例 / Coffee Brew Ratio Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-coffee-brew-ratio-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/a4b56dd2fc686a3622d804ce874aeb99d259ab2b/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

在家手沖咖啡的人，在注水前先把比例換算與分段注水目標一次算清，照著電子秤注水，不必邊倒邊心算。

- 廚房。以粉量計算：輸入粉量與比例，得到總水量、悶蒸水量與四段累計目標。
- 廚房。以水量計算：水壺或杯量先決定總水量時，回推該秤的粉量，其餘輸出相同。
- 行動。手機立在流理台旁，單手切換模式、點比例預設，即可開始照表注水。

使用情境為家庭手沖。資料只保留在目前頁面草稿。水量以 1 ml ≈ 1 g 計，與電子秤讀數直接對應。

## scope

MVP 必做：兩種模式（以粉量／以水量）互解粉量與總水量；比例預設 1:12、1:13、1:14、1:15、1:16、1:17、1:18 與自訂（核心範圍 1:10.0–1:20.0）；悶蒸水量＝粉量×悶蒸倍數（預設 2 倍，可改 0.0–5.0）；注水表固定為悶蒸＋3 段注水，給每段注水量與累計目標，最後一段累計恆等於總水量。所有克／毫升輸出固定一位小數。

非目標：沖煮計時器或秒錶、水溫／研磨刻度／攪拌建議、萃取率與 TDS 計算、配方儲存／歷史／帳號／分享、冰沖與浸泡式（法壓、聰明杯、虹吸）流程、注水段數自訂（固定 3 段）、匯出或下載檔案、把結果當成專業萃取認證。

已與 base commit `a4b56dd2` 的 docs/specs/ 101 份預案、tools/、sources/candidates/、sources/legacy/ 比對，最相近者的實質差異如下。

- 食譜份量縮放：把一份食材清單依倍率整表縮放。此處沒有食材清單，而是以 1:R 比例雙向求解粉與水兩個量，再拆出悶蒸與分段注水表。來源為 legacy 快照 `sources/legacy/recipe-scaler`（原 repo `KYStr/glossquote-labs-recipe-scaler`）。
- 烘焙百分比（`docs/specs/bakers-percentage-calculator/`）：以麵粉重為 100% 表達麵團各成分占比。此處是沖煮用水對粉的倍數求解與注水排程，領域與輸出皆不同。

判定規則由本文定義，無線上資料或外部服務依賴。比例慣例為咖啡界通用的「1 克粉對 R 克水」。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「計算模式 / Calculation mode」：兩個 radio，「以粉量計算 / By coffee dose」與「以水量計算 / By water amount」。切換模式只改數量欄的標籤與單位，不清空其他欄位。
- 欄位或說明「咖啡粉量（克） / Coffee dose (g)」或「總水量（毫升） / Total water (ml)」：單一數量欄，標籤隨模式切換。
- 欄位或說明「沖煮比例 / Brew ratio」：預設按鈕 1:12–1:18 七顆，另有比例數字欄供自訂；點預設即把該整數寫入比例欄，自訂就是直接改比例欄。比例欄永遠是唯一真值來源。
- 欄位或說明「悶蒸倍數 / Bloom multiplier」：數字欄，預設 2，附說明「悶蒸水量＝粉量×倍數 / Bloom water = dose × multiplier」。
- 「計算沖煮表 / Calculate brew plan」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「粉量、水量與分段注水 / Dose, water and pour schedule」先摘要（粉量、總水量、比例）再列四段表：段次、本段注水、累計目標。文字可手動選取。本工具沒有下載產物。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、模式、預設或範例改變，立即撤銷舊結果。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。編輯終止舊工作並回 dirty。 |
| success | 結果對應目前快照。摘要與四段表完整顯示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"dose","amount":"20","ratio":"15","bloomMultiplier":"2"}` 並聚焦模式欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `mode`：字串，恰為 `"dose"` 或 `"water"`。
- `amount`：ASCII 十進小數字串，語法見下。dose 模式表咖啡粉量，範圍 1.0–200.0 g；water 模式表總水量，範圍 10.0–4000.0 ml。
- `ratio`：ASCII 十進小數字串，表 1:R 的 R，範圍 10.0–20.0。UI 預設 12–18 為整數捷徑，核心接受範圍內任一值。
- `bloomMultiplier`：ASCII 十進小數字串，範圍 0.0–5.0。
- 小數字串語法：整數部為 `0` 或非零開頭的 1+ 位數字，可帶 `.` 加恰一位小數；無空白／符號／指數／千分位。raw 每欄最多 8 單元。預設 mode `dose`、amount `20`、ratio `15`、bloomMultiplier `2`。

先做整體結構（SCHEMA），再依 mode、amount、ratio、bloomMultiplier 逐欄驗證；逐欄順序為容量 INPUT_LIMIT、未成對 surrogate UNICODE、空字串 EMPTY、文法 DECIMAL_FORMAT（mode 為 ENUM）、範圍 RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆 null（本工具無列）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算全程以「十分之一單位」的整數運算（粉／水／毫升皆以 0.1 為單位，ratio 與倍數亦然），不使用浮點除法決定輸出。令 D＝粉量（0.1 g）、W＝總水量（0.1 ml）、R＝ratio×10（整數 100–200）、M＝倍數×10（整數 0–50）。捨入皆為 half-up（正值，.5 進位）。

1. dose 模式：D 由 amount 解析。W＝roundHalfUp(D×R/10)，即 `floor((D×R+5)/10)`。
2. water 模式：W 由 amount 解析。D＝roundHalfUp(W×10/R)，即 `floor((20×W+R)/(2×R))`。
3. 悶蒸 B＝roundHalfUp(D×M/10)，即 `floor((D×M+5)/10)`。兩模式都以「已捨入的 D」計算悶蒸，使顯示粉量與悶蒸量永遠一致。
4. 剩餘 S＝W−B。由上限可證 S>0 恆成立（B/W ≤ M/R ≤ 5/10），無錯誤路徑。三段注水以最大餘數法分配：base＝floor(S/3)，rem＝S−3×base（0、1 或 2），第 1…rem 段各多 1 個 0.1 單位，其餘為 base。尾數補給較早的段。
5. 結果 `{mode,doseGrams,totalWaterMl,ratio,bloomMultiplier,bloomWaterMl,steps}`。數值皆為十分之一單位整數除以 10 的 JSON 數（20、300、86.7）。steps 固定 4 段：`{step:1,kind:"bloom",addMl,cumulativeMl}` 後接 step 2–4 的 `kind:"pour"`；cumulativeMl 為累加值，第 4 段 cumulativeMl 恆等於 totalWaterMl（由建構保證，不另捨入）。
6. 顯示格式：克與毫升在 UI 永遠顯示恰一位小數（`20.0 g`、`300.0 ml`）；比例標籤 `1:15` 或 `1:15.5`（去掉尾隨 `.0`）。機器值不隨 locale 改。

固定錯誤訊息（code＋field）：

| code | field | 繁中 | English |
| --- | --- | --- | --- |
| SCHEMA | null | 輸入格式不正確 | The input format is invalid. |
| INPUT_LIMIT | 任一 | 輸入太長 | Input is too long. |
| UNICODE | 任一 | 輸入含有無效字元 | Input contains invalid characters. |
| EMPTY | amount／ratio／bloomMultiplier | 請輸入數值 | Enter a value. |
| ENUM | mode | 請選擇計算模式 | Choose a calculation mode. |
| DECIMAL_FORMAT | amount／ratio／bloomMultiplier | 請輸入最多一位小數的數字 | Enter a number with at most one decimal place. |
| RANGE | amount（dose） | 粉量須在 1.0–200.0 克之間 | Dose must be between 1.0 and 200.0 g. |
| RANGE | amount（water） | 水量須在 10.0–4000.0 毫升之間 | Water must be between 10.0 and 4000.0 ml. |
| RANGE | ratio | 比例須在 1:10.0–1:20.0 之間 | Ratio must be between 1:10.0 and 1:20.0. |
| RANGE | bloomMultiplier | 悶蒸倍數須在 0.0–5.0 之間 | Bloom multiplier must be between 0.0 and 5.0. |
| INTERNAL／WORKER_ERROR | null | 處理失敗，請重試 | Something went wrong. Try again. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/coffee-brew-ratio/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。模式切換只是草稿編輯（回 dirty），不啟動工作。
- 表格與摘要用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算沖煮表」，兩模式畫面結果符合核心 fixtures，含悶蒸與四段累計表。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和模式切換可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker 和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。9 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `dose-preset-15` | 粉量模式、整數比例、注水尾數 rem=2 補給前兩段 |
| `water-solve-dose` | 水量模式回推粉量，31.25 以 half-up 進位為 31.3 |
| `pour-remainder-one` | 悶蒸倍數 2.5，注水尾數 rem=1 只補第一段 |
| `water-custom-ratio` | 自訂比例 15.5 回推粉量 22.6 |
| `bloom-zero-max-ratio` | 邊界：倍數 0、比例上限 20，悶蒸 0 ml |
| `max-dose-min-ratio` | 邊界：粉量上限 200、比例下限 10、倍數上限 5 |
| `amount-too-large` | 粉量 250 超上限，第一個錯誤 RANGE／amount |
| `ratio-two-decimals` | 比例兩位小數，DECIMAL_FORMAT／ratio |
| `mode-invalid` | 模式非 dose／water，ENUM／mode |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可用性。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證粉量模式在整數比例下的精確乘積、D 回推的 .5 進位、倍數 0 與 5、rem 為 0／1／2 的三種分配，且每案第 4 段 cumulativeMl 恰等於 totalWaterMl。

候選 gate（均 NOT_RUN）

- 於 `tools/coffee-brew-ratio/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、模式切換、錯誤、成功後 edit、取消、重設。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「手沖咖啡沖煮比例」，title「手沖咖啡沖煮比例｜Gloss Tools」，description「輸入咖啡粉量或總水量與沖煮比例，算出另一邊的量、悶蒸水量，以及悶蒸加三段注水的累計目標。」。英文 lang=en，H1 “Coffee Brew Ratio Calculator”，title “Coffee Brew Ratio Calculator | Gloss Tools”，description “Enter a coffee dose or total water with a brew ratio to get the other amount, bloom water, and a four-step pour schedule with cumulative targets.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。1:15 是什麼意思？每 1 克咖啡粉對 15 克水；本工具以 1 ml 水 ≈ 1 克計。 / What does 1:15 mean? 1 g of coffee to 15 g of water; this tool treats 1 ml of water as 1 g.
- FAQ。悶蒸水量怎麼算？粉量 × 悶蒸倍數，預設 2 倍，可改 0–5 倍。 / How is bloom water calculated? Dose × the bloom multiplier (default 2×, adjustable from 0 to 5×).
- FAQ。分段注水怎麼分？悶蒸後剩餘水量三等分，尾數以 0.1 ml 為單位補給較早的段，最後一段累計必等於總水量。 / How are the pours split? The water left after blooming is split into three equal pours; leftover 0.1 ml units go to the earlier pours, so the final cumulative target equals the total exactly.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://coffee-brew-ratio.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。規格任務 `labs-coffee-brew-ratio-spec-20261109`（由主代理登記，作者不自行跑 registry）。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/coffee-brew-ratio/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
