# 景深計算 / Depth of Field Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-depth-of-field-calculator-20261121` · 2026-11-21 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/92b5743e93c282c068b3b8cca2ef2453e354e9fb/docs/SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

攝影者在按下快門前，先確認這顆鏡頭、這級光圈、這個對焦距離下，畫面中哪一段前後範圍看起來是清晰的，以及把焦點放在超焦距時能從多近一路清晰到無限遠。

- 桌面。桌面填上焦距、光圈、對焦距離與感光元件（或自訂 CoC），逐步確認近限、遠限、景深總長與超焦距，決定要收幾級光圈或把焦點移到哪裡。
- 行動。手機在拍攝現場核對一組設定，不啟動任何工作。

使用情境為拍攝前的設定試算。資料只保留在目前頁面草稿。

## scope

薄透鏡幾何光學的景深模型：以焦距、光圈值、對焦距離與容許彌散圓直徑（CoC）算出近限、遠限、景深總長與超焦距。非目標為讀取 EXIF、鏡頭資料庫、繞射極限、對焦堆疊、景深預覽影像、曝光計算、等效焦距換算。

已與 registry 的預案比對，最相近者的實質差異如下。

- 沖印尺寸由像素與 DPI 算輸出呎吋。此處是光學景深，不碰像素與 DPI。photo-print-size-calculator（本 checkout 尚無該規格；概念為像素尺寸 → 沖印尺寸）。
- 日出日落時刻。此處算對焦清晰範圍，不算太陽位置。 [sunrise-sunset-calculator 產品](https://github.com/KYStr/glossquote-labs-home/blob/92b5743e93c282c068b3b8cca2ef2453e354e9fb/tools/sunrise-sunset-calculator/HANDOFF.md)
- 黃金時刻（run 6 概念 32）。此處算景深，不算拍攝時段。
- 影像檔案大小（run 6 概念 40）。此處算光學景深，不算像素檔案大小。
- 影片檔案大小。此處算靜態照片景深，不算位元率 × 時長。 [video-file-size-calculator 產品](https://github.com/KYStr/glossquote-labs-home/blob/92b5743e93c282c068b3b8cca2ef2453e354e9fb/tools/video-file-size-calculator/HANDOFF.md)

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「焦距、光圈、對焦距離 / Focal length, aperture and focus distance」
- 欄位或說明「感光元件、容許彌散圓 / Sensor format and circle of confusion」
- 「計算景深 / Calculate depth of field」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「近限、遠限、景深與超焦距 / Near limit, far limit, depth of field and hyperfocal distance」先摘要再列細節。遠限為無限遠時以文字「無限遠 / Infinity」顯示，不以大數字冒充。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"focalLengthMm":"50","aperture":"8","focusDistanceM":"3","sensor":"full-frame","cocMm":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- focalLengthMm、aperture、focusDistanceM、cocMm 全為十進小數字串：無正負號、無空白、無指數；小數點至多一個；整數部分至少一位數字。focalLengthMm 1–2000 mm、小數至多 2 位、raw 最多 8 單元；aperture（f-number）0.5–64、小數至多 2 位、raw 最多 8 單元；focusDistanceM 0.05–10000 m、小數至多 3 位、raw 最多 10 單元；cocMm 0.001–1.000 mm、小數至多 3 位、raw 最多 8 單元。
- sensor 為下列枚舉字串之一：`1-inch`、`four-thirds`、`aps-c`、`aps-c-canon`、`aps-c-nikon`、`aps-h`、`full-frame`、`medium-645`、`custom`。不在枚舉內為 SCHEMA，field=`sensor`。
- sensor 非 `custom` 時以表定 CoC 計算，cocMm 欄位被忽略（即使填了值也不讀取）；sensor 為 `custom` 時 cocMm 為必填，空值為 EMPTY。
- 預設 focalLengthMm 50、aperture 8、focusDistanceM 3、sensor `full-frame`、cocMm 空字串。

先容量、再空值、再該欄文法、再範圍，跨欄檢查最後。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、文法 DECIMAL_FORMAT、範圍 RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 focalLengthMm、aperture、focusDistanceM、sensor、cocMm 順序驗證。raw 超限 INPUT_LIMIT、空值 EMPTY、文法 DECIMAL_FORMAT、範圍 RANGE，field 即上述欄名。cocMm 只在 sensor 為 `custom` 時驗證；sensor 非 `custom` 時跳過 cocMm 的全部檢查。
2. 跨欄檢查：對焦距離必須大於焦距（同單位比較，focusDistanceM × 1000 > focalLengthMm），否則 RANGE，field=`focusDistanceM`。
3. 全部長度以 mm 計，採標準薄透鏡公式（Wikipedia, Hyperfocal distance；CoC 表見下）：
   - 超焦距 H = f² / (N × c) + f，其中 f 為焦距 mm、N 為光圈值、c 為 CoC mm。
   - 近限 Dn = s × (H − f) / (H + s − 2f)，s 為對焦距離 mm。
   - 遠限 Df = s × (H − f) / (H − s)；若 s ≥ H，遠限為無限遠。
   - 景深總長 DoF = Df − Dn；遠限無限遠時景深總長亦為無限遠。
4. 輸出以公尺計，採 round half-up（逢 .5 進位，遠離零）至小數 3 位，只在輸出時捨入一次；景深總長由未捨入的 Df − Dn 算出再捨入，不取已捨入的遠限減近限。遠限無限遠時 farLimitM 與 totalDofM 為 null，farLimitInfinite 為 true。
5. 結果 `{focalLengthMm,aperture,focusDistanceM,sensor,cocMm,hyperfocalM,nearLimitM,farLimitM,farLimitInfinite,totalDofM}`；前四者為數字（focalLengthMm、aperture、focusDistanceM 為輸入數值，cocMm 為實際採用的 CoC mm，3 位小數），sensor 為字串，距離皆為公尺數值或 null。用一條距離軸或標示近限／遠限／超焦距的表，不用綠色暗示真實拍攝成功。

容許彌散圓直徑表（字面資料，出處：Wikipedia, Circle of confusion，「Circle of confusion diameter limit based on d/1500」表，d 為片幅對角線，CoC = d / 1500）：

| sensor | 片幅尺寸 | CoC mm |
| --- | --- | --- |
| `1-inch` | 13.2 mm × 8.8 mm | 0.011 |
| `four-thirds` | 18 mm × 13.5 mm | 0.015 |
| `aps-c` | 22.5 mm × 15.0 mm | 0.018 |
| `aps-c-canon` | 22.2 mm × 14.8 mm | 0.018 |
| `aps-c-nikon` | 23.6 mm × 15.7 mm | 0.019 |
| `aps-h` | 28.7 mm × 19.0 mm | 0.023 |
| `full-frame` | 36 mm × 24 mm | 0.029 |
| `medium-645` | 56 mm × 42 mm | 0.047 |

CoC 是「在標準觀看條件下仍被視為一點的最大彌散圓」的約定值，不是物理定律；放大檢視或大尺寸輸出時應改用較小的自訂 CoC。數位中片幅 44 mm × 33 mm 不在上表，須以 `custom` 自行輸入 CoC（d/1500 約 0.037 mm，僅供參考，不列為表定值）。

固定下載 `depth-of-field-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/depth-of-field-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算景深」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
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
| `full-frame-50mm-f8-3m` | 全片幅 50mm f/8 對焦 3 m 的標準景深 |
| `aps-c-35mm-f2-2m` | APS-C 35mm f/2 對焦 2 m，較小 CoC 的景深 |
| `far-limit-infinity` | 對焦距離超過超焦距，遠限無限遠 |
| `focus-at-hyperfocal` | 對焦距離恰等於超焦距，遠限無限遠、近限為 H/2 |
| `macro-close-focus` | 微距近距離對焦，景深僅約 1 mm |
| `custom-coc-85mm` | 自訂 CoC 0.020 mm，85mm f/1.8 對焦 5 m |
| `telephoto-200mm-50m` | 望遠 200mm f/4 對焦 50 m |
| `one-inch-24mm-2m` | 1 吋感光元件 24mm f/2.8 對焦 2 m |
| `aperture-too-small` | 光圈值 0.4 低於下限 |
| `focus-inside-lens` | 對焦距離不大於焦距 |
| `coc-too-many-decimals` | 自訂 CoC 小數超過 3 位 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 s == H、s == H + 0.001、s 剛好等於焦距、focalLengthMm 2000/2001、aperture 0.5/64、cocMm 0.001/1.000、sensor 未知枚舉。所有已接受的近限皆小於對焦距離，遠限無限遠時近限仍有限，景深總長等於未捨入的遠限減近限再捨入。

候選 gate（均 NOT_RUN）

- 於 `tools/depth-of-field-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「景深計算」，title「景深計算｜Gloss Tools」，description「輸入焦距、光圈、對焦距離與感光元件，算出近限、遠限、景深總長與超焦距，決定該收幾級光圈或把焦點移到哪裡。」。英文 lang=en，H1 “Depth of Field Calculator”，title “Depth of Field Calculator | Gloss Tools”，description “Enter focal length, aperture, focus distance and sensor format to find the near limit, far limit, total depth of field and hyperfocal distance.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。容許彌散圓是什麼？畫面上仍被視為一點的最大模糊圓直徑，依感光元件尺寸而定。 / What is the circle of confusion? The largest blur spot still seen as a point, set by sensor size.
- FAQ。遠限顯示無限遠是什麼意思？對焦距離已達或超過超焦距，從近限起的一切都落在可接受的清晰範圍內。 / What does an infinite far limit mean? The focus distance has reached or passed the hyperfocal distance, so everything from the near limit onward is acceptably sharp.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://depth-of-field-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/92b5743e93c282c068b3b8cca2ef2453e354e9fb/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/depth-of-field-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
