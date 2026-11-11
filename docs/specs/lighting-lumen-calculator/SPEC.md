# 照明流明計算 / Lighting Lumen Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-lighting-lumen-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

裝潢或換燈泡的人站在賣場看著包裝上的「流明」，不知道自己的房間到底要買幾顆、買多亮。

- 桌面。桌面輸入房間長寬（或面積），選用途與手邊燈泡的流明數，立即得到總流明需求、顆數與裝完後的實際照度。
- 行動。手機在賣場現場核對一顆燈泡夠不夠，不連網、不登入。

使用情境為居家估算。資料只保留在目前頁面草稿。

## scope

單一房間、一般照明、簡單流明法：總流明 = 面積 × 目標照度。不計利用係數（utilisation factor）與維護係數（maintenance factor），這個簡化必須在結果旁與 FAQ 揭露，不得宣稱是專業照明設計或法規驗收值。

目標照度表釘版如下（單位 lux，1 lux = 1 lm/m²）。五列取自中國國家標準《建築照明設計標準》GB 50034-2013 表 5.1.1「居住建築照明標準值」的一般活動值；書房／辦公取同表起居室「書寫、閱讀」值 300；該表沒有走廊列，走廊取 EN 12464-1:2021 室內流通區域（circulation areas and corridors）的維持照度 100。GB 50034-2013 已由 GB/T 50034-2024 接替（2024-08-01 實施）；已發表的 2024 版摘要中客廳、臥室、廚房一般活動值與本表相同，作業值（床頭閱讀、廚房操作台）則有修訂且各摘要不一，本表只取一般活動值並釘版 2013 表全文可查的數字，取捨記錄於 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。各標準的建議值本來就不同（IES、CIBSE 多以區間發表），本表是單一來源釘版，不是唯一正確答案，頁面須如此揭露。

| roomType | 用途 | targetLux | 來源列 |
| --- | --- | --- | --- |
| `living` | 客廳 / Living room | 100 | GB 50034-2013 表 5.1.1 起居室·一般活動 |
| `bedroom` | 臥室 / Bedroom | 75 | GB 50034-2013 表 5.1.1 臥室·一般活動 |
| `kitchen` | 廚房 / Kitchen | 100 | GB 50034-2013 表 5.1.1 廚房·一般活動 |
| `bathroom` | 浴室 / Bathroom | 100 | GB 50034-2013 表 5.1.1 衛生間 |
| `study` | 書房／辦公 / Study / office | 300 | GB 50034-2013 表 5.1.1 起居室·書寫、閱讀 |
| `corridor` | 走廊 / Corridor | 100 | EN 12464-1:2021 流通區域與走廊 |

非目標：作業面局部照明（廚房操作台 150、床頭閱讀 150 等同表作業列不採用）、天花板高度修正、多房間或全戶規劃、照度均勻度／眩光（UGR）／演色性（Ra）／照明功率密度評估、燈具配光、迴路與開關設計、量測既有空間的實際照度。

已與 checkout 內 101 份預案比對，最相近者的實質差異如下。

- 從瓦數與時間算電費。此處以面積與照度算光通量需求，不涉電價或功率。 [electricity-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/5a0f74b22a12250cb553582d8e7b7aaa8655f648/docs/specs/electricity-cost-calculator/SPEC.md)
- 同批 run 5 的 ping-area-converter（草稿 PR，未併入本 checkout）只做坪／平方公尺／平方英尺面積換算。此處沿用同一精確常數 1 坪 = 400/121 m²，但產出是流明需求與燈泡顆數，不是面積對照表。

判定規則由本文定義，無線上資料或外部服務依賴。面積常數 1 坪 = 400/121 m² 為精確分數（≈ 3.3057851240 m²）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「面積來源與長寬 / Area source and dimensions」：模式 `dimensions` 時用長（m）× 寬（m）。
- 欄位或說明「面積與單位 / Area and unit」：模式 `area` 時直接給面積，單位平方公尺（m²）或坪。
- 欄位或說明「房間用途 / Room type」：六個用途與其目標照度（lux）並列顯示，選定即揭露該列數值來源於釘版表。
- 欄位或說明「每顆燈泡流明 / Lumens per bulb」。
- 「計算所需流明 / Calculate required lumens」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「需要的流明與燈泡數 / Required lumens and bulb count」先摘要再列細節：面積（m²）、目標照度、總流明、燈泡顆數、裝設總流明、實際照度。結果旁常駐簡化揭露「未計利用係數與維護係數，為簡化估算 / Simplified estimate: utilisation and maintenance factors are not applied.」。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"dimensions","lengthM":"4.0","widthM":"3.5","areaUnit":"m2","areaValue":"20.00","roomType":"living","bulbLumens":"800"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。所有欄位值皆為使用者輸入的原始字串。

欄位順序固定為 mode、lengthM、widthM、areaUnit、areaValue、roomType、bulbLumens，驗證依此順序，第一個失敗即回傳。

- mode：列舉 `dimensions`（長 × 寬）或 `area`（直接面積）。
- lengthM、widthM：公尺，十進字串。小數文法為 ASCII `^(0|[1-9][0-9]*)(\.[0-9]+)?$` 且小數位數 ≤ 1；範圍 0.5–100.0（含端點）。僅 mode=`dimensions` 時啟用。
- areaUnit：列舉 `m2` 或 `ping`。僅 mode=`area` 時啟用。
- areaValue：十進字串，文法同上但小數位數 ≤ 2；範圍依 areaUnit：`m2` 為 0.25–10000（含端點），`ping` 為 0.08–3000（含端點）。僅 mode=`area` 時啟用。
- roomType：列舉 `living`、`bedroom`、`kitchen`、`bathroom`、`study`、`corridor`，目標照度見 scope 釘版表。
- bulbLumens：每顆燈泡流明，整數字串 `^(0|[1-9][0-9]*)$`，範圍 1–100000。
- 數值欄位（lengthM、widthM、areaValue、bulbLumens）raw 每欄最多 8 個 UTF-16 code units，超限為 INPUT_LIMIT，此檢查對未啟用的數值欄位也適用。列舉欄位（mode、areaUnit、roomType）不設容量上限，非列舉值即 ENUM。
- 未啟用欄位（mode=`area` 時的 lengthM、widthM；mode=`dimensions` 時的 areaUnit、areaValue）：數值欄位只查容量、列舉欄位不查，內容一律忽略，不參與計算。mode 本身驗證失敗時在其欄位即停，不需決定啟用集合。
- 預設 mode `dimensions`、lengthM `4.0`、widthM `3.5`、areaUnit `m2`、areaValue `20.00`、roomType `living`、bulbLumens `800`。

每個啟用欄位依容量（僅數值欄位）、surrogate、內容、文法／列舉、範圍的順序檢查。未另外指明時容量 INPUT_LIMIT、未成對 surrogate UNICODE、缺內容 EMPTY、十進文法 DECIMAL_FORMAT、整數文法 INTEGER_FORMAT、列舉 ENUM、範圍 RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算全程用精確有理數（BigInt 分子／分母），核心判定不使用浮點數；十進字串以字串拆解轉成縮放整數（lengthM、widthM 為 1/10 單位，areaValue 為 1/100 單位）。

1. 面積 area（m²，精確有理數，不先捨入）：mode=`dimensions` 時 area = lengthM × widthM；mode=`area` 且 areaUnit=`m2` 時 area = areaValue；areaUnit=`ping` 時 area = areaValue × 400/121。
2. targetLux 為 scope 釘版表整數。exactLumens = area × targetLux。
3. totalLumens = roundHalfUp(exactLumens)，為整數。roundHalfUp(x) 對非負有理數定義為 floor(x + 1/2)，恰 0.5 一律進位（非 banker's rounding）。由面積與照度下限保證 totalLumens ≥ 19，恆 ≥ 1。
4. bulbCount = ceil(totalLumens / bulbLumens)，以已捨入的 totalLumens 計算，使畫面上的總流明、每顆流明與顆數三者可互相驗算。installedLumens = bulbCount × bulbLumens（整數）。
5. achievedLux = roundHalfUp 至小數 1 位的 installedLumens / area（除以未捨入的精確面積）。areaM2 = roundHalfUp 至小數 2 位的 area。兩者在 JSON 中皆為數字，捨入後尾零不保留（例如 128.0 寫為 128）。
6. 結果 {areaM2, targetLux, totalLumens, bulbCount, installedLumens, achievedLux}。面積以平方公尺顯示；坪只作輸入單位，結果不另列坪數。

固定下載 `lighting-lumen-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/lighting-lumen-calculator/`。src/core.mjs 放純驗證、推導、格式化（精確有理數以 BigInt 實作，禁止在驗證、換算、捨入、進位判定中引入浮點運算）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算所需流明」，畫面和完整報告符合核心 fixtures（含坪換算與 half-up 邊界案例），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、未啟用欄位容量檢查和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `living-dimensions-basic` | 客廳長寬基本案例與預設值 |
| `bedroom-area-m2` | 面積模式；937.5 half-up 為 938 |
| `study-ping-area` | 坪精確分數換算與各輸出只捨入一次 |
| `kitchen-exact-bulb-multiple` | 整數倍不額外進位一顆 |
| `bedroom-half-up-tie` | 112.5 的 half-up 進位（非 banker's） |
| `bathroom-min-dimensions` | 長寬下限與最小面積 |
| `study-max-area` | 面積與每顆流明上限端點、raw 恰 8 單位 |
| `corridor-ping-min` | 坪下限；顯示面積捨入不影響流明計算 |
| `length-decimal-format` | 長度小數位數超限 |
| `width-empty` | 啟用欄位為空 |
| `area-below-min` | 面積低於單位下限 |
| `room-type-enum` | 未列舉用途 |
| `bulb-lumens-zero` | 每顆流明為零 |
| `inactive-field-over-limit` | 未啟用數值欄位仍受容量檢查 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 lengthM/widthM 0.5 與 100.0 端點、0.4 與 100.1 越界；areaValue 在 m2 的 0.25／10000 與 ping 的 0.08／3000 端點及各差一步的越界；bulbLumens 1 與 100000 端點、100001 越界；文法拒絕 `4.`、`.5`、`04.0`、`+4`、前後空白與指數記法；mode=`area` 時 lengthM 填入任意文法外字串（容量內）仍可成功且結果不變；totalLumens 恰為 bulbLumens 整數倍時不進位、恰多 1 lm 時進位一顆。

候選 gate（均 NOT_RUN）

- 於 `tools/lighting-lumen-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「照明流明計算」，title「照明流明計算｜Gloss Tools」，description「輸入房間長寬或面積，依房間用途的目標照度，算出需要的總流明與要裝幾顆燈泡。」。英文 lang=en，H1 “Lighting Lumen Calculator”，title “Lighting Lumen Calculator | Gloss Tools”，description “Enter a room's dimensions or area to get the total lumens and bulb count needed for a target illuminance by room type.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。這個結果是專業照明設計嗎？不是，這是未計利用係數與維護係數的簡化流明法估算；實際需求受燈具配光、牆面顏色與天花板高度影響。 / Is this a professional lighting design? No. It is a simplified lumen-method estimate without utilisation or maintenance factors; luminaire distribution, surface colours and ceiling height all change real needs.
- FAQ。為什麼實際照度比目標高？燈泡只能整顆裝，顆數無條件進位，裝設總流明因此高於需求，實際照度也隨之高於目標。 / Why is the achieved illuminance above the target? Bulbs come in whole units, so the count is rounded up and the installed lumens exceed the requirement.
- FAQ。坪怎麼換算成平方公尺？1 坪 = 400/121 m²，約 3.3058 m²；本工具以精確分數計算，只在顯示時捨入。 / How is a ping converted to square metres? 1 ping = 400/121 m², about 3.3058 m²; the tool computes with the exact fraction and rounds only for display.
- FAQ。目標照度是哪來的？主要取自 GB 50034-2013 表 5.1.1 的一般活動值，走廊取 EN 12464-1:2021；各標準建議值不同，這只是單一釘版來源。 / Where do the target values come from? Mainly the general-activity values in Table 5.1.1 of GB 50034-2013, with corridors from EN 12464-1:2021; standards differ, and this is one pinned source.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://lighting-lumen-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/lighting-lumen-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
