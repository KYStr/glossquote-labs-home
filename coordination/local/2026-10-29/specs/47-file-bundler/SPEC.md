# 附件大小分包 — 既有規格保存

Task ID: `labs-47-file-bundler` · Spec ID: `spec-47-file-bundler`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：附件大小分包

本文件定義 M1 使用者工作、資料契約和可觀察行為。M1 是完整的本機候選工具：能選檔、估算分包、產生真正可用的 ZIP、下載索引與重新開始。不能以只有分組預覽的 mock 代替 ZIP 產物。

## Job、result、contract、oracle

Job v1 是目前分頁的一次工作，不持久化：

    {
      schemaVersion: 1,
      jobId: "job-1",
      packageLimitBytes: 20971520,
      files: [
        { sourceIndex: 0, file: File, originalName: "report.txt", sizeBytes: 12 }
      ]
    }

sourceIndex 是檔案加入佇列時的零起始順序，檔案不重排此欄位。重選或刪除項目後建立新 jobId。Job 不含路徑、內容字串、帳號或網路識別資料。

成功 Result v1 只在全部 ZIP 產生完成後建立：

    {
      schemaVersion: 1,
      jobId: "job-1",
      status: "ready",
      packageLimitBytes: 20971520,
      packages: [{
        fileName: "bundle-001.zip",
        sizeBytes: 109,
        entries: [{ sourceIndex: 0, name: "a.txt", sizeBytes: 1, crc32: "8cdc1683" }],
        blob: Blob
      }],
      index: {
        schemaVersion: 1,
        kind: "glossquote-file-bundler-index",
        algorithm: "stable-ffd-zip-store-v1",
        packageLimitBytes: 20971520,
        packages: [{
          fileName: "bundle-001.zip",
          sizeBytes: 109,
          entries: [{ sourceIndex: 0, name: "a.txt", sizeBytes: 1, crc32: "8cdc1683" }]
        }]
      }
    }

下載的 JSON 索引只含 index 欄位，不含 Blob、來源路徑或內容。JSON 為 UTF-8、schemaVersion 整數 1；packages 依序編號，entries 按實際 archive entry 順序排列。CRC32 是八位小寫十六進位字串。沒有時間戳或隨機欄位。

錯誤 Result v1 必須全有或全無：

    {
      schemaVersion: 1,
      jobId: "job-1",
      status: "error",
      error: { code: "FILE_TOO_LARGE_FOR_PACKAGE", fileIndexes: [0], messageKey: "error.fileTooLargeForPackage" },
      packages: [],
      index: null
    }

固定錯誤碼：INVALID_LIMIT、NO_FILES、TOO_MANY_FILES、TOTAL_SIZE_LIMIT、INVALID_FILENAME、FILENAME_COLLISION、FILE_TOO_LARGE、FILE_TOO_LARGE_FOR_PACKAGE、CANCELED、BUILD_FAILED。欄位錯誤可列出所有可檢出的 fileIndexes，去重並升序；UI 以 messageKey 提供雙語文案，不把原始內容塞入診斷記錄。CANCELED 是終止狀態，不顯示錯誤 toast。

## 功能需求

**FR-01 選擇本機檔案。** 提供多檔 input 與可選拖放。接受 File.name basename 和原始 bytes，不讀取目錄結構；新增後顯示名稱、大小和選取順序。預設無檔案，空檔案允許。

**FR-02 設定包大小。** 預設 20 MiB，即 20,971,520 bytes。解析前只移除字串首尾 ASCII whitespace；格式為 1 個以上十進位數字，後接可選 ASCII spaces 和精確大小寫單位 B 或 MiB。省略單位等同 B；前導零允許；B 數值以 bytes 解讀，MiB 只接受整數 1–64，1 MiB = 1,048,576 bytes。解析結果必須在 1–67,108,864 bytes。空值、零、負數、千分位、科學記號、小數、非 ASCII 數字、未知或不同大小寫單位、只有單位和超上限均回報 INVALID_LIMIT。例：150 和 150 B 等於 150 bytes；1 MiB 等於 1,048,576 bytes。

**FR-03 驗證選取集合。** 最多 100 個檔案，合計最多 67,108,864 bytes，單檔最多 67,108,864 bytes。basename 經 NFC 後 UTF-8 長度至多 255 bytes。拒絕空名、.、..、斜線或反斜線、冒號、C0/C1 控制字元、雙向覆寫控制字元、不成對 UTF-16 surrogate、尾端空白或句點，以及 Windows 保留裝置名稱 CON、PRN、AUX、NUL、COM1–COM9、LPT1–LPT9（忽略大小寫及第一個句點後的副檔名）。碰撞鍵精確定義為 NFC 後的 JavaScript String.prototype.toLowerCase()；任何相同鍵都拒絕並列出相關 sourceIndex。內容 bytes 不做正規化，保持原樣。

**FR-04 顯示規劃和精確大小。** 使用 stable-ffd-zip-store-v1：依原始檔案 bytes 大小遞減排序，同大小依 sourceIndex 遞增；逐一放入目前已有的第一個可容納包，不能容納才新增包。可容納與否以 TECHNICAL.md 的完整 ZIP STORE serialized size 判定，不以來源大小代替。這是穩定近似法，不承諾最少包數。顯示每包檔名、實際 ZIP bytes、上限與成員。若任一檔案連 ZIP overhead 都放不進空包，顯示該檔並阻止全部輸出。

**FR-05 建立可用 ZIP。** 每張結果卡下載真正的 ZIP STORE archive；entry data 必須逐 byte 等於來源。每包最多 100 entries、64 MiB 來源資料；不輸出 Zip64。名稱為 bundle-NNN.zip，從 001 開始。任何建置失敗都清除所有結果、顯示 BUILD_FAILED，不留下部分成功按鈕。

**FR-06 下載總索引。** Ready 狀態提供 bundle-index.json；格式如上。索引對應實際 ZIP bytes、package name、entries 和 CRC；不得含 full path、檔案內容或額外欄位。

**FR-07 工作狀態與取消。** 狀態依序 empty、selected、validating、planning、building、ready；recoverable error 回 selected，cancelled 回 selected。building 顯示目前檔案數和取消按鈕。取消、清空、移除或更換檔案、改上限、開始另一 job 都遞增 jobId epoch 並終止舊 worker；舊回傳不得改畫面或建立 URL。

**FR-08 清除暫存。** File、Blob、CRC、中間 buffer 只在目前分頁記憶體。重設、取消、來源或上限修改、新工作、pagehide 時移除舊結果並 revoke 每個 object URL。只要使用者留在頁面且未清除或變更來源，Ready 結果持續可下載；不得以計時器自動過期。不得 localStorage、IndexedDB、Cache API、service worker、遠端請求、console 印內容或上傳來源檔。

**FR-09 下載順序。** 不自動連續下載；逐張點包下載，索引另行下載。按鈕名稱用實際檔名。下載只由明確使用者點擊觸發，不自動打開檔案或系統視窗。

**FR-10 雙語頁面導覽。** 繁中版為 /index.html，英文版為 /en/index.html，頁首語言選項是這兩個靜態頁面的普通連結。切換會載入另一頁，因此目前選取檔案、未下載 ZIP 和索引會遺失；連結旁必須明示此事。不得透過 storage、query、hash 或跨頁狀態保存資料。

ZIP STORE 每 entry 固定成本為 76 + 2 × UTF-8 archive name bytes，再加 entry data；每包 EOCD 固定 22 bytes。Archive name 採 NFC。總大小為 22 + Σ(data bytes + 76 + 2×name UTF-8 bytes)。a.txt 加單 byte x 正好 109 bytes、CRC32 8cdc1683；單字元檔名 a、b 各含一 byte，同包正好 180 bytes。完整 oracle 見 ACCEPTANCE.md。


---

## 原文件 TECHNICAL.md

# 技術契約：附件大小分包

## 執行邊界

使用 Node.js 24、ES modules 與瀏覽器原生 API，零外部 runtime/dev dependencies；禁止 npm install。成品是可操作的靜態 candidate。Node 只供開發伺服器、離線 tests、check、build 使用。M1 server 僅綁 127.0.0.1:4227（4180 + 工具 ID 47），只送 public/。M1 預覽頁設 noindex、nofollow、noarchive。file-bundles 是候選 domain，不代表 DNS、部署或公開狀態。

來源內容不得網路傳輸。只可使用使用者選取的 File、輸出 Blob、Worker、URL.createObjectURL 和 URL.revokeObjectURL。禁止 remote fonts、analytics、telemetry、CDN、service worker、server upload、localStorage、IndexedDB、console dump、剪貼簿及自動下載。

## 檔案樹

    package.json
    .gitignore
    public/index.html
    public/en/index.html
    public/css/app.css
    public/js/app.js
    public/js/ui.js
    public/js/bundle-worker.js
    public/js/core/validation.js
    public/js/core/planner.js
    public/js/core/zip-store.js
    public/js/core/index-schema.js
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    test/validation.test.mjs
    test/planner.test.mjs
    test/zip-store.test.mjs
    test/index-schema.test.mjs
    test/state-cleanup.test.mjs

六份規格與共同 docs 唯讀。

## 精確 core 介面

core 純輸入/輸出，失敗回固定 code，不混 DOM：

    parsePackageLimit(input)
      -> { ok: true, valueBytes } | { ok: false, code: "INVALID_LIMIT" }

    validateSelection(files, limitBytes)
      -> { ok: true, files: ValidatedFile[] }
       | { ok: false, errors: [{ code, fileIndexes: number[] }] }

    planPackages(files, limitBytes)
      -> { ok: true, packages: PlannedPackage[] }
       | { ok: false, code: "FILE_TOO_LARGE_FOR_PACKAGE", fileIndexes: number[] }

    serializedZipSize(entries: [{ name, sizeBytes }]) -> number
    createStoredZip(entries: [{ name, bytes: Uint8Array }])
      -> Promise<{ blob: Blob, sizeBytes, entries: EntryResult[] }>
    createIndex(resultWithoutBlob) -> BundleIndexV1

FileDescriptor 為 {sourceIndex, file, originalName, sizeBytes}；ValidatedFile 增 name（NFC archive name）、nameUtf8Length、normalizedCollisionKey。所有 byte 欄位都要是 safe integer。Job v1 的 sourceIndex 在加入佇列時固定；顯示選取清單仍按 sourceIndex。

## 穩定 FFD 分包

1. 驗證上限、空列表、數量、每檔大小、總 bytes、名稱 Unicode/NFC/長度/安全字元和 collision。碰撞鍵為 name.normalize("NFC").toLowerCase()，不依系統 locale。收集能確定的所有錯誤；indexes 去重升序。任何錯誤都不進規劃。
2. 建立排序副本：sizeBytes 大到小，同大小 sourceIndex 小到大。
3. 逐項掃描已建 packages，從第一包起；serializedZipSize(existing + item) <= limitBytes 時放入第一個符合包。空包基數為 22 bytes。
4. 若單項自身 ZIP size 超過上限，回 FILE_TOO_LARGE_FOR_PACKAGE 和所有相關 sourceIndex，不產生輸出。
5. 再算一次每包精確 size，必須等於最後 Blob.size 且 <= 上限。

ZIP 尺寸：空 archive 22 bytes；每 entry 為 local header 30 + central header 46 + UTF-8 filename 在兩處各一次 + data bytes。沒有 extra fields、comment、data descriptor 或 compression stream。這個穩定 FFD 不保證包數最少，也不以檔名重排。

## ZIP STORE writer 與標準

zip-store.js 使用 DataView/Uint8Array 寫 little-endian records。精確欄位如下：local signature 0x04034b50、version needed 20、flags 0x0800、method 0、DOS time 0、DOS date 0x0021、CRC-32、compressed size、uncompressed size、UTF-8 filename length、extra length 0；接著 filename 與 raw bytes。Central signature 0x02014b50、version made by 0x0014、version needed 20、flags 0x0800、method 0、相同 time/date/CRC/sizes、filename length、extra/comment length 0、disk start 0、internal/external attributes 0、local header offset；接著 filename。EOCD signature 0x06054b50，兩個 disk number 0，兩個 entry count 相等，central size/offset 精確，comment length 0。每包單一 disk、compression method 0 (STORE)、general-purpose bit 11 (UTF-8)。UTF-8 名稱先 NFC；沒有 extra field、comments、encryption 或 data descriptor。CRC 初始 FFFFFFFF、反射多項式 EDB88320、最後 XOR FFFFFFFF；呈現八位小寫 hex。每個欄位完整驗證後才建 Blob。

不得生成 Zip64。每包來源最多 64 MiB、100 entries、entry name 至 255 UTF-8 bytes。檢查 archive length、offset 和 entry count 能用 32-bit 表示，否則 BUILD_FAILED 且輸出為零。Tests 必須驗 local/central/EOCD、offset、CRC、store bytes 和 exact Blob.size。

格式參照：PKWARE APPNOTE 6.3.9 的 ZIP records、STORE、CRC-32、UTF-8 bit 11：[PKWARE APPNOTE.TXT](https://www.pkware.com/documents/casestudies/APPNOTE.TXT)。這是格式文件連結；測試使用自製假資料，不執行附件或下載內容。

## Index v1

下載 JSON 的 exact schema：

    {
      "schemaVersion": 1,
      "kind": "glossquote-file-bundler-index",
      "algorithm": "stable-ffd-zip-store-v1",
      "packageLimitBytes": 20971520,
      "packages": [{
        "fileName": "bundle-001.zip",
        "sizeBytes": 109,
        "entries": [{
          "sourceIndex": 0,
          "name": "a.txt",
          "sizeBytes": 1,
          "crc32": "8cdc1683"
        }]
      }]
    }

Package 按 bundle 編號，entries 按該 ZIP 的實際 entry 順序。不准額外 keys。UTF-8 JSON 以 newline 結尾。所有 byte 欄位是 JSON 整數，不轉浮點或字串。

## Worker、狀態和清除

currentJobId 是 UI epoch。狀態：

    empty -> selected -> validating -> planning -> building -> ready
    selected/validating/planning/building -> cancelled -> selected
    validating/planning/building -> error -> selected
    any -> reset -> empty

module Worker 接 {type:"build", jobId, files, packages}，依包內順序讀 File.arrayBuffer()，傳 {type:"progress", jobId, completedFiles, totalFiles}，完成傳 {type:"complete", jobId, packages:[{fileName, bytes, entries}]}。bytes 用 transferable ArrayBuffer。取消由 UI terminate worker。每個 handler 都驗 jobId，舊訊息忽略、不建 URL。讀取錯誤、data length 不符或 Worker error 都報 BUILD_FAILED 並清除全 job 結果。

開始新 job、選取或上限改變、移除、取消、reset、pagehide：遞增 epoch、terminate worker、清除 progress timer、revoke 既有 object URLs、釋放 Blob/bytes/index 引用。Ready 結果沒有時間期限，留在頁面時保持可下載，直到上述清理事件發生。pagehide 同步清除；visibilitychange 不會自動刪 Ready。下載由明確點擊觸發，一個按鈕只觸發一個檔案。

繁中與英文是獨立文件：/index.html 與 /en/index.html。語言選項使用普通 anchor 導頁，不保存或傳遞目前工作；頁面須在連結旁說明未下載結果會遺失。不得用 query/hash/localStorage/sessionStorage 轉移選取檔案或結果。

## Check/build

package.json 為 private ESM，四個 scripts：dev=node scripts/serve.mjs，test=node --test，check=node scripts/check.mjs，build=node scripts/build.mjs。check 驗 noindex、沒有 remote origins/storage，並執行必要 syntax/invariant checks；不可把 regex 當安全證明。build 只把 public/ 複製至 dist/，不複製 inputs、tests、evidence 或 docs。Node tests 使用 memory fake data、不呼叫 network。瀏覽器狀態仍未執行，詳見 ACCEPTANCE.md。


---

## 原文件 UX-SEO.md

# UX 與 SEO：附件大小分包

## 雙語文案與語言狀態

候選 slug file-bundler；候選 domain file-bundles 只供主代理評估。M1 HTML 必須 noindex,nofollow,noarchive；沒有已驗證網域的 canonical。

| 欄位 | 繁體中文 | English |
|---|---|---|
| Title | 附件大小分包｜免費本機 ZIP 分包工具 | Attachment Size Bundler — Free Local ZIP Splitter |
| Description | 選取最多 100 個檔案，按 ZIP 實際大小分包並下載。檔案只在目前瀏覽器本機處理。 | Split up to 100 selected files into ZIP bundles by exact archive size. Files are processed in your browser. |
| H1 | 依附件大小分包 | Bundle files by attachment size |
| 短說明 | 設定單包上限，確認每個 ZIP 的實際大小，再逐包下載。 | Set a per-ZIP limit, review each archive’s exact size, then download bundles one at a time. |
| Primary action | 選取檔案 | Choose files |
| Secondary action | 清除全部 | Clear all |
| Candidate status | 本機候選版；尚未部署 | Local candidate; not deployed |

繁中位於 /index.html，English 位於 /en/index.html。頁首以普通 anchor 連往另一語言頁面；切頁會載入新文件並失去目前 memory-only 的選檔、limit 和尚未下載結果。語言連結旁固定顯示警語：「切換語言會離開此頁；未下載的分包和索引會遺失。」英文：「Changing language leaves this page. Selected files and undownloaded bundles will be lost.」不保存或搬移輸入。各頁所有狀態、錯誤、說明、檔案數量與單位都用該頁語言。使用者檔名以文字節點顯示，不作 HTML。

## 工作區線框

桌面寬版（>=75rem）讓工作區佔主要視覺面積。左側選檔與結果，右側限制和主動作；不放 marketing hero：

    ┌ 品牌 | 附件大小分包 | 語言 ───────────────────────┐
    │ H1：依附件大小分包 / Bundle files by size          │
    │ 設定上限、逐包下載 / Set a cap, download each ZIP   │
    ├────────────────────────────┬───────────────────────┤
    │ [選取檔案] [拖放檔案]       │ 單包上限 [20 MiB]     │
    │ 已選檔案清單                │ 最多 100 檔 / 64 MiB │
    │ 名稱 | bytes | 移除         │ [開始分包]           │
    ├────────────────────────────┴───────────────────────┤
    │ bundle-001.zip | 實際大小 / 上限 | [下載這一包]     │
    │ bundle-002.zip | 成員清單         | [下載這一包]     │
    │ [下載 bundle-index.json] [重新開始]                 │
    └────────────────────────────────────────────────────┘

中版（48rem–74.999rem）改單欄：選檔與清單在上，限制與主動作緊鄰清單，結果卡在下。窄版（<48rem）所有欄位單欄，主要 action 可置底，但不能遮焦點、錯誤或虛擬鍵盤。

    ┌ 品牌 | 工具 | 語言 ┐
    │ H1 / 一句說明       │
    │ [選取檔案]          │
    │ 已選 2 / 100 | 1.4 MiB │
    │ report.txt 12 KiB [移除] │
    │ photo.jpg 1.3 MiB [移除] │
    │ 單包上限 [20 MiB]  │
    │ [開始分包]          │
    │ 進度 / [取消]       │
    │ ZIP 結果卡與逐包下載 │
    │ [下載索引] [重新開始] │
    └─────────────────────┘

## 互動與可及性

empty 提供選檔按鈕，拖放只是替代方式。selected 顯示檔數、總 bytes、每項大小與移除。validating/planning 顯示階段。building 顯示完成檔數與取消。ready 顯示 ZIP 實際 bytes、上限、成員名、逐包下載和獨立 index 下載；結果持續到使用者清除、來源/上限變更、新工作或離頁。error 說明原因並標出受影響檔案；cancelled 保留輸入且可重試；reset 回 empty。狀態文字不能只用顏色表示。

使用原生 label、input、button；Tab 次序按工作流。focus-visible 使用清楚的 3px ring；進度/錯誤/成功透過適當 live region，避免逐項重複朗讀。可點目標至少 44×44 CSS px。依 docs/DESIGN-SYSTEM.md 對比和設計 token。320px 不水平捲動；200% zoom 可以完成所有動作；尊重 prefers-reduced-motion。最多 100 檔的清單可內捲但不重設頁面焦點。窄版固定 action 在虛擬鍵盤開啟時不可蓋住輸入或錯誤。

## FAQ

繁體中文：
1. **檔案會上傳嗎？** 不會。候選版在目前瀏覽器分頁處理所選檔案，沒有帳號或上傳功能。
2. **ZIP 會符合上限嗎？** 工具按 ZIP STORE 實際 bytes 計算和驗證。郵件服務可能另加傳輸編碼，請依收件端規則留空間。
3. **為什麼分成多包？** 穩定 first-fit-decreasing 會計入每包 ZIP overhead，但不保證包數最少。
4. **可以取消或重新選檔嗎？** 可以。取消、移除、更改上限或重新選檔都會清除舊結果和暫存 URL。
5. **來源檔會被修改嗎？** 不會。內容 bytes 保持不變；ZIP entry 名稱會正規化為 NFC。

English:
1. **Are my files uploaded?** No. The candidate processes selected files in the current browser tab and has no account or upload feature.
2. **Will ZIPs meet the limit?** The tool measures actual ZIP STORE bytes. Mail services may add transfer encoding, so leave room for their rules.
3. **Why are there multiple bundles?** Stable first-fit-decreasing accounts for ZIP overhead but does not promise the fewest bundles.
4. **Can I cancel or choose files again?** Yes. Canceling, removing files, changing the limit, or starting over clears old results and temporary URLs.
5. **Are my originals changed?** No. Content bytes remain unchanged; ZIP entry names are normalized to NFC.

## 發布說明

不加入虛構評分、使用者數、背書或已部署聲明。M1 是 noindex local candidate。公開 GitHub、免費 hosting、實際 domain 與首頁納入均由 parent 在 M2 門檻後決定；本規格不授權發布。


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：附件大小分包

## 狀態

這是 M1 必須實作的 oracle；規格作者沒有執行產品、Node tests、build 或瀏覽器。全表現況為 **NOT_RUN_SPEC_ONLY**。真實瀏覽器、檔案選擇器、下載、鍵盤、320px reflow 和 200% zoom 項目標 **NOT_RUN_USER_FOCUS_INCIDENT**，不可用 Node 或靜態 DOM 代替 browser PASS。自動測試只用 memory 合成 bytes。

| ID | FR | 輸入 | 精確 oracle |
|---|---|---|---|
| B47-01 | FR-02 | limit 為 150 | 解析成功，valueBytes=150。 |
| B47-02 | FR-02 | limit 為 20 MiB | 解析成功，valueBytes=20,971,520。 |
| B47-03 | FR-02 | 0、-1、1.5 MiB、1e3、65 MiB、空字串 | 每項 INVALID_LIMIT，packages=[]，index=null。 |
| B47-04 | FR-01,03,05 | 空內容檔名 a，cap=100 | 成功；ZIP size=100；entry size=0、CRC32=00000000。 |
| B47-05 | FR-03,05 | a.txt，內容 ASCII x（hex 78），cap=150 | bundle-001.zip；size=109；entry CRC32=8cdc1683；解開 bytes=[0x78]。 |
| B47-06 | FR-03,04 | a.txt，內容 x，cap=108 | FILE_TOO_LARGE_FOR_PACKAGE；fileIndexes=[0]；packages=[]；index=null。 |
| B47-07 | FR-04 | a 和 b 各一個 data byte，cap=179 | 兩包；同大小時 sourceIndex 順序；每包 size=101，均 <=179。 |
| B47-08 | FR-04,05 | a 和 b 各一 byte，cap=180 | 一包，ZIP size=180；2 entries；解壓兩個 bytes 逐 byte 對應來源。 |
| B47-09 | FR-03 | 101 個唯一合法名的空檔 | TOO_MANY_FILES；無 ZIP、無索引。 |
| B47-10 | FR-03 | 單檔 descriptor size=67,108,865 | FILE_TOO_LARGE；不讀取內容、不規劃。 |
| B47-11 | FR-03 | 64 個檔案各 1 MiB，再加 1 byte | TOTAL_SIZE_LIMIT；整批不輸出。 |
| B47-12 | FR-03 | 名稱 ../evil.txt | INVALID_FILENAME，列 sourceIndex，零輸出。 |
| B47-13 | FR-03 | CON.txt、a. | INVALID_FILENAME；拒絕裝置保留名和尾端句點。 |
| B47-14 | FR-03 | é.txt 與 e + U+0301 + .txt | FILENAME_COLLISION，兩個 sourceIndex 升序，零輸出。 |
| B47-15 | FR-03 | A.txt 與 a.TXT | FILENAME_COLLISION；NFC 後大小寫不敏感。 |
| B47-16 | FR-03,05 | entry a，data=[00,FF,7F] | ZIP STORE 解壓 bytes 精確 [00,FF,7F]；無文字解碼/換行變更。 |
| B47-17 | FR-05 | B47-05 archive bytes | local method=0；flag 11 set；CRC=8cdc1683；central offset 正確；EOCD entries=1；總長=109。 |
| B47-18 | FR-06 | B47-05 index | schemaVersion=1、limit=150；一包 bundle-001.zip size=109；entry=(0,a.txt,1,8cdc1683)；沒有額外 keys。 |
| B47-19 | FR-04 | source 0 是 2-byte x，source 1 是 3-byte y，cap=300 | plan 先處理 source 1，再 source 0；同包時 entries 順序為 [1,0]；UI source list 仍為 [0,1]。 |
| B47-20 | FR-07 | job A build，取消後 job B，最後延遲送達 A complete | A event 忽略；不建 object URL；B 狀態不變；A worker terminate。 |
| B47-21 | FR-08 | Ready 後 reset | 每個 URL 恰好 revoke 一次；packages=[]、index=null、state=empty。 |
| B47-22 | FR-08 | Ready 結果，fake clock 前進 20 分鐘且沒有 user action | 不設自動過期 timer；state 仍 ready、URL 未 revoke、下載仍有效。 |
| B47-23 | FR-09 | Ready 有三包 | 不自動觸發 download；每次按鈕只下載一個指定 ZIP；index 由獨立按鈕下載。 |
| B47-24 | FR-05 | worker bytes 長度與宣告 source size 不同 | BUILD_FAILED；packages=[]、index=null；沒有部分成功按鈕。 |

B47-01–18、20–22、24 用 Node 24 node:test 純 core 或 worker protocol 測試。B47-17 必須解析 local/central/EOCD 與 offset，不可只查 ZIP magic；測試 helper 解回 STORE bytes 再比對原始 fixture。B47-19 另測第一個可容納包與等大 sourceIndex tie-break。名稱安全測試另涵蓋 C0/C1、slash/backslash、冒號、bidi override、不成對 surrogate、255/256 UTF-8 byte 邊界和錯誤集合零輸出。

## 瀏覽器與人工項目

**全部 NOT_RUN_USER_FOCUS_INCIDENT。** 不操作使用者桌面、互動本機瀏覽器/IAB、焦點、IME、clipboard 或 OS dialogs。等 parent 提供已審核隔離方式後，才可另行執行 browser gates。必要項目包括選檔和拖放、點語言連結前 warning 可見、/en/index.html 導頁後輸入不跨頁保存、Tab/focus、live error、320px 無水平捲動、200% zoom、逐包下載、索引下載、reset/cancel。觸發 file picker、print/save dialogs 的檢查維持 NOT_RUN。


---

## 原文件 TASKS.md

# 實作任務：附件大小分包

M1 只改 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、本工具 evidence/m1/**。六份規格和共同 docs 唯讀。不得另開 chat、遞迴委派、npm install、瀏覽器/native UI、部署或公開 GitHub。使用 Node 24 原生 ESM / node:test；全部 offline fake fixtures。dev 只綁 127.0.0.1:4227（4180+47）；port 衝突回報 parent，不殺程序。

## T00 — Scaffold

Prerequisite：先讀本工具 AGENTS.md、START-HERE.md、HANDOFF.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md 和六份規格。

Allowed paths：package.json、.gitignore、public/index.html、public/css/**、public/js/**、scripts/**、test/**。

建立 private ESM package、語義 HTML、/index.html 和 /en/index.html 獨立文案頁、可見語言 anchor 和未匯出資料遺失警語、title/description、noindex meta、靜態 loopback server、node:test/check/build skeleton。Server 只送 public/，拒絕 traversal、非 GET/HEAD 和未知 MIME。不得 remote origin、storage 或 service worker。

Script 存在後執行 node --version、npm test、npm run check、npm run build；不得 npm install。若 scripts 尚未建立，先建立後再執行，不能把不存在命令算通過。

完成條件：Node major=24；四個 scripts dev/test/check/build；127.0.0.1:4227；noindex；乾淨 dist 只複製 public；記錄實際命令和 exit code；此 milestone 不做 browser 測試。

## T10 — Core、ZIP bytes、oracle

Prerequisite：T00 commands 通過。

Allowed paths：public/js/core/**、public/js/bundle-worker.js、test/**，必要時 scripts/check.mjs。

實作 exact limit parser、全量 selection validation、穩定 FFD、ZIP serialized size、CRC-32、STORE writer、index v1、jobId/progress/worker cancel。增加 B47-01–19、B47-24 和檔名安全測試；ZIP read-back helper 僅在 test/，不加 runtime dependency。

執行 npm test、npm run check、npm run build。失敗時先修正再重跑受影響 checks。完成條件：bytes/CRC/record offsets/size/package ordering/index schema 全精確；任何錯誤零部分輸出；測試無 network。

## T20 — 雙語工作區與狀態

Prerequisite：T10 的所有 core oracle 通過。

Allowed paths：public/index.html、public/css/**、public/js/**、test/**。

實作多檔選擇與清單/移除、預設 20 MiB、驗證/規劃/build progress、cancel、精確結果卡、逐包下載、index 下載、error recovery、reset。實作 epoch isolation、worker termination、object URL cleanup，不設結果逾時。所有檔名作文字節點。

執行 npm test、npm run check、npm run build。完成條件：每個狀態中英均齊；stale worker event、cancel、reset cleanup 有自動測試；所有下載由明確按鈕觸發。

## T30 — 邊界、SEO 與 M1 收尾

Prerequisite：T20 checks 通過。

Allowed paths：public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。

補齊 100 檔/64 MiB/name collision/Unicode/Worker failure/no-auto-expiry/size cap 測試。確認兩語言靜態頁、離頁 warning、noindex、中英 title/description/H1/FAQ、鍵盤/窄版規格。輸出最後的 dist candidate；記錄 source SHA-256、每條命令與 exit、未驗項、限制到 HANDOFF 或 evidence/m1。

執行 node --version、npm test、npm run check、npm run build；只按實際 exit 標 CLI gate。browser 一律 NOT_RUN_USER_FOCUS_INCIDENT，沒有核准隔離 runtime 不執行。完成條件：可操作雙語本機候選版、真 ZIP bytes/索引、CLI checks 通過、browser 狀態誠實。回報 parent；M2 需 parent 另放行。

