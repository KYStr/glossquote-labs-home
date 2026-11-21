# 暖氣功率試算 / Room Heater Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-room-heater-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

冬天要買電暖器前，先確認房間需要幾瓦：填入房間面積（平方公尺或坪）、天花板高度、隔熱等級，對照隔熱等級的每平方公尺瓦數表，算出所需瓦數，並推薦最接近的市售規格。

- 桌面。桌面填上面積、高度與隔熱等級，確認所需瓦數與建議購買的規格。
- 行動。手機在賣場或網購時核對一間房的暖氣瓦數，不查詢任何商品資料。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具是選型估算，不是專業熱損失計算；結果僅供購買參考。

## scope

面積換算（1 坪＝400/121 m²）、三級隔熱 W/m² 對照表（良好 60／普通 80／不良 130）、天花板高度線性調整（基準 2.4 m）、所需瓦數無條件進位到 10 W、市售規格推薦。非目標為冷氣選型、實際熱損失計算（U 值、窗戶面積、外牆數、朝向）、電費試算、品牌或型號推薦、安裝與安全認證。

已與本 checkout 的 `docs/specs/` 比對，無同名或同功能預案；最相近者的實質差異如下。

- 從面積與隔熱估算冷氣能力（ac-capacity，冷氣選型）。此處是暖氣選型：以 W/m² 隔熱對照表算「需要補多少熱」，單位為瓦特（W），不算冷房能力（kW／BTU）、不考慮除濕與冷媒。暖氣選大一級只是多耗電，冷氣選錯則涉及除濕與壓縮機啟停，兩者的選型表不可互換。
- 從用電度數算電費（electricity-cost-calculator）。此處不輸入電價、不算電費，只算所需瓦數。

判定規則由本文定義，無線上資料或外部服務依賴。W/m² 對照表以 Adax by Solaire 購買指南的公開經驗值為來源（見 implementation），並在 AUTHOR-CHECK.md 記錄為經驗法則而非工程標準。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「房間面積 / Room area」（數字＋單位切換 m²／坪）
- 欄位或說明「天花板高度 / Ceiling height」（公尺）
- 欄位或說明「隔熱等級 / Insulation level」（良好／普通／不良三選一）
- 「計算暖氣功率 / Calculate heater wattage」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「所需瓦數與建議規格 / Required wattage and recommended size」先摘要再列細節：換算後面積、房間體積、採用 W/m²、未進位瓦數、所需瓦數、建議規格與台數。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"area":"10","areaUnit":"m2","ceilingHeight":"2.4","insulation":"average"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- area：十進小數字串，最多 2 位小數，無空白／符號／指數，raw 每欄最多 8 單元。換算後面積 0.5–200 m²（含）。
- areaUnit：`m2` 或 `ping` 兩種字面值，預設 `m2`。
- ceilingHeight：十進小數字串，最多 2 位小數，2.0–4.0 m（含），預設 `2.4`。
- insulation：`good`、`average` 或 `poor` 三種字面值，預設 `average`。
- 預設 area 10、areaUnit m2、ceilingHeight 2.4、insulation average。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE、非法枚舉 ENUM。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 area、areaUnit、ceilingHeight、insulation 驗證。raw 超限 INPUT_LIMIT、文法 DECIMAL_FORMAT、範圍 RANGE、枚舉 ENUM，field 即上述欄名。面積範圍在換算後檢查：坪輸入先乘 400/121 再比對 0.5–200 m²。
2. 換算後面積 areaM2：m² 輸入原值；坪輸入 area × 400/121（精確有理數；允許以十進常數 3.305785124 代算，差異小於顯示精度，見 implementation）。
3. 房間體積 volumeM3 = areaM2 × ceilingHeight。
4. W/m² 對照表（見 implementation）：good 60、average 80、poor 130。
5. 未進位瓦數 rawWatts = areaM2 × wPerM2 × (ceilingHeight / 2.4)。
6. 所需瓦數 requiredWatts = rawWatts 無條件進位到 10 的倍數（已是倍數時不變）。
7. 建議規格：標準市售規格表 [400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000]（W）。requiredWatts ≤ 3000 時 recommendedWatts 為表中最小且 ≥ requiredWatts 者，units = 1；requiredWatts > 3000 時 units = ceil(requiredWatts / 2000)，recommendedWatts = units × 2000（每台 2000 W）。
8. 結果 `{areaM2,volumeM3,wPerM2,rawWatts,requiredWatts,recommendedWatts,units}`。areaM2 與 volumeM3 為 2 位小數字串（half-up），rawWatts 為 1 位小數字串（half-up），wPerM2、requiredWatts、recommendedWatts、units 為整數。units > 1 時畫面加註「建議分裝多台，勿用單一延長線串接 / Use multiple units; do not daisy-chain on one extension cord.」。

固定下載 `room-heater-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/room-heater-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- W/m² 對照表來源：Adax by Solaire 購買指南「What Size Electric Heater Do I Need? Wattage by Room Size」（https://adax-solaire.co.uk/buying-guides/what-size-electric-heater/）：良好隔熱新屋 60 W/m²、一般房間 80 W/m²、溫室或隔熱不良 130 W/m²，以標準天花板高度為準。該表為廠商經驗法則，不是工程熱損失標準；三檔數值與其他公開指南的區間一致（例如 100 W/m² 為一般隔熱起點、不良隔熱 150–200 W/m² 的下緣），本工具取三檔的保守中位以保持單一確定值。基準高度 2.4 m 為一般住宅標準天花板高度；高度調整為線性比值 height / 2.4，不另設體積法。
- 坪換算常數：1 坪＝400/121 m²＝3.3057851239… m²（日制坪／台制坪的法定定義）。計算以精確有理數 400/121 為準；實作可用十進常數 3.305785124，兩者差異在面積顯示（2 位小數）與瓦數顯示（1 位小數）皆不可見。
- 數值運算：最終瓦數計算不得用二進位浮點直接乘除；以十進定點（scale 10^6 的 BigInt）或等價有理數運算。顯示捨入一律 half-up（0.5 向上），僅在顯示時捨入；requiredWatts 的進位以未捨入的 rawWatts 為準。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算暖氣功率」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例（含 4 個錯誤案例）與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `standard-bedroom` | 一般隔熱 10 m² 基準高度，800 W 整數 |
| `ping-good` | 5 坪換算 16.53 m²、良好隔熱，991.7 W 進位 1000 W |
| `poor-high-ceiling` | 不良隔熱 20 m²、挑高 3.0 m，3250 W 需 2 台 |
| `small-good` | 小房間良好隔熱，360 W 推薦 400 W |
| `low-ceiling` | 低天花板 2.0 m 高度折減，恰好 800 W |
| `ping-poor-tall` | 8 坪不良隔熱挑高 2.8 m，4011.0 W 進位 4020 W 需 3 台 |
| `exact-1200` | 恰好等於市售規格 1200 W 不再進位 |
| `round-up-760` | 760 W 推薦下一檔 800 W |
| `tall-good-max-height` | 高度上限 4.0 m，恰好 1000 W |
| `max-area` | 面積上限 200 m²，16000 W 需 8 台 |
| `error-area-zero` | 面積 0 越下界，RANGE |
| `error-height-high` | 高度 4.5 越上界，RANGE |
| `error-insulation-enum` | 隔熱等級非法值，ENUM |
| `error-area-precision` | 面積 3 位小數，DECIMAL_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 areaM2 == 200、areaM2 == 200.01（坪輸入跨界）、height == 4.0、height == 4.01、insulation 三檔各一、rawWatts 恰為 10 的倍數與恰高 0.1 W。所有已接受的 requiredWatts 皆為 10 的倍數且 ≥ rawWatts；recommendedWatts ≥ requiredWatts；units × 2000 ≥ requiredWatts（units > 1 時）。

候選 gate（均 NOT_RUN）

- 於 `tools/room-heater-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「暖氣功率試算」，title「暖氣功率試算｜Gloss Tools」，description「冬天買電暖器前，先確認房間需要幾瓦：填入面積、天花板高度與隔熱等級，算出所需瓦數與建議規格。」。英文 lang=en，H1 “Room Heater Calculator”，title “Room Heater Calculator | Gloss Tools”，description “Before buying a space heater, check how many watts your room needs from its area, ceiling height and insulation level.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。坪怎麼換算？1 坪＝400/121 平方公尺（約 3.305785 m²）。 / How is 坪 converted? 1 坪 = 400/121 m² (about 3.305785 m²).
- FAQ。這是專業熱損失計算嗎？不是，這是依隔熱等級的經驗法則估算，僅供選購參考；大坪數、挑高或特殊格局請諮詢專業人員。 / Is this a professional heat-loss calculation? No, it is a rule-of-thumb estimate by insulation level, for sizing guidance only; consult a professional for large rooms, high ceilings or unusual layouts.
- FAQ。為什麼建議規格比所需瓦數大？市售電暖器只有固定瓦數檔位，建議取大於等於所需瓦數的最小檔位；超過 3000 W 時建議分裝多台 2000 W。 / Why is the recommended size larger than the required wattage? Heaters are sold in fixed wattage steps, so the recommendation is the smallest step at or above the required wattage; above 3000 W, use multiple 2000 W units.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://room-heater-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開工時讀回的遠端 `codex/initial-publication` head 為準。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/room-heater-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
