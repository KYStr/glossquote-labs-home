# 搬家紙箱估算 / Moving Box Estimator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-moving-box-estimator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

準備搬家的人在下單紙箱前，先依住宅型態與生活習慣估出要買的紙箱總數、小／中／大各幾箱，以及膠帶與包裝紙各幾捲，避免買多浪費或買少中途再補。

- 桌面。桌邊比價紙箱賣場時，逐個勾選加量開關，核對尺寸別箱數與耗材是否合理。
- 行動。手機在賣場或網購結帳前快速確認數量，照結果下單。

使用情境為一般家庭搬家。資料只保留在目前頁面草稿。結果是依一般家庭物品量推估的參考值，不是任何賣場或搬家公司的保證數量。

## scope

五種戶型（套房／一房／二房／三房／四房）的固定基準箱數（以中箱當量計的總箱數）、固定比例的尺寸拆分、至多五個布林加量開關、一個 +20% 住久上調，及膠帶／包裝紙的每 10 箱啟發式。非目標為記錄每箱內容物或箱子位置、估搬家車趟數／搬家費用／家具拆裝、鋼琴與魚缸等特殊物品估算、購買連結或比價、帳號或任何持久儲存。

已與 registry 現行 specs／tasks、`docs/specs/` 101 份預案、`tools/` 與 `sources/` 快照比對，最相近者的實質差異如下。

- 搬家裝箱與物品定位：記錄哪些物品裝進哪一箱、箱子放在哪裡，供拆箱時查找。此處在裝箱之前估「要買幾箱」，輸入是戶型與生活習慣開關，不記錄任何物品。該預案為 reserved、其製作 task 為 blocked 並有原 owner，本預案不取代、不重領其範圍。 [spec-55-moving-boxes](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/55-moving-boxes/SPEC.md)
- 行李清單與重量試算：旅行行李的物品清單與克重試算。此處是搬家紙箱的採買數量估算，無清單、無重量。 [spec-22-packing-list](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/22-packing-list/SPEC.md)
- 包裹計費重量：以材積與 divisor 算快遞計費重量。此處不量測任何包裹，只依戶型表估箱數。 [spec-parcel-billable-weight-20261109](SPEC.md)

判定規則（基準表、加量、上調、拆分比例與耗材啟發式）由本文固定，無線上資料或外部服務依賴；數字是產品設計常數，不是法規或官方統計，頁面文案不得暗示為官方建議。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「住宅型態 / Home type」：五選一（套房、一房、二房、三房、四房）。
- 欄位或說明「加量選項 / Extra items」：五個開關——書很多、廚房大、衣物多、易碎品多、已居住 5 年以上。每個開關旁以常駐小字標明其固定加量（例如「+8 小箱」），不靠 tooltip。
- 「計算紙箱數量 / Calculate boxes」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「需要的紙箱與耗材 / Boxes and supplies you need」先摘要（總箱數）再列小／中／大箱數與膠帶、包裝紙捲數，並常駐顯示推估說明（見 tests 節固定文案）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果表與推估說明同時顯示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"homeType":"studio","manyBooks":false,"largeKitchen":false,"manyClothes":false,"fragileItems":false,"livedOver5Years":false}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `homeType`：字串列舉，恰為 `studio`、`one-bedroom`、`two-bedroom`、`three-bedroom`、`four-bedroom` 之一（畫面標籤：套房、一房、二房、三房、四房）。
- `manyBooks`、`largeKitchen`、`manyClothes`、`fragileItems`、`livedOver5Years`：布林，皆必備，預設 false。此工具無自由文字欄位。
- 預設 `{"homeType":"studio","manyBooks":false,"largeKitchen":false,"manyClothes":false,"fragileItems":false,"livedOver5Years":false}`。

驗證順序固定，先整體、再欄位，欄位依 homeType、manyBooks、largeKitchen、manyClothes、fragileItems、livedOver5Years，第一個失敗即整份失敗，回 `{ok:false,error:{code,field,row}}`，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 容量：input 以 JSON 序列化後的 UTF-8 bytes 超過 65,536 → INPUT_LIMIT，field=null。
2. 結構：非普通物件、欄位集合不是恰好上述六欄、任一欄為 accessor → SCHEMA，field=null。逐欄型別：homeType 非字串 → SCHEMA，field=`homeType`；任一開關非布林 → SCHEMA，field=該開關名。
3. homeType 含不成對 surrogate → UNICODE，field=`homeType`。
4. homeType 為空字串 → EMPTY，field=`homeType`。
5. homeType 不在五個列舉值內 → ENUM，field=`homeType`。

推導全用整數算術，無浮點、無 locale 相依捨入。B 為戶型基準（中箱當量總箱數）：studio 15、one-bedroom 25、two-bedroom 40、three-bedroom 60、four-bedroom 80。

1. 基準拆分（小 30%／中 50%／大 20%）：baseSplit.small = ⌈B×30/100⌉ = ⌊(30B+99)/100⌋；baseSplit.medium = ⌈B×50/100⌉ = ⌊(50B+99)/100⌋；baseSplit.large = B − small − medium（餘數歸大箱，三尺寸恆合計為 B）。
2. 尺寸加量（先於上調）：adders.manyBooks = manyBooks ? 8 : 0（小箱）；adders.fragileItems = fragileItems ? 4 : 0（小箱）；adders.largeKitchen = largeKitchen ? 6 : 0（中箱）；adders.manyClothes = manyClothes ? 5 : 0（中箱）。
3. 小計 subtotal = B + 四個 adders 之和。上調（後於加量）：upliftBoxes = livedOver5Years ? ⌈subtotal/5⌉ = ⌊(subtotal+4)/5⌋ : 0，即 +20% 無條件進位，上調箱數全數計中箱。totalBoxes = subtotal + upliftBoxes。
4. 最終尺寸：boxes.small = baseSplit.small + adders.manyBooks + adders.fragileItems；boxes.medium = baseSplit.medium + adders.largeKitchen + adders.manyClothes + upliftBoxes；boxes.large = baseSplit.large。三者合計恆等於 totalBoxes。
5. 耗材（每 10 箱啟發式）：supplies.tapeRolls = ⌈totalBoxes/10⌉ = ⌊(totalBoxes+9)/10⌋；supplies.packingPaperRolls = ⌈totalBoxes/10⌉ + (fragileItems ? 1 : 0)（易碎品多時包裝紙多備一捲）。

結果 `{homeType,baseBoxes,baseSplit,adders,upliftBoxes,totalBoxes,boxes,supplies}`，adders 鍵序 manyBooks、largeKitchen、manyClothes、fragileItems（回報各開關實際貢獻箱數，未開為 0）。畫面以表格列出小／中／大箱數與兩種耗材捲數，總箱數為標題摘要；不以顏色暗示「夠用」保證。

固定下載 `moving-box-estimator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/moving-box-estimator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算紙箱數量」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、五戶型全表和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。8 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `studio-plain` | 套房基準，30/50/20 拆分的小數進位與餘數歸大箱 |
| `two-bedroom-books-kitchen` | 小箱與中箱加量先於其他步驟，耗材每 10 箱進位 |
| `four-bedroom-all-options` | 最大戶型加全部加量與 +20% 上調，全開關的總和核對 |
| `one-bedroom-long-stay` | 僅上調：25 的拆分進位與 ⌈25/5⌉ 上調 |
| `three-bedroom-fragile-clothes` | 易碎 +4 小箱與包裝紙多一捲，衣物 +5 中箱 |
| `studio-long-stay` | 最小戶型上調 ⌈15/5⌉=3 全計中箱 |
| `bad-home-type` | 列舉外戶型 ENUM，第一個錯誤 |
| `toggle-not-boolean` | 開關非布林 SCHEMA，第一個錯誤 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測五戶型基準全表逐一手算核對、三尺寸合計恆等於 totalBoxes 的不變量（全 32 種開關組合以獨立算式核對）、錯型別、額外欄、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。

候選 gate（均 NOT_RUN）

- 於 `tools/moving-box-estimator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「搬家紙箱估算」，title「搬家紙箱估算｜Gloss Tools」，description「依住宅型態與生活習慣，估算搬家要買的小、中、大紙箱數量，以及膠帶和包裝紙的捲數。」。英文 lang=en，H1 “Moving Box Estimator”，title “Moving Box Estimator | Gloss Tools”，description “Estimate how many small, medium and large moving boxes to buy for your home type and habits, plus the tape and packing-paper rolls to go with them.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 推估說明（成功結果常駐顯示）：這是依一般家庭物品量推估的參考值，實際數量會因每戶物品多寡而不同；建議寧可多備幾箱，也不要買太少。 / This is a rough estimate for a typical household. Actual needs vary from home to home, so keep a few spare boxes rather than too few.
- FAQ。小／中／大箱怎麼分工？小箱裝書和重物，中箱裝一般雜物，大箱裝衣物、寢具等輕而蓬鬆的物品。 / What goes in each size? Small boxes are for books and heavy items, medium for general household goods, and large for light, bulky items like clothes and bedding.
- FAQ。住 5 年以上的 +20% 怎麼算？住越久累積的物品通常越多，這個開關把小計上調 20%，無條件進位，上調的箱數全算中箱；東西少可以關掉。 / Why does living 5+ years add 20%? Homes accumulate belongings over time, so this option raises the subtotal by 20%, rounded up, with the extra boxes counted as medium. Turn it off if you own less than typical.
- 錯誤訊息固定對譯：SCHEMA「輸入格式不正確 / The input format is invalid.」、INPUT_LIMIT「輸入太大 / The input is too large.」、UNICODE「文字含有不完整的 Unicode 字元 / The text contains an incomplete Unicode character.」、EMPTY「請選擇住宅型態 / Choose a home type.」、ENUM「住宅型態不在可選清單中 / The home type is not one of the available choices.」。
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://moving-box-estimator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格 task 為 `labs-moving-box-estimator-spec-20261109`（由主代理登記，本文作者未執行 registry 指令）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/moving-box-estimator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
