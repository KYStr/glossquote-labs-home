# 多檔 SHA-256 清單校驗 / Batch SHA-256 Manifest Check

文件版本 1 · 2026-11-11。規格 ID `spec-batch-sha256-manifest-20261111`。本文件與 [固定研究 brief](BRIEF.md)、[字面案例](fixtures.json) 及 [作者檢查](AUTHOR-CHECK.md) 一起交驗。

## goal — 目標

學校行政助理在 Windows 桌面瀏覽器收到一批同層會議附件和同事另傳的 `SHA256SUMS`。助理貼上或選取清單，再選取附件，一次定位漏件、額外檔與同名內容不符，並帶走 `sha256-manifest-report.json` 供交付方用相同清單及檔案重做。手機可檢視、篩選和下載小批次結果。以桌面選取數十件檔案。

每個清單項及每個額外檔都有唯一結果。所有清單項都有同名所選檔、雜湊一致，且沒有額外檔或讀取失敗時，顯示「所選檔案與清單完全相符」／“All selected files match the manifest”。這句話的範圍是使用者提供的清單與瀏覽器所讀的位元組。畫面及下載同一報告，交付方可比較名稱、大小、預期碼及實際碼。

與現有工具的差別有可核對的來源。

- 檔案 SHA-256 校驗收一個檔案及一組可選預期碼，輸出單行 hash。 [單檔控制器](https://github.com/KYStr/glossquote-labs-file-checksum/blob/eab1da8e69e896be00ff1be54095641352a280a7/public/js/controller.mjs)
- 重複檔案找出來對所選集合按大小、雜湊及位元組分群，報告 keeper／duplicate。 [分群核心](https://github.com/KYStr/glossquote-labs-duplicate-files/blob/32bae23bcfc9753cb60756ff9ef2381219565f67/public/js/core/analyze.js)
- 封存成員路徑預檢接收路徑文字，輸出路徑政策與樹狀衝突。 [固定候選核心](https://github.com/KYStr/glossquote-labs-home/blob/5f788db4bef205c24095b755a626237116eb408e/tools/archive-path-preflight/public/js/core/validate.mjs)
- 終端的 `sha256sum --check SHA256SUMS` 可以核對清單所指名的檔案。助理仍需要在所選集合內盤點額外檔。本工具用外部預期集合、所選集合與精確 basename 配對產出同一份報告。 [GNU SHA-2 工具](https://www.gnu.org/software/coreutils/manual/html_node/sha2-utilities.html)

## scope — 範圍

| 項目 | 首版契約 |
| --- | --- |
| 清單 | 貼上純文字或選一個 UTF-8 清單檔，來源互斥。GNU untagged SHA-256 單層清單子集。1–200 列，原始 1–65,536 bytes，允許一個開頭 BOM。 |
| 待核對檔 | 0–200 個 File，每個 0–33,554,432 bytes，所選集合合計最多 134,217,728 bytes。每次多選替換整批，可移除單項。 |
| 名稱 | 精確 basename，1–255 UTF-8 bytes，清單及所選集合各自唯一。大小寫、Unicode 及內部空格依原值。 |
| 結果 | 相符、雜湊不符、清單有但未選、已選但清單無、讀取失敗。提供待處理篩選及同一完整 JSON 下載。 |
| 環境 | 兩語靜態 Product App。HTTPS，或開發時瀏覽器認可為 secure context 的 loopback。初始靜態資產載入完成後，解析、開始、取消、重試、改檔、下載都可離線。 |
| 平台 | Windows 的 Chrome、Edge 為主要選檔情境。以代表性的 iOS Safari 或 Android Chrome 驗證小批次檢視、選檔及下載，並在代表性低記憶體裝置量測。候選提供實際版本、OS、裝置及測試限制。 |
| 資料 | 清單、檔案引用與報告留在頁面及 Worker 記憶體。下載由使用者觸發。資料不上傳、不持久化、不執行。 |

排除掃描目錄、開啟封存檔、判定檔案安全或來源可信度、簽章、合併同名、寫回檔案及建立新清單。輸入文法只承諾下文列明的子集，包含模式字元的辨識。瀏覽器以原始位元組校驗所有配對。 [GNU untagged 格式](https://www.gnu.org/software/coreutils/manual/html_node/cksum-output-modes.html)

## userFlow — 使用流程

### 版面與互動

```text
桌面   [多檔 SHA-256 清單校驗]                  [English] [繁中首頁]
       清單來源 [貼上清單文字            ] [選取清單檔]
       所選檔案 [選取多個檔案]  件數、bytes、逐件移除
       [核對整批]  [使用合成範例]  [重設]  狀態／取消
       結果摘要    [全部／待處理] [下載 JSON 報告]
       預期清單（表格）             額外檔案（表格）

320px  清單來源 → 多選檔案 → 核對整批與狀態
       結果摘要 → 篩選與下載 → 預期清單 → 額外檔案
```

使用共用 paper、ink、可見控制邊界、系統字體與焦點權杖。控制及結果都在主畫布，欄位旁有可見標籤、說明及相關錯誤。320 CSS px 時採直排，長檔名可折行，表格各自在具名、可鍵盤捲動的區域內。欄名、下載及重試可達。預期清單保留原順序，額外檔案按所選順序。待處理只隱藏 `match` 列。篩選不重新核對，也不裁剪下載內容。

| 功能或狀態 | 繁中 | English |
| --- | --- | --- |
| 選來源 | 貼上清單文字／選取清單檔 | Paste manifest text / Choose manifest file |
| 選檔、開始 | 選取多個檔案／核對整批 | Choose files / Check batch |
| 初始空白 | 貼上或選取 SHA256SUMS，再選要核對的檔案。 | Paste or choose a SHA256SUMS manifest, then choose files to check. |
| 零選檔 | 目前選取 0 件。核對後會列出所有缺件。 | No files selected. Checking will list every manifest entry as missing. |
| 合成例 | 使用合成範例 | Load sample data |
| 預檢／執行 | 正在檢查清單與所選檔案／已處理 {completed}／{total} 件配對 | Checking the manifest and selected files / Checked {completed} of {total} matched files |
| 取消／重設 | 取消核對／重設 | Cancel check / Reset |
| 已取消 | 已取消。清單與所選檔案已保留，可重新核對。 | Check cancelled. Your manifest and files are ready to check again. |
| 草稿已變更 | 資料已更新。請重新核對。 | Inputs changed. Check the batch again. |
| 結果欄 | 相符／雜湊不符／清單有但未選／已選但清單無／讀取失敗 | Match / Checksum mismatch / Missing from selection / Extra selected file / Read error |
| 結果篩選 | 全部／待處理 | All / Needs attention |
| 無待處理列 | 沒有待處理項目。 | No items need attention. |
| 下載 | 下載 JSON 報告 | Download JSON report |
| 出檔資料說明 | 報告含檔名、大小及校驗碼。 | The report includes filenames, sizes, and checksums. |
| 下載請求／錯誤 | 已請求下載／無法建立下載，請重試。 | Download requested / Could not start the download. Try again. |

合成範例使用 [主案例](fixtures.json) 的清單及三件合成 File。載入一次替換兩個草稿輸入，文字來源標為 textarea，等待使用者按核對。File 輸入不設目錄選取，清單檔不限副檔名。原生選檔取消、焦點移動、選取文字和未改值的輸入不改草稿。輸入變更時同步撤銷舊報告與下載。忙碌時提供實際取消，仍可替換輸入，後者先終止當前執行。清單和檔案驗證失敗保留草稿與位置。欄位錯誤關聯至該輸入，列和件位置用可見文字指出，完成狀態用 `role=status`／適度合併的 polite 通知。焦點只在錯誤定位或使用者動作需要時移動，忙碌時不反覆移動。

### 貼上、編輯與可見來源

1. 文字草稿保存 `raw`、`origin`（`paste` 或 `textarea`）及投影。投影把 CRLF 和裸 CR 顯示成一個 LF，保留顯示 UTF-16 邊界到原始 UTF-16 偏移的映射。各欄以這一份草稿和投影呈現，檢核與 byte 計數讀 `raw`。
2. 在清單文字欄的使用者 paste 事件，讀這次事件的 `clipboardData.getData('text/plain')`，只在提供該 MIME 時受理。取消預設插入並由控制器置換。若 textarea 當前值和投影不同，當次直接以畫面文字作為置換基底。映射 `selectionStart`／`selectionEnd` 後用事件原文替換原始範圍，再投影回 textarea。游標置於插入結尾，若剛落在新組成的 CRLF 中間則置於換行後。受理一次 paste 只更新一次世代。事件沒有純文字時保留草稿，顯示「這次貼上未提供純文字」／“This paste did not provide plain text”。純文字值為空仍可取代選區。
3. 受理貼上立即停用舊下載，標示「依貼上原始換行核對」／“Checking with the pasted line endings”。若裸 CR 進入草稿，錯誤指出實體列及「原始換行為單獨 CR」／“The pasted line ends with a bare CR”。未變更 textarea 值的 input、選取及同值投影回寫均保留 `raw`。同一顯示值上的另一次貼上仍可改變 `raw`，依新的原始 bytes 驗證。
4. 後續 input 真正改變 textarea 值時，以完整的當前 `textarea.value` 取代 `raw`，包括 textarea 所使用的 LF，切換為「依畫面編輯文字核對（LF）」／“Checking the edited text shown here (LF)”，同步清掉舊結果。按核對前也比較投影與當前值，若不同，以畫面文字更新草稿並直接開始，整次開始動作只更新一次世代。改用清單檔時丟掉文字草稿，以檔案原始 bytes 為準。事件只提供瀏覽器交付的字串，清單檔來源提供原始文件 bytes。 [HTML textarea 的值](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element) · [Clipboard Event API](https://www.w3.org/TR/clipboard-apis/#overriding-the-paste-event)

## inputsOutputs — 輸入、預檢及報告

### 精確文法

- 數量、長度、索引及 size 均為整數，檔案位置及實體列從 1 起算。以 bytes 計容量，不做四捨五入。畫面可用 locale 數字格式，JSON 用十進位整數。
- 選檔的清單依 File.size 先驗上限再讀。一次讀取，長度必須等於宣告大小。用 `new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })` 解碼，保留 BOM 供統一處理。文字計數以 `TextEncoder.encode(raw).byteLength`，若 `raw.length > 65_536` 可直接超限，原始字串仍供錯誤定位。即使編碼計數將孤立代理碼元計為 U+FFFD 的 3 bytes，後續名稱檢驗仍看原始字串並拒絕該碼元。兩種來源的 byte 上限均包含 BOM 及換行。
- 解碼後只移除開頭一個 U+FEFF。以 LF 定實體列，LF 前的一個 CR 屬 CRLF 終止符。最後一個 LF／CRLF 後的分割尾項省略，其前若另有空列仍驗。末列可無終止符，末尾無 LF 的 CR 是裸 CR。LF／CRLF 可混用。去 BOM 後的空字串回 `MANIFEST_EMPTY`。
- 每列以 64 個 ASCII `[0-9A-Fa-f]`、一個 ASCII 空格、模式字元（ASCII 空格或 `*`）及完整檔名組成。模式字元只驗文法，預期 digest 轉小寫。行首反斜線辨識 GNU 跳脫。行首符合 `^[A-Za-z0-9_-]+ \(` 的 tagged 形式回 tagged 錯誤。NUL 與裸 CR 均有獨立錯誤。
- 檔名禁 `/`、反斜線、冒號、C0（U+0000–001F）、DEL（U+007F）、C1（U+0080–009F）、孤立 UTF-16 代理碼元、ASCII 空格首尾，以及完整值 `.`、`..`、`-`。其餘值依原始 Unicode 字串配對。UI 對允許但不易見的 U+00AD、U+034F、U+061C、U+180E、U+200B–200F、U+2028–202E、U+2060–206F、U+FEFF 顯示小寫 `\uXXXX` 轉義。原始名稱保留在 JSON。無效來源預覽也轉義控制碼與孤立代理碼元，顯示一律用文字節點。
- 每側使用自己的 Map 驗唯一性，以第一個已通過該側名稱驗證的位置回報重名。大小寫和 Unicode 正規化（包含 NFC/NFD）不改動。模式、MIME、mtime 及 File API 沒有提供的實體路徑不參與配對。

### 首錯順序與欄位

核心成功回 `{ok:true,report}`。失敗回 `{ok:false,error}`。`error` 僅有依序六鍵 `code, field, line, fileIndex, firstLine, firstFileIndex`。`field` 為 `"manifest"`、`"files"` 或 `null`。各位置是 1-based 整數，無適用位置時為 `null`。重名回目前及第一次的位置。輸入、Worker 故障均不回傳部分報告。逐檔 File 讀取錯誤使用報告中的 `read_error`。

按下列順序，找到第一個錯誤即停止。清單逐列檢查先於所選檔名稱與尺寸。所有預檢完成才可讀任何待核對檔。

| 次序 | 錯誤碼 | 位置 |
| --- | --- | --- |
| 1 | `INPUT_SCHEMA`（輸入或訊息外層結構不符）／`MANIFEST_REQUIRED`（沒有來源） | 結構 field=null，無來源 field=manifest |
| 2 | `ENV_UNAVAILABLE`（secure context 或必要 API 缺失）／`WORKER_START_FAILED`（建 Worker、初始化或送出請求失敗） | field=null |
| 3 | `MANIFEST_SIZE_INVALID`（清單檔 size 不是非負安全整數）／`MANIFEST_BYTES_LIMIT`（大於 65,536） | field=manifest |
| 4 | `MANIFEST_READ_FAILED`（清單檔讀取拒絕、回型別或長度不符）／`MANIFEST_UTF8`（fatal 解碼失敗） | field=manifest |
| 5 | `MANIFEST_EMPTY`（0 bytes 或去 BOM 後空）／`MANIFEST_ROWS_LIMIT`（實體列大於 200） | field=manifest |
| 6 | 每個實體列依序 `MANIFEST_NUL`、`MANIFEST_BARE_CR`、`MANIFEST_BLANK_LINE`（長度 0）、`MANIFEST_ESCAPED`、`MANIFEST_TAGGED`、`MANIFEST_ROW_FORMAT`（hash、分隔空格或模式錯） | field=manifest，line |
| 7 | 同一列接續 `MANIFEST_NAME_EMPTY`、`MANIFEST_NAME_INVALID`（禁字元、保留名稱、孤立代理碼元或首尾 ASCII 空格）、`MANIFEST_NAME_LIMIT`、`MANIFEST_DUPLICATE`。一列通過第 6、7 項才查下一列。 | field=manifest，line，重名另帶 firstLine |
| 8 | `FILES_LIMIT`（選取超過 200 件）。再依選取順序檢 `FILE_METADATA`（name 非字串、size 非非負安全整數），同件接著檢 `FILE_SIZE_LIMIT`（大於 33,554,432）。 | field=files，個別檔錯誤帶 fileIndex |
| 9 | `FILES_TOTAL_LIMIT`（合計大於 134,217,728） | field=files |
| 10 | 選取順序逐件檢 `FILE_NAME_EMPTY`、`FILE_NAME_INVALID`、`FILE_NAME_LIMIT`、`FILE_DUPLICATE` | field=files，fileIndex，重名另帶 firstFileIndex |
| 執行 | `DIGEST_FAILED`（配對檔讀取成功但 digest 拒絕或輸出長度異常） | field=files，fileIndex |
| 執行 | `WORKER_FAILED`（執行中 error/messageerror）／`WORKER_PROTOCOL`（當前 Worker 訊息不合契約） | field=null |

第 1 項的資料形狀檢驗只看 outer envelope、來源 discriminant、必要型別和允許的鍵。沒有來源時直接顯示錯誤，Worker 建立次數為零。第 8 項檢每件檔案 metadata。缺少主頁瀏覽器能力時在第 2 項結束，Worker 建立次數為零，UI 提供重試。清單檔 size=0 直接判空，讀取次數為零。已知 FileList 超過 200 件時以 count 記號送入預檢，選取尺寸欄顯示不可用，不把該清單的 File 逐件複製到 Worker。

### 可見錯誤詞句

清單列錯誤在下列原因前顯示「清單第 {line} 列」／“Manifest line {line}”。選檔錯誤前顯示「所選第 {fileIndex} 件」／“Selected file {fileIndex}”。重名原因含第一次位置。可重試的 Worker、環境及讀取錯誤保留草稿，對應欄位可直接換來源或重試。

| 代碼 | 繁中原因 | English reason |
| --- | --- | --- |
| INPUT_SCHEMA | 無法使用目前的清單或選檔資料。請重新選擇。 | The current manifest or selection could not be used. Choose it again. |
| MANIFEST_REQUIRED / MANIFEST_EMPTY | 請加入清單／清單是空的。 | Add a manifest. / The manifest is empty. |
| MANIFEST_SIZE_INVALID / MANIFEST_READ_FAILED / MANIFEST_UTF8 | 清單檔大小無法讀取／清單檔讀取失敗／清單必須是有效 UTF-8。 | Could not determine the manifest size. / Could not read the manifest file. / The manifest must be valid UTF-8. |
| MANIFEST_BYTES_LIMIT / MANIFEST_ROWS_LIMIT | 清單超過 64 KiB／清單超過 200 列。 | The manifest exceeds 64 KiB. / The manifest has more than 200 lines. |
| MANIFEST_NUL / MANIFEST_BARE_CR / MANIFEST_BLANK_LINE | 含 NUL 字元／有單獨 CR，請使用 LF 或 CRLF／空白列。 | Contains a NUL character. / Contains a bare CR. Use LF or CRLF. / Blank line. |
| MANIFEST_ESCAPED / MANIFEST_TAGGED / MANIFEST_ROW_FORMAT | GNU 跳脫格式不支援／tagged 格式不支援／需 64 位十六進位碼、空格及模式字元。 | GNU escaped format is unsupported. / Tagged format is unsupported. / Use 64 hexadecimal characters, a space, and a mode character. |
| MANIFEST_NAME_EMPTY / FILE_NAME_EMPTY | 檔名缺少。 | Filename is missing. |
| MANIFEST_NAME_INVALID / FILE_NAME_INVALID | 檔名含不支援的字元、空格、路徑或保留名稱。 | The filename contains an unsupported character, space, path, or reserved name. |
| MANIFEST_NAME_LIMIT / FILE_NAME_LIMIT | 檔名超過 255 UTF-8 bytes。 | The filename exceeds 255 UTF-8 bytes. |
| MANIFEST_DUPLICATE / FILE_DUPLICATE | 檔名已出現在清單第 {firstLine} 列／所選第 {firstFileIndex} 件。 | The filename already appears on manifest line {firstLine}. / The filename already appears in selected file {firstFileIndex}. |
| FILES_LIMIT / FILE_METADATA / FILE_SIZE_LIMIT / FILES_TOTAL_LIMIT | 選取超過 200 件／無法取得檔名或大小／單檔超過 32 MiB／所選檔案合計超過 128 MiB。 | More than 200 files selected. / Could not read the filename or size. / This file exceeds 32 MiB. / The selection exceeds 128 MiB. |
| ENV_UNAVAILABLE | 目前環境無法在本機校驗，請以支援安全連線的瀏覽器開啟。 | Local verification is unavailable here. Open this page in a browser with a secure connection. |
| WORKER_START_FAILED / WORKER_FAILED / WORKER_PROTOCOL / DIGEST_FAILED | 本機校驗未完成，已保留草稿。請再試一次。 | Local verification did not finish. Your inputs are still here. Try again. |

### 報告 schema 與字面 bytes

`schemaVersion` 固定為 `1`，`algorithm` 固定為 `"SHA-256"`。物件插入順序為 `schemaVersion, algorithm, exactMatch, counts, rows`。`counts` 依序 `match, mismatch, missing, unexpected, read_error`，每個值是該狀態列數，五項和等於 `rows.length`。`rows` 先放所有 manifest 順序的列，再按 FileList 選取順序追加未配對檔。單列精確欄位順序為 `name, status, sizeBytes, expectedSha256, actualSha256`。

| status | name | sizeBytes | expectedSha256 | actualSha256 |
| --- | --- | --- | --- | --- |
| `match` | 清單原名 | 所選 File.size | 小寫 64 hex | 同一小寫值 |
| `mismatch` | 清單原名 | 所選 File.size | 小寫 64 hex | 不同的小寫值 |
| `missing` | 清單原名 | `null` | 小寫 64 hex | `null` |
| `unexpected` | 所選原名 | 所選 File.size | `null` | `null` |
| `read_error` | 清單原名 | 所選 File.size | 小寫 64 hex | `null` |

`exactMatch` 僅在每列 `match` 時為 true。報告最多 400 列。下載 MIME `application/json;charset=utf-8`，檔名固定 `sha256-manifest-report.json`。輸出為 `JSON.stringify(report) + "\n"`，以 UTF-8 儲存，無 BOM。使用者檔名及文字永遠不能當 URL、markup、程式、HTML 屬性名稱或實體路徑。

[字面案例](fixtures.json) 的 `main-batch` 完整報告及下載字串由固定 brief 的三個預期項和三個選取項推導。結果次序 `notes.txt, agenda.txt, empty.txt, extra.txt`，read 和 digest 都只打到所選位置 `3, 2`。下載 846 bytes，SHA-256 為 `ce2119748c04ce50cb99c49bafdcc470b707edf34f6e5f415bc8d09b9c137fa8`。下列是另一完整字面下載，資料為清單唯一 `empty.txt` 及實際 0-byte 同名檔，顯示後另附一個 LF。

```json
{"schemaVersion":1,"algorithm":"SHA-256","exactMatch":true,"counts":{"match":1,"mismatch":0,"missing":0,"unexpected":0,"read_error":0},"rows":[{"name":"empty.txt","status":"match","sizeBytes":0,"expectedSha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","actualSha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}]}
```

清單第二列重複第一列的名稱且文法有效時，錯誤字面為以下值，下載停用。

```json
{"ok":false,"error":{"code":"MANIFEST_DUPLICATE","field":"manifest","line":2,"fileIndex":null,"firstLine":1,"firstFileIndex":null}}
```

## implementation — 核心、Worker 與控制器

### 檔案責任

| 路徑在 `tools/batch-sha256-manifest/` 之下 | 責任 |
| --- | --- |
| `public/js/core/manifest.mjs` | 文法、byte 上限、實體列、basename 與清單索引。接收字串或 Uint8Array，回排序 entries 或上文 error。 |
| `public/js/core/batch.mjs` | 選檔 metadata 預檢、配對、逐件 hash 流程與錯誤、報告固定欄位及 JSON。無 DOM、網路或儲存。 |
| `public/js/worker.mjs`、建置產生的 `public/js/worker-source.mjs` | Worker adapter 處理嚴格訊息、讀 File、呼叫 Web Crypto。固定 source 由零相依建置輸出成自足靜態模組，實際發布從 build output 取用。 |
| `public/js/controller.mjs` | 同步投影、世代、草稿、輸出狀態、Worker／Object URL 擁有權。依賴由 adapter 注入，能用假 Worker 跑字面狀態測試。 |
| `public/js/app.js`、`public/js/i18n.mjs` | 兩語輸入、事件、手勢下載、安全文字 render。UI 從 controller 和同一 report 取資料。 |
| `public/index.html`、`public/en/index.html`、`scripts/`、`test/` | 獨立入口、共用靜態樣式、重現 build、loopback serve 與離線測試。 |

Node.js 24 ESM 與內建模組，零 runtime 相依，無 install 步驟。產品包不含使用者附件、憑證、瀏覽器設定或 remote font。原生環境需 `isSecureContext`、`File.prototype.arrayBuffer`、`Worker`、`Blob`、`URL.createObjectURL/revokeObjectURL`、`TextDecoder`、`TextEncoder`、`crypto.subtle.digest`。Worker 啟動時也檢自己的 File、Encoding 及 SubtleCrypto。初始頁以靜態 import 先載入固定 Worker source，再開放開始。每次執行從固定 source 建 Blob Worker，程式及所有 import 已解析為單一自足資產。內容或檔名不插入程式。Worker 終止後即使離線，下一次也從同一初始資產建立。

### 解析、配對與故障

`parseManifest` 回傳原列次序的 `{name,expectedSha256,line}` entries 及第一錯誤。`validateSelection` 回 metadata 的原次序及第一錯誤。純核心透過注入的 `readManifest()`、`readFile(fileIndex)`、`digest(buffer)`、`onPrepared(total)`、`onProgress(completed)` 跑 batch。fileIndex 為 1-based。建兩個 basename Map，走清單原序。一件配對使用 `await File.arrayBuffer()`，若拒絕、非 ArrayBuffer 或長度與 size 不符，追加 `read_error` 並繼續。讀成功則 `await crypto.subtle.digest('SHA-256', buffer)`，32 bytes 轉成雙位小寫 hex，再比對。digest 失敗停止全批。missing 不讀。走完清單後按原選取次序追加 unexpected。額外檔內容讀取及 digest 呼叫都為零。進度分母為配對數，分子含已結束的 read_error，missing 與 unexpected 不進分母。total 可為 0，此時直接產生診斷。

令 `L` 為清單文字 bytes、`R` 清單列數、`F` 選取數、`B` 成功讀取之配對檔 bytes，配對與驗證時間 `O(L + R + F + B)`。名稱和報告大小受列數及名稱上限約束。可達 JS 內容緩衝同時只保留一件至多 32 MiB，另有至多 64 KiB 的清單檔 buffer、草稿、metadata 和報告。Web Crypto 的 digest 規範會取得 input bytes 的副本，瀏覽器自身額外記憶體及回收時點用實測記錄。Worker 完成／取消／失敗後釋放 File 與陣列引用。 [File API](https://www.w3.org/TR/FileAPI/#dom-blob-arraybuffer) · [Web Crypto digest](https://www.w3.org/TR/webcrypto/#SubtleCrypto-method-digest)

### Worker 訊息

Controller 的請求精確為 `{type:"verify",version:1,runId,manifest,files}`。`runId` 是該 controller 本頁世代整數。`manifest` 為 `{kind:"text",text:string}` 或 `{kind:"file",file:File}`。`files` 為依選取順序的 File 陣列，或僅用於超限情境的 `{overflowCount:integer>200}`。File 由 structured clone 傳給固定 Worker。清單先預檢，Worker 讀目前 File.size 並比對實際讀取的 byteLength。Worker 只收一項請求。

| 方向為 Worker → Controller | 精確欄位與順序 |
| --- | --- |
| 預檢通過 | `{type:"prepared",version:1,runId,totalPairs}`，只可出現在 validating，totalPairs 為 0–200。 |
| 進度 | `{type:"progress",version:1,runId,completedPairs}`，只可在 hashing，從 1 到 totalPairs，逐次 +1。 |
| 報告 | `{type:"result",version:1,runId,report}`，只可在 hashing 且已完成 totalPairs。驗 report schema、列狀態欄位、counts、exactMatch、唯一名稱及和 totalPairs 的一致性。 |
| 全批錯誤 | `{type:"failure",version:1,runId,error}`，可在 validating 或 hashing。Worker 缺少必要 API 時在 validating 回 `ENV_UNAVAILABLE`，讀檔次數為零。其餘預檢錯誤只在 validating，digest 錯誤在 hashing。error 用同一精確 schema。 |

先用 instance identity、當前 runId 和頁面存活狀態淘汰舊 callback。現行 Worker 傳入缺鍵、額外鍵、未知類型、錯 runId 或非法順序即 `WORKER_PROTOCOL`。瀏覽器的 error/messageerror 正規化為固定碼，原始例外訊息不回 UI、不入 log 或報告。成功或終態只收一次，解除 handlers 並 terminate，撤銷 Worker Blob URL。無結果時不建立下載 URL。

### Controller 狀態與轉移

對外 snapshot 精確為 `{phase,generation,manifestSource,textOrigin,manifestBytes,selectedCount,selectedBytes,progress,filter,reportReady,exactMatch,error,downloadNotice}`。初始為以下值。

```json
{"phase":"idle","generation":0,"manifestSource":"none","textOrigin":null,"manifestBytes":null,"selectedCount":0,"selectedBytes":0,"progress":null,"filter":"all","reportReady":false,"exactMatch":null,"error":null,"downloadNotice":null}
```

`phase` 的枚舉為 `idle, dirty, validating, hashing, complete, error, cancelled`。`manifestSource` 為 `none, text, file`，textOrigin 只對 text 為 `paste` 或 `textarea`。manifestBytes 是原始 byte 數或未知時 null。selectedCount 是 FileList count 或移除後 count，selectedBytes 是安全整數合計，溢件或無效 metadata 為 null，0 件為 0。progress 只在 hashing 或 complete 為 `{completed,total}`，其餘 null。filter 為 `all` 或 `issues`。無有效報告時 reportReady 為 false 且 exactMatch 為 null。downloadNotice 為 null、`requested` 或 `failed`。

- 接受的草稿更新（文字、清單 File、批量替換、移除、範例）同步 +1 generation，終止當前 Worker，撤銷 Worker 和報告 URLs，移除舊報告、progress、error、downloadNotice，filter 回 all，phase 變 dirty。UI 接受清單 File 時清掉文字；接受文字時清掉清單 File。保留作為目前草稿的待核對檔。以新選取順序替換整批，移除後以剩下的原相對順序重新編號。原生 input 在拷貝 File 引用後清值，可再次選同名檔。超量只記 count 並可整批替換。編輯過大的文字可先用 UTF-16 長度判已超上限，對這種情況 snapshot 的 manifestBytes 可為 null。
- 開始在非 busy 且頁面活躍時 +1 generation，清舊輸出並保留目前草稿，設 validating。當前 worker 的 prepared 將 phase 改 hashing、progress 設為 `{completed:0,total:totalPairs}`。每次 progress 更新分子。result 完成設 complete 且報告可下載。任一終態釋放 Worker 及其 URL。failure 設 error、清 progress／報告，保留草稿。busy 期間再次 start 無效果。
- 取消只對 validating 或 hashing 生效，+1 generation，立即終止 Worker、撤銷 URLs、清報告、progress、error、downloadNotice，filter 回 all，phase 變 cancelled。草稿保留供重試。晚到結果、錯誤或進度均不得改新世代。
- 重設或離頁清掉所有草稿、檔案輸入、Worker、報告及 URLs，+1 generation，回 idle。語言連結觸發離頁清理，pagehide 也清理。同一離頁週期只清一次。離頁旗標阻止任何晚到事件寫入，BFCache pageshow 只重新啟用已清空的文件。新的語言頁有自己的初始 snapshot。無跨語言資料攜帶。
- 只有 complete 可改篩選或下載。每個有效報告最多保留一個下載 URL，首次點擊才用固定 JSON bytes 建 Blob URL，建立並觸發下載 anchor，隨即移除 anchor。同報告的後續手勢重用 URL。成功派發只標 requested。createObjectURL 或派發失敗時撤銷當前下載 URL 並標 failed，保留報告供重試。離頁、重設或草稿失效同步撤銷。未達 complete 的下載手勢無輸出也不建 URL。

### 隱私、相容與 SEO

起始靜態資產從同源載入。互動期沒有 fetch、XHR、Beacon、CDN、外部字型、Service Worker、Web Storage、IndexedDB、Cache API、cookie 或外部解析器。頁面不顯示檔案內容預覽，也不讀取未配對檔。建置提供最小 CSP，至少含 `default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'`。檔案內容、檔名或清單不得進 console 或遙測。靜態伺服器只綁 loopback，使用固定資產路徑和允許的 GET/HEAD，無自動開瀏覽器。

| 入口 | lang、title/H1、description | 同語首頁 |
| --- | --- | --- |
| `/index.html` | `zh-Hant`，多檔 SHA-256 清單校驗。檢查 SHA256SUMS 清單、找漏件和校驗值不符，並下載核對報告。 | `https://glossquote.com/index.html` |
| `/en/index.html` | `en`，Batch SHA-256 Manifest Check. Check a SHA256SUMS manifest and find missing files or checksum mismatches. | `https://glossquote.com/en/index.html` |

兩頁用各自絕對自指 canonical，互返 hreflang `zh-Hant`、`en`，`x-default` 為繁中入口。Preview 使用 build 的 loopback origin，HTML 與 HTTP 皆 noindex，並提供 preview robots 禁止抓取。正式 build 只在主統籌提供核實的 HTTPS origin 後輸出正式 canonical、hreflang、sitemap 及 robots。本站初版支援文案用「GNU untagged SHA-256 單層清單子集」／“Single-folder subset of GNU untagged SHA-256 manifests”。英文頁和繁中頁錯誤、範例、空白及忙碌等均可用。 [Google 多語頁](https://developers.google.com/search/docs/specialty/international/localized-versions) · [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

## acceptance — 九個產品驗收面向

以下 ID 為後續 `spec.acceptanceCriteria` 與 production task 的固定九項。文件審查使用八節，逐項檢查此處條件能否落地。每個產品面向以同一固定候選提供獨立證據。

| ID | 產品必要證據 |
| --- | --- |
| `functionality` | 走兩語主要路徑，驗 mixed／all match／zero selected 的逐列狀態、表格與完整下載 bytes。獨立重算 SHA-256。 |
| `boundaries` | 字面測例命中 UTF-8/BOM、CRLF／裸 CR、格式、名稱、重名、大小、件數、總量、精確 Unicode 配對、read_error、digest／Worker 故障及 controller 世代。錯誤時選檔內容讀取為零。 |
| `privacy` | 真實隔離瀏覽器以合成資料觀察初始資產完成後的 Network／Storage，走開始、取消、改檔、重跑、下載、語言、pagehide／返回。核對零上傳、零持久化、無同源遙測、所有過期 URLs 及 Worker 釋放。正式站另觀察主機注入。 |
| `security` | 確認 CSP、固定路徑、secure context、metadata schema、對 malformed／過期訊息的拒絕，檔名作文字及顯示轉義，原始例外和內容不出現在 UI/log。 |
| `usability` | 真實 Desktop 使用兩種清單來源、多選替換、移除、樣本、修正錯誤、進度取消、篩選後完整下載及清理。320 px 仍可完成小批次。 |
| `accessibility` | 可見 label、錯誤關聯、全鍵盤可達及焦點順序，讀屏狀態及表格、真 200% zoom、320 CSS px、觸控目標、必要文字與控制對比、reduced motion。記裝置和實際證據。 |
| `localization-seo` | 靜態兩入口的語言內容、lang、title、h1、description、canonical、互返 hreflang、x-default、預覽 noindex、同語首頁及兩語相同報告。正式 canonical 等到發布 gate。 |
| `toolchain-provenance` | Node 24 內建模組、零 runtime 相依、固定 brief/SPEC/fixtures、公開候選唯一 head，離線重建兩次完整資產檔名與 SHA-256 相同。固定 Worker source 由同版程式與 build 產生。 |
| `compatibility` | 實際版本的 Windows Chrome／Edge 和代表性行動端走 File、Blob、Worker、離線、下載及低記憶體情境。記 secure context、檔案/瀏覽器限制、可觀測峰值或可靠指標及重試／取消結果。 |

## tests — 可攜驗證與字面案例

### Fixture 契約

[fixtures.json](fixtures.json) 為 UTF-8 合成資料，內有 `hashAnswers`、`batchCases`、`controllerCases`、`boundaryRecipes`。作者獨立計算 expected，正式程式只讀取這些 expected 作比較。

- `batchCases[].input.manifest` 的 null 是無來源。`{kind:"text",text}` 直接取原文。`{kind:"file",name,sizeBytes,bytesHex,readMode?}` 用 hex 構造假 File。`selected` 的每件有 `name,sizeBytes,bytesHex? ,readMode?`。bytesHex 為 ASCII hex，每兩位為一 byte。空字串是空內容。`readMode:"reject"` 讓 `arrayBuffer` 拒絕，`readMode:"must-not-read"` 使測試一旦被呼叫就失敗。未設 readMode 的 File 讀 hex。`faults.digestRejectAtFileIndex` 若存在，digest 在該選取位置拒絕。所有 IO ledger 使用 1-based 原選取位置。
- 每個 batch case 固定 `expect.result` 全物件、`expect.readManifestCalls`、`expect.readSelected`、`expect.digestSelected`、`expect.reportUtf8`，報告不存在時最後一項為 null。hex 及 Unicode 的位元組內容保留。控制器 case 的每步提供 `action, input, expect`。`expect` 有完整 `snapshot`、`textDraft`（null 或 `{raw,display,origin}`）和累計 `effects`。effects 依序記 Worker 建／終止、Worker URL 撤銷、報告 URL 建立／撤銷、下載 payload 和一次性 UI notice。Fake Worker 的 `worker` 編號依該 case 建立順序，案例以 `worker:1`、`report:1` 等識別假 URL，runId 仍為世代。`start.observedTextareaValue` 模擬按鈕觸發時讀到的畫面值。`start` 的 `fault` 可讓假環境缺 API 或在建立 URL 前讓 factory 拒絕。`download` 的 `fault` 可讓報告 URL 產生器拒絕。假事件不接觸真 File 或瀏覽器。
- boundary recipe 用重複規則定義大合成輸入，預期包含精確計數、錯誤或指定輸出。64 KiB 是 byte gate，200 列各 255-byte 檔名、CRLF 與 BOM 的最長合法清單為 64,603 bytes。65,536 bytes 可通過 byte gate，仍須通過後續文法及名稱長度。32 MiB 與 128 MiB 均為含等號的上限。正式裝置大檔用可重建的合成檔。

### 產品候選命令與觀測

自中央 repo 工作副本進入 `tools/batch-sha256-manifest`。Node 24 和 npm 已可用即可，背景 CLI 不需下載或安裝套件。

```sh
node --version
npm run test
npm run check
npm run build:preview
npm run check:generated:preview
npm run build:preview
npm run check:generated:preview
npm run serve:preview
```

- 測試採 Node ESM 內建 `node:test`／`node:assert/strict`，讀固定 fixtures。雜湊 oracle 另用 Node `createHash('sha256')` 或官方 known answer 對照瀏覽器 `crypto.subtle.digest`，不從受測產物取得 expected。字面 bytes 以 Uint8Array/Buffer 等值比較，包含末尾 LF。正例、互斥輸入、首錯順序、零讀額外檔、含上限與超限、取消／改檔／晚到、錯誤後重跑、reset、雙語切換、pagehide/BFCache 均有實作測試。
- `build:preview` 與 `check:generated:preview` 分別執行 `node scripts/build.mjs --preview` 和 `node scripts/check-generated.mjs --preview`。後者讀 `dist-preview`，把每件相對 POSIX 路徑和 SHA-256 按路徑字典序輸出到 stdout。兩次 stdout 清單逐行相等，包括 Worker 固定資產、兩語入口及 header／robots 產物。測試跑在同一 head，禁止以輸出中的時間戳或絕對路徑造成差異。
- `serve:preview` 只服務已建成的 `dist-preview`，綁 `127.0.0.1` 的系統分配埠，stdout 印 bound URL，可用背景 HTTP probe 驗兩語入口 200、MIME、CSP、noindex 及無效路徑 404。預覽 canonical 以 build 的固定測試 origin `http://127.0.0.1:4180` 驗格式。只結束這次啟動的 server。
- 真實 Chrome、Edge 與代表性行動端須記錄 OS／browser 版本／viewport、同候選 head、案例與人工或隔離工具實際觀察。相容測試涵蓋原生選檔、下載、鍵盤／讀屏、真 zoom、記憶體與離線重跑。低記憶體情境記實際裝置 RAM，實測合成的 32 MiB 單檔與合計 128 MiB 配對檔的完成、取消和重試，記可觀測的峰值或代理指標。使用背景 CLI 不能代表這些產品證據。本規格階段產品測試是 `NOT_RUN`，本機互動瀏覽器、原生選檔、剪貼簿及下載驗收仍依主統籌核可的隔離方式處理。

兩次建置的機器比較可在 POSIX shell 或 PowerShell 從產品目錄執行。

```sh
node --input-type=module -e 'import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; const run = script => execFileSync(process.execPath, [script, "--preview"]); const build = () => { run("scripts/build.mjs"); return run("scripts/check-generated.mjs"); }; const first = build(); assert.ok(first.length); assert.deepEqual(first, build()); console.log("Preview assets match across both builds");'
```

## handoff — 來源、審查及接續

- 來源為中央 repo `KYStr/glossquote-labs-home` 固定 `14d3dff09fe8f283726a7e8cb9eaadd905500516` 的 TASK 與 BRIEF。[固定派工](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/reviews/five-hour-2026-11-11/dispatch/new-spec-batch-sha256-manifest/TASK.md) · [固定 brief](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/batch-sha256-manifest/BRIEF.md)
- 作者工作 `labs-batch-sha256-manifest-spec-20261111`，actor `local-codex:01a1c8b8-117f-76b3-b938-52143fbd2f10`，claim `batch-sha256-manifest-20261111-recovery-claim-20261111T042231Z-01a1c8b8`，r1588 已讀回 `working`。候選只含本目錄四檔。候選 SHA、PR 及公開 bytes 核驗由候選 PR 和主統籌的交接證據提供。 [開工讀回基線](https://github.com/KYStr/glossquote-labs-home/blob/0f7b5e92f23035fe532ae5cdd98a6db65ce00c50/coordination/work-registry.json)
- 非作者 reviewer 取得固定候選後讀四檔、重算 fixtures、逐一評 goal／scope／userFlow／inputsOutputs／implementation／acceptance／tests／handoff。必要查核完成且逐項至少 90 方可 accepted，由非作者另行登記 spec ready。後續實作者才以 ready 預案、原樣九項產品 criteria、正確 executor 及獨立 claim 開工。遇到無法重現的 bytes、規格衝突或平台未驗保留證據並交原責任人修正。
- 預定產品路徑 `tools/batch-sha256-manifest/`。下一位實作者從固定 SPEC 及 fixtures 建核心，再接 Worker、controller、兩語 UI。提交時提供 source、candidate、PR、實際命令及 PASS/FAIL/NOT_RUN。產品 accepted、公開來源、合併、正式 Cloudflare 發布、雙語首頁整合及使用者外驗均循中央規則。 [中央製作清單](https://github.com/KYStr/glossquote-labs-home/blob/0f7b5e92f23035fe532ae5cdd98a6db65ce00c50/docs/IMPLEMENTATION-CHECKLIST.md) · [審查與發布](https://github.com/KYStr/glossquote-labs-home/blob/0f7b5e92f23035fe532ae5cdd98a6db65ce00c50/docs/REVIEW-AND-RELEASE.md)
