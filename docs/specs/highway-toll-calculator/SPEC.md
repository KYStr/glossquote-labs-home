# 國道通行費試算 / Highway Toll Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-highway-toll-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

駕駛人出發前想知道這趟國道要繳多少通行費：輸入里程（或選上下交流道），得到依台灣 ETC 計程收費規則算出的應繳金額，含每日 20 公里優惠、超過 200 公里長途折扣、車種費率與 eTag 9 折。

- 桌面。桌面填里程或選交流道、車種與 eTag，核對金額與分段明細，再決定要不要改走平面道路或分段下交流道。
- 行動。手機在出發前或休息站快速試算下一段的通行費。

使用情境為出發前試算。資料只保留在目前頁面草稿；算出的金額是依交流道里程估算的試算值，不是實際帳單。

## scope

台灣國道 ETC 計程收費（平常日／一般假日費率）的單日試算。收費國道為國道 1、3、3甲、5 號。MVP 必做：直接輸入里程、國道 1 號上下交流道查表里程、三種車種費率、每日 20 公里優惠、200 公里以上長途 75 折、eTag 9 折切換、今日已行駛里程（每日歸戶）、四捨五入到元、明細與報告下載。非目標：即時路況或行車時間、連續假期單一費率方案、實際門架牌價逐段加總、繳費或帳單查詢、橫向國道（目前不收費）、計程車向乘客收費的特殊規則。

與既有工具的實質差異（已比對本輪 registry 與既有規格）：

- fuel-cost-calculator 算的是油錢（里程 × 油耗 × 油價），且明文排除通行費等其他旅程費用；此處算的是通行費（里程 × 高公局費率，含每日優惠與長途折扣），不算油錢。兩者互補，不重疊。 [fuel-cost-calculator](../fuel-cost-calculator/SPEC.md)
- hsr-fare-calculator（若存在）查高鐵站間票價表；此處是國道里程費率計算，不是票價表查詢。trip-time-estimator 算行車時間，不算費用。

判定規則由本文定義，費率與交流道里程取自下列官方來源（2026-11-21 查證）：交通部高速公路局「國道計程收費之通行費率說明」（freeway.gov.tw）與「國道高速公路通行費徵收計畫」（115 年 10 月 2 日第十八次修正）；交流道里程取自高公局「交流道、服務區里程一覽表」（上架 102-07-08，最後更新 113-12-06），並以 Wikipedia "Sun Yat-sen Freeway" exit list 交叉核對。費率若日後公告調整，以高公局最新公告為準，本工具不做線上查詢。

費率表（元／公里，平常日／一般假日）：

| 車種 | 當日累計 20 公里以內 | 20 公里以上至 200 公里 | 超過 200 公里部分 |
| --- | --- | --- | --- |
| 小型車 | 0 | 1.20 | 0.90 |
| 大型車 | 0 | 1.50 | 1.12 |
| 聯結車 | 0 | 1.80 | 1.35 |

註：大型車長途費率 1.12 元／公里為官方表定值（1.50 × 0.75 = 1.125，官方表列 1.12，以表定值為準）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 輸入方式切換「直接輸入里程 / Enter distance」與「上下交流道 / Entry & exit interchanges」。
- 欄位或說明「里程（公里） / Distance (km)」、「車種 / Vehicle type」、「今日已行駛里程（公里） / Distance already driven today (km)」、「eTag 9 折 / eTag 10% off」。
- 交流道模式欄位或說明「上交流道 / Entry interchange」、「下交流道 / Exit interchange」（國道 1 號，附里程標示）。
- 「計算通行費 / Calculate toll」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個案例（台北至台中），明示範例並等待手動執行。
- 「應繳通行費 / Toll due」先摘要金額再列明細（里程、免費里程、標準費率里程、長途折扣里程、分段金額、eTag 折扣），長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"distance","vehicleType":"small","distanceKm":"100","priorKm":"0","etag":"false","entry":null,"exit":null}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- mode 為 `"distance"` 或 `"pair"`，預設 `"distance"`。vehicleType 為 `"small"`、`"large"` 或 `"trailer"`，預設 `"small"`。entry/exit 為下方交流道表的 id（pair 模式必填，distance 模式為 null）。distanceKm、priorKm 為十進位字串，最多一位小數，無空白／符號／指數；raw 每欄最多 16 單元。distanceKm 範圍 0.1–999.9 公里，priorKm 範圍 0–999.9 公里，預設 distanceKm `"100"`、priorKm `"0"`。etag 為 `"true"` 或 `"false"`，預設 `"false"`。
- 交流道表（國道 1 號中山高速公路，里程為該交流道距基隆端公里數，1 位小數）：

| id | 交流道 | 里程 km |
| --- | --- | --- |
| keelung | 基隆端 | 0.0 |
| xizhi | 汐止 | 10.5 |
| neihu | 內湖 | 16.8 |
| taipei | 台北 | 25.1 |
| wugu | 五股 | 33.1 |
| linkou | 林口 | 41.5 |
| taoyuan | 桃園 | 49.1 |
| zhongli | 中壢 | 62.4 |
| yangmei | 楊梅 | 69.2 |
| hukou | 湖口 | 83.8 |
| taichung | 台中 | 178.6 |
| changhua | 彰化 | 198.4 |
| tainan | 台南 | 327.4 |
| kaohsiung_end | 高雄端 | 372.8 |

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 mode、vehicleType、entry、exit、distanceKm、priorKm、etag 順序驗證。raw 超限 INPUT_LIMIT、文法 FORMAT、範圍 RANGE、未知交流道 UNKNOWN_INTERCHANGE、上下交流道相同 SAME_INTERCHANGE（field 為 exit）。
2. 里程：pair 模式 `distanceKm = |km(exit) − km(entry)|`（1 位小數）；distance 模式即輸入值。`totalKm = priorKm + distanceKm`。
3. 每日費用函數 `gross(d)`：`freeKm = min(d, 20)`；`standardKm = max(0, min(d, 200) − 20)`；`discountedKm = max(0, d − 200)`；`gross(d) = standardKm × rateStandard + discountedKm × rateLong`。本趟 `grossNt = gross(totalKm) − gross(priorKm)`。eTag 時 `amountNt = roundHalfUp(grossNt × 0.9)`，否則 `amountNt = roundHalfUp(grossNt)`；roundHalfUp 為四捨五入到整數元（0.5 進位），全程唯一一次捨入，套在最後。
4. 結果 `{mode, vehicleType, entry, exit, distanceKm, priorKm, totalKm, freeKm, standardKm, discountedKm, rateStandard, rateLong, grossTotalNt, grossPriorNt, grossNt, etagApplied, etagFactor, amountNt}`；里程數字皆為 1 位小數的 JSON number；金額 gross* 為精確小數（最多 3 位小數），amountNt 為整數。核心以十進位精確運算（整數毫元或等價方式），禁止二進位浮點累積誤差；顯示金額一律以 `NT$` 前綴、整數元。

固定下載 `highway-toll-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

誠實揭露（頁面固定文字，雙語）：本工具以交流道里程估算，實際通行費按每座門架牌價（每段四捨五入到角）加總後再扣優惠與折扣，兩者可能差數元。官方範例：小型車基隆端至台南，門架牌價合計 389.6 元，減長途折扣 37.4 元、減優惠里程 24 元後為 328.2 元（應繳 328 元；eTag 9 折為 295 元）；本工具以 327.4 公里算得 331 元（eTag 298 元）。實際扣款金額以遠通電收帳務為準。連續假期費率方案另行公告，本工具不適用。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/highway-toll-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算通行費」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和兩種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例、3 個錯誤案例與 2 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `pair-taipei-taichung` | 上下交流道查表里程、標準費率（載入範例） |
| `short-pair-free` | 短程在每日 20 公里優惠內，0 元 |
| `free-boundary-20` | 恰好 20 公里邊界 |
| `standard-small-100` | 小型車 100 公里標準費率 |
| `standard-large-100` | 大型車 1.5 元/公里 |
| `standard-trailer-100` | 聯結車 1.8 元/公里 |
| `pair-taipei-taoyuan` | 4.8 元四捨五入為 5 元 |
| `etag-taipei-taichung` | eTag 9 折：先打折、再取整 |
| `large-taipei-taichung` | 200.25 元四捨五入為 200 元 |
| `long-boundary-200` | 恰好 200 公里：長途折扣邊界 |
| `trailer-long-250` | 391.5 元半數進位為 392 元 |
| `pair-keelung-kaohsiung` | 基隆端至高雄端全程長途折扣 |
| `prior-km-daily` | 當日已行駛里程的每日歸戶扣費 |
| `etag-long-327` | 327.4 公里 eTag 9 折 |
| `error-zero-distance` | 里程 0 超出範圍下限 |
| `error-same-interchange` | 上下交流道相同 |
| `error-bad-distance` | 里程非數字格式 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 distanceKm=999.9、priorKm=999.9、totalKm 跨 200 公里邊界、etag 開關、pair 反向（高雄端至基隆端同里程同金額）。所有金額皆為最後一步才四捨五入到元，中間不取整。

候選 gate（均 NOT_RUN）

- 於 `tools/highway-toll-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「國道通行費試算」，title「國道通行費試算｜Gloss Tools」，description「輸入里程或上下交流道，依台灣 ETC 計程收費規則試算國道通行費：每日 20 公里免費、200 公里以上長途 75 折、eTag 9 折。」。英文 lang=en，H1 “Highway Toll Calculator”，title “Highway Toll Calculator | Gloss Tools”，description “Estimate Taiwan freeway ETC tolls from distance or entry and exit interchanges: 20 km free per day, 25% off beyond 200 km, 10% off with eTag.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。20 公里免費是每趟都有嗎？不是，每車每日一次，依車號每日歸戶合併計算。 / Is the 20 km free allowance per trip? No — once per vehicle per day; all trips on the same day are settled together by licence plate.
- FAQ。eTag 9 折怎麼拿？預儲帳戶餘額足夠扣款，或在通行次日起第 3–5 日內自行繳費；先打折、再四捨五入到元。 / How do I get the 10% eTag discount? Keep a prepaid eTag balance high enough to cover the toll, or pay by yourself within 3–5 days after passage; the discount applies before rounding to the nearest dollar.
- FAQ。連續假期也適用嗎？不適用。連假另行公告單一費率，取消 20 公里優惠與長途折扣；本工具只算平常日／一般假日費率。 / Does this apply on long holidays? No. Holidays use a separately announced flat rate with no free kilometres or long-distance discount; this tool covers normal and regular weekend rates only.
- FAQ。為什麼算出來的金額和實際帳單差幾元？實際按門架牌價加總，本工具以交流道里程估算；實際扣款以遠通電收帳務為準。 / Why does the estimate differ from my actual bill by a few dollars? Actual bills sum per-gantry prices; this tool estimates from interchange distances. The amount charged by the toll operator is authoritative.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://highway-toll-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/highway-toll-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
