# 網址 slug 產生器 / URL Slug Generator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-url-slug-generator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

部落客、小編或工程師寫好一篇文章標題後，要一個可直接放進網址路徑的 slug：全部小寫、ASCII、連字號分隔，貼進 CMS 或靜態站不用再手修。

- 桌面。寫作者在電腦上貼標題、設長度上限，產生 slug 後複製，貼進文章網址。
- 行動。手機上為一篇貼文快速產生 slug，複製後切換到 App 貼上。

使用情境為網址路徑美化。資料只保留在目前頁面草稿；本工具不發送任何請求、不查詢 slug 是否已被使用。

## scope

輸入標題文字（必填）與長度上限（選填，預設 50），輸出單一 slug；去重音／轉寫、分隔、長度截斷規則皆由本文釘版。

已與 run 6 概念清單比對，最相近者的實質差異如下。

- 產生帶 UTM 的完整連結（行銷追蹤參數附加在查詢字串，路徑與主機原樣保留）。此處只改寫標題文字本身成為路徑用的 slug，不產生完整網址、不附加任何查詢參數。概念 33 utm-builder（同批另案進行中）。一句話：utm-builder 是「連結加追蹤參數」，本工具是「標題變路徑文字」；兩者輸出物不同，不可互相取代。
- 檢查並解析既有網址的結構。此處不解析、不驗證任何網址，只轉換輸入的標題文字。url-inspector。
- 產生填充用的假文字。此處是從給定的真實標題推導 slug，不生產無意義的填充文字。概念 34 原文註明與 placeholder-text-generator 的差異即在此。

判定規則由本文定義，無線上資料或外部服務依賴。中文處理：中文字元不做拼音轉寫（見 inputsOutputs 轉換步驟 5），直接視為分隔字元捨棄；純中文標題因此無 slug 可產，回 EMPTY_SLUG 錯誤。

非目標：檢查 slug 是否已被網站使用、自動加 -2 / -3 去重後綴、拼音轉寫、保留非 ASCII 原字、產生完整網址、附加 UTM 參數、網址縮短、QR 碼產生、儲存或管理多組 slug。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位「標題 / Title」
- 欄位「長度上限 / Max length（選填，預設 50）」
- 「產生 slug / Generate slug」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個核心案例，明示範例並等待手動執行。
- 結果區先顯示 slug（可選取的純文字），再列明細：slug 長度、套用的長度上限、是否被截斷。成功才顯示「複製 slug / Copy slug」與「下載報告 / Download report」。複製失敗時顯示本地化錯誤並保留下載報告。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"title":"","maxLength":"50"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 兩欄皆為字串。title raw 最多 1000 個 UTF-16 code units；maxLength raw 最多 8 個 UTF-16 code units。長度一律以 UTF-16 code units 計（與 JS `String.length` 一致）。
- 預設 title 為空字串、maxLength 為 "50"。maxLength 為空字串時視為未提供，套用預設 50。
- 欄位順序固定為 title、maxLength；輸出欄位順序固定為 slug、length、maxLength、truncated。

先容量、再 surrogate、再逐欄文法、再轉換後空 slug。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 容量：依 title、maxLength 順序檢查 raw 長度，超限回 INPUT_LIMIT，field 即該欄名。
2. Surrogate：title 含不成對 surrogate（單獨的 high 或 low surrogate）回 UNICODE，field 為 title。
3. 逐欄文法：依 title、maxLength 順序。title 為空字串回 EMPTY，field 為 title。maxLength 為空字串時視為未提供、套用 50，不報錯；否則須符合 ASCII 十進整數格式（"0" 或非零開頭、無空白／符號／小數／指數），不符回 INTEGER_FORMAT；再檢查範圍 1–100，超出回 RANGE。field 即該欄名。
4. 轉換（步驟見下）。轉換後 slug 為空字串回 EMPTY_SLUG，field 為 title。

轉換規則（釘版，依序執行；每一步的輸出即下一步的輸入）：

1. NFKD 正規化（ECMAScript `String.prototype.normalize("NFKD")`）：全形字母數字折為 ASCII、連字（ﬁ → fi）展開、帶重音字母拆為基底字母加結合符號。
2. 移除結合附加符號 U+0300–U+036F：é → e、ü → u、ñ → n、ç → c、å → a。
3. 套用釘版特殊字母對照表（封閉表，僅下列 14 項；NFKD 無法拆解的拉丁字母才需此表）：

| 字元 | 轉寫 | 字元 | 轉寫 |
| --- | --- | --- | --- |
| æ U+00E6 | ae | Æ U+00C6 | AE |
| œ U+0153 | oe | Œ U+0152 | OE |
| ø U+00F8 | o | Ø U+00D8 | O |
| đ U+0111 | d | Đ U+0110 | D |
| ð U+00F0 | d | Ð U+00D0 | D |
| þ U+00FE | th | Þ U+00DE | TH |
| ł U+0142 | l | Ł U+0141 | L |
| ß U+00DF | ss | | |

ß 無大寫對應項；大寫 ẞ U+1E9E 不在表內，視為分隔字元。
4. 轉小寫（ECMAScript `toLowerCase`，Unicode 預設小寫）。
5. 每一段連續的「非 a–z、非 0–9」字元改為一個連字號 `-`。此步即中文處理：中文字元（CJK Unified Ideographs 及其他漢字）與其他所有非 ASCII 字母、標點、空白、底線、emoji 皆為分隔字元，不保留、不轉寫、不百分比編碼。
6. 去除前後連字號。
7. 若結果為空字串，回 EMPTY_SLUG（見上列驗證步驟 4）。
8. 長度截斷：若 slug 長度（UTF-16 code units；此時已全為 ASCII，故等於字元數）大於 maxLength，截為前 maxLength 個 code units，再去除尾端連字號（截斷不得留下尾端連字號），truncated 為 true；否則 truncated 為 false。

結果 `{slug, length, maxLength, truncated}`：length 為最終 slug 的 UTF-16 code units 數；maxLength 為套用的數值上限（maxLength 輸入為空字串時為 50）；truncated 為是否執行過截斷。

固定下載 `url-slug-generator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/url-slug-generator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 「複製 slug」是本工具的交付動作：在使用者明確點擊時才呼叫 `navigator.clipboard.writeText`，只寫入當次產出的 slug。失敗回 COPY_FAILED 錯誤，顯示本地化訊息並保留下載報告；不靜默改用其他寫入路徑。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「產生 slug」，畫面和完整報告符合核心 fixtures，使用者取得對應產物（slug 可複製、報告可下載）。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；長度上限預設與清空行為符合釘版規則。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。16 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `basic-title` | 基本標題轉 slug（大小寫、標點、所有格） |
| `accent-fold` | 去重音：NFKD 拆解加結合符號移除 |
| `special-latin-map` | 封閉特殊字母表（æ、œ、ß、ł 等） |
| `chinese-dropped` | 中文捨棄，混合標題保留拉丁與數字部分 |
| `chinese-only-empty` | 純中文標題 → EMPTY_SLUG |
| `hyphen-collapse-trim` | 連續分隔字元合併、前後連字號去除、底線視為分隔 |
| `truncate-clean` | 截斷後去除尾端連字號 |
| `truncate-exact` | 長度恰等於上限不截斷 |
| `truncate-tiny` | 上限 1 的邊界 |
| `numbers-kept` | 數字保留 |
| `fullwidth-and-ligature` | 全形折疊與連字展開（NFKD） |
| `empty-title` | 空標題 → EMPTY |
| `maxlength-zero-range` | 上限 0 → RANGE |
| `maxlength-noninteger` | 小數上限 → INTEGER_FORMAT |
| `title-too-long` | 標題 1001 單元 → INPUT_LIMIT |
| `whitespace-only-slug` | 只有空白的標題 → EMPTY_SLUG |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 title 長度 1000/1001、maxLength 1/100/101、maxLength "00" 與 "050" 前導零 → INTEGER_FORMAT、maxLength 前後空白 → INTEGER_FORMAT、maxLength 9 位數字 → INPUT_LIMIT、大小寫混合與德文 ß、emoji 與中文皆為分隔字元、截斷切在連字號上時尾端連字號去除、清空 maxLength 後套用預設 50。所有已接受的 slug 皆符合正則 `^[a-z0-9]+(-[a-z0-9]+)*$` 且長度 ≤ maxLength。

候選 gate（均 NOT_RUN）

- 於 `tools/url-slug-generator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「網址 slug 產生器」，title「網址 slug 產生器｜Gloss Tools」，description「輸入文章標題，產生小寫、連字號分隔的網址 slug：去重音、轉寫與長度上限規則皆已釘版。」。英文 lang=en，H1 “URL Slug Generator”，title “URL Slug Generator | Gloss Tools”，description “Turn a title into a lowercase, hyphenated, URL-friendly slug: accent folding, transliteration and the length cap are pinned.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。中文標題會變成拼音嗎？不會，中文字元視為分隔字元捨棄；純中文標題會回錯誤，請補拉丁字母或數字。 / Are Chinese titles converted to pinyin? No, Chinese characters are treated as separators and dropped; a title with only Chinese characters returns an error, so add Latin letters or digits.
- FAQ。底線會保留嗎？不會，底線是分隔字元，會變成連字號。 / Are underscores kept? No, underscores are separators and become hyphens.
- FAQ。slug 會超過長度上限嗎？不會，超過時截斷並去除截斷後尾端的連字號。 / Can the slug exceed the length cap? No, it is truncated and any trailing hyphen left by truncation is removed.
- FAQ。這會檢查 slug 有沒有被用過嗎？不會，只轉換文字；是否重複請在你的網站後台確認。 / Does this check whether the slug is already in use? No, it only converts the text; check duplicates in your own site admin.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://url-slug-generator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/url-slug-generator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
