# 閱讀時間估算 / Reading Time Estimator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-reading-time-estimator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

Podcaster、部落客或電子報作者在錄音或發布前貼上一段中英混寫的稿子，要先回答兩個問題：讀者靜讀這篇要多久、自己朗讀錄出來要多久。常見線上計數器只會切英文空格，中文整段被當成一個詞，給出的時間不可用；另一種工具則直接做逐詞頻率分析，遠超過「只要一個時間估算」的需要。

- 桌面。桌機貼上整篇稿子，必要時把四個速度改成自己的閱讀／朗讀速度，取得字數、詞數與兩種時間。
- 行動。手機在通勤時貼上一小段講稿，先確認朗讀長度是否塞得進預定的影片或音檔段落。

成功結果是： counts（漢字數、英文詞數）與靜讀、朗讀兩種時間估算，計數規則與所用速度都顯示在結果旁，任何人可依本文規則手算重現。使用情境為估算用途。資料只保留在目前頁面草稿。

## scope

MVP 必做：貼上本文計數（漢字逐字、英文空白分詞，規則見 inputsOutputs）、四個可調速度欄位、靜讀與朗讀秒數與格式化顯示、固定報告下載。資料界線：本文上限 100,000 個 UTF-16 單位；計數以 Unicode code point 為準，上限以 UTF-16 單位為準，兩者刻意不同並在此明示。性能界線：上限內的本文計數為單次線性掃描，無網路、無外部服務依賴。

非目標（明示邊界）：

- 逐詞／逐字頻率、排名、百分比與篩選是 [word-frequency](../word-frequency/SPEC.md) 的交付物；本工具只輸出總計數作為時間換算的基礎，不列任何單項頻率。兩者的分詞規則也刻意不同：該工具以 Unicode 字母連續段與內部撇號切詞並做大小寫摺疊，本工具只以空白分詞、token 含 ASCII 字母或數字即算 1 詞——估算用途要的是可手算重現的簡單規則，不是語言分析。
- 實際語音合成與播放是 [text-to-speech-reader](../text-to-speech-reader/SPEC.md) 的交付物；本工具只估算朗讀秒數，不發出任何聲音。
- 中文分詞（把字串切成詞）不在範圍：中文一律逐字計，這正是本工具與分詞型工具的差異，頁面 FAQ 明示。
- 可讀性／難度評分、檔案上傳、把本文送出或保存、逐字稿時間軸對齊，皆非目標。

計數限制（釘版並在 FAQ 揭露）。日文漢字落在本規格列出的四個碼點區段時逐字計入。假名、韓文音節、漢字標點（U+3000–U+303F）與全形字元（U+FF00–U+FF60）均不計為漢字。純假名或純韓文音節的字數與詞數均為 0。英文詞依 token 是否含 ASCII 字母或數字判定。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「本文 / Text」
- 欄位或說明「速度設定（字／詞每分鐘）：中文靜讀、中文朗讀、英文靜讀、英文朗讀 / Speeds (per minute): Chinese silent, Chinese speaking, English silent, English speaking」
- 「估算閱讀時間 / Estimate reading time」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「字數與時間估算 / Counts and time estimates」先摘要（漢字數、英文詞數、靜讀時間、朗讀時間）再列所用速度與計數規則摘要。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。兩項計數均為 0 時，顯示雙語說明。例：「這段文字沒有落在計數區段的漢字，也沒有包含 ASCII 字母或數字的詞。只有假名、空白或符號的文字也可能得到這個結果。」 / “This text contains no ideographs in the counted ranges and no word tokens with ASCII letters or digits. Text made up of kana, whitespace or symbols can give this result.” |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"text":"","zhSilentRate":"400","zhSpeakRate":"240","enSilentRate":"200","enSpeakRate":"150"}` 並聚焦本文欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。本文欄是明示的文字欄，內容以字串原樣處理，不做任何正規化（無 NFC／NFKC、無大小寫摺疊、無全半形轉換）。

欄位順序固定為 `text`、`zhSilentRate`、`zhSpeakRate`、`enSilentRate`、`enSpeakRate`，驗證依此順序逐欄進行，每欄內依「容量 → surrogate → 空 → 文法 → 範圍」進行。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. `text`：raw 以 UTF-16 code units 計最多 100,000 單位，超過 INPUT_LIMIT；含不成對 surrogate 為 UNICODE；長度 0（空字串）為 EMPTY。只有空白的本文合法（計數全為 0），不是 EMPTY。
2. 四個速度欄：raw 每欄最多 8 單位，超過 INPUT_LIMIT；不成對 surrogate 為 UNICODE；空字串為 EMPTY；文法為 ASCII 十進整數字串——`0` 或非零開頭、無空白／正負號／小數／指數——不符為 INTEGER_FORMAT；範圍不符為 RANGE。各欄範圍與預設：`zhSilentRate` 50–2000（預設 400，字/分）、`zhSpeakRate` 50–1200（預設 240，字/分）、`enSilentRate` 50–1000（預設 200，詞/分）、`enSpeakRate` 50–600（預設 150，詞/分）。四個預設值是可調的產品估算起點。頁面與結果旁均標示可依自己的閱讀或朗讀速度調整。
3. 計數（以 Unicode code point 逐一掃描本文，與上限的 UTF-16 單位刻意不同）：
   - 漢字數 `cjkChars`：code point 落在 U+3400–U+4DBF、U+4E00–U+9FFF、U+F900–U+FAFF、U+20000–U+2A6DF 四個區段之一者計 1。星形平面字元（如 U+20000）計 1 個字（佔 2 個 UTF-16 單位）。假名、韓文音節、漢字標點（U+3000–U+303F）、全形字元（U+FF00–U+FF60）、組合記號皆不計；組合序列依書寫原樣逐 code point 計（例：`e` + U+0301 是 2 個 code point，其中無一是漢字）。
   - 英文詞數 `latinWords`：先以空白集合 W 切分 token，W = {U+0009–U+000D、U+0020、U+0085、U+00A0、U+1680、U+2000–U+200A、U+2028、U+2029、U+202F、U+205F、U+3000}（Unicode White_Space 屬性全集）；token 為非空白 code point 的極大連續段。token 內含至少一個 ASCII 字母或數字（U+0030–U+0039、U+0041–U+005A、U+0061–U+007A）者計 1 詞，其餘計 0。釘版例：`don't` = 1、`2026-11-09` = 1、`well-known` = 1（連字號不切分，與 word-frequency 的規則差異是刻意的）、`—` = 0、全形 `ＡＢＣ` = 0、只含重音字母的 token（如 `é`）= 0。同一 token 可同時貢獻漢字數與 1 個詞數（中英夾雜 token，如 `中文abc`：漢字 2、詞 1）——兩種計數獨立，最後相加。
4. 時間換算（精確有理數，只捨入一次）：`silentExact = 60 × cjkChars / zhSilentRate + 60 × latinWords / enSilentRate`，`speakExact` 同理以朗讀速度計。以 BigInt 分子／分母保存精確值，禁止先以浮點或先逐項捨入；各總秒數 `silentSeconds = floor(silentExact + 1/2)`、`speakSeconds = floor(speakExact + 1/2)`（half-up，非負值），只對總和捨入一次——逐項先捨入再相加的結果不同，屬缺陷（fixtures `mixed-sum-rounding` 釘版此區別）。
5. 顯示（只由已捨入的整數秒格式化，畫面與報告必然一致）：總秒數 < 3600 時為 `M:SS`（分無前導零、秒兩位）；≥ 3600 時為 `H:MM:SS`（時無前導零且無上限、分與秒各兩位）。0 秒顯示 `0:00`。
6. 結果 `{cjkChars, latinWords, silentSeconds, speakSeconds, silentDisplay, speakDisplay}`。計數與秒數為非負整數，顯示為上述固定格式字串。機器值不隨 locale 改。

固定下載 `reading-time-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物（本工具結果恆遠小於上限，此條為契約完整性釘版）。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/reading-time-estimator/`。src/core.mjs 放純驗證、計數、換算、格式化（計數為 code point 迭代，時間為 BigInt 有理數）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「估算閱讀時間」，畫面和完整報告符合核心 fixtures（含中英混合只捨入一次、H:MM:SS 切換），使用者取得對應產物。 |
| boundaries | 合法端點（本文恰 100,000 單位、四速度上下限）、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log（本文絕不外流）。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；計數為 0 時的說明可理解。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。21 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `zh-basic` | 純中文 6 字；靜讀 0.9 秒→1、朗讀 1.5 秒→2 |
| `en-basic` | 純英文 9 詞的兩種時間 |
| `mixed-sum-rounding` | 中英混合；總秒數只捨入一次（逐項捨入會錯得 2 秒） |
| `cjk-punctuation` | 中文標點不計字；無 ASCII 的 token 不算詞 |
| `apostrophe-date-tokens` | `don't` 與 `2026-11-09` 各算 1 詞（只以空白分詞） |
| `symbol-tokens-not-words` | 純符號 token 詞數 0 |
| `whitespace-only` | 只有空白（含 U+3000）合法且計數 0 |
| `fullwidth-not-normalised` | 全形字元不正規化、不計數；「中」計 1 字 |
| `astral-cjk` | U+20000 計 1 字；emoji 不計；0.5 秒 half-up |
| `half-up-ties` | 1.5 與 2.5 秒皆 half-up（區別銀行家捨入） |
| `custom-rates` | 自訂中文速度 450／90 的換算 |
| `hours-format` | 恰 3600 秒切換 `H:MM:SS`；朗讀 750 秒為 `12:30` |
| `kana-hangul-not-cjk` | 假名、韓文不計；英文詞照計 |
| `empty-text` | 空本文 EMPTY |
| `rate-decimal` | 速度含小數點 INTEGER_FORMAT |
| `rate-range` | 速度 2001 超上限 RANGE |
| `input-limit` | 本文 100,001 單位 INPUT_LIMIT |
| `japanese-kanji-kana` | 漢字かな含 2 個計入的漢字，朗讀 0.5 秒捨入為 1 秒 |
| `japanese-kana-only` | 純假名合法，漢字及英文詞均為 0 |
| `400-cjk-one-minute` | 400 字按 400 字/分靜讀為 1 分鐘，按 240 字/分朗讀為 1 分 40 秒 |
| `astral-linear-b-excluded` | 將 `astral-cjk` 的 U+20000 換成 U+10000，剩 1 個計入的漢字，靜讀及朗讀均捨入為 0 秒 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（本文恰 100,000 單位成功、四速度恰下限 50 與各自上限成功）、剛好超限（速度 49 與上限 +1、速度欄 9 單位 INPUT_LIMIT）、錯型別、額外欄、缺欄、單獨 surrogate（本文與速度欄皆 UNICODE）、惡意字串、快速改值及晚到訊息。驗證顯示邊界 3599 秒為 `59:59`、3600 秒為 `1:00:00`，混合 token（如 `中文abc`）同時貢獻字數與詞數，NBSP 與 U+2028/U+2029 皆為分詞空白。本文計數全為 0 時結果合法且秒數 0。

候選 gate（均 NOT_RUN）

- 於 `tools/reading-time-estimator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「閱讀時間估算」，title「閱讀時間估算｜Gloss Tools」，description「貼上中文、英文或混寫的稿子，依釘版計數規則與可調速度，估算靜讀與朗讀各需要多久。」。英文 lang=en，H1 “Reading Time Estimator”，title “Reading Time Estimator | Gloss Tools”，description “Paste Chinese, English or mixed text and estimate silent reading and read-aloud time from pinned counting rules and adjustable speeds.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。如何估算閱讀時間？靜讀與朗讀分別計算。把漢字數除以對應字速，英文詞數除以對應詞速，把兩項分鐘相加再換算成秒，最後捨入到最接近的整秒，剛好半秒時進位。400 字以每分鐘 400 字靜讀，估算為 1 分鐘。要查逐詞頻率，請用字詞頻率工具。 / How are reading times estimated? For silent reading and reading aloud, divide the ideograph count by its characters-per-minute rate and the English word count by its words-per-minute rate. Add the two times, convert the total to seconds and round to the nearest whole second, with half seconds rounded up. At 400 characters per minute, 400 characters take one minute. Use the frequency counter for per-word frequencies.
- FAQ。朗讀時間可以保證錄音長度嗎？這是按所選速度算出的估計。停頓與語氣會影響實際錄音長度。 / Can the speaking time guarantee my recording length? The estimate uses your selected speeds. Pauses and delivery affect the actual recording length.
- FAQ。英文的連字號詞怎麼算？只以空白分詞，well-known 算 1 詞；全形字母數字不算英文詞。 / How are hyphenated English words counted? Tokens are split on whitespace only, so well-known counts as 1 word; full-width letters and digits do not count as English words.
- FAQ。如何使用預設速度？四個預設是估算起點。中文靜讀與朗讀預設分別為每分鐘 400 字和 240 字，英文分別為每分鐘 200 詞和 150 詞。可依自己的速度調整。 / How do I use the default speeds? The four defaults give you a starting point. Silent and read-aloud rates default to 400 and 240 Chinese characters per minute and 200 and 150 English words per minute. Adjust them to your own pace.
- FAQ。如何計算含假名、韓文音節或日文漢字的文字？落在本工具四個漢字碼點區段的字都會逐字計入，包括符合區段的日文漢字。假名與韓文音節本身對兩項計數的貢獻都是 0。例如「漢字かな」計 2 個漢字，純假名或純韓文音節的字數與詞數均為 0。 / How does the tool count kana, Hangul syllables and Japanese kanji? It counts each ideograph whose code point is in one of the four specified ranges, including Japanese kanji within those ranges. Kana and Hangul syllables contribute zero to both counts. For example, 漢字かな contains two counted ideographs. Text made up solely of kana or Hangul syllables returns zero for both counts.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://reading-time-estimator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/reading-time-estimator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
