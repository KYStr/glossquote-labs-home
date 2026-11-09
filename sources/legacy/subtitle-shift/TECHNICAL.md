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
