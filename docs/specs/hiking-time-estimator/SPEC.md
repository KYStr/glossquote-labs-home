# 登山時間預估 / Hiking Time Estimator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-hiking-time-estimator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

登山者出發前對著路線圖，只知道距離與爬升，想知道這趟路大概要走多久、會不會摸黑下山。

- 桌面。桌面填上距離、爬升、下降與下降類型，確認移動時間、各段耗時與平均配速，決定出發時間或是否改走較短路線。
- 行動。手機在登山口或山屋核對一條路線的預估時間，不啟動任何定位或追蹤。

使用情境為設計假設。資料只保留在目前頁面草稿。輸出是移動時間的估算，不是到達時刻的保證；休息、拍照、迷路、天氣與體能都不在公式內，頁面必須在結果旁明示這一點。

## scope

MVP：距離 km ＋ 爬升 m（＋選填下降 m 與下降類型）→ Naismith's rule 移動時間估算，含分段耗時、平均配速與等效平路距離。非目標為休息時間加總、體能或天氣調整、Aitken 4 km/h 越野變體、Tobler hiking function、即時定位／軌跡、路線規劃、地圖、海拔剖面圖、把預估當作保證或安全承諾。

已與本 checkout 的既有預案比對，最相近者的實質差異如下。

- 從已知成績預測跑步比賽完賽時間（Riegel 公式，T₂ = T₁ × (D₂/D₁)^1.06）。此處不預測比賽、不以外推已知成績為輸入，而是以路線距離與爬升、按 Naismith's rule 從零算出登山移動時間；輸入是路線，不是成績。 [spec-race-time-predictor-20261109](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a/docs/specs/race-time-predictor/SPEC.md)（registry 登記；本 checkout 尚無該目錄）
- 跑步配速三向求解（配速／時間／距離互求）＋ Riegel 比賽預測表。此處不解配速、不做分段配速表、不預測任何目標距離的比賽時間；配速只是由登山總時間與距離衍生的顯示值，且公式是 Naismith 登山規則而非 Riegel 跑步模型。 [docs/specs/running-pace-calculator/SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a/docs/specs/running-pace-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。公式來源：Naismith's rule，William W. Naismith，Scottish Mountaineering Club Journal，1892 年——「每 3 英里（5 km）1 小時，另每爬升 2,000 英尺（600 m）加 1 小時」；下降修正：Langmuir（1984），《Mountaincraft and Leadership》——緩降（坡度 5°–12°）每下降 300 m 減 10 分鐘，陡降（坡度 >12°）每下降 300 m 加 10 分鐘，坡度 <5° 不修正。本規格採用的公制數值（5 km/h、600 m/h、300 m / 10 分鐘）與上述來源一致；600 m 是 2,000 英尺（609.6 m）的慣用公制取整，本文釘版為 600 m，不用 609.6 m。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「距離、爬升 / Distance and ascent」
- 欄位或說明「下降、下降類型 / Descent and descent type」
- 「計算登山時間 / Calculate hiking time」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「預估移動時間 / Estimated moving time」先摘要（總時間 `H:MM` ＋總分鐘數）再列細節：平路耗時、爬升耗時、下降調整、平均配速（分鐘／公里）、等效平路距離（公里）。成功才顯示「下載報告 / Download report」。文字可手動選取。結果旁固定顯示估算聲明：「移動時間估算，不含休息；Naismith's rule 假設體能良好、路況正常。 / Moving-time estimate only, excluding breaks; Naismith's rule assumes reasonable fitness and normal conditions.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"distanceKm":"12","ascentM":"600","descentM":"0","descentType":"none"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 欄位順序即驗證順序：distanceKm、ascentM、descentM、descentType。raw 每欄最多 16 個 code units，超限 INPUT_LIMIT。
- distanceKm：必填十進字串，格式 `^\d+(\.\d{1,2})?$`（ASCII 數字、可選一位小數點後 1–2 位；無空白／符號／指數／千分位逗號），否則 DECIMAL_FORMAT；範圍 0.1–200 km（含端點），否則 RANGE。空字串 EMPTY。
- ascentM：必填整數字串，格式 `^\d+$`，否則 INTEGER_FORMAT；範圍 0–10000 m（含端點），否則 RANGE。空字串 EMPTY。
- descentM：選填，缺欄或空字串視為 `"0"`；格式 `^\d+$`，否則 INTEGER_FORMAT；範圍 0–10000 m（含端點），否則 RANGE。
- descentType：選填，缺欄或空字串視為 `"none"`；值必須為 `none`、`gentle`、`steep` 三者之一，否則 ENUM。`gentle` 為緩降（坡度 5°–12°），`steep` 為陡降（坡度 >12°），`none` 為不調整（經典 Naismith，含坡度 <5° 的情況）。
- 預設 distanceKm 12、ascentM 600、descentM 0、descentType none。descentM 為 0 時 descentType 無作用、仍為合法輸入，不報錯。
- 先容量、再 EMPTY、再該欄文法，跨欄依上述欄位順序。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（全部以精確有理數進行，浮點僅用於顯示前的最終捨入，見 implementation）：

1. 平路耗時 `flatMin = distanceKm × 12`（5 km/h 即每公里 12 分鐘）。
2. 爬升耗時 `ascentMin = ascentM ÷ 10`（600 m/h 即每 100 m 10 分鐘）。
3. 下降調整 `descentAdjMin`：`none` 為 0；`gentle` 為 `−descentM ÷ 30`（每 300 m 減 10 分鐘）；`steep` 為 `+descentM ÷ 30`（每 300 m 加 10 分鐘）。
4. 精確總時間 `totalExactMin = flatMin + ascentMin + descentAdjMin`，下限為 0：若為負數，以 0 計（緩降減項不得使總時間為負）。
5. 顯示總分鐘 `totalMinutes`：`totalExactMin` 以 half-up（四捨五入，.5 進位）捨入至整數分鐘。
6. 顯示總時間 `totalDisplay`：`H:MM`，H = floor(totalMinutes ÷ 60)（不補零，可超過 24），MM = totalMinutes mod 60（兩位補零）。
7. 平均配速 `paceMinPerKm = totalExactMin（取下限後） ÷ distanceKm`，half-up 至 1 位小數，單位分鐘／公里。
8. 等效平路距離 `equivalentFlatKm = distanceKm + 7.92 × ascentM ÷ 1000`（Scarf 等效距離，Naismith 數 7.92：3 英里 ÷ 2,000 英尺），half-up 至 2 位小數，單位公里；下降不計入等效距離。
9. 分段顯示值 `flatMinutes`、`ascentMinutes`、`descentAdjustmentMinutes` 各為對應精確值 half-up 至 1 位小數（下降調整為負值時對絕對值 half-up 再加負號）。注意：三個 1 位小數分段值相加未必等於整數分鐘的 `totalMinutes`，這是各自捨入所致，頁面以 `totalMinutes`／`totalDisplay` 為準，不強行湊合。

結果 `{flatMinutes,ascentMinutes,descentAdjustmentMinutes,totalMinutes,totalDisplay,paceMinPerKm,equivalentFlatKm}`。機器值不隨 locale 改。

固定下載 `hiking-time-estimate.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/hiking-time-estimator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精確算術：以整數有理數運算，禁止二進位浮點參與推導。距離最多 2 位小數，令 `d100 = distanceKm × 100`（整數）；則 `totalExactMin × 300 = d100 × 36 + ascentM × 30 ± descentM × 10`（gentle 取 −、steep 取 ＋、none 取 0），分母 300 的整數分子即為精確總時間。half-up 捨入以整數運算完成：`totalMinutes = floor((2 × 分子 + 300) ÷ 600)`（分子 ≥0 時；負值已先以 0 下限處理）。1 位小數分段值與 2 位小數等效距離亦同法以整數運算捨入。測試 import 同一份核心。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算登山時間」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。16 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `classic-naismith` | 經典算例：12 km、爬升 600 m → 3:24 |
| `gentle-descent` | 緩降每 300 m 減 10 分鐘 |
| `steep-descent` | 陡降每 300 m 加 10 分鐘 |
| `fractional-inputs` | 小數距離與爬升的 1 位小數配速 |
| `half-minute-rounding` | 精確總時間 x.5 分鐘時 half-up 進位 |
| `descent-repeating-decimal` | 下降調整為循環小數時的捨入 |
| `flat-only` | 零爬升零下降的純平路 |
| `minimum-distance` | 距離下限 0.1 km |
| `maximum-bounds` | 全部欄位上限，總時間超過 24 小時 |
| `descent-type-ignored-when-zero` | 下降為 0 時下降類型無作用 |
| `gentle-descent-floor-at-zero` | 緩降減項不得使總時間為負，下限 0 |
| `descent-default-none` | 省略 descentType 時預設 none |
| `distance-too-many-decimals` | 距離超過 2 位小數不接受 |
| `distance-zero` | 距離 0 低於下限 |
| `ascent-decimal` | 爬升不接受小數 |
| `descent-type-unknown` | 下降類型不在枚舉內 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 distanceKm=0.1/200 與 0.09/200.01、ascentM/descentM=0/10000 與 −1/10001、descentType 三值與空字串預設、totalExactMin 恰為 x.5 的 half-up、緩降減項恰使總時間為 0。所有已接受的 totalMinutes ≥ 0；移除下降調整後總時間不變（descentType none 時）。

候選 gate（均 NOT_RUN）

- 於 `tools/hiking-time-estimator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「登山時間預估」，title「登山時間預估｜Gloss Tools」，description「輸入距離與爬升，用 Naismith's rule 估算登山移動時間，含下降調整、平均配速與等效平路距離。」。英文 lang=en，H1 “Hiking Time Estimator”，title “Hiking Time Estimator | Gloss Tools”，description “Estimate hiking moving time from distance and ascent with Naismith's rule, including descent adjustment, average pace and equivalent flat distance.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。預估含休息嗎？不含，這是移動時間；請自行另加休息。 / Does the estimate include breaks? No, this is moving time only; add breaks separately.
- FAQ。為什麼陡降反而更久？陡降按 Langmuir 修正每 300 m 加 10 分鐘；緩降才減時間。 / Why does a steep descent take longer? The Langmuir correction adds 10 minutes per 300 m on steep descents; only gentle descents save time.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://hiking-time-estimator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/hiking-time-estimator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
