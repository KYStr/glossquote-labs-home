# 圖片敏感資訊遮蔽 — 既有規格保存

Task ID: `labs-39-image-redactor` · Spec ID: `spec-39-image-redactor`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：圖片敏感資訊遮蔽

狀態：SPEC_ONLY。這是規格，尚未實作或驗收。所有數字、案例和錯誤均為預期契約，不是測試結果。

## 使用者目標

使用者選取一張本機截圖或圖片，在原始視覺方向上畫出實心黑色矩形，核對遮罩位置後產生扁平 PNG 預覽，最後自行決定是否下載並分享。

價值假設：支援人員或產品人員需要保留截圖上下文，同時遮住已知的少數敏感區域。這是具體但未驗證的情境，沒有搜尋量或訪談證據。

## 固定產品決策

- 產品名稱：GlossQuote 圖片敏感資訊遮蔽 / GlossQuote Image Redactor。
- 靜態雙語頁：繁中 /index.html，lang="zh-Hant"；英文 /en/index.html，lang="en"。
- Node.js 24+ 僅供本機開發、檢查、建置及離線測試。正式頁使用原生 HTML、CSS、瀏覽器 ESM，零執行期套件。
- 圖像不送出本機瀏覽器，不寫入瀏覽器儲存。只在使用者明確按下「下載 PNG」後請求下載輸出副本。
- M1 preview 固定 noindex。主代理指定 image-redact.glossquote.com 為網址候選；M1 不設定正式 canonical、sitemap 或部署。Cloudflare 網站、DNS、正式 SEO 和首頁整合由主代理負責。
- M1 只建本機候選與驗收證據，不執行 M2 公開來源發布或網站部署。

## 功能需求

### FR-01：本機單檔輸入

使用者只能透過原生檔案選擇控制項選取一個檔案。沒有拖入檔案、目錄、剪貼簿、遠端網址、網路位置或多檔輸入。

檔案大小必須大於 0 且不超過 8,388,608 bytes（8 MiB）。檔名和瀏覽器提供的 MIME type 不可信；以內容簽名及格式解析判斷，不因副檔名或 File.type 宣稱可接受。只接受 JPEG 或 PNG。輸出永遠是 PNG。

檔名只作純文字顯示，不放進 HTML、URL、日誌或輸出檔名。控制字與雙向控制字須以可見的 U+XXXX 形式顯示，以免視覺重排；不得把檔名解讀為標記或路徑。下載檔名固定為 glossquote-image-redacted.png。

重新選取來源會使舊輸出失效並清除遮罩。若目前存在遮罩，替換來源前在頁面內顯示非模態確認；不得使用 window.confirm、原生 dialog 或焦點陷阱，也不得程式化移動焦點。取消保留原來源與遮罩並丟棄待選新檔，確認才開始處理新來源。使用者明確按下「清除圖片」時立即清除，不再詢問；pagehide 清理也不詢問。

### FR-02：解碼前格式、動畫和尺寸檢查

任何呼叫瀏覽器影像解碼 API 之前，先檢查實際來源 bytes。必須能在不解碼影像的前提下判定檔案類型、編碼尺寸、JPEG EXIF 方向和 PNG 是否含動畫標記。無法完整且安全讀取所需欄位、遇到格式錯誤或超出限制時，必須拒絕，不可先解碼「看看會怎樣」。

輸入必須滿足：

- 來源 bytes ≤ 8,388,608。
- 原生寬、高均為 1–8,192。
- 寬 × 高 ≤ 16,000,000，乘法以安全整數檢查。
- 只接受 8-bit baseline/progressive JPEG；JPEG frame 必須有可讀尺寸，component count 僅 1 或 3。
- JPEG 沒有 EXIF orientation 時方向為 1。若有 EXIF Orientation，必須恰為單一、可完整解析的 SHORT count=1 標籤，值 1–8；重複、錯誤型別、錯誤值或截斷資料都拒絕。
- PNG 必須有有效簽名、第一個 IHDR、正整數尺寸、至少一個 IDAT 和最後一個零長度 IEND；所有 chunk 長度及邊界可驗證。遇到 acTL、fcTL 或 fdAT 動畫 chunk 即拒絕，包括非預期位置的動畫 chunk。任何 CRC 錯誤、越界長度、截斷或 parser 不能安全遍歷到 IEND 都拒絕。
- SVG、GIF、WebP、HEIC、APNG 和任何未知／偽造格式都拒絕。

預檢通過後才呼叫瀏覽器解碼，明確使用尊重影像方向的選項。解碼後 Bitmap 寬高必須符合預檢算出的視覺方向尺寸；不符即關閉 Bitmap 並拒絕。超出像素限制、解碼失敗或資源不足時不得嘗試縮小後繼續。

### FR-03：視覺方向和座標

所有遮罩座標都以使用者看到的原圖方向及原圖像素為準，原點在左上角。Orientation 1–4 的視覺尺寸與 JPEG 原生尺寸相同；5–8 交換寬高。畫布可縮放顯示，但不得改變其像素座標空間或裁切原圖。

方向變換須符合 EXIF Orientation：

| Orientation | 視覺變換 | 輸出視覺角落（TL、TR、BR、BL）各取自原圖的角落 |
|---|---|---|
| 1 | 原向 | TL、TR、BR、BL |
| 2 | 水平鏡射 | TR、TL、BL、BR |
| 3 | 旋轉 180° | BR、BL、TL、TR |
| 4 | 垂直鏡射 | BL、BR、TR、TL |
| 5 | 主對角線轉置 | TL、BL、BR、TR |
| 6 | 順時針旋轉 90° | BL、TL、TR、BR |
| 7 | 反對角線轉置 | BR、TR、TL、BL |
| 8 | 逆時針旋轉 90° | TR、BR、BL、TL |

在 CSS 顯示尺寸與原圖像素間使用同一個比例換算。拖曳起點與終點先映射為原圖連續座標，再正規化方向、起點向下取整 floor、終點向上取整 ceil，最後 clamp 到原圖邊界。反向拖曳與正向拖曳產生相同矩形。若指標移動前的幾何寬或高為零，拒絕為零面積，不建立矩形；小於一個輸出像素但非零的拖曳可覆蓋至少一個像素。

### FR-04：黑色矩形和清單

每個遮罩資料正好是 {id, x, y, width, height}：

- id 是內部唯一、穩定字串；不得取自檔名、圖片內容或使用者文字。
- x、y、width、height 必須是有限、安全整數。x、y ≥ 0；width、height ≥ 1；x + width ≤ 視覺寬，y + height ≤ 視覺高。
- 遮罩區域為半開矩形 [x, x + width) × [y, y + height)。超界數字欄位回報錯誤，不自動 clamp。
- 一張圖片最多 50 個遮罩；第 51 個拒絕。即時顯示已用數量。
- 遮罩顏色固定為 #000000，alpha 固定 255；不提供改色、不透明度、圓角或軟化。
- 使用者可拖動畫布建立矩形；也可用可見欄位以鍵盤建立或修正 x、y、width、height。畫布拖曳不是唯一操作方式。
- 右側／行動檢視的遮罩清單逐一列出序號和座標，可選取、編輯、刪除。提供「復原最後新增的遮罩」和「清除所有遮罩」。清除所有遮罩前在頁面內顯示非模態確認；不得使用 window.confirm、原生 dialog、焦點陷阱或程式化焦點移動；取消不變。清除圖片是安全清理動作，立即執行且不詢問。
- 至少一個有效遮罩才可生成。無遮罩時生成控制 disabled，純邏輯也回傳 MASK_REQUIRED。

### FR-05：預覽與扁平 PNG

畫布 backing store 尺寸等於視覺方向原圖尺寸，不縮放或裁切。預覽／匯出使用相同的確定程序：

1. 建立視覺尺寸 Canvas。
2. 先以不透明白色填滿畫布。
3. 以視覺方向把來源 Bitmap 以 source-over 合成到白底。
4. 逐一以 alpha=255、#000000、source-over 畫出整數矩形。
5. 由此 Canvas 產生 image/png Blob，確認 MIME 和尺寸符合規格。

透明 PNG 區域因此在輸出中為白色；遮罩區域每個像素須為純黑、不透明。輸出只有合成後的像素；程式不把來源 Blob、原始 JPEG/PNG chunk、EXIF、文字 chunk、可編輯圖層或遮罩 schema 追加到輸出。瀏覽器可能產生標準的解析度或色彩資訊，故不宣稱輸出完全沒有 metadata。

生成成功後先顯示結果 PNG 預覽及視覺尺寸、實際 MIME 和 bytes。此預覽就是下載所使用的同一個 Blob。只有結果預覽載入且仍是最新狀態時，才啟用下載。使用者必須自行檢查完整結果；介面不稱其已找到全部敏感資料。

### FR-06：忙碌、取消和結果失效

解碼或生成時，同一時間最多一個目前工作。每個來源、遮罩狀態和工作各有單調遞增 revision/job id。

- 每次來源或遮罩資料變更，同步撤銷既有輸出 Blob URL、預覽和下載能力，再顯示變更後狀態。
- 使用者可取消生成。取消立即使 job 過期並恢復可編輯狀態；不得等待 native canvas encoder 完成才更新畫面。
- createImageBitmap 或 Canvas toBlob 無法即時停止時，採 stale-result 防護。晚到 Bitmap 必須 close；晚到 Blob 不得建立 URL、替換結果或重新啟用下載。
- 使用者按下 Clear source 時立即清除輸入控制、Bitmap、遮罩、Canvas backing store、輸出 Blob／URL 和狀態，回到初始畫面，不詢問確認。
- pagehide 同步使所有工作失效並無提示清除 DOM 輸入和可控 references，呼叫 ImageBitmap.close、縮小 Canvas 到 1×1、revoke 所有 URL、清除遮罩與結果。BFCache 的 pageshow.persisted 回到乾淨初始畫面。
- 以上只描述程式可控資源釋放；不得宣稱覆寫 native/browser 記憶體或安全抹除裝置資料。

### FR-07：錯誤和復原

錯誤採固定 code，不回顯原始 bytes、例外文字、stack 或完整檔名。第一個欄位錯誤要關聯到可修正欄位。錯誤至少包含：

- FILE_REQUIRED、FILE_EMPTY、FILE_TOO_LARGE、UNSUPPORTED_FORMAT
- HEADER_TRUNCATED、HEADER_INVALID、HEADER_UNSAFE、ANIMATED_PNG
- DIMENSION_INVALID、DIMENSION_LIMIT、PIXEL_LIMIT
- JPEG_MODE_UNSUPPORTED、EXIF_INVALID、ORIENTATION_UNSUPPORTED
- DECODE_FAILED、DECODE_DIMENSION_MISMATCH、RESOURCE_UNAVAILABLE
- MASK_REQUIRED、MASK_LIMIT、MASK_INVALID、MASK_OUT_OF_BOUNDS、MASK_ZERO_AREA
- GENERATION_CANCELLED、ENCODE_FAILED、OUTPUT_INVALID、STALE_RESULT

原生解碼錯誤、資源不足、Canvas 無法產生 PNG 或輸出不合規時，保留安全的來源和可編輯遮罩，沒有下載。使用者可移除遮罩、換較小檔案或清除來源重試。Cancel 不顯示成失敗；取消後沒有輸出。

### FR-08：隱私和資料生命週期

來源 bytes、解碼 Bitmap、遮罩、輸出與 Object URL 僅在目前頁面記憶體。禁止 localStorage、sessionStorage、IndexedDB、Cache API、Cookie、URL query/hash、History state、Console、遙測、分析、錯誤上報、Fetch、XHR、Beacon、WebSocket、EventSource、Service Worker、外部字型、CDN、伺服器上傳及第三方 API。

不以 source file 名作下載名稱。不把內容放入例外、DOM HTML 插入點、記錄或請求。檔案輸入不送入模型或雲端。Canvas 重繪與 pagehide 清 reference 並不保證記憶體安全清除。使用者仍可能忘記其他敏感區域；文案必須提醒完整檢查輸出。

### FR-09：介面可及性和支援環境

拖曳繪製需有鍵盤操作替代：以 x、y、width、height 數字欄位和「加入遮罩」完成同一工作。每個遮罩有可讀名稱與座標；錯誤以 aria-describedby 關聯欄位。通知使用適當 status 語意，不把整張畫布像素內容重複朗讀。

通過桌面 Chrome 和 Edge 最新穩定版的目標驗收才可記錄受測版本。手機觸控可作最佳努力預覽；不保證 16MP 解碼或匯出。若裝置無法 decode/encode，明確停止並建議用支援的桌面瀏覽器或較小圖片，不縮小、不降解析度、不上傳。

## 錯誤優先序

核心驗證固定依序：輸入精確 schema → bytes 範圍 → 格式簽名 → header 結構 → 動畫／JPEG 模式 → EXIF orientation → 寬高與總像素 → mask schema → mask 數量 → 各遮罩座標與面積 → 生成必要狀態。只回傳固定 code 和欄位路徑，不回傳任何輸入值。

## 非 MVP 功能

不做 OCR、自動敏感資料偵測、模糊、像素化、筆刷、形狀以外的遮罩、裁切、縮放、批次、多頁或動畫處理、PDF、SVG、網址圖片、剪貼簿貼入、雲端同步、分享連結、帳號、可還原專案、格式 metadata 編輯或保證安全匿名化。


---

## 原文件 TECHNICAL.md

# 技術規格：影像預檢、遮罩幾何與 Canvas 輸出

狀態：SPEC_ONLY。這是規格，尚未實作、測試或量測。產品為零執行期依賴的瀏覽器 ESM；Node.js 24+ 僅作本機開發和離線驗收。

## 專案結構

預期 M1 專案：

    package.json
    .gitignore
    README.md
    PRODUCT.md
    TECHNICAL.md
    UX-SEO.md
    ACCEPTANCE.md
    TASKS.md
    scripts/
      serve.mjs
      check.mjs
      build.mjs
    public/
      index.html
      en/index.html
      404.html
      _headers
      styles/app.css
      js/app.mjs
      js/controller.mjs
      js/locales/zh-Hant.mjs
      js/locales/en.mjs
      js/core/format-headers.mjs
      js/core/geometry.mjs
      js/core/session.mjs
    test/
      fixtures.mjs
      format-headers.test.mjs
      geometry.test.mjs
      session.test.mjs
      security-contract.test.mjs
      scaffold.test.mjs
    dist/                       # 僅由 build.mjs 產生的 noindex preview

README、產品、介面、驗收和任務契約由本資料夾其他文件定義；實作來源只放 public/。dist 不進來源控制，build 只複製受 allowlist 管理的 public 資產，不複製測試、規格、輸入圖片或執行資料。沒有 production build、wrangler 設定或部署命令。

## Node 和命令

Node 24 或更新版本，使用內建 ESM、fs、path、http、crypto/node:test 等模組；不得 npm install，也不得加任何 runtime 或 dev 套件。

package.json 固定 type=module、private=true、engines.node >=24，命令：

- npm run dev：node scripts/serve.mjs，僅綁 127.0.0.1、預設 port 4219，只提供 public/ allowlist。
- npm test：node --test。
- npm run check：node scripts/check.mjs。
- npm run build：node scripts/build.mjs，生成 noindex dist/。
- build 前做來源驗證；拒絕超出 allowlist 的公開資產或路徑穿越。check 驗 ESM 語法、固定來源清單、同源資產、必要 CSP，以及不含禁用 DOM/network/storage API；掃描不是安全證明。

T00 必須先建立 package.json、三支 scripts 和 test scaffold，之後才可呼叫 npm test、npm run check 或 npm run build。不得先執行尚未建立的命令。

## 純函式介面

以下是產品 API 契約，不要求使用 TypeScript 或套件：

    inspectRasterHeader(bytes: Uint8Array):
      | { ok: true, format: "png" | "jpeg", width, height,
          orientation, visualWidth, visualHeight, pixelCount }
      | { ok: false, error: { code } }

    normalizeMask(raw, visualWidth, visualHeight):
      | { ok: true, mask: { id, x, y, width, height } }
      | { ok: false, error: { code, path } }

    mapPointerRect(start, end, imageRect, visualWidth, visualHeight):
      | { ok: true, rect: { x, y, width, height } }
      | { ok: false, error: { code } }

    validateMaskList(masks, visualWidth, visualHeight):
      | { ok: true, masks }
      | { ok: false, error: { code, path } }

    reduceEditorState(state, action): nextState

輸入記錄必須是精確 plain record；拒絕未知欄位、accessor、symbol、缺欄位和錯誤型別。錯誤不得帶入輸入值、bytes、原生 exception、source name 或 stack。

## 檔頭預檢

收到一個 File 後，先讀其有限 bytes 並在任何 decode 呼叫之前完成所有檔案大小、簽名、結構、orientation 和維度檢查。上限使整檔預檢最多 8,388,608 bytes；預檢完成即不保留額外 ArrayBuffer。不得用 file.type、extension、Image 元素載入或 createImageBitmap 代替 parser。

### PNG

- 確認 8-byte PNG signature。
- 逐 chunk 以 unsigned big-endian length 做安全整數／剩餘長度檢查；拒絕越界、截斷、非法 chunk name、重複／非首位 IHDR、缺 IDAT、缺 IEND、IEND 長度非零、IEND 後有尾隨 bytes。
- 每個 chunk CRC-32 必須匹配；chunk sequence 必須符合 PNG-3 靜態 PNG 必要順序。無法完整走訪到 IEND 即拒絕。
- IHDR 唯一、長度 13、寬高大於 0；bit depth/color type/compression/filter/interlace 欄位要符合 PNG-3 合法組合。保留原生寬高。
- 在任何位置看到 acTL、fcTL 或 fdAT 即拒絕為 ANIMATED_PNG 或 HEADER_INVALID；有效 APNG 必須在 IDAT 前有 acTL。即使瀏覽器只顯示靜態畫格也不接受。
- 檔頭檢查不解壓 IDAT；預檢通過後仍需瀏覽器 decoder 成功，且解碼後寬高與 IHDR 完全相符。

### JPEG

- 必須由 SOI 0xFFD8 開始；安全依 marker segment length 往前走訪至第一個 SOS。所有讀取都需在 File 邊界內。
- 檢查 byte stuffing、marker 前綴、segment length ≥2 和 segment 完整性；遇到 SOS 前必須找到一個且僅一個可用 SOF0 或 SOF2 frame。拒絕其他 SOF、無 SOF、重複 SOF、精度非 8-bit、component count 不是 1 或 3、零尺寸、截斷、無效 sampling factor 或解析歧義。
- SOF dimensions 與每個掃描元件必要欄位須完整。停在第一個 SOS，不把 entropy-coded image data 當 marker sequence 解析。
- 掃描 SOS 前的 APP1。非 Exif 的 APP1 不作 EXIF 解讀。至多一個 Exif APP1；多個即拒絕。
- Exif TIFF byte order 僅允許 II 或 MM；magic 必須 42；IFD0 offset、entry count 和全部 12-byte entry 必須在 APP1 邊界內。Orientation tag 0x0112 可不存在（預設 1），若存在必須只有一個、type SHORT、count 1、值為 1–8。其他值、重複標籤、錯誤型別或截斷皆 EXIF_INVALID。
- orientation 1–4 的 visualWidth/Height 等於 SOF 寬高；5–8 交換寬高。
- decode 設定明確為 imageOrientation=from-image，並比對結果 Bitmap 寬高。瀏覽器不符合方向契約就 fail closed。

### 所有格式的尺寸檢查

預檢後、decode 前要求 width/height 為 1..8192，且 width × height ≤ 16,000,000；所有乘法都必須不溢位安全整數。Orientation 5–8 只交換寬高，不改 pixelCount。接著使用 createImageBitmap(file, { imageOrientation: "from-image" })；若不支援、reject 或 result dimensions 與 parser 的 visualWidth/Height 不符，關閉可得 Bitmap 並回固定錯誤。不得為成功而放寬上限或重採樣。

M1 只把最新穩定版桌面 Chrome 和 Edge 列為支援目標。16M RGBA pixels 約需 64,000,000 bytes，還有來源、Canvas、preview Blob 和瀏覽器內部記憶體；實際裝置需要更多。手機只作 best-effort preview，任何記憶體／解碼失敗都必須清理並明確退出，不能假設像素限制保證所有裝置有足夠記憶體。

## 遮罩座標演算法

Canvas backing store 永遠使用 visualWidth × visualHeight。CSS 只縮放呈現，保持原始長寬比，不裁切；要計算含 letterbox 的實際圖片 clientRect，不能拿外層畫布邊框直接當圖片範圍。

拖曳座標先由 client CSS pixels 依 clientRect 寬高映射到 [0, visualWidth] × [0, visualHeight] 浮點像素座標。若 raw 拖曳 x 或 y span 為 0，回 MASK_ZERO_AREA。否則：

1. 分別以 min/max 正規化兩端，reverse drag 結果相同。
2. 起點 x0/y0 各用 floor，終點 x1/y1 各用 ceil。
3. 各值 clamp 到 0..visualWidth 或 0..visualHeight。
4. 計算 width=x1−x0、height=y1−y0；若任一小於 1 回 MASK_ZERO_AREA。
5. 回傳非負安全整數矩形。

鍵盤欄位直接輸入 x、y、width、height 整數，不自動修剪或截斷小數。必須滿足 0≤x、0≤y、width≥1、height≥1、x+width≤visualWidth、y+height≤visualHeight。非整數、負數、NaN、Infinity、超界或額外欄位拒絕，不 clamp。遮罩列表為 0..50 筆且 ID 唯一；接受第 50 筆，拒絕第 51 筆。

## Canvas 和 PNG 生成

只用原生 Canvas 2D，不使用 overlay 作最終輸出。Canvas backing 尺寸就是完整視覺原圖尺寸。每次輸出以同一順序重畫，避免累積上次畫布內容：

1. 清空 backing store。
2. 用 globalCompositeOperation="source-over"、globalAlpha=1 填滿白色。
3. drawImage(bitmap, 0, 0, visualWidth, visualHeight)，來源已由 from-image 正確定向。
4. 以相同 composite 和 alpha 設黑色，依遮罩順序 fillRect(x, y, width, height)。
5. toBlob(callback, "image/png")，null 回 ENCODE_FAILED；Blob.type 必須為 image/png。
6. 建立預覽 URL 前確認 generation id、source revision 和 mask revision 仍為目前值。陳舊 Blob 丟棄且不得建 URL。
7. 匯出 preview 以此 Blob 顯示。下載只引用同一 Blob，固定檔名 glossquote-image-redacted.png。Canvas 失敗、錯誤 MIME 或失效 revision 均無下載。

Canvas serializer 只序列化 bitmap，不保存原始來源的可編輯圖層；應由實際 pixel assertion 驗證，而非只檢查 DOM overlay。遮罩 alpha 必須在輸出像素中 255。原圖 alpha 由先填白底再 source-over 合成處理。

## 狀態、取消和清除

Pure reducer 不持有 File、ImageBitmap、HTMLCanvasElement、Blob、URL 或 callback。Controller 唯一擁有這些原生資源，並按 identity/revision gate 更新 UI。事件動作包含 select-start/success/failure, add/update/delete/undo/clear-masks, generate-start/success/failure/cancel, clear-source, pagehide 和 persisted pageshow。

狀態至少有 idle、checking-header、decoding、ready-no-mask、ready、generating、output-ready、recoverable-error、unsupported、disposed。任何 source/mask 欄位改動同步清空 output metadata、revoke URL、移除預覽及停用 download。

取消同步將 job 標為過期並還原 ready state；native createImageBitmap/toBlob 本身若晚回，late Bitmap 呼叫 close，late Blob 不建 URL。A 工作不能撤銷或清理較新 B 工作的 Canvas、URL 或畫面。pagehide 使所有 revision/job 失效，重設 file input，關閉 Bitmap，Canvas 變 1×1，清空 DOM 和 reducer，revoke 每個可控 URL。pageshow.persisted 真時只初始化空白頁。不得宣稱 native buffer 已安全抹除。

## 安全、隱私及可及性契約

- 只使用同源靜態資產；CSP default-src 'self'; img-src 'self' blob:; object-src 'none'; connect-src 'none'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'。若預覽 Blob URL 需 policy，僅限 img-src blob:，不得增加網路來源。
- 禁止 storage、網路 API、console 使用者輸入、innerHTML、eval、Function、動態 import、遠端 font/CDN、隱藏服務或依賴。
- 來源名只透過 textContent 渲染；Ctl/bidi controls 顯示為 U+XXXX；內部錯誤碼不含檔名、內容、錯誤 stack 或 source bytes。
- Canvas 是主要工作區。拖曳必須有數字欄位替代，頁面在 320 CSS px 可重排；標籤、錯誤、狀態皆有文字及語意，不靠顏色傳達。
- 200% 縮放、全鍵盤、screen reader、觸控和手機記憶體錯誤都必須如 ACCEPTANCE 分層記錄。Node reducer 或 mocked Canvas 不能宣稱真瀏覽器像素、native decode 或 UI 通過。

## 官方技術參考

- [WHATWG HTML Canvas：bitmap serialization / toBlob](https://html.spec.whatwg.org/multipage/canvas.html#serializing-bitmaps-to-a-file)
- [WHATWG HTML ImageBitmap and animations：createImageBitmap](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html)
- [MDN createImageBitmap：imageOrientation 與 from-image](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
- [W3C PNG Specification Third Edition：PNG chunks、APNG acTL/fcTL/fdAT](https://www.w3.org/TR/png-3/)
- [ITU-T T.81：JPEG marker and frame syntax](https://www.w3.org/Graphics/JPEG/itu-t81.pdf)
- [CIPA DC-X010-2017 Exif 2.32](https://cipa.jp/std/documents/e/DC-X010-2017.pdf)：EXIF orientation tag and image orientation mapping。


---

## 原文件 UX-SEO.md

# 介面、文案與 SEO

狀態：SPEC_ONLY。這是設計規格，尚未實作或驗收。產品 App 採 Gloss Tools 共用設計系統；以實際工作畫布為主要視覺，側欄只放目前遮罩和欄位。

## 使用者和主要工作

主要使用者是假設中的客服、支援或產品人員；工作是遮住截圖中的已知敏感區域，檢查成品，再下載分享。最重要的畫面物件是整張圖片及其黑色遮罩。沒有自動偵測或分享整合。

## Desktop 結構

    ┌────────────────────────────────────────────────────────────────┐
    │ 圖片敏感資訊遮蔽        本機處理／狀態       選取圖片    清除 │
    ├────────────────────────────────┬───────────────────────────────┤
    │                                │ 遮罩 2 / 50                   │
    │        原圖像素畫布             │ x、y、寬、高                   │
    │        黑色實心矩形             │ 刪除此遮罩                     │
    │                                │ 遮罩清單                       │
    │                                │ 復原最後一筆／清除全部         │
    ├────────────────────────────────┴───────────────────────────────┤
    │ 白底合成說明   取消生成             產生 PNG 預覽                │
    ├────────────────────────────────────────────────────────────────┤
    │ 成功後：匯出 PNG 預覽、尺寸與 bytes                  下載 PNG │
    └────────────────────────────────────────────────────────────────┘

畫布所在區域至少佔內容寬度 65%；桌面側欄 300–320 px。預覽畫布是頁面最大的連續區域。選檔、清除、產生、取消和下載都是有文字的原生按鈕。黑色矩形必須能與畫面文字區域清楚區分；Canvas 外同時有遮罩清單和座標，不以純色辨認選取狀態。

## Mobile 結構

    ┌────────────────────────────┐
    │ 標題／狀態／選取圖片       │
    │ 圖片像素畫布               │
    │ 目前遮罩座標與數字欄位     │
    │ 新增／刪除／復原／全清     │
    │ 白底輸出說明               │
    │ 產生預覽／取消             │
    │ 預覽／下載 PNG             │
    └────────────────────────────┘

頁面 320 CSS px 時只有一欄。畫布可在標記為「圖片畫布」的區域內平移／捲動，周邊說明和操作不能被截斷。觸控可拖曳建立遮罩，但所有幾何功能仍可用數字欄位。不要把功能藏在 hover 或未標名圖示。

## 狀態與繁中文案

| 狀態 | 文案 |
|---|---|
| 空白初始 | 選取一張 PNG 或 JPEG。圖片只在此頁處理。 |
| 初始安全提示 | 你要手動畫出需要遮住的區域。工具不會自動偵測敏感資訊；下載前請檢查整張圖片。 |
| 選檔中 | 正在檢查圖片檔頭… |
| 解碼中 | 正在開啟圖片… |
| 已載入、無遮罩 | 拖曳畫出黑色矩形，或輸入像素座標。至少新增一個遮罩才能產生 PNG。 |
| 遮罩清單 | 遮罩 1；x {x}，y {y}，寬 {width}，高 {height}。 |
| 座標提示 | 座標以圖片目前顯示方向的原圖像素計算，原點在左上角。 |
| 透明圖背景 | 匯出會先把透明區域合成為白色，再畫上不透明黑色遮罩。 |
| 拖曳失敗 | 矩形寬和高都必須大於 0。 |
| 超過遮罩上限 | 最多新增 50 個遮罩。 |
| 產生中 | 正在合成 PNG。你可以取消；取消後不會提供下載。 |
| 取消完成 | 已取消。原圖和遮罩仍可編輯。 |
| 預覽完成 | PNG 預覽已產生：{width} × {height} 像素，{bytes} bytes。請檢查完整圖片再下載。 |
| 下載 | 下載 PNG 副本 |
| APNG | 這是動畫 PNG，請改選靜態 PNG 或 JPEG。 |
| 格式錯誤 | 無法安全讀取這個 JPEG 或 PNG 檔頭，因此未解碼圖片。 |
| 超大檔 | 檔案超過 8 MiB。請選取較小的圖片。 |
| 尺寸超限 | 圖片超出每邊 8,192 像素或總計 16,000,000 像素的限制；未解碼圖片。 |
| EXIF 錯誤 | JPEG 方向資訊無法安全判讀，因此未解碼圖片。 |
| 記憶體不足 | 此裝置無法開啟這張圖片。工具沒有縮小、上傳或產生部分結果；請在支援的桌面瀏覽器使用較小圖片。 |
| 解碼／匯出失敗 | 無法產生有效 PNG。原圖與遮罩仍可修改，請再試一次或清除圖片。 |
| 取代來源確認 | 取代圖片會清除目前遮罩和預覽。要繼續嗎？取消會保留目前圖片。 |
| 清除全部遮罩確認 | 清除所有遮罩會讓 PNG 無法產生，並移除目前預覽。要繼續嗎？ |
| 清除圖片 | 已清除圖片、遮罩和預覽。 |
| 無障礙鍵盤說明 | 可用 x、y、寬、高欄位以鍵盤新增或調整遮罩。 |

所有欄位錯誤與動態狀態需用 aria-describedby / role=status 正確關聯。控制項可見 focus，文字對比至少 WCAG AA；主要控制目標至少 44×44 CSS px。支援 reduced motion 和 200% 文字／頁面縮放。

## English page copy

| State | Copy |
|---|---|
| Empty | Choose one PNG or JPEG. The image is processed in this page. |
| Safety note | Draw the areas you want to cover. The tool does not detect sensitive information. Inspect the whole image before downloading. |
| Checking | Checking image file headers… |
| Decoding | Opening image… |
| Ready, no mask | Draw a solid black rectangle or enter pixel coordinates. Add at least one mask to create a PNG. |
| Coordinates | Coordinates use the original image pixels in its displayed orientation, with the origin at the top left. |
| Transparent pixels | Transparent areas become white before opaque black masks are applied. |
| Generation | Compositing PNG. You can cancel; a cancelled job will not be downloadable. |
| Cancelled | Cancelled. Your image and masks are still editable. |
| Preview ready | PNG preview ready: {width} × {height} pixels, {bytes} bytes. Inspect the complete image before downloading. |
| Download | Download PNG copy |
| APNG | This is an animated PNG. Choose a static PNG or JPEG. |
| Unsafe header | This JPEG or PNG header could not be read safely, so the image was not decoded. |
| File too large | The file is over 8 MiB. Choose a smaller image. |
| Dimensions too large | The image exceeds 8,192 pixels on an edge or 16,000,000 total pixels. It was not decoded. |
| EXIF error | The JPEG orientation data could not be read safely, so the image was not decoded. |
| Resource unavailable | This device could not open the image. The tool did not resize it, upload it, or create a partial result. Try a supported desktop browser or a smaller image. |
| Export failed | A valid PNG could not be created. Your image and masks are still editable; try again or clear the image. |
| Replace source confirmation | Replacing the image will remove its masks and preview. Continue? Cancel keeps the current image. |
| Clear masks confirmation | Clearing all masks will prevent PNG generation and remove the current preview. Continue? |
| Clear image | The image, masks, and preview were cleared. |
| Keyboard help | Use the x, y, width, and height fields to add or adjust a mask with the keyboard. |

## 雙語 SEO 文案

主代理指定 image-redact.glossquote.com 為網址候選。M1 preview 使用 noindex,nofollow，不輸出正式 canonical、hreflang sitemap 或部署設定；正式站 SEO 和 hosting 由主代理負責。

### 繁體中文

- Title：圖片敏感資訊遮蔽工具｜GlossQuote
- Description：在瀏覽器中以不透明黑色矩形遮住圖片區域，檢查扁平 PNG，再下載分享副本。由你手動選取；工具不會自動偵測敏感資訊。
- H1：遮住圖片中的敏感區域
- FAQ：
  1. 工具會自動找到 email 或訂單號嗎？不會。你必須手動畫出每個要遮住的區域。
  2. 下載後還能移動遮罩嗎？不能。匯出 PNG 只有合成後的像素，不含可編輯圖層；來源圖片仍留在你的裝置。
  3. 圖片會上傳嗎？產品設計在本機瀏覽器處理，不提供上傳功能；瀏覽器記憶體清理不等於安全抹除。
  4. 為什麼透明區域變白？輸出先將圖片與白底合成，再加入黑色遮罩，避免透明畫布被不同檢視器顯示成不同顏色。
  5. 工具能保證圖片已安全匿名化嗎？不能。它只畫出你指定的矩形，請檢查整張輸出及未遮罩區域。

### English

- Title: Image Redaction Tool | GlossQuote
- Description: Cover image areas with opaque black rectangles in your browser, inspect a flattened PNG, and download a copy. You choose each area; the tool does not detect sensitive information.
- H1: Cover sensitive areas in an image
- FAQ:
  1. Does the tool find emails or order numbers automatically? No. Draw every area you want to cover.
  2. Can I move a mask after downloading? No. The exported PNG contains composited pixels and no editable mask layer. Your source image remains on your device.
  3. Is my image uploaded? The product is designed to process it in the local browser and has no upload feature. Browser memory cleanup is not secure erasure.
  4. Why do transparent areas become white? The export composites the image over white before drawing black masks, so viewers do not choose different transparent backgrounds.
  5. Does this guarantee a safely anonymized image? No. It covers only the rectangles you choose. Inspect the whole export and its unmasked areas.

Confirmation controls are inline page content, not modal dialogs. Revealing a confirmation must not programmatically move focus, trap focus, or invoke window.confirm, HTML dialog, or an OS dialog. The triggering control keeps focus; confirmation buttons remain reachable in normal tab order. Clear image and pagehide cleanup run immediately without confirmation.

M1 preview head must use noindex,nofollow and local-only placeholder metadata. The candidate URL is image-redact.glossquote.com. Do not set production canonical, sitemap, or deployment configuration in M1; the primary owns hosting and production SEO. SEO copy must not imply search ranking, user volume, automatic detection, security certification, or all-browser support.


---

## 原文件 ACCEPTANCE.md

# 驗收案例

狀態：SPEC_ONLY。以下是待實作產品的精確驗收預期，沒有任何 PASS 結果。測試必須離線、使用合成假資料，不得讀取真實使用者圖片。

## 合成資料方法

Node 測試在記憶體中建立最小 PNG chunks、合法 CRC-32、可控 IHDR/chunk sequence 和 APNG acTL/fcTL/fdAT 標記；不得寫真實或使用者圖片到磁碟。JPEG parser 測試建立 marker/APP1 Exif/SOF/SOS byte arrays，欄位可控制為有效、錯誤或截斷。

真正 Canvas 像素案例使用測試頁在瀏覽器內以 Canvas 畫 4×3 合成 RGBA 矩陣：左上紅色、右上綠色、右下藍色、左下黃色，中間像素使用不同顏色；PNG transparency 案例設一個任意 RGB 的 alpha=0 像素，以及 [255,0,0,128] 半透明紅像素。JPEG 真實方向案例使用 96×64 圖片，四個大色塊分別代表四角；在 SOF 前插入合法的最小 Exif APP1 Orientation tag。方向驗證取輸出四個色塊中心、遠離壓縮邊界取樣，依預期來源象限比對 dominant 色並允許每通道 ±18 JPEG 誤差。小尺寸 JPEG 仍可用於 parser-only 案例。素材只在測試記憶體，不下載真實圖片。

Node test 的純函式結果不代表原生 decode、Canvas 像素或下載完成。Canvas、實際方向、Pixel RGBA 和 UI 的通過狀態只能由隔離瀏覽器的真實結果記錄。

## 純函式／Node 自動案例

| ID | 對照 | 輸入或步驟 | 預期 |
|---|---|---|---|
| H01 | FR-01/02 | 0-byte File | FILE_EMPTY；createImageBitmap 呼叫 0 次。 |
| H02 | FR-01/02 | 8,388,608-byte 上限 fixture，合法 PNG 結構 | 大小門檻通過並進入 header parser；不因等於上限拒絕。 |
| H03 | FR-01/02 | 8,388,609-byte 假檔 | FILE_TOO_LARGE；只讀 File.size，header reader/decode 均 0 次。 |
| H04 | FR-02 | 24×16 合法靜態 PNG，含 IHDR/IDAT/IEND 和正確 CRC | 回傳 png、寬 24、高 16、orientation 1、視覺寬高 24×16、pixelCount 384。 |
| H05 | FR-02 | PNG acTL 在 IDAT 前，含 fcTL/fdAT 的 APNG fixture | ANIMATED_PNG；預檢拒絕，decode 呼叫 0 次。 |
| H06 | FR-02 | PNG acTL 在 IDAT 後的非法順序 fixture | HEADER_INVALID 或 ANIMATED_PNG，依固定 parser code 契約；decode 呼叫 0 次。 |
| H07 | FR-02 | PNG chunk length 指向 EOF 之外 | HEADER_TRUNCATED；不得呼叫 decoder。 |
| H08 | FR-02 | PNG 任一 chunk CRC 差一 bit | HEADER_INVALID；不得呼叫 decoder。 |
| H09 | FR-02 | PNG IHDR width=0、missing IEND 或 IEND 後有 bytes | 各分支均 HEADER_INVALID；不得接受前綴內容。 |
| H10 | FR-02 | 8,192×1,953 PNG header（15,998,976 pixels） | 維度限制通過；只測 parser，不配置巨型 pixel buffer。 |
| H11 | FR-02 | 8,193×1 PNG header | DIMENSION_LIMIT；decoder 0 次。 |
| H12 | FR-02 | 4,000×4,000 PNG header（16,000,000 pixels） | pixel 限制等於上限時通過 parser。 |
| H13 | FR-02 | 4,001×4,000 PNG header（16,004,000 pixels） | PIXEL_LIMIT；decoder 0 次。 |
| H14 | FR-02 | 8,000×2,001 PNG header（每邊可過但 pixel 超限） | PIXEL_LIMIT；不得只驗 per-edge。 |
| J01 | FR-02 | 13×7、8-bit SOF0 JPEG，無 Exif | orientation 預設 1，visual size=13×7。 |
| J02 | FR-02 | 13×7、8-bit SOF2 JPEG，Exif Orientation 1 | visual size=13×7，orientation=1。 |
| J03 | FR-03 | 3×2 SOF0 JPEG header，Orientation 2 | parser visual 3×2；輸出視覺角落 TL、TR、BR、BL 各取自原圖 TR、TL、BL、BR。 |
| J04 | FR-03 | 3×2 SOF0 JPEG header，Orientation 3 | parser visual 3×2；輸出視覺角落各取自原圖 BR、BL、TL、TR。 |
| J05 | FR-03 | 3×2 SOF0 JPEG header，Orientation 4 | parser visual 3×2；輸出視覺角落各取自原圖 BL、BR、TR、TL。 |
| J06 | FR-03 | 3×2 SOF0 JPEG header，Orientation 5 | parser visual 2×3；輸出視覺角落各取自原圖 TL、BL、BR、TR。 |
| J07 | FR-03 | 3×2 SOF0 JPEG header，Orientation 6 | parser visual 2×3；輸出視覺角落各取自原圖 BL、TL、TR、BR。 |
| J08 | FR-03 | 3×2 SOF0 JPEG header，Orientation 7 | parser visual 2×3；輸出視覺角落各取自原圖 BR、TR、TL、BL。 |
| J09 | FR-03 | 3×2 SOF0 JPEG header，Orientation 8 | parser visual 2×3；輸出視覺角落各取自原圖 TR、BR、BL、TL。 |
| J10 | FR-02 | orientation 值 0、9、或錯誤 endian/magic/offset 的 APP1 | EXIF_INVALID；decoder 0 次。 |
| J11 | FR-02 | 兩個 Exif APP1 或兩個 orientation tags | EXIF_INVALID；不得猜哪個值有效。 |
| J12 | FR-02 | JPEG 不足 SOI、segment length <2、截斷 APP1、缺 SOF 或 SOF 後沒有 SOS | HEADER_INVALID／HEADER_TRUNCATED 固定錯碼；decoder 0 次。 |
| J13 | FR-02 | SOF 精度 12-bit、非 SOF0/SOF2 frame、component count 4 | JPEG_MODE_UNSUPPORTED；decoder 0 次。 |
| G01 | FR-03 | visual 400×200 顯示在 clientRect 200×100；CSS drag (20,10)→(30,20) | 原圖 mask {x:40,y:20,width:20,height:20}。 |
| G02 | FR-03 | G01 的 drag 方向反轉 | 結果仍 {x:40,y:20,width:20,height:20}。 |
| G03 | FR-03 | raw visual drag (1.2,2.7)→(4.1,5.01) | floor 起點、ceil 終點，mask {x:1,y:2,width:4,height:4}。 |
| G04 | FR-03 | 拖曳越出圖片左上界，raw endpoints (-2.2,-1.1)→(3.2,4.1) | clamp/floor/ceil 後 {x:0,y:0,width:4,height:5}。 |
| G05 | FR-03 | pointer down/up 同一座標 | MASK_ZERO_AREA；不建立 mask。 |
| G06 | FR-04 | keyboard x=2,y=1,width=2,height=1，圖片 4×3 | 接受；區域含 x=2,3 且不含 x=4。 |
| G07 | FR-04 | width=1.5、x=-1、x+width>W 或 width=0 | 各分支 MASK_INVALID、MASK_OUT_OF_BOUNDS 或 MASK_ZERO_AREA；原列表不變。 |
| G08 | FR-04 | 加第 50 個合法矩形，再加第 51 個 | 第 50 個接受並顯示 50/50；第 51 個 MASK_LIMIT，列表仍 50 筆。 |
| S01 | FR-06 | generation A 等待 toBlob，改 mask 後 generation B 開始，A 晚回 | A 不建 URL、不替換 B、不清 B Canvas；只接受 B。 |
| S02 | FR-06 | 生成中按 cancel，之後 encoder callback 晚回 | UI 同步回 ready；無 URL、無下載；晚回 Blob 丟棄。 |
| S03 | FR-06 | decode 中換來源，舊 createImageBitmap resolve 晚到 | 舊 Bitmap 立即 close，不可取代新來源。 |
| S04 | FR-06 | pagehide 並令 pageshow.persisted=true | input、mask、output、URL 全空；Bitmap close；Canvas=1×1；頁面回 idle。 |
| S05 | FR-04/05 | 0 masks 呼叫 normalize/generate；50 個 masks 呼叫 generate | 前者 MASK_REQUIRED、後者可進 generation。 |
| N01 | FR-01/08 | hostile name "><img src=x onerror=1>.png、含 CR/LF 與 bidi controls | 名稱只以純文字／可見 U+XXXX 顯示；沒有新增 DOM child、網路請求、console 內容或更改固定下載檔名。 |
| P01 | FR-08 | 對靜態 public source 做禁止 API 檢查 | 沒有外網、storage、telemetry、remote font、innerHTML、eval 或使用者內容 logging；靜態掃描結果不得稱為完整安全審計。 |

## 隔離瀏覽器真實 Canvas／UI 案例

以下都必須使用上述合成圖片。Node stub/mock 不得轉記為瀏覽器 PASS。當前電腦有使用者焦點保護限制；在主代理驗證出真正隔離、完全不取用桌面焦點、鍵盤、IME、剪貼簿或原生對話框的機制前，互動案例保持 NOT_RUN_USER_FOCUS_INCIDENT，不得操作本機隱藏 tab 來試探隔離。

| ID | 對照 | 真實瀏覽器步驟 | 精確通過條件 |
|---|---|---|---|
| B01 | FR-03/05 | 真實桌面 Chrome/Edge 各選合成 4×3 PNG，遮住 x=1,y=1,w=2,h=1，解碼輸出 Blob 再讀 getImageData | PNG MIME image/png、4×3；輸出遮罩像素座標 (1,1),(2,1) 都是 [0,0,0,255]；外側像素與白底合成 oracle 相符。 |
| B02 | FR-05 | 4×3 PNG 設一任意 RGB 的 alpha=0 source pixel，以及 [255,0,0,128] 半透明紅 pixel，不畫到這些點 | 完全透明點輸出精確 [255,255,255,255]；半透明紅輸出 [255,127,127,255]，RGB 每通道允許 ±1 色彩／rounding 誤差；任何遮罩像素仍須精確 [0,0,0,255]。 |
| B03 | FR-03 | 使用 96×64 四個大色塊 JPEG 的 EXIF orientation 1–8，各建立視覺左上 1×1 mask | 每種 orientation 輸出 visual 尺寸與四個色塊中心來源 mapping 都符合 FR-03 table；JPEG dominant 色每通道 ±18；mask pixel 精確 [0,0,0,255]。 |
| B04 | FR-03 | visual 400×200 但 CSS 寬 200px，在畫布 clientRect 的 (20,10) 到 (30,20) 拖曳 | 清單顯示 x=40,y=20,width=20,height=20；輸出 PNG 同位置為純黑。 |
| B05 | FR-03/04 | 由右下往左上拖相同矩形，另作零 span click | reverse rectangle 與 B04 相同；click 不新增矩形並顯示零面積訊息。 |
| B06 | FR-04 | 以數字欄位 keyboard 新增 {2,1,2,1}，再更新 x=3 使超界 | 有效時 Canvas 和列表一致；超界時欄位錯誤、原遮罩保留、舊輸出失效。 |
| B07 | FR-04 | 50 mask 後嘗試第 51 個、undo last、delete 選取列、clear all/取消 | 第 51 個不建立；undo 只移除最後新增 mask；delete 只刪選取 mask；clear all 取消後保留全部。確認介面為頁內非模態，觸發後不程式化移動或陷住焦點。 |
| B08 | FR-02/03 | 選 96×64 四色塊 JPEG 的 Orientation 1–8，decode 後比較色塊中心 | 八種都可視覺正確解碼；parser visual 尺寸相符、輸出四角中心 dominant 色符合方向 mapping 且每通道 ±18；尺寸 mismatch 或不支援 orientation 時拒絕且沒有遮罩畫面。 |
| B09 | FR-05 | 產生一次 PNG preview，變更遮罩後檢查 preview/download | 舊 Blob URL 立即撤銷、預覽移除、下載 disabled；新結果只能在重新生成後建立。 |
| B10 | FR-06 | 將 toBlob callback 延遲，按取消後再放行 callback | 取消 UI 同步完成；晚 callback 無 URL、無輸出、無 download success。 |
| B11 | FR-06 | A toBlob 延遲、修改遮罩啟動 B、先放行 A 再放行 B | A 不覆蓋或清除 B；只有 B 的 bytes、dimensions、preview 和 URL 被接受。 |
| B12 | FR-01/02 | 用有效 synthetic PNG／JPEG header 但 decoder-invalid bytes | 先通過可讀 header，再由 decoder 回固定 DECODE_FAILED；不產生 preview 或 URL，能重新選檔。 |
| B13 | FR-01/02 | APNG acTL + fcTL + fdAT fixture | APNG 在 createImageBitmap 之前拒絕，沒有 static-frame 假成功。 |
| B14 | FR-05 | 成功輸出後下載，讀回該 Blob/file bytes | 只有 PNG file signature 和合成像素，沒有原始 JPEG/PNG bytes、可還原 mask metadata 或 source filename；檔名固定 glossquote-image-redacted.png。 |
| B15 | FR-08 | 兩種語言檢查初始、decode、ready、錯誤、生成、取消、輸出、clear | 文案全繁中／英文相符；無原始 exception、source name 或 image content 進 status/log。 |
| B16 | FR-09 | 僅用 Tab、Shift+Tab、Enter 操作選檔控制後的表單／數字 mask／產生／取消／下載 | 每條核心功能有鍵盤等價操作、focus 可見、錯誤關聯欄位。原生 file chooser 和 OS save dialog 不在本項強制觸發。 |
| B17 | FR-09 | 320 CSS px 與 200% resize/zoom 分別檢查兩語 | 操作不被遮住，頁面無非必要水平溢出，數字欄位與主動作可見；Canvas 可於具名 region 內捲動。 |
| B18 | FR-09 | 手機觸控預覽小型 fixture，另測瀏覽器 decoder 拒絕／記憶體失敗 | 可用時完整預覽；失敗時來源安全退出並明示原因，無縮圖、上傳或部分下載。 |
| B19 | FR-06/08 | pagehide、BFCache restore、clear source | input/mask/output/preview 清空、URL revoke、Bitmap close、Canvas 1×1，回到空白狀態；清除立即完成且無確認；不宣稱 physical GC。 |
| B20 | FR-01/04 | 有遮罩時選取新來源並取消／確認；另觸發清除所有遮罩 | 替換來源與清除遮罩只出現頁內非模態確認；取消保留舊來源及遮罩，確認才套用；沒有 window.confirm、原生 dialog、焦點陷阱或程式化焦點移動。清除圖片與 pagehide 則無提示立即清理。 |

## 必要 CLI 閘門

只有在 T00 已建立 package.json、腳本、測試目錄後才能執行：

    node --version
    npm test
    npm run check
    npm run build

Node 必須為 24 或更新版本。三個 npm 命令都須 exit 0；測試數為實際 node:test 輸出，不能預先填寫或以空測試通過。build 的 dist 應逐檔符合 public allowlist，且標示 noindex。這些 CLI gate 不包含 B01–B19，不能聲稱真瀏覽器 UI、Canvas、PNG 像素、EXIF decoder、下載、觸控、200% zoom、Network/Storage 或 OS 操作通過。

## NOT_RUN 範圍

在本 task 的電腦焦點保護限制下，B01–B20 互動瀏覽器執行為 NOT_RUN_USER_FOCUS_INCIDENT。正式 Network/Storage/Offline 面板、輔助技術、真機、native memory/GC、原生檔案選擇和 OS 下載流程亦不得由 mock 或 Node 替代。後續若有已核實的隔離機制，由主代理安排所需瀏覽器驗收並記錄精確瀏覽器版本、輸入 hash 和逐項結果。


---

## 原文件 TASKS.md

# 任務閘門：39 圖片敏感資訊遮蔽

狀態：SPEC_ONLY。這是 M1 本機候選的順序實作規格，尚未執行。M1 不包含 M2 公開來源發布、hosting、首頁整合或正式 SEO。

## 共通規則與責任

- T00–T05 是同一個原功能 chat 內連續的 M1 子任務。T00 開始後，owner 在前一項必要 CLI gate 通過時可接續下一項，不必逐項等待主代理重新放行。主代理在 M1 結尾做一次整合 review 和 gate。
- 每一項只修改該項明列的實作路徑。owner 不得修改六份規格 README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md，也不得修改 AGENTS.md、docs/**、兄弟工具、共享首頁或看板。發現規格矛盾就停止相依步驟並回報主代理；不能自行修規格後續做。
- 任務狀態和證據只可記於 HANDOFF.md、TASK-ENTRY.md、evidence/m1/**；不得用這些紀錄取代原有驗收案例或把未執行項填成 PASS。
- 使用 Node.js 24+、瀏覽器 ESM 與內建模組；不 npm install、不新增 runtime/dev dependency、不讀使用者圖片或憑證。離線測試只用本規格合成假資料。
- T00 必須先建立 package.json、scripts 和 test scaffold。只有腳本實際建立後才可執行 npm test、npm run check 或 npm run build。
- 必要互動瀏覽器案例維持 NOT_RUN_USER_FOCUS_INCIDENT。不得使用 CUA、IAB、hidden tab、桌面或 native UI 做焦點隔離實驗，也不得以 Node/mock 結果代替真 Canvas 或 UI 驗收。
- 所有 M1 預覽 noindex,nofollow。網址候選為 image-redact.glossquote.com；M1 不設定 canonical、production sitemap 或部署。不得啟動 dev server；僅建立本機工具及執行 CLI gate。

## T00：建立 M1 專案與 CLI scaffold

前置：原功能 chat 已建立並獲准開始 M1；Node 24+ 已存在。不得安裝或配置 Node。

Allowed paths：

- package.json、.gitignore
- scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs
- public/index.html、public/en/index.html、public/404.html、public/_headers
- public/styles/app.css、public/js/app.mjs、public/js/controller.mjs
- public/js/locales/zh-Hant.mjs、public/js/locales/en.mjs
- public/js/core/format-headers.mjs、public/js/core/geometry.mjs、public/js/core/session.mjs
- test/fixtures.mjs、test/scaffold.test.mjs、test/security-contract.test.mjs
- HANDOFF.md、TASK-ENTRY.md、evidence/m1/**
- dist/ 僅限 build script 生成

步驟：建立 private ESM 專案、只綁 127.0.0.1 且預設 port 4219 的 preview server、allowlisted static build、真正檢查語法／來源／安全禁止項的 check，以及最小離線測試。雙語 HTML 初始 noindex、控制項 disabled，且只引用同源資產。不得啟動 preview server 或瀏覽器。

驗收命令：node --version（需 ≥24），接著 npm test、npm run check、npm run build。build 的 dist 只含允許的靜態資產且 noindex。

完成條件：命令實際存在且各自 exit 0；沒有外部依賴、網路或 storage 入口；scaffold test 可拒絕未知公開資產和 unsafe paths。T00 gate 通過後，同一 owner 可開始 T01。

## T01：檔頭 parser 和 predecode gate

前置：T00 的三項 CLI gate 都通過。

Allowed paths：

- public/js/core/format-headers.mjs
- test/fixtures.mjs、test/format-headers.test.mjs
- test/scaffold.test.mjs、test/security-contract.test.mjs（僅 parser allowlist 確有必要時）
- HANDOFF.md、TASK-ENTRY.md、evidence/m1/**

步驟：嚴格解析 PNG chunk/CRC 並拒絕 APNG；解析 JPEG SOF0/SOF2、APP1 Exif Orientation 1–8。用合成 fixtures 驗證長度、順序、overflow、錯誤方向資料和 predecode 0 decoder-call。不得使用第三方 decoder/encoder。

驗收命令：npm test、npm run check；若 public build allowlist 改變則另跑 npm run build。

完成條件：ACCEPTANCE H01–H14、J01–J13 的 parser 預期都有離線案例；任何不能在 decode 前安全判定的檔案均拒絕。T01 gate 通過後接續 T02。

## T02：pixel geometry 和 editor state

前置：T01 的必要 CLI gate 都通過。

Allowed paths：

- public/js/core/geometry.mjs、public/js/core/session.mjs
- test/geometry.test.mjs、test/session.test.mjs
- test/scaffold.test.mjs（僅新核心資產需要時）
- HANDOFF.md、TASK-ENTRY.md、evidence/m1/**

步驟：實作 strict mask schema、0–50 數量、pointer CSS-to-original mapping、floor/ceil/clamp/reverse/zero-area、來源與遮罩 revision、取消和 stale action 防護。Pure reducer 不持有 File、Bitmap、Canvas、Blob 或 Object URL。

驗收命令：npm test、npm run check；若 public build allowlist 改變則另跑 npm run build。

完成條件：ACCEPTANCE G01–G08、S01–S05 的純函式契約有離線測試；每次來源或遮罩變更都使輸出失效；錯誤不回顯使用者值。通過後接續 T03。

## T03：雙語工作區與畫布互動

前置：T02 的必要 CLI gate 都通過。

Allowed paths：

- public/index.html、public/en/index.html、public/styles/app.css
- public/js/app.mjs、public/js/controller.mjs
- public/js/locales/zh-Hant.mjs、public/js/locales/en.mjs
- test/scaffold.test.mjs、test/security-contract.test.mjs
- test/ui-contract.test.mjs（僅需新增 Node 可驗 UI contract 時）
- HANDOFF.md、TASK-ENTRY.md、evidence/m1/**

步驟：建立以工作畫布為主的選檔、預覽、黑色矩形和輸出 UI。解碼前接 T01 parser；decode 使用 from-image 並比對視覺尺寸。遮罩側欄可選取、刪除、鍵盤編輯數字欄位、復原最後新增和清除全部。來源替換和清除遮罩確認必須是頁內非模態，不能搶焦點；清除圖片立即執行。檔名只當文字。透明來源輸出白底合成。不可加入自動偵測入口。

驗收命令：npm test、npm run check；若 public build allowlist 改變則另跑 npm run build。只記錄 Node 可證明的行為；瀏覽器案例仍 NOT_RUN_USER_FOCUS_INCIDENT。

完成條件：兩語結構、labels、錯誤、確認文案與初始 disabled 狀態符合 UX-SEO；鍵盤新增遮罩和 pointer 使用同一 core 行為；無外部資源。通過後接續 T04。

## T04：扁平 PNG、取消和資源生命週期

前置：T03 的必要 CLI gate 都通過。

Allowed paths：

- public/js/controller.mjs、public/js/app.mjs
- public/js/core/session.mjs
- public/styles/app.css、public/index.html、public/en/index.html
- test/session.test.mjs、test/ui-contract.test.mjs
- test/scaffold.test.mjs、test/security-contract.test.mjs（僅來源安全契約確有改變時）
- HANDOFF.md、TASK-ENTRY.md、evidence/m1/**

步驟：輸出先白底合成，再畫 alpha255 純黑遮罩。Canvas 產生 PNG，preview 與 download 共用同一 Blob。加入 MIME／尺寸驗證、stale job、cancel、late bitmap close、late blob discard、source/mask edit revoke、clear source 和 pagehide cleanup。Object URL 只由 controller 擁有；清除與 pagehide 不詢問確認。

驗收命令：npm test、npm run check；若 public build allowlist 改變則另跑 npm run build。Node 假 encoder 僅驗 stale/cleanup，不得稱為 Canvas pixel 驗收。

完成條件：ACCEPTANCE S01–S05 純函式層通過；B01–B20 真瀏覽器案例保持 NOT_RUN_USER_FOCUS_INCIDENT；沒有原圖下載控制項。通過後接續 T05。

## T05：M1 收尾、CLI gate 與交接

前置：T01–T04 的必要 CLI gate 都通過；此項是 M1 最後一步。

Allowed paths：

- public/index.html、public/en/index.html、public/styles/app.css
- public/js/locales/zh-Hant.mjs、public/js/locales/en.mjs
- scripts/check.mjs、scripts/build.mjs
- test/scaffold.test.mjs、test/security-contract.test.mjs
- HANDOFF.md、TASK-ENTRY.md、evidence/m1/**
- dist/ 僅由 build script 生成

步驟：完成兩語 UI 與 FAQ、noindex preview、同源首頁文案、responsive 與鍵盤文案。執行最後三項 CLI gate；檢查最終 diff 只在 M1 允許路徑；在允許的交接位置記錄來源 hash、命令結果、逐項 browser NOT_RUN 及限制，交主代理做 M1 整合 review。不得為修正文檔而直接修改六份規格。

驗收命令：node --version、npm test、npm run check、npm run build。不得啟動 server、browser 或 native UI，不得進行 publication 或 deployment。

完成條件：M1 本機候選已可供主代理 review；Node 三項 gate 實際通過且 diff 僅在允許範圍；B01–B20、正式 browser/network/storage、輔助技術與真機驗收如實維持 NOT_RUN_USER_FOCUS_INCIDENT。M1 不等於 release 或產品完成。

## M2 與 hosting 責任邊界

M2 不屬於此執行計畫，未獲主代理另行放行前不得開始。未來獲准後，原功能 owner 的 M2 範圍僅為此工具獨立 public GitHub source repository，並遵守工具資料夾 AGENTS.md 及 Git publication safety 契約。Cloudflare hosting、DNS、production canonical／sitemap、共享首頁 catalog、部署和 live verification 全由主代理負責；不得由 feature owner 代做。

