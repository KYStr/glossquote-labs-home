# 槓鈴配重 / Barbell Plate Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-barbell-plate-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

舉重者在健身房要上某個目標總重時，先輸入目標總重、槓鈴重與手邊有的槓片組，確認每邊要掛哪幾片、掛不掛得出來，掛不出來時知道差多少、最近能掛到幾公斤。

- 桌面。桌面填上目標總重、槓鈴重與各面額槓片的對數，確認每邊的掛法與最近可達重量。
- 行動。手機在槓鈴旁邊對著槓片架核對一組掛法，不用心算。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

公斤制、固定 IWF 標準槓片組（25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg）、每邊對稱配重、由大到小貪心釘版、餘數與最近可達重量說明。槓鈴夾重量以 0 kg 計（不列入總重）；微型槓片（0.5 kg 及以下）不在本組內。非目標為磅制換算、1RM 最大重量估算、暖身組遞增表、不對稱配重、槓片庫存管理、把結果當訓練處方或安全保證。

已與本 checkout 的 103 份 `docs/specs/` 比對，沒有同名或同功能預案。最相近者的實質差異如下。

- 從身高體重算身體指標。此處是把目標總重拆成每邊槓片組合，不做任何身體指標或熱量估算。 [spec-bmi-tdee-calculator](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/bmi-tdee-calculator/SPEC.md)
- one-rep-max（最大重量估算）不在本 repo 內，但概念差異已釘版：one-rep-max 是從已完成次數反推「最多能舉多重」的估算；本工具是給定目標總重後選「每邊掛哪幾片」的配重選擇，不估算任何人的最大重量，兩者輸入、輸出與用途皆不同。

判定規則由本文定義，無線上資料或外部服務依賴。槓片面額與槓重取自 IWF Technical and Competition Rules and Regulations（男子槓 20 kg、女子槓 15 kg；比賽槓片色碼組 25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg，另有 2 / 1.5 / 1 / 0.5 kg 小片僅供破紀錄微調，本工具不採用）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「目標總重（公斤） / Target total weight (kg)」
- 欄位或說明「槓鈴重量（公斤） / Bar weight (kg)」，附快速選擇 20 / 15 / 10 kg
- 欄位或說明「每種槓片有幾對 / Pairs available per plate」，七個面額各一欄（25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg）
- 「計算每邊配重 / Calculate plates per side」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每邊槓片與可達重量 / Plates per side and achievable weight」先摘要再列細節：每邊槓片由大到小排列、每邊重量、實際可達總重、餘數（若有）、下一個較重建議（若有）。掛不出來時以文字及符號提示餘數，不用綠色暗示成功。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含餘數，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"targetKg":"100","barKg":"20","pairs25":"2","pairs20":"2","pairs15":"2","pairs10":"2","pairs5":"2","pairs2_5":"2","pairs1_25":"2"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- targetKg、barKg 為 ASCII 十進小數字串：整數部分為 0 或非零開頭，選擇性小數部分為 1–2 位數，無空白／符號／指數，raw 每欄最多 12 單元。targetKg 0–500 kg，barKg 0–50 kg，兩者皆須為 0.25 kg 的倍數。
- pairs25、pairs20、pairs15、pairs10、pairs5、pairs2_5、pairs1_25 為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 12 單元；每欄 0–10（含），意義為該面額可用的「對數」，即每邊最多可掛該面額的片數。
- 預設 targetKg 100、barKg 20，七個 pairs 欄皆 2。
- 全部重量以 0.125 kg 為整數單位運算：1 單位 = 0.125 kg；25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg 分別為 200 / 160 / 120 / 80 / 40 / 20 / 10 單位。targetKg 與 barKg 皆為 0.25 kg 倍數，故 `(targetKg − barKg) / 2` 恆為 0.125 kg 的整數倍，無浮點或捨入。輸出公斤數皆為 0.125 的倍數，以 JSON number 表示（0.125、0.25、1.25 等皆為二進位精確值）。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 targetKg、barKg、pairs25、pairs20、pairs15、pairs10、pairs5、pairs2_5、pairs1_25 驗證。raw 超限 INPUT_LIMIT。targetKg、barKg 文法 NUMBER_FORMAT、範圍 RANGE、非 0.25 倍數 NOT_MULTIPLE。pairs 各欄文法 INTEGER_FORMAT、範圍 RANGE，field 即上述欄名。
2. 跨欄：targetKg < barKg 時回 `{ok:false,error:{code:"TARGET_BELOW_BAR",field:"targetKg",row:null}}`。
3. perSideUnits = (targetUnits − barUnits) / 2（整數單位）。由大到小貪心：對每個面額，取 `min(剩餘對數, floor(剩餘單位 / 面額單位))` 片，扣掉後繼續下一個面額。結果 platesPerSide 只列 count > 0 的面額，由大到小排列。
4. loadedPerSideUnits = 掛上的單位總和；remainderPerSideUnits = perSideUnits − loadedPerSideUnits；achievedKg = barKg + 2 × loadedPerSideKg；reachable = remainderPerSideUnits == 0。
5. nextUpKg：reachable 時為 null。不可達時，若貪心後任一面額仍有剩餘對數，取其中最小面額 d，nextUpKg = achievedKg + 2 × d；若所有對數皆已用完，nextUpKg 為 null。此值是「再多掛一片最小剩餘槓片」的建議，不是已證明的全域最小可達上限——SPEC 明示此定義，不宣稱為最小值。
6. 結果 `{targetKg,barKg,perSideKg,platesPerSide,platesPerSideCount,loadedPerSideKg,achievedKg,remainderPerSideKg,reachable,nextUpKg}`，其中 platesPerSide 為 `[{plateKg,count}]` 由大到小，platesPerSideCount 為每邊總片數。機器值不隨 locale 改。顯示時公斤數最多 3 位小數，去尾零（例如 25、2.5、1.25、0.125）。

固定下載 `barbell-plate-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/barbell-plate-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算每邊配重」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
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
| `exact-100kg` | 100 kg、20 kg 槓，每邊 25 + 15 |
| `exact-140kg` | 140 kg，每邊 25 × 2 + 10 |
| `exact-60kg-women-bar` | 60 kg、15 kg 女槓，每邊 20 + 2.5 |
| `exact-87p5kg` | 87.5 kg，每邊 25 + 5 + 2.5 + 1.25 |
| `zero-bar-50kg` | 槓重 0，每邊 25 |
| `bar-only-20kg` | 目標等於槓重，每邊零片 |
| `remainder-half-kg` | 101 kg，每邊餘 0.5 kg，可達 100 kg、下一個 102.5 kg |
| `remainder-eighth-kg` | 100.25 kg，每邊餘 0.125 kg，可達 100 kg |
| `limited-pairs-exact` | 25 kg 只剩 1 對，改以 25 + 20 + 15 湊滿 60 kg/邊 |
| `limited-pairs-unreachable` | 25 kg 只剩 1 對、其餘 0 對，每邊餘 35 kg、可達 70 kg、無下一個建議 |
| `target-below-bar` | 目標小於槓重，TARGET_BELOW_BAR |
| `not-multiple-target` | 目標非 0.25 倍數，NOT_MULTIPLE |
| `pairs-not-integer` | 對數非整數，INTEGER_FORMAT |
| `target-range` | 目標超 500 kg，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 target==bar、target==bar+2.5、bar==0、pairs 全 0、pairs 上限 10/11、target 500/500.25、0.25 倍數邊界（100.25 可、100.1 不可）。所有已接受的 achievedKg 不超出 targetKg；移除任一面額上限後貪心結果不會變重。

候選 gate（均 NOT_RUN）

- 於 `tools/barbell-plate-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「槓鈴配重」，title「槓鈴配重｜Gloss Tools」，description「輸入目標總重、槓鈴重與手邊槓片，算出每邊要掛哪幾片；掛不出來時告訴你差多少、最近能掛到幾公斤。」。英文 lang=en，H1 “Barbell Plate Calculator”，title “Barbell Plate Calculator | Gloss Tools”，description “Enter a target total, bar weight and the plates you have, and see which plates go on each side — and how close you can get when the exact weight is not reachable.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。掛不出來是什麼意思？每邊餘數大於 0，表示手邊槓片湊不出目標；頁面會顯示實際可達總重與下一個較重建議。 / What does “not reachable” mean? A per-side remainder above 0 means your plates cannot make the target; the page shows the achievable total and the next heavier suggestion.
- FAQ。這會估算我的最大重量（1RM）嗎？不會。這只依目標總重選槓片，不估算任何人的最大重量。 / Does it estimate my one-rep max (1RM)? No. It only picks plates for a target total; it never estimates anyone's maximum lift.
- FAQ。槓鈴夾的重量算進去了嗎？沒有。槓鈴夾以 0 kg 計；若你的夾子有重量，請把它加進槓鈴重量欄。 / Are collar weights included? No. Collars count as 0 kg; if yours have weight, add it to the bar weight field.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://barbell-plate-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/barbell-plate-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
