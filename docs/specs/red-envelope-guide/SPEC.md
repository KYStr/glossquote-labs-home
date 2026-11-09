# 紅包金額指南 / Red Envelope Guide

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-red-envelope-guide-20261109` · 2026-11-09 · v1

[預案品質與補庫說明](../../SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者臨時要包紅包時，先選場合、關係與（婚禮）場地等級，立刻確認一個符合台灣習俗的金額區間與推薦金額，不必在互相矛盾的文章之間猜，也不會包到含 4 或百位不合規的金額。

- 桌面。桌面在辦公室查同事婚禮要包多少，順手核對同行人數加計後的區間。
- 行動。手機在婚禮會場外、或過年前包紅包當下，單手選完條件就看到推薦金額。

使用情境為禮俗查詢。資料只保留在目前頁面草稿。金額是行情參考，不是任何人的義務或保證。

## scope

五種場合的固定查表與固定金額規則：婚禮、彌月、春節包給長輩、春節包給晚輩、喬遷。非目標為喪禮白包（白包金額慣例用單數、規則相反，不在本工具）、入學／其他祝賀場合、依個人收入或地區微調行情、紀錄或追蹤已包出的紅包、產生付款或轉帳、把行情當成習俗的唯一正解。

已與 registry 及 `docs/specs/` 既有預案比對，最相近者的實質差異如下。

- 交換禮物的參加者配對。此處不配對任何人，只查單份紅包的金額。 [gift-exchange-match](../gift-exchange-match/SPEC.md)
- 櫃檯零錢盤的面額組合點算。此處不行使任何現金，只依禮俗矩陣給金額建議。 [cash-float-tray](../cash-float-tray/SPEC.md)

行情表與有效金額規則由本文定義（第 4 節），標示為台灣市場常見行情整理（2026-11 作者整理版 v1），無線上資料或外部服務依賴。習俗本有地區與家庭差異，產品文案固定揭露這一點（第 4 節固定字串 `note-customs-vary`）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「場合、關係 / Occasion and relationship」
- 欄位或說明「婚禮場地、同行與出席 / Wedding venue, party size and attending」（僅場合為婚禮時啟用；其他場合依第 4 節適用性規則停用不適用欄位並說明原因）
- 欄位或說明「身分階段、小孩年齡 / Your stage, child's age band」（僅春節場合啟用對應欄位）
- 「查詢建議金額 / Look up suggested amount」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「建議區間與推薦金額 / Suggested range and recommended amount」先摘要再列細節：先顯示推薦金額（大字），再顯示區間與本次套用的說明標籤（未出席六成、同行加計、喬遷可改送禮等，第 4 節固定 `notes`）。成功才顯示「下載報告 / Download report」。文字可手動選取。金額顯示固定加千分位逗號與 `NT$` 前綴（例 `NT$1,200`），機器值不隨顯示格式改變。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果至少含一個有效金額，不會有空結果。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"occasion":"wedding","relationship":"colleague","tier":"restaurant","giverStage":null,"ageBand":null,"attending":true,"attendeeCount":"1"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。本工具無 textarea 與檔案欄。

輸入欄位（順序即驗證順序）：

| 欄位 | 型別 | 值域 | 預設 |
| --- | --- | --- | --- |
| `occasion` | string（不可 null） | `wedding`、`full-month`、`new-year-elder`、`new-year-junior`、`housewarming` | `wedding` |
| `relationship` | string 或 null | `colleague`、`friend`、`relative`、`senior` | `colleague` |
| `tier` | string 或 null | `restaurant`、`hotel`、`five-star` | `restaurant` |
| `giverStage` | string 或 null | `student`、`early-career`、`established` | null |
| `ageBand` | string 或 null | `preschool`、`elementary`、`junior-high`、`senior-high`、`university` | null |
| `attending` | boolean | `true`、`false` | `true` |
| `attendeeCount` | ASCII 整數字串 | 正規式 `0` 或非零開頭十進位、無空白／符號／小數／指數 | `1` |

所有 string 欄位 raw 最多 32 UTF-16 單元。`attendeeCount` 文法通過後數值須在 1–6（含自己；紅包以「出席單位」計，一份紅包封一個單位）。

驗證順序（第一個失敗即回傳，整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null）：

0. 容器不是普通物件、缺欄、多欄或任一欄為 accessor → `SCHEMA`，field=null。
1. 逐欄依上表順序檢查：(a) 型別不符（`occasion` 為 null、nullable 欄位不是 string 也不是 null、`attending` 不是 boolean、`attendeeCount` 不是 string）→ `TYPE`，field 為該欄名。(b) string 欄位 raw 超過 32 單元 → `INPUT_LIMIT`。(c) 含不成對 surrogate → `UNICODE`。(d) 列舉欄位值不在值域 → `ENUM`；`attendeeCount` 文法不符 → `INTEGER_FORMAT`，數值不在 1–6 → `RANGE`。
2. 適用性檢查，依欄位順序 `relationship`、`tier`、`giverStage`、`ageBand`、`attending`、`attendeeCount` 逐欄判定，第一個失敗即回傳：該場合需要但為 null（或 `attending`/`attendeeCount` 不適用時見下）→ `EMPTY`；該場合不適用但帶非預設值 → `NOT_APPLICABLE`。適用矩陣：
   - `wedding`：需要 `relationship`、`tier`；`giverStage`、`ageBand` 須為 null。
   - `full-month`、`housewarming`：需要 `relationship`；`tier`、`giverStage`、`ageBand` 須為 null；`attending` 須為 `true`、`attendeeCount` 須為 `"1"`。
   - `new-year-elder`：需要 `giverStage`；`relationship`、`tier`、`ageBand` 須為 null；`attending` 須為 `true`、`attendeeCount` 須為 `"1"`。
   - `new-year-junior`：需要 `ageBand`；`relationship`、`tier`、`giverStage` 須為 null；`attending` 須為 `true`、`attendeeCount` 須為 `"1"`。
3. 婚禮一致性：`occasion=wedding` 且 `attending=false` 且 `attendeeCount≠"1"` → `RANGE`，field=`attendeeCount`（未出席不計同行人數）。

資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

### 行情表（固定資料，單位 NT$，皆為調整前區間）

婚禮 — 關係 × 場地等級（1 人出席、每份紅包）：

| 關係＼場地 | `restaurant` 一般餐廳 | `hotel` 飯店 | `five-star` 五星／高級 |
| --- | --- | --- | --- |
| `colleague` 同事／普通朋友 | 1,200–2,000 | 1,800–2,600 | 2,400–3,200 |
| `friend` 好友 | 2,600–3,600 | 3,200–4,200 | 3,800–4,800 |
| `relative` 親戚 | 2,600–6,600 | 3,200–7,200 | 3,800–7,800 |
| `senior` 長輩／上司 | 2,000–3,600 | 2,600–4,200 | 3,200–4,800 |

場地等級規則：`hotel` 為 `restaurant` 每端 +600；`five-star` 再 +600。本表即固定資料，實作不得再自行加減。

彌月 `full-month` — 依關係：`colleague` 1,200–2,000；`friend` 2,000–3,600；`relative` 2,600–6,600；`senior` 2,000–3,600。

喬遷 `housewarming` — 依關係：`colleague` 1,200–2,000；`friend` 2,000–3,600；`relative` 2,600–3,600；`senior` 2,000–3,600。結果固定附加 `gift-alternative` 說明（可改送等值禮品）。

春節包給長輩 `new-year-elder` — 依包的人的身分階段 `giverStage`：`student` 學生 600–2,000；`early-career` 社會新鮮人 2,000–3,600；`established` 工作穩定 3,600–6,600。

春節包給晚輩 `new-year-junior` — 依小孩年齡帶 `ageBand`：`preschool` 幼兒 200–600；`elementary` 國小 600–1,200；`junior-high` 國中 800–1,600；`senior-high` 高中 1,200–3,600；`university` 大學 1,200–3,600。

### 有效金額謂詞與對齊（固定算法，整數運算，無浮點）

金額 x（NT$ 整數）為有效 ⟺ 全部成立：

1. `x ≥ 200` 且 `x mod 100 = 0`。
2. x 的十進位字串（無正負號、無前導零）不含字元 `4`。
3. `x < 10,000` 時：百位數 `((x div 100) mod 10) ∈ {0, 2, 6, 8}`。
4. `x ≥ 10,000` 時：令 `T = x div 1000`（千元數），T 的十進位字串不含 `4`，且 `(T mod 10) ∈ {0, 2, 6, 8}`。

對齊函數（y 為正有理數，實作以分子／分母或等值整數步進計算，不用浮點）：

- `snapUp(y)`：≥ y 的最小有效金額。以 `ceil(y/100)×100` 為起點、每次 +100 步進至有效為止。
- `snapDown(y)`：≤ y 的最大有效金額。以 `floor(y/100)×100` 為起點、每次 −100 步進至有效為止。
- `snapNearest(y)`：令 a=`snapDown(y)`、b=`snapUp(y)`；`y−a < b−y` 取 a，`y−a > b−y` 取 b，相等（tie）取 b（向上）。

### 調整與結果（固定順序）

1. 依場合自上表取基礎區間 `(low, high)`。
2. 婚禮且出席：同行每多 1 人，兩端各加每人增額（依場地：`restaurant` 1,000、`hotel` 1,200、`five-star` 1,600），即 `low += inc×(count−1)`、`high += inc×(count−1)`。紅包是「每份（出席單位）」語意：1 人 1 份；同行者的份以增額併入同一份。
3. 婚禮且未出席：兩端各乘 0.6，四捨五入（round-half-up）到整數，固定整數式 `scaled(x) = ⌊(6x + 5) / 10⌋`。未出席不套用步驟 2（步驟 3 的前提已由驗證順序 3 保證 count=1）。
4. `rangeLow = snapUp(low)`、`rangeHigh = snapDown(high)`。若 `rangeLow > rangeHigh`（依本表與上限不應發生，仍固定此防衛規則），兩者皆改為 `snapNearest(mid)`。
5. `mid = (low + high) / 2`（步驟 2／3 調整後、步驟 4 對齊前的兩端平均，精確有理數）；`recommended = snapNearest(mid)`。依固定表與上限，`recommended` 恆落在 `[rangeLow, rangeHigh]` 內（fixtures 逐案核對）。
6. `notes` 為固定順序的標籤陣列，只含適用者：`customs-vary`（永遠包含）、`not-attending-discount`（婚禮未出席）、`extra-attendees`（婚禮出席且 count>1）、`gift-alternative`（喬遷）。

成功結果 `{ok:true,result}`，result 欄位固定：`occasion`、`relationship`、`tier`、`giverStage`、`ageBand`（不適用者為 null，回顯實際套用值）、`attending`、`attendeeCount`（數值，非字串）、`rangeLow`、`rangeHigh`、`recommended`（皆 NT$ 整數）、`currency:"TWD"`、`unit:"per-envelope"`、`notes`。金額一律整數，無浮點或未定義捨入。

固定下載 `red-envelope-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

固定雙語字串（文案即契約）：

- `note-customs-vary`：各地與各家習俗不同，金額僅供參考，請以自身經濟狀況與雙方交情為準。 / Customs vary by family and region; amounts are references only — adjust to your means and your relationship.
- `note-not-attending-discount`：未出席以行情約六成計算。 / Not attending: about 60% of the usual range.
- `note-extra-attendees`：紅包以每份（出席單位）計，多人同行已加計每人份。 / Amounts are per envelope (attending unit); extra attendees are already added.
- `note-gift-alternative`：喬遷也可改送等值禮品。 / For a housewarming, a gift of equivalent value is also appropriate.
- 錯誤訊息（依 code）：SCHEMA 輸入格式不正確 / The input is malformed.；TYPE 欄位型別不正確 / Wrong field type.；INPUT_LIMIT 輸入過長 / Input is too long.；UNICODE 含有無效字元 / Contains invalid characters.；ENUM 請選擇清單中的項目 / Choose one of the listed options.；INTEGER_FORMAT 請輸入整數 / Enter a whole number.；RANGE 超出允許範圍 / Outside the allowed range.；EMPTY 此場合需要這個欄位 / This field is required for the chosen occasion.；NOT_APPLICABLE 此場合不適用此欄位 / This field does not apply to the chosen occasion.；INTERNAL 發生未預期錯誤 / Something unexpected happened.

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/red-envelope-guide/`。src/core.mjs 放純驗證、查表、對齊推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- 查表與對齊全為整數運算：金額、增額、六成縮放（`⌊(6x + 5) / 10⌋`）與 snap 步進皆不用浮點；`mid` 以 `(low + high)` 的奇偶性處理半整數（和為奇數時 mid 為 .5，snapNearest 以兩倍值比較距離，tie 向上），不得先四捨五入 mid。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 場面切換場合時，不適用欄位在 UI 上停用並保留原值；核心驗證仍依第 4 節適用性矩陣判定（UI 停用不取代核心驗證，貼上或程式化輸入仍須回 NOT_APPLICABLE／EMPTY）。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢建議金額」，五種場合的畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；含 snap 在含 4 金額與 tie 的端點。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；場合切換時不適用欄位的停用與說明清楚。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `wedding-basic` | 同事、一般餐廳、1 人：基礎區間不需對齊，中點即有效值 |
| `wedding-midpoint-tie` | 好友、飯店：中點 3,700 百位不合規，上下等距 tie 向上取 3,800 |
| `wedding-avoid-four` | 長輩／上司、五星：高點 4,800 與中點 4,000 皆含 4，對齊後 3,200–4,600、推薦 4,200 |
| `wedding-not-attending` | 親戚、飯店、未出席：六成縮放後對齊，notes 含 not-attending-discount |
| `wedding-extra-attendees` | 好友、餐廳、3 人：每人增額 1,000×2 併入同一份，notes 含 extra-attendees |
| `full-month-relative` | 彌月、親戚：關係表直查，中點 4,600 本身有效 |
| `new-year-junior-elementary` | 春節晚輩、國小：中點 900 百位不合規，tie 向上取 1,000 |
| `new-year-elder-established` | 春節長輩、工作穩定：3,600–6,600，中點 tie 向上取 5,200 |
| `new-year-elder-student` | 春節長輩、學生：snapUp 跨過含 4 的 1,400，中點取較近的 1,200 |
| `error-wedding-missing-tier` | 婚禮 tier 為 null → EMPTY，field=tier |
| `error-full-month-tier-set` | 彌月帶 tier → NOT_APPLICABLE，field=tier |
| `error-count-range` | attendeeCount 為 "7" → RANGE，field=attendeeCount |
| `error-funeral-enum` | occasion 為 "funeral" → ENUM（白包不在值域），field=occasion |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證每格行情表至少各一手算案例（婚禮 12 格、彌月 4、喬遷 4、長輩 3 階段、晚輩 5 年齡帶）；驗證 snap 在 200、9,900、10,000、12,000、14,000（含 4 千位帶）與 44,000 附近的步進行為；所有成功結果的 rangeLow、rangeHigh、recommended 皆通過有效金額謂詞且 recommended ∈ [rangeLow, rangeHigh]。

候選 gate（均 NOT_RUN）

- 於 `tools/red-envelope-guide/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「紅包金額指南」，title「紅包金額指南｜Gloss Tools」，description「依場合、關係與婚禮場地等級，查台灣紅包行情並自動避開 4 與不合規百位，給出可直接照包的建議金額區間與推薦金額。」。英文 lang=en，H1 “Red Envelope Guide”，title “Red Envelope Guide | Gloss Tools”，description “Look up Taiwan red-envelope amount ranges by occasion, relationship and wedding venue tier, with etiquette-valid amounts that avoid the digit 4.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼金額避開 4？4 諧音不吉利，台灣紅包習俗上避開；百位也偏好雙數與 2、6、8。 / Why avoid the digit 4? The digit 4 is considered unlucky, and even hundreds — especially 2, 6 and 8 — are preferred.
- FAQ。未出席為什麼打六折？未出席不佔席位與餐費，行情約為出席的六成，本工具以六成計算後再對齊有效金額。 / Why 60% when not attending? A guest who does not attend takes no seat or meal, so the customary amount is about 60%, then snapped to a valid amount.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://red-envelope-guide.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格 task id 為 `labs-red-envelope-guide-spec-20261109`（由主代理登記，本文作者未執行任何 registry 操作）。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/red-envelope-guide/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
