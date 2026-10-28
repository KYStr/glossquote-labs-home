# 照片聯絡表 — 既有規格保存

Task ID: `labs-45-image-contact-sheet` · Spec ID: `spec-45-image-contact-sheet`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：照片聯絡表

狀態：規格，尚未實作。使用者是要把一批照片整理給別人挑選的設計師、賣家或活動主辦。成功成果是一張全圖縮圖、不裁切且能依編號回查原檔名的 PNG，以及同序號文字索引。

## MVP 決策

- 最多 30 張 JPEG/PNG；每檔 ≤8 MiB，所選檔案總大小 ≤64 MiB。
- 先以 file bytes 的 JPEG/PNG 結構檢查格式、維度、方向和 APNG 標記，再允許解碼。每張原圖 `width × height ≤16,000,000` pixels 且任一邊 ≤8,192 px。單張解析 metadata 時最多讀取該檔一次、完成立即丟棄 bytes；預檢全部通過前不得 decode。
- 只接受靜態 JPEG 和 PNG。檔名、副檔名、`File.type` 都不是格式證明；只看簽章及結構。拒絕 APNG、GIF、SVG、不明／截斷／metadata 不合法檔案。若瀏覽器無法解碼已通過 preflight 的圖片，整次輸出失敗且無部分結果。
- 使用預設檔案選取順序編號；排序按鈕上移／下移，不能只靠拖曳。欄數可選 1–6，預設 `min(4, 圖片數)`。選配「在 PNG 顯示檔名」，預設關閉；PNG 標籤最多顯示 32 Unicode code points、最多兩行，較長時顯示前 31 個 code points + `…`；完整檔名仍在 TXT。
- 每格固定 240×180 px 圖片區、白底/淺灰分隔、編號與 44 px 文字標籤區；以 `scale=min(boxW/sourceW,boxH/sourceH)` 等比 contain，水平與垂直置中，永不 crop。透明 PNG 合成到白色底。
- 外距 24 px，欄/列間距 16 px。結果寬 `48 + columns*240 + (columns-1)*16`；高 `32 + rows*240`。輸出尺寸任一邊 ≤8,192 px、總像素 ≤16,000,000；PNG ≤64 MiB，TXT ≤128 KiB。
- 一次只允許一個來源 ImageBitmap 存活；每張依序 decode → draw → close，再取下一張。預覽是輸出的單一合成畫布，不保留每張原圖縮圖。只保留來源 File refs、metadata 和一份完成的 PNG Blob/TXT bytes。
- reset、來源更換、排序、欄數或檔名選項更改都使結果 stale、停止／丟棄目前工作、清 output。重新產生時先清掉舊 Blob；下載 URL 只在明確按鈕觸發後建立，待下載的 URL 最遲 60 秒或 `pagehide` revoke。已交給瀏覽器的下載無法撤回，介面不得聲稱能撤回。

## 功能需求

### FR-01：檔案預檢

按加入檔案後先檢查數量、每檔 bytes、總 bytes，再順序讀取必要的 image header/metadata。JPEG parser bounded to 8 MiB：要求 SOI、合法 marker lengths、恰有一個可讀 SOF dimensions，讀 APP1 Exif orientation。PNG parser 要求 8-byte signature、第一 chunk IHDR、合法 chunk bounds，讀 eXIf 和 acTL；有 `acTL` 即視為 APNG 拒絕。TIFF Exif orientation 必須是 1–8；無值視為 1。損壞或衝突方向 metadata 拒絕，不默默略過。validate width/height nonzero、pixel/edge limits。`File.type` / extension 與 bytes 不一致時依 bytes 判格式，畫面告知使用的實際格式。

### FR-02：排序、欄數和標籤

每張列出序號、完整檔名、bytes、像素尺寸及預檢狀態。上移／下移按鈕保持鍵盤操作，編號隨排序即時更新並使 output stale。預設欄數 `min(4,n)`，允許 1–6，選擇超過圖片數時改為圖片數。可選在 PNG 顯示檔名；畫布標籤最多兩行、最多 32 Unicode code points（超過顯示前 31 個 + `…`），TXT 永遠列完整檔名映射。名稱只以文字呈現，輸出不當作路徑。

### FR-03：產生聯絡表

Generate 前預估 output dimensions/pixels，超上限則阻止 decode，指出需減少欄數以外的有效措施是減少照片（欄數影響尺寸，不改來源 count）或縮小任務範圍；不可偷偷縮小結果來閃過硬上限。按排序序號逐一 `createImageBitmap(file)`，使用 standard `from-image` EXIF visual orientation，核對 decoder 輸出維度與預檢方向推算相符。繪製到一張 reusable output canvas：白底先填滿；每圖 contain 在 240×180 box，編號固定，檔名按選配文字縮短。完成以 `canvas.toBlob('image/png')` 輸出。toBlob 回 null、decode 拒絕或實際 PNG bytes >64 MiB 都視為全批失敗。

數學：對圖片 w×h、盒 bx×by，`s = min(bx/w, by/h)`；`dw=w*s`, `dh=h*s`, `dx=cellX+(bx-dw)/2`, `dy=cellY+(by-dh)/2`。輸出 canvas 按 FR-02 固定公式配置，`rows=ceil(n/columns)`；沒有圖片的尾格保持白色。

### FR-04：結果與索引

中央預覽顯示完整合成 PNG（像素尺寸標出）。TXT 使用 UTF-8、固定標題 `Photo contact sheet index v1`，後接每行 `${index}\t${JSON.stringify(fileName)}\t${width}x${height}`；採 JSON 字串 escaping，避免 newline/tab 偽造項目。輸出固定檔名 `photo-contact-sheet.png` / `photo-contact-sheet-index.txt`。使用者可換順序後重新生成；PNG number 和 TXT order 必須完全一致。

### FR-05：限制和錯誤

固定錯碼：`TOO_MANY_FILES`、`FILE_TOO_LARGE`、`TOTAL_TOO_LARGE`、`UNSUPPORTED_FORMAT`、`ANIMATED_PNG`、`IMAGE_HEADER_INVALID`、`EXIF_INVALID`、`PIXEL_LIMIT`、`EDGE_LIMIT`、`SHEET_PIXEL_LIMIT`、`DECODE_FAILED`、`ORIENTATION_MISMATCH`、`CANVAS_UNAVAILABLE`、`PNG_EXPORT_FAILED`、`OUTPUT_TOO_LARGE`、`CANCELLED`。任一檔案預檢或 decode 失敗時，不產生部分 sheet/TXT；保留錯誤 row 及其原因，其他源 File refs 可留給修正後重試。

### FR-06：處理狀態、取消和 stale

`idle → preflighting(i/n) → ready → rendering(i/n) → encoding → result`；`blocked`、`failed`、`stale`、`cancelling` 為旁路狀態。取消時停止排下一檔；`createImageBitmap` / canvas `toBlob` 沒有可用 AbortSignal 時，狀態文字需說「正在停止，等目前圖片處理完」，並在 promise/callback 回來後 close bitmap、丟棄 bytes、不得顯示或下載舊結果。來源、順序、欄數、檔名 toggles 更改會 generation++、撤銷舊輸出 URL、舊 work 回來即 close/release。`finally` 一律 `bitmap.close()`、暫存 bytes 設 null；reset/pagehide 將 canvas width/height 設 0、清 File refs/metadata/output、revoke URLs。

## 非目標

不支援多頁聯絡表、影像增強／濾鏡、排序辨識、圖片相似度、透明背景匯出、裁切、輸出 PDF、EXIF/GPS 保留或分享上雲。只畫原圖縮圖並產編號。


---

## 原文件 TECHNICAL.md

# 技術契約：照片聯絡表

狀態：規格，尚未實作。使用原生 HTML/CSS/瀏覽器 ESM、Node.js 24+ `node:test`；runtime 零套件，Node 僅開發／測試／build。主流程依賴瀏覽器 Canvas/ImageBitmap，不能由 Node 單元測試宣稱通過。不得用網路解碼服務、CDN、framework、external fonts 或第三方 image library。

## 建議檔案樹

```text
package.json
public/index.html
public/styles/app.css
public/js/app.js
public/js/core/image-preflight.mjs
public/js/core/layout.mjs
public/js/core/index-text.mjs
public/js/core/generate.mjs
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
test/image-preflight.test.mjs
test/layout.test.mjs
test/index-text.test.mjs
test/fixtures/ (程式合成的極小 byte fixtures)
```

## 純函式及 browser adapter

```js
inspectImageHeader(bytes, nameForError)
// -> { format:'jpeg'|'png', rawWidth, rawHeight, orientation:1..8,
//      visualWidth, visualHeight, animated:false } | ImageInputError

validateSelection(files, metadata, { maxCount:30, maxFileBytes:8_388_608,
  maxTotalBytes:67_108_864, maxPixels:16_000_000, maxEdge:8192 })
// -> { items:[{file,metadata,index}], sheet:{width,height,columns,rows,pixels} }

fitContain(sourceW, sourceH, boxW=240, boxH=180)
// -> { scale, width, height, dx, dy }

async generateContactSheet(items, options, { signal, generation, isCurrent, onProgress })
// -> { png: Blob, indexText: Uint8Array, width, height, itemCount } | ImageOutputError
```

`inspectImageHeader` only reads bounded data from each File; file names/MIME/extensions are display hints, never trusted. JPEG parser walks marker lengths until SOS, reading SOF dimensions and APP1 `Exif\0\0`; it checks all byte offsets before reading. TIFF parser reads byte order, magic, IFD offset/count, orientation tag `0x0112` as one SHORT; only values 1..8 valid. No GPS/date/camera tags are copied. PNG parser checks signature, first IHDR and chunk bounds, scans recognized ancillary `eXIf` and `acTL`; presence of `acTL` rejects. Exif TIFF parser is shared within the product. Bad/truncated/duplicate contradictory metadata is `IMAGE_HEADER_INVALID` or `EXIF_INVALID`. Decoder remains final authority on whether encoded pixels are supported.

`visualWidth/Height` swap raw dimensions for EXIF orientations 5, 6, 7, 8; values 1–4 retain dimensions. `createImageBitmap(file)` default `imageOrientation='from-image'` per HTML Standard is required. After resolving, check bitmap dimensions equal preflight's visual size; if they do not, close and fail `ORIENTATION_MISMATCH`. Browser acceptance uses asymmetric synthetic images for all eight orientations because width-only comparison cannot catch mirror errors.

## 逐張解碼記憶體規則

1. Validate count, file bytes, total bytes, headers, format, metadata and pixels for the entire selection before the first decode. Parse one File at a time and drop its temporary header bytes immediately; retain only File references and small metadata records.
2. Calculate final sheet width/height/pixels before allocating Canvas. It must be ≤8,192 edge and ≤16,000,000 output pixels. Allocate one reusable canvas, one context, and no per-image thumbnail canvases.
3. For each current item serially: await one `createImageBitmap(file)`; check generation; draw it into the cell; in `finally`, call `bitmap.close()` before requesting the next item. Never use `Promise.all` for image decode; peak live `ImageBitmap` count is 1.
4. For cancel/stale while decode is pending, do not start another decode. Since the browser decode promise has no AbortSignal, show `cancelling`; once it settles, close bitmap without drawing. During `toBlob`, wait for the callback then discard the result if stale. No stale result may become visible or downloadable.
5. Reuse output canvas, fill white before drawing, then `toBlob('image/png')`. On replacement/reset/pagehide set canvas dimensions to 0 and release File, metadata and Blob refs. No object URL is needed for in-page preview; URLs are created on explicit download only and revoked on replacement, pagehide, or 60s fallback.

If decode, Canvas allocation or PNG export fails (including memory pressure), clear the canvas and all partial outputs, retain only source file choices for recovery, and show a fixed error. Never silently drop an image, downsample below its specified cell fit, or move work to a server.

## 尺寸計算、狀態與輸出

With `n` files, `columns = min(userChoice,n)` where userChoice is integer 1..6 and default `min(4,n)`; `rows=ceil(n/columns)`. `sheetWidth=48 + columns*240 + (columns-1)*16`; `sheetHeight=32 + rows*240`. Cell image area is 240×180; cell label follows in 44 px row; gap 16 px; 24 px exterior margin. Filename label uses at most two lines and 32 Unicode code points; if longer it displays the first 31 code points plus ellipsis. For contain, `s=min(240/w,180/h)`; center leftover in both axes. Output MIME `image/png`. Text index is built from validated original File names using `JSON.stringify(name)`, so embedded tabs/newlines remain one displayed record.

States: `idle`, `preflighting`, `ready`, `rendering`, `encoding`, `result`, `stale`, `cancelling`, `blocked`, `failed`. Every relevant input change increments generation and synchronously disables downloads. Check generation after every await and canvas callback. Abort controller marks cooperative loops; it cannot interrupt native decode/encode. `pagehide` cancels, nulls, zeroes canvas and revokes all URLs. No storage or telemetry.

Download caps: PNG ≤67,108,864 bytes; TXT ≤131,072 bytes. Fixed names only. No source filename is written into the PNG metadata; file name appears only in visible label/text index when selected.

## Node package and commands

Package: ESM, private, no dependencies. `npm test` uses `node --test`; `npm run check` validates source and static safety rules; `npm run build` copies allow-listed `public/` to `dist/`. A future local preview binds only `127.0.0.1:4225`. Do not treat Node fake-file tests as Canvas/decoder tests. This spec task did not run tests or launch a server/browser.

## Official references

- [HTML Standard — ImageBitmap and `createImageBitmap()`](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html): supported Blob input, `ImageBitmap.close()`, orientation defaults and decode failure semantics.
- [W3C PNG Specification, Third Edition](https://www.w3.org/TR/png/): PNG signature, IHDR/chunk framing, alpha and animation chunks; bounds/parser must reject unsupported animated PNG.
- [CIPA Standards — Exif DC-008](https://www.cipa.jp/e/std/std-sec.html): authoritative Exif format reference, including TIFF metadata and orientation tag. A metadata parser must remain bounded and only read orientation.
- [ITU-T T.81](https://www.itu.int/ITU-T/recommendations/rec.aspx?lang=en&rec=2633): JPEG-1 marker/codestream reference. Browser decoding remains necessary for actual pixel support.
- [HTML Standard — Canvas](https://html.spec.whatwg.org/multipage/canvas.html): canvas bitmap/export API baseline. Actual Canvas PNG creation is a browser-only gate.


---

## 原文件 UX-SEO.md

# 介面與搜尋資料：照片聯絡表

狀態：規格，尚未實作。Surface mode：Product App。M1 candidate 必須 `noindex,nofollow`，不宣告 canonical/sitemap；`contact-sheet.glossquote.com` 只是候選網址。

## 搜尋文案

**繁中 title：** 照片聯絡表｜把多張圖片排成編號清單  
**繁中 description：** 在本機把 JPEG/PNG 照片排成一張不裁切的聯絡表，附編號與檔名對照，下載 PNG 和 TXT。  
**繁中 H1：** 讓一組照片變成可挑選的編號表

**English title:** Photo Contact Sheet Maker | Number and Review Images  
**English description:** Arrange local JPEG and PNG files into one uncropped, numbered contact sheet with an optional filename index. Export PNG and text.  
**English H1:** Make a numbered sheet people can use to pick photos

## 桌面工作區

```text
┌──────────── 照片聯絡表 ─── zh-TW ─── 0 / 30 張 ───────────────┐
│照片清單 / 導覽  │                 聯絡表畫布                  │ 檢視設定│
│ 1 IMG_01.jpg ↑↓ │ [將 JPEG/PNG 加入工作區]                     │欄數 4   │
│ 2 IMG_02.png ↑↓ │ 預檢：格式、方向、像素、大小                 │□ 顯示檔名│
│ 3 IMG_03.jpg ↑↓ │                                               │最大 30  │
│                 │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│每張8MiB│
│ [清空選取]      │ │ 1 圖片 │ │ 2 圖片 │ │ 3 圖片 │ │ 4 空格 ││本機處理│
│                 │ └────────┘ └────────┘ └────────┘ └────────┘│        │
├─────────────────┴─────────────────────────────────────────────┴────────┤
│ PNG 產物：1056 × 512 px     [產生聯絡表]   [下載 PNG] [下載索引 TXT]  │
└────────────────────────────────────────────────────────────────────────┘
```

## 手機工作區

```text
┌ 照片聯絡表 ─ 3 / 30 ┐
│ [加入 JPEG/PNG]     │
│ 預檢完成：3 張       │
│ 1 IMG_01.jpg [↑][↓] │
│ 2 IMG_02.png [↑][↓] │
│ 3 IMG_03.jpg [↑][↓] │
│ 欄數 [4]  □ 檔名    │
│ [產生聯絡表]        │
├─────────────────────┤
│ 產物預覽（單張畫布）│
│ [下載 PNG] [下載 TXT]│
│ 像素尺寸與 cap 狀態 │
└─────────────────────┘
```

順序控制相鄰於項目；保留 full filename 可換行的清單標籤，但不因長檔名推擠畫布。畫布輸出是最大區域；進階檔案限制以清楚的 details 展開。手機可縱向捲動，畫布本身可縮放檢視，不讓整頁雙向捲動。

## 狀態與操作文案

Idle：「加入要整理的 JPEG 或 PNG。」；preflight：「正在檢查 3 / 12 張（未解碼照片）…」；ready：「12 張通過格式與像素檢查。」；rendering：「正在排第 4 / 12 張；目前只處理一張圖片。」；cancelling：「正在停止，等目前圖片處理完成。」；success：「聯絡表已建立：1056 × 752 px，12 張。」；empty：「目前沒有照片，加入圖片後再排版。」；unsupported：「這不是本工具接受的靜態 JPEG 或 PNG，沒有產生部分結果。」；pixel error：「這張是 18.4 MP，超過每張 16 MP 上限；移除或先用本機影像工具縮小後重試。」；sheet cap：「目前格數會超過畫布限制，減少照片後再試。」；stale：「排序或設定已改；舊產物已清除，請重新產生。」

錯誤一併說出檔名（text only）、哪個 cap 及下一步。畫面不展示照片自動識別或虛構縮圖；預覽只在使用者按下產生且所有預檢通過後建立。

## 無障礙與視覺

以相鄰上移／下移按鈕支援鍵盤重排；不要求 drag. 圖片序號用可見文字且有 accessible name。狀態同時有 icon、文字、色彩。圖像 preview 具有 summary `12 張、4 欄、3 列`；避免將全部 30 張逐張 announce。主要按鈕 44×44 px、可見 focus、正文對比 ≥4.5:1、320px/200% zoom、reduced-motion。

## FAQ

### 繁體中文

**照片會被裁掉嗎？** 不會；每張照片等比縮放並置中，剩餘空間留白。  
**支援哪些格式？** 只支援通過檔頭與瀏覽器解碼檢查的靜態 JPEG/PNG；動畫 PNG、GIF 和 SVG 會拒絕。  
**照片會上傳或保留定位資料嗎？** 工具在目前頁面處理，不上傳；匯出的聯絡表不帶來源檔案 metadata。

### English

**Are photos cropped?** No. Each photo is scaled proportionally and centered with blank space where needed.  
**Which formats are supported?** Static JPEG and PNG files that pass header and browser decoding checks; animated PNG, GIF, and SVG are rejected.  
**Are images uploaded or do exports retain location metadata?** Processing stays in the page, and the exported sheet does not carry source metadata.

## Browser gate

Format parsing and fit math can be Node-tested with generated fixtures. Real decode, EXIF visual orientation, transparent-PNG flattening, Canvas PNG export, memory behavior, download, keyboard controls, mobile layout and no-network checks remain **NOT_RUN_USER_FOCUS_INCIDENT**. They must not be represented as PASS by fake headers or Node tests.


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：照片聯絡表

狀態：規格，尚未實作。Node media fixtures 由 test 程式合成，尺寸與 bytes 很小；不得使用或下載真實使用者照片。下列案例是規格 oracle，不代表已執行。

## Node 自動／純函式 oracle

1. **A01 FR-01 count boundary** — 30 個合成 static image metadata rows 接受；第 31 個為 `TOO_MANY_FILES`，尚未 decode。
2. **A02 FR-01 per-file byte cap** — 8,388,608-byte input 可進 metadata scanner；8,388,609 得 `FILE_TOO_LARGE`，無 decode。
3. **A03 FR-01 total bytes** — 合計恰 67,108,864 bytes 通過 size gate；多 1 byte 為 `TOTAL_TOO_LARGE`。
4. **A04 FR-01 PNG magic** — `89 50 4E 47 0D 0A 1A 0A` 後接合法 IHDR 300×200，格式 `png`、dimensions 300×200。
5. **A05 FR-01 JPEG magic/SOF** — 合成 `FF D8` + bounded SOF header 宣告 300×200；識別 jpeg/dimensions；只測 parser，不宣稱 pixels 可 decode。
6. **A06 FR-01 spoofed type** — SVG bytes `<svg…>` 配 `image/png` MIME 或 `.png` 副檔名；`UNSUPPORTED_FORMAT`，不得呼叫 decoder。
7. **A07 FR-01 animated** — 帶 `acTL` chunk 的 PNG/APNG；`ANIMATED_PNG`。GIF signature 也為 unsupported。
8. **A08 FR-01 dimensions** — 4000×4000=16,000,000 pixels 且 edge≤8192 通過；4001×4000 拒 `PIXEL_LIMIT`；8193×1 拒 `EDGE_LIMIT`。
9. **A09 FR-01 EXIF** — orientation 6 / raw 4000×3000 -> visual 3000×4000；orientation 8 同維度；0、9、IFD out-of-bounds、contradictory duplicate -> `EXIF_INVALID`。
10. **A10 FR-02 column count** — 3 files and default => columns3; 30 files default=>4; selected 6 with 2 files normalizes to2; values0/7 are rejected.
11. **A11 FR-03 contain landscape** — 300×200 into 100×100 => box `100×66.666666…`, dx0, dy16.666666…; no negative extent/crop.
12. **A12 FR-03 contain portrait** — 200×300 into100×100 => `66.666666…×100`, dx16.666666…, dy0.
13. **A13 FR-03 rows** — 3 items, 2 columns => 2 rows, slot 4 remains white; sheet W=`48+2*240+1*16=544`, H=`32+2*240=512`; expected exactly 544×512.
14. **A14 FR-04 index injection** — file name `a\tB\n<script>.png`; one index record remains one logical TXT line with JSON-escaped filename, and page DOM renders the name only as text.
15. **A15 FR-02 long label** — 40-codepoint name shown in PNG label as first 31 codepoints plus ellipsis, no more than two lines; TXT retains full name.
16. **A16 FR-06 sequential lifetime** — fake decoder records active bitmap count; across 3 files max active=1 and each `close()` occurs before the next `createImageBitmap` call.
17. **A17 FR-06 cancellation** — cancel during pending decode; after fake promise resolves, bitmap close count=1, draw count unchanged for that item, no result/Blob URL created.
18. **A18 FR-06 stale encode** — change column count while `toBlob` callback is pending; returned old PNG is discarded, stale generation cannot become `result`.
19. **A19 FR-05 output byte cap** — TXT 131,072 bytes accepted; 131,073 rejected. PNG Blob exactly 67,108,864 accepted; 1 byte more -> `OUTPUT_TOO_LARGE`, no download.
20. **A20 FR-06 cleanup** — reset/pagehide sets canvas dimensions to 0, clears source references and output, revokes pending URL exactly once; repeated cleanup is idempotent.

## 真瀏覽器 gates — NOT_RUN

使用由 fixture code 生成的 asymmetric JPEGs for EXIF orientation 1–8、透明 PNG、損壞圖片和最大允許尺寸；驗證 decode orientation、pixel appearance/alpha flattening、Canvas 產物可再解碼、下載/取消、input change stale、keyboard up/down、320px、200% zoom 與 offline network。整組目前標 **NOT_RUN_USER_FOCUS_INCIDENT**。純 Node 只驗 header parser/layout/lifecycle fakes，不能證明 Canvas API、解碼器、實際 PNG bytes 或使用者焦點安全。


---

## 原文件 TASKS.md

# 實作任務：照片聯絡表

狀態：規格，尚未實作。Node 24+ ESM、零 dependencies。任何外部處理、server/browser 或 `npm install` 均不在規格撰寫範圍。真瀏覽器只有 primary 確認完全隔離使用者焦點後方可驗收，否則 `NOT_RUN_USER_FOCUS_INCIDENT`。

1. **T00 — Scaffold / browser capability decision.** 前置：六份規格及 root common docs。Allowed paths：產品內 `package.json`, `.gitignore`, `scripts/**`, `public/**`, `test/**`, `dist/**`, `HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。建立 ESM private package、Node24、test/check/build/dev (loopback 4225)，但不啟動 server。寫出支援 API 偵測與安全退出字串。驗收 Node check source/schema；完成：零 runtime deps、沒有 CDN；HANDOFF 回寫。
2. **T10 — Bounded image metadata scanner.** 前置 T00 PASS。新增 `image-preflight.mjs` 和 generated-byte fixtures/tests；實作 JPEG marker / Exif orientation、PNG chunk / eXIf / APNG checks、per-file/total/pixel/edge caps。驗收 `node --test test/image-preflight.test.mjs`，對照 A01–A10。完成：preflight precedes any decode；bad inputs have no partial metadata acceptance；HANDOFF 回寫。
3. **T20 — Sheet layout/index core.** 前置 T10 PASS。新增 pure `layout.mjs`、`index-text.mjs`；實作 formula、fixed dimensions、column normalization、file label shortening、JSON-string quoting. 驗收 `node --test test/layout.test.mjs test/index-text.test.mjs`，對照 A11–A15。完成：no-crop coordinates and exact TXT order; HANDOFF 回寫。
4. **T30 — Sequential browser generator.** 前置 T20 PASS。新增 `generate.mjs`：single reusable canvas, one bitmap at a time, draw/close per item, from-image orientation, white fill, PNG toBlob. Add generation and cancel fencing. 驗收 `npm test` includes fake decoder lifecycle A16–A20; 真 API 仍是 browser gate。完成：old results never return; no Promise.all; HANDOFF 回寫。
5. **T40 — Bilingual Product App.** 前置 T30 PASS。建 source list, up/down ordering, preview sheet, columns/name option, generation progress/errors/download. keyboard path and status; add M1 noindex. 驗收 `npm run check`, `npm run build`; true UI browser checks if safely isolated, else explicit NOT_RUN. 完成：real output can be generated in a conforming browser, all core controls visible; HANDOFF 回寫。
6. **T50 — Final M1 verification.** 前置 T40 PASS。一次跑 final `npm test`, `npm run check`, `npm run build`; run only safe approved browser gates; ensure privacy/no network, cleanup, 320px/zoom/keyboard. Allowed paths same as T00. 完成：all A cases accurately marked, unresolved browser requirements NOT_RUN, no public canonical/deploy; HANDOFF 回寫。

不得把測試 fixture 的成功當成瀏覽器解碼成功。遇 decoder、memory 或 canvas failure，保持 no partial output 並在當前任務修復後重跑受影響檢查。M2 需主驗和另行指令。

