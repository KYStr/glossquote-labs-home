# 點按節拍 BPM 偵測 / Tap Tempo — BPM Detector

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-tap-tempo-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

跟著聽到的音樂敲幾下，就量出它的速度：中位數 BPM、每拍毫秒、平均 BPM 對照，可直接拿去設定節拍器。

- 桌面。練琴或編曲時開著分頁，聽到一段音樂順手在敲擊區敲四、五下，讀數立即穩定下來。
- 行動。手機在琴房或教室裡單手敲擊，大按鈕可點，停頓太久自動重新起算，不必先清除。

使用情境為即時測量。資料只保留在目前頁面記憶體，離頁即丟棄。

## scope

固定窗口（最近至多 8 個間隔）、中位數為主、平均為輔的點按測速模型。非目標為發出節拍聲或任何播放、錄音、麥克風或音訊分析、速度曲線／漸快漸慢偵測、把讀數寫入節拍器、帳號、儲存或分享。

已與本 repo 既有規格比對，最相近者的實質差異如下。

- 節拍器播放使用者設定的速度（WebAudio 點擊聲、拍號、細分），敲擊只是它設定速度的其中一種輸入方式。此處完全不發聲、沒有播放狀態與音訊時鐘，全部契約是對一串字面時間戳的統計：分段、窗口、中位數／平均與固定捨入，輸出可由 fixtures 逐位重算。 [metronome](https://github.com/KYStr/glossquote-labs-home/blob/8ef71f6e6d1c9300334024cbb1770c9b7e594f78/docs/specs/metronome/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。首屏即見敲擊區與讀數，匯入功能收在一層 disclosure。寬版以敲擊區與讀數相鄰，窄版依敲擊區、讀數、操作、匯入直排。

- 大型按鈕「敲擊 / Tap」是主要操作與即時敲擊面。指標以 pointerdown 觸發，鍵盤以 Space／Enter（原生按鈕啟動）觸發，兩者走同一記錄函式。按住鍵盤的自動重複（event.repeat）不記錄。
- 讀數區依序顯示「BPM（中位數）/ BPM (median)」大字、「每拍毫秒 / Milliseconds per beat」、「平均 BPM / Mean BPM」、「每秒拍數 / Beats per second」、「使用間隔數 / Intervals used」。段落曾重置時另顯示「目前段落敲擊數 / Taps in current segment」。
- 「復原上一敲 / Undo last tap」移除最後一次敲擊並使讀數失效重算；陣列清空時回 empty。「重設 / Reset」停止待執行工作，清空敲擊陣列與匯入文字，回 empty 並聚焦敲擊按鈕。
- 一層 disclosure「匯入時間戳 / Import timestamps」含 textarea（逗號或空白分隔的整數毫秒）與主要操作「計算 / Measure」。計算成功才顯示「下載報告 / Download report」；即時路徑在讀數已發布且使用間隔數 ≥1 時也可下載。文字可手動選取。
- 尚無讀數時讀數區顯示提示而非 0：empty 顯示「點按開始 / Tap to start」，已敲一下或新段落尚無間隔時顯示「再敲一下開始測量 / Tap once more to start measuring」。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無敲擊、無結果，提示開始敲擊或匯入。 |
| tapping | 即時工作階段：至少 1 次敲擊。每下一敲立即撤銷舊讀數並以新世代排程評估，發布後讀數對應目前陣列；尚無間隔時讀數為 null 並顯示提示。 |
| dirty | 匯入文字在已發布結果後被編輯，立即撤銷該結果與下載，顯示「輸入已變更，請重新計算 / Input changed. Measure again.」。即時讀數由敲擊清單決定，不受匯入文字編輯影響。 |
| busy | 按下「計算」後該世代評估發布前，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯或新敲擊終止舊工作。 |
| success | 匯入評估發布且對應目前快照；解析所得陣列同時取代即時敲擊陣列。其後任一敲擊改走 tapping，任一匯入編輯改走 dirty。 |
| error | 匯入評估失敗，保留匯入文字，既有即時敲擊陣列不變，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態（讀數以發布為單位回報，不逐次原始事件朗讀），以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線測量。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數為只含 own 欄位 `taps` 的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `taps` 為整數毫秒時間戳的陣列（JSON number，來源不限定原點，可為 performance.now 類相對值或 epoch 毫秒）。長度上限 512。
- 驗證順序固定，整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為出錯元素的 1-based 序號或 null，等價 JSON Pointer 路徑為 `/taps/{row−1}`。成功僅為 `{ok:true,result}`。資源失敗用固定 INTERNAL，不回傳堆疊。
  1. SCHEMA：input 非普通物件、`taps` 缺失或非陣列、含額外欄位。
  2. INPUT_LIMIT：`taps.length > 512`（field=`"taps"`、row=null），在逐元素檢查之前判定。
  3. 逐元素由左至右單趟掃描，每個元素依序判定、第一個錯誤即停：非整數（非 number、NaN、±Infinity、小數）回 INTEGER_FORMAT；整數但 <0 或 >10^13 回 RANGE；前兩項通過後，若 i>0 且 `taps[i] <= taps[i−1]` 回 NON_MONOTONIC（遞減與相等同罪，間隔 0 無有限 BPM）。三者的 field 皆 `"taps"`、row 為該元素 1-based 序號。
- 空陣列與單一元素是合法輸入（對應 UI 空狀態與第一下），不回 EMPTY，估計值全為 null。EMPTY 只由匯入控制器在文字無任何代幣時於呼叫核心前回出（field=`"taps"`、row=null）。

驗證通過後依下列固定步驟計算，全程以整數／有理數精確運算，捨入只發生在輸出端、每值恰一次、皆 half-up（以 BigInt 整數式判定，不經浮點中間值）：

1. n=`taps.length`，間隔 `d[i]=taps[i+1]−taps[i]`（i=0…n−2），由嚴格遞增保證每間隔 ≥1。
2. 重置點為 `d[i] > 2000` 的間隔（恰好 2000 不重置）。`resetCount` 為全陣列重置點總數。作用中段落起點 s：無重置時 s=0；否則 s 為最後一個重置間隔的索引 +1，即重置後那次敲擊的索引——該時間戳保留，成為段落第一下。
3. 段落間隔為 `d[s…n−2]`，皆 ∈[1,2000]（大於 2000 者必為重置邊界，不在段落內）。窗口為段落間隔的最後至多 8 個，`windowIntervals` 以原時間順序輸出（非排序後）。
4. 中位數：窗口複本升序排序，奇數取中間值，偶數取中間兩值的平均（精確值，粒度 0.5），即 `medianIntervalMs`，不捨入。平均：窗口總和／個數的精確有理數；`meanIntervalMs` 為其小數一位 half-up 顯示值，但 `bpmMean` 一律由精確平均計算，不用顯示值回推。
5. 設某間隔統計量為有理數 p/q（中位數：奇數個時 (值,1)、偶數個時 (中間兩值和,2)；平均：(總和,個數)）。輸出以整數式固定：`bpmMedian`／`bpmMean` 小數一位，十分位整數 T=floor((1200000·q + p) / (2p))，值為 T/10；`beatsPerSecond` 由中位數算，小數二位，百分位整數 H=floor((200000·q + p) / (2p))，值為 H/100；`meanIntervalMs` 的十分位整數為 floor((20·總和 + 個數) / (2·個數))。
6. 結果欄位恰為 `{tapCount, segmentStartIndex, segmentTapCount, segmentIntervalCount, resetCount, intervalCount, windowIntervals, medianIntervalMs, meanIntervalMs, bpmMedian, bpmMean, beatsPerSecond}`。`intervalCount` 為窗口大小（顯示用「使用間隔數」），`segmentIntervalCount` 為窗口前的段落間隔總數。當且僅當 `intervalCount=0` 時，五個估計欄位（medianIntervalMs、meanIntervalMs、bpmMedian、bpmMean、beatsPerSecond）全為 null。機器值不隨 locale 改。

匯入文字文法（控制器先解析再呼叫核心）：去除頭尾分隔符後以 `/[\s,]+/u` 切分代幣；無代幣回 EMPTY。代幣數 >512 先回 INPUT_LIMIT（row=null）。逐代幣：raw 長度 >16 回 INPUT_LIMIT（row=代幣 1-based 序號）；不符合 `^(0|[1-9][0-9]*)$` 回 INTEGER_FORMAT；值 >10^13 回 RANGE。解析後陣列交核心，NON_MONOTONIC 等由核心回出（row 與代幣序號一致）。匯入成功以解析陣列取代即時陣列；匯入失敗不動即時陣列。

顯示格式由已捨入的整數位值組字串，不經浮點格式化：BPM 固定一位小數（如 `120.0`、`88.2`），每秒拍數固定二位（`2.00`、`1.67`），`medianIntervalMs` 整數時無小數、否則一位（`500`、`500.5`），`meanIntervalMs` 固定一位（`500.0`）。

固定下載 `tap-tempo-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

錯誤訊息固定雙語：SCHEMA「輸入格式不正確 / The input shape is invalid.」；EMPTY「沒有可計算的時間戳 / There are no timestamps to measure.」；INPUT_LIMIT「超過數量上限 / The item limit was exceeded.」；INTEGER_FORMAT「時間戳必須是整數毫秒 / Timestamps must be integer milliseconds.」；RANGE「時間戳超出允許範圍 / A timestamp is out of range.」；NON_MONOTONIC「時間戳必須嚴格遞增 / Timestamps must be strictly increasing.」；INTERNAL「處理失敗，請重試 / Something went wrong. Try again.」。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/tap-tempo/`。`public/js/core/*.mjs` 放純驗證、分段、窗口、統計與格式化。`public/js/app.js` 用安全 DOM API 綁敲擊面、匯入表單與狀態。`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。測試 import 同一份核心。

- 不使用 Worker：工作量為 O(n) 分段加至多 8 個元素的排序，極小。所有評估（含即時敲擊）以 `setTimeout(0)` 排程到下一個 macrotask 才執行核心，使取消與編輯可介入；controller 持有世代號，工作開始先使舊結果失效並遞增世代。只接受目前世代且對應狀態的完成；取消清除待執行計時器；編輯、復原、重設或 pagehide 皆終止待執行工作並丟棄晚到完成。不假造進度條，busy 只顯示「處理中」文字與「取消」。
- 即時時間戳來源固定為 `performance.now()`，以 `Math.round` 取整數毫秒。四捨五入後 ≤ 最後已存時間戳的敲擊不記錄（同毫秒重複事件），鍵盤 event.repeat 不記錄；控制器層擋下這兩類，核心的嚴格遞增契約不因此被真實輸入觸犯（匯入路徑仍可觸發 NON_MONOTONIC 並照契約回報）。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。本工具不錄音、不要求麥克風。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實敲擊與匯入執行測速，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、元素列號和四種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Blob dispose。 |
| usability | 兩語桌面與行動的敲擊、復原、匯入、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語敲擊、匯入、錯誤、reset、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。17 個字面核心案例與 4 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `steady-120` | 等距 500 ms，BPM 120.0 |
| `two-taps-basic` | 最少輸入：1 個間隔 600 ms |
| `even-median` | 偶數個間隔的中位數為中間兩值平均 |
| `jitter-median-vs-mean` | 單次敲偏，中位數與平均明顯分離 |
| `half-ms-median` | 中位數與平均同為 500.5 |
| `mean-rounding-tie` | 平均顯示值恰為平局，half-up 進位；bpmMean 由精確值算 |
| `post-gap-reset` | 間隔 >2000 重置，重置後敲擊為新段落第一下 |
| `gap-exactly-2000` | 間隔恰好 2000 不重置 |
| `window-last-eight` | 段落 11 個間隔只取最後 8 個 |
| `single-tap` | 單一敲擊合法且估計全 null |
| `no-taps` | 空陣列合法且估計全 null |
| `non-monotonic` | 遞減回 NON_MONOTONIC 且 row 指向出錯元素 |
| `equal-timestamps` | 相等時間戳同樣 NON_MONOTONIC |
| `fractional-element` | 小數元素回 INTEGER_FORMAT |
| `element-range` | 超過 10^13 回 RANGE |
| `schema-extra-field` | 未知欄位回 SCHEMA |
| `too-many-taps` | 513 個超過容量 512，INPUT_LIMIT 先於逐元素檢查 |
| `state-tapping-live` | 逐下敲入，每步讀數與該前綴陣列的核心結果一致；跨 2000 ms 開新段落，復原與重設即時失效。 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 排程完成前取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制觸發時機的假排程器。state-tapping-live 逐下加入 liveTaps 並在每下後觸發排程，依序檢查每個 checkpoint，最後復原一敲並重設。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在排程觸發前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、惡意字串、快速連敲及晚到訊息。驗證間隔 1999／2000／2001 的重置邊界、段落間隔恰好 8 與 9 的窗口邊界、敲擊數 512／513、時間戳 0 與 10^13 端點、同一元素 RANGE 先於 NON_MONOTONIC、多次重置只取最後段落（resetCount 仍計全部）、windowIntervals 保持時間順序而非排序後、BPM 捨入由整數式判定不經浮點。

候選 gate（均 NOT_RUN）

- 於 `tools/tap-tempo/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做實際敲擊（含鍵盤 Space）、匯入、錯誤、敲擊後編輯、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44（敲擊區遠大於此），40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線測量。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「點按節拍 BPM 偵測」，title「點按節拍 BPM 偵測｜Gloss Tools」，description「跟著音樂點按幾下，以最近間隔的中位數即時量出 BPM、每拍毫秒與平均 BPM；停太久自動重新起算，全部在本機計算。」。英文 lang=en，H1 “Tap Tempo — BPM Detector”，title “Tap Tempo — BPM Detector | Gloss Tools”，description “Tap along to the music to measure BPM from the median of your recent tap intervals, with milliseconds per beat and a mean reading alongside. Everything is computed locally.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼用中位數？偶爾敲偏一下不會拉走讀數，平均值同時顯示供對照。 / Why the median? One off tap does not drag the reading; the mean is shown alongside for comparison.
- FAQ。停太久會怎樣？間隔超過 2000 ms 就重新起算，那一次敲擊是新段落的第一下，先前間隔不列入計算。 / What happens after a long pause? A gap over 2000 ms starts a new segment: that tap is the first tap of the new segment and earlier intervals no longer count.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://tap-tempo.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格 task id `labs-tap-tempo-spec-20261109`（由主代理登記，作者未自行註冊）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/tap-tempo/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
