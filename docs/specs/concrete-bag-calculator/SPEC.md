# 混凝土用量計算機 / Concrete Bag Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-concrete-bag-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

自己做小型混凝土工程的人，在採購預拌袋裝混凝土前，確認一塊平板、一條條形基礎或一根圓柱需要多少混凝土、加計損耗後三種袋型各買幾包。

- 桌面。在家量好尺寸，桌機逐欄填入公分尺寸與數量，核對三種袋型的包數再出門採購。
- 行動。站在建材行貨架前用手機重算：臨時改厚度或數量，立即看到包數變化，不必回想公式。

使用情境為採購估算，結果不是結構設計。資料只保留在目前頁面草稿。

## scope

MVP 必做：單一形狀（`slab` 平板、`footing` 條形基礎、`cylinder` 圓柱）擇一計算；公制公分尺寸輸入；件數 1–999；損耗率 0–100%（預設 10%）；輸出淨體積與含損耗體積（m³、yd³）及 40／60／80 lb 三種預拌袋裝的需要包數（三種全列）。

非目標：鋼筋、強度或級配設計；拌合用水量；多形狀或多筆工程加總；公制 20／25 kg 袋裝；價格、載重或運送估算；儲存、帳號、分享連結；把估算當成施工圖說或廠商保證產量。

已比對現有工具，最相近者的實質差異如下。

- 磁磚估算（tile-estimator）與油漆覆蓋（paint-coverage-calculator）以面積與片／罐換算。此處以三維體積換算袋裝預拌料，三者公式與單位管線不同。
- 包裹計費重（parcel-billable-weight）是物流材積重。此處是建材體積與袋數，無計費規則。

袋裝產量為真實世界對照表，依下文固定版本寫死，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「形狀／Shape」：三選一段位控制（平板、條形基礎、圓柱），切換形狀只顯示該形狀的尺寸欄位，其餘欄位保留草稿值但不參與驗證與計算。
- 欄位或說明「長、寬、厚（公分）／Length, width and thickness (cm)」（平板）；「長、寬、深（公分）／Length, width and depth (cm)」（條形基礎）；「直徑、高（公分）／Diameter and height (cm)」（圓柱）。
- 欄位或說明「數量、損耗率（%）／Count and waste (%)」，損耗率預填 10。
- 「計算混凝土用量／Calculate concrete」是主要操作。「載入範例／Load example」填入 [fixtures.json](fixtures.json) 第一個案例（平板 400×300×10 cm、1 件、損耗 10%），明示範例並等待手動執行。
- 「體積與袋數／Volume and bags」先摘要（含損耗體積 m³ 與 yd³）再列三種袋型的包數表，每列標示袋型磅數與每包產量。結果只有畫面顯示，沒有下載或匯出。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項或範例改變，立即撤銷舊結果。顯示「輸入已變更，請重新執行／Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中／Working」及「取消／Cancel」。編輯終止舊工作並回 dirty。 |
| ready | 報告對應目前快照。體積與三列袋數完整顯示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行／Cancelled. You can run again.」。舊結果仍無效。 |

「重設／Reset」停止工作，復原預設 `{"shape":"slab","lengthCm":"400","widthCm":"300","thicknessCm":"10","depthCm":"30","diameterCm":"30","heightCm":"200","count":"1","wastePct":"10"}` 並聚焦形狀欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切 9 個欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，path 為 `""`。JSON fixture 即介面。欄位值全為字串（DOM 原始值）。

固定欄位與文法（驗證順序見下）。

- `shape`：恰為 `slab`、`footing`、`cylinder` 之一，否則 ENUM，path `/shape`。
- 尺寸欄 `lengthCm`、`widthCm`、`thicknessCm`、`depthCm`、`diameterCm`、`heightCm`：十進位數字串，正規式 `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`（無正負號、空白、指數；小數至多 2 位），值須 >0 且 ≤10000（cm，即 100 m）。只驗證目前形狀用到的欄位：slab 用 length/width/thickness；footing 用 length/width/depth；cylinder 用 diameter/height。其餘尺寸欄完全忽略（不驗證、不輸出）。
- `count`：整數字串，正規式 `^(0|[1-9][0-9]*)$`，值 1–999。
- `wastePct`：與尺寸欄同一數字文法（小數至多 2 位），值 0–100。

驗證順序固定。先 SCHEMA（物件形狀、欄位集合、型別）。再 `shape`。再依目前形狀的尺寸欄順序（slab：lengthCm、widthCm、thicknessCm；footing：lengthCm、widthCm、depthCm；cylinder：diameterCm、heightCm）逐欄。再 `count`。最後 `wastePct`。每欄內順序：raw 長度 >16 code units 為 INPUT_LIMIT；空字串為 EMPTY；不符合文法為 NUMBER_FORMAT（count 為 INTEGER_FORMAT）；超出範圍為 RANGE。整份失敗回 `{ok:false,error:{code,path}}`，path 為 JSON Pointer（如 `/thicknessCm`）。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算管線（全部以 BigInt 有理數精確計算，中途不捨入；π 與換算常數如下）。

1. 公分轉公尺：尺寸字串先化為「百分之一公分」整數 H（小數 2 位故 exact），公尺值 = H/10000。
2. 單件體積：slab／footing 為長×寬×厚（深），即三個 H 的乘積 / 10^12 m³。cylinder 為 π×(直徑/2)²×高，即 π×Dh²×Hh/(4×10^12) m³，其中 π 固定為 3.141592653589793238462643383279（小數 30 位，視為 exact 有理數 3141592653589793238462643383279/10^30）。
3. 淨體積 net = 單件體積 × count。含損耗體積 adjusted = net × (10000+W)/10000，其中 W 為 wastePct 的百分之一整數（損耗只加在體積一次，固定在此步，不逐包加）。
4. 袋數：對每種袋型，bags = ceil(adjusted / yield)，以未捨入的 adjusted 與下表 exact 產量計算，結果為整數。
5. 顯示：net 與 adjusted 的 m³ 字串固定 3 位小數、half-up（恰 0.0005 進位）；yd³ 只顯示 adjusted，yd3 = adjusted / 0.764554857984（1 yd³ = 0.9144³ m³，exact），同樣 3 位小數 half-up。袋數永遠不用顯示捨入後的體積反推。

袋裝產量固定表（來源：主要預拌廠商公開產品資料的常用產量，40 lb ≈ 0.30 ft³、60 lb ≈ 0.45 ft³、80 lb ≈ 0.60 ft³；以 1 ft³ = 0.028316846592 m³ exact 換算後寫死，三者同源一致）。

| 袋型 | 公布產量 | 固定產量 yield（m³／包） |
| --- | --- | --- |
| 40 lb | 0.30 ft³ | 0.0084950539776 |
| 60 lb | 0.45 ft³ | 0.0127425809664 |
| 80 lb | 0.60 ft³ | 0.0169901079552 |

成功結果 `{ok:true,result}`，result 恰為 `{shape,count,netVolumeM3,adjustedVolumeM3,adjustedVolumeYd3,bags:{bag40,bag60,bag80}}`：shape 為輸入列舉，count 為整數，體積為上述 3 位小數字串，bags 為整數。機器值不隨 locale 改。沒有下載產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/concrete-bag-calculator/`。src/core.mjs 放純驗證、推導、格式化（有理數管線以 BigInt 實作，不得以浮點數算體積、損耗或袋數；浮點只允許出現在與本計算無關的呈現輔助）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換形狀、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。編輯任一欄位（含目前形狀未使用的欄位）即視為 dirty 並撤銷舊結果。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算混凝土用量」，三種形狀的畫面結果符合核心 fixtures（含圓柱 π 管線與損耗後袋數）。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、未使用欄位被忽略、三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改可操作；切換形狀不丟其他欄位草稿。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker 和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。7 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected；袋數與體積由規格的有理數管線手算（袋數比例小數列於 AUTHOR-CHECK 供核對）。

| 案例 ID | 驗證行為 |
| --- | --- |
| `slab-default-waste` | 平板 1.2 m³、損耗 10% 後 1.320 m³、三種袋數 156／104／78 |
| `footing-two-waste5` | 條形基礎 2 件、損耗 5%、袋數 297／198／149 |
| `cylinder-four` | 圓柱 π×0.15²×2×4 件、損耗 10%、袋數 74／49／37 |
| `waste-crossing` | 同體積損耗 0% 時袋數 12／8／6，損耗 10% 跨整數邊界變 13／9／7 |
| `slab-decimal-nowaste` | 小數公分（厚 7.5）且損耗 0，1.0125 m³ 顯示 half-up 為 1.013 |
| `error-zero-thickness` | 厚度 0 回 RANGE／`/thicknessCm` |
| `error-count-range` | 數量 1000 回 RANGE／`/count` |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可用性。

另測合法上限（尺寸 10000、count 999、waste 100）、剛好超限（尺寸 0 與 10000.01、count 0 與 1000、waste 100.01）、錯型別、額外欄、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證形狀外欄位即使為非法字串也被忽略；袋數恰整除時不進位（adjusted 恰為產量整數倍的合成案例）；顯示恰 0.0005 的 half-up 進位；三種袋數恆為 40 lb ≥ 60 lb ≥ 80 lb 的排序性質。

候選 gate（均 NOT_RUN）

- 於 `tools/concrete-bag-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「混凝土用量計算機」，title「混凝土用量計算機｜Gloss Tools」，description「輸入平板、條形基礎或圓柱的尺寸、數量與損耗率，算出混凝土體積（m³ 與 yd³）與 40／60／80 lb 預拌袋裝的需要包數。」。英文 lang=en，H1 “Concrete Bag Calculator”，title “Concrete Bag Calculator | Gloss Tools”，description “Enter slab, strip footing or cylinder dimensions, count and waste allowance to get concrete volume in m³ and yd³ plus the premix bags needed in 40, 60 and 80 lb bag sizes.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。損耗率加在哪一步？先加在總體積上，再換算三種袋數；袋數本身不再另加損耗。 / Where is the waste allowance applied? It is added once to the total volume before converting to bags; the bag counts get no second allowance.
- FAQ。產量是保證值嗎？不是，這是依廠商公布的每包約略產量換算的採購估算，實際用量受現場整平與厚度誤差影響。 / Are the yields guaranteed? No. They are a purchasing estimate converted from the manufacturers' published per-bag yields; site grading and thickness variation change actual usage.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://concrete-bag-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線見 repo 根 README。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格任務 `labs-concrete-bag-calculator-spec-20261109`（由主代理登記）。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/concrete-bag-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
