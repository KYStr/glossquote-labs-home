# JPEG 照片拍攝時間盤點 / JPEG Capture Time Audit

研究 brief，2026-11-11。建議 slug `jpeg-capture-time-audit`。

## 目標與使用情境

活動攝影志工收到兩台相機交回的 JPEG。同一場合的兩台相機可能使用不同時差設定，通訊軟體轉出的照片又可能只剩檔名。志工要在桌面匯整可比較的拍攝順序、知道哪些照片必須向原攝影者確認，並把時間表交給剪輯或相簿負責人。手機可檢查少數照片或檢視結果。

一次生成拍攝時間清單和例外清單，依已寫入照片的時差換算 UTC，另外展示缺時差的相機鐘面值。檔案只有掃描拍攝時間所需的標籤。輸出把相機所記錄的時間當證據，實際相機時鐘偏差仍須人工對照。

## 替代方案與差異

- Windows 有「拍攝日期」屬性，也能在檔案總管逐欄查看。它會調和多種 metadata 來源，包含部分 EXIF、IPTC、XMP。此次工作需要知道原始 EXIF 拍攝時間是否存在及能否按明示時差換算，並能交付逐檔報告。 [Windows DateTaken](https://learn.microsoft.com/en-us/windows/desktop/properties/props-system-photo-datetaken) · [Windows DateTaken metadata policy](https://learn.microsoft.com/en-us/windows/win32/wic/-wic-photoprop-system-photo-datetaken)
- digiKam 的 Dates View 依 Exif 日期整理，缺少時可採用檔案修改時間；Time Adjust 支援校正。已有本機相簿管理軟體的人可使用完整編輯流程。本案適用臨時收到一批 JPEG 只要盤點的情境，缺值保留理由。 [digiKam Dates View](https://docs.digikam.org/es/left_sidebar/dates_view.html) · [digiKam Time Adjust](https://docs.digikam.org/en/post_processing/time_adjust.html)
- Labs 照片聯絡表讀 JPEG EXIF 的方向與尺寸，合成不裁切的縮圖，下載圖片和對應的檔名索引。它明列只用 orientation，其他 EXIF 日期不進結果。本案不解碼照片，結果是逐張拍攝時間和偏移狀態。 [image-contact-sheet 固定 SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/45-image-contact-sheet/SPEC.md)
- Labs 批次檔名整理以輸入順序與字面規則生成改名 ZIP，原內容與 metadata 依樣保留。本案以原始 metadata 時間排序及標記缺失，交付可回查原名的報告。 [batch-rename 固定 SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/41-batch-rename/SPEC.md)

## 範圍與流程

1. 多選照片，畫面列出選取順序及個數，可移除項目。提供含不同偏移及缺資料的合成 JPEG 範例。主按鈕「掃描拍攝時間」。
2. 逐檔掃描有限長度的 JPEG metadata，顯示實際完成數。結果表以「有時差」「時差待查」「拍攝時間待查」分段並附每檔原名與來源序號。桌面讓時序表佔最大空間，手機以具名區域水平捲動資料欄，保留分段切換。
3. 核對後下載一份 `photo-capture-timestamps.json`，包含原名、拍攝鐘面、明示時差、UTC 或具體缺失原因。必要時請來源方補原圖或時差資訊，再重新掃描。
4. 首版範圍之外含 HEIC、PNG、RAW、多圖容器、解碼縮圖、改相機時鐘、讀 XMP/GPS/縮圖/裝置序號、讀子秒、以檔案修改時間代填、改原圖、重新命名或按時間移檔。

## 輸入、輸出與字面案例

- 1–200 個明確選取檔案。格式依 bytes 判定，接受 JPEG metadata 前綴。每檔最多讀前 512 KiB，依序處理，最多 1,024 個 metadata 段。超出掃描界線列為 `scan_limit`。截斷的已知檔案或失敗讀取各報原因。檔名依選擇順序與序號區別，作惰性文字；名稱上限 1,024 UTF-8 bytes，整批輸出 ≤2 MiB。
- 只讀第一個 JPEG scan 之前的 `APP1 Exif\0\0`。TIFF 允許 `II` 或 `MM`、magic 42，沿 IFD0 中 `ExifIFDPointer 0x8769` 到 Exif IFD。只認 `DateTimeOriginal 0x9003`（ASCII，20 bytes 含 NUL）和 `OffsetTimeOriginal 0x9011`（ASCII，7 bytes 含 NUL）。同一來源多個 Exif APP1、目標 pointer 或目標 tag 重複，列 `exif_error`。無 APP1 或缺 DateTimeOriginal 列 `capture_time_missing`。 [CIPA／JEITA Exif 與 XMP 對照表](https://www.cipa.jp/std/documents/e/DC-X010-2017.pdf) · [CIPA Exif 版本目錄](https://www.cipa.jp/e/std/std-sec.html)
- 拍攝鐘面值須為 `YYYY:MM:DD HH:mm:ss`，1900–2099，有效 Gregorian 日期、00–23 時、00–59 分秒。無效值為 `capture_time_invalid`。偏移須 `±HH:mm` 且落在 ±14:00 內；`-00:00` 視為時差不確定，列 `offset_invalid`。有有效鐘面但偏移欄缺失為 `offset_missing`。兩者都有效列 `offset_present`。其餘固定檔案狀態為 `unsupported_file,jpeg_header_error,exif_error,scan_limit,read_error`。
- JSON 以 UTF-8 無 BOM、compact、末尾一個 LF。鍵為 `schemaVersion`、`rows`；每列有 `sourceIndex,name,status,local,offset,utc`。有效 `local` 使用 `YYYY-MM-DDTHH:mm:ss`。可換算才有 `offset` 與帶 Z 的 `utc`，其餘值 null。按 UTC 升序列出 `offset_present`，其次按 local 升序列出有鐘面而偏移缺失或無效者，最後按選取順序列其他檔案。每段同時刻保留來源順序。

依序選四張 JPEG。下表記載測例對應的 EXIF 欄值，`—` 代表該標籤未寫入。

| 來源序 | 檔名 | DateTimeOriginal | OffsetTimeOriginal |
| --- | --- | --- | --- |
| 1 | ceremony.jpg | `2026:11:11 09:02:00` | `+08:00` |
| 2 | hall.jpg | `2026:11:11 10:00:00` | `+09:00` |
| 3 | lunch.jpg | `2026:11:11 12:05:00` | — |
| 4 | scan.jpg | — | — |

預期報告語義如下。

```json
{
  "schemaVersion": 1,
  "rows": [
    {"sourceIndex":2,"name":"hall.jpg","status":"offset_present","local":"2026-11-11T10:00:00","offset":"+09:00","utc":"2026-11-11T01:00:00Z"},
    {"sourceIndex":1,"name":"ceremony.jpg","status":"offset_present","local":"2026-11-11T09:02:00","offset":"+08:00","utc":"2026-11-11T01:02:00Z"},
    {"sourceIndex":3,"name":"lunch.jpg","status":"offset_missing","local":"2026-11-11T12:05:00","offset":null,"utc":null},
    {"sourceIndex":4,"name":"scan.jpg","status":"capture_time_missing","local":null,"offset":null,"utc":null}
  ]
}
```

## 演算法、狀態、資料生命週期及依賴

逐檔讀有上限的 `File.slice()`。核對 SOI，從 JPEG segment 長度走到第一個完整 SOS header，依實際檔案大小辨識截斷或超過前綴。標記、長度和 offset 都先查邊界；TIFF offset 必須落在同一 APP1 segment，各表格項數最多 512，禁止追隨縮圖 IFD、MakerNote 和 GPS。格式未確認時報對應狀態。只做 metadata 前綴檢查，影像資料本身留待其他工具解碼。

日曆驗證使用民用欄位回讀，再以 UTC 基準扣去已驗證的整數時差分鐘。時間數值以整數秒排序，機器輸出依原標籤秒精度。有效時間、未定時差的鐘面、無資料／讀取錯誤保持分段。使用者可看完成摘要與例外的來源位置。輸出只帶兩種日期資訊和檔案識別。

Worker 內一次只保有一個 JPEG 前綴，使用瀏覽器 File、DataView、Worker、Blob 與原生日期運算，無額外編解碼器。取消終止 Worker，保留目前清單，晚到結果無法復活。更換檔案、重設、pagehide、語言切換或 BFCache 返回按各自範圍釋放檔案引用和 Blob URL；重設／離頁會清空工作區。輸入只在記憶體，下載由使用者點選。離線運算於初始靜態載入後可用，時間與名稱不進 Network、storage 或 log。

## 語言、SEO 與驗證

繁中標題「JPEG 照片拍攝時間盤點」，英文「JPEG Capture Time Audit」。摘要「批次檢查 JPEG EXIF 拍攝時間與時差，下載排序清單」，英文對應「Audit JPEG EXIF capture times and offsets, then download the sorted inventory」。兩語靜態頁、lang/canonical/hreflang、同語首頁、預覽 noindex。資料欄語義兩語一致。

| 案例 | 獨立預期 |
| --- | --- |
| 上述四個檔案 | 排序 2、1、3、4，前三列為 01:00Z、01:02Z、只有鐘面。 |
| `2026:11:11 23:45:00`、`-05:30` | `2026-11-12T05:15:00Z`。 |
| `2026:11:11 09:00:00`、`+08:60` | `offset_invalid`，保留鐘面，UTC null。 |
| `1900:02:29 12:00:00` | `capture_time_invalid`；改為 2000 則日期有效。 |
| 有效的 JPEG APP1 EXIF 指標指到 segment 外 | `exif_error`，後面的好檔仍列出。 |
| XMP-only APP1，無 EXIF，且可讀到第一個 SOS | `capture_time_missing`，未使用 XMP 內日期。 |
| SOS 完整 header 需越過 512 KiB，但檔案 bytes 夠 | `scan_limit`；檔案實際比該宣告更短則 `jpeg_header_error`。 |
| 移除檔案後收到舊掃描成功 | 結果與下載保持失效，只留目前清單。 |

正式 fixtures 使用合成小 JPEG 的合法 APP1 segment，分別獨立核對兩種 endian、日期及偏移、缺標籤、重複與越界。九面向預計採樣 functionality（排序及出檔）、boundaries（segment/table/偏移/取消）、privacy（只讀允許欄、Network/Storage）、security（有界讀取、無執行資料、固定下載名、CSP）、usability（掃描及例外可追查）、accessibility（鍵盤、焦點、320 CSS px、200% zoom）、localization-seo（兩語及同語首頁）、toolchain-provenance（固定來源、離線重建及同 head）、compatibility（隔離瀏覽器的 File.slice、Worker 和真實下載）。產品檢查皆待執行。

## 接續

主對話再比對遠端登記與 PR，確認可發布固定 brief 至 `docs/specs/jpeg-capture-time-audit/BRIEF.md`。正式規格先凍結 JPEG/TIFF 受支援子集及合成二進位測例，再交非作者文件審查。產品預定 `tools/jpeg-capture-time-audit/`。
