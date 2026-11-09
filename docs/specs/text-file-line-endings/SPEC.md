# 文字檔換行與 BOM 檢查 / Text File Line Ending Audit

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-text-file-line-endings-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

文件維護者碰到混合 LF／CRLF 或 UTF-8 BOM 時，需要知道原檔有哪些位元組、哪些行終止符會被轉換。成功是原檔不變，能下載按明示規則轉換的副本及核對報告。

- 桌面。桌面選一個 UTF-8 設定檔副本，從 byte offsets 查第一筆混合換行後選擇目標。
- 行動。手機選已在裝置上的小文字檔，先看計數再選擇是否下載副本。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

單一明確選取的 UTF-8 檔，依 raw bytes 盤點 CRLF、LF、CR 與首 BOM，選擇一致換行並保留或移除首 BOM。不接受貼上、非 UTF-8、目錄、上傳、替換原檔、偵測任意編碼。

已與 registry r807 的 130 份預案比對，最相近者的實質差異如下。

- 整理 textarea 文字並匯出 LF。不保留原始檔案 bytes 或定位 CRLF/CR。 [spec-01-text-workbench](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/01-text-workbench/SPEC.md)
- 為解析 CSV 保留換行。此工具不解析表格，輸出終止符證據及同文字的轉換副本。 [spec-04-csv-workbench](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/04-csv-workbench/SPEC.md)

規則來源與產品取捨

- 2026-11-09 核讀。 [WHATWG Encoding Standard，TextDecoder 的 fatal 與 ignoreBOM](https://encoding.spec.whatwg.org/#interface-textdecoder)

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「選擇 UTF-8 文字檔 / Choose a UTF-8 text file」
- 欄位或說明「目標換行與 BOM / Target endings and BOM」
- 「檢查並預覽轉換 / Inspect and preview conversion」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「原始 byte 分布與副本 / Original byte summary and copy」先摘要再列細節，長表在有 label 的區域捲動。超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"bytes":[],"target":"lf","bomMode":"keep"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- bytes: number[]，從單一選取的 File.arrayBuffer() 取得，最多 65,536 bytes。只讀 dense array 的 own data 元素，每個值須為 0–255 整數。測試直接用字面 array。空檔可接受，但初始未選檔時 Run 停用。大小先查 File.size。
- target: lf 或 crlf，預設 lf。bomMode: keep 或 strip，預設 keep。keep 不新增缺少的 BOM。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 先驗 bytes 長度及成員（INPUT_LIMIT、BYTE），其次 target（TARGET）及 bomMode（BOM_MODE）。若前三 bytes 精確為 EF BB BF，記 bom=true 並以 index 3 開始正文。否則 index 0 開始。正文用 TextDecoder('utf-8',{fatal:true,ignoreBOM:true}) 驗證。有不合法序列 UTF8，含 NUL byte BINARY_NUL。只把開頭第一個 BOM 視為標記，後續 U+FEFF 仍是內容。
2. 由正文起點依 byte offset 掃描，看到 0D 0A 就記一次 crlf 並跳兩個 bytes。0D 與 0A 單獨分別為 cr 或 lf。每類保存 count 和前八個完整檔案的零起始 offsets（含 BOM 長度）。last 是最後一個 token 恰好抵達 EOF 的類型，否則 none。
3. 輸出時只改終止符成目標 bytes。其他 bytes 一字不動。只有 bom && bomMode=keep 時前置同三 bytes。空檔／BOM-only 沒有 last。缺少終止符時不補，有結尾終止符時保留存在性。無數值捨入。
4. 結果 {bom,lf,crlf,cr,last,outputHex}，每類物件 {count,offsets}。outputHex 為小寫、兩位每 byte、無空格。轉換副本固定下載檔名 line-endings-converted.txt，原始 bytes 型別 outputHex 解碼所得，無額外尾 LF 或 BOM。

固定下載 `text-file-line-endings-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/text-file-line-endings/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

實作 File 來源選取以可見標籤和單檔 input。不根據檔名、MIME 或副檔名推斷 encoding。File 讀取錯誤報 FILE_READ，不回顯 OS 路徑。合成 File 注入驗 browser 讀 bytes。真實原生對話僅保留人工待驗。畫面另提供「下載轉換文字 / Download converted text」。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「檢查並預覽轉換」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。7 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `mixed-bom` | 檔頭保留，混合 CRLF/CR/LF 轉 LF |
| `crlf-final` | 轉 CRLF，結尾保持有終止符 |
| `bom-only` | 首 BOM 單獨存在可去除 |
| `empty-file` | 空檔可建立零 bytes 副本 |
| `double-bom` | 保留第二個 BOM 作為內容 |
| `bad-utf8` | 不替換無效 bytes |
| `null-byte` | 拒絕帶 NUL 的 UTF-8 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。測 65,536 / 65,537 bytes、UTF-8 truncated/overlong、零 byte、CRLF 正確歸一及 9 次相同分隔只列 8 位置。正規化同目標兩次輸出 bytes 冪等，保留第二個 BOM 當內容。

候選 gate（均 NOT_RUN）

- 於 `tools/text-file-line-endings/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「文字檔換行與 BOM 檢查」，title「文字檔換行與 BOM 檢查｜Gloss Tools」，description「文件維護者碰到混合 LF／CRLF 或 UTF-8 BOM 時，需要知道原檔有哪些位元組、哪些行終止符會被轉換。成功是原檔不變，能下載按明示規則轉換的副本及核對報告。」。英文 lang=en，H1 “Text File Line Ending Audit”，title “Text File Line Ending Audit | Gloss Tools”，description “Inspect LF, CRLF, CR and a UTF-8 BOM in a local text file. Preview and download a separate copy with consistent line endings.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。會修改原檔嗎？輸出另存一份新副本。 / Does this edit my file? Download creates a separate copy.
- FAQ。第二個 BOM 會刪除嗎？移除選項只作用在第一個開頭標記。 / Can it remove two BOMs? Strip removes only the first leading marker.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://text-file-line-endings.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/text-file-line-endings/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
