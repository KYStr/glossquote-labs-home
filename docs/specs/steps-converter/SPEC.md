# 步數換算 / Steps Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-steps-converter-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

手上有手機或計步器步數的人，想知道這大概走了多遠，而不是只看到一個步數數字。

- 桌面。晚餐後把手環的 8,000 步輸入，選用身高推估步幅，馬上看到約 5.46 公里。
- 行動。健行途中用手機核對今日步數對應的距離，並可選擇加開體重，估算這段步行大概消耗多少熱量。

成功結果：以實際使用的步幅（公分）、距離（公里）、每公里步數呈現換算；有開熱量時再加一個標明為估算的總熱量。資料只保留在目前頁面草稿。

和既有功能的差異：`running-pace-calculator` 以距離與時間算配速和分段，輸入沒有步數；以 MET×時長算熱量的工具需要活動種類與時間，本案只處理步行、只用距離與體重、係數釘版揭露。裝置本身的計步、GPS 軌跡不在本案。

## scope

MVP：一筆步數換算。步幅來源二選一（手動輸入實測步幅，或以身高×0.414 推估），熱量為可選開關（需體重）。非目標為偵測或記錄步數、GPS、跑步（係數不同）、坡度與地形修正、歷史紀錄、帳號、健康或醫療建議。

已比對 base `81dbb04e` 的 `docs/specs/` 101 份預案，最相近者的實質差異如下。

- `steps-easing` 是 CSS 動畫 timing function 的規格，與步行步數無關，僅名稱相近。
- `running-pace-calculator` 以已知距離與時間推配速；本案以步數與步幅推距離，輸入與輸出都不同。

判定規則、係數與揭露文字全由本文定義，無線上資料或外部服務依賴。步幅與熱量是族群平均估算，SPEC 已釘版揭露文字，產品不得改寫為精確測量語氣。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「步數 / Steps」
- 欄位或說明「步幅來源、步幅（公分）／身高（公分） / Stride source, stride (cm) / height (cm)」
- 欄位或說明「估算熱量、體重（公斤） / Estimate calories, weight (kg)」
- 「換算步數 / Convert steps」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「距離與步幅 / Distance and stride」先摘要再列細節。成功才顯示「下載報告 / Download report」。文字可手動選取。估算揭露文字在結果旁常駐顯示，不因成功或重設而消失。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。揭露文字與結果同時呈現。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"steps":"10000","strideSource":"height","strideCm":"70","heightCm":"170","calories":"off","weightKg":"65"}` 並聚焦步數欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切六個欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

| 欄位 | 文法 | 範圍 | 預設 | 啟用條件 |
| --- | --- | --- | --- | --- |
| steps | 整數字串：`0` 或非零開頭的 ASCII 數字，無空白／符號／小數／指數 | 0–99,999,999 | "10000" | 永遠 |
| strideSource | 列舉 `measured`／`height` | — | "height" | 永遠 |
| strideCm | 小數字串（整數部 `0` 或非零開頭，可帶 `.` 加 1–2 位小數） | 20.0–150.0 cm | "70" | strideSource=measured |
| heightCm | 小數字串（同上，至多 1 位小數） | 80.0–250.0 cm | "170" | strideSource=height |
| calories | 列舉 `off`／`on` | — | "off" | 永遠 |
| weightKg | 小數字串（至多 1 位小數） | 20.0–500.0 kg | "65" | calories=on |

raw 每欄最多 8 個 UTF-16 code units。先做整份 SCHEMA，再依 steps、strideSource、strideCm、heightCm、calories、weightKg 的欄位順序逐欄驗證。啟用欄位依序查：容量 INPUT_LIMIT、不成對 surrogate UNICODE、缺內容 EMPTY、文法（INTEGER_FORMAT／DECIMAL_FORMAT／ENUM）、範圍 RANGE。未啟用欄位（measured 模式的 heightCm、height 模式的 strideCm、calories=off 的 weightKg）只查 INPUT_LIMIT 與 UNICODE，其餘檢查全部跳過，值不參與計算（`inactive-fields-ignored` 案例釘版）。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算全程以 BigInt 精確有理數進行，不用浮點中繼：

1. 實際步幅 strideExact（公分）：measured 取 strideCm 的值；height 取 heightCm × 207/500（即 0.414，一字不差）。
2. distanceKmExact = steps × strideExact / 100,000（未捨入，後續計算一律用此值）。
3. calories=on 時 caloriesExact = 3/4 × weightKg × distanceKmExact。
4. 每個輸出只在最後由精確值 round half-up 一次：strideCm 取 1 位小數、distanceKm 取 2 位小數、stepsPerKm = round(100,000 / strideExact) 取整數、caloriesKcal 取整數。顯示用捨入值不得回饋任何計算（`stride-display-rounding` 案例釘版：步幅精確值 70.794 顯示 70.8，距離仍以 70.794 計）。
5. 結果 `{strideCm, distanceKm, stepsPerKm, caloriesKcal}`，calories=off 時 caloriesKcal=null。JSON 數字不帶小數尾零（7.04 輸出 7.04、整數輸出整數）。距離與熱量不隨 locale 改格式。

係數與揭露（釘版，產品照用，不得改寫）：

- 步幅係數 0.414：ACSM 迴歸的通用平均（Hoeger et al., ACSM Health & Fitness Journal 2008 一英里步數研究）；已發表的性別值為男性 0.415、女性 0.413，本案釘版不分性別的 0.414 並揭露範圍。
- 熱量係數 0.75 kcal/kg/km 為總消耗（含休息代謝）：由 Compendium of Physical Activities 平地步行 MET 推得的每公里總成本在一般步速約 0.73（MET 3.5 @ 4.8 km/h）至 0.77（MET 4.3 @ 5.6 km/h），釘版取 0.75；淨消耗（扣除休息）約 0.5，不採用但揭露。
- 揭露文字（結果旁常駐，雙語原文）：「步幅與熱量皆為估算值。身高推估步幅採 0.414 × 身高；熱量採每公斤每公里 0.75 kcal（總消耗，含休息代謝），實際值因步速、地形與個人差異而不同。」/ "Stride and calories are estimates. The height-based stride uses 0.414 × height; calories use 0.75 kcal per kg per km (gross, including resting metabolism). Actual values vary with pace, terrain and the individual."

固定下載 `steps-converter-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/steps-converter/`。src/core.mjs 放純驗證、推導、格式化（驗證與有理數計算照 inputsOutputs 的順序與公式，不得以浮點重寫）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算步數」，畫面和完整報告符合核心 fixtures，使用者取得對應產物，揭露文字常駐。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、未啟用欄位忽略和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。19 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `height-basic` | 身高推估基本換算（範例兼預設） |
| `measured-basic` | 實測步幅，公里 3.275 半數進位 |
| `calories-from-height` | 熱量由未捨入距離計算 |
| `zero-steps` | 零步數合法，距離與熱量為零 |
| `max-boundary` | 步數上限與公里進位跨 100,000 |
| `stride-display-rounding` | 步幅顯示捨入不回饋計算 |
| `calories-tie` | 熱量 49.5 半數進位 |
| `single-step-min-stride` | 一步與步幅下限，未滿單位距離輸出 0 |
| `measured-calories-2dp-stride` | 兩位小數步幅，步幅顯示 72.25 半數進位 |
| `inactive-fields-ignored` | 未啟用欄位不查文法與範圍 |
| `steps-integer-format` | 步數帶小數 |
| `steps-leading-zero` | 步數前導零 |
| `mode-enum` | 步幅來源列舉外 |
| `height-range` | 身高剛好越界 |
| `stride-range` | 步幅剛好越界 |
| `stride-decimal-format` | 步幅小數位數超限 |
| `height-decimal-format` | 身高小數位數超限 |
| `weight-empty-when-on` | 熱量開啟時體重空白 |
| `schema-extra-key` | 未知欄位整份 SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限與下限（steps 0/99,999,999、strideCm 20/150、heightCm 80/250、weightKg 20/500）、剛好超限（strideCm 19.9/150.1、heightCm 79.9/250.1、weightKg 19.9/500.1、steps 9 位數 INPUT_LIMIT）、錯型別、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。不變量：距離對步數與步幅單調不減；熱量恆等於 round(0.75 × 體重 × 未捨入公里）；stepsPerKm × 實際步幅與 100,000 的誤差小於一個步幅。報告 bytes 以 `height-basic` 結果釘版：`{"caloriesKcal":null,"distanceKm":7.04,"stepsPerKm":1421,"strideCm":70.4}` 加一個 LF，共 74 bytes，SHA-256 `4489db044b31e62ef7cd6ee2748de127590b4788d0f641feb2ad3c274939fdcd`。

候選 gate（均 NOT_RUN）

- 於 `tools/steps-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「步數換算」，title「步數換算｜Gloss Tools」，description「把計步器的步數換算成距離：用身高推估步幅或輸入自己的步幅，還可加開體重估算步行消耗的熱量（估算值）。」。英文 lang=en，H1 “Steps Converter”，title “Steps Converter | Gloss Tools”，description “Convert a step count to distance with a measured stride or a height-based estimate, plus an optional weight-based walking calorie estimate.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。步幅怎麼來的？身高模式用步幅 = 身高 × 0.414（ACSM 迴歸平均，個人值約在 0.413–0.415 並隨步速變動）；知道自己的步幅時用實測模式更準。 / Where does the stride estimate come from? Height mode uses stride = height × 0.414 (an ACSM regression average; individual values run about 0.413–0.415 and vary with pace). If you know your stride, measured mode is more accurate.
- FAQ。熱量準嗎？這是總消耗估算（0.75 kcal/kg/km），由 MET 表推得的一般步速範圍約 0.73–0.77；扣除休息代謝的淨消耗約 0.5。個人誤差可達 ±20%，只作概略參考。 / How accurate is the calorie figure? It is a gross estimate (0.75 kcal/kg/km); MET tables put ordinary walking at about 0.73–0.77, and the net cost above resting is about 0.5. Individual error can reach ±20%; treat it as a rough guide.
- FAQ。為什麼和手錶的距離不一樣？手錶用自己的步幅校準或 GPS；本工具只用畫面上顯示的步幅計算，步幅不同結果就不同。 / Why does my watch show a different distance? Watches use their own stride calibration or GPS. This tool uses exactly the stride shown, so a different stride gives a different distance.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://steps-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/steps-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
