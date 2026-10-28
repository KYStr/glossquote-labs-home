# 批次檔名整理 — 既有規格保存

Task ID: `labs-41-batch-rename` · Spec ID: `spec-41-batch-rename`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 批次檔名整理產品規格

**這是規格，尚未實作。** 下列需求是實作與驗收的契約；此文件不表示任何功能已寫完或已測試。

相關文件：[技術契約](TECHNICAL.md)、[介面與 SEO](UX-SEO.md)、[驗收案例](ACCEPTANCE.md)、[隱私契約](docs/PRIVACY-SECURITY.md)。

## 使用者工作

使用者在整理收據、照片或附件交付時，選取個別檔案、整理預定順序、選擇一種命名模式，確認每個新檔名，再明確下載不壓縮的 ZIP 副本。原檔案 bytes 不修改；使用者自行決定下載位置與解壓位置。

## 可觀察需求

### FR-01 初始畫面與資料界線

- 初始狀態是空清單，不顯示假檔案或預填個人資料。
- 第一屏固定揭露「下載重新命名後的 ZIP 副本。原檔不變；ZIP 不壓縮，下載後需解壓。」英文等義文案；不是只放在 FAQ 或頁尾。
- 工作資料只在目前頁面的記憶體。不得放進 URL、query、fragment、storage、history state、console、遙測、網路請求或錯誤追蹤。
- 頁面不提供任何上傳、登入、同步或伺服器轉檔功能。載入自家靜態頁面資產是唯一預期網路流量。

### FR-02 選檔與限制

- 使用標準多檔案選擇器，只接受個別檔案；不設定 `webkitdirectory`，不實作資料夾選取、資料夾拖放、任何拖放或 File System Access API。
- 檔案清單以應用程式收到的 FileList 順序新增；不宣稱此順序等於 OS 選擇器中的點選先後。不同批次選取的檔案接在既有清單尾端。使用者可用上移／下移按鈕明確調整順序。
- 每個來源 `File.name` 最多 1,024 UTF-16 code units；超過即拒絕新增批次。檢查此上限後，確認名稱是有效 Unicode scalar 序列，再拆副檔名或交給 planner；不成對 surrogate 不得 normalize 或交給 encoder 代換。
- 數量上限 100 個；單檔上限 16 MiB；總來源 bytes 上限 64 MiB。`1 MiB = 1,048,576 bytes`。等於上限接受，大於上限拒絕。
- 0-byte 檔案合法。不能讀取、沒有有效檔名、大小超限或整批新增會超過任一上限時，整個新增批次不加入，舊清單維持不變；逐項說明拒絕原因，不截短或只加入部分檔案。
- 顯示檔案名與大小為不可信純文字。選取檔名不作為路徑、不取用資料夾相對路徑，也不以它組合檔案存取位置。

### FR-03 清單順序與移除

- 列表順序是唯一命名序號順序。每列提供可命名的「上移」「下移」「移除」按鈕；第一列上移和最後一列下移停用。按鈕不用拖曳手勢作唯一途徑。
- 順序、移除或新增任一檔案會立即使舊名稱預覽、ZIP Blob 與下載 URL 失效，並取消正在讀取的工作。列表不允許覆寫或替換來源檔。
- 移除是從本頁工作清單移除，並不刪除來源檔或 OS 檔案。

### FR-04 命名模式與互斥性

- 使用可存取的單選群組在兩種命名模式間選一種。預設為序號命名；不允許兩種規則同時套用。
- 模式切換會同步重算預覽並使先前 ZIP/下載失效。非作用中模式欄位即使保留暫存值，也不得影響結果。
- planner 接收嚴格 discriminated rule schema：`sequence` 只接受 `mode, base, start, width`；`replace` 只接受 `mode, find, replacement, prefix`，其中 `prefix` 可省略並視為空字串。未知欄位、未知 mode、缺少必要欄位或不適用於目前 mode 的欄位一律拒絕，不忽略欄位、不推測修復。
- 所有命名輸入都是文字；不把文字解讀為路徑、正則、萬用字元或腳本。沒有「自動清理危險字元」或靜默改名。

### FR-05 序號命名

- 預設 `base = "file"`、`start = 1`、`width = 3`。
- `base` 必須是 1–80 個 Unicode scalar values；不得為空或含不成對 surrogate。超過上限或無效 Unicode 時不生成 ZIP。
- `start` 必須是 1 到 999,999,999 的十進位正整數；`width` 必須是 1 到 9 的整數。無空白、正負號、小數或指數格式。欄位錯誤時不生成任何 ZIP。
- 若目前清單非空且 `start + fileCount - 1 > 999,999,999`，整批規則無效；不可讓末筆超出界限，也不可回繞或部分生成。
- 對目前列表第 `i` 個檔案（從 `i = 0` 開始），序號為 `start + i`。十進位數字左側補零到至少 `width` 位，永不截短超過 width 的數字。
- 新 stem 為 `base + "-" + paddedSequence`；新名稱為 `newStem + originalExtension`。例如預設下 `receipt.PDF` → `file-001.PDF`；副檔名大小寫保留。原 stem 不複製到新名。
- `base` 不可為空；空字串不等於省略欄位。最後產生的每個完整名稱仍須通過 FR-08。

### FR-06 字面取代命名

- 輸入 `find` 必須非空且最多 80 個 Unicode scalar values；`replacement` 可為空、最多 80 個 Unicode scalar values；`prefix` 可為空、最多 40 個 Unicode scalar values。超限或含不成對 surrogate 時，規則無效。
- 將原檔名拆成 stem 與 extension；只對 stem 從左至右取代 `find` 的全部不重疊字面 occurrence。比對區分大小寫，不使用正則，不做語系轉換。每次命中後前進整個 find 的碼元長度；沒有命中是合法的 no-op。
- 取代完成後以 `prefix + replacedStem` 作為新 stem，再接回原 extension。Prefix 放在取代後 stem 前方；它不套用到 extension。
- 空 replacement 刪除所有命中；空 prefix 不改 stem。即使是 no-op，也必須進行完整名稱驗證與碰撞檢查。

### FR-07 副檔名拆分

- 副檔名定義為「最後一個 `.` 及其後非空 suffix」，輸出時包含該點並保留大小寫；否則 extension 是空字串。
- 若檔名恰為一個前導點加非空文字且沒有其他點（例如 `.gitignore`），整個檔名是無副檔名的 stem。
- 例：`photo.JPG` → stem `photo`、extension `.JPG`；`.env.local` → stem `.env`、extension `.local`；`.gitignore` → stem `.gitignore`、無 extension；`report.` → stem `report.`、無 extension。
- 不把檔名開頭視為路徑，不剝除 `/`、反斜線、磁碟代號或 `../` 前綴。若組合出的完整輸出名稱因此不安全，就拒絕該規則，不猜測使用者原意。

### FR-08 輸出檔名驗證與碰撞

每個完整輸出名稱依下列順序驗證；任一列失敗即阻擋整份 ZIP，不部分輸出：

1. 原始名稱與規則欄位必須是完整 Unicode scalar 序列；拒絕不成對 UTF-16 surrogate。不能先讓 `TextEncoder` 以 U+FFFD 代換再作判斷。
2. 對整個輸出名稱做 NFC normalize；不做 NFKC、大小寫改寫、空白修剪或字元替換。
3. 正規化結果不可為空、`.`、`..`；不可含 `/`、`\\`、U+0000–U+001F、U+007F、Windows 禁字 `<>:"|?*`。
4. 不可用 ASCII 空格或 `.` 結尾。中間空格合法。
5. 以第一個點前的 basename component（去掉其尾端 ASCII 空格與點後）作保守 device 檢查；不分 ASCII 大小寫拒絕 `CON`、`PRN`、`AUX`、`NUL`、`COM1`–`COM9`、`LPT1`–`LPT9`，包含任何副檔名；並拒絕數字 1/2/3 以 Unicode superscript ¹/²/³ 表示的 `COM`/`LPT` 形式，例如 `COM¹.txt`。
6. NFC 後以 UTF-8 編碼的長度最多 180 bytes，180 接受、181 拒絕。
7. 碰撞鍵是 `NFC(name).toUpperCase()`；整份清單碰撞鍵相同即拒絕整份 ZIP。依目前 JS runtime 的 Unicode uppercase mapping 比較，包含展開映射，例如 `ß` → `SS`。這是刻意保守的攔截規則，不是對任一作業系統完整 Unicode case-fold 或檔案系統語意的保證。

顯示該列原因與安全修正方式；不得把名稱改成可接受版本後默默繼續。預覽有任何錯誤或碰撞時，「建立 ZIP」停用。

### FR-09 預覽與生成

- 清單逐列顯示來源名、輸出名、大小、順序，以及檢查結果。長檔名用換行或局部捲動呈現，不觸發頁面水平捲動；檔名只當文字，不建立連結。
- 任一模式有錯誤時，無法下載部分有效列；整個批次 fail closed。
- 使用者明確按「建立 ZIP」後，依清單順序序列讀取來源 bytes、計算 CRC-32、建立不壓縮 ZIP。正在處理時顯示已讀檔數和狀態；提供「取消」。
- 每檔讀取長度必須等於選取時 `File.size`；讀取錯誤、取消、大小變動、ZIP 32-bit 上限錯誤或 Blob 建立失敗都不產生可用下載。錯誤使用固定 code 對應雙語文案，不回顯內容 bytes 或原始例外。
- ZIP 下載檔名固定為 `renamed-files.zip`，MIME 為 `application/zip`。檔案 entry 只使用已驗證的新名稱，不建立目錄 entry。
- 工具不寫回來源、不使用檔案系統寫入/覆寫 API；使用者代理的下載管理器負責儲存。若同名 ZIP 已存在，瀏覽器/OS 的提示、另存或命名行為由其設定決定，產品不宣稱能控制或保證這一層不覆寫。
- ZIP 內容原樣保留來源 bytes，包含 0-byte 檔案及內嵌 EXIF、文件屬性、縮圖、GPS 或其他 metadata；工具不檢查或清除。ZIP 會包含新 entry 檔名及檔案內容，故輸出本身可能仍帶有私人資訊。
- ZIP 使用 STORE，不做 DEFLATE、壓縮率估算或任何「變小」承諾。包裝 header 和新檔名會使 archive bytes 略大於 payload；下載後需自行解壓。

### FR-10 取消、舊結果失效與資源清理

- 每次選檔、移除、排序、規則欄位變更、模式切換、取消或清除都同步增加 generation，取消當前 File stream reader，清除舊預覽／錯誤／下載，撤銷舊 Blob URL 並放棄舊 byte chunk 引用。
- 單獨按「取消」只清除正在建檔的 snapshot、reader 與 bytes chunks；保留目前檔案清單及 File references、規則與排序，讓使用者可重試。只有移除／選檔等清單變更更新對應 File references；「清除」或 `pagehide` 才清空整個列表及所有 references。
- 任一 asynchronous completion 只可在 generation 仍相同時更新畫面或建立下載 URL；晚到結果一律丟棄並清理，不能覆蓋新一輪狀態。
- 清除操作回到空清單，不保留檔案名、檔案參考、bytes 或下載 URL。`pagehide` 同步取消讀取、增加 generation、撤銷 Blob URL、清除記憶體狀態；若頁面自 bfcache 恢復，工作區必須為空。
- 「下載」僅在使用者按鈕手勢中以 Blob URL 觸發；不寫入任意目錄，不控制瀏覽器預設下載資料夾或 OS 同名處理。
- 只能承諾本頁放棄引用與 revoke object URL；不得宣稱已安全抹除 OS、瀏覽器快取、GC、記憶體、下載檔或來源檔。

### FR-11 錯誤與恢復

- 每個錯誤同時說明原因與安全下一步，例如移除超限檔、改名或調整規則後重新建立 ZIP。
- 取消只取消正在讀取／建檔的工作，保留目前有效的檔案清單和規則，並回到可重試狀態；不保留部分 ZIP。
- 清單新增失敗時保留舊清單；ZIP 建檔失敗時保留清單和規則以便修正或重試，但不保留舊下載。
- 不顯示 stack trace、檔案內容或 raw bytes。拒絕不安全名稱不是產品故障，不提供「忽略檢查」或繼續按鈕。

### FR-12 隱私與安全

- 檔名、錯誤字串與輸入規則值以 `textContent` 或表單 value 呈現，不用 `innerHTML`、eval、動態 import、script URL、HTML 解析或可執行預覽。
- 不讀取其他分頁、剪貼簿、儲存空間、OS 設定、路徑、憑證或環境變數。檔案由使用者透過選擇器明確選取後才讀取。
- 工具不對使用者檔案內容執行 MIME sniffing、解碼、解壓縮、文件/圖片 parser、縮圖或 macro/script 執行。
- 發布版不得載入遠端字型、CDN、分析、廣告、service worker、第三方 SDK 或 telemetry。若自家靜態頁面需要網路，須把「檔案不會被上傳」與「頁面靜態資產需要載入」分開說明。

### FR-13 本機化與無障礙

- `public/index.html` 與 `public/en/index.html` 提供等價完整功能、所有狀態文案、錯誤、SEO 說明與 FAQ。切換語言會清除本頁資料，並在連結附近先揭露。
- 支援完整鍵盤流程；可透過按鈕上下移動清單並保持焦點在已移動列的同一操作。動態狀態使用適當 live region，不逐字宣讀檔名或每個 progress chunk。
- 320 CSS px 不出現頁面水平捲動；200% 縮放不丟失控制或結果。控制有可見 focus、語意標籤與至少 44×44 CSS px touch target；狀態文字不只靠顏色表達。

### FR-14 M1/M2 與發布

- M1 是本機靜態候選：Node 24+ tests/check/build 通過，ZIP 另由 Python 標準函式庫 `zipfile` 獨立驗證；不安裝 runtime/test dependencies。
- 真實 browser gate 目前為 `NOT_RUN_USER_FOCUS_INCIDENT`。在主對話證明測試機制不會取得使用者桌面焦點、不碰鍵盤/IME/剪貼簿/原生對話框並完成必要瀏覽器驗收前，不得把 browser gate 標 PASS。
- M1 不建立/更新 GitHub repo，不部署 Cloudflare。M2 僅在主對話確認所有必要 gate 已滿足後按其交接流程另行執行；不得由候選 build 自動發布。
- 本機 preview `noindex`。`rename.glossquote.com` 是候選名稱，不得在未來設定正式 canonical、sitemap 或公開 SEO 宣稱，直到網址和發布均經授權、完成核對。M2 僅為主代理完成必要 browser gate 後放行的 GitHub source publication；M3 部署和首頁整合由主代理處理，不能由 M1/M2 build 自動開始。

## MVP 與未來功能

MVP 只做個別檔案、兩種命名、預覽、排序/移除、STORE ZIP 下載、雙語靜態頁與本機測試。雲端、資料夾、拖放、覆蓋、原地 rename、EXIF 清理、壓縮、加密、解壓、undo、歷史、批次規則組合、正則、server-side processing、帳號、同步與公開 API 都不是 MVP，也不自動成為未來承諾。



---

## 原文件 TECHNICAL.md

# 批次檔名整理技術契約

**這是規格，尚未實作。** 這些規則描述預期設計，不是實測的 browser 相容性或容量保證。

對應文件：[產品需求](PRODUCT.md)、[驗收案例](ACCEPTANCE.md)、[實作佇列](TASKS.md)、[工程基線](docs/ENGINEERING.md)。

## 執行環境與檔案分層

- 產品：純 HTML、CSS、原生瀏覽器 ESM；正式頁面只處理靜態資產。
- 開發／測試：Node.js 24+ 與內建 `node:test`、`node:assert/strict`。不需 npm install；不新增 runtime 套件。
- ZIP 第二實作驗證：Python 標準函式庫 `zipfile`，不安裝第三方依賴。Node 測試與 Python 驗證分開執行，以免同一 writer 同時產生和判定自己的正確性。
- 設議中的來源樹：

```text
public/
  index.html
  en/index.html
  styles/tokens.css
  styles/app.css
  js/app.mjs
  js/i18n.mjs
  js/core/filename-planner.mjs
  js/core/zip-store.mjs
scripts/
  serve.mjs
  check.mjs
  build.mjs
  verify-zip.mjs
test/
  scaffold.test.mjs
  filename-planner.test.mjs
  zip-store.test.mjs
  verify-zip.py
  ui-contract.test.mjs
```

任何建立腳本必須實際檢查，不能以永遠成功或只跑 regex 的形式冒充安全驗證。preview/build 只發布審核過的 `public/` 到本工具自己的 `dist/`；不能清理 workspace root 或讀取使用者來源檔案。

## 純函式介面

- `splitFilename(name: string) -> { stem, extension }`
- `replaceNonOverlapping(stem: string, find: string, replacement: string) -> string`
- `validateOutputName(candidate: string) -> { normalizedName, utf8Length }`；失敗僅丟固定 `code`，不帶原始檔名或內容。
- `collisionKey(normalizedName: string) -> string`，精確為 `normalizedName.toUpperCase()`。
- `planRenames(items: Array<{name, size}>, rule) -> {rows, errors, canBuild}`；純邏輯，輸入不 mutation，不接觸 DOM、Blob、File、網路、console、storage 或時間。先以常數時間檢查 item count ≤100、每筆 size 為有效非負整數且 ≤16 MiB、總和 ≤64 MiB；每個 `name` 在任何碼點掃描前最多 1,024 UTF-16 code units，隨後拒絕不成對 surrogate；嚴格檢查 rule schema，unknown keys 一律拒絕。`sequence` 僅允許 `{mode, base, start, width}`，`replace` 僅允許 `{mode, find, replacement, prefix}`；mode-specific 必要欄位缺少時拒絕。
- `crc32(chunks: Iterable<Uint8Array>) -> uint32`；可分塊累積，同時接受空輸入。
- `buildStoreZip(entries, { signal, generation }) -> Promise<Blob>`；只接受經 planner 驗證的名稱及有界檔案記錄。實際 File stream 讀取可由獨立 controller 注入，避免 pure module 依賴 DOM。
- UI controller 持有 `generation`、File references、目前 reader、byte chunks、ZIP Blob 與 Blob URL。純函式不得自行存放全域狀態。

## 檔名演算法與邊界

1. 先做 bounded input 檢查，再掃描內容：File name 最多 1,024 UTF-16 code units；base/find/replacement 最多 160 UTF-16 units；prefix 最多 80 units。之後確認沒有孤立 surrogate，再依 Unicode scalar values 分別限制 base 80、find 80、replacement 80、prefix 40。不得把 UTF-16 code unit 長度誤當 code point 數。`start`/`width` 在 planner 必須是 Number safe integers；UI 從使用者輸入字串只接受 ASCII `0`–`9`，以逐字掃描驗證，不使用 regex 或寬鬆 `Number()` coercion。
2. 依 PRODUCT FR-07 拆 extension。對 replacement 使用 literal `indexOf`/碼點掃描或等義字面演算法；不接受 RegExp、不作 regex escape trick。成功匹配後向前推進整個 find，保證非重疊。
3. 組合完整 candidate name 後做 NFC。對 NFC 輸出執行危險字元、尾端、device basename、UTF-8 byte 長度驗證。
4. 先驗證所有列都有效，再建立 collision key set。任何重複鍵即 `canBuild=false`；不得只匯出可用列。
5. `toUpperCase()` 使用執行環境 Unicode mapping，可能一個字元展開成多字元。規格只承諾按此鍵值阻擋，不宣稱完整 Unicode case-fold 或各檔案系統同名判斷。
6. `base` 為 1–80 Unicode scalar values。序號用安全整數計算 `start + index`；清單非空時，先檢查 `start + count - 1 <= 999,999,999`，超界整批拒絕。pad 是 minimum width。任何數字/字串超界、NaN、fraction、負數都固定拒絕。結果仍依 FR-08 完整驗證。

## 記憶體、有界讀取與取消

- 先驗 file count、每檔 `size`、aggregate `size`，再讀 bytes。讀取順序是列表順序，並且一次只讀一個 File；同時讀取數固定為 1。
- 使用 `File.stream()` 的 reader 分塊處理。每個來源 bytes 記錄成有界 `Uint8Array` chunks，逐塊累計實際長度與 CRC。單 chunk 如超出建議 256 KiB chunk target，切成多段複製；總來源 bytes 不超過 64 MiB。header/central-directory 資料另受每檔 180-byte 名稱及 100 檔上限約束。
- 累積讀得 bytes 必須精確等於 `File.size`，否則全批失敗。即使上限只有 64 MiB，也不保證特定手機/瀏覽器可用記憶體；`ReadableStream`、Blob 建構或瀏覽器資源不足時需明確失敗，不縮小規格、不退回單一巨大 `ArrayBuffer`/concat、不傳雲端。
- 讀取只在使用者選檔後開始。取消/更改/清除時呼叫目前 reader 的 `cancel()` 並釋放 reader lock。單獨取消只清除目前 build snapshot、讀取中的 reader 與該次 build 的 bytes chunks；保留清單和規則持有的 File references，供使用者重試。若是移除/選檔等清單變更，按新列表更新 File references；只有清除或 `pagehide` 清空列表 references。檔案讀取不開啟 OS 對話框或觸發原生 UI。
- 每個可能 await 的步驟前後檢查 generation 與 cancel 狀態。只有同一代讀取完成且所有紀錄仍有效時可建立 Blob/URL。過時工作不得顯示成功、下載、寫入 storage 或重設新一代狀態。
- `pagehide` 增加 generation、取消 reader、撤銷 URL、清空頁面 state。恢復 bfcache 時顯示空白工作區。

## ZIP STORE 二進位格式

ZIP 遵循 PKWARE APPNOTE 的 local file header、central directory 與 EOCD 結構；功能採 STORE（method 0），不使用 ZIP64。欄位皆 little-endian，先計算每筆資料需要的長度與 offset，再驗證所有長度與 offset 可由 uint32 表示；任何超界在 Blob 建構前失敗。

| 欄位 | 固定規則 |
|---|---|
| entry 數量 | 1–100；清單空時禁用建立 ZIP |
| entry name | NFC 後 UTF-8 bytes；長度 ≤180 bytes；local/central 完全一致 |
| general purpose bit flag | `0x0800`（UTF-8/EFS）；無 data descriptor bit |
| version fields | version needed to extract 為 `10`（ZIP 1.0 default；STORE 不需要更高版本）；version made by 固定為 `20`（MS-DOS host、ZIP 2.0 encoding marker） |
| compression method | `0` STORE；compressed size = uncompressed size |
| CRC-32 | IEEE/ZIP CRC-32：反射多項式 `0xEDB88320`、初值 `0xFFFFFFFF`、final XOR `0xFFFFFFFF`；空資料結果 0 |
| time/date | time `0x0000`、DOS date `0x0021`，固定 1980-01-01 00:00:00，不採用 OS 時區或來源修改時間 |
| extra/comment | local extra length 0、central extra length 0、entry comment 0、EOCD comment length 0 |
| entry flags | 無加密、無 data descriptor、無目錄 entry；只有 UTF-8 flag |
| ZIP64 / multi-disk | 不輸出任何 ZIP64 extra/record；disk number 皆 0；不支援分卷 |
| external attributes | 固定為 0；不保留來源權限、時間、owner 或資料夾路徑 |
| record 結構 | local header → file payload chunks；所有 entries 後接 central directory；最後單一 EOCD |

不要把全 ZIP 攤平成一個超大 Uint8Array。每個 local header、檔名、payload chunk、central record 與 EOCD 作為分塊 Blob parts，按 offsets 順序傳入 `new Blob(parts, { type: "application/zip" })`。測試與失敗路徑也不得以巨大 concat 回退。Blob 建構可能由瀏覽器複製資料；上限不構成實際記憶體或速度保證。

## 下載與 UI 狀態

```text
EMPTY → FILES_READY → NAMES_INVALID | NAMES_VALID
NAMES_VALID → BUILDING → READY_TO_DOWNLOAD
BUILDING → CANCELLED | BUILD_FAILED
任何 state + file/order/rule change → 立即增加 generation、撤銷舊 URL、重新計算
任何 state + clear/pagehide → EMPTY（pagehide 不保留 bfcache state）
```

- ZIP Blob URL 只能在完整 ZIP 成功後建立。狀態改變、取消、清除、新一輪產物與 `pagehide` 同步 revoke 舊 URL，刪除 Blob 引用。
- 新 generation 開始即同步清空成功訊息與下載 href，不能等舊工作 cancel promise 完成才讓 UI 更新。
- 下載只能由使用者 click `download` 控制觸發，固定名稱 `renamed-files.zip`。不使用 File System Access API，不呼叫寫入檔案系統 API，不可保證瀏覽器 save dialog 的路徑、同名覆寫詢問或 OS 下載管理行為。

## 必要官方參考

- [PKWARE ZIP File Format Specification (APPNOTE), v6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)：ZIP record、STORE、UTF-8 flag、CRC、EOCD 與 ZIP64 定義；實作前核對這個固定 revision 的欄位值。
- [W3C File API](https://www.w3.org/TR/FileAPI/)：File/Blob 的 bytes 與讀取介面。標準不保證每個設備的可用記憶體、特定 File chooser 排序或此產品的效能。
- [ECMAScript `String.prototype.normalize`](https://tc39.es/ecma262/2022/multipage/text-processing.html#sec-string.prototype.normalize)：Unicode normalization 呼叫形式；本產品選 NFC 是本地策略。
- [Node.js 24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html)：開發期 `node:test` 及 `node --test`。Node 測試不替代 browser API 驗收。
- [Python `zipfile`](https://docs.python.org/3/library/zipfile.html)：獨立標準庫 ZIP 讀取、CRC 與 payload 驗證；不需 `pip` 依賴。

這些參考不是對 ZIP reader 的全面相容性認證，也不是本工具通過瀏覽器或作業系統測試的證據。相容性只可依 ACCEPTANCE 中實際執行並記錄的矩陣報告。



---

## 原文件 UX-SEO.md

# 批次檔名整理介面與 SEO

**這是規格，尚未實作。** 使用 Product App 模式；畫面以待整理檔案清單與名稱預覽為主，不做行銷首頁式 hero、假檔案卡片或抽象插畫。互動規則見[產品規格](PRODUCT.md)，視覺和無障礙細節遵守本工具[設計系統](docs/DESIGN-SYSTEM.md)，資料生命週期遵守[隱私契約](docs/PRIVACY-SECURITY.md)。

## 資訊階層

- 常駐可見：產品名稱、語言/首頁連結、空間與總量狀態、第一屏 ZIP/原檔/解壓說明、選檔按鈕、目前命名模式、主要動作。
- 與檔案相鄰：名稱預覽、大小、上移/下移/移除和該列錯誤。
- 次要說明：命名限制、metadata/privacy 說明與 FAQ；不能藏起 ZIP 不壓縮或不清理 metadata 的事實。
- 只在檔案有效、無名稱錯誤且沒有建檔工作時，顯示可用的「建立 ZIP」主按鈕。`下載 ZIP` 只出現在成功後。
- 不做拖放；不把資料夾、連結或路徑作可接受 drop target。

## Desktop wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ Gloss Tools / 批次檔名整理                    English   工具首頁    │
├────────────────────────────────────────────────────────────────────┤
│ 批次檔名整理                                                       │
│ 下載重新命名後的 ZIP 副本。原檔不變；ZIP 不壓縮，下載後需解壓。    │
│ 選取個別檔案；最多 100 個、每檔 16 MiB、合計 64 MiB。              │
│ [選取檔案]         0 / 100 檔 · 0 B / 64 MiB                      │
│                                                                    │
│ 命名方式  (●) 序號命名   base [file] start [1] width [3]            │
│           ( ) 字面取代   prefix [...] find [...] with [...]         │
│                                                                    │
│ 順序  原檔名          輸出預覽             大小       操作          │
│ 1     receipt.PDF     file-001.PDF         2.1 MiB   [↑][↓][移除]  │
│ 2     photo.JPG       file-002.JPG         4.8 MiB   [↑][↓][移除]  │
│                                                                    │
│ 碰撞/命名錯誤在此列內顯示；任何錯誤都會停用整批 ZIP。             │
│                                      [建立 ZIP] / [取消]             │
│                                                                    │
│ 僅本機處理；不會上傳。檔案內 metadata 會原樣保留。                 │
│ 操作方式 · 檔名規則 · FAQ                                         │
└────────────────────────────────────────────────────────────────────┘
```

## Mobile wireframe

```text
┌──────────────────────────────┐
│ 批次檔名整理    English       │
│ 工具首頁                     │
├──────────────────────────────┤
│ 下載重新命名後的 ZIP 副本。   │
│ 原檔不變；ZIP 不壓縮，        │
│ 下載後需解壓。                │
│ 最多 100 檔 / 每檔 16 MiB /   │
│ 合計 64 MiB                   │
│ [選取檔案]                   │
│ 2 / 100 檔 · 6.9 MiB / 64 MiB│
│ 命名方式                     │
│ (●) 序號   ( ) 字面取代       │
│ base [file]                  │
│ start [1]     width [3]      │
│ ──────────────────────────── │
│ 1 · receipt.PDF               │
│ → file-001.PDF · 2.1 MiB      │
│ [上移] [下移] [移除]          │
│ ──────────────────────────── │
│ 2 · photo.JPG                 │
│ → file-002.JPG · 4.8 MiB      │
│ [上移] [下移] [移除]          │
│ [建立 ZIP]                   │
│ 檔案只在本機處理；metadata 保留│
└──────────────────────────────┘
```

寬度小於 48rem 時清單列改為垂直區塊，控制可換行；不藏核心功能。超長檔名可以在該列局部換行或標示名稱的水平捲動區顯示，但整頁不能橫向捲動。

## 兩語操作文案

| 狀態/位置 | 繁體中文 | English |
|---|---|---|
| H1 | 批次檔名整理 | Batch rename files |
| 首屏承諾 | 下載重新命名後的 ZIP 副本。原檔不變；ZIP 不壓縮，下載後需解壓。 | Download a renamed ZIP copy. Your originals stay unchanged. The ZIP is uncompressed; unzip it after download. |
| 選檔 | 選取檔案 | Select files |
| empty | 尚未選取檔案。選取個別檔案以預覽新名稱。 | No files selected. Select individual files to preview the new names. |
| 限制 | 最多 100 個檔案；每檔 16 MiB；合計 64 MiB。 | Up to 100 files; 16 MiB per file; 64 MiB total. |
| 序號模式 | 序號命名 | Numbered names |
| 字面模式 | 字面取代 | Literal replacement |
| 調整順序 | 上移 / 下移 | Move up / Move down |
| 移除 | 從清單移除 | Remove from list |
| 主動生成 | 建立 ZIP | Build ZIP |
| 處理中 | 正在讀取第 {current} / {total} 個檔案，建立未壓縮 ZIP… | Reading file {current} of {total} and building the uncompressed ZIP… |
| 取消 | 取消 | Cancel |
| 成功 | ZIP 已建立。檔案 bytes 未修改；下載副本後需解壓。 | ZIP ready. File bytes were not changed; unzip the downloaded copy. |
| 下載 | 下載 ZIP 副本 | Download ZIP copy |
| 同名下載 | 若已有同名 ZIP，瀏覽器/OS 會依你的下載設定處理；工具不會寫回來源檔。 | If a ZIP with this name already exists, your browser or OS handles it according to your download settings. The tool does not write to your source files. |
| 檔案超限 | 此檔案超過 16 MiB，未加入清單。 | This file exceeds 16 MiB and was not added. |
| 總量超限 | 加入這批檔案會超過 64 MiB，整批未加入。 | Adding these files would exceed 64 MiB; none of this batch was added. |
| 數量超限 | 加入這批檔案會超過 100 個，整批未加入。 | Adding these files would exceed 100 files; none of this batch was added. |
| 不安全名稱 | 這個輸出檔名包含不允許的內容。請調整命名規則；名稱不會自動修正。 | This output name contains a disallowed value. Adjust the naming rule; the name will not be changed automatically. |
| 名稱碰撞 | 有些輸出檔名重複或太相近，例如只差大小寫或等價字元。請調整規則或清單後再建立 ZIP。 | Some output names repeat or are too similar, such as differences only in case or equivalent Unicode characters. Adjust the rule or list before building the ZIP. |
| 名稱比對說明 | 部分系統可能把只差大小寫或等價 Unicode 寫法的檔名視為相同；此工具會阻止這些重複輸出，請調整規則。 | Some systems may treat names that differ only by case or equivalent Unicode forms as the same. This tool blocks those duplicate outputs; adjust the rule to continue. |
| 讀取失敗 | 無法完整讀取所選檔案。沒有建立 ZIP；請重新選取檔案後再試。 | A selected file could not be read completely. No ZIP was created; select the files again and retry. |
| 建檔失敗 | 無法在此裝置完成 ZIP。沒有可下載的部分檔案；請減少檔案後重試。 | This device could not finish the ZIP. No partial download is available; try fewer files. |
| 隱私 | 檔案在此瀏覽器本機處理，不會上傳。檔案 bytes 與內嵌 metadata 會原樣保留。 | Files are processed locally in this browser and are not uploaded. File bytes and embedded metadata remain unchanged. |
| 語言切換 | 切換語言會清除此工作區的檔案與設定。 | Changing language clears files and settings from this workspace. |

錯誤 message 僅由固定 error code 對應；不要回顯原始例外、bytes、完整檔案內容或偽成功訊息。狀態 badge 同時用文字與圖示，不以顏色單獨表示。

## SEO 文案（繁體中文）

- **Title：** 批次檔名整理與 ZIP 下載｜GlossQuote
- **H1：** 批次檔名整理
- **Description：** 在瀏覽器中整理收據、照片與附件檔名，預覽序號或字面取代結果，再下載不壓縮的 ZIP 副本。原始檔案不會被修改，下載後需自行解壓。
- **工作說明：** 選取個別檔案後，依列表順序檢查新檔名。你可以使用序號命名，或對檔名主體的指定文字做字面取代並加上前綴。所有名稱會在建立 ZIP 前先檢查；若有不允許的字元、保留名稱或碰撞，整批會停止，不會悄悄改名。工具不會將檔案上傳，也不讀取內容作預覽；ZIP 會逐位元組保留原檔內容，包括照片或文件中可能存在的 metadata。ZIP 使用不壓縮格式，因此它通常會比所有來源內容的總 bytes 稍大。下載後請在你的裝置上解壓，並自行檢查交付副本。
- **步驟：** 選取檔案 → 選擇一種命名方式 → 調整清單與預覽 → 建立並下載 ZIP → 自行解壓檢查。

## SEO copy (English)

- **Title:** Batch File Renamer and ZIP Download | GlossQuote
- **H1:** Batch rename files
- **Description:** Rename receipts, photos, and attachments in your browser. Preview numbered or literal replacement names, then download an uncompressed ZIP copy. Originals stay unchanged; unzip the copy after download.
- **Page copy:** Select individual files and review their order before building an archive. Choose numbered names or replace literal, non-overlapping text in each filename stem, with an optional prefix. The tool checks every output name before creating the archive. Unsafe names and collisions stop the whole batch; no name is silently repaired. Files are processed in this browser and are not uploaded. Their bytes remain unchanged, including embedded photo and document metadata. The ZIP uses the STORE method and does not compress its contents, so its size can be larger than the combined source bytes. Download the copy, unzip it on your device, and check the files before delivery.
- **Steps:** Select files → choose one naming mode → review order and names → build and download the ZIP → unzip and check the copy.

## FAQ

| 繁體中文問題與回答 | English question and answer |
|---|---|
| **會改動或覆蓋我的原檔嗎？** 不會。工具只下載另一份 ZIP 副本；下載位置與同名處理由瀏覽器或 OS 決定。 | **Will this change or overwrite my originals?** No. The tool downloads a separate ZIP copy. Your browser or OS controls the download location and same-name behavior. |
| **ZIP 會壓縮照片或文件嗎？** 不會。ZIP 使用 STORE，不壓縮，下載後需要解壓。 | **Does the ZIP compress photos or documents?** No. It uses the ZIP STORE method and does not compress files. Unzip the download before use. |
| **照片的 EXIF 或文件 metadata 會移除嗎？** 不會。工具保留原始 bytes，也不檢查或移除內嵌 metadata。 | **Does it remove photo EXIF or document metadata?** No. It preserves the original bytes and does not inspect or remove embedded metadata. |
| **為什麼不接受部分檔名？** 為避免路徑、保留名稱或碰撞造成誤解，任何不安全輸出都會阻止整批建立 ZIP，不會自動修名。 | **Why are some names rejected?** Unsafe names, reserved names, or collisions stop the whole archive so names are not silently altered. |

SEO 公開 canonical、hreflang、sitemap、robots 設定與正式結構化資料只可在未來正式 origin 確認並經發布 gate 後加入。當前 preview 必須有 `noindex`；不得將候選 `rename.glossquote.com` 寫成已可用網址、沒有來源的市場需求、支援度或安全認證。

給使用者的碰撞說明可補充：「不同系統可能把只差大小寫或等價 Unicode 寫法的名稱視為相同，因此本工具會保守地阻止這些輸出。」不要在主要操作 copy 顯示 `NFC`、`toUpperCase()`、Unicode case-fold 等演算法術語。

## 無障礙與互動品質

- 每個欄位有可見 label、錯誤關聯與範例說明；placeholder 不作為唯一 label。
- 上移/下移/移除按鈕名稱含序號和檔名，成功後焦點留在移動列相同功能按鈕；行動裝置可使用觸控按鈕，不需拖曳。
- 以 `aria-live="polite"` 更新總數、建檔狀態和完成/失敗一次；不把完整檔案 bytes 或每個 progress chunk 公開給讀屏器。
- 可見 focus、至少 4.5:1 一般字對比、控制邊界至少 3:1、44×44 CSS px 觸控目標；320 px viewport、200% zoom、鍵盤與 screen-reader 狀態都納入驗收。
- 使用可預期的 120–180 ms 回饋並遵守 reduced motion。busy 狀態同步顯示，取消可用；不使用無限裝飾動畫、hover-only 控制或假樣本。



---

## 原文件 ACCEPTANCE.md

# 批次檔名整理驗收規格

**這是規格，尚未實作；以下案例全部是預期，不代表已執行或通過。** 案例以本機合成 FileLike 與假 bytes 驗證，不能要求真實使用者檔案。

對應需求：[產品規格](PRODUCT.md)、[技術契約](TECHNICAL.md)、[實作任務](TASKS.md)。

## 層級

- **N**：Node 24+ 純函式/ZIP 產生測試，使用 synthetic data。
- **P**：Python 標準函式庫 `zipfile` 獨立驗證 Node 產生的測試 archive；不得安裝 Python package。
- **B**：真實 Chrome/Edge browser 操作與裝置觀察。現況必須標 `NOT_RUN_USER_FOCUS_INCIDENT`；不得用 Node 測試、靜態掃描或非隔離 UI 操作代替。
- **S**：本機靜態 CLI/build/check；不代表 browser gate 或部署完成。

N/P/S 是 M1 本機候選 gate。B gate 只可在主要負責人先確認執行方式真正隔離、不會碰使用者焦點、鍵盤、IME、剪貼簿或原生對話框後安排。每項結果記錄實際輸入、Node/Python/瀏覽器版本、結果與證據；未跑就是 `NOT_RUN`。

## 案例

| ID / 需求 | 層級 | 輸入或步驟 | 預期結果 |
|---|---|---|---|
| BR01 FR-01 | B | 開啟空白頁面，不選檔 | 清單為空；首屏中英文均揭露原檔不變、ZIP 不壓縮、需解壓；無假資料。 |
| BR02 FR-02 | N/B | 新增一個 0-byte 檔案 | 接受，大小顯示 `0 B`；可用兩種模式預覽並包含零 bytes 的 ZIP entry。 |
| BR03 FR-02 | N/B | 一個剛好 16 MiB 的合成檔案 | 接受；讀取後實際 byte 數相等。 |
| BR04 FR-02 | N/B | 一個 16 MiB + 1 byte 的檔案 | 拒絕該整批選擇；既有檔案清單不變；顯示單檔超限錯誤。 |
| BR05 FR-02 | N/B | FileList 有 100 個 0-byte 檔案，再新增 1 個 | 前 100 個接受；第 101 個新增批次整批拒絕；不靜默只加部分。 |
| BR06 FR-02 | N | 64 MiB 總 payload 的合成 items | 接受大小預檢；64 MiB + 1 byte 全批拒絕；未讀取超限 payload。 |
| BR07 FR-02/03 | B | 兩次依序各選 2 個檔案 | 第二次選取的 FileList 順序接在清單末端；清單順序與序號一致，不以 OS 點選先後作保證。 |
| BR08 FR-03/10 | N/B | 建立 ZIP → 上移/下移一列 | 順序明確改變，序號預覽重算；舊 ZIP/URL 同步撤銷，舊工作晚到不得恢復。 |
| BR09 FR-03 | B | 第一列按上移、末列按下移，再以鍵盤移動中間列 | 兩個邊界按鈕停用；鍵盤可移動列，操作後焦點留在相同列功能。 |
| BR10 FR-05 | N/B | 預設模式，輸入 `receipt.PDF` | 預覽精確為 `file-001.PDF`；第二列為 `file-002` 加其原副檔名；大小寫保留。 |
| BR11 FR-05 | N | `start=999`、`width=3`、4 個檔案 | 序號為 `999`、`1000`、`1001`、`1002`；數字不截短。 |
| BR12 FR-05 | N | start=0、fraction、exponent、width=0/10、空 base | 每種 invalid input 都給固定欄位錯誤，沒有 `canBuild`，不產生部分 ZIP。 |
| BR13 FR-07 | N | `.gitignore`、`.env.local`、`report.` | 分別拆為 (`.gitignore`, `""`)、(`.env`, `.local`)、(`report.`, `""`)；來源副檔名大小寫/字串精確保留。 |
| BR14 FR-06 | N | stem `aaaa`，find `aa`，replacement `x` | 新 stem `xx`；匹配不重疊，字面區分大小寫。 |
| BR15 FR-06 | N | stem `receipt`，find `xyz`、replacement `z`、prefix `pre-` | 無命中仍合法；輸出 stem 為 `pre-receipt`；prefix 加在取代後 stem 前，不套用 extension。 |
| BR16 FR-06 | N | find 空、81 code points；replacement 81；prefix 41 | 各自拒絕。find 80、replacement 80、prefix 40 的有效邊界接受，最後名稱仍需過輸出驗證。 |
| BR17 FR-06 | N | find `-`、replacement 空，stem `a-b-c` | 全部 `-` occurrence 移除，結果 stem `abc`；不以 regex 執行。 |
| BR18 FR-07 | N | 無點名稱 `receipt`、`.gitignore`、`a.b.CSV` | extension 分別為空、空、`.CSV`；新名稱依模式保留正確 stem/extension。 |
| BR19 FR-08 | N | candidate 含 `/`、反斜線、控制碼、DEL、`<>:"|?*` | 各自拒絕輸出；不剝路徑、不用替代字元靜默修名。 |
| BR20 FR-08 | N | `""`、`.`、`..`、`name.`、`name ` | 全部拒絕；中間空格 `my receipt.pdf` 可接受。 |
| BR21 FR-08 | N | `CON`, `con.txt`, `PRN.log`, `COM1`, `LPT9.pdf`, `COM¹.txt`, `LPT³` | 每種都作為保留裝置名稱拒絕，含副檔名和 superscript 形式。 |
| BR22 FR-08 | N | `cafÃ©.txt` 與含 U+FFFD 的有效 Unicode 名稱 | 按目前字面碼點驗證；不猜測、轉碼、修復 mojibake。若其他規則允許，顯示並保留原有效 scalar。 |
| BR23 FR-08 | N | candidate 含孤立 high surrogate 或孤立 low surrogate | 在 NFC/UTF-8 encode 前拒絕；不得讓 encoder 代換成 U+FFFD 後繼續。 |
| BR24 FR-08 | N | NFC 後 UTF-8 長度正好 180 bytes、181 bytes | 180 接受；181 拒絕；用 bytes 數，不用 UTF-16 長度或 code point 數。 |
| BR25 FR-08 | N | 兩個 decomposed/composed 等價名稱，例如 `e + U+0301.txt` 與 `é.txt` | 輸出 NFC 後碰撞；整批 `canBuild=false`。 |
| BR26 FR-08 | N | 同名 `Receipt.TXT` 和 `receipt.txt`、literal 模式 no-op，ID `collision001` | 比較鍵同為 `RECEIPT.TXT`；阻擋全批，列出兩個衝突 row，沒有下載。 |
| BR27 FR-08 | N | `ß.txt` 與 `ss.TXT` | `toUpperCase()` 展開使鍵值碰撞；阻擋整批。測試只證明此規則，不推及所有 filesystem Unicode 行為。 |
| BR28 FR-08 | N | literal input 產生 `safe` 與 `safe` 相同兩個輸出 | 即使來源 bytes/內容不同也視為檔名碰撞；全批失敗。 |
| BR29 FR-09 | N/P | Payload bytes `[00, FF, 10, 41, 00]` 加 0-byte 檔案 | `zipfile` 讀出的兩個 payload 與來源 bytes 逐一完全一致，第二檔大小為 0；來源 FileLike 未被修改。 |
| BR30 TECH | N | CRC-32 input ASCII `123456789` | CRC 精確為 `0xCBF43926`；空 bytes 為 `0x00000000`；分多 chunk 與單 chunk 結果相同。 |
| BR31 TECH | N | 解析生成 ZIP 的 local/central/EOCD header | method=0、UTF-8 flag=0x0800、固定 date=0x0021/time=0、crc/size/offset 一致；extra/comment=0，無 encryption、descriptor、directory entry、ZIP64、multi-disk。 |
| BR32 TECH | P | Node 使用合成輸入建一個 ZIP，Python `zipfile` 讀取 | Python 能列出 NFC entry names、method STORED、預期 payload/size；`testzip()` 回傳 None，CRC 驗證成功。使用 Python 標準庫，無 pip install。 |
| BR33 TECH | N | 合成 header/offset 長度恰達 uint32 可表示上限與越界值，不配置大型真 payload | 界內通過預檢；越界在 Blob 建立前固定錯誤，無 wraparound、ZIP64 fallback 或部分 archive。 |
| BR34 FR-10 | B | 開始建置後立刻取消，再啟動新一代 build；讓舊 promise 晚到 | 取消同步停用舊下載並要求 reader.cancel；舊 completion 被 generation 丟棄，不能污染新狀態。 |
| BR35 FR-10 | B | 開始建置後修改規則、重排、移除、清除 | 每個動作同步清除預覽與下載、revoke URL 並取消 reader；沒有舊工作可晚到覆蓋。 |
| BR36 FR-10 | B | 成功建立 Blob URL 後觸發 `pagehide`，再返回/恢復 bfcache | URL 被 revoke，檔案/bytes/規則 state 清空；恢復畫面是空工作區。 |
| BR37 FR-11 | N/B | synthetic stream 少讀/throw、Blob 建構失敗、資源錯誤 | 整批失敗，沒有部分可下載 ZIP；錯誤不包含 raw exception/bytes；清單保留以供重試。 |
| BR38 FR-12 | B | 真實 Network/Storage 觀察：選取/處理合成檔案、產生 ZIP、取消、清除 | 除自家靜態資產外沒有網路請求或上傳；沒有 local/session storage、IndexedDB、cookies、URL/history/console 內容。需完整 Network 記錄，不能以 ResourceTiming 單獨 PASS。 |
| BR39 FR-12 | B | 檔名/規則中放 `<img src=x onerror=...>`、`javascript:`、`../` | 所有內容只顯示為文字；無 script、HTML、資源載入、導航或路徑組合；若完整輸出違規，建立 ZIP 停用。 |
| BR40 FR-13 | B | 鍵盤完成選檔後所有規則/重排/取消/下載控制 | 焦點順序可預期，focus 可見，無鍵盤陷阱；狀態文字有語意且不依賴顏色。 |
| BR41 FR-13 | B | 320 CSS px、200% zoom、較長英文文案、超長檔名 | 不丟控制、不遮住主要按鈕、不出現整頁水平捲動；名稱可讀/局部捲動且清單 controls 可達。 |
| BR42 FR-13 | B | 中英切換時清單有 selected files | 切換前揭露清除效果；切換後檔案/規則/preview/Blob 全清空；功能和錯誤文案仍完整等價。 |
| BR43 FR-14 | S | `npm test`, `npm run check`, `npm run build`, ZIP cross-check | 只記實際命令 exit/status；M1 只可標 CLI PASS/FAIL/NOT_RUN。所有 browser gate 保留 `NOT_RUN_USER_FOCUS_INCIDENT` 直到合格隔離實測。 |
| BR44 FR-02/08 | N | source name 長度正好 1,024 UTF-16 code units 與 1,025 units | 1,024 仍進入有效 scalar/filename 驗證；1,025 在掃描、拆分或 normalization 前拒絕。含不成對 surrogate 的 ≤1,024 名稱也拒絕。 |
| BR45 FR-04/05 | N | base 為 1、80、81 Unicode scalar values；另測孤立 surrogate | 1 與 80 可繼續名稱驗證；空/81/不成對 surrogate 拒絕。計數按 Unicode scalar，不按 UTF-16 units。 |
| BR46 FR-04 | N | `sequence` rule 帶 `find`；`replace` rule 帶 `start`；任一 rule 帶未定義 `unexpected`；replace 缺 `find` | 每例都以固定 schema error 拒絕；planner 不忽略 unknown key、不拿另一模式欄位推測規則。 |
| BR47 FR-05 | N | 100 檔，`start=999999900` 與 `start=999999901` | 前者最後序號 `999999999` 可接受；後者最後序號 `1000000000`，整批拒絕且沒有部分結果。 |
| BR48 FR-10/11 | B | 建檔中按「取消」後按重試；另外分別測清除和 pagehide | 單獨取消只清 build snapshot/chunks，保留清單 File references、排序與規則，可重試；清除/pagehide 才清空列表 references。過時建檔結果不得復活。 |
| BR49 FR-02/07/08 | N | synthetic source name `../receipt.pdf`；分別測 sequence 預設及 replace no-op | 不把來源名當路徑、不剝 `../`；sequence 只按既定規則組合 stem/extension。replace no-op 產生含 slash 的輸出時拒絕，不自動刪除路徑片段。 |

## 必要合成資料方法

- 在 Node tests 用 `new Uint8Array()` 建構 bytes；CRC 測例將 ASCII 字串 `123456789` 明確編碼成 9 bytes。
- 16 MiB/64 MiB 邊界用 `FileLike {name, size, stream}` stub 驗預檢；實際讀取測試以分塊合成資料，不需下載或製造使用者文件。
- 真 browser 驗收用臨時 synthetic fixture（0-byte、少量任意 bytes、UTF-8 名稱），不得要求開啟使用者既有圖片、收據或附件。
- ZIP 跨驗證由本產品 Node writer 生成 fixture，再由 Python 標準 `zipfile.ZipFile` 開啟和讀取；expected bytes/name 必須在獨立 fixture 常數內，不可由產品 parser 計算 expected。



---

## 原文件 TASKS.md

# 批次檔名整理任務佇列

**這是規格，尚未實作。** 全部任務尚未開始；失敗須回到 owning task 修正，不得向後打勾。每項只動所列 paths，所有命令均在工具根目錄執行。一次完成一個 milestone 並回寫工具 HANDOFF；本輪只建立規格，沒有建立或執行任何命令。

## T00 靜態骨架與開發工具

- 前置：主對話審閱此六份規格；檢查 Node 24+ 命令存在與版本。不要讀憑證或變更 persistent environment。
- allowed paths：`package.json`、必要 `package-lock.json`（runtime/test 無套件時不建）、`.gitignore`、`public/index.html`、`public/en/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/i18n.mjs`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`test/scaffold.test.mjs`、本工具 `dist/**`、`HANDOFF.md`、`TASK-ENTRY.md`、`evidence/m1/**`。
- 實作：依 [TECHNICAL](TECHNICAL.md) 建立原生 ESM skeleton；開發伺服器只綁 `127.0.0.1:4221` 且只供應 `public/`；只提供 GET/HEAD、正確 404/MIME、拒絕 path traversal/hidden/symlink。兩語 preview `noindex`，沒有遠端資產、remote font、SDK 或網路資料處理。build 只能產本工具 `dist/`，不可清理 repo root。
- 驗收：`node --version` 顯示 24+；`npm test`、`npm run check`、`npm run build`。Scaffold test 覆蓋 loopback/public-only、GET/HEAD/405/404、MIME、穿越拒絕與 build copy 隔離。長時間 Windows build/test 自動化前後按本工具 AGENTS 契約執行持久環境 guard；未知 fingerprint 漂移即停，不猜測還原。
- 完成條件：三個命令對真實邏輯成功；錯誤時停在 T00；寫 HANDOFF/TASK-ENTRY 與 `evidence/m1/**` 的精確版本、命令、exit code、產物路徑。

## T01 純檔名 planner 與不變量

- 前置：T00 PASS。
- allowed paths：`public/js/core/filename-planner.mjs`、`test/filename-planner.test.mjs`、本工具 `scripts/check.mjs`（只加真檢查）、本工具 `HANDOFF.md`、`TASK-ENTRY.md`、`evidence/m1/**`。遇到規格或契約矛盾先停下交主代理，不自行修改六份規格、`AGENTS.md` 或 `docs/**`。
- 實作：依 PRODUCT FR-05 至 FR-08 寫純函式；拒絕不成對 surrogate 後才 normalize/encode；取代為 literal non-overlapping；計算完整候選名、NFC 與全部限制；碰撞時整批 fail closed。無 DOM、File I/O、network、regex、console、storage。
- 驗收：`npm test`、`npm run check`。對 ACCEPTANCE BR10–BR28 建明確 expected literals 與每種 error；加 identity、不 mutation 測試。測例不從被測函式產生 expected。
- 完成條件：planner 案例全 PASS；錯誤 code 穩定；回寫 HANDOFF/TASK-ENTRY/evidence。

## T02 ZIP STORE writer 與獨立 CRC / zipfile 驗證

- 前置：T01 PASS。
- allowed paths：`public/js/core/zip-store.mjs`、`test/zip-store.test.mjs`、`scripts/verify-zip.mjs`、`test/verify-zip.py`、本工具 `scripts/check.mjs`（限必要模組檢查）、本工具 `HANDOFF.md`、`TASK-ENTRY.md`、`evidence/m1/**`。規格勘誤交主代理。
- 實作：只輸出 APPNOTE basic STORE records；UTF-8 names, CRC-32, 固定日期、無 extras/comment/encryption/ZIP64；逐個 uint32 bounds 預檢；以小 header/payload chunks 組 Blob，禁止全 archive 巨大 concat。跨驗證腳本只用 Node/Python built-in；產物限小型 synthetic bytes，使用可安全清理的 task-owned temp output，`finally` 清理。
- 驗收：`npm test`、`npm run check`、`node scripts/verify-zip.mjs`；verify 命令生成合成 ZIP 後呼叫 Python 標準 `zipfile` 檢查 entry name、method、CRC、payload、0-byte 檔案。不得 pip/npm 安裝依賴。Python 不可用或其檢查失敗時，T02 不 PASS。
- 完成條件：Node 固定 header tests + Python 獨立驗證全 PASS；CRC vector 是 `123456789 = CBF43926`；無大 buffer/ZIP64 fallback；回寫 HANDOFF/TASK-ENTRY/evidence。

## T03 雙語 Product App 與有界控制器

- 前置：T01、T02 PASS。
- allowed paths：`public/index.html`、`public/en/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/i18n.mjs`、必要 `public/js/core/filename-planner.mjs`、`public/js/core/zip-store.mjs`、`test/ui-contract.test.mjs`、本工具 `HANDOFF.md`、`TASK-ENTRY.md`、`evidence/m1/**`。規格勘誤交主代理。
- 實作：依 [UX-SEO](UX-SEO.md) 顯示首屏承諾、selection order、排序/移除、互斥兩模式、逐列 preview 與下載；加 generation/cancel/reader/URL 狀態機。檔名內容用 text APIs，不做 HTML/URL 解析；讀取只依使用者手動選取。No drag/drop、folder、FSAPI。
- 驗收：`npm test`、`npm run check`、`npm run build`；靜態 UI contract 確認兩語必需 controls 和 copy。只有已核准、真正焦點隔離的瀏覽器機制才可開始 B tests；否則記 `NOT_RUN_USER_FOCUS_INCIDENT`，不得用普通桌面瀏覽器操作測試。
- 完成條件：UI 提供完整可見工作流、沒有舊結果有效狀態；Node gates PASS；browser 狀態如實保留；回寫 HANDOFF。

## T04 安全邊界、資源競態與頁面狀態

- 前置：T03 可執行本機候選。
- allowed paths：本工具 `public/index.html`、`public/en/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/i18n.mjs`、`public/js/core/filename-planner.mjs`、`public/js/core/zip-store.mjs`、`test/scaffold.test.mjs`、`test/filename-planner.test.mjs`、`test/zip-store.test.mjs`、`test/ui-contract.test.mjs`、`test/boundary.test.mjs`、`test/privacy-contract.test.mjs`、`scripts/check.mjs`、本工具 `HANDOFF.md`、`TASK-ENTRY.md`、`evidence/m1/**`。遇到規格矛盾交主代理。
- 實作：覆蓋所有 bytes/name/count 上限、byte equality、error/no partial download、cancel/rules/order/selection race、late completion、pagehide、URL revoke、bfcache reset、keyboard/320 px/200% 及真 Network/Storage 記錄。只用 synthetic files；不開啟真實使用者文件。
- 驗收：`npm test`、`npm run check`、`npm run build`；按 ACCEPTANCE 逐項列 PASS/FAIL/NOT_RUN。ResourceTiming、CSP、regex scan 或 Node mock 不可單獨宣稱完整 Network/Storage PASS。瀏覽器 gate 未隔離時全部 browser 手動項維持 `NOT_RUN_USER_FOCUS_INCIDENT`。
- 完成條件：所有 CLI 必要案例 PASS；未跑 browser case 明確列出 ID、原因與不影響的證據邊界；無已知 in-scope FAIL；回寫 HANDOFF/TASK-ENTRY/evidence。

## T05 M1 本機候選與 CLI gate

- 前置：T00–T04 中所有可執行 CLI task PASS，六份規格與實作差異已記錄。
- allowed paths：本工具 `scripts/**`、`test/**`、`public/**`、`HANDOFF.md`、`TASK-ENTRY.md`、`evidence/m1/**`、本工具 `dist/**`。不改六份規格、`AGENTS.md`、`docs/**`、`project.json`、workspace root、catalog、homepage、其它工具或 GitHub/Cloudflare 設定。
- 實作：產生本機 noindex static candidate；核對精確檔案 allowlist、無 remote deps/assets、無個人檔案或測試 ZIP。完成 M1 的 Node/Python CLI checks 與候選摘要。
- 驗收：`npm test`、`npm run check`、`npm run build`、`node scripts/verify-zip.mjs`；比對 build 只含審核的 `public/`。真 browser gate 即使沒有 blocker 自動化也須明寫 `NOT_RUN_USER_FOCUS_INCIDENT`；不能把候選 build 當 deployed。
- 完成條件：CLI gate 結果逐項可重現、candidate 留在本機且 noindex；HANDOFF/TASK-ENTRY/evidence 寫明 M1，M2 未執行。M1 禁止 GitHub 公開與部署。

## T06 M2 公開 GitHub source（主代理 gate 後另行放行）

- 前置：主對話確認安全隔離的 browser execution proof、ACCEPTANCE 所有必要 browser case 及 release/privacy gates 的實際結果；不能只以「使用者稍後會驗」替代已要求的必要 gate。
- allowed paths：本工具 reviewed source copy、source evidence、`HANDOFF.md` 與主代理明確列出的 Git publication evidence；M2 開始時由主對話指定精確 paths，不可從 T05 自動繼承未列明範圍。不得修改六份規格、`AGENTS.md`、`docs/**`、workspace root、homepage、hosting config 或兄弟工具。
- 實作：只有在主代理明確放行 M2 後，依 `docs/GIT-PUBLICATION-SAFETY.md` 在 reviewed copy 公開/更新 `KYStr/glossquote-labs-batch-rename`。不得讀取或擴張憑證、改 global Git 設定、force push 或付費。M2 只做 source publication，不部署。
- 驗收：執行 Git guard 前後快照並比較；核實 remote commit、repo visibility、source hash 與允許路徑。記錄 source-only 狀態，不能稱 live site。
- 完成條件：主對話完成 browser/安全 gate 並明確放行後才可開始；結果回寫 HANDOFF。本規格本身不建立 chat、不發布、不部署。

## T07 M3 正式部署與首頁整合（主代理擁有）

- 前置：M2 source publication 已核實；正式部署與首頁整合只由主代理另行安排。
- allowed paths：無原功能實作者可用路徑；hosting/homepage/verification paths 由主代理自行指定。此節只描述依賴與驗收邊界，不授權原功能實作者部署。
- 實作：由主代理依工具家族發布契約部署靜態候選、核驗正式頁面與雙語首頁；保持 noindex/canonical/sitemap 在 gate 前不對外宣稱。
- 驗收：正式 HTTP、HTML title/description/H1/canonical/hreflang/robots/sitemap/security headers、可用內容、資產範圍、雙語首頁往返和來源 commit 對照均由主代理獨立驗證；source-only push 不替代 live checks。
- 完成條件：主代理完成 M3 並將實際結果、commit/version、NOT_RUN 項與風險回寫交接；T07 不授權原功能實作者 deploy。


