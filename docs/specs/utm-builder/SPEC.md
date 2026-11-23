# UTM 連結產生器 / UTM Builder

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-utm-builder-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

行銷人員在貼文、廣告或電子報放連結前，先把目標網址加上 UTM 追蹤參數，拿到一條可直接貼上的完整連結，讓 Google Analytics 等分析工具能分辨流量來源。

- 桌面。行銷人員在電腦上填目標網址與活動參數，產生連結後複製，貼進廣告後台或社群貼文。
- 行動。手機上快速為一篇貼文產生帶 UTM 的連結，複製後切換到社群 App 貼上。

使用情境為行銷追蹤標記。資料只保留在目前頁面草稿；本工具不發送任何請求、不查詢目標網址是否存在。

## scope

輸入目標網址與 UTM 參數（source、medium、campaign 必填，term、content 選填），輸出帶 UTM 的完整連結；參數命名、URL 編碼、既有查詢參數合併方式皆由本文釘版；附三組常用範本（社群、電子報、廣告）。

已與 run 6 概念清單比對，最相近者的實質差異如下。

- 從標題產生網址 slug（小寫、ASCII 化、連字號分隔、長度上限）。此處不改寫網址路徑，只在查詢字串附加行銷追蹤參數，路徑與主機原樣保留。概念 34 url-slug-generator（另案待派）。
- 檢查並解析既有網址的結構。此處是產生帶參數的新連結，不做網址健檢或拆解報告。概念 33 原文註明與 url-inspector 的差異即在此。

判定規則由本文定義，無線上資料或外部服務依賴。UTM 參數本身遵循 Google Analytics 的 `utm_*` 命名慣例（utm_source、utm_medium、utm_campaign、utm_term、utm_content）；本工具只產生符合該慣例的連結，不驗證分析工具端的報表設定。

非目標：網址縮短、QR 碼產生、抓取目標頁面標題、實際造訪或驗證目標網址、儲存或管理多組活動、把結果當成分析報表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用範本，詳細格式用一層 disclosure。

- 欄位「目標網址 / Target URL」
- 欄位「來源 utm_source / Source」，「媒介 utm_medium / Medium」，「活動 utm_campaign / Campaign」
- 欄位「關鍵字 utm_term / Term（選填）」，「內容 utm_content / Content（選填）」
- 「建立連結 / Build tagged URL」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個核心案例，明示範例並等待手動執行。
- 「常用範本 / Presets」三顆按鈕：社群 / Social、電子報 / Newsletter、廣告 / Ads。按下後依下表填入 source 與 medium、清空 term 與 content，campaign 保持原值不動；填入後狀態為 dirty，須手動執行才產生連結。
- 結果區先顯示完整連結（可選取的純文字），再列參數明細表（key 與未編碼的原始值）。成功才顯示「複製連結 / Copy link」與「下載報告 / Download report」。複製失敗時顯示本地化錯誤並保留下載報告。

| 範本 | source | medium |
| --- | --- | --- |
| 社群 / Social | facebook | social |
| 電子報 / Newsletter | newsletter | email |
| 廣告 / Ads | google | cpc |

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、範本或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設（全部六欄皆空字串）並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 全部六欄皆為字串。baseUrl raw 最多 2048 個 UTF-16 code units；每個 UTM 值 raw 最多 200 個 UTF-16 code units；去空白後的值最多 100 個 UTF-16 code units。長度一律以 UTF-16 code units 計（與 JS `String.length` 一致）。
- 預設六欄皆為空字串。source、medium、campaign 必填；term、content 選填，去空白後為空字串時視為未提供，不輸出該參數。
- 欄位順序固定為 baseUrl、source、medium、campaign、term、content；輸出參數順序固定為 utm_source、utm_medium、utm_campaign、utm_term、utm_content。

先容量、再網址解析與重複檢查、再逐欄值檢查。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 容量：依 baseUrl、source、medium、campaign、term、content 順序檢查 raw 長度，超限回 INPUT_LIMIT，field 即該欄名。
2. 網址解析：baseUrl 去除前後 ASCII 空白（U+0020、Tab、CR、LF）後，以 WHATWG URL 解析。須為 http 或 https、host 非空、不得含 username 或 password，否則 INVALID_URL，field 為 baseUrl。解析只用來驗證；輸出時 scheme、host、port、path 一律取去除空白後的原始字串，不做大小寫正規化、不補斜線。
3. 重複檢查：把既有查詢字串以 `&` 切段，每段取第一個 `=` 之前的原始 key（無 `=` 時整段即 key），與 utm_source、utm_medium、utm_campaign、utm_term、utm_content 逐字比對（區分大小寫，不解碼）。命中任一者回 DUPLICATE_UTM，field 為 baseUrl。不覆寫既有 UTM 參數。
4. 逐欄值檢查：依 source、medium、campaign、term、content 順序。必填欄去空白後為空回 EMPTY；值含控制字元（U+0000–U+001F、U+007F）回 INVALID_CHAR；去空白後長度超過 100 回 VALUE_TOO_LONG。field 即該欄名。值不轉小寫、不做 slug 化，大小寫原樣保留再編碼。

編碼規則（釘版，RFC 3986 + `encodeURIComponent` 語義）：

- 每個值以 ECMAScript `encodeURIComponent` 編碼。空格編為 `%20`，絕不用 `+`。
- 不編碼的字元僅限 `A–Z a–z 0–9 - _ . ! ~ * ' ( )`；其餘字元一律百分比編碼，包括 `/` → `%2F`、`?` → `%3F`、`&` → `%26`、`=` → `%3D`、`#` → `%23`、`+` → `%2B`。
- 非 ASCII 字元先轉 UTF-8 再百分比編碼，十六進位用大寫（例：`夏` U+590F → `%E5%A4%8F`）。
- 值內的 `%` 不先解碼，直接編為 `%25`（例：`50% off` → `50%25%20off`）；不存在的百分比跳脫也不特別處理。

合併規則（釘版）：

- 既有查詢字串（`?` 與 `#` 之間的原始子字串）原樣保留、順序不變、不重新編碼；UTM 參數以 `&` 接在其後。
- 既有查詢為空（`?` 後立即接 `#` 或結尾）時視為無查詢，輸出只用一個 `?` 接 UTM 參數，不留空段。
- 目標網址無查詢時，`?` + UTM 參數直接接在 path（或 host）之後；不補斜線（例：`https://example.com` → `https://example.com?utm_source=…`）。
- 既有 fragment（`#` 之後全部，含 `#`）原樣保留在 UTM 參數之後。
- 輸出為單一字串 `taggedUrl`；另附 `params` 明細：依固定順序列出實際輸出的參數，每項為 `{key, value}`，value 為去空白後的未編碼原始值。

結果 `{taggedUrl, params}`。固定下載 `utm-builder-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/utm-builder/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 「複製連結」是本工具的交付動作：在使用者明確點擊時才呼叫 `navigator.clipboard.writeText`，只寫入當次產出的 taggedUrl。失敗回 COPY_FAILED 錯誤，顯示本地化訊息並保留下載報告；不靜默改用其他寫入路徑。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「建立連結」，畫面和完整報告符合核心 fixtures，使用者取得對應產物（連結可複製、報告可下載）。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；範本按鈕行為符合釘版規則。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。15 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `basic-social` | 基本社群連結，三個必填參數 |
| `with-term-content` | 含選填 term 與 content，term 內含空格 |
| `existing-query` | 既有查詢參數原樣保留在前，UTM 接在後面 |
| `existing-fragment` | 既有 fragment 保留在 UTM 之後 |
| `encoding-spaces-specials` | 空格編為 %20，斜線編為 %2F，驚嘆號不編碼 |
| `encoding-unicode` | 中文值以 UTF-8 百分比編碼，大寫十六進位 |
| `percent-in-value` | 值內既有的 % 不先解碼，直接編為 %25，不雙重處理 |
| `empty-optional-omitted` | 選填欄全空白或只有空白時不輸出該參數 |
| `trimmed-values` | 網址與參數值前後空白先去除再處理 |
| `control-char` | 值內含控制字元（Tab）拒絕 |
| `duplicate-utm-error` | 目標網址已含 utm_source 時拒絕，不覆寫 |
| `invalid-url-noscheme` | 無 scheme 的網址拒絕 |
| `invalid-url-ftp` | 非 http/https 的 scheme 拒絕 |
| `missing-campaign` | 必填 campaign 空白拒絕 |
| `value-too-long` | campaign 去空白後 101 個字元超過上限 100 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 value 長度 100/101、baseUrl 長度 2048/2049、既有查詢含 `utm_term`、fragment 為空（`#` 後無字元）、既有查詢為空（`?` 後無字元）、`utm_source` 大小寫不同（`UTM_SOURCE` 不算重複）、範本填入後 campaign 不被覆寫、term 只有空白時不輸出。所有已接受的輸出皆可再以 WHATWG URL 解析且 query 含且僅含預期參數。

候選 gate（均 NOT_RUN）

- 於 `tools/utm-builder/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「UTM 連結產生器」，title「UTM 連結產生器｜Gloss Tools」，description「輸入目標網址與 UTM 參數，產生可直接貼用的追蹤連結：編碼與既有查詢合併方式皆已釘版。」。英文 lang=en，H1 “UTM Builder”，title “UTM Builder | Gloss Tools”，description “Build a share-ready UTM-tagged link from a target URL: encoding and existing-query merging are pinned.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。空格會編成 `+` 嗎？不會，空格一律編為 `%20`。 / Are spaces encoded as `+`? No, spaces are always encoded as `%20`.
- FAQ。目標網址本來就有查詢參數怎麼辦？原樣保留在前，UTM 接在後面；若已含 `utm_*` 參數會直接拒絕，不覆寫。 / What if the target URL already has query parameters? They are kept verbatim first, with UTM parameters appended; if it already contains a `utm_*` parameter the build is rejected instead of overwriting it.
- FAQ。這會縮短網址或追蹤成效嗎？不會，只產生連結；不發送請求、不縮短、不記錄。 / Does this shorten the URL or track performance? No, it only builds the link; it sends no request, shortens nothing and records nothing.
- FAQ。範本會改掉我填的活動名稱嗎？不會，範本只填 source 與 medium、清空 term 與 content，campaign 保持原值。 / Does a preset overwrite my campaign name? No, a preset only fills source and medium and clears term and content; campaign is left untouched.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://utm-builder.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/utm-builder/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
