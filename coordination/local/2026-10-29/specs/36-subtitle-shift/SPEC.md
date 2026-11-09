# 字幕時間平移 — 既有規格保存

Task ID: `labs-36-subtitle-shift` · Spec ID: `spec-36-subtitle-shift`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求

## 問題與承諾

字幕編輯者有時收到一份內容可用、但所有字幕列都一致偏早或偏晚的 SRT。逐列重算很慢，也容易漏改。此工具接受貼上的 SRT 文字，以同一個精確偏移量移動每一列，並回傳完整可下載的 SRT。

承諾只有等量平移。工具不推測正確秒數、不讀取音訊或影片、不轉錄、不使用 AI、不改播放速度、不修正逐漸累積的漂移、不轉 VTT，也不編輯本機來源檔。任何字幕列失敗都拒絕整份檔案；不截短時間、不刪列、不自動夾限。

## 使用流程

1. 開啟繁體中文頁面 /index.html 或英文頁面 /en/index.html。
2. 將 SRT 文字貼入已標示的輸入框。M1 不提供檔案選擇器；使用者可以在本站以外用文字編輯器開啟檔案並貼上文字。
3. 選擇提前或延後，輸入 0 到 3,600 秒、最多三位小數的非負十進位數字。初始 direction 選為 earlier，秒數初始字串為 "0"。
4. 按「平移字幕」。專用 Worker 會解析並平移完整輸入。處理期間只顯示工作狀態，不顯示部分輸出。
5. 成功後檢查唯讀全文與摘要，再自行選擇是否下載。下載檔名為 subtitles-shifted.srt，內容為 UTF-8。沒有複製按鈕。
6. 任一草稿設定改變時，立即清除畫面結果並停用下載。先前下載產生的 object URL 仍各自存活至 30 秒期限；使用者清除或離開頁面時也會全部撤銷。
7. 若頁面有內容或結果，清除前顯示頁內確認。取消時保留原草稿與結果；確認後清空草稿、結果與錯誤，並撤銷所有存活的下載網址。
8. 若頁面有草稿或結果，切換語言前顯示頁內確認。取消會留在目前頁面；確認後前往另一個獨立語言頁，並以空白初始狀態開始。切換語言不保證保留文字。
9. 離開頁面時清空記憶體狀態。若透過已保存的 back-forward cache 返回，頁面須恢復空白初始狀態。

## SRT 子集合與內容保留

輸入是有 UTF-8 byte 上限的 JavaScript 字串。只在第一個 code unit 是 U+FEFF 時移除一個 BOM。CRLF 與單獨 CR 都先正規化為 LF。正規化後的實體行號從 1 開始，包含空白分隔行；移除開頭 BOM 不改行號。

分隔行是只含 ASCII 空格或 tab 的行，也包含空字串。忽略第一列之前與最後一列之後的分隔行；多個連續分隔行等同一個。其他行都是內容。字幕文字行開頭與結尾的空格保留。像 <i>word</i> 這類看似 HTML 的字串是純字幕文字，不得解讀成頁面 markup。拒絕 NUL 與未配對 UTF-16 surrogate；其他 code point，包括非 NUL 控制字元與非 ASCII 空白，都原樣保留。

每個字幕區塊依序包含索引行、時間行、一行以上字幕文字行。

- 索引語法為一到六個 ASCII 數字。數值必須是 1 至 999999，且嚴格大於前一列的數值。允許跳號及前置零。輸出保留原索引字串，不重編號。
- 時間語法為 HH:MM:SS,mmm，接一個以上 ASCII 空格或 tab、字面箭頭 -->、一個以上 ASCII 空格或 tab，再接另一個 HH:MM:SS,mmm。小時恰為兩位且為 00 至 99；分、秒恰為兩位且為 00 至 59；毫秒恰為三位。不接受其他設定或整行周圍空格。起始時間必須小於結束時間。
- 每列有 1 至 10 行文字；每行最多 1,000 個 Unicode code point。只含 ASCII 空格或 tab 的行是分隔符，不是字幕文字；因此這種行不能作為 cue 文字。
- 區塊間必須有空白分隔行。為了在不猜測任意字幕文字的情況下抓出常見漏分隔錯誤，本工具保留下列限制：位於字幕內容中的數字索引候選行，若緊接著符合時間行外形的下一行，整組會被視為疑似新 cue；若前面沒有分隔行，就以 MISSING_CUE_SEPARATOR 拒絕。因此這種「數字行後接時間行」的組合不支援作為字幕文字內容。其他純數字文字行若後面不是時間行，仍是一般文字。
- 檔案有 1 至 2,000 列。即使 cue 時間重疊或不按時間先後排列，也照輸入順序保留。

解析器是明確記載的產品子集合，不是所有 SRT 方言的通用驗證器。子集合以外的行序會被拒絕，不以猜測方式修正。

## 平移設定與時間邊界

設定只包含：

- direction：earlier 或 later。
- secondsRaw：符合一到四個 ASCII 整數位，可選小數點及一到三個小數位的字串。預設為 0。接受前置零。精確範圍為 0 至 3600 秒，含端點。接受例：0、1.25、0002.001、3600.000。拒絕例：.5、1.、-1、+1、1,000、全形數字、3600.001。

轉換時以整數毫秒計算小數部分，右側補零至三位。不用浮點四捨五入。earlier 從每一列兩端減去同一毫秒數；later 則相加。

合法時間範圍是 00:00:00,000 至 99:59:59,999，含端點。完整通過語法與結構檢查後，才依輸入順序逐列檢查平移邊界；每列先檢查 start 再檢查 end。第一個超界端點以 SHIFT_OUT_OF_BOUNDS 拒絕，錯誤指出該 cue 序號。不得回傳部分字幕列或部分輸出。

## 輸入與結果限制

- 原始 SRT 輸入先限制在 1,048,576 個 UTF-16 code unit 以內。超出時先以低成本長度檢查拒絕，不先編碼 UTF-8。
- 在呼叫 TextEncoder 前拒絕 NUL 或不完整 surrogate pair，避免 TextEncoder 靜默替換錯誤字元。
- 原始字串的 UTF-8 byte 數不可超過 1,048,576；可能存在的 BOM 與原始換行也計入。
- 所有限制同時生效：raw 大小、cue 數、每列文字行數、每行 code point 數。
- 正規化輸出最多比通過限制的原始 UTF-8 多一個 byte：正規化只會移除 bytes，唯一可能增加的是必須存在的最後 LF。
- 錯誤物件或錯誤訊息不得包含原始文字或字幕內容。

## 核心與介面錯誤行為

核心依 TECHNICAL.md 的固定形狀回傳錯誤碼，不回傳在地化訊息，也不回顯提交的字幕文字。介面將錯誤碼對應到經審閱的繁中與英文提示。錯誤碼是核心與測試契約；頁面不必顯示代碼。

介面拒絕無效輸入或顯示 Worker 的安全失敗狀態，不會退回主執行緒處理大型文字，也不會送到服務端。瀏覽器不支援 Worker 時應 fail closed，草稿仍留在輸入框。

## 摘要與輸出

成功結果顯示：

- cue 列數；
- 第一列原始 start/end 與平移後 start/end；
- 最後一列原始 start/end 與平移後 start/end。

「第一列」與「最後一列」是輸入順序位置，不是時間最早或最晚。可選摘要不能取代完整輸出。完整輸出是一個唯讀 textarea，不得為每一列建立一張 DOM 卡片。

輸出規則：

- UTF-8，無 BOM。
- 只有 LF 換行。
- 保留原索引字串及字幕文字；CRLF/CR 正規化是文字唯一可能變更。
- 時間碼精確平移，格式為兩位小時與三位毫秒。
- 箭頭兩側正規化成各一個 ASCII 空格。
- 區塊間恰有一個空白行。
- 整份輸出結尾恰有一個 LF。
- 下載 MIME 為 text/plain;charset=utf-8；固定檔名為 subtitles-shifted.srt。

下載由使用者明確操作。本版不主動開啟原生檔案選擇器、不呼叫剪貼簿、不自動下載、不提供列印流程，也不主動要求系統儲存對話框。使用者瀏覽器設定仍可能決定是否出現檔案儲存提示；產品不得宣稱檔案已成功儲存。

## 隱私與生命週期

所有輸入、設定、Worker 訊息、錯誤與輸出只存在記憶體。不得使用 localStorage、sessionStorage、IndexedDB、cookies、網址 query/hash/path 草稿、分析、遙測、外部資產或網路端點。不得記錄字幕內容或含字幕內容的錯誤。

輸入或設定改變時，立即使可見結果失效並停用下載。每個頁面同時最多一個 Worker 工作。編輯、取消、清除、語言導航、pagehide 或 page generation 改變都使該工作失效並終止 Worker。舊的回覆、拒絕、事件或 finally 路徑都不得改變目前狀態。

最多同時有八個下載 object URL 存活。每個 URL 有自己的 30 秒期限。第九次下載嘗試拒絕建立新 URL，且不撤銷前八個。編輯會清除可見結果，但先前 URL 保留至各自到期。清除確認與 pagehide 撤銷全部 URL。每個到期處理只可撤銷自己對應的 URL 記錄。

## 在地化與可及性

繁中與英文使用獨立靜態路由：繁中 /index.html 的 lang 為 zh-Hant，英文 /en/index.html 的 lang 為 en。不建立語言選擇中介頁或 /zh-TW/ 路徑。語言連結要清楚說明目的地；確認後草稿會遺失。

沿用 GlossQuote 家族色彩、間距、字體和焦點樣式，同時用符合字幕編輯工作的版面，不照搬其他工具頁或通用 SaaS 儀表板。輸入、方向、秒數、提交、狀態、錯誤、輸出、摘要、下載、清除與語言導航均有可見標籤並與控制項關聯。保留鍵盤操作、可見焦點、螢幕閱讀器狀態、減少動態效果偏好與文字選取。IME 組字期間不得搶焦點。

在 320 CSS px、200% 縮放與放大文字時，控制項和完整輸出仍可操作，頁面不需橫向捲動。textarea 可自行捲動。介面不得依賴 hover、單靠顏色、拖放或精準指標操作。

## 不承諾事項

工具不保證平移後的檔案已與特定播放器媒體同步，不保證瀏覽器或裝置已儲存下載檔，不承諾網站完整離線，也不宣稱支援每一種 SRT 方言。瀏覽器、螢幕閱讀器、真機與焦點事件期間的 NOT_RUN 項目，須與核心測試分開報告。


---

## 原文件 TECHNICAL.md

# 技術契約

## 架構

使用靜態 HTML、CSS 與原生 ECMAScript modules。Node.js 24 與內建模組可用於本機開發、確定性測試、靜態建置及服務；M1 不得加入 runtime 或 development package dependency。瀏覽器若不支援 module Worker，功能偵測後必須 fail closed。

頁面在記憶體持有草稿。解析與平移在單一專用 module Worker 執行。Worker 匯入與 Node 測試共用的純核心模組，回傳一個完整、可序列化的成功紀錄或一個精簡錯誤紀錄，不呼叫網路。Worker 先解析及驗證整份檔案，再平移所有列；不得發布部分 cue 陣列。每個頁面同時最多一個工作。

## 核心輸入的精確 schema

純函式入口是 analyzeAndShiftSrt(input)。input 是一般 plain record，且只可有下列 own、enumerable、data properties：

    {
      srtRaw: string,
      direction: "earlier" | "later",
      secondsRaw: string
    }

不得有額外 key、缺漏 key、symbol key、accessor 或 non-enumerable own property。root prototype 必須恰為 Object.prototype。先檢查 property descriptor 再讀值，絕不執行 getter。

根 schema 的錯誤優先序是：prototype 錯誤、任何 symbol key、任何未知字串 key、依 srtRaw/direction/secondsRaw 順序第一個缺漏 key，最後依相同順序第一個無效 descriptor。屬性是 accessor 時，即使同時 non-enumerable 也回 ACCESSOR_PROPERTY；其他 non-enumerable data property 回 NON_ENUMERABLE_PROPERTY。

JavaScript 無法在不執行 Proxy trap 的情況下可靠辨認 Proxy。Worker 收到的是 structured-clone 訊息，應用程式建立一般 record；直接傳入惡意 Proxy 不屬於支援的傳輸契約。純函式測試仍須證明一般帶 accessor 的物件會在不執行 getter 的情況下被拒絕。

## 純函式名稱、型別與回傳形狀

以下為精確的 TypeScript 風格契約；實作可用 JavaScript ESM，但不得猜測不同結果形狀。

    type Direction = "earlier" | "later";
    type Field = "input" | "srtRaw" | "direction" | "secondsRaw";
    type ErrorCode =
      | "ROOT_NOT_PLAIN_OBJECT" | "SYMBOL_KEY" | "UNKNOWN_FIELD" | "MISSING_FIELD"
      | "ACCESSOR_PROPERTY" | "NON_ENUMERABLE_PROPERTY" | "SRT_RAW_TYPE"
      | "RAW_CODE_UNITS_HIGH" | "NUL_NOT_ALLOWED" | "UNPAIRED_SURROGATE"
      | "UTF8_BYTES_HIGH" | "DIRECTION_INVALID" | "SECONDS_TYPE"
      | "SECONDS_FORMAT" | "SECONDS_RANGE" | "NO_CUES" | "CUE_COUNT_HIGH"
      | "INDEX_FORMAT" | "INDEX_RANGE" | "INDEX_NOT_INCREASING"
      | "TIMING_LINE_MISSING" | "TIMING_FORMAT" | "TIMESTAMP_RANGE"
      | "CUE_START_NOT_BEFORE_END" | "CUE_TEXT_MISSING"
      | "CUE_TEXT_LINES_HIGH" | "CUE_TEXT_LINE_TOO_LONG"
      | "MISSING_CUE_SEPARATOR" | "SHIFT_OUT_OF_BOUNDS";
    type CoreError = {
      code: ErrorCode,
      field: Field,
      line: number | null,
      cueIndex: number | null
    };
    type Result<T> =
      | { ok: true, value: T }
      | { ok: false, error: CoreError };
    type ShiftOutcome =
      | { ok: true, result: ShiftSuccess }
      | { ok: false, error: CoreError };

    type ValidatedShiftInput = {
      srtRaw: string,
      direction: Direction,
      secondsRaw: string,
      shiftMilliseconds: number,
      inputUtf8Bytes: number
    };
    type ParsedCue = {
      cueOrdinal: number,
      indexRaw: string,
      indexValue: number,
      originalStartMs: number,
      originalEndMs: number,
      timingLine: number,
      textLines: string[]
    };
    type ParsedSrt = {
      cues: ParsedCue[],
      inputUtf8Bytes: number
    };
    type ShiftedCue = {
      cueOrdinal: number,
      indexRaw: string,
      originalStartMs: number,
      originalEndMs: number,
      shiftedStartMs: number,
      shiftedEndMs: number,
      textLines: string[]
    };
    type CueEdgeSummary = {
      cueOrdinal: number,
      indexRaw: string,
      start: string,
      end: string
    };
    type ShiftSuccess = {
      direction: Direction,
      secondsRaw: string,
      shiftMilliseconds: number,
      cueCount: number,
      inputUtf8Bytes: number,
      outputUtf8Bytes: number,
      firstInputCue: CueEdgeSummary,
      lastInputCue: CueEdgeSummary,
      firstOutputCue: CueEdgeSummary,
      lastOutputCue: CueEdgeSummary,
      cues: ShiftedCue[],
      srtText: string
    };

函式契約如下：

- validateShiftInput(input: unknown): Result<ValidatedShiftInput>。驗證 root schema、primitive 型別、raw UTF-16 上限、Unicode、UTF-8 byte 上限、direction 與 secondsRaw。成功 value 僅含上述五個欄位。
- parseSecondsToMs(secondsRaw: string): Result<number>。輸入需是 primitive string；成功 value 是 0 至 3,600,000 之間的整數毫秒。
- parseSrt(srtRaw: string, inputUtf8Bytes: number): Result<ParsedSrt>。只接受已通過字串安全與 bytes gate 的參數。成功 value 含 1 至 2,000 個 ParsedCue 與原始 UTF-8 bytes 數。
- shiftCues(cues: ParsedCue[], direction: Direction, shiftMilliseconds: number): Result<ShiftedCue[]>。參數須是 parseSrt 成功結果與已驗證設定；成功 value 是等長、同順序陣列，包含每個原始及平移後端點。
- formatTimestamp(milliseconds: number): string。前置條件是整數且位於 0..359999999；回傳固定 HH:MM:SS,mmm 字串。呼叫端不可把未驗證值交入。
- formatSrt(cues: ShiftedCue[]): string。前置條件是 shiftCues 成功；回傳完整標準輸出字串，不回傳部分結果。
- analyzeAndShiftSrt(input: unknown): ShiftOutcome。依指定 gate 順序組合以上函式；成功只有 result，失敗只有 error。

Result<T> 和 ShiftOutcome 的欄位形狀固定如上，不得加入 message、raw input、stack、隱藏狀態或額外欄位。內部 helper 只接受已驗證參數；對無效前置條件不需另造公開錯誤碼。所有輸出是普通 JSON 可序列化資料，不含 Date、Map、Set、BigInt、Error、typed array 或 class instance。函式不得依賴 DOM、Worker、Blob、URL、storage、network、clock、randomness、logging 或可變 module state。

direction 僅接受字串 "earlier" 或 "later"，其他型別或字串回 DIRECTION_INVALID。secondsRaw 必須是 primitive string，並符合 ^[0-9]{1,4}(?:\.[0-9]{1,3})?$；不接受正負號、空格、逗號、小數點前後缺位或非 ASCII 數字。先將整數部分乘 1000，再將小數部分右側補零至三位並轉成整數相加。結果須在 0..3,600,000 毫秒，含端點；格式不符回 SECONDS_FORMAT，超界回 SECONDS_RANGE。core 不自行套用預設值；UI 初始 secondsRaw 明確設為 "0"。

## Unicode 與 byte gate

srtRaw 必須是 primitive string。先比較 JavaScript string.length（UTF-16 code units）與 1,048,576；超過時回 RAW_CODE_UNITS_HIGH，不配置 TextEncoder 結果。接著由左至右掃描 U+0000 與 UTF-16 配對，第一個 NUL 回 NUL_NOT_ALLOWED，第一個未配對 high/low surrogate 回 UNPAIRED_SURROGATE。完成掃描後才使用 TextEncoder，並比較 byteLength 與 1,048,576。超過回 UTF8_BYTES_HIGH。

上限含端點。BOM 和原始換行都計入 raw bytes。只有 gate 通過後才移除 BOM 或正規化換行。有效 surrogate pair 在行長度計算時算一個 Unicode code point，不算兩個 UTF-16 code units。

## SRT parser 詳細規則

raw gates 通過後，將所有 CRLF 與 CR 正規化成 LF。只移除字串最前方一個 U+FEFF。不得移除第二個 BOM 或其他空白。

拆分實體行；從 1 開始編號，空白分隔行也計行號。只有符合 ASCII 空格/tab 零次以上的行才是分隔行。忽略第一 cue 前與最後 cue 後的分隔行，cue 間一個以上分隔行合併為一個。每個 block 必須是索引、時間、至少一行文字。

逐個實體行解析，錯誤指向第一個不合法位置：

1. 找到下一個非分隔行後，若已解析 2,000 列，先回 CUE_COUNT_HIGH，指向第 2,001 個候選列的索引行及 cue ordinal 2001。
2. 索引行必須符合 ^[0-9]{1,6}$；否則 INDEX_FORMAT。數值必須為 1..999999，否則 INDEX_RANGE；再要求嚴格大於前列數值，否則 INDEX_NOT_INCREASING。輸出保留原始索引字串。
3. 下一實體行若 EOF 或是分隔行，回 TIMING_LINE_MISSING；若存在但格式不符，回 TIMING_FORMAT。
4. 時間行語法為以下 ASCII 字元格式：

       ^([0-9]{2}):([0-9]{2}):([0-9]{2}),([0-9]{3})[ \t]+-->[ \t]+([0-9]{2}):([0-9]{2}):([0-9]{2}),([0-9]{3})$

   語法通過後，依 start 再 end 的順序檢查小時 00..99、分 00..59、秒 00..59；第一個超界元件回 TIMESTAMP_RANGE。時間碼轉成整數毫秒。start >= end 回 CUE_START_NOT_BEFORE_END。
5. 文字行由第一行開始消耗，到分隔行或 EOF 為止。若數字索引候選行緊接時間形狀行且前面沒有分隔，先回 MISSING_CUE_SEPARATOR。否則第 11 行先回 CUE_TEXT_LINES_HIGH；每行最多 1,000 Unicode code points，超過回 CUE_TEXT_LINE_TOO_LONG。兩者都指向出錯行。若時間行後立即遇到分隔或 EOF，回 CUE_TEXT_MISSING。

缺少必要行時，line 使用下一個應有行的位置：遇到分隔行就指向該分隔行；若已到 EOF 就用正規化行數加一。cueIndex 是一基底的輸入列序號，不是 SRT 索引值。索引行格式錯誤仍可指出正在解析的 cue ordinal。若只有分隔行，回 NO_CUES 且 line/cueIndex 為 null。

在現有 cue 文字中，只有「符合索引語法的純數字行，緊接外形符合時間行的下一行」會被保留為 cue 邊界候選。沒有前置分隔時拒絕該候選。未跟隨時間形狀行的純數字字幕文字仍可接受。這個受限配對明列為不支援的字幕內容，不依賴隱晦猜測。

不得排序、合併或拒絕時間重疊的 cue。所有 cue 依原輸入順序保留。HTML-looking 內容都是純文字。文字內容除 CR/CRLF 換行正規化外原樣保留。

## 時間平移與輸出

合法時間範圍是整數毫秒 0 至 359,999,999，含端點。earlier 減去 shiftMilliseconds，later 加上。先完整成功解析所有 cue，之後再按輸入順序檢查平移邊界；每列先檢查 shifted start，再檢查 shifted end。第一個超界回 SHIFT_OUT_OF_BOUNDS。任何失敗都不產生結果。

時間碼格式為兩位小時、冒號、兩位分鐘、冒號、兩位秒、逗號、三位毫秒。索引與 textLines 原樣保留。序列化時行與行之間用 LF，區塊間恰用兩個 LF，最後附恰好一個 LF。輸出沒有 BOM。成功解析至少含一列，所以輸出不會是空字串。

## 核心回傳 schema

成功 envelope 恰為：

    {
      ok: true,
      result: {
        direction: "earlier" | "later",
        secondsRaw: string,
        shiftMilliseconds: integer,
        cueCount: integer,
        inputUtf8Bytes: integer,
        outputUtf8Bytes: integer,
        firstInputCue: CueEdgeSummary,
        lastInputCue: CueEdgeSummary,
        firstOutputCue: CueEdgeSummary,
        lastOutputCue: CueEdgeSummary,
        cues: ShiftedCue[],
        srtText: string
      }
    }

CueEdgeSummary 恰含：

    {
      cueOrdinal: integer,
      indexRaw: string,
      start: string,
      end: string
    }

ShiftedCue 恰含：

    {
      cueOrdinal: integer,
      indexRaw: string,
      originalStartMs: integer,
      originalEndMs: integer,
      shiftedStartMs: integer,
      shiftedEndMs: integer,
      textLines: string[]
    }

first/last summary 是輸入順序中的第一列與最後一列，不是時間極值。inputUtf8Bytes 含可能的 BOM 與原始換行；outputUtf8Bytes 是 TextEncoder 對 srtText 編碼後的 byteLength。所有欄位都是普通 JSON 可序列化值。

錯誤 envelope 恰為：

    {
      ok: false,
      error: {
        code: ErrorCode,
        field: "input" | "srtRaw" | "direction" | "secondsRaw",
        line: integer | null,
        cueIndex: integer | null
      }
    }

cueIndex 是輸入順序一基底 cue ordinal，不是 SRT 索引數值。錯誤不得包含 srtRaw、字幕行、raw property 值、stack、在地化訊息或部分輸出。UI 負責在地化提示。

## 穩定錯誤碼與優先序

Schema 與 scalar 驗證先於 SRT 解析：

- ROOT_NOT_PLAIN_OBJECT
- SYMBOL_KEY
- UNKNOWN_FIELD
- MISSING_FIELD
- ACCESSOR_PROPERTY
- NON_ENUMERABLE_PROPERTY
- SRT_RAW_TYPE
- RAW_CODE_UNITS_HIGH
- NUL_NOT_ALLOWED
- UNPAIRED_SURROGATE
- UTF8_BYTES_HIGH
- DIRECTION_INVALID
- SECONDS_TYPE
- SECONDS_FORMAT
- SECONDS_RANGE

Parser 依上節規則回報正規化後第一個錯誤：

- NO_CUES
- CUE_COUNT_HIGH
- INDEX_FORMAT
- INDEX_RANGE
- INDEX_NOT_INCREASING
- TIMING_LINE_MISSING
- TIMING_FORMAT
- TIMESTAMP_RANGE
- CUE_START_NOT_BEFORE_END
- CUE_TEXT_MISSING
- CUE_TEXT_LINES_HIGH
- CUE_TEXT_LINE_TOO_LONG
- MISSING_CUE_SEPARATOR

只有所有 SRT 語法都通過後才做平移邊界檢查：

- SHIFT_OUT_OF_BOUNDS

Schema、raw size、Unicode、UTF-8 size、設定與 NO_CUES 錯誤的 line/cueIndex 均為 null。block 錯誤的 line 是出錯實體行，缺行時是下一個預期實體行；cueIndex 是正在解析的一基底列序號。CUE_COUNT_HIGH 指向第 2,001 個候選索引行。SHIFT_OUT_OF_BOUNDS 指向該列時間行與第一個超界 cue ordinal。索引格式錯誤仍指出候選列 ordinal，即使無法解析 SRT 索引值。

核心只回錯誤碼，不固定錯誤文案。兩種語言介面需提供語意相同、可採取行動的提示；不要求顯示內部代碼。

## Worker 協定與舊工作隔離

主執行緒建立一個同源靜態 module Worker，精確送出：

    { type: "shift", jobId: integer, revision: integer, pageGeneration: integer, input: ShiftInput }

Worker 最多回傳一個 terminal envelope：

    { type: "success" | "failure", jobId: integer, revision: integer, pageGeneration: integer, outcome: ShiftOutcome }

同一頁面同時最多一個工作。jobId 在頁面內單調遞增。每次草稿或設定改變都增加 revision。重設或導航生命週期增加 pageGeneration。編輯、取消、清除、確認切換語言、pagehide 或復原 pageshow 時，都要使目前 token 失效並 terminate Worker。只有 Worker 身分及三個 token 值都和目前 active request 相同時才接受回覆。success、failure、error、messageerror、timeout、cancel 與 finally 清理都適用同一條件。任何舊 callback 不得清除 busy、更新錯誤、啟用下載、取代新結果或釋放新工作的狀態。

每次工作有明確 10,000 毫秒 timeout。計時開始於送出 Worker 訊息時。到期時先比對 Worker 身分、jobId、revision、pageGeneration；若仍是目前工作，就失效 token、terminate Worker、清除該工作計時器，保留草稿並顯示通用逾時提示。若 timeout callback 已過期，完全不改任何狀態。逾時不回傳部分結果，也不自動在主執行緒重試。

Worker 不存在、建立失敗、crash、回覆格式錯誤或逾時時，顯示安全的在地化失敗狀態並保留草稿。不得同步 fallback、呼叫 server 或記錄內容。前端不渲染逐列中間結果。

## 草稿與結果狀態

主執行緒只可在記憶體保留當前輸入字串、direction、結果、可見狀態、active Worker token、page generation 及有限下載 URL 紀錄，不得持久化。任何值真的改變時，同一事件處理內遞增 revision、同步清除可見結果與停用下載，不可等 debounce 或 render。收到 compositionstart 或 isComposing=true 的 input 時也立即使舊結果與舊工作失效並停用下載；組字期間保留輸入框原值，不重寫 value、不正規化、不驗證、不搶焦點。compositionend 後才可允許提交新工作。不得因組字尚未完成而保留可下載的舊結果。

若清除時有輸入或結果，顯示頁內無障礙確認。取消不改狀態；確認會使工作失效並終止、清空所有輸入/結果/錯誤、遞增 generation/revision，並撤銷所有 URL。若頁面本來全空，直接清除即可。非空狀態切語言也使用相同確認，確認後乾淨導航到另一個語言頁。

pagehide 時使 generation 失效、終止 Worker、清空頁面狀態、清除 URL timers 並撤銷所有 live URLs。pageshow 且 persisted=true 時顯示空白初始狀態，不恢復舊草稿或結果。不得宣稱 JavaScript pagehide 保證頁面外記憶體抹除；可觀察契約是頁面不保留、不恢復自己的草稿或結果。

## 下載 URL 生命週期

只有與目前 revision 相同的結果可下載。使用者點擊下載後，以 result.srtText 的精確 UTF-8 bytes 建立 Blob，MIME 為 text/plain;charset=utf-8，再建立一個 object URL，交給明確下載連結，檔名 subtitles-shifted.srt。Blob 無 BOM。不呼叫 clipboard API、不自動觸發下載、不主動要求原生儲存對話框；瀏覽器設定仍可能顯示自己的儲存提示。

最多維持八筆 live object URL 紀錄。每筆有唯一 token、URL 及建立時間加 30,000 毫秒的 monotonic deadline。各自 timer 只有在 token 與 URL 仍吻合時才可撤銷該筆。舊 timer 不得撤銷其他紀錄。第九次下載嘗試回傳安全的在地化拒絕，既不建立新 URL，也不撤銷前八筆。Blob/URL 建立失敗不佔用 slot。

編輯會清結果並停用後續下載，但先前 URL 保留至各自到期。確認清除與 pagehide 撤銷所有 URL。可在 timer 到期時以及新下載前清理已逾期紀錄。若頁面隱藏期間瀏覽器暫停 timer，恢復生命週期時先撤銷逾期 URL，再允許新下載；pagehide 已先全部清除。30 秒是應用層政策；不能由此推論使用者已成功儲存檔案。

MDN 說明 URL.createObjectURL 與對應 revokeObjectURL 的生命週期：https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static

## 本機命令、hosting 與安全

M1 package scripts 預期包含：

- npm run dev：Node 內建靜態伺服器，只綁定 127.0.0.1:4216，絕不綁 wildcard。
- npm test：使用產生式假資料的離線 Node 內建測試。
- npm run check：靜態檢查及本機安全／設定斷言。
- npm run build：確定性預覽建置，只輸出到 dist/。

不得在對應 script 或檔案建立並經檢查前執行命令。M1 預覽為 noindex，不含 service worker，也不承諾完整離線。

M2 僅在主代理 GO 後新增獨立 dist-production/ 正式候選版及 127.0.0.1:5216 本機服務。候選版須驗證雙語 metadata、canonical/hreflang/x-default、若採用 JSON-LD 則檢查其內容、robots、sitemap、安全 headers/CSP、closed static output 與 noindex 404。M2 不部署。M3 部署及共用首頁由主代理負責。

正式 CSP 只允許實際需要的同源 HTML/CSS/JS 與 Worker；至少明確允許 worker-src 'self'，不得使用 unsafe-inline 或 unsafe-eval。若保留 inline JSON-LD，只能允許對應精確、經審閱的 hash。可用 default-src 'none'，再逐項開放必要來源；object-src、base-uri、form-action 與 frame-ancestors 應封閉。不得加入遠端字型、第三方 script、分析、遙測、網址內容、secret 或 runtime dependency。不得公開本機服務 port。遵守 Windows 環境與 Git 發布 guard；不得查看憑證或修改持久環境／Git 設定。


---

## 原文件 UX-SEO.md

# UX、在地化與 SEO 規格

## 頁面結構與設計

使用者一進頁面就看見工作內容：簡短說明、大型 SRT 輸入框、精簡的平移控制、一個明確提交按鈕，以及成功後才出現的狀態／錯誤和結果。沿用 GlossQuote 家族設計 token 的色彩、間距、字體、邊界與焦點處理，同時組成符合字幕編輯工作的版面，不複製其他工具或通用儀表板。

輸入與結果是主要工作區。方向及秒數可在窄螢幕並排，但前提是都容易操作；320 CSS px 時堆疊控制項，所有按鈕仍可觸及，textarea 可內部捲動且頁面不需橫向捲動。200% 縮放或放大文字時，標籤和按鈕可換行，完整輸出仍可選取。

使用原生且有標籤的 textarea、select/radio、文字輸入、按鈕及連結。秒數輸入設 decimal input mode，但驗證仍以 ASCII 文字為準；不得偷偷轉換逗號小數、全形數字或貼入字元。不要把控制項藏在無文字圖示後。鍵盤焦點使用對比足夠的家族樣式。保留標準選取、貼上與復原。IME 組字時不得更新 textarea value。

主要輸出是一個含完整 canonical SRT 的唯讀 textarea。以 textarea 的 value 屬性呈現；字幕文字只作純文字顯示，不解讀為 HTML。不得為最多 2,000 列建立 DOM 卡片。可選的小摘要最多只預覽首尾各三列，必須清楚標為預覽；完整輸出與下載仍不得截短。不可把截斷摘要稱為完整結果。

處理中、完成和錯誤狀態要有適當的螢幕閱讀器宣告。欄位錯誤與控制項關聯。無效提交後保留焦點；成功後宣告結果，但不從使用者正在組字的輸入框搶焦點。清除與語言切換確認使用頁內無障礙 dialog，提供明確取消／繼續按鈕、鍵盤焦點限制、Escape 取消與焦點還原。不得使用 window.confirm、列印或主動開啟原生檔案對話框。

## 雙語介面文字

繁體中文頁：

- 文件語言：zh-Hant
- Title：字幕時間平移｜GlossQuote Tools
- H1：字幕時間平移
- Description：貼上 SRT 字幕，整份提前或延後指定秒數，檢查完整結果並下載。純文字處理，不讀取影片或音訊。
- 輸入標籤：SRT 字幕文字
- 方向標籤：平移方向
- 提前選項：提前
- 延後選項：延後
- 初始方向：預選「提前」
- 秒數標籤：秒數（最多三位小數）
- 提交：平移字幕
- 輸出標籤：完整輸出 SRT（唯讀）
- 下載：下載 subtitles-shifted.srt
- 清除：清除草稿
- 語言連結：English
- 隱私說明：內容只在此頁記憶體處理；切換語言或離開頁面會清除草稿。

英文頁：

- 文件語言：en
- Title：Subtitle Time Shift | GlossQuote Tools
- H1：Subtitle Time Shift
- Description：Paste SRT subtitles, shift every cue earlier or later by a precise amount, review the full result, and download it. Text only; no video or audio is read.
- Input label：SRT subtitle text
- Direction label：Shift direction
- Earlier：Earlier
- Later：Later
- Initial direction：Earlier selected
- Seconds label：Seconds (up to three decimal places)
- Submit：Shift subtitles
- Output label：Complete SRT output (read-only)
- Download：Download subtitles-shifted.srt
- Clear：Clear draft
- Language link：繁體中文
- Privacy note：Text is processed in this page's memory; changing language or leaving clears the draft.

頁面需可見並翻譯「SRT 支援為本工具明列的子集合」說明，連到國會圖書館參考頁。不得宣稱相容所有 SRT 方言，也不得暗示已用影片驗證同步。

## 錯誤與生命週期訊息

兩種語言都要傳達相同結果：

- SRT 或設定無效：指出可辨識欄位／位置，說明如何修正，保留草稿。
- 平移超出時間範圍：指出 cue ordinal，說明整份檔案都沒有輸出。
- Worker 不可用或失敗：說明此瀏覽器無法完成處理，草稿仍只留在目前頁面。
- 下載 URL 達容量上限：說明沒有建立新下載；舊下載 URL 仍只保留至各自期限。
- 清除／切語言確認：說明繼續會丟棄目前草稿與結果。
- 結果失效：任一輸入或設定改變後，立即移除舊輸出並停用下載。
- Worker 逾時：說明本次計算逾時，草稿保留且沒有部分結果。

UI 不必顯示內部錯誤代碼。不得把完整貼上的字幕文字回顯到錯誤、toast、dialog、網址或 log。

## 響應式與裝置限制

支援純鍵盤操作、瀏覽器文字縮放到 200%、320 CSS px viewport、螢幕閱讀器標籤／狀態、減少動態效果偏好與一般 IME 組字。避免 hover-only 說明、只靠拖曳的操作、過小點擊區與只靠顏色的狀態。打字時不重排輸入。長輸出可設定明確高度並在 textarea 內捲動、選取，但 value 必須完整。

2,000 列上限須在主執行緒以外處理。不可顯示核心無法驗證的進度承諾。本產品沒有 service worker，因此不承諾完整離線。若發現遠端瀏覽器資產或第三方請求，即違反隱私界線。

## 搜尋意圖、metadata 與 FAQ

搜尋意圖只是產品假設，不是量測需求。頁面解決明確工作：以固定量平移全部 SRT 字幕時間。不得編造搜尋量、排名或使用者研究成果。

預覽版：

- 兩個語言路由都輸出頁面層級 noindex，不放正式 canonical。
- 本機預覽為 127.0.0.1:4216，並非公開網址。
- M1 預覽輸出獨立放在 dist/，不得覆蓋正式候選版。

正式候選版，只能在主代理 M2 GO 後建立：

- 繁中網址與 canonical：https://subtitles.glossquote.com/index.html
- 英文網址與 canonical：https://subtitles.glossquote.com/en/index.html
- 兩頁互相提供 hreflang zh-Hant 及 en。
- x-default 指向 https://subtitles.glossquote.com/index.html。
- 不建立 /zh-TW/ 路徑或語言選擇中介頁。
- sitemap 只列兩個 canonical 語言頁，除非主代理明確核准發布清單中的另一個靜態頁面。
- robots.txt 允許兩個頁面與完成渲染所需的同源 CSS/JS 資產，不可封鎖頁面資產。
- 404 response 必須 noindex，也不得含草稿或輸出。
- M3 前從 dist-production/ 正式候選版檢查 metadata 與 headers。

繁中 FAQ：

1. 如何平移 SRT 字幕時間？
   貼上符合本工具格式的 SRT，選提前或延後並輸入秒數，然後檢查完整結果。
2. 可以平移多少？
   秒數可為 0 到 3,600 秒，最多三位小數；移動後所有時間仍須位於 00:00:00,000 到 99:59:59,999。
3. 為什麼整份字幕被拒絕？
   本工具只接受明列的 SRT 子集合；若格式不符或任一 cue 超出時間範圍，整份不輸出部分結果。
4. 會讀取影片或上傳字幕嗎？
   不會。貼上的文字在本頁記憶體處理，沒有影片、音訊或雲端處理。
5. 能修正逐漸累積的不同步嗎？
   不能。本工具只做每個 cue 完全相同的時間平移。

英文 FAQ：

1. How do I shift SRT subtitle timing?
   Paste SRT text supported by this tool, choose earlier or later, enter seconds, and review the complete result.
2. How far can I shift it?
   The amount is 0 to 3,600 seconds with up to three decimal places; every shifted cue must remain between 00:00:00,000 and 99:59:59,999.
3. Why was the whole subtitle file rejected?
   This tool accepts only its documented SRT subset. A format error or any cue outside the time range rejects the entire result.
4. Does it read video or upload subtitles?
   No. Pasted text is processed in this page's memory; no video, audio, or cloud processing is used.
5. Can it fix gradually increasing desynchronization?
   No. It applies exactly the same time offset to every cue.

若使用 production structured data，必須與可見文案相符且使用該頁語言。CSP 可以只允許精確審閱過的 JSON-LD hash。若同源外部 markup 可滿足發布設計，優先不使用 inline JSON-LD。不得使用 unsafe-inline 或 unsafe-eval。正式候選版獨立產生於 dist-production/，本機使用 port 5216。M3 部署由主代理執行。


---

## 原文件 ACCEPTANCE.md

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


---

## 原文件 TASKS.md

# 里程碑任務

## 責任與完成條件

本資料夾目前是 M0 規格。原功能對話在主代理派工後負責實作，並依派工模型設定執行。主代理負責獨立驗收與整合，再負責 M3 部署及首頁更新。不得跳過里程碑，也不得把本機候選版說成已部署。

所有測試均使用產生式假字幕資料並離線執行。runtime dependencies 維持零。遵守根層 Windows 環境、Git 設定、原始碼發布及焦點事件規則。不得讀取憑證、改持久系統設定、在 gate 前發布，或在目前 UI 狀態為 NOT_RUN_USER_FOCUS_INCIDENT 時啟動本機瀏覽器／原生 UI 測試。

## M0 — 完整規格

交付檔案：README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。

允許路徑：只限 tool-projects/36-subtitle-shift/ 下述六個檔案。

驗收：六檔齊全；parser、錯誤、輸出、Worker、URL 契約一致；至少 24 個精確核心 oracle 及至少 20 個 app／瀏覽器檢查；不宣稱產品已實作或測試。

## M1 — 本機 CLI candidate

負責人：派工後的原 subtitle-shift 功能對話；派工明確要求 gpt-6.1-sol/max，requested model 設定不代表 backend identity 已獨立驗證。

允許來源路徑：

- package.json
- .gitignore
- public/**
- scripts/**
- test/**
- tests/**
- dist/**
- HANDOFF.md
- TASK-ENTRY.md
- project.json

實作者只能在以上路徑新增或更新檔案，且 HANDOFF.md、TASK-ENTRY.md、project.json 僅記錄本工具真實狀態。不得修改其他共用專案文件、共用首頁／catalog、secret、Git 設定或其他工具資料夾。來源程式與相關測試要一併交付。M1 不做正式模板／輸出、GitHub 發布或部署。

必要實作：

- 純 ESM 核心，符合精確 schema、parser 子集合、限制、錯誤順序與序列化契約。
- 同源專用 module Worker，使用 revision/jobId/page generation 失效機制，沒有同步或雲端 fallback，固定 10 秒 timeout。
- 獨立 zh-Hant 與英文路由、可及響應式 UI、完整輸出、明確下載生命週期、頁內清除與切換語言確認。
- 只在記憶體處理，不用遠端資產或網路呼叫。
- Node 24 內建測試、check、build、dev scripts 與離線假資料。

對應檔案與 script 已建立且檢查後才可執行：

    npm test
    npm run check
    npm run build
    npm run dev

預覽建置只輸出 dist/。dev server 只綁 127.0.0.1:4216。可做本機靜態 HTTP 檢查。焦點事件期間瀏覽器 UI 檢查受阻，必須記為 NOT_RUN_USER_FOCUS_INCIDENT。CLI gate 通過不能關閉 UI 驗收，也不得冒稱 M1 完成。

M1 交付：實作、精確測試證據、變更檔案清單、凍結本機候選版 hashes，以及原功能對話在允許路徑更新的 HANDOFF、TASK-ENTRY.md、project.json 真實狀態和最終回報。主代理另負責獨立驗收與整合。

## M2 — 正式候選版與公開原始碼

負責人：原功能對話，且僅在主代理明確記錄 M2 GO 後開始。主代理先審查具體 M1 候選版。

可新增的路徑：

- package.json
- scripts/production.mjs
- scripts/release-check.mjs
- test/production.test.mjs
- dist-production/**

正式工具只產生獨立候選版，絕不覆寫 dist/。候選 server 只綁 127.0.0.1:5216。建置／檢查 closed static output、雙語正式 SEO、精確 CSP/headers、robots/sitemap/404 noindex 與發布白名單。除非主代理核准特定修正並重跑受影響測試，M1 app/core bytes 必須維持不變。

所有必要 M2 gate 通過後，主代理才可依既有 repo 契約授權原始碼發布。公開 repository 目標為 KYStr/glossquote-labs-subtitle-shift。使用已審閱的發布副本與 Git settings guard；不得修改 global/system auth 設定。主代理在其 HANDOFF 記錄已驗證的 repository URL、commit 與 visibility。發布原始碼不代表網站已部署。

M2 交付：正式候選版、獨立 release checks、公開來源發布證據、更新後 HANDOFF、明列人工 NOT_RUN 項目。M2 不部署 hosting，也不改共用首頁。

## M3 — 部署與首頁整合

負責人：主代理。必須在 M2 獨立驗收完成，且既有政策所需部署授權／憑證可用後才能開始。

允許路徑：主代理明確指派的正式部署設定與共用雙語首頁／catalog 檔案。M1/M2 的功能實作者不得編輯這些路徑。

主代理先驗證 live host 與兩個語言頁，再將 catalog 項目由 draft 改為 published。驗證來源 repository、commit、實際 live HTTP 行為、兩個語言路由，以及回到相同語言 GlossQuote 首頁的連結。分開回報來源發布、live-host 狀態、瀏覽器驗收及 NOT_RUN 人工檢查。

若使用者焦點事件仍阻擋 live browser checks，保留 NOT_RUN_USER_FOCUS_INCIDENT。不得以 CLI/HTTP 斷言取代缺少的 UI 證據，也不能因來源已公開就宣稱工具已完整驗收或部署。

