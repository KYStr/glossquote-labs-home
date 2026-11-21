# 空氣清淨機選型試算 / Air Purifier Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-air-purifier-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

要買（或已經買了）空氣清淨機的人，先量好房間面積與天花板高度，算出該房間需要的煙霧 CADR 下限、換算成立方公尺／小時，並對照 AHAM 建議適用面積，確認手邊那台夠不夠用，而不是只看盒子上誇大的「適用坪數」。

- 桌面。桌面填上房間面積（平方公尺或坪）、天花板高度、目標換氣率，算出所需 CADR；有現成清淨機時再填它的煙霧 CADR，看夠不夠、差多少。
- 行動。手機在賣場對著規格表核對一台清淨機的煙霧 CADR 是否覆蓋自家房間，不啟動任何量測或連線。

使用情境為購買前選型。資料只保留在目前頁面草稿。本工具只做選型試算，不量測空氣品質、不提供醫療建議。

## scope

固定 AHAM 規則的單房間選型模型：面積 → 所需煙霧 CADR（CFM 與 m³/h）＋ AHAM 建議適用面積；選填目標換氣率（ACH）與自有清淨機煙霧 CADR 的 adequacy 檢查。非目標為即時空氣品質量測、PM2.5／甲醛等污染物建議、噪音、耗電、濾網成本與更換提醒、即時商品資料庫或比價、醫療或過敏建議、把結果當作廠商認證。

已與本 checkout 的預案比對，最相近者的實質差異如下。

- 從冷氣選型（冷房能力）算冷氣噸數。此處以換氣率與 CADR 算清淨機選型：清淨機看的是每小時換幾次空氣（AHAM 規則），冷氣看的是熱負荷（kW／BTU、隔熱、日曬）；兩個物理量、兩套規則，不能互換。既有工具 `tools/ac-capacity-calculator/`。
- 從暖氣功率算電暖器瓦數。此處是清淨機的風量選型，不是發熱功率；同為「房間面積 → 設備規格」的估算家族，不同設備與公式（run 6 概念第 14 條 room-heater-calculator）。
- 從 AQI 數值查空氣品質分級。此處不讀任何即時空氣品質數值，只算房間需要多大的清淨機（run 6 概念第 27 條 aqi-interpreter）。

判定規則由本文定義，無線上資料或外部服務依賴。AHAM 規則來源見 inputsOutputs 的常數表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「房間面積、單位 / Room area and unit」
- 欄位或說明「天花板高度 / Ceiling height」
- 欄位或說明「目標換氣率（選填） / Target air changes per hour (optional)」
- 欄位或說明「自有清淨機煙霧 CADR（選填） / Your purifier's smoke CADR (optional)」
- 「計算所需 CADR / Calculate required CADR」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「所需 CADR 與建議適用面積 / Required CADR and suggested room size」先摘要再列細節：所需煙霧 CADR（CFM 與 m³/h）、AHAM 建議適用面積（平方呎與平方公尺）、房間體積與目標換氣率；有填自有 CADR 時再列該機的 AHAM 適用面積、實際換氣率、夠用與否與不足 CFM。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"areaValue":"","areaUnit":"m2","ceilingHeightM":"2.8","targetAch":"5.0","purifierCadrCfm":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 全部欄位皆為字串。areaValue、ceilingHeightM、targetAch 為十進小數字串（可含小數點一位小數點、無空白／符號／指數）；purifierCadrCfm 為 ASCII 十進整數字串。raw 每欄最多 12 單元。
- areaValue（必填）：換算後面積 1–200 m²。areaUnit（必填，有預設 "m2"）：只接受 "m2" 或 "ping"。ceilingHeightM（選填，空字串用預設 "2.8"）：2.0–4.0 m。targetAch（選填，空字串用預設 "5.0"）：1.0–10.0，小數至多 1 位。purifierCadrCfm（選填，空字串表示未提供）：整數 10–2000 CFM。
- 預設 ceilingHeightM 2.8、targetAch 5.0、areaUnit m2；areaValue 無預設，空白即 EMPTY。

先容量、再 schema／缺內容、再該欄文法、再範圍，依 areaValue、areaUnit、ceilingHeightM、targetAch、purifierCadrCfm 順序驗證。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依上述順序驗證。raw 超限 INPUT_LIMIT、缺欄 SCHEMA、空字串 EMPTY（選填欄的空字串除外，視為未提供／用預設）、小數文法 DECIMAL_FORMAT、整數文法 INTEGER_FORMAT、單位不在列舉 ENUM、範圍 RANGE，field 即上述欄名。
2. 換算（全程十進位精確運算，中間值不捨入）：
   - `areaM2 = areaValue`（m2）或 `areaValue × 3.3058`（ping）
   - `areaSqft = areaM2 × 10.7639`
   - `ceilingFt = ceilingHeightM × 3.2808`
   - `volumeFt3 = areaSqft × ceilingFt`
   - `requiredCadrCfm = ceil(volumeFt3 × targetAch / 60)`（無條件進位至整數 CFM：下限不可向下捨入）
   - `requiredCadrM3h = roundHalfUp(requiredCadrCfm × 1.6990)`（整數）
   - `ahamSuggestedRoomSqft = roundHalfUp1(requiredCadrCfm × 1.55)`；`ahamSuggestedRoomM2 = roundHalfUp1(ahamSuggestedRoomSqft / 10.7639)`
   - 若提供 purifierCadrCfm：`ownedAhamRoomSqft = roundHalfUp1(cadr × 1.55)`；`ownedAhamRoomM2 = roundHalfUp1(ownedAhamRoomSqft / 10.7639)`；`ownedAch = roundHalfUp1(cadr × 60 / volumeFt3)`；`adequate = cadr ≥ requiredCadrCfm`；`shortfallCfm = max(0, requiredCadrCfm − cadr)`。
3. 結果 `{areaM2, areaSqft, ceilingFt, volumeFt3, targetAch, requiredCadrCfm, requiredCadrM3h, ahamSuggestedRoomSqft, ahamSuggestedRoomM2, owned}`，owned 為 null 或 `{cadrCfm, ahamRoomSqft, ahamRoomM2, ach, adequate, shortfallCfm}`。areaM2、areaSqft、volumeFt3、ahamSuggestedRoomSqft、ahamSuggestedRoomM2、ach、targetAch 皆為 JSON 數字（面積／體積／ACH 取小數 1 位，ceilingFt 取小數 2 位）；CADR 皆為整數。
4. 捨入一律為十進位 half-up（0.5 往上），只在輸出步驟套用一次；中間值保持完整精度。禁止二進位浮點數直接顯示：反例為 37 × 1.55 = 57.35，若用二進位浮點會得到 57.3，正確為 57.4（見 `low-ach-2`）。

常數表（釘版值；括號內為未捨入的精確值，工具一律用釘版值計算）：

| 常數 | 釘版值 | 來源 |
| --- | --- | --- |
| 1 m² = ? sq ft | 10.7639（精確 10.7639104…，由 1 ft = 0.3048 m 精確定義導出） | 國際呎定義 |
| 1 坪 = ? m² | 3.3058（精確 3.3057851…） | 台灣慣用坪制 |
| 1 m = ? ft | 3.2808（精確 3.2808399…） | 國際呎定義 |
| 1 CFM = ? m³/h | 1.6990（精確 1.6990108…） | 單位換算 |
| AHAM 基準天花板 | 8 ft = 2.4384 m | AHAM Verifide 規則 |
| AHAM 建議適用面積倍率 | 1.55 sq ft / CFM（煙霧 CADR） | AHAM Verifide 目錄；ENERGY STAR 以同式描述 |
| 預設目標換氣率 | 5.0 ACH（即 AHAM 2/3 規則：煙霧 CADR ≥ 面積 × 2/3，8 呎天花板時恰為 5.0 ACH） | AHAM 消費者規則 |
| 換氣率參考點 | 4.8 ACH（AHAM Verifide 目錄數字：60 / (1.55 × 8) = 4.84 ≈ 4.8）；7.5 ACH（AHAM 野火煙霧建議：煙霧 CADR = 面積平方呎數） | AHAM Verifide；AHAM 白皮書 |

規則說明（寫進頁面說明文字）：2/3 規則與 1.55 倍率是同一條關係的兩個方向——「所需 CADR = 面積 × 2/3」與「建議面積 = CADR × 1.55」；兩者相差約 3%（1/1.55 = 0.645 對 2/3 = 0.667），2/3 規則較嚴格（5.0 對 4.8 ACH），本工具以較嚴格的 5.0 為預設，4.8 可由使用者選填。天花板高於 8 呎時所需 CADR 按 `ceilingFt / 8` 等比提高。只用煙霧 CADR 選型（最小粒徑、最嚴格）；規格表若只列 m³/h，以 ÷1.6990 換算為 CFM 後再用本工具。廠商標示的「適用坪數」常以 1–2 ACH 計，與 AHAM 的 4.8–5.0 ACH 不同，不可直接比較。

固定下載 `air-purifier-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/air-purifier-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算所需 CADR」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和兩種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。15 個字面核心案例與 2 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `standard-bedroom` | 標準臥室 15 m²、預設 ACH 5.0 |
| `small-room-ping` | 坪數輸入 5 坪 |
| `large-living-room` | 大客廳 30 m²、天花板 3.0 m |
| `high-ceiling` | 挑高天花板 3.6 m 需提高 CADR |
| `wildfire-ach-7p5` | 野火煙霧情境 ACH 7.5 |
| `low-ach-2` | 低換氣目標 ACH 2.0；小數半入 57.35 → 57.4 |
| `owned-adequate` | 自有清淨機煙霧 CADR 200 CFM 足夠 |
| `owned-short` | 自有清淨機煙霧 CADR 150 CFM 不足，缺 115 CFM |
| `min-area` | 面積下限 1 m²、天花板下限 2.0 m |
| `max-area` | 面積上限 200 m²、天花板上限 4.0 m、ACH 上限 10.0 |
| `aham-eight-foot` | AHAM 基準天花板 8 呎：所需 CADR 恰為面積 × 2/3 |
| `verifide-ach-4p8` | AHAM Verifide 目錄換氣率 ACH 4.8 |
| `area-zero` | 面積 0 超出範圍 |
| `ach-too-high` | ACH 12 超出上限 10.0 |
| `area-too-many-decimals` | 面積小數超過 4 位不接受 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 areaM2 == 1、areaM2 == 200、targetAch == 1.0、targetAch == 10.0、ceilingHeightM == 2.0、ceilingHeightM == 4.0、purifierCadrCfm == 10、purifierCadrCfm == 2000、剛好超限各一、2/3 規則在 8 呎天花板的等價性、57.35 的十進位半入。所有已接受的 requiredCadrCfm 皆為 ceil（不向下捨入），owned adequate 的判定與 shortfallCfm 一致。

候選 gate（均 NOT_RUN）

- 於 `tools/air-purifier-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「空氣清淨機選型試算」，title「空氣清淨機選型試算｜Gloss Tools」，description「填房間面積與天花板高度，依 AHAM 規則算出需要的煙霧 CADR 與建議適用面積，確認手邊那台清淨機夠不夠用。」。英文 lang=en，H1 “Air Purifier Calculator”，title “Air Purifier Calculator | Gloss Tools”，description “Enter room area and ceiling height to find the smoke CADR your room needs under the AHAM rule, with the suggested room size, and check whether your purifier is big enough.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼用煙霧 CADR 而不是粉塵或花粉 CADR？煙霧是三種粒徑中最小的、最嚴格的；AHAM 的適用面積規則就是以煙霧 CADR寫的。 / Why smoke CADR, not dust or pollen CADR? Smoke is the smallest of the three particle sizes and the strictest; the AHAM room-size rule is written against smoke CADR.
- FAQ。1.55 和 2/3 是同一條規則嗎？是同一條關係的兩個方向：所需 CADR = 面積 × 2/3，建議面積 = CADR × 1.55；前者是 5.0 ACH，後者是 4.8 ACH，相差約 3%，本工具以較嚴格的 5.0 為預設。 / Are 1.55 and 2/3 the same rule? They are two directions of one relationship: required CADR = area × 2/3, suggested room = CADR × 1.55; the first is 5.0 ACH, the second 4.8 ACH, about 3% apart, and this tool defaults to the stricter 5.0.
- FAQ。盒子上寫的適用坪數比 AHAM 建議的大，可以信嗎？廠商標示的適用面積常以每小時換氣 1–2 次計，AHAM 以 4.8–5.0 次計；比煙霧 CADR，不要只比適用坪數。 / The box claims a bigger coverage than AHAM suggests — can I trust it? Marketing coverage is often quoted at 1–2 air changes per hour, while AHAM uses 4.8–5.0; compare smoke CADR, not coverage claims.
- FAQ。天花板比 8 呎高怎麼辦？所需 CADR 按天花板高度等比提高（天花板呎數 ÷ 8）；挑高房間要買更大台。 / What if my ceiling is higher than 8 ft? Required CADR scales with ceiling height (ceiling feet ÷ 8); a taller room needs a bigger purifier.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://air-purifier-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/air-purifier-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
