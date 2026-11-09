# 戒圍換算 / Ring Size Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-ring-size-converter-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者手邊只有一個戒圍標示（某國系統的號數，或自己量到的內圍／內徑 mm），要在另一個系統的通路買戒指時，先換算出全部系統的對應值與最接近的標準尺寸，並知道自己是恰好命中標準尺寸、還是介於兩尺寸之間。

- 桌面。桌機在品牌官網下單前，把已知的美圍或日圍換成內圍 mm 與其他系統逐一核對。
- 行動。手機在銀樓或市集現場，把紙條量到的內圍 mm 換成美圍／日圍，當場跟店員確認。

使用情境為購物前的尺寸核對。資料只保留在目前頁面草稿。

## scope

MVP 必做：單一來源輸入（六個系統擇一）、以內圍 mm 為正規錨點的雙向換算、固定 21 列標準尺寸表（美圍 3.0–13.0 每 0.5 一列）、最近列比對與 0.3 mm 吻合容差、介於兩尺寸時的相鄰列提示、下載 JSON 報告。非目標為四分之一美圍尺寸（6.25 等）、正規窗 40.0–70.0 mm 以外的輸入、港圍／中國圍／印度圍／瑞士圍、品牌專屬寬版／窄版修正、指圍量測教學、歷史紀錄、登入或購物連結。

已與本 repo 既有規格比對，最相近者的實質差異如下。

- 鞋碼換算同為身體尺寸的多系統對照，但量的是腳長、表是鞋碼系統（EU／US／UK／JP 的鞋碼定義與步進完全不同），與戒指內圍無關。 [shoe-size-converter](https://github.com/KYStr/glossquote-labs-home/blob/18b297528ffac771ba1044664a0adac79e5d5533/docs/specs/shoe-size-converter/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。尺寸表來源與取捨見 inputsOutputs 的「固定標準尺寸表」與 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「來源系統 / Source system」：六個選項「內圍（mm）/ Inside circumference (mm)」「內徑（mm）/ Inside diameter (mm)」「美圍（US）/ US size」「歐圍（EU）/ EU (ISO) size」「日圍（JP）/ Japan size」「英圍（UK）/ UK size」，預設內圍。
- 欄位或說明「數值 / Value」：來源為英圍時是 21 個表列字母的 select；其餘來源是文字輸入，單位與格式提示跟著來源切換。
- 「換算 / Convert」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「換算結果 / Converted sizes」先列內圍、內徑、歐圍、日圍，再列「最接近的標準尺寸 / Nearest standard size」（美圍、英圍與該列內圍）、「與標準尺寸差距 / Difference from the standard size」與狀態：「吻合 / Exact match」或「介於兩尺寸之間 / Between sizes」；介於兩尺寸時再列「相鄰的另一尺寸 / Adjacent size」。結果下方固定顯示兩則說明：「差距 0.3 mm 以內視為吻合。/ A difference of up to 0.3 mm counts as an exact match.」與「各品牌尺寸可能略有差異，購買前請先實測。/ Sizes vary slightly by brand; measure before buying.」。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。介於兩尺寸與日圍未滿 1 號都以文字明示，不只靠符號或顏色。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"source":"circumference","value":""}` 並聚焦來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 輸入恰兩欄：`source` 與 `value`，皆為字串。`source` 六選一：`circumference`、`diameter`、`us`、`eu`、`jp`、`uk`。`value` 的文法與範圍依 source 而定（見下），raw 每欄最多 8 單元（UTF-16 code units）。
- 預設 `{"source":"circumference","value":""}`。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null，本工具 row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. SCHEMA 先行。其後依欄位順序 source、value 逐欄驗證。source：raw 超限 INPUT_LIMIT、surrogate UNICODE，其值（含空字串）不在六選一內為 ENUM，field=`source`。
2. value：raw 超限 INPUT_LIMIT、surrogate UNICODE、空字串 EMPTY，field=`value`。文法依 source：circumference／diameter／us 用小數文法 `^(0|[1-9][0-9]{0,2})(\.[0-9]{1,2})?$`，不符為 DECIMAL_FORMAT；eu／jp 用整數文法 `^(0|[1-9][0-9]{0,2})$`，不符為 INTEGER_FORMAT；uk 須恰為固定表 21 個英圍標籤之一，不符為 ENUM。
3. 文法通過後依 source 做語意檢查，順序 RANGE 後 STEP。circumference 40.0–70.0 mm；diameter 12.8–22.2 mm（對應內圍 40.2–69.7 mm，恆在正規窗內）；us 3.0–13.0，且須為 0.5 的倍數，非倍數為 STEP；eu 整數 40–70；jp 整數 1–28（29 號內圍 70.2 mm 超出正規窗，故不收）；uk 無額外語意檢查。超出範圍為 RANGE，field=`value`。

正規化：全部輸入先換成正規內圍 `circH`（整數，單位 0.01 mm）。π 固定為 IEEE-754 double 的 π（3.141592653589793）；涉及 π 的步驟以實數語意定義，作者已窮舉驗證全部合法輸入下每個捨入量距最近的 .5 邊界至少 1.4e-5，遠大於 double 運算誤差，故 double 計算與精確實數捨入恆一致（驗證數字見 AUTHOR-CHECK）。`⌊x+0.5⌋` 為四捨五入（round half up），本工具所有量皆為正數。

- circumference：小數字串以整數運算解析為 circH（一位小數 ×10 補 0、二位小數直接取）。
- diameter：先解析為 diaH（整數，0.01 mm），circH = ⌊diaH × π + 0.5⌋。
- us：查固定表取該列 circH。
- eu：circH = eu × 100（歐圍即 ISO 8653 內圍 mm 的整數標籤）。
- jp：依日圍直徑定義 d(n) = 13 + (n−1)/3 mm = (38+n)/3 mm，circH = ⌊π × (38+n)/3 × 100 + 0.5⌋。
- uk：查固定表以標籤取該列 circH。

輸出全部只由 circH 推導，不回讀原始輸入：

- `circumferenceMm`：字串一位小數，tenths = ⌊(circH + 5) / 10⌋，格式「整數.一位」。
- `diameterMm`：字串一位小數，diaTenths = ⌊circH / (10π) + 0.5⌋，即內徑 = 內圍 / π 後四捨五入至 0.1 mm；以內徑為來源且輸入兩位小數時，顯示值可能與輸入差 0.1 mm，這是固定管線的結果，不是錯誤。
- `euSize`：整數 ⌊(circH + 50) / 100⌋（內圍 mm 四捨五入至整數，即 ISO 8653 標籤）。
- `jpSize`：整數 ⌊3 × circH / (100π) − 38 + 0.5⌋，即日圍直徑定義的反推（內徑 = 13 + (n−1)/3 mm）；結果小於 1 時為 null，表示未滿日圍 1 號。
- `nearestRow`：固定表 21 列中 |circH − rowH| 最小的一列；恰在兩列正中點（距離相等）時取較大的一列（配戴建議取大）。輸出 `{usSize, ukSize, circumferenceMm}`：usSize 為整數時不帶小數（`"6"`）、半號帶 `.5`（`"6.5"`）；ukSize 為表列標籤；circumferenceMm 為該列內圍一位小數字串。
- `deltaMm`：|circH − rowH| 顯示為一位小數字串，⌊(Δ + 5) / 10⌋ / 10。
- `fit`：Δ ≤ 30（0.30 mm，含等號）為 `"exact"`，否則 `"between"`。0.3 mm 約為美圍半號間距（約 0.64 mm）的一半，是顯示指引，不是錯誤。
- `adjacentRow`：僅當 fit 為 `"between"` 且 circH 嚴格介於兩列之間時，為 nearestRow 另一側的那一列（同 nearestRow 格式）；circH 在表列範圍之外或 fit 為 `"exact"` 時為 null。
- 結果 `{circumferenceMm, diameterMm, euSize, jpSize, nearestRow, deltaMm, fit, adjacentRow}`。機器值不隨 locale 改。

固定標準尺寸表（21 列，字面資料，實作不得另查或插值英圍／美圍）。內圍為各列正規值（單位 mm，一位小數）；內徑欄為內圍 / π 四捨五入至 0.1 mm 的顯示值；歐圍為內圍四捨五入至整數（ISO 8653）；日圍依上文 JIS 直徑定義由內圍反推；英圍為下述固定字母欄。

| 內圍 mm | 內徑 mm | 美圍 US | 歐圍 EU | 日圍 JP | 英圍 UK |
| --- | --- | --- | --- | --- | --- |
| 44.2 | 14.1 | 3 | 44 | 4 | F½ |
| 45.5 | 14.5 | 3.5 | 46 | 5 | G½ |
| 46.8 | 14.9 | 4 | 47 | 7 | H½ |
| 48.0 | 15.3 | 4.5 | 48 | 8 | I½ |
| 49.3 | 15.7 | 5 | 49 | 9 | J½ |
| 50.6 | 16.1 | 5.5 | 51 | 10 | K½ |
| 51.9 | 16.5 | 6 | 52 | 12 | L½ |
| 53.1 | 16.9 | 6.5 | 53 | 13 | M½ |
| 54.4 | 17.3 | 7 | 54 | 14 | N½ |
| 55.7 | 17.7 | 7.5 | 56 | 15 | O½ |
| 57.0 | 18.1 | 8 | 57 | 16 | P½ |
| 58.3 | 18.6 | 8.5 | 58 | 18 | Q½ |
| 59.5 | 18.9 | 9 | 60 | 19 | R½ |
| 60.8 | 19.4 | 9.5 | 61 | 20 | S½ |
| 62.1 | 19.8 | 10 | 62 | 21 | T½ |
| 63.4 | 20.2 | 10.5 | 63 | 23 | U½ |
| 64.6 | 20.6 | 11 | 65 | 24 | V½ |
| 65.9 | 21.0 | 11.5 | 66 | 25 | W½ |
| 67.2 | 21.4 | 12 | 67 | 26 | X½ |
| 68.5 | 21.8 | 12.5 | 69 | 27 | Y½ |
| 69.7 | 22.2 | 13 | 70 | 29 | Z½ |

表列依據：內圍／美圍／歐圍為國際通用珠寶商轉換表（以 ISO 8653 內圍為準）的一致欄位——美圍 5 = 49.3 mm、6 = 51.9 mm、7 = 54.4 mm、9 = 59.5 mm 等錨點經多家公開轉換表交叉確認；英圍採與該表一致的半字母欄（美圍每進半號，英圍進一個字母：F½ 起，US 5 = J½、6 = L½、6.5 = M½、7 = N½、13 = Z½ 均經公開轉換表確認）；日圍不抄任何單一商家表，依 JIS S 4700 直徑定義（1 號內徑 13.0 mm、每號 +1/3 mm）由內圍反推並把結果欄逐列寫死，錨點 US 5→9、6→12、6.5→13、7→14、9→19 與公開轉換表的多數值一致；各品牌表在英圍整字母／半字母與日圍上可差半號至一號，這是固定文案明示實測的原因，不得由實作自行改表。

固定下載 `ring-size-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/ring-size-converter/`。src/core.mjs 放純驗證、推導、格式化（含固定 21 列表資料）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、正中點取大、未滿日圍 1 號和三種 controller case 的證據。 |
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
| `circ-exact-row` | 內圍恰為標準列（美圍 6），全系統輸出 |
| `diameter-input` | 內徑 17.3 mm 換內圍，正規化後命中美圍 7 |
| `circ-between-sizes` | 內圍 52.6 mm 介於兩列，最近列與相鄰列 |
| `eu-input` | 歐圍 57 輸入，日圍由 JIS 定義反推為 16 |
| `us-input` | 美圍 9 輸入，歐圍 59.5 四捨五入為 60、日圍 19 |
| `jp-input` | 日圍 14 輸入，內圍 54.45 mm 顯示 54.5 並命中美圍 7 |
| `uk-input` | 英圍 J½ 輸入，命中美圍 5、日圍 9 |
| `circ-midpoint-tie` | 內圍 56.35 mm 恰在正中點，取較大列 |
| `circ-min-boundary` | 內圍下限 40.0 mm，日圍未滿 1 號為 null |
| `circ-max-boundary` | 內圍上限 70.0 mm，差距恰 0.30 mm 仍為吻合 |
| `err-range` | 內圍 71.0 超出正規窗 |
| `err-step` | 美圍 6.25 非 0.5 倍數 |
| `err-empty` | 數值空白 |
| `err-uk-enum` | 英圍 N 不在本表半字母欄 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證內圍 39.9／70.1、內徑 12.7／22.3、美圍 2.5／13.5、日圍 0／29、歐圍 39／71、兩列正中點取大、Δ 恰 0.30 與 0.31 的 fit 分界、日圍輸出 0 轉 null。所有輸出只由 circH 推導，同一 circH 不因來源不同而異。

候選 gate（均 NOT_RUN）

- 於 `tools/ring-size-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「戒圍換算」，title「戒圍換算｜Gloss Tools」，description「輸入任一戒圍系統（內圍、內徑、美圍、歐圍、日圍、英圍），立即換算全部系統與最接近的標準尺寸。」。英文 lang=en，H1 “Ring Size Converter”，title “Ring Size Converter | Gloss Tools”，description “Enter a ring size in any system — inside circumference, inside diameter, US, EU, Japan or UK — and convert it to all the others plus the nearest standard size.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。日圍怎麼算？依日本 JIS S 4700 的直徑定義：1 號內徑 13.0 mm，每升一號內徑增加 1/3 mm；本工具由內圍換算內徑後四捨五入得出，各品牌可能差一號。 / How is the Japan size derived? From the JIS S 4700 diameter definition: size 1 has a 13.0 mm inside diameter and each size adds 1/3 mm. This tool converts the circumference to a diameter and rounds; brands may differ by one size.
- FAQ。顯示「介於兩尺寸之間」怎麼辦？內圍與最接近的標準尺寸差距超過 0.3 mm 時，會同時列出相鄰的另一尺寸；配戴上通常建議選較大的一邊，並以實測為準。 / What if the result says "between sizes"? When the circumference is more than 0.3 mm from the nearest standard size, the adjacent size is shown too. Most wearers size up, and a physical measurement decides.
- FAQ。各品牌尺寸可能略有差異，購買前請先實測。 / Sizes vary slightly by brand; measure before buying.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://ring-size-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格任務 id 為 `labs-ring-size-converter-spec-20261109`，由主代理登記；作者本人未執行任何 registry 指令。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/ring-size-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
