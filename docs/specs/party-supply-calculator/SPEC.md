# 派對採購試算 / Party Supply Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-party-supply-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

主辦人辦派對前，先確認要買多少食物、飲料、杯子、盤子與冰塊，才不會買不夠或買太多。

- 桌面。主辦人在家用電腦輸入賓客人數、派對時長與餐型，得到一份可列印或下載的採購清單，照著去賣場一次買齊。
- 行動。主辦人在賣場用手機核對清單上的數量，缺多少補多少。

使用情境為採購估算。資料只保留在目前頁面草稿；所有數字都是規劃估算，不是餐飲業者的合約保證。

## scope

賓客人數、時長、餐型三個輸入 → 食物（克）、飲料（毫升與 2 公升瓶數）、杯子、盤子、冰塊（公斤）五項輸出，全部以本文釘版的每人份表與時長係數算出，並向上取整到可購買的單位。非目標為分大人小孩、酒類與無酒精分開估算、飲食限制與過敏、預算或金額、依店家拆購物清單、實際下單、外送或庫存管理。

已與本 repo 的既有規格比對，最相近者的實質差異如下。

- 交換禮物配對（`gift-exchange-match`）為參加者之間的一對一送收配對，附方向性禁配與逐張揭示；本件不配對任何人，只把人數、時長、餐型換算成五項採購總量，沒有參加者名單、沒有隨機、沒有揭示流程。
- 調酒酒精度（`cocktail-abv-calculator`，本輪第 21 條）算一杯調酒的總體積、酒精度與標準杯數；本件不分酒類與無酒精、不算酒精度，只算整場派對的飲料總量。
- 食物保存期限（`food-storage-guide`，本輪第 20 條）查單一食材的冷藏／冷凍／常溫保存天數；本件不查保存期限、不列食材清單，只算總量。

判定規則由本文定義，無線上資料或外部服務依賴。每人份表與時長係數見 inputsOutputs 第 2 節；數值來源與取捨見 AUTHOR-CHECK.md。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「賓客人數 / Number of guests」
- 欄位或說明「派對時長（小時） / Party duration (hours)」
- 欄位或說明「餐型 / Meal type」：選項為「點心 / Snacks only」「輕食 / Light meal」「正餐 / Full meal」
- 「計算採購清單 / Calculate shopping list」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果先顯示五項總量，再列每人份明細表（食物克數、飲料毫升、杯子、盤子、冰塊公斤）與所用的時長係數。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"guests":"20","durationHours":"3","mealType":"full"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 欄位順序為 guests、durationHours、mealType。guests 為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 最多 8 單元，範圍 1–500（含）。durationHours 為 ASCII 十進小數字串：至少一位整數位、最多一位小數位，小數位只可為 0 或 5，無空白／符號／指數，raw 最多 8 單元，範圍 0.5–12（含）且必須是 0.5 的倍數。mealType 為確切字串 `snacks`、`light`、`full` 三者之一。
- 預設 guests 20、durationHours 3、mealType full。

先容量、再 surrogate、再該欄文法，跨欄順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 guests、durationHours、mealType 驗證。raw 超限 INPUT_LIMIT、缺內容 EMPTY、guests 文法 INTEGER_FORMAT、durationHours 文法 DECIMAL_FORMAT、durationHours 非 0.5 倍數 STEP、範圍 RANGE、mealType 非三者之一 ENUM，field 即上述欄名。
2. 令 h2 = durationHours × 2（整數 1–24）。時長係數 f：h2 ≤ 4（≤ 2 小時）為 1；4 < h2 ≤ 8（2–4 小時）為 6/5；h2 > 8（> 4 小時）為 3/2。係數以分數記，下列全部以整數運算，禁止浮點。
3. 每人份（perPerson）。食物克數 foodG = 餐型基數 × f，基數：snacks 200、light 350、full 500（克）。飲料毫升 drinksMl = 350 × (h2 + 2) / 2，即每人 (時長 + 1) 份、每份 350 毫升（首小時 2 份、之後每小時 1 份）。杯子 cups：h2 ≤ 6（≤ 3 小時）每人 2 個，否則每人 3 個。盤子 plates：snacks 或 light 每人 1 個，full 每人 2 個（備量另計，見總量）。冰塊公斤 iceKg = 0.5 × f。
4. 總量（totals），全部向上取整到可購買單位。食物總克數 = ceil(guests × foodG / 100) × 100。飲料總毫升 = ceil(guests × drinksMl / 500) × 500；2 公升瓶數 drinksBottles2L = ceil(飲料總毫升 / 2000)。杯子總數 = guests × cups。盤子總數 = ceil(guests × plates × 6 / 5)，即每人份另加 20% 備量。冰塊總公斤 = ceil(guests × f) × 0.5，以 0.5 公斤為單位（因每人 0.5 公斤 × f，總公斤除以 0.5 即 guests × f）。
5. 結果 `{mealType,durationHours,durationFactor,perPerson,totals}`。durationHours 為 JSON 數字（0.5 的倍數，可精確表示）；durationFactor 為 JSON 數字 1、1.2 或 1.5。perPerson 為 `{foodG,drinksMl,cups,plates,iceKg}`，其中 foodG、drinksMl、cups、plates 為整數，iceKg 為 0.5、0.6 或 0.75。totals 為 `{foodG,drinksMl,drinksBottles2L,cups,plates,iceKg}`，其中 foodG、drinksMl、drinksBottles2L、cups、plates 為整數，iceKg 為 0.5 的倍數。按上列欄位順序呈現。機器值不隨 locale 改。

固定下載 `party-supply-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/party-supply-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算採購清單」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例、3 個字面錯誤案例與 2 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `snacks-2h-small` | 點心 10 人 2 小時，係數 1.0 的基準量 |
| `full-3h` | 正餐 20 人 3 小時，係數 1.2 |
| `light-6h-long` | 輕食 30 人 6 小時，係數 1.5，食物與冰塊取整 |
| `min-guest-half-hour` | 1 人 0.5 小時，飲料毫升向上取整到 500 |
| `max-guests` | 500 人 12 小時，全部上限 |
| `boundary-2h` | 恰好 2 小時仍用係數 1.0 |
| `boundary-2-5h` | 2.5 小時改用係數 1.2，冰塊取整到 0.5 公斤 |
| `boundary-4h` | 恰好 4 小時仍用係數 1.2，杯子已為每人 3 個 |
| `boundary-4-5h` | 4.5 小時改用係數 1.5 |
| `rounding-mix` | 7 人 3 小時點心，食物、飲料、盤子、冰塊同時取整 |
| `guests-zero` | 人數 0 為 RANGE 錯誤 |
| `duration-step` | 時長 2.3 小時為 STEP 錯誤（非 0.5 倍數） |
| `meal-enum` | 餐型不在三者之內為 ENUM 錯誤 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 guests=1、500、501；durationHours=0.5、12、12.5、0.25；mealType 三種與未知值；h2=4、5、8、9 的係數切換；h2=6、7 的杯子切換。所有總量皆為向上取整，移除備量後盤子數不會變多。

候選 gate（均 NOT_RUN）

- 於 `tools/party-supply-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「派對採購試算」，title「派對採購試算｜Gloss Tools」，description「輸入賓客人數、派對時長與餐型，算出食物、飲料、杯子、盤子與冰塊各要買多少。」。英文 lang=en，H1 “Party Supply Calculator”，title “Party Supply Calculator | Gloss Tools”，description “Enter guest count, party duration and meal type to work out how much food, drink, cups, plates and ice to buy.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。這些數字是保證嗎？不是，是餐飲業常用估算規則的規劃量，實際依菜單與賓客調整。 / Are these quantities guaranteed? No. They are planning estimates from common catering rules of thumb; adjust for your menu and guests.
- FAQ。飲料為什麼是首小時 2 份、之後每小時 1 份？這是餐飲業常用的 2-1 規則：第一小時每人 2 份，之後每小時每人 1 份，每份以 350 毫升計。 / Why 2 drinks in the first hour and 1 per hour after? That is the caterers' 2-1 rule: 2 servings per person in the first hour, 1 per hour after, at 350 ml per serving.
- FAQ。冰塊 0.5 公斤是怎麼來的？約為每人 1 磅冰的常用規則，時長超過 4 小時再乘 1.5。 / Where does 0.5 kg of ice per person come from? It is the common rule of about 1 lb of ice per person, times 1.5 for parties over 4 hours.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://party-supply-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開工時遠端 `codex/initial-publication` 的最新 commit 為準。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/party-supply-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
