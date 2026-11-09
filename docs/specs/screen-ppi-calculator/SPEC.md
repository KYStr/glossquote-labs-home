# 螢幕 PPI 計算 / Screen PPI Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-screen-ppi-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

買螢幕、手機或電視的人，手上有原廠規格表的對角線英寸與面板原生解析度，想在下單前先知道實際像素密度、畫面實體大小與點距，判斷文字會不會太小、和手邊的螢幕比哪一台比較細緻。

- 桌面。桌前比規格表，把 24 英寸 FHD、27 英寸 QHD 等候選逐一換算成 PPI 與實體寬高，排順序比較。
- 行動。手機在賣場看電視，把 85 英寸 4K 的點距算出來，確認觀看距離下顆粒感可不可接受。

成功結果為：使用者輸入三個數字，得到一組彼此一致的衍生量（PPI、實體寬高 cm、點距 mm、總像素、長寬比標籤），可下載成報告帶走。使用情境為購物前查核。資料只保留在目前頁面草稿。

## scope

MVP 為單一模式：對角線（英寸）＋水平像素＋垂直像素 → PPI、實體寬高、點距、總像素、長寬比標籤。釘版常數：1 英寸 = 2.54 cm（精確定義），PPI 公式 `sqrt(w² + h²) / d`。

與既有功能的界線（已比對本 repo `docs/specs/` 101 份規格）：

- **aspect-ratio-calculator 是最相近者，界線在此釘死。** 該工具的核心是比例約分與求解：Mode A 由尺寸得比例、Mode B 由比例加一邊反推另一邊，含預設比例表與「接近著名比例」提示。本工具**不做求解**：沒有比例輸入、沒有缺邊反推、沒有預設表、沒有接近提示；約分比例在本工具只是由像素尺寸衍生的唯讀標籤，而且 3440×1440 顯示 43:18、1366×768 顯示 683:384，永遠顯示真正約分結果、不做任何著名比例對照。反過來，該工具不處理單位、對角線與密度；本工具的輸出全部是密度與實體量。使用者要反推缺邊時，FAQ 明示改用該工具。
- photo-print-size-calculator（本批 #31 概念）以 DPI 把像素換成沖印紙張尺寸與符合判定；本工具的實體尺寸是面板本身的寬高，不涉及紙張或列印。
- battery-runtime、object-fit-geometry 等幾何／電量工具與本案輸入輸出不相交。

非目標：雙螢幕比較模式（概念備註允許釘版或省略，本版**省略**，不留半成品欄位）、對角線以 cm 輸入、非方形像素（anamorphic）修正、子像素排列（RGB/BGR/PenTile）修正、保存或分享結果、連網查機型資料庫。判定規則由本文定義，無線上資料或外部服務依賴。

性能與資料界線：三個文字欄位、一次同步純計算；像素上限 16384 使中間量恆為小整數與單一平方根，無長表、無分頁需求。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「對角線、解析度 / Diagonal and resolution」
- 欄位或說明「水平像素、垂直像素 / Horizontal and vertical pixels」
- 「計算螢幕密度 / Calculate screen density」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「像素密度與實體尺寸 / Pixel density and physical size」先摘要（PPI 為主數字）再列寬高、點距、總像素與長寬比標籤，皆為帶標籤文字。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。長寬比標籤明示為「長寬比（參考）/ Aspect ratio (reference)」。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"diagonalIn":"27","widthPx":"2560","heightPx":"1440"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位與驗證（欄位順序固定 diagonalIn → widthPx → heightPx；欄內順序固定 容量 → UNICODE → EMPTY → 文法 → RANGE；第一個失敗即整份失敗）：

- `diagonalIn`：ASCII 十進小數字串。整數部為 `0` 或非零開頭，小數部可省略或 1–2 位；無空白／正負號／指數／前導 `+`／結尾小數點。raw 最多 8 單元。文法不合 DECIMAL_FORMAT。範圍 0.1–200 英寸（含端點），超出 RANGE。範圍依據：0.1 英寸涵蓋微型顯示器且避免除以近零；200 英寸涵蓋大型商用顯示牆單體，且使 PPI 下限保持有意義。
- `widthPx`、`heightPx`：ASCII 整數字串，`0` 或非零開頭，無小數／符號／指數。raw 每欄最多 8 單元。文法不合 INTEGER_FORMAT。範圍 1–16384（含端點），超出 RANGE。範圍依據：16384 涵蓋現行最高解析度面板（如 16K 錄影監視器 15360 寬）並留餘裕，且使 `w² + h² ≤ 2²⁹` 在雙精度下恆為精確整數。

整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆 null（本工具無列）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（全部 IEEE-754 雙精度，運算順序釘版；`w`、`h` 為驗過的整數，`d` 為 diagonalIn 的雙精度值）：

1. `diagPx = Math.sqrt(w*w + h*h)`。`w*w`、`h*h` 與其和為精確整數（≤ 2²⁹）；`Math.sqrt` 採正確捨入值（IEEE-754 規定，實務引擎皆然）。
2. `ppiRaw = diagPx / d`。除法非精確，故 fixtures 全部挑選離捨入邊界有已量測餘裕的輸入（見 AUTHOR-CHECK.md），雙精度與 50 位高精度參照在全部案例上給出相同捨入結果。
3. `widthCmRaw = (w / ppiRaw) * 2.54`；`heightCmRaw = (h / ppiRaw) * 2.54`。**恆由未捨入 ppiRaw 推導**，禁止由顯示用 ppi 反推（反推會使寬高與對角線勾稽不一致）。
4. `dotPitchRaw = 25.4 / ppiRaw`。
5. `megapixelsRaw = (w * h) / 1000000`。`w * h` 為精確整數（≤ 2²⁸）。
6. `g = gcd(w, h)`（整數 Euclid 輾轉相除）；`aspectRatio = (w/g) + ":" + (h/g)`，依寬:高原順序，唯讀標籤，無求解與無著名比例對照。

輸出捨入（只在輸出做一次；`R(x,k) = Math.floor(x * 10^k + 0.5) / 10^k`，於雙精度值上執行，所有量恆正）：ppi 取 k=1；widthCm、heightCm 取 k=1；dotPitchMm 取 k=3；megapixels 取 k=2。畫面顯示固定小數位（PPI 1 位、寬高 1 位、點距 3 位、總像素 2 位，不足補零，如 0.490、94.0、4000.0）；報告 JSON 帶捨入後的數值本身。

結果物件 `{aspectRatio, diagonalIn, dotPitchMm, heightCm, heightPx, megapixels, ppi, widthCm, widthPx}`：diagonalIn 為剖析後數值（`"6.10"` 不合文法不會出現；`"6.1"` → 6.1），widthPx/heightPx 為整數回顯，其餘為上列捨入值。機器值不隨 locale 改。小數顯示以 `.` 為分隔符。

固定下載 `screen-ppi-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/screen-ppi-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算螢幕密度」，畫面和完整報告符合核心 fixtures（含寬高由未捨入 PPI 推導、約分標籤原順序），使用者取得對應產物。 |
| boundaries | 合法端點（0.1／200 英寸、1／16384 px）、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow；兩瀏覽器的雙精度捨入結果與 fixtures 一致。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `fhd-24` | 24″ FHD 基準，16:9 約分 |
| `phone-6-1` | 高 PPI 手機，非著名約分 131:284 |
| `ultrawide-34` | 帶魚屏約分為 43:18，不顯示 21:9 |
| `qhd-27` | QHD 基準與重設預設 |
| `portrait-24` | 直式 9:16 原順序標籤 |
| `square-17` | 1:1，寬高相等 |
| `watch-1-5` | 小數對角線與小螢幕 |
| `tv-85` | 大尺寸低 PPI，點距顯示補零 0.490 |
| `sxga-19` | 對角像素恰為整數，4:3 |
| `laptop-15-6` | 683:384，不得顯示 16:9 |
| `px-cap-200` | 對角線與像素雙上限端點 |
| `min-diag-0-1` | 對角線下限端點，PPI 整數值 |
| `diag-three-decimals` | 對角線小數超過兩位 |
| `diag-below-min` | 對角線低於下限 |
| `px-decimal` | 像素欄小數 |
| `px-over-cap` | 像素高於上限 |
| `diag-empty` | 首欄缺內容 |
| `extra-field` | 未知欄位 SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測剛好越界（diagonalIn 0.09／200.01、px 0／16385)、錯型別、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息；以及勾稽不變式：任一合法輸入下，以未捨入值回算 `sqrt(widthCm² + heightCm²) / 2.54` 應與 ppiRaw 在雙精度誤差內相等，且顯示寬高不得由顯示 ppi 反推（以 ppi 已捨入案例驗證差異存在且核心不採用）。

候選 gate（均 NOT_RUN）

- 於 `tools/screen-ppi-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「螢幕 PPI 計算」，title「螢幕 PPI 計算｜Gloss Tools」，description「輸入對角線英寸與原生解析度，算出像素密度 PPI、實體寬高、點距與總像素，購物前先查核螢幕細緻度。」。英文 lang=en，H1 “Screen PPI Calculator”，title “Screen PPI Calculator | Gloss Tools”，description “Enter the diagonal in inches and the native resolution to get pixel density (PPI), physical width and height, dot pitch and total pixels.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。寬高為什麼不用畫面上顯示的 PPI 來算？寬高由未捨入的 PPI 推導，四捨五入後的 PPI 只供閱讀；用顯示值反推會讓寬高與對角線對不起來。 / Why aren't the width and height derived from the displayed PPI? They are computed from the unrounded PPI; the rounded PPI is for reading only, and deriving from it would make the dimensions disagree with the diagonal.
- FAQ。可以由長寬比反推缺少的一邊嗎？本工具不做求解，長寬比只是參考標籤；要由比例與一邊求另一邊，請用長寬比計算工具。 / Can I solve for a missing side from the aspect ratio? This tool does not solve; the ratio is a reference label only. To solve a missing side from a ratio, use the aspect ratio calculator.
- FAQ。對角線要用含邊框的數字嗎？請用規格表上的可視對角線與面板原生解析度；市售標示若含邊框或非原生解析度，結果會跟著偏差。 / Should the diagonal include the bezel? Use the viewable diagonal and the panel's native resolution from the spec sheet; a marketed size that includes the bezel, or a non-native resolution, shifts the result.
- FAQ。點距和 PPI 是同一個東西嗎？點距是相鄰像素中心的距離（mm)，與 PPI 互為倒數關係（25.4 / PPI)；點距越小畫面越細緻。 / Are dot pitch and PPI the same thing? Dot pitch is the distance between adjacent pixel centres in mm, the reciprocal of PPI (25.4 / PPI); a smaller pitch means a finer image.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://screen-ppi-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/screen-ppi-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
