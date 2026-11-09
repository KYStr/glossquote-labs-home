# 電視尺寸與觀賞距離 / TV Viewing Distance Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-tv-viewing-distance-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

準備買電視或剛搬家的人，在賣場或客廳裡只有兩個數字可用：看中的電視對角線吋數，或沙發到電視牆的距離（公分）。他們卡在賣場標示只有吋數、不知道螢幕實際寬高放不放得下電視櫃，也不知道坐多遠才合適；或反過來，距離已經固定，卻不知道該買幾吋。

- 賣場。用手機輸入看中的吋數，立刻看到螢幕寬 × 高（cm）和最近／理想／最遠觀賞距離，回家量距離就能對。
- 客廳。輸入沙發到電視牆的距離，反推建議的吋數範圍，再回賣場挑尺寸。

使用情境為選購參考。資料只保留在目前頁面草稿。本工具的倍率是經驗法則（rules of thumb），不是精確視角換算，文案必須明說。

## scope

固定 16:9 長寬比、單一螢幕、兩種互斥模式（吋數→距離、距離→吋數）的靜態試算。解析度只有 FHD 與 UHD 4K 兩檔，且只影響最近距離倍率。非目標為：其他長寬比（21:9、4:3）、以視角（度）直接輸入或精確角度換算、壁掛孔距（VESA）與電視櫃承重判斷、投影機投射距離、多螢幕拼接、依品牌型號查規格、把經驗法則當成醫學或人體工學建議。

已與本批概念清單及既有工具比對，最相近者的實質差異如下。

- aspect-ratio-calculator：由長寬比與一邊算另一邊，是純幾何換算。此處固定 16:9 幾何之外，還固定 THX／SMPTE 經驗倍率、四個距離、fit 判定與距離反推吋數模式。
- print-size（印刷 DPI 尺寸）：由像素與 DPI 算印刷尺寸，領域與公式完全不同。

倍率來源（一般性標示，不引用特定文件版本）：最近與理想下限取 THX 建議的水平視角約 36–40° 一帶的常見換算經驗值，理想上限與最遠取 SMPTE EG 18 常見引用的最小視角 30° 一帶經驗值。本文固定下列倍率表為唯一契約，任何角度精確換算（例如以 tan 反推）都不是本工具的規則，不得以角度值覆寫倍率表。

| 距離 | 倍率（× 對角線吋數） | 說明 |
| --- | --- | --- |
| 最近 minimum | FHD 1.2；UHD 4K 1.0 | 再近容易看到像素／畫面超出舒適視角 |
| 理想下限 idealLow | 1.5（兩解析度同） | 理想範圍起點 |
| 理想上限 idealHigh | 2.0（兩解析度同） | 理想範圍終點 |
| 最遠 maximum | 2.5（兩解析度同） | 再遠細節開始看不清 |

4K 規則：解析度切到 UHD 4K 時，只有最近距離倍率由 1.2 改為 1.0；idealLow、idealHigh、maximum 與螢幕寬高皆不變。反推模式的 diagonalMaxIn 隨之改用 1.0，其餘反推除數不變。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，倍率表與 FAQ 用一層 disclosure。

- 欄位或說明「電視對角線（吋）／ TV diagonal (inches)」：文字輸入加尺寸快選 32、43、50、55、65、75、85、98（快選即把該整數寫入欄位並使舊結果失效，與手改輸入相同）。
- 欄位或說明「沙發到電視的距離（公分，選填）／ Distance from sofa to TV (cm, optional)」：與對角線同填時做 fit 判定；對角線留空時單獨決定反推模式。
- 選項「解析度／Resolution」：FHD（預設）與 UHD 4K 兩檔單選。
- 「計算觀賞距離／Calculate viewing distance」是主要操作。「載入範例／Load example」填入 [fixtures.json](fixtures.json) 第一個案例（55 吋、FHD、無距離），明示範例並等待手動執行。
- 結果先摘要再列細節。正向模式先顯示螢幕寬 × 高，再列最近、理想範圍（下限–上限）、最遠四個距離（cm 與 m 並列）。有 fit 時以文字及符號顯示五種狀態之一：TOO_CLOSE「太近／Too close」、NEAR「偏近／On the close side」、IDEAL「理想範圍／In the ideal range」、FAR「偏遠／On the far side」、TOO_FAR「太遠／Too far」，不得只靠顏色區分。反推模式顯示建議吋數範圍（low–high）、可接受上限 diagonalMaxIn 與下限 diagonalMinIn。成功才顯示「下載報告／Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、快選、解析度或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行／Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中／Working」及「取消／Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含模式、螢幕或吋數範圍與四個距離或反推三值。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位與 JSON Pointer 路徑。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行／Cancelled. You can run again.」。舊結果仍無效。 |

「重設／Reset」停止工作，復原預設 `{"diagonalIn":"55","roomDistanceCm":"","resolution":"FHD"}` 並聚焦首欄（對角線）。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知欄、錯型別、accessor 皆 SCHEMA。JSON fixture 即介面。欄位值一律為表單 raw 字串。

- `diagonalIn`：對角線吋數，選填（與 roomDistanceCm 至少一者非空）。文法為 ASCII 十進數：`^(0|[1-9][0-9]*)(\.[0-9])?$`，無空白／符號／指數，最多一位小數。範圍 10–120（含端點）。空字串視為未填。
- `roomDistanceCm`：房間距離公分，選填。文法同上。範圍 30–1500（含端點）。空字串視為未填。
- `resolution`：`"FHD"`（預設，缺欄時採此值）或 `"UHD4K"`，其他值（含空字串）皆 ENUM。
- raw 每欄最多 8 個 UTF-16 單元，超過 INPUT_LIMIT。預設 `{"diagonalIn":"55","roomDistanceCm":"","resolution":"FHD"}`。

驗證順序固定，整份失敗回 `{ok:false,error:{code,field,path}}`，field 為欄位名或 null，path 為 JSON Pointer 或 null：

0. 結構：input 必須是普通物件；出現未知欄 → SCHEMA，field=null，path=`/`+欄名；任一欄值非字串 → SCHEMA，field=該欄，path=`/`+該欄。
1. 依 diagonalIn、roomDistanceCm、resolution 的順序逐欄驗證。每欄先容量（INPUT_LIMIT）、再未成對 surrogate（UNICODE，path 同欄）。數值欄再驗文法（DECIMAL_FORMAT）；範圍（RANGE）。resolution 改驗列舉（ENUM）。
2. 跨欄：diagonalIn 與 roomDistanceCm 皆未填（缺欄或空字串）→ EMPTY，field=null，path=`/`。

資源或 Worker 失敗用固定 INTERNAL／WORKER_ERROR，不回傳堆疊。成功僅為 `{ok:true,result}`。

模式與計算（全部以未捨入精確值運算，捨入只發生在輸出）：

1. 模式：diagonalIn 非空 → `diagonal` 正向模式；否則 → `distance` 反推模式。兩者同填時仍為正向模式，roomDistanceCm 只用於 fit。
2. 幾何（僅正向）：令 d 為吋數、`IN=2.54`（1 吋 = 2.54 cm，精確定義）。螢幕寬 `W = d × IN × 16/√337`、高 `H = d × IN × 9/√337`（√337 來自 16²+9²=337 的精確勾股值；近似係數 16/√337 ≈ 0.8715755371、9/√337 ≈ 0.4902612396 只供閱讀，不作計算依據）。W、H 以足夠精度計算後 half-up 捨入至小數 1 位 cm。
3. 距離（僅正向）：四個距離的精確 cm 值 = d × 倍率 × IN，倍率依 scope 表（minimum 依解析度取 1.2 或 1.0；idealLow 1.5；idealHigh 2.0；maximum 2.5）。d 最多一位小數、倍率為一位小數、IN 為兩位小數，三者乘積為有限位小數，必須以整數縮放（BigInt）精確計算，不得以浮點累積誤差決定捨入。輸出每距離為 `{cm, m}`：cm 為精確值 half-up 至整數；m 為精確 cm 值 ÷100 後 half-up 至小數 2 位（由未捨入精確值算，不由已捨入 cm 反算）。JSON 數字不保留尾零（2.10 寫為 2.1）。
4. fit（僅正向且 roomDistanceCm 非空）：以未捨入精確值比較 R（cm）：R < minimum → TOO_CLOSE；minimum ≤ R < idealLow → NEAR；idealLow ≤ R ≤ idealHigh → IDEAL；idealHigh < R ≤ maximum → FAR；R > maximum → TOO_FAR。端點歸屬依此表，不得改用已捨入 cm 比較。輸出 `fit={status, roomDistanceCm}`；無距離時 `fit=null`。
5. 反推（僅反推模式）：令 R 為距離 cm，吋數換算 `Rin = R / 2.54`（精確有理數）。輸出 `diagonalRangeIn={low, high}`，low = Rin/2.0、high = Rin/1.5（在此範圍內的吋數，其理想距離涵蓋 R）；`diagonalMaxIn = Rin / minimum倍率`（FHD 1.2、UHD4K 1.0；再大就會比最近距離更近）；`diagonalMinIn = Rin / 2.5`（再小就會超過最遠距離）。三值以精確有理數運算，half-up 至小數 1 位吋。
6. 結果形狀固定。正向：`{mode:"diagonal", diagonalIn, resolution, screen:{widthCm, heightCm}, distances:{minimum:{cm,m}, idealLow:{cm,m}, idealHigh:{cm,m}, maximum:{cm,m}}, fit}`。反推：`{mode:"distance", roomDistanceCm, resolution, diagonalRangeIn:{low, high}, diagonalMaxIn, diagonalMinIn}`。diagonalIn、roomDistanceCm 回顯為 JSON 數字（"54.6" → 54.6）。機器值不隨 locale 改。

固定下載 `tv-viewing-distance-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/tv-viewing-distance/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精度分工固定：距離與反推吋數走 BigInt 整數縮放的精確十進／有理運算（吋數以 ×10 整數、倍率以 ×10 整數、IN 以 254/100 有理數表示）；只有 W、H 因含 √337 為無理數，得用浮點計算，但必須以 `d × 2.54 × 16 / Math.sqrt(337)` 的精確式求值，且 fixtures 的 W、H 不得落在距 half-up 平局點 1e-9 內（本文 fixtures 已避開）。half-up 一律指「恰於 .5 時往較大值捨入」，負值不出現於本工具。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算觀賞距離」，正向（含 fit）與反推兩模式的畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（10／120 吋、30／1500 cm）、剛好越界、第一個錯誤與路徑、fit 五狀態端點歸屬、三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `forward-55-fhd` | 55 吋 FHD 寬高與四距離 |
| `forward-55-4k` | 4K 只改最近距離倍率為 1.0 |
| `forward-65-fit-ideal` | 65 吋 + 300 cm，fit 為 IDEAL |
| `forward-85-too-close` | 85 吋 + 200 cm，fit 為 TOO_CLOSE |
| `inverse-300-fhd` | 反推 300 cm 的吋數範圍與上下限 |
| `inverse-250-4k` | 反推 250 cm 加 4K，maxIn 改用 1.0 |
| `forward-10-boundary` | 10 吋下限合法，63.5 cm half-up 平局進位 |
| `error-range-diagonal` | 130 吋 RANGE |
| `error-decimal-format` | 兩位小數 DECIMAL_FORMAT |
| `error-no-input` | 兩欄皆空 EMPTY 指向 `/` |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（120 吋、1500 cm）、剛好超限（120.1 吋、1500.1 cm、9.9 吋、29.9 cm）、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 fit 端點：R 恰等於 minimum（NEAR）、idealLow（IDEAL）、idealHigh（IDEAL）、maximum（FAR），及各端點 ±0.1 cm 的歸屬；4K 只改 minimum 與 diagonalMaxIn，其餘輸出與 FHD 逐值相同；反推 low ≤ high、diagonalMinIn ≤ low、high ≤ diagonalMaxIn 恆成立。

候選 gate（均 NOT_RUN）

- 於 `tools/tv-viewing-distance/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「電視尺寸與觀賞距離」，title「電視尺寸與觀賞距離｜Gloss Tools」，description「輸入電視對角線吋數，依 THX／SMPTE 經驗法則算出 16:9 螢幕寬高與最近、理想、最遠觀賞距離；也能反過來用沙發距離推回建議的電視尺寸。」。英文 lang=en，H1 “TV Viewing Distance Calculator”，title “TV Viewing Distance Calculator | Gloss Tools”，description “Enter a TV diagonal to get the 16:9 screen width and height plus minimum, ideal and maximum viewing distances from THX and SMPTE rules of thumb — or work backwards from your sofa distance to a size range.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。這四個距離是精確的視角換算嗎？不是。它們是以 THX 約 36–40° 與 SMPTE 約 30° 視角建議為依據的固定經驗倍率（最近 1.2、理想 1.5–2.0、最遠 2.5，皆乘對角線），方便選購時快速對照。 / Are these distances exact viewing-angle conversions? No. They are fixed rules of thumb based on THX (about 36–40°) and SMPTE (about 30°) viewing-angle guidance: minimum 1.2×, ideal 1.5–2.0× and maximum 2.5× the diagonal.
- FAQ。4K 為什麼可以坐得比較近？解析度較高時，同距離下較不容易看到像素，所以本工具把 4K 的最近距離倍率定為 1.0；理想與最遠距離不因解析度改變。 / Why can you sit closer with 4K? At a higher resolution pixels are harder to see at the same distance, so this tool sets the 4K minimum-distance multiplier to 1.0. The ideal and maximum distances do not change with resolution.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://tv-viewing-distance.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格任務 `labs-tv-viewing-distance-spec-20261109`（由主代理登記，本文作者未執行 registry 操作）。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/tv-viewing-distance/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
