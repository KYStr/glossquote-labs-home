# 多張圖片合成 PDF — 既有規格保存

Task ID: `labs-46-images-to-pdf` · Spec ID: `spec-46-images-to-pdf`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：多張圖片合成 PDF

狀態：規格，尚未實作。使用者要把拍下來的申請文件／收據整理成可交付的 PDF；成功條件是頁數和順序可預期、方向可校正、影像完整不裁切。

## MVP 決策

- 最多 20 張 JPEG/PNG；每張 ≤8 MiB，來源總 bytes ≤64 MiB；每張 ≤16,000,000 pixels、任何邊 ≤8,192 px。先全選預檢，再開始解碼。
- 靜態 JPEG/PNG only；檔名、副檔名、`File.type` 不可信，讀 magic/header；拒 APNG/GIF/SVG/unknown/truncated/invalid EXIF。每張默認使用 EXIF visual orientation，並允許使用者額外以 90° 旋轉控制累加 0/90/180/270°。
- 紙張單一全域設定：A4 或 US Letter，直向／橫向；預設 A4 直向。固定 28.35 pt (10 mm) 四邊留白。圖片 contain-fit、居中、白底；不裁切。
- 解碼與 Canvas JPEG 編碼嚴格逐張進行，每次只有一個 ImageBitmap 和一個可重用工作 Canvas；bitmap 在取得頁面 JPEG 後一定 close。來源 `File` references 保留供重試，metadata 以小物件保存。PDF byte chunks 是累積輸出，不可同時留所有 source bitmaps。
- Canvas raster 尺寸 = orientation 後來源影像尺寸，加上使用者旋轉後交換寬高；上限仍是 16MP/8192 edge。Canvas 壓縮固定呼叫 `toBlob('image/jpeg',0.92)`；若瀏覽器不支援、回傳 null、JPEG MIME/簽章不符或無法於限制內建檔，整份失敗且清除 partial PDF。品質值屬瀏覽器建議值，輸出的實際 JPEG bytes 可能隨瀏覽器改變。
- PDF 固定版本 1.4、classic cross-reference table，不用 xref stream/object stream。每頁一個 DCTDecode JPEG image XObject 和一個 uncompressed content stream。所有 `stream /Length` 及 xref/startxref offset 都是 bytes，不是 JS string code units。PDF ≤64 MiB；超過不下載。
- 固定安全檔名 `images-document.pdf`；PDF 不寫入來源檔名、標題、作者、日期或 EXIF metadata。無加密、OCR、既有 PDF 合併、簽章或印表。
- 全部資料只留本頁記憶體；選圖變更、排序、紙張／方向或任一旋轉變更時 generation++、標 stale、清理舊 PDF／pending URLs。已開始交付給瀏覽器的下載不能撤回，UI 要如實說明。

## 功能需求

### FR-01：檔案預檢和尺寸 gate

選檔最多 20；每檔 8,388,608 bytes、總 67,108,864 bytes。先驗 signature 和 dimensions，不 decode，然後 pixel/edge bounds。JPEG 使用 bounded marker scan 至 SOF，解析 SOF dimensions 和 APP1 Exif orientation；PNG 要求 signature + IHDR，掃 chunk bounds、`eXIf` orientation 及 `acTL` animated marker。有 `acTL` 拒絕。Exif orientation 無值為 1，合法 1..8；malformed/矛盾 metadata 拒絕。所有來源都通過後才可繼續，超限／不支援列檔名和錯碼，不產半成品。

### FR-02：排序與方向調整

列表預設 input order，顯示序號、檔名文字、格式、來源 pixel size 和視覺方向；上移／下移按鈕排序。每圖 rotation 是 0°, 90°, 180°, 270° 順時針；點一次依序增加 90°，可再按到 0°。EXIF 方向先由瀏覽器 `from-image` decode，使用者旋轉再套用。任何改動立即標記 PDF stale 並禁用舊輸出。

### FR-03：紙張與 fit

紙張預設 A4 portrait，選項 A4/Letter × portrait/landscape。A4 portrait `595.28 × 841.89 pt`；Letter portrait `612 × 792 pt`；landscape 交換寬高。margin 各側 28.35pt。每 page 的 image oriented dimensions 為 `iw×ih`。`cw=pageW-2*margin`,`ch=pageH-2*margin`,`scale=min(cw/iw,ch/ih)`,`dw=iw*scale`,`dh=ih*scale`,`x=(pageW-dw)/2`,`y=(pageH-dh)/2`。PDF 座標使用左下原點；以 `q dw 0 0 dh x y cm /Im0 Do Q` 放圖，圖片不 crop。PDF 內數值以 decimal point、round to 2 fractional digits，避免浮點字串雜訊。

### FR-04：逐張產 JPEG 與 PDF

先全檔 preflight。按序只解一張 `ImageBitmap`; 驗 bitmap dimensions 和預期 EXIF orientation；將所需方向＋使用者 rotation 畫入 reusable Canvas，透明區先填白。`toBlob('image/jpeg',0.92)` 取得 JPEG bytes；檢查 MIME、`FF D8`/`FF D9` signatures 和 bytes limit；記住尺寸及 bytes 進 PDF builder，close bitmap 並把 canvas size 設回 0 再處理下一張。不可 `Promise.all`、不可把解碼圖像留在列表中。任一步取消／錯誤都清空所有已完成 JPEG page bytes 及 partial PDF。

### FR-05：PDF 1.4 結構與輸出

固定 object layout：1 Catalog、2 Pages；每頁連續三個 objects（Page、Image XObject、Contents），Page tree kids 順序等於使用者清單。Image XObject 的 `/Width`,`/Height` 取 JPEG pixel dimensions、`/ColorSpace /DeviceRGB`,`/BitsPerComponent 8`,`/Filter /DCTDecode`,`/Length n`；stream bytes 是 Canvas JPEG byte array。Contents 為 ASCII graphics operations，`/Length` 為其 ASCII bytes 長度。Writer 先記錄每個 object header 第一個 byte offset，輸出 classic `xref` free entry + 每物件固定 10 位 byte offset，`trailer /Size /Root`，`startxref` 指向 `xref` keyword 第一 byte，最後 `%%EOF`。總 PDF bytes ≤67,108,864。

成功後使用者下載唯一 PDF；UI 預覽每頁縮圖／rotation 和頁數，但不把 PDF 引擎加入本機。若瀏覽器沒有原生 PDF preview，提供 page summary，不假裝已驗讀。

### FR-06：狀態、取消、stale 和 cleanup

`idle → preflighting(i/n) → ready → decoding(i/n) → encoding(i/n) → writing-pdf → result`；錯誤 `blocked`/`failed`，變更 `stale`，取消 `cancelling → cancelled`。`createImageBitmap` 和 Canvas `toBlob` 無通用 signal；取消停止排隊並等待目前 operation 回來，close/discard 後不再處理下一張。每個 await/callback 後檢查 generation。source/settings 改變立即清 result/Blob/textures；pending image preview或下載 URL 全部撤銷。`finally` close bitmaps、canvas width/height=0、drop temp JPEG/PDF refs、revoke URLs；pagehide 和 reset 冪等。已開始的下載不能攔回，畫面不得宣稱取消既有下載。

## 錯誤碼與非目標

`TOO_MANY_FILES`、`FILE_TOO_LARGE`、`TOTAL_TOO_LARGE`、`UNSUPPORTED_FORMAT`、`ANIMATED_PNG`、`IMAGE_HEADER_INVALID`、`EXIF_INVALID`、`PIXEL_LIMIT`、`EDGE_LIMIT`、`DECODE_FAILED`、`ORIENTATION_MISMATCH`、`CANVAS_UNAVAILABLE`、`JPEG_ENCODE_FAILED`、`PDF_STRUCTURE_ERROR`、`OUTPUT_TOO_LARGE`、`CANCELLED`。非目標：PDF imports, OCR/text layer, encryption, password, signature, PDF/A, batch archives, printing, automatic email/submit, server-side conversion, quality judgement.


---

## 原文件 TECHNICAL.md

# 技術契約：多張圖片合成 PDF

狀態：規格，尚未實作。本產品的風險核心是瀏覽器 decode/Canvas JPEG 與自行建 PDF bytes，須將 pure binary checks 和真瀏覽器能力 gates 分開。使用原生 HTML/CSS/ESM、Node.js 24+ built-ins、node:test；runtime 零套件，禁止 PDF/image libraries、CDN、API、上傳和 server processing。

## 建議檔案樹

```text
package.json
public/index.html
public/styles/app.css
public/js/app.js
public/js/core/image-preflight.mjs
public/js/core/page-layout.mjs
public/js/core/pdf-writer.mjs
public/js/core/create-pdf.mjs
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
test/image-preflight.test.mjs
test/page-layout.test.mjs
test/pdf-writer.test.mjs
test/fixtures/ (由 Node 程式合成的 bounded headers/payloads)
```

## API / 演算法介面

```js
inspectImageHeader(bytes)
// -> { format, rawWidth, rawHeight, orientation:1..8, visualWidth, visualHeight }

validateFiles(files, metadata, { maxCount:20, maxFileBytes:8_388_608,
  maxTotalBytes:67_108_864, maxPixels:16_000_000, maxEdge:8192 })
// -> { items:[{file, metadata, rotationQuarterTurns:0}], totalBytes }

computePageLayout(imageWidth, imageHeight, { paper:'A4'|'Letter', orientation:'portrait'|'landscape', marginPt:28.35 })
// -> { pageWidthPt, pageHeightPt, xPt, yPt, widthPt, heightPt }

writePdf(pages, { maxBytes:67_108_864 })
// pages: [{ jpegBytes:Uint8Array, widthPx, heightPx, layout }]
// -> Uint8Array PDF 1.4 | PdfBuildError

async encodeImagePages(items, paperSettings, { signal, generation, isCurrent, onProgress })
// -> { bytes:Uint8Array, pageCount:number } | ImagePdfError
```

### Header preflight

Never trust filename, extension or `File.type`; bytes determine acceptance. Use bounded slices, one file at a time. Enforce selection/file/total byte caps before reading metadata. JPEG scanner starts SOI, parses marker bytes and 16-bit big-endian segment lengths until first SOS; reject malformed marker/length, no SOF, zero dimensions or unsupported/truncated EXIF. Extract width/height from SOF markers with bounds checks; APP1 `Exif\0\0` TIFF IFD0 reads orientation tag `0x0112` only. PNG scanner validates signature, first IHDR and bounded chunks; read width/height, look for `eXIf` and `acTL`; any `acTL` rejects APNG. Validate TIFF endian/magic/offsets/count; orientation absent=1, present must be SHORT 1..8. Do not parse/persist GPS, timestamps, camera, thumbnail or comments. Unknown files never reach decoder.

Check `rawWidth*rawHeight ≤16_000_000` and `max(width,height) ≤8192` using safe integer arithmetic before decode. For EXIF orientation 5–8 swap `visualWidth/visualHeight`. After `createImageBitmap(file)` (default from-image orientation), check decoded dimensions exactly equal expected visual dims. Decoder failures are `DECODE_FAILED`; mismatch is `ORIENTATION_MISMATCH`. Browser fixtures with asymmetric marks verify mirrors/rotation because dimensions alone do not distinguish mirror cases.

### One-at-a-time raster pipeline

Preflight all files before decoding any. Then for each item, in sequence:

1. `bitmap = await createImageBitmap(file)`; test abort/generation and decoded dims before allocation.
2. Set one reusable Canvas to oriented dimensions after user rotation (swap width/height for odd quarter turns; pixel count stays bounded). Fill entire Canvas white, apply 0/90/180/270 clockwise transform, draw bitmap. PNG transparency is flattened to white.
3. Await `canvas.toBlob(callback,'image/jpeg',0.92)`. The quality is a browser hint; bytes may vary. Verify non-null blob, reported MIME exactly `image/jpeg`, and resulting bytes begin `FF D8` and end `FF D9`; record actual width/height and `byteLength`.
4. Append just this JPEG byte array and its numeric page layout to the PDF assembly list. In `finally`, always `bitmap.close()`, set canvas width/height to 0, and drop the per-page Blob/ref before moving on. `maxConcurrentBitmaps` invariant = 1.

There is no AbortSignal support promised for native decode/toBlob; cancellation marks a fence. Stop scheduling additional source files, wait for the one in-flight promise/callback, then close/discard it. Check generation after each await and before final PDF Blob/URL creation. If stale, clear all accumulated page JPEG arrays and produce no PDF. `Promise.all` is forbidden. Browser memory/canvas limits remain runtime conditions: catch allocation/encode failures, clear all temporary bytes, report recoverable failure and preserve source File refs.

### Page layout and PDF byte writer

All calculations use full-precision Numbers from exact paper constants; emitted PDF numbers are rounded to 2 decimal places, decimal point only, no locale format. A4 portrait = 595.28×841.89 pt; Letter portrait = 612×792 pt; landscape swaps. Margin 28.35 pt, so A4 portrait content=538.58×785.19. For 1000×500 image: `scale=min(538.58/1000,785.19/500)=0.53858`; `width=538.58`, `height=269.29`, `x=28.35`, `y=286.30`.

`writePdf` uses byte chunks, not giant JS strings. Header is `%PDF-1.4\n` plus a fixed binary comment. Object allocation is deterministic: `1 Catalog`, `2 Pages`, then each page `Page`, `Image`, `Contents` at object IDs `3+3*i`, `4+3*i`, `5+3*i`. Encode all syntax with ASCII `TextEncoder`; user strings and file names never enter PDF bytes.

Each Image XObject dictionary includes `/Type /XObject /Subtype /Image /Width W /Height H /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length N`; write `stream\n`, the exact N JPEG bytes, then `\nendstream`. Content stream is ASCII `q\nW 0 0 H X Y cm\n/Im0 Do\nQ\n`; `/Length` equals the exact ASCII content bytes only. Page resources map `/Im0` to its image object; Pages `/Kids` preserves order and `/Count` equals selection length. No metadata/catalog strings that derive from input.

Before writing each `${id} 0 obj`, record current byte count as object offset. At file end, record the byte index of the `xref` keyword; write classic xref table entry 0 and fixed 10-digit offsets for all objects, then `trailer` with `/Size` and `/Root 1 0 R`, `startxref` equal to that `xref` byte offset and `%%EOF`. All offsets and stream lengths are byte counts over `Uint8Array` pieces, including binary bytes; never use JS string `.length` for binary streams. Check maximum PDF 67,108,864 bytes before final Blob. Output MIME `application/pdf`, fixed name `images-document.pdf`.

## 狀態與輸出清理

States: `idle`, `preflighting`, `ready`, `decoding`, `encoding`, `writing-pdf`, `result`, `stale`, `cancelling`, `cancelled`, `blocked`, `failed`. Change files/order/paper/orientation/rotation synchronously increments generation, disables downloads, revokes old pending URLs and releases current PDF/JPEG bytes. `finally` closes bitmap, zeros Canvas, and drops byte references. Reset/pagehide same, idempotent. A download already dispatched cannot be withdrawn; any active object URL is revoked after 60 seconds at latest/pagehide, and stale outputs are never reusable.

Package: ESM/private, Node 24+, no dependencies. `npm test` runs `node --test`; `npm run check` runs `node scripts/check.mjs`; `npm run build` copies reviewed `public/` to `dist/`; future local preview is `127.0.0.1:4226`. This spec task does not install packages or launch server/browser.

## 離線與真瀏覽器檢查界線

Node can test page math, fake JPEG byte handling, PDF object numbering, xref byte offsets, stream `/Length`, page count and output caps. For these binary-writer tests, fake payload bytes are opaque stand-ins; they do **not** prove Canvas produced a valid JPEG or that a PDF viewer can decode it. A real browser gate must generate tiny synthetic PNG/JPEGs via Canvas, verify the browser-created JPEG is `image/jpeg` and decodes with expected pixels, then inspect/open the emitted PDF through an approved isolated browser surface. It must not trigger OS print/save dialogs. Because of the focus incident, browser gate is **NOT_RUN_USER_FOCUS_INCIDENT** until primary confirms isolation.

## 官方參考

- [Adobe PDF Reference 1.4](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.4.pdf): PDF 1.4 classic file structure, cross-reference tables/trailers, stream objects and direct `/Length`.
- [HTML Standard — Canvas](https://html.spec.whatwg.org/multipage/canvas.html): `toBlob()` behavior and Canvas origin cleanliness; browser output must be verified directly.
- [HTML Standard — ImageBitmap](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html): `createImageBitmap(Blob)`, orientation metadata default, `close()` and decode rejection.
- [W3C PNG Specification, Third Edition](https://www.w3.org/TR/png/): PNG signature/chunk framing, `eXIf`, alpha and animation markers.
- [CIPA Exif DC-008 standards page](https://www.cipa.jp/e/std/std-sec.html): TIFF/Exif structure and orientation metadata reference.
- [ITU-T T.81](https://www.itu.int/ITU-T/recommendations/rec.aspx?lang=en&rec=2633): JPEG-1 structure reference. The file generator does not implement JPEG coding; browser Canvas does.


---

## 原文件 UX-SEO.md

# 介面與搜尋資料：多張圖片合成 PDF

狀態：規格，尚未實作。Surface mode：Product App。M1 `noindex,nofollow`，不輸出 production canonical/sitemap；`image-pdf.glossquote.com` 是候選 URL，未發布前不得顯示為 live。

## 搜尋文案

**繁中 title：** 多張圖片合成 PDF｜排序、轉向、不裁切  
**繁中 description：** 在本機將 JPEG/PNG 照片依序放入 A4 或 Letter PDF，每張一頁，可旋轉並保留完整圖片，不需上傳。  
**繁中 H1：** 把照片整理成一份順序正確的 PDF

**English title:** Images to PDF | Order, Rotate, and Fit Photos to Pages  
**English description:** Turn local JPEG or PNG images into one ordered A4 or Letter PDF, one uncropped image per page, processed in your browser.  
**English H1:** Put your images into one ordered PDF

## 桌面工作區

```text
┌──────────── 多張圖片合成 PDF ─── zh-TW ── 尚未開始 ───────────┐
│ 頁面順序 / 來源 │                  頁面畫布                  │文件設定│
│ 1 receipt.jpg ↑↓│ ┌────────────────────────────────────────┐ │A4     │
│     3024×4032   │ │                                        │ │直向   │
│   [旋轉 90°]   │ │             第 1 頁預覽                │ │margin │
│ 2 page-2.png ↑↓ │ │         白邊；完整圖片不裁切           │ │28.35pt│
│     2000×1400   │ └────────────────────────────────────────┘ │        │
│   [旋轉 90°]   │ [加入 JPEG/PNG]  共2頁                     │        │
├─────────────────┴───────────────────────────────────────────┴────────┤
│ [產生 2 頁 PDF] → 狀態/進度             [下載 images-document.pdf]   │
└───────────────────────────────────────────────────────────────────────┘
```

## 手機工作區

```text
┌ 圖片合成 PDF ─ 狀態 ┐
│ [加入 JPEG/PNG]     │
│ A4 [直向] [橫向]    │
│ 1 receipt.jpg       │
│ [↑ 上移] [↓ 下移]   │
│ [旋轉 90°]          │
│ 2 page-2.png        │
│ [↑ 上移] [↓ 下移]   │
│ [旋轉 90°]          │
│ [產生 2 頁 PDF]     │
├─────────────────────┤
│ 頁面預覽／方向摘要  │
│ [下載 PDF]          │
└─────────────────────┘
```

排序和轉向按鈕與來源同列；畫布／頁面預覽是工作畫布。Advanced details 折疊顯示每檔 8 MiB、16 MP、20 張的界線；不能隱藏拒絕原因。下載按鈕需綁定目前 generation 的 PDF，stale 時移除。

## 狀態文案

Idle：「加入要合併的 JPEG 或 PNG；順序可在下一步調整。」；preflight：「先檢查 2 / 12 張的格式與尺寸，尚未解碼。」；ready：「12 張通過檢查，預計建立 12 頁 A4 PDF。」；decode：「正在處理第 2 / 12 張；每次只解碼一張。」；cancelling：「正在停止目前頁面，完成清理後不會提供 PDF。」；success：「PDF 已建立，共 12 頁。來源檔名與照片 metadata 未寫入 PDF。」；empty：「加入圖片後再建立 PDF。」；error：「第 4 張無法解碼；未建立部分 PDF。請移除該張或改用標準 JPEG/PNG。」；stale：「順序、方向或頁面設定已變；舊 PDF 已作廢。」；output cap：「產物超過 64 MiB，未提供下載。請減少頁數或先縮小來源圖片。」

## 無障礙

拖放可作便利但不作唯一排序方式；每張有上移、下移和旋轉按鈕，操作後 `aria-live` 只宣告新頁序。紙張選項使用有標籤的 radio/segmented controls；每頁旋轉按鈕文字含目前角度。保持明確鍵盤順序，44px touch controls、焦點可見、錯誤文字、對比≥4.5:1、reduced-motion。整頁在 320 CSS px 和 200% zoom reflow；預覽容器可局部縮放／捲動，主要操作不被遮擋。

## FAQ

### 繁體中文

**圖片會被裁切或放大嗎？** 不會裁切；會縮小到頁面可列印範圍並置中，剩餘位置留白。  
**照片方向會照相機方向嗎？** 工具先讀支援的 EXIF 方向，再套用你選的旋轉；瀏覽器解碼方向不符時會停止，不輸出錯向文件。  
**PDF 會留下檔名或 GPS 資料嗎？** 不會；檔名只在目前頁面顯示，PDF 只含重新編碼的頁面影像。

### English

**Will images be cropped or enlarged?** Images are fitted and centered without cropping; unused page area remains white.  
**Does it use the camera’s orientation?** It applies supported EXIF orientation first, then your rotation. A decoder mismatch stops the export.  
**Will the PDF contain filenames or GPS data?** No. Filenames stay in the page UI; the PDF contains re-encoded page images only.

## Browser gate

Node can validate layout math, fake JPEG payload length, object offsets and xref. It cannot prove Canvas creates a real decodable JPEG, that EXIF orientation is visually correct, or that an actual browser PDF viewer accepts the document. Those gates are **NOT_RUN_USER_FOCUS_INCIDENT** pending the primary’s isolated-browser decision. Do not open OS print/save dialogs.


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：多張圖片合成 PDF

狀態：規格，尚未實作。離線 writer tests 使用程式合成的 header 和 opaque fake image payload，真實 Canvas/decoder/PDF-viewer 效果另列 browser gate，不能混為一談。

## Node 可自動驗證的 oracle

1. **A01 FR-01 count boundary** — 20 合成檔通過數量 gate；21 檔 `TOO_MANY_FILES` 且解碼呼叫數為0。
2. **A02 FR-01 per-file size** — 8,388,608 bytes 接受 metadata preflight；8,388,609 `FILE_TOO_LARGE`，未 decode。
3. **A03 FR-01 total size** — 20 個合計 67,108,864 bytes 通過大小門；多1 byte `TOTAL_TOO_LARGE`。
4. **A04 FR-01 signature** — 合法 PNG signature+IHDR 與 JPEG SOI+bounded SOF 可讀 dimensions；`<svg>` 假裝 `.jpg` / `image/jpeg` 仍 `UNSUPPORTED_FORMAT`。
5. **A05 FR-01 APNG** — PNG chunks 有 `acTL`；`ANIMATED_PNG`，Canvas decode 呼叫數0。
6. **A06 FR-01 pixels** — 4000×4000 exactly 16,000,000 pixels passes; 4001×4000 rejects `PIXEL_LIMIT`; 8193×1 rejects `EDGE_LIMIT`。
7. **A07 FR-01 EXIF** — raw 4000×3000 orientation6 => visual 3000×4000；0、9、out-of-bounds IFD、bad endian reject `EXIF_INVALID`。
8. **A08 FR-02 ordering/rotation** — 3 source IDs `[A,B,C]` after move C up become `[A,C,B]`; C rotation 90→180; serialized page specs retain that exact order/turn count。
9. **A09 FR-03 A4 exact fit** — page 595.28×841.89pt, margin28.35; image1000×500 -> content538.58×785.19; scale0.53858; drawn538.58×269.29 at x28.35,y286.30 after 2-decimal emission.
10. **A10 FR-03 Letter landscape** — Letter portrait612×792 swapped => page792×612; 100×200 image fits in 735.30×555.30 content with computed contain scale and centered x/y; no negative coordinates.
11. **A11 FR-05 pages** — two fake page payloads -> Pages `/Count 2`, Kids `[3 0 R 6 0 R]`, two Page objects; order matches caller sequence.
12. **A12 FR-05 JPEG stream length** — fake binary payload `[FF,D8,00,0A,FF,D9]` embedded byte-for-byte; `/Length 6`; newline/zero bytes do not change object boundary. This verifies writer framing only, not a decodable JPEG.
13. **A13 FR-05 content length** — one page's ASCII stream `q\n538.58 0 0 269.29 28.35 286.30 cm\n/Im0 Do\nQ\n`; `/Length` equals exact ASCII encoded byte count.
14. **A14 FR-05 xref byte offsets** — insert fake JPEG containing non-ASCII bytes `FF D8 80 00 FF D9`; parse each xref offset and assert the referenced exact bytes are `${id} 0 obj`; offsets must not equal JS UTF-16 character counts.
15. **A15 FR-05 startxref** — decimal after `startxref` points to first byte of `xref`; trailer `/Size` is object count+1, `/Root 1 0 R`, last marker `%%EOF`.
16. **A16 FR-05 no source strings** — filename `secret-gps-name.jpg` and fake EXIF GPS payload never appear in PDF bytes; PDF only contains fixed names/numeric content and JPEG bytes.
17. **A17 FR-05 output cap** — final PDF exactly 67,108,864 bytes accepted; one more byte `OUTPUT_TOO_LARGE`, no download Blob.
18. **A18 FR-06 sequential bitmap lifetime** — three fake decode operations show max active=1; each bitmap `close()` and canvas reset happen before next decode starts.
19. **A19 FR-06 pending cancellation** — cancel during decode/toBlob; one in-flight operation settles, bitmap closes, no next file starts, partial jpeg pages are dropped and no PDF returns.
20. **A20 FR-06 stale generation** — change page orientation while old toBlob callback pending; late callback cannot overwrite current state or create a downloadable Blob URL.

## 必須真瀏覽器 gates：目前 NOT_RUN

產生小型 synthetic PNG/JPEG with Canvas，確認 `toBlob('image/jpeg',0.92)` 回 Blob MIME 和 JPEG signature、再用 `createImageBitmap` 驗其可解碼與尺寸。加入 orientation 1–8 asymmetric fixtures、旋轉、透明 PNG 白底、A4/Letter page order，確認實際 PDF 可由 browser viewer 開啟且所有頁面清晰完整。另驗取消/切設定競態、input ordering keyboard、320px/200% zoom、download、no outbound request。這組 **NOT_RUN_USER_FOCUS_INCIDENT**：不得用 fake JPEG Node writer tests 說明 Canvas/PDF browser PASS；不觸發 OS print/save dialog。


---

## 原文件 TASKS.md

# 實作任務：多張圖片合成 PDF

狀態：規格，尚未實作。Node 24+ ESM、無 runtime dependency。規格撰寫工作不執行 server/browser/npm install。Browser gate 受到 user-focus incident，必須保持 `NOT_RUN_USER_FOCUS_INCIDENT`，直到 primary 確認隔離執行方法。

1. **T00 — Scaffold / PDF research gate。** 前置：規格與 root common docs。Allowed paths：本產品 `package.json`, `.gitignore`, `scripts/**`, `public/**`, `test/**`, `dist/**`, `HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。建立 ESM private package、Node24 guard/test/check/build/dev loopback `127.0.0.1:4226`；核對 Adobe PDF 1.4 的 classic xref/direct stream length 章節，寫結構決定在 task entry。驗收 `node scripts/check.mjs`；不啟 server。完成：零依賴、scope gate 明確；回寫 HANDOFF。
2. **T10 — Image preflight and paper math.** 前置 T00 PASS。新增 `image-preflight.mjs`、`page-layout.mjs` 和 generated byte fixtures/tests；解析 bounded JPEG SOF/Exif 與 PNG IHDR/eXIf/acTL，validate size/pixel/edge caps；計算紙張、方向、contain fit。驗收 `node --test test/image-preflight.test.mjs test/page-layout.test.mjs`，核對 A01–A10。完成：任何一個來源失敗都不 decode；寫 HANDOFF。
3. **T20 — Pure PDF writer.** 前置 T10 PASS。新增 `pdf-writer.mjs`，接受已編碼 JPEG `Uint8Array` 和 layout descriptors，建立 object graph/classic xref、length、offset、size cap。測試只能用 fake opaque payload 並明列 limitation。驗收 `node --test test/pdf-writer.test.mjs`，核對 A11–A17。完成：所有 byte offsets/lengths精確；回寫 HANDOFF。
4. **T30 — Serial Canvas pipeline。** 前置 T20 PASS。新增 `create-pdf.mjs` browser adapter；單一 reusable canvas，逐圖 createImageBitmap→draw/rotate/white flatten→toBlob JPEG→close/reset；generation+cancel fencing；沒有 parallel decode。驗收 `npm test` + fake lifecycle cases A18–A20；真 Canvas encode仍留 browser gate。完成：任何 stale/error/cancel清除 partial pages；回寫 HANDOFF。
5. **T40 — Bilingual Product App。** 前置 T30 PASS。新增選檔、順序/rotation、paper controls、頁面摘要、progress/cancel、PDF download、M1 noindex。驗收 `npm run check` / `npm run build`；若 browser隔離未確認不要啟動 UI gate。完成：主結果清楚且下載僅屬當前 generation；回寫 HANDOFF。
6. **T50 — Final M1 verification.** 前置 T40 PASS。跑 final `npm test`, `npm run check`, `npm run build`；只記已執行結果。若後續有 approved isolated browser，生成 synthetic inputs 做 Canvas JPEG + actual PDF viewer checks；否則 browser維持 NOT_RUN_USER_FOCUS_INCIDENT。Allowed paths 同 T00。完成：只發 candidate，無公開 canonical/source/deploy；HANDOFF 記明 fake-byte vs real browser evidence差異。

不得使用網路 PDF/API 或第三方套件補足 Canvas 能力。解碼器不支援或 memory allocation 失敗時要安全退出。每項失敗修復後只重跑受影響檢查，不勾後續任務。M2 需主驗後另指令。

