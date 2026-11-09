# 驗收契約

## 證據類別

核心案例是用產生式假字幕文字測試純函式的確定性 Node 測試，只證明 parser、算術、schema 與序列化行為。

App／瀏覽器案例需要實際頁面與瀏覽器。因目前使用者焦點事件，所有瀏覽器、原生 UI、真機、螢幕閱讀器、IME、檔案下載、pagehide 與 BFCache 執行都暫記 NOT_RUN_USER_FOCUS_INCIDENT。不得用 CLI 斷言取代，也不得標 PASS。

發布檢查只適用於主代理 GO 後的正式候選版。本機候選版檢查不代表已部署網站，也不代表可完整離線。

## 確定性 fixture 記法

除非案例另有說明，request 使用恰含下列三個欄位的一般物件：

    { srtRaw: source, direction: "later", secondsRaw: "1.25" }

下列輸入以 LF 為換行。預期輸出每行以 LF 結尾，cue block 間有一個空白行，且沒有 BOM。錯誤行號以換行正規化後計算。cueIndex 是輸入順序的一基底 cue ordinal，不是 SRT 索引值。

若案例列出錯誤碼，精確 envelope 預期為：

    { ok: false, error: { code: CODE, field: FIELD, line: LINE_OR_NULL, cueIndex: ORDINAL_OR_NULL } }

Schema 案例須確認沒有額外欄位，且錯誤不含字幕全文。

## 必要核心 oracle

### C01 — 一般延後與精確輸出

輸入 SRT：

    1
    00:00:01,000 --> 00:00:02,500
    Hello

設定 direction later、secondsRaw 1.25。

預期成功：cueCount 1、shiftMilliseconds 1250、inputUtf8Bytes 38、outputUtf8Bytes 38、cue ordinal 1、indexRaw "1"、originalStartMs 1000、originalEndMs 2500、shiftedStartMs 2250、shiftedEndMs 3750。srtText 必須精確為：

    1
    00:00:02,250 --> 00:00:03,750
    Hello

唯一 cue 的 first/last input/output edge summary 皆須相符。

### C02 — 提前且保留空格與 HTML 字面內容

輸入：

    02
    00:00:03,000 --> 00:00:04,000
      <i>hello</i>  

設定 earlier、"1.5"。預期 indexRaw "02"；平移時間為 1,500 與 2,500 ms；文字行保留 <i>hello</i> 前後各兩個空格；輸出結尾恰有一個 LF。

### C03 — 零偏移

使用 C01 輸入，direction earlier、"0"。預期成功、shiftMilliseconds 0、時間碼不變，仍按 canonical 規則序列化。

### C04 — CRLF 與單獨 CR 正規化

以 CRLF 分隔 C01 前兩行，再以單獨 CR 分隔時間行與文字行。預期與 C01 相同 canonical 輸出、只有 LF，outputUtf8Bytes 為 38。

### C05 — 只允許一個開頭 BOM

在 C01 原始輸入前加一個 U+FEFF。預期成功、inputUtf8Bytes 41（包含 BOM），輸出等於 C01 且沒有 BOM。

### C06 — 第二個 BOM 保留並使索引失敗

在 C01 前加兩個 U+FEFF。第一個移除，第二個仍在索引行前。預期 INDEX_FORMAT，field srtRaw、line 1、cueIndex 1。

### C07 — 分隔行與文字兩端空格

在 C01 前後加入只有空格/tab 的行，內部加一個含 tab 和兩個空格的分隔行。預期仍只有一列，輸出與 C01 canonical 字串完全相同。

### C08 — 索引零超出範圍

索引用 "000000"，時間與文字有效。預期 INDEX_RANGE，line 1、cueIndex 1。

### C09 — 保留前置零與跳號

兩個有效 cue 索引為 "0007" 與 "0010"。預期成功，維持輸入順序並原樣輸出索引，不改成 1 和 2。

### C10 — 數值重複即拒絕

兩個分隔後的有效 cue 索引分別為 "0007" 與 "7"。預期第二個索引行回 INDEX_NOT_INCREASING，cueIndex 2。

### C11 — 最小有效檔案

一列：索引 1，時間 00:00:00,000 至 00:00:00,001，文字 x，平移 0。預期成功、一列、一行文字，且輸出 canonical。

### C12 — 沒有 cue

輸入為空，或只有 ASCII 空格/tab 與換行。預期 NO_CUES，field srtRaw、line null、cueIndex null。

### C13 — 2,000 列上限有效

產生索引 1..2000、每列一行 x 的 fixture。時間從 00:00:00,000 開始，使用連續、不重疊的一毫秒區間。預期成功、cueCount 2000、cues.length 2000；srtText 含完整 2,000 列與最後 LF。以完整生成輸出比對，不只檢查前綴。

### C14 — 第 2,001 列拒絕

在 C13 後新增索引 2001 的有效 cue 與分隔行。預期第 2,001 列索引行回 CUE_COUNT_HIGH、cueIndex 2001；不得回傳 result 或部分 cues。

### C15 — 十行文字有效

一個有效 cue 含 T1 至 T10 十行文字。預期成功並精確保留十行。

### C16 — 第十一行文字拒絕

在 C15 加上 T11。預期該行回 CUE_TEXT_LINES_HIGH、cueIndex 1。

### C17 — 恰好 1,000 code points 有效

一列文字剛好由 1,000 個 ASCII x 組成。預期成功且原樣保留。

### C18 — 1,001 code points 拒絕

改為 1,001 個 ASCII x。預期該文字行回 CUE_TEXT_LINE_TOO_LONG、cueIndex 1。

### C19 — 按 code point 而非 UTF-16 unit 計算

文字行含 999 個 ASCII x 與一個 supplementary-plane emoji。預期為 1,000 code points 並成功。改為 1,000 個 x 再加同一 emoji，總數 1,001，預期 CUE_TEXT_LINE_TOO_LONG。

### C20 — 索引語法錯誤

索引行使用 "1a" 或全形數字。預期 line 1 回 INDEX_FORMAT、cueIndex 1。

### C21 — 箭頭 tab 空格會 canonicalize

時間行在 --> 前放兩個 tab，後放一個 tab。預期成功；輸出箭頭左右都恰為一個 ASCII 空格。

### C22 — 時間元件範圍

分別測試小時 "100"、分鐘 "60"、秒 "60"。三位小時不合語法，回 TIMING_FORMAT；兩位分鐘／秒 60 回 TIMESTAMP_RANGE。精確核對錯誤行與 cue ordinal。

### C23 — 嚴格時間格式

測試毫秒用句點、缺少毫秒、一位小時、時間行尾設定、整行周圍空格。每個都在時間行回 TIMING_FORMAT、cueIndex 1。

### C24 — 起點必須早於終點

測試相同端點及反向端點。兩者都在時間行回 CUE_START_NOT_BEFORE_END、cueIndex 1。

### C25 — 缺少時間行或文字行

索引後直接 EOF：下一預期行回 TIMING_LINE_MISSING、cueIndex 1。有效時間後接分隔行或 EOF：分隔行或下一個 EOF 預期行回 CUE_TEXT_MISSING、cueIndex 1。

### C26 — cue 中間缺少空白分隔

第一列文字後直接附上第二列數字索引與有效時間形狀行，兩列間沒有只含 ASCII 空格/tab 的分隔行。預期第二個索引行回 MISSING_CUE_SEPARATOR、cueIndex 2。

### C27 — 重疊與非時間排序的列仍保留順序

cue 1 從 00:00:05,000 開始，cue 2 從 00:00:01,000 開始，且時間區間重疊。預期成功；cues 與輸出仍依原順序，沒有排序，並對每列套用同一平移。

### C28 — 下界剛好相等可接受

cue 起始 00:00:01,000、結束 00:00:02,000，earlier 1.000 秒。預期 shifted start 為 0、end 為 1000，輸出 start 00:00:00,000。

### C29 — 下界超過 1 ms 即整份拒絕

使用 C28 並 earlier 1.001 秒。預期 SHIFT_OUT_OF_BOUNDS、field srtRaw、line 2、cueIndex 1，沒有 result。

### C30 — 上界剛好相等可接受

cue 結束於 99:59:58,999，later 1.000 秒。預期成功且結束為 99:59:59,999。

### C31 — 上界超過 1 ms 即整份拒絕

使用 C30 並 later 1.001 秒。預期 line 2、cueIndex 1 回 SHIFT_OUT_OF_BOUNDS，沒有 result。

### C32 — 後續列超界時不回傳部分結果

建立兩個語法有效 cue。第一列仍在範圍內，第二列平移後超過上界 1 ms。預期 cueIndex 2 回 SHIFT_OUT_OF_BOUNDS，不得有成功 result 或部分 cue 陣列。

### C33 — 十進位轉換使用整數毫秒

earlier 0.001 秒恰好提前 1 ms。0002.01 精確等於 2,010 ms。不得使用浮點四捨五入。

### C34 — 秒數端點與語法

接受 "0"、"0000.1"、"3600"、"3600.000"。拒絕 ".5"、"1."、"-1"、"+1"、"1,000"、全形 "１"，回 SECONDS_FORMAT。"3600.001" 回 SECONDS_RANGE。核對 field secondsRaw 且 line/cueIndex 為 null。

### C35 — raw code-unit 上限先於 bytes 編碼

提供 1,048,577 UTF-16 code units。預期 RAW_CODE_UNITS_HIGH，不呼叫 TextEncoder，field srtRaw、line/cueIndex null。

### C36 — UTF-8 byte 上限含端點且獨立計算

建立確定性的 N 列 fixture。N 從 1 到 2,000 逐一搜尋；固定輸出 overhead 計算為索引字串 UTF-8 長度總和 + 33N - 1 bytes。每列只用一行 ASCII 文字、連續的一毫秒有效時間、行間 LF、區塊間兩個 LF、最後一個 LF。挑選剩餘文字 bytes R = targetBytes - overhead 落在 N..1000N 的最小 N。填入每列一個 x，再從 cue 順序分配 R-N 個補充 x，每列最多再加 999 個；確認餘數為零且 fixture 精確編碼至 targetBytes。targetBytes 設 1,048,576 時，raw-size gate 應接受且其他限制也通過。將其中一個 x 換成 é，UTF-16 長度仍在限制內，UTF-8 增為 1,048,577，預期尚未解析即回 UTF8_BYTES_HIGH。

### C37 — NUL 與未配對 surrogate 在編碼前拒絕

在有效輸入加入 U+0000，預期 NUL_NOT_ALLOWED。另分別加入孤立 high 或 low surrogate，預期 UNPAIRED_SURROGATE。測試計數確認 TextEncoder 未執行。

### C38 — 精確 root schema 且不執行 getter

恰含三個 own enumerable data properties 的一般物件應成功。分別測試 extra、missing、symbol、non-enumerable 與 accessor 屬性，核對對應 schema 錯誤；getter spy 次數仍為零。錯誤 prototype 回 ROOT_NOT_PLAIN_OBJECT。上述 root schema 錯誤的 field 為 input、line/cueIndex 為 null。另測 srtRaw 非字串回 SRT_RAW_TYPE/field srtRaw，direction 非 earlier/later 或非字串回 DIRECTION_INVALID/field direction，secondsRaw 非字串回 SECONDS_TYPE/field secondsRaw；這些 scalar 錯誤的 line/cueIndex 為 null。錯誤不含原文。

### C39 — 成功資料可精確序列化

對成功結果執行 JSON.stringify/parse，再核對每個欄位、全部 cues、edge summaries、UTF-8 bytes 與完整 srtText。確認只有普通可序列化值且沒有隱藏可變狀態。

### C40 — 錯誤不回顯字幕內容

在無效輸入中放入唯一 marker。預期錯誤恰含 code/field/line/cueIndex，JSON 結果不得包含 marker。

## App 與瀏覽器驗收

下列案例目前全部是 NOT_RUN_USER_FOCUS_INCIDENT。執行前須先有真正隔離、不能使用使用者桌面焦點、鍵盤、IME、剪貼簿或既有 tab 的瀏覽器能力。靜態檢查或 Node 測試不得冒充通過。

- B01 初始狀態：兩種語言頁都顯示空輸入、earlier 已選、later 可選、秒數 "0"、無結果、下載停用、正確 document language，且輸入不會以 GET 表單送出文字。
- B02 貼上 C01 並提交：顯示完整精確輸出與摘要；沒有部分卡片；提示語言正確。
- B03 成功後改任何輸入：舊結果同步消失，下一次提交前下載已停用。
- B04 提交後、Worker 回覆前編輯，再送達舊回覆：舊 success/failure/error/finally 都不能改目前狀態、結果或 busy。
- B05 取消工作：Worker terminate；晚到訊息被忽略；草稿保留。
- B06 Worker 不支援、建立失敗、回覆格式錯誤或 crash：出現安全在地化錯誤；不 fallback 主執行緒、不送網路，草稿保留。
- B07 提交 2,000 列 fixture：只顯示一個完整唯讀 textarea；控制項可操作；沒有大量 cue DOM 卡片；全文完整。
- B08 輸出 textarea 不可編輯且仍可選取文字。
- B09 點下載：檔名為 subtitles-shifted.srt；Blob MIME 正確。只有在 browser tool 可不開系統視窗地檢查下載 bytes 時，才核對無 BOM 且等於 result.srtText UTF-8；否則該子項列 NOT_RUN，不推斷已儲存。
- B10 建立八個 live URLs：各自有 30 秒期限；第九次拒絕且不撤銷前八個。
- B11 多個 URL 中一個到期：只撤銷該 URL；其他仍存活至各自期限。
- B12 下載後編輯：結果清空，但先前 URL 記錄保留到個別期限。
- B13 有內容時清除並取消：草稿／結果／狀態與 live URLs 完整保留。確認後清除草稿／結果並撤銷全部 URLs。
- B14 有內容時切語言，先取消再確認：取消留在原頁；確認到達正確的獨立路由且草稿空白，語言正確，網址不含文字。
- B15 工作／下載期間 pagehide：Worker terminate、狀態清空、URLs 全部撤銷。persisted pageshow 顯示空白初始狀態。
- B16 純鍵盤操作：依邏輯順序操作所有欄位、提交、確認、取消、下載、清除與語言連結，並有可見焦點。
- B17 320 CSS px 與 200% 縮放：控制項與完整輸出可用，頁面沒有橫向捲動。
- B18 compositionstart 及 isComposing=true 的 input 當下就使舊結果／工作失效並停用下載；組字期間不改 textarea value、不正規化、不驗證、不搶焦點；compositionend 後才允許提交新工作。確認 IME 選取與完成輸入正常。
- B19 螢幕閱讀器宣告工作中、成功及驗證錯誤；所有欄位和輸出有清楚標籤。
- B20 停用 JavaScript 並在輸入欄打字：不會以 form GET 導航或暴露文字；頁面保持無資料傳輸的靜態外殼。
- B21 從初載到頁面 hidden/pagehide 檢查完整 Network 與 Storage：沒有第三方、analytics、telemetry、CDN asset、beacon、/cdn-cgi/rum、cookie、local/session/IndexedDB 或含內容的網址流量；只有必要的同源靜態檔。
- B22 實測離線與重新載入結果，僅記錄實際觀察。本產品不保證完整離線；暖快取不能證明離線支援。
- B23 僅在不觸發 OS 視窗的瀏覽器檔案檢查方式存在時驗證下載。原生儲存視窗、真機下載及檔案管理員檢查列 NOT_RUN；不得操作原生視窗。
- B24 靜態與隔離瀏覽器檢查確認程式沒有呼叫原生 clipboard API、列印 API，也沒有 file input。瀏覽器設定仍可能顯示下載儲存提示；若出現，不互動並將原生視窗檢查列 NOT_RUN，不宣稱不會出現視窗。
- B25 確認空白清除、焦點還原、Escape 取消、減少動態效果與沒有意外表單提交。
- B26 以受控測試時鐘或隔離 app harness 的 fake timer 檢查 30 秒期限，不等待桌面實際逾時；確保舊 timer 不會撤銷新配置的 URL。
- B27 在低階支援手機／瀏覽器處理 2,000 列 fixture，確認主執行緒不凍結且不建立數千 DOM node。記錄實際裝置／瀏覽器及結果；無法測試時列 NOT_RUN。
- B28 以受控 fake timer 檢查 Worker 正好在送出後 10,000 毫秒 timeout：草稿保留、Worker terminate、沒有部分結果；注入逾時前後的舊 success/error/finally 都不得改動新狀態。

## M1 命令證據

只有在對應 scripts 與 package commands 建立後，才可從本工具資料夾執行：

    npm test
    npm run check
    npm run build
    npm run dev

HTTP smoke check 可讀取 127.0.0.1:4216 的本機預覽。建置和檢查只用產生式假內容並保持離線。焦點事件期間不得執行瀏覽器 UI 檢查。只有所有可執行 M1 gate 通過，才能稱為 M1 CLI candidate；UI 驗收仍是 NOT_RUN，不能稱 M1 milestone 已完成。

## 正式候選版檢查

主代理 M2 GO 後，才檢查分離建置的 dist-production/ 及 127.0.0.1:5216。斷言兩語頁面、精確 canonical/hreflang/x-default、robots 與 sitemap、預覽及 404 noindex、production headers/CSP、封閉輸出白名單及零 runtime dependency。HTTP/static 檢查與外部瀏覽器／使用者檢查分開記錄。不可稱本機 production candidate 已部署。
