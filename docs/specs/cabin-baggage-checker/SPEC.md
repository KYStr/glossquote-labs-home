# 手提行李規定檢查 / Cabin Baggage Checker

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-cabin-baggage-checker-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

旅客已量好手提行李的三邊尺寸並秤好重量，想在出門前一次看清同一只箱子在六家常用航空公司的經濟艙規定下分別能不能登機、差在哪一邊或差幾公斤。

- 桌面。寬畫面並列六家結果表，逐家看三邊差距、重量差距與總判定，決定要不要換箱或減重。
- 行動。手機在行李箱賣場或秤旁輸入尺寸與重量，立刻看到「符合所選 6 家中的 5 家」與唯一不合格的航空公司。

使用情境為出發前自我檢查。資料只保留在目前頁面草稿。比對依據是本文寫死的公開規定表（查核日期 2026-11-09），不是即時查詢，也不是航空公司保證。

## scope

MVP：一件主行李（手提行李箱）＋一件選填個人物品，對六家航空公司經濟艙（國際線）規定逐家比對。判定只有三類：三邊尺寸逐邊比較、重量（依航空公司分主行李制或合計制）、個人物品尺寸（有公告者）。結果逐家給 pass/fail 與差距（margin），並給總覽「符合所選 M 家中的 N 家」；全部符合才算 overall pass。

固定規定表如下（經濟艙、國際線；尺寸含輪子、把手與側袋；查核日期 2026-11-09，來源為各航空公司官網行李規定頁，ANA/JAL 以 100 座以上機型為準）。尺寸欄為公告上限的三邊（cm，未排序），重量模式 `main` 指上限只計主行李一件，`total` 指主行李＋個人物品合計。

| id | 航空公司 | 主行李上限 cm | 個人物品上限 cm | 重量模式 | 重量上限 kg |
| --- | --- | --- | --- | --- | --- |
| `eva` | 長榮航空 / EVA Air | 56 × 36 × 23 | 40 × 30 × 10 | main | 7 |
| `china-airlines` | 中華航空 / China Airlines | 56 × 36 × 23 | 40 × 30 × 15 | main | 7 |
| `starlux` | 星宇航空 / STARLUX Airlines | 56 × 36 × 23 | 40 × 30 × 10 | total | 7 |
| `tigerair-taiwan` | 台灣虎航 / Tigerair Taiwan | 54 × 38 × 23 | null（未公告尺寸，須能放前座下方） | total | 10 |
| `ana` | 全日空 / ANA | 55 × 40 × 25 | 40 × 30 × 20 | total | 10 |
| `jal` | 日本航空 / Japan Airlines | 55 × 40 × 25 | null（未公告尺寸，須能放前座下方） | total | 10 |

非目標：托運行李、商務／頭等艙規定、國內線與小機型（100 座以下）規定、各家公告的「三邊總和」替代判定（例如三邊和 ≤115 cm 的另一種合格路徑，本工具不採，見作者檢查）、件數加購、超額費用試算、即時連線查詢最新規定、量測教學與行李箱推薦。個人物品上限為 null 的航空公司不做個人物品尺寸判定，只顯示「未公告尺寸」。

已比對 2026-11-09 盤點的 101 份既有預案與 tools/ 實作，最相近者的實質差異如下。

- 包裹依使用者自填的服務規則核對實重、材積重與計費重，且明文排除預設業者。[spec-parcel-billable-weight-20261109](https://github.com/KYStr/glossquote-labs-home/blob/a0f3d0dbbb4d4ceda36f47b63bffcf0e68773331/docs/specs/parcel-billable-weight/SPEC.md) 此處是寫死的六家航空公司登機規定、逐邊 pass/fail 與合計/主行李兩種重量語意，不算計費重、不寄件。
- 牌套以固定寬高兩軸判斷卡片相容與庫存分配。`spec-card-sleeve-fit-20261109` 此處是三邊排序後逐邊比較加上重量判定，且對象是旅客行李與航空公司規定，不是庫存分配。

判定規則與規定表由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「主行李尺寸（公分）：長、寬、高 / Main bag size (cm): length, width, height」——三邊填入順序不限，工具會排序後比對，欄位名只是量測提示。
- 欄位或說明「主行李重量（公斤） / Main bag weight (kg)」
- 欄位或說明「個人物品（選填）：長、寬、高、重量 / Personal item (optional): length, width, height, weight」——四欄全空表示沒有個人物品；只要填了任一欄，四欄都必填。
- 欄位或說明「要比對的航空公司 / Airlines to check」——六家核取方塊，預設全選，至少選一家。
- 「檢查行李 / Check baggage」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「逐家比對結果 / Results by airline」先總覽（符合所選 M 家中的 N 家／全部符合）再逐家列細節：每家一列，含三邊上限、三邊差距、重量模式與差距、個人物品狀態與總判定。成功才顯示「下載報告 / Download report」。文字可手動選取。每次結果下方固定顯示 scope 所述的雙語免責聲明全文，不得摺疊或省略。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果表與免責聲明一併顯示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"bagLength":"","bagWidth":"","bagHeight":"","bagWeightKg":"","personalLength":"","personalWidth":"","personalHeight":"","personalWeightKg":"","airlines":["eva","china-airlines","starlux","tigerair-taiwan","ana","jal"]}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位共九個：`bagLength`、`bagWidth`、`bagHeight`、`bagWeightKg`、`personalLength`、`personalWidth`、`personalHeight`、`personalWeightKg` 為字串；`airlines` 為字串陣列。

- 尺寸與重量字串文法：ASCII 十進數，最多一位小數。整數部 1–3 位數字（0 或非零開頭，不接受前置 0 如 `05`，`0.5` 合法），可帶 `.` 加一位數字；無空白、符號、指數。raw 每欄最多 8 單元，超過 INPUT_LIMIT。文法不符 DECIMAL_FORMAT。
- 尺寸範圍：0 < 值 ≤ 200（cm），超出 RANGE。重量範圍：0 < 值 ≤ 100（kg），超出 RANGE。空字串對主行李四欄為 EMPTY。
- `airlines`：長度 1–6。長度 0 為 EMPTY（field=`airlines`），超過 6 為 INPUT_LIMIT。成員依序檢查：非字串為 SCHEMA；不在固定六個 id 內為 ENUM，row 為 1-based 位置；與前面重複為 DUPLICATE，row 為重複出現的 1-based 位置。
- 個人物品區塊：四欄全為空字串表示無個人物品。任一欄非空即區塊成立，四欄逐欄必填，第一個空欄回 EMPTY（field 為該欄名）。區塊成立後每欄再依容量、文法、範圍驗證，規則同主行李。

驗證順序固定如下，整份失敗回 `{ok:false,error:{code,field,row}}`，只回第一個錯誤。

1. SCHEMA：物件形狀、九欄齊全、八個字串欄為字串、`airlines` 為陣列。
2. `airlines`：INPUT_LIMIT → EMPTY → 逐成員 ENUM／DUPLICATE。
3. 主行李 `bagLength`、`bagWidth`、`bagHeight`、`bagWeightKg` 依序：INPUT_LIMIT → UNICODE（不成對 surrogate）→ EMPTY → DECIMAL_FORMAT → RANGE。
4. 個人物品區塊：先判定成立與否，成立時對 `personalLength`、`personalWidth`、`personalHeight`、`personalWeightKg` 依序同上鏈（EMPTY 在此表示區塊內缺欄）。

計算全部以十分位整數執行（cm 與 kg 都換成 0.1 單位的整數），無浮點、無捨入。輸出數字一律格式化為恰好一位小數的字串（`56.0`、`-1.0`、`0.5`）；負零不存在。

1. 主行李三邊換十分位後由大到小排序得 `bagSorted`；個人物品同理得 `personalSorted`（無個人物品為 null）。
2. 對每家入選航空公司（輸出順序固定為規定表順序 eva、china-airlines、starlux、tigerair-taiwan、ana、jal，與 `airlines` 輸入順序無關）：
   - 尺寸：航空公司上限三邊排序後逐位比較，`marginsCm[i] = limit[i] − bagSorted[i]`；三邊皆 ≥ 0 為 `dimensionsPass=true`。等於上限算通過。
   - 重量：模式 `main` 的受檢重量 = 主行李重量；模式 `total` 的受檢重量 = 主行李重量 ＋ 個人物品重量（無個人物品時加 0）。`marginKg = limit − checked`，≥ 0 為 pass。等於上限算通過。
   - 個人物品：無個人物品 → `status="notApplicable"`，marginsCm=null；有個人物品且該家上限為 null → `status="notSpecified"`，marginsCm=null，不影響判定；有上限 → 逐邊比較，`status` 為 `"pass"` 或 `"fail"`，附 marginsCm。
   - 該家 `pass` = dimensionsPass 且重量 pass 且 personal status 不是 `"fail"`。
3. 結果 `{bagSortedCm, personalSortedCm, airlines, summary}`。`summary={compared, fits, overallPass}`：compared 為入選家數，fits 為 pass 家數，overallPass 為 fits == compared。

固定下載 `cabin-baggage-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

固定免責聲明（結果必附，逐字）：「比對結果依 2026-11-09 查核之各航空公司公開規定（經濟艙），僅供參考。規定可能變更，行李是否可登機以航空公司官網與現場認定為準。 / Checked against each airline's published economy-class rules as verified on 2026-11-09, for reference only. Rules can change; the airline's official website and airport staff have the final say.」

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/cabin-baggage-checker/`。src/core.mjs 放純驗證、推導、格式化；規定表以固定資料常數寫在 core 內，連同查核日期常數 `RULES_AS_OF="2026-11-09"`，不得執行時外查。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「檢查行李」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。9 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `fits-five-of-six` | 標準箱過五家、只被虎航長邊擋下；總覽 5/6 |
| `long-side-fails-japan` | 56 cm 長邊過台籍三家、被 ANA/JAL 的 55 cm 擋下；子集輸入亂序、輸出仍為表定順序 |
| `heavy-main-light-total` | 主行李 8 kg 在主行李制三家超重，合計 9.5 kg 在虎航/ANA/JAL 合計制合格；個人物品逐家狀態含 notSpecified |
| `unsorted-dimensions` | 三邊以 22/55/35 亂序輸入，排序後結果與標準順序一致 |
| `exact-fit` | 三邊與重量恰等於上限（含個人物品恰等於上限）算通過，2/2 overall pass |
| `bad-decimal` | 兩位小數回 DECIMAL_FORMAT |
| `partial-personal` | 個人物品只填一欄回 EMPTY 指向第一個缺欄 |
| `empty-selection` | 未選任何航空公司回 EMPTY |
| `unknown-airline` | 未知 id 回 ENUM 並指出 1-based 位置 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（200 cm／100 kg）、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證尺寸與重量恰等於上限、個人物品區塊四種填法（全空／全填／只填尺寸／只填重量）、`airlines` 重複與 7 家、星宇合計制在個人物品 0.1 kg 壓線的通過與否。所有 margins 皆為十分位整數差，格式化恰一位小數。

候選 gate（均 NOT_RUN）

- 於 `tools/cabin-baggage-checker/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「手提行李規定檢查」，title「手提行李規定檢查｜Gloss Tools」，description「輸入手提行李的三邊尺寸與重量，一次比對長榮、中華、星宇、台灣虎航、全日空與日本航空經濟艙的登機行李規定，逐家列出符合與否和差距。」。英文 lang=en，H1 “Cabin Baggage Checker”，title “Cabin Baggage Checker | Gloss Tools”，description “Enter your cabin bag's three dimensions and weight to check it against the published economy carry-on rules of EVA Air, China Airlines, STARLUX, Tigerair Taiwan, ANA and JAL, with per-airline pass/fail and margins.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。尺寸要含輪子和把手嗎？要。六家規定都把輪子、把手和側袋計入尺寸，請量裝滿後行李箱的外側三邊。 / Should I include wheels and handles? Yes. All six airlines count wheels, handles and side pockets; measure the outside of the packed bag.
- FAQ。為什麼星宇的重量比較嚴？星宇經濟艙規定主行李與個人物品合計 7 kg；長榮與中華的 7 kg 只計主行李一件。 / Why is STARLUX stricter on weight? STARLUX caps the main bag and personal item together at 7 kg in Economy, while EVA Air and China Airlines apply 7 kg to the main bag alone.
- FAQ。三邊填的順序有關係嗎？沒有。工具會把三邊由大到小排序後再跟各家上限逐邊比對。 / Does the order of the three sides matter? No. The tool sorts your three sides from largest to smallest and compares them side by side with each airline's limits.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://cabin-baggage-checker.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格 task id 為 `labs-cabin-baggage-checker-spec-20261109`，由主代理（parent）負責登記，作者未自行執行 registry 指令。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/cabin-baggage-checker/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。規定表若需更新（航空公司改制），由原作者以修訂流程改表、改查核日期並重算受影響 fixtures，不由實作者自行外查改值。
