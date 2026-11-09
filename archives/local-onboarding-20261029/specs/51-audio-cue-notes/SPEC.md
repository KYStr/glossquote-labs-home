# 錄音時間戳筆記 — 既有規格保存

Task ID: `labs-51-audio-cue-notes` · Spec ID: `spec-51-audio-cue-notes`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：錄音時間戳筆記

## Job / Result / Contract / Oracle

Job：聽訪談、課程或口述錄音時，想在重點發生的當下記一段文字，之後能點筆記跳回，不必手抄時間或把音訊交給雲端服務。

Result：一個本機音訊播放工作區，以及按毫秒標記的筆記清單；使用者可下載 Markdown 或 schema 1 JSON，並可預覽驗證後匯入 JSON 筆記。

Contract：一次一個本機音訊檔，最大 67,108,864 bytes。瀏覽器不支援的檔案安全顯示失敗並釋放資源，不轉檔、不做 ASR。最多 1,000 筆；每筆最多 2,000 UTF-16 code units；所有筆記文字 UTF-8 合計最多 1,048,576 bytes。時間為整數毫秒，0 ≤ timeMs ≤ 工作區可手動編輯的 durationMs。noteId 僅接受 6–12 位正整數，最大 999,999,999,999，匯入後從最大既有 ID+1 編號；耗盡明確拒絕。Markdown/JSON 各最多 4,194,304 bytes，兩者總輸出最多 8,388,608 bytes；超限不建立或提供部分 Blob。JSON schema 1 僅包含手動來源標題、duration metadata 與文字筆記，不包含音訊。匯入需明確確認替換；匯入 duration 與目前音訊不同時先警告。換來源需確認；取消保留現有來源與筆記。播放只因使用者明確操作而開始；pagehide 暫停、移除 source 並 revoke object URL。

Oracle：播放器 currentTime=12.345 秒，按新增筆記得到 timeMs=12345，Markdown 項目時間標記為 [00:12.345]。兩筆在相同時間新增時，清單與匯出維持新增順序。若換檔確認視窗取消，舊音訊與筆記都原樣保留。

## 目標與邊界

- 使用本機檔案，使用者主動按播放；不 autoplay，不讀系統剪貼簿或麥克風。
- 工作區允許先匯入筆記再選音訊；未載入音訊時可看與匯出筆記，但播放及新增時間戳停用。選音訊時可明確選擇保留筆記並附加此播放來源，或清除筆記開始新工作。
- 不上傳、不儲存到 localStorage/IndexedDB/sessionStorage，不建立帳號，不使用 AI/ASR/翻譯。
- 不轉換或修復音訊；不保證某特定副檔名、MIME 或 codec 在所有瀏覽器都可播放。
- 不提供手動輸入任意時間的功能；時間由播放器 currentTime 取得，JSON 匯入為恢復既有筆記。

## 功能需求

### FR-01 本機音訊選取

選取一個最大 64 MiB 的 File。input accept 可提示 audio/* 但不得把 accept 或副檔名當真實 codec 驗證。來源只透過 object URL 指向所選 File；沒有 fetch、XHR、WebSocket 或 server upload。超過上限拒絕，不載入也不清除原來源。

### FR-02 媒體載入與明確播放

使用標準 HTMLAudioElement、preload=metadata，不設定 autoplay。使用者按播放按鈕或播放器原生控制後才呼叫 play。需取得 finite、nonnegative activeAudioDurationMs；初始工作區 durationMs = floor(durationSeconds × 1000)，且必須是安全整數，否則不開放新增/seek 並顯示不支援。durationMs 是可手動調整的來源時間軸 metadata，另保留 activeAudioDurationMs 表示目前播放器實際長度。metadata error、decode error 或 canPlayType 明確回傳空字串時顯示「此瀏覽器無法播放此檔案」，提供移除／重選，不試圖轉檔。

### FR-03 新增時間戳筆記

「記下此刻」預設啟用條件：音訊 metadata 已載入、播放器時間 finite 且 ≥0、未在切換/清除狀態。timeMs = min(activeAudioDurationMs, round(currentTimeSeconds × 1000))。時間必須是安全整數且不大於工作區 durationMs；若播放位置超過 durationMs，暫停新增並提供明確「採用目前音訊長度」動作，按下後才把 durationMs 設為 activeAudioDurationMs。按下「記下此刻」建立未提交 draft，捕捉該時刻並將焦點移至文字欄；Save 才提交非空筆記，Cancel 捨棄 draft。Draft 不算入筆數或匯出；一個工作區同時最多一個 draft。空白或只有 whitespace 的文字不得保存；保存時保留使用者原字串。每筆限制 2,000 UTF-16 code units；合計 UTF-8 編碼不得超過 1,048,576 bytes；最多 1,000 筆。違規時拒絕單次儲存並顯示目前限制，不截斷、不刪舊筆記。

### FR-04 筆記瀏覽與回跳

筆記列顯示精確時間、純文字內容與編輯/刪除動作。依 timeMs 遞增顯示；相同時間依新增順序穩定排列。點時間或「回到此刻」將 currentTime 設為 timeMs/1000，但不自動播放。若筆記時間超過目前音訊實際 activeAudioDurationMs，仍保留文字並標示超出目前音訊範圍，停用該筆 seek；不可靜默調整或刪除。durationMs 編輯欄採 HH:MM:SS.mmm，hours 2–8 位、minute/second 00–59、millisecond 恰 3 位；必須轉成安全整數且不小於最大 note.timeMs，否則拒絕。

### FR-05 來源切換與清除

已載入來源時選到新檔，先顯示頁內確認；只有確認才暫停舊音訊、清除筆記、撤銷舊 object URL 並載入新檔。取消則保留既有來源、播放位置和筆記，捨棄新選取。若目前沒有 audio 但已匯入 notes，提示「附加為播放來源並保留筆記」或「清除筆記並開始新工作」；前者保留 imported sourceTitle/durationMs/notes，將新媒體作 active audio，顯示長度差異並標記 out-of-range notes，後者清空後以新 File metadata 建新 workspace；兩者都需明確按鈕，取消保留 imported notes。清除全部需頁內確認；沒有資料時停用。來源改變即使檔名相同仍視為新來源，除非使用者取消。

### FR-06 匯出 Markdown

按鈕下載 UTF-8 無 BOM 的 notes.md，內容依 timeMs 再新增順序排列。首行是 # <來源標題>，第二行是 Duration: <HH:MM:SS.mmm>，空一行後每筆一行：[MM:SS.mmm] <文字>；當 timestamp 小時數大於 0 時改為 [HH:MM:SS.mmm]。若文字有 LF/CR，序列化前將 CRLF 與單獨 CR 統一成 LF，續行保留在下一行並以四格縮排，避免被誤認成新筆記。標題必須為單行並拒絕控制字元，不把使用者文字當 HTML。先序列化成 UTF-8 bytes，最多 4,194,304 bytes；超限回 EXPORT_TOO_LARGE，不建立 Blob/URL、不提供部分內容。沒有筆記時仍可匯出空清單標頭。

### FR-07 JSON schema 1 匯出

JSON UTF-8 無 BOM，只有以下 root keys，key 次序固定，無額外欄位：

    {
      "schemaVersion": 1,
      "kind": "glossquote-audio-cue-notes",
      "sourceTitle": "Interview recording",
      "durationMs": 12345,
      "notes": [
        { "noteId": "note-000001", "timeMs": 12345, "text": "Key point" }
      ]
    }

每個 note 只有 noteId、timeMs、text。JSON notes 陣列維持建立順序，noteId 按建立時單調遞增且不重用。ID 格式為 note- 加 6–12 位十進位數字，數值 1..999,999,999,999；使用 canonical zero-padding 格式，拒絕重複、非 canonical 或越界 ID。sourceTitle 預設為檔名，可手動編輯；限制 200 UTF-16 code units、單行且無控制字元。durationMs 為手動維護的來源時間軸 metadata，必須是安全整數且不小於任何 note.timeMs；新來源時初始值來自 active audio，手動編輯採用上節格式。先產生 UTF-8 bytes，最多 4,194,304 bytes；超限回 EXPORT_TOO_LARGE，不建立 Blob/URL 或部分下載。Markdown 與 JSON 各最多 4 MiB，兩者合計最多 8 MiB。絕不輸出 File、Blob、object URL、path、MIME、lastModified 或音訊資料。

### FR-08 JSON 匯入

選擇最大 4,194,304 bytes 的 UTF-8 JSON 檔，可有一個 UTF-8 BOM；此上限允許匯入本工具最大尺寸的 JSON export。無效 UTF-8、JSON、schemaVersion/kind、未知欄位、重複或非 canonical noteId、錯誤型別、超限標題／筆記數／文字大小／時間皆拒絕整個匯入。noteId 為 note- 加 6–12 位數，numeric value 1..999,999,999,999；sourceTitle 非空單行。時間 0..JSON durationMs。成功匯入後 next note ID = 最大既有 ID 數值 + 1；新 workspace 從 1 開始。若 next ID > 999,999,999,999，拒絕新增並顯示 NOTE_ID_EXHAUSTED，不覆用 ID。匯入先顯示預覽摘要與「替換目前筆記」按鈕，不在解析時改動工作區；明確確認才替換。若 JSON durationMs 與載入音訊 durationMs 不同，確認前額外提示兩者數值；匯入後對超出當前音訊的時間標示範圍差異。取消保持現有來源與筆記不變。

Action errors 固定為 NOTE_ID_EXHAUSTED（無可用下一 ID）與 EXPORT_TOO_LARGE（完成序列化 bytes 超過單檔 cap）；錯誤時不修改目前 notes、不建立 Blob/URL、不提供 partial download。

### FR-09 離開與資源清理

reset、來源確認替換、載入錯誤及 pagehide 都需 pause audio、移除 src/load、revoke 本應用建立的 object URL、清空舊 File 參照與音訊事件處理器。pagehide 不儲存工作區；未匯出內容會遺失。沒有定時自動過期或背景保存。

### FR-10 雙語導頁與可及性

繁中 /index.html、英文 /en/index.html 是獨立靜態頁，切換使用 anchor 完整導頁。每個語言連結旁標示「尚未匯出的筆記與播放工作區不會保留」。不用 Storage、query、hash 保存狀態。所有播放器、錯誤、進度、確認與 FAQ 提供雙語等價內容；筆記文字以 textContent 顯示。


---

## 原文件 TECHNICAL.md

# 技術契約：錄音時間戳筆記

## 執行環境與樹

Node.js 24 ESM、無 dependencies；不 npm install。繁中候選 /index.html，英文候選 /en/index.html，兩者 M1 都 noindex、nofollow、noarchive。Node 本機開發 server 綁 127.0.0.1:4231，只 serve public/。無 network upload、remote fonts、telemetry、Storage、ASR、轉檔。Browser check 明確 NOT_RUN_USER_FOCUS_INCIDENT。

    package.json
    public/index.html
    public/en/index.html
    public/css/app.css
    public/js/app.js
    public/js/ui.js
    public/js/audio-controller.js
    public/js/core/notes.js
    public/js/core/validate-json.js
    public/js/core/serialize-json.js
    public/js/core/serialize-markdown.js
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    test/notes.test.mjs
    test/import.test.mjs
    test/export.test.mjs
    test/state-cleanup.test.mjs

## Limits and exact algorithms

Constants: MAX_AUDIO_BYTES=67,108,864; MAX_NOTES=1,000; MAX_NOTE_UTF16=2,000; MAX_TOTAL_NOTE_UTF8=1,048,576; MAX_TITLE_UTF16=200; MAX_IMPORT_BYTES=4,194,304; MAX_EXPORT_BYTES_EACH=4,194,304; MAX_EXPORT_BYTES_BOTH=8,388,608; MAX_NOTE_ID=999,999,999,999. Count UTF-16 via string.length, and total text bytes via TextEncoder().encode(text).length. Do not normalize note text. Reject unpaired surrogates on JSON/Markdown UTF-8 serialization rather than silently replacing them. Blank-only note text is invalid. Workspace durationMs is a manually editable safe-integer timeline bound and must be >= max(note.timeMs), or 0 when there are no notes. Parse HH:MM:SS.mmm with 2–8 digit hours and exactly two minute, two second and three millisecond digits; minute/second are 00–59; reject overflow/non-safe result.

    durationToMs(seconds:number): number | {error:"invalid-duration"}

Requires finite seconds >=0; computes Math.floor(seconds*1000); result must be Number.isSafeInteger. For live/unknown/infinite duration refuse capture and seek.

    captureTimeMs(currentTime:number,durationMs:number): number | {error:"invalid-time"}

Requires finite currentTime >=0, safe integer durationMs >=0. Computes Math.min(durationMs, Math.round(currentTime*1000)) and verifies a safe integer. No floating timestamp is serialized.

    createDraft(timeMs:number,durationMs:number): Draft | Error
    validateNote(text:string,notes:Note[],excludingId?:string): {ok:true} | {ok:false,code:"NOTE_EMPTY"|"NOTE_TOO_LONG"|"NOTE_TOTAL_BYTES"|"NOTE_LIMIT"|"DURATION_RANGE"}
    formatNoteId(value:number): string | {error:"NOTE_ID_EXHAUSTED"}
    nextNoteIdCounter(notes:Note[]): number
    commitDraft(notes:Note[],draft:Draft,idCounter:number,text:string,durationMs:number): {notes,nextCounter} | {error:"NOTE_ID_EXHAUSTED"|"NOTE_EMPTY"|"NOTE_TOO_LONG"|"NOTE_TOTAL_BYTES"|"NOTE_LIMIT"|"DURATION_RANGE"}
    sortForDisplay(notes:Note[]): Note[]

Draft stores only captured timeMs, is not included in note quota or output, and is discarded on Cancel/source change/reset/pagehide. formatNoteId uses decimal String(value).padStart(6,"0") with note- prefix, for integer values 1..999,999,999,999. nextNoteIdCounter returns 1 for a new workspace, otherwise max numeric ID in imported notes + 1. commitDraft requires nonblank text and all quota constraints, then appends that monotonic ID; IDs are never reused in one workspace. If counter exceeds MAX_NOTE_ID return NOTE_ID_EXHAUSTED with no mutation. It validates constraints before mutation. sortForDisplay is stable by timeMs ascending, then original array position; JSON schema exports creation order.

## Input and file lifecycle

Reject a selected File above 64 MiB before making an object URL. accept="audio/*" is a UI hint only. Create an object URL from the selected File and assign only that blob URL to a single audio element. Set preload="metadata"; never set autoplay or call play except a direct user gesture on explicit play control. A canPlayType empty result may show early unsupported guidance, but media error remains authoritative; do not use filename or MIME as proof of decodability. Wait for loadedmetadata and validate duration through durationToMs. Handle error, abort, emptied and pagehide; revoke URL exactly once.

When replacing a source, do not pause or clear old state until the in-page confirmation is accepted. On cancel, discard the newly selected File reference and retain old state. On accept, invalidate the current job epoch, pause, remove src, call load(), revoke old object URL, clear old notes and listeners, then attempt the new source. On load failure, keep the failure message and no stale note workspace from the previous source.

## Exact JSON interfaces

Types:

    type Note = { noteId:string; timeMs:number; text:string }
    type ResultV1 = {
      schemaVersion:1,
      kind:"glossquote-audio-cue-notes",
      sourceTitle:string,
      durationMs:number,
      notes:Note[]
    }

Unknown root/note keys reject. Root required keys must appear with exact types; schemaVersion is numeric 1 and kind exact. durationMs is safe integer >=0. Each timeMs is safe integer in 0..durationMs. noteId is unique, matches /^note-[0-9]{6,12}$/, has numeric value 1..999,999,999,999, and equals "note-" + String(value).padStart(6,"0") (canonical representation); text is a string nonblank after trim. sourceTitle is nonempty, <=200 UTF-16 units, single-line and free of C0/C1 controls. Array order is creation order and remains unchanged on import. Validate file byte size <=MAX_IMPORT_BYTES before JSON.parse, decode fatal UTF-8 after optionally removing one leading BOM, then validate all notes and encoded aggregate size before exposing preview. Import never carries audio bytes or chooses a source file. If active audio is loaded, compare its activeAudioDurationMs to imported durationMs and warn before replacement; imported metadata remains authoritative until user edits it. Notes beyond active audio length remain valid in ResultV1 but are visibly out-of-range and cannot seek. If no audio is loaded, imported notes remain viewable/exportable; subsequent file selection offers explicit Attach-and-retain or Clear-and-start-new actions. After import set next ID to max imported numeric suffix + 1; if it exceeds MAX_NOTE_ID, future add returns NOTE_ID_EXHAUSTED without collision.

## Markdown serialization

    checkExportBytes(bytes:Uint8Array): Uint8Array | {error:"EXPORT_TOO_LARGE"}
    serializeMarkdown({sourceTitle,durationMs,notes}): Uint8Array | {error:"EXPORT_TOO_LARGE"|"INVALID_RESULT"}
    serializeJson(result:ResultV1): Uint8Array | {error:"EXPORT_TOO_LARGE"|"INVALID_RESULT"}

Require single-line sourceTitle <=200 UTF-16 units and no C0/C1 controls or unpaired surrogate. Sort a copy by timeMs ascending and array index. Format all values from integer milliseconds: if hour=0 output MM:SS.mmm; if hour>0 output HH:MM:SS.mmm with hours at least two digits. First line is # <sourceTitle>; second line Duration: HH:MM:SS.mmm; then a blank line; each note is [timestamp] text. Normalize CRLF and lone CR in note text to LF; prefix every subsequent line with four spaces. Use LF separators and one final LF when any note exists. Encode complete output to UTF-8 bytes without BOM; at most MAX_EXPORT_BYTES_EACH per file, else return EXPORT_TOO_LARGE before creating Blob or URL. JSON follows the same cap. The sum of the independently generated Markdown and JSON files for one Result must not exceed MAX_EXPORT_BYTES_BOTH. No HTML templating or parsing.

## UI state, cancellation, stale work

State: empty -> loading-source -> ready; ready can enter draft, editing-note, import-preview, replacing-source, or clearing; imported-only workspace can enter attach-preview or clear-and-start-new confirmation. A single draft carries immutable timeMs until Save/Cancel. Confirm cancel returns to prior state unchanged. Import/attach preview has its own monotonically increasing jobId; invalidating it on reset/new import/pagehide causes stale parse/load messages to be ignored. Keep activeAudioDurationMs separate from editable ResultV1.durationMs. If captured time exceeds result duration, require explicit action to set result duration to active audio duration before creating a draft; reject any edit that would make duration lower than max note time. Use a Worker for bounded JSON validation/serialization only if responsive UI requires it; no worker may hold a media URL or send a File over network. Synchronous validation within the 4 MiB import cap is acceptable; responsiveness remains a browser acceptance gate.

Reset, confirmed source replacement, import replacement, failed load and pagehide invalidate generations and release prior async work. pagehide pauses audio, removes src, calls load(), revokes URL, removes listeners, clears File/objectURL references and in-memory notes. No auto-expiry timer or auto-save. On export click, fully serialize to bytes and verify the 4 MiB cap before constructing a Blob; only then create an ObjectURL. Oversize output returns EXPORT_TOO_LARGE, with no partial Blob/URL/download. Export URLs are revoked after click/task cleanup.

## Scripts and claim limits

package scripts: dev=node scripts/serve.mjs, test=node --test, check=node scripts/check.mjs, build=node scripts/build.mjs. Build copies static public/ to dist/. Check scans for noindex, forbidden remote URL/storage/network usage, scripts and references; static scans are not a security proof. Browser/codec testing is not run. Do not claim the synthetic file can establish support for every browser codec.


---

## 原文件 UX-SEO.md

# 介面、雙語文案與搜尋摘要

## 語言頁面與搜尋資訊

繁中頁 /index.html 與英文頁 /en/index.html 是獨立靜態頁，語言切換為一般 anchor 導頁。每個語言連結旁須顯示「切換語言會離開本頁，尚未匯出的筆記與播放工作區會遺失」。不得用 storage、query、hash 保留狀態。兩頁都 noindex、nofollow、noarchive，不含 remote fonts、analytics 或第三方資源。

繁中 title：錄音時間戳筆記｜Gloss Tools

繁中 description：本機播放訪談或課程錄音，按一下記下目前時間與重點，點筆記回跳，下載或重新匯入筆記。

繁中 H1：邊聽錄音，邊記下時間戳

English title: Timestamped Audio Notes | Gloss Tools

English description: Play an audio file locally, capture notes at the current time, jump back to a note, and export or re-import your notes.

English H1: Take notes while listening to audio

繁中 FAQ：

- 會把錄音上傳嗎？不會，候選只從本機選取檔案並用瀏覽器播放。
- 所有音訊都能播放嗎？不一定；能否解碼取決於目前瀏覽器支援的格式，本工具不轉檔。
- 筆記會自動轉錄嗎？不會，所有文字都由你輸入。
- 匯出檔會包含音訊嗎？不會，JSON 僅含來源標題、長度 metadata 與筆記。
- 匯出有大小限制嗎？Markdown 和 JSON 各最多 4 MiB；超出時不會建立部分下載檔。
- 語言切換會保留目前工作嗎？不會；先匯出，否則切換後工作區會遺失。

English FAQ:

- Is my recording uploaded? No. The candidate selects and plays a local file in the browser.
- Can it play every audio file? No guarantee. Playback depends on the current browser's supported formats; this tool does not convert audio.
- Does it transcribe speech? No. You enter every note yourself.
- Does an export include audio? No. JSON contains only a source title, duration metadata, and notes.
- Are exports size-limited? Markdown and JSON are each capped at 4 MiB; an oversized export creates no partial download.
- Does switching language keep my work? No. Export first or the current workspace will be lost.

## 工作區線框

Desktop，至少 1024 CSS px：

    ┌───────────────────────────────────────────────────────────────┐
    │ Gloss Tools / 錄音時間戳筆記           繁中 | English         │
    │ 切換提醒：未匯出的筆記與播放工作區會遺失                    │
    ├───────────────────────────────────────────────────────────────┤
    │ [選擇音訊] 檔名／大小／播放狀態／來源標題／來源長度            │
    │ ┌───────────────────────────────────────────────────────────┐ │
    │ │ 原生 audio controls；明確播放，不自動播放                   │ │
    │ └───────────────────────────────────────────────────────────┘ │
    │ [記下此刻] 目前 00:12.345      [匯入 JSON] [清除全部]          │
    │ 新筆記 draft：[文字欄] [儲存] [取消]；來源長度可手動調整       │
    ├───────────────────────────────────────────────────────────────┤
    │ 筆記 12 / 1000       UTF-8文字量 123 / 1,048,576 bytes         │
    │ 00:12.345 [回到此刻] [編輯] [刪除]                             │
    │ 重點文字……                                                     │
    │ 00:28.100 [回到此刻] [編輯] [刪除]                             │
    ├───────────────────────────────────────────────────────────────┤
    │ [下載 Markdown] [下載 JSON]                                   │
    │ 匯入預覽／duration 不同警告／替換確認位於此區域                 │
    └───────────────────────────────────────────────────────────────┘

Mobile，320–767 CSS px 單欄順序：音訊選擇、標題/來源長度與狀態、播放器、記下此刻與 draft 儲存/取消、匯入/清除、筆記摘要、筆記列、下載。按鈕觸控區不小於 44 CSS px 高，時間、內容與動作分行，不水平捲動。播放回跳按鈕只 seek 不 autoplay。筆記內容長時自然換行，編輯欄位有 label；錯誤和 duration mismatch 以文字提示而非只用顏色。檔案選取使用標準網頁 input，不觸發額外原生 dialog。沒有音訊但有匯入筆記時，選檔提供「附加並保留筆記」及「清除並開始新工作」兩個清楚選項。

## 狀態文案與安全呈現

繁中/English 兩頁需分別提供：metadata 載入中、可新增筆記、瀏覽器無法播放、音訊時間無效、筆記超過目前音訊長度、匯入預覽、長度不同、取消替換、格式/大小錯誤、清除確認、播放已暫停等狀態。來源標題與筆記只能用 textContent 呈現。使用者輸入不得變成 HTML、連結、script 或 remote resource。

## 實際瀏覽器狀態

M1 瀏覽器 UI、檔案選取及 codec 播放檢查為 NOT_RUN_USER_FOCUS_INCIDENT。Node CLI 與合成資料無法驗證真實瀏覽器播放；沒有真正隔離且經主代理驗證的檢查途徑前，不宣稱瀏覽器通過。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：錄音時間戳筆記

## Job / Result / Contract / Oracle

Job：使用者本機聽一段訪談或課程音訊，在當下記錄時間與文字，再用筆記回跳。

Result：以整數毫秒標記、可編輯和刪除的筆記，能下載 Markdown/JSON，並能從 JSON 預覽和確認恢復。

Contract：一個本機音訊檔最大 64 MiB，只支援目前瀏覽器能解碼者；不轉檔、不做 ASR、不上傳。最多 1,000 筆、每筆 2,000 UTF-16 code units、合計 1 MiB UTF-8 筆記文字。noteId canonical 6–12 digits、1..999,999,999,999，匯入後從最大 ID+1 接續。JSON schema 1 僅存可編輯來源標題/duration metadata 和筆記；JSON import 最多 4 MiB。Markdown/JSON 各最多 4 MiB、合計最多 8 MiB，超限零部分 Blob。匯入先預覽並確認替換，duration mismatch 要警告。換來源先確認，取消保留舊資料；沒有 audio 但有 imported notes 時另提供明確 attach-and-retain。播放必須由使用者明確操作；pagehide pause/revoke。

Oracle：currentTime=12.345 秒按記下此刻建立 draft 得 timeMs=12345；Save 後 Markdown 標記為 [00:12.345]。相同 timestamp 的兩筆保持建立順序。新檔替換提示取消後原音訊、時間與筆記仍一致。

## 精確驗收案例

1. 選取恰 67,108,864 bytes 的 synthetic File 可開始 metadata load；多一 byte 在 createObjectURL 前拒絕並保留舊工作區。
2. accept audio/* 只作選擇提示；未知 MIME 或副檔名不自動視為可播。canPlayType 空字串可提示，實際 media error 必須安全結束且不殘留舊來源。
3. 音訊 duration=123.4569 秒時 activeAudioDurationMs=floor(123456.9)=123456；Infinity、NaN、負值或乘 1000 後不安全整數拒絕時間功能，初始 workspace durationMs 也為 123456。
4. currentTime=12.345 秒且 active/workspace duration 足夠，captureTimeMs=12345；currentTime 非有限、負值拒絕；超過 active audio 的 round 結果 clamp 至 activeAudioDurationMs。
5. 沒有載入完成的音訊時「記下此刻」停用；播放只在明確點播放控制後啟動，不 autoplay。
6. 按「記下此刻」建立 timeMs 固定的未提交 draft 並聚焦文字欄；draft 不計 quota、不出現在匯出。按 Cancel 丟棄；按 Save 才提交。
7. 新增非空文字時 noteId 首筆為 note-000001，timeMs 為整數，原文字不 trim 或 Unicode normalize；純空白拒絕。
8. duration metadata 欄以 HH:MM:SS.mmm 輸入；只有安全整數且不小於最大 note.timeMs 才接受，無效或不足則拒絕。播放點超過 metadata duration 時，須先明確按「採用目前音訊長度」才可繼續記錄。
9. 一筆文字恰 2,000 UTF-16 units 接受；2,001 拒絕且既有資料不變。包含 supplementary character 時按 JS UTF-16 units 計數，不誤用 Unicode code point 數。
10. 總筆數 1,000 接受；第 1,001 筆拒絕。合計 TextEncoder UTF-8 bytes 恰 1,048,576 接受，多一 byte 拒絕，不刪除或截斷舊筆記。
11. 刪除筆記後下一筆 noteId 遞增且不重用已刪 ID；修改文字須重新驗證單筆與總量。
12. 同 timestamp 連續新增 A、B，列表、Markdown 時間排序及 JSON 建立順序皆讓 A 在 B 前。
13. 點筆記回跳將 currentTime 設為 timeMs/1000，不呼叫 play；超出目前音訊 duration 的 imported note 仍展示文字，標示 out-of-range 並停用 seek。
14. Markdown 對 12,345ms 輸出 [00:12.345]；3,723,004ms 輸出 [01:02:03.004]。duration 標頭採 HH:MM:SS.mmm；輸出 UTF-8 無 BOM、LF 行尾。
15. Markdown 文字中有換行時，CRLF/CR/LF 全轉為 LF，每續行前加四格縮排；標題為單行，不允許 CR/LF/C0/C1 controls。輸入文字如 <script> 僅作純文字，不能執行或建立元素。
16. JSON 輸出 root 欄位精確且有序：schemaVersion、kind、sourceTitle、durationMs、notes；每筆只含 noteId、timeMs、text。不得含 file bytes、Blob URL、MIME、file path、lastModified 或 audio data。
17. JSON notes 陣列按建立順序，而非時間排序；重新匯入後保留陣列順序及 ID，列表和 Markdown 再按時間穩定排序。
18. JSON 匯入恰 4,194,304 bytes 仍可驗證；多一 byte 拒絕。無效 UTF-8、超過一個 BOM、JSON 語法錯誤、未知欄位或欄位缺失整份拒絕。
19. schemaVersion/kind 不符、錯誤欄位型別、重複 noteId、noteId pattern 不符、超標題／筆記／總 bytes／筆數上限、超 duration 時間皆拒絕整份，工作區不變。
20. 匯入 valid JSON 時先出摘要 preview；必須按「替換目前筆記」才修改。取消或關閉 preview 保留目前來源、播放位置和所有 notes。
21. JSON durationMs 與載入音訊 activeAudioDurationMs 不同時，替換確認前清楚列出兩個毫秒值；取消不改資料，確認匯入後超出實際音訊的 notes 標記並停用 seek；workspace duration metadata 保持 JSON 值。
22. 無 active audio 但有 imported notes 時選檔，確認「附加並保留筆記」保留 notes/sourceTitle/durationMs，並按新 audio 長度標記 seek 範圍；「清除並開始新工作」則重建空 workspace；取消兩者均保留現況。
23. 對已有 active audio 的 workspace 選新檔，先確認替換；取消時新選檔不建立 URL，舊來源、時間、筆記不變；確認後舊媒體 pause、src 移除、URL revoke、notes 清除，再載入新來源。
24. 載入新音訊失敗後顯示 error、移除 failed src 並 revoke URL；舊音訊不復活、舊筆記不混入失敗新工作區。
25. reset、確認替換、pagehide 會 pause、remove src、load、revoke URL 一次、解除 handlers、清空 File/objectURL/notes references；不得自動儲存。
26. 從編輯到匯出期間工作區保持記憶體內；沒有 15 分鐘逾期。只有清除、來源確認替換、匯入確認替換與 pagehide 結束資料生命週期。
27. 打開繁中頁 title/description/H1/FAQ 為繁中，英文頁相同資訊與所有操作、限制、警告為英文。
28. 語言連結使用普通 anchor，旁有未匯出工作將遺失提醒；頁面不使用 storage、query 或 hash 傳遞工作區。
29. 320px mobile 單欄不水平溢位；桌面至少 1024px 可同時看見播放器和筆記工作區，鍵盤可達所有控制與可讀錯誤。
30. node test/check/build 使用 fake metadata/core functions，不讀使用者媒體，不 npm install、不啟動 server、不產生 network request。
31. 真實音訊 codec、瀏覽器 UI、檔案 input 與焦點行為一律記 NOT_RUN_USER_FOCUS_INCIDENT，不能以 Node synthetic test 標 PASS。
32. noteId suffix 6–12 位、canonical zero-padding 且 numeric 1..999,999,999,999；note-000001、note-1000000 accepted，note-000000、note-0000001（非 canonical）、13 位及超上限皆拒絕。匯入 note-000042 後下一筆是 note-000043；刪除已存在 ID 不回收。匯入最大 ID 後新增回 NOTE_ID_EXHAUSTED，原 notes 不變且不碰撞。
33. 共同 export byte-limit guard 對 JSON 與 Markdown 都接受 4,194,304 bytes、拒絕 4,194,305 bytes。JSON serializer 用多筆 U+0001 合成 valid ResultV1 fixture 驗證 escaping 後 bytes 與 EXPORT_TOO_LARGE 全路徑。Markdown 以大量合法換行 fixture 驗證四空格縮排造成的序列化膨脹：合法來源不保證輸出低於 cap；超限完整拒絕且不建立部分 Blob/ObjectURL/下載，不截斷或改寫筆記。另驗證未超限內容正常輸出；保留使用者工作區以供改用可輸出的 JSON 或縮減內容。
34. JSON import 接受最多 4,194,304 bytes 以支援最大有效 JSON export；JSON/Markdown 各自輸出 ≤4 MiB，因此兩種輸出 bytes 合計 ≤8,388,608 bytes。任何輸出超限都不覆寫先前結果、不建立部分 Blob。

## 命令與證據

Node.js 24、Windows PowerShell，於產品目錄執行：

    node --version
    node --test
    node scripts/check.mjs
    node scripts/build.mjs

實際記錄各命令 stdout/stderr 摘要及退出碼。測試使用人工合成的 metadata、notes 與 JSON；不播放使用者音訊。若 Node 24 不可用，記 BLOCKED 並寫明實際版本，不能用其他版本冒充 M1 通過。M1 目標完成前不宣稱 browser/codec acceptance。


---

## 原文件 TASKS.md

# 實作任務：錄音時間戳筆記

M1 candidate 僅使用 Node.js 24 ESM、內建模組與標準瀏覽器 API。禁止 npm install、runtime dependencies、網路、browser automation、公開 repository、push、hosting、deploy；M2 由主代理另行安排。不可修改本資料夾六份規格以改變驗收範圍。

## T00 — Scaffold

- 建立 package.json scripts dev/test/check/build，零 dependencies；配置 .gitignore，不忽略需審閱的 source docs。
- 建立 TECHNICAL.md 的 public、scripts、test 路徑樹。
- 建立繁中 /index.html 和英文 /en/index.html 獨立靜態頁，普通 anchor 導頁，語言連結旁顯示未匯出資料會遺失；不用 storage/query/hash。
- 建立 script 及 content noindex、nofollow、noarchive metadata。Node dev server 固定 127.0.0.1:4231 且僅服務 public/；不要啟動。
- 建立離線 check 與 build，build 只複製 public 到 dist。

## T10 — Core notes 與 serializers

- 實作 durationToMs、captureTimeMs 的精確整數/安全範圍規則。
- 實作 Note model、1,000 筆/單筆字元/總 UTF-8 bytes 驗證、穩定 timestamp sorting、單調且不重用的 noteId。
- noteId 僅 canonical 6–12 位、數值 1..999,999,999,999；import 從最大 ID+1 接續，耗盡回 NOTE_ID_EXHAUSTED。
- 實作嚴格 JSON schema 1 import validation、preview model、UTF-8 export；拒絕未知 keys、非法 schema、大小/型別/時間/字數越限。
- JSON import cap 4 MiB；Markdown/JSON 各 4 MiB、兩者合計 8 MiB；serialize bytes 後再檢查上限，超限不建 Blob/URL、不產生部分檔。
- 實作 Markdown 時間格式及換行處理；user text 全程按純文字處理。
- 加入合成單元測試，對照 ACCEPTANCE.md 3–19。

## T20 — Audio lifecycle 與狀態

- 使用 HTMLAudioElement、preload=metadata 及 Blob URL 處理一個 File；先檢查 64 MiB，再建 URL。無 autoplay。
- metadata loaded 後驗證 finite duration；載入錯誤安全報告。不用 MIME/副檔名當 codec 成功證據。
- 實作來源替換確認、取消原狀不變、接受後 pause/remove/load/revoke/clear 的生命週期。
- 實作 import preview、明確替換、duration mismatch 提示與 out-of-range notes 標記；取消不得修改原工作區。
- 實作 pagehide/reset/failed load 清理與 async generation 檢查，測試 stale import/media events 不復活舊狀態。

## T30 — 可操作雙語工作區

- 完成兩語的本機音訊選擇、標題編輯、播放控制、記下此刻、筆記編輯/刪除、回跳、import preview/replace、Markdown/JSON downloads、clear confirmation。
- 所有狀態、限制、錯誤與確認文案雙語對等；用 textContent 呈現標題/notes。
- 完成桌面工作區與 320–767px mobile 單欄版面、鍵盤焦點/labels/error association；不測真實瀏覽器。
- 確認語言頁普通導頁與旁邊的未匯出狀態遺失提醒，頁面不加入 storage/query/hash。

## T40 — Wrap-up 與 M1 驗證

- 對最終版本執行 ACCEPTANCE.md 列出的 node --version、node --test、node scripts/check.mjs、node scripts/build.mjs，逐項保存實際退出碼與輸出摘要。
- 修正範圍內缺陷後重跑受影響命令；檢查 build 結果為靜態 candidate，變更僅在允許實作路徑。
- 不啟動 server、browser 或 native UI；codec/UI 結果記 NOT_RUN_USER_FOCUS_INCIDENT。
- HANDOFF、TASK-ENTRY/evidence/m1 由主代理更新；spec files 保持固定。
- 停在 M1 candidate，不建立/推送公開 GitHub repo、不部署、不公開 catalog。交主代理進行下一階段安排。

