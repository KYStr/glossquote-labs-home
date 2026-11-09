# 封存成員路徑預檢 / Archive Member Path Preflight

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-archive-path-preflight-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

發布工程師準備把一組相對檔名交給打包流程，先找路徑逃逸、保守跨平台命名衝突，以及檔案占用了其他成員的祖先目錄。

- 桌面。桌面貼 manifest 的類型和路徑欄，按列核對準備打包的相對名稱。
- 行動。手機查看評審中的幾個衝突路徑，定位是同名成員還是祖先檔案。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

只檢查使用者貼入的 manifest、ASCII 保守可攜政策及字串樹。排除讀取壓縮檔、解壓／打包、掃本機、改名、處理 symlink、讀 permission、驗內容或宣稱可在任意 OS 安全解壓。

已與 registry r807 的 130 份預案比對，最相近者的實質差異如下。

- 對單層 basename 的實際檔案分包成 ZIP。此處處理文字相對多層路徑、祖先檔案與隱式目錄別名，不建立 ZIP。 [spec-47-file-bundler](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/47-file-bundler/SPEC.md)
- 在平面命名規則下計算新檔名。此處檢查現成多層路徑清單，不生成改名結果。 [spec-41-batch-rename](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/41-batch-rename/SPEC.md)

規則來源與產品取捨

- 2026-11-09 核讀。 [Microsoft Win32 檔名與路徑規則。本產品額外採 ASCII 相對路徑政策，與所有檔案系統語意無等價宣稱](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions)

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「封存 manifest（F 或 D、Tab、路徑） / Archive manifest: F or D, Tab, path」
- 欄位或說明「可攜式相對路徑規則 / Portable relative-path rules」
- 「預檢成員路徑 / Check archive paths」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「不合規列與目錄樹衝突 / Invalid rows and tree conflicts」先摘要再列細節，長表在有 label 的區域捲動。超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"entries":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- entries: string，最多 65,536 UTF-16 單元，1–500 LF 列，去一個尾 LF。每列精確 kind HT path，kind 為 F（檔案）或 D（目錄）。其他型別及欄數 ROW_FORMAT 會停止。路徑無尾斜線，目錄由 kind 表示。
- 有效 path 為 1–240 ASCII chars、最多 16 個 '/' 分隔的 segment。每段 1–64 chars、只接受 [A-Za-z0-9._-]。完整的衝突規則見下。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 先驗 entries 長度、Unicode、空、列數、每列結構。結構有效後逐路徑報第一個不合規：>240 units PATH_LIMIT。前綴 '/'、反斜線或 /^[A-Za-z]:/ 則 ABSOLUTE。其他任意反斜線 BACKSLASH。segment 數>16 DEPTH。上述 segment=null。
2. 逐段從左到右第一個錯，段內優先 EMPTY_SEGMENT（含尾斜線）、DOT_SEGMENT（. 或 ..）、SEGMENT_LIMIT、SEGMENT_CHAR、TRAILING_DOT、DEVICE_NAME。ASCII 不合允許字符 SEGMENT_CHAR，含冒號、空白、百分號或控制。DEVICE_NAME 檢查第一個點前、ASCII 不分大小寫等於 CON/PRN/AUX/NUL/COM1–COM9/LPT1–LPT9。segment=1-based。不替換 slash、不 percent-decode、不解析主機或磁碟。unsafe 每列 {line,code,segment}，依來源序。
3. 只用有效路徑建 ASCII lowercase keyed trie。每節點記來源列、當前段原拼法、明示成員及其類型。各節點若有多於一種當前段拼法，CASE_ALIAS，lines 為所有通過此節點的來源列。明示成員≥2 為 SAME_MEMBER，lines 只含明示列。明示 F 且有任何更深成員，PARENT_FILE，lines 為該節點所有明示 F 列及所有後代明示列。衝突 {kind,key,lines}，key 為正規化相對路徑，lines 去重並升序。先依 key 的 ASCII 順序，再依 CASE_ALIAS、SAME_MEMBER、PARENT_FILE 順序。
4. 結果 {rowCount,unsafe,conflicts,safeWithinPolicy}。僅兩問題陣列皆空為 true。計數及索引皆精確，保留輸入原樣，不產生修復命令或任何檔案操作。隱式目錄的 segment 也檢查 alias。

固定下載 `archive-path-preflight-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/archive-path-preflight/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「預檢成員路徑」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
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
| `normal-tree` | 明示目錄和自己的後代可共存 |
| `implicit-alias` | 兩個隱式父目錄不同拼法 |
| `file-parent-and-duplicate` | 同名檔／目錄，加檔案占祖先 |
| `traversal-and-reserved` | 拒絕 ..、設備名、尾點與空段 |
| `drive-and-slash` | 根路徑、磁碟代號和反斜線 |
| `case-same-member` | 終端 segment 產生 alias 和同名 |
| `symlink-kind` | 非支援類型停止，不推測為檔 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。測 '/'、UNC、drive prefix、'.'/'..'、反斜線、百分號、設備名稱、明示/隱式父資料夾別名和 F 祖先。16/17 段、64/65 chars、500/501 列及 240/241 chars。惡意路徑不觸發資源讀取。

候選 gate（均 NOT_RUN）

- 於 `tools/archive-path-preflight/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「封存成員路徑預檢」，title「封存成員路徑預檢｜Gloss Tools」，description「發布工程師準備把一組相對檔名交給打包流程，先找路徑逃逸、保守跨平台命名衝突，以及檔案占用了其他成員的祖先目錄。」。英文 lang=en，H1 “Archive Member Path Preflight”，title “Archive Member Path Preflight | Gloss Tools”，description “Check a pasted archive manifest for unsafe relative names, case aliases, duplicate members and file-parent conflicts.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。預檢通過能保證安全解壓嗎？它只檢查這份清單與列出的命名政策。 / Does a clean report guarantee safe extraction? The audit checks this manifest against its stated naming policy.
- FAQ。為何不同大小寫也衝突？保守的可攜政策以 ASCII 小寫比較。 / Why flag a case-only difference? The portability policy compares paths with ASCII case folded.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://archive-path-preflight.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/archive-path-preflight/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
