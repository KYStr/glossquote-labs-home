# 圖片縮放與匯出 — 既有規格保存

Task ID: `labs-09-image-resizer` · Spec ID: `spec-09-image-resizer`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

## 容量上限增量契約 — 2026-10-13

沿原全部格式／尺寸／GQ-01／EXIF／alpha／資源限制，增加 opt-in 容量上限。預設關閉、raw空白、unit=kB；kB1000/KiB1024/bytes1明示，不猜KB。raw≤16，去ASCII首尾空白後1–8位數字，乘積exact1..10485760bytes；unit缺失/未知、符號、小數、exponent、全形或超限拒絕且零encode。

JPEG/WebP起始品質Q加固定較小列表，最多12次串行、30秒deadline；第一個actual Blob.size≤target才success/下载，不改尺寸或選定格式、不承諾最高可能/最佳畫質。PNG一次；WebP→PNG合法fallback立即停止品質搜尋，actual bytes符合才下載.png。

所有設定改變即撤銷舊結果；關閉忽略但保留raw草稿，select/clear/語言導航回off/blank/kB。成功展示actual MIME/dims/bytes/quality/attempts和exact上限；TARGET_NOT_MET展示測得最小bytes/quality/次數與調整建議，無下載。ENCODE_TIMEOUT獨立解釋期限，不由minBytes猜超標或候選耗盡；可附測得值。cancel保留source/settings回ready，clear移除全部本頁引用回idle。

---

# 圖片縮放產品規格

這是規格，尚未實作。所有限制是第一版產品選擇，不是所有瀏覽器的能力上限。

| 編號 | 可觀察行為與規則 |
|---|---|
| FR-01 | 選取或拖入恰好一個檔案。檔案必須非空、最多 10 MiB（10,485,760 bytes），且檔頭辨識為靜態 PNG 或 JPEG。MIME／副檔名只能輔助，格式以檔頭及成功解碼為準。多檔全部拒絕，不默默挑第一個。 |
| FR-02 | 在解碼前讀取容器尺寸；輸入每邊 1–8,192、總像素不超過 12,000,000。PNG 有 acTL 即拒絕動畫；JPEG 只接受 8-bit baseline/progressive SOF0/SOF2，其他 SOF 拒絕。無尺寸、截斷、超限均不解碼。 |
| FR-03 | 解碼按 EXIF 方向顯示，含鏡像。畫面顯示方向套用後的寬高；縮放也使用該寬高，不再手動旋轉第二次。瀏覽器若未通過方向測試即列為不支援。 |
| FR-04 | 等比例永遠鎖定。預設「最長邊」= min(原圖最長邊, 1920)；可改成「寬」或「高」為基準。只允許整數 1–4,000，且不得放大，輸出總像素不得超過 8,000,000。次要維度取 Math.round，至少 1。 |
| FR-05 | 預設輸出 PNG，品質欄隱藏且不生效。JPEG／WebP 品質預設 85，範圍整數 1–100，以值除 100 傳入編碼器；不顯示預估 KB 或未量測節省比例。 |
| FR-06 | PNG／WebP 保留透明度；JPEG 固定以白色 #FFFFFF 合成底色，切到 JPEG 立即顯示此說明。不提供其他底色選擇。預覽透明區使用棋盤格，棋盤格不寫入輸出。 |
| FR-07 | 改設定只更新尺寸／畫面預覽並使舊下載失效；按「產生圖片」才編碼。完成後顯示實際格式、bytes、寬高與「下載圖片」。來源和結果分別標示，不能把來源預覽當成編碼結果。 |
| FR-08 | 啟動時以 1×1 Canvas 探測 WebP 編碼，檢查 Blob.type。若無支援則禁用 WebP 並說明。產生時若回傳 PNG，顯示「已改用 PNG」，下載必須為 .png；空 Blob／null 為失敗，不供下載。 |
| FR-09 | 所有檔案與產物只留當次頁面記憶體，不寫瀏覽器儲存、不記錄內容／檔名、不建立伺服器上傳。瀏覽器自身快取與記憶體回收由瀏覽器控制，不能宣稱安全抹除。 |
| FR-10 | 選新檔／清除時失效 jobId，清空來源／結果參照，close bitmap、縮小 Canvas、撤銷 blob URL。取消編碼只失效該次 jobId、清空結果與匯出 Canvas，保留來源 bitmap 與設定，回到可編輯狀態；取消檢查／解碼則回 idle，晚到 bitmap 必須 close。原生編碼不可保證立即終止，但晚到 Blob 必須丟棄。 |
| FR-11 | 固定輸出名 image-{width}x{height}.png／.jpg／.webp。只在按下載後觸發檔案儲存；輸入檔名只以 textContent 顯示，不放 HTML、URL、下載路徑或日誌。 |
| FR-12 | 錯誤使用固定代碼：EMPTY_FILE、MULTIPLE_FILES、FILE_TOO_LARGE、FORMAT_UNSUPPORTED、IMAGE_TOO_LARGE、IMAGE_CORRUPT、SIZE_INVALID、QUALITY_INVALID、ENCODE_FAILED、BROWSER_UNSUPPORTED。可重新選檔或修正欄位，不輸出底層例外。 |

生命周期：選檔 → 大小／檔頭檢查 → 解碼 → 調整 → 產生 → 手動下載 → 清除／關頁。新檔案取代舊資料以前先撤銷舊工作；不讓兩個 12MP bitmap 並存。

未來候選：裁切、批次、WebP 輸入、更多格式、指定容量。這些不能混入 MVP；加入前另開規格，尤其 SVG 的外部引用與 HEIC 的解碼依賴。


---

## 原文件 TECHNICAL.md

## 容量模式整合 — 2026-10-13

新core target-size.mjs：normalizeTargetSize(raw,unit)→Result(bytes)、normalizeTargetBytes(raw)、qualityCandidates(numberQ)；严格schema與exactbytes。session新增targetEnabled/targetRaw/targetUnit，snapshot.target Result、numeric/null metrics；target output新增quality/targetBytes。clock/setTimer/clearTimer可注入；job唯一timer30秒与ownerId，interrupt即取消/逾時回傳、過期Native回覆不可發布或清B。最終reason保留，Blob-ready/timeout-before-continuation亦ENCODE_TIMEOUT。

app使用snapshot.target禁用invalid submit，反映數字/單位/起始品質/actual結果。TARGET_NOT_MET与ENCODE_TIMEOUT分支獨立；fallback timeout仅中性PNG資訊。產品不暴露測試clock或callback hook；test入口以標明的受控clock/native callback驗證。原dimensions/header/output程式未變；preview≤1000長邊与全部资源上限保留。

---

# 圖片縮放技術規格

這是規格，尚未實作。原生 HTML/CSS/瀏覽器 ESM；Node.js 24+ 只用開發、node:test、建置。無 runtime 依賴。

## 預計檔案

```text
package.json
scripts/serve.mjs       # 僅 127.0.0.1:4173，靜態 public/
scripts/check.mjs       # 必要檔、語法、外部資源與危險 DOM 審查
scripts/build.mjs       # 審核 public/ 後複製到 dist/
scripts/serve-fixtures.mjs # 127.0.0.1:4174，只服務 test/ 合成器
public/index.html
public/styles/tokens.css
public/styles/app.css
public/js/app.mjs
public/js/core/image-header.mjs
public/js/core/dimensions.mjs
public/js/core/output.mjs
public/js/image-session.mjs
test/image-header.test.mjs
test/dimensions.test.mjs
test/output.test.mjs
test/session.test.mjs
test/fixtures/image-builders.mjs
test/browser-fixtures.html
test/browser-fixtures.mjs
docs/COMPATIBILITY.md
docs/TEST-RESULTS.md
```

T01 建立 `scripts/serve-fixtures.mjs`，執行 `node scripts/serve-fixtures.mjs` 只綁 127.0.0.1:4174，只服務本專案 test/，拒絕路徑穿越、目錄清單及父目錄；開啟其 `/browser-fixtures.html` 產生並手動下載假 PNG/JPEG，再到產品選檔驗收。正式 dev 只提供 public，build 不含測試入口；測完停止 fixture server。不使用 file:// 或不明來源的 DevTools import。

## 純函式契約

回傳 `{ok:true,value}` 或 `{ok:false,code}`，不把外部字串拼进例外。

| 函式 | 定義 |
|---|---|
| inspectImageHeader(bytes: Uint8Array) | 回傳 format、encodedWidth、encodedHeight；最多處理檔案上限，先查長度再讀每個 offset。PNG 檢查 8-byte signature、第一 IHDR 長 13、逐 chunk 邊界、acTL 與 IEND；JPEG 檢查 SOI、逐 segment length，僅 SOF0/SOF2 的 precision=8，遇 SOS 前須找到尺寸。不以檔名推斷。 |
| validateSource({size,width,height}) | 拒絕非有限整數與 PRODUCT 上限；像素相乘使用 Number 且範圍先守住。 |
| deriveDimensions({width,height,mode,value}) | mode 僅 long-edge、width、height，值為十進位整數字串（不接受科學記號、小數、空字串）；主要邊依選擇取得比例，另一邊 round，拒絕放大與輸出上限。 |
| normalizeQuality(text) | 嚴格整數 1–100，成功回傳 0.01–1；失敗固定 QUALITY_INVALID。 |
| resolveOutput(requestedMime,actualMime,width,height) | actualMime 只允許 image/png、image/jpeg、image/webp；副檔名必須跟實際 MIME 一致。要求 WebP 卻 PNG 時回傳 notice=FORMAT_FALLBACK。其他意外組合拒絕。 |
| nextJob(currentId) | 單調遞增整數；控制器只接受 callback.id===activeId。測試不用真的 Canvas。 |

## 解碼與匯出

1. 大小通過後 arrayBuffer，再跑 header gate；失敗不呼叫 createImageBitmap。容器解析不是完整安全驗證，實際 decoder 仍可能拒絕。
2. `createImageBitmap(file, {imageOrientation:'from-image'})`。使用回傳 bitmap.width/height，再做總像素 gate。不要同時套用 EXIF 旋轉。close 舊 bitmap 後才能讀新圖。
3. 預覽 canvas 限制長邊 1,000 CSS 對應像素；不依 devicePixelRatio 無限擴大。實際匯出 canvas 使用輸出尺寸，imageSmoothingEnabled=true、imageSmoothingQuality='high'。
4. PNG/WebP 先 clearRect；JPEG 先 fillRect 白色，再 drawImage。toBlob 以 Promise 包裝並處理 null。品質只傳 JPEG/WebP，PNG 不傳品質。
5. 檢查 jobId 和 Blob.type，先釋放過期結果；再產生結果 URL，使用 img 顯示實際輸出。不要用 data URL 儲存大圖。
6. 原生 toBlob 沒有 AbortSignal。取消編碼增加 id、清空結果與匯出 Canvas，保留來源 bitmap 與設定，回傳 Blob 到達時不建立 URL。取消檢查／解碼回 idle，晚到 bitmap 先 close。清除／選新檔時所有畫布寬高設 1、來源 bitmap.close、URL.revokeObjectURL、input.value=''。下載用仍有效的結果 URL，不在 click 同步立刻 revoke。

狀態：idle → checking → decoding → ready → encoding → success；每一等待階段可到 error／cancelled；設定改動 success → ready，清除任意狀態 → idle。encoding 時選檔／設定禁用，取消與清除保持可用；不可用無意義百分比假裝有編碼進度。

色彩轉換採瀏覽器預設，不保證跨瀏覽器逐像素相同。不複製 EXIF／GPS／ICC 原始片段到輸出，也不承諾所有輸出 metadata 完全清空。尺寸／alpha／方向必須測；JPEG 檔案大小不做固定快照。

## 工具契約與驗證

T00 建立 `npm run dev`、`npm test`、`npm run check`、`npm run build`。check 使用 Node 語法檢查所有 mjs、檔案清單、禁止外部資源與 innerHTML/eval 的檢查；仍需人工與 Network 面板驗證。build 不包含 test、docs 或輸入圖片。正式支援矩陣只列真正測過的瀏覽器完整版本與日期；沒有 createImageBitmap／toBlob 時顯示不支援，不新增套件補洞。

## 官方參考（2026-09-23 查閱；實作時再確認）

- [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)：from-image 依 EXIF 方向解碼；本案以合成方向圖驗證實際瀏覽器。
- [MDN Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)：格式不支援可能輸出 PNG，callback 可能為 null。因此必須檢查真實 MIME。
- [PNG 規格](https://www.w3.org/TR/png-3/) 用於 IHDR／chunk 邊界與動畫標記；JPEG segment parsing 實作時另在 COMPATIBILITY 記錄查閱的官方格式資料，不直接相信 fixture 註解。


---

## 原文件 UX-SEO.md

## 容量使用者工作與雙語界面 — 2026-10-13

Product App沿原canvas/inspector結構、family tokens/system fonts。目標為交出指定尺寸与容量的圖片；設定側放可見checkbox，展開數字＋kB/KiB/bytes（defaultkB），同位置顯示exactbytes與errors。關閉保留普通流程；busy时設定/選檔禁用，cancel/clear可見且有鍵盤路徑。

Actual result顯示實際MIME/dims/bytes和達標標記、quality/attempts；失敗保持source預覽与可讀調整建議，沒有download。timeout獨立、不把min≤target稱超標；fallback實際PNG資訊與deadline分開。雙語how/limits/FAQ/meta已反映有限搜尋，無最佳畫質/任意容量/已上線保證。matching-language home、canonical/hreflang/x-default/sitemap/robots/404依原release工具鏈。preview維持noindex；source publication与live release分開。

---

# 圖片縮放介面與 SEO

這是規格，尚未實作。採 Product App 模式；圖片預覽是主要工作區。

```text
桌面
GlossQuote-Labs / 圖片縮放                         清除
選擇圖片    PNG/JPEG，單張最多 10 MiB
┌─────────────────────────────┬──────────────────┐
│ 來源／結果圖片預覽            │ 最長邊 [1920] px │
│ 透明區棋盤格                  │ 格式 [PNG v]     │
│ 原始 2400×1600 → 1920×1280   │ 品質 [JPEG/WebP] │
│                             │ [產生圖片]       │
└─────────────────────────────┴──────────────────┘
實際格式／尺寸／容量                            下載圖片
如何操作・支援範圍・資料處理・常見問題

手機
GlossQuote-Labs / 圖片縮放
選擇圖片 + 限制
來源／結果預覽（全寬）
尺寸設定
格式與必要品質設定
產生圖片／取消
結果資訊與下載
說明與 FAQ
```

不顯示虛構範例照片。初始「選擇一張圖片，調整尺寸後儲存。」；checking「正在檢查圖片。」；decoding「正在讀取圖片。」；encoding「正在產生圖片，可以取消。」；success「圖片已產生：{w} × {h}，{actualFormat}，{formattedBytes}。」；empty 不沿用舊結果；失敗「這張圖片無法讀取，請改選靜態 PNG 或 JPEG。」；超限「圖片超過本工具的尺寸限制，請先使用其他本機工具縮小。」；不支援「此瀏覽器無法完成圖片處理，請使用已驗證的瀏覽器版本。」；取消「已取消，尚未儲存圖片。」；WebP fallback「此瀏覽器改用 PNG，下載格式也已改為 PNG。」

所有欄位有 label、單位、欄位錯誤與 aria-describedby。來源／結果 tabs 可用鍵盤；預覽之外要有尺寸文字，不能只靠 Canvas 內容。主要按鈕 44px、狀態含文字、`aria-live=polite` 不播每次尺寸微調。320px 重排、200% 頁面縮放、縮減動態均保留功能。image alt 為「來源圖片預覽」或「處理結果預覽」，不擷取圖片內容當描述。白底合成提示放 JPEG 設定旁。

title：`圖片縮放與 PNG、JPEG 匯出｜GlossQuote-Labs`

description：`在瀏覽器內縮小單張 PNG 或 JPEG，預覽尺寸並儲存結果。支援透明背景與 JPEG 品質設定，檔案內容不由工具上傳。`

H1：`圖片縮放與匯出`

建議 slug：`/tools/image-resizer/`。靜態 HTML 放操作說明、支援格式與限制，JS 失效仍能閱讀；本地預覽 `noindex,nofollow`。未來確定正式網址並授權發布後才加 canonical／sitemap，不猜網域，不使用 FAQ 結構化資料保證搜尋展示。

FAQ：

1. **為什麼圖片不一定更小？** PNG 是無損格式；重新編碼和原圖內容會影響容量，產生後顯示實際檔案大小。
2. **透明背景轉 JPEG 會怎樣？** JPEG 不保留透明度，本工具以白色作為背景，產生前會清楚提示。
3. **會上傳圖片嗎？** 工具在瀏覽器處理所選檔案，沒有圖片上傳流程；網站程式本身仍需載入。這不等於保證裝置或瀏覽器沒有其他網路活動。
4. **支援手機照片與動圖嗎？** 第一版只接受符合限制的靜態 PNG/JPEG，不支援 HEIC 或動畫 PNG。
5. **EXIF 與印刷 DPI 會保留嗎？** 不保留原始 metadata，也不提供印刷色彩或 DPI 保真承諾。


---

## 原文件 ACCEPTANCE.md

## U09 容量 UI 增量驗收 — 2026-10-13

Node含原36與兩項UI契約；npm.cmd test/check、preview build、release build -- --release --site=https://images.glossquote.com、verify:release。原dimensions443040oracle輸入未變可重用。

兩語 /product-tests.html「Run target product UI cases」各13真DOM/codec與受控分層案例：off相容／explicit units／invalid零encode／PNG S/S-1／JPEG-WebP重試／設定失效／URL前逾時與fallback組合不假稱超標／fallback一次／取消A2-B-owner／clear reset／320px与200%text／resource timing與API counts。非完整Network封包/Storage稽核。

實際I800原生filechooser、JPEG200kB与WebP200KiB下載精確bytes/800×600；JPEG原生再選解碼，WebP自然尺寸/落盤檔頭與獨立檔案解碼。Cua DOM proxy不開放input.files的WebP瀏覽器檔案对象重讀列NOT_RUN，不改WebP-input gate/擴權。語言導航清source/result/target草稿。完整zoom／AT／真機／GC／其它引擎等人工例外保留；新版尚待主代理與live/外驗。

---

# 圖片縮放驗收

這是規格，尚未實作。下表全部待驗證，不能以文件完成或單元測試通過取代瀏覽器驗收。A=Node 純函式；B=瀏覽器。

合成資料：T01 建立 `test/fixtures/image-builders.mjs`，以 Node Buffer 產生最小 PNG chunk／JPEG SOF header 測解析器，不把不完整 header 當真圖片。瀏覽器合成器用 Canvas 填四色象限、尺寸 2400×1600、透明矩形，toBlob 產生 PNG/JPEG；EXIF fixture 在 Canvas JPEG SOI 後插入自行建立的 APP1 Exif TIFF orientation tag，產生 1–8 八方向。fixture 全為幾何圖形；檔名惡意文字以 File 建構，不讀私人圖片。

| ID | 類型／需求 | 輸入或步驟 | 明確預期 |
|---|---|---|---|
| IM-01 | A FR-04 | 2400×1600、long-edge 1920 | 1920×1280 |
| IM-02 | A FR-04 | 100×33、width 50 | 50×17 |
| IM-03 | A FR-04 | 1×100、height 1 | 1×1，不出 0 邊 |
| IM-04 | A FR-04 | 100×100、width 101；空字串；1e3；1.5 | 全部 SIZE_INVALID |
| IM-05 | A FR-02 | header 4000×3000；4001×3000 | 前者通過 12MP；後者 IMAGE_TOO_LARGE |
| IM-06 | A FR-01 | 10,485,760 bytes 與 +1 bytes | 前者可進檔頭檢查，後者 FILE_TOO_LARGE 且不解碼 |
| IM-07 | A FR-01、FR-02 | 空；GIF magic 偽裝 .jpg；PNG 有 acTL；截斷 segment | 分別 EMPTY_FILE、FORMAT_UNSUPPORTED、FORMAT_UNSUPPORTED、IMAGE_CORRUPT |
| IM-08 | A FR-05 | 品質 85；0；101；NaN | 0.85；其餘全部 QUALITY_INVALID |
| IM-09 | B FR-03 | 四色圖 EXIF orientation 1–8 | 每張角落標記與方向參考一致；5–8 寬高交換，沒有重複旋轉 |
| IM-10 | B FR-06 | 半透明／全透明 PNG 原尺寸匯出 PNG | 透明區 alpha=0；不含棋盤格；不要求有損像素完全相同 |
| IM-11 | B FR-06 | 同圖匯出 JPEG | 透明區中心 RGB 每通道 ≥250，alpha=255；.jpg 且 MIME=image/jpeg |
| IM-12 | A+B FR-08 | mock WebP 回傳 image/png；實測支援探測 | .png、顯示 fallback；不出內容 PNG 名稱 .webp |
| IM-13 | B FR-07 | 產生完成後改寬度 | 舊下載立即失效，再產生才出新結果 |
| IM-14 | A+B FR-10 | 延迟編碼回覆 A，取消後開始 B，A 最晚完成 | A 不覆蓋 B、不建新 URL；取消後無過期下載 |
| IM-15 | B FR-09、FR-10 | 連續選圖／清除 10 次 | 頁面無殘留來源、結果、input 值或 URL 引用；記憶體無持續線性增長，不要求 GC 立即歸零 |
| IM-16 | B FR-09 | 載入後開 Network，選檔、產生、下載、清除 | 無任何內容上傳、外部請求、瀏覽器儲存寫入；只允許初次同源靜態資源 |
| IM-17 | B FR-11 | File 名為 `<img src=x onerror=alert(1)>.png` | 字面文字顯示，無元素建立／執行；輸出 image-WxH.png |
| IM-18 | B FR-12 | mock toBlob(null)、createImageBitmap rejection | 固定錯誤提示、無下載，可重新選檔 |
| IM-19 | B 全介面 | 僅鍵盤完成選檔到下載；320px；200% | 焦點可見，無頁面水平捲動，所有設定／錯誤可達 |
| IM-20 | B FR-01 | 同時拖入兩張與 URL 文字 | 全部拒絕 MULTIPLE_FILES／FORMAT_UNSUPPORTED，不發 URL fetch |

記錄每個案例 pass/fail/not-run、日期、瀏覽器完整版本、裝置概況及證據至 `docs/TEST-RESULTS.md`；不包含私人檔案或檔名。對比與螢幕閱讀器驗收另列實際結果。Chrome、Edge、Firefox、Safari 是否列支援，只依現場實測；沒測的寫未驗證。


---

## 原文件 TASKS.md

# 圖片縮放實作任務

## U09-TARGET-SIZE-UI-20261013 — 主代理放行後本輪唯一里程碑

- core fixed gate由主代理逐41hash／36測試與分層native证據驗收為PASS_WITH_DOCUMENTED_NOT_RUN；core限有證據整合缺陷修正，原header/dimensions/output不改。
- 使用者工作：在自己指定尺寸／格式下符合上傳表單容量；Product App沿既有tokens/system fonts，來源／實際結果為主。桌面 `[來源/結果canvas][尺寸/格式/起始品質/容量checkbox+數字+單位/產生或取消]`；compact依序canvas→設定→actual bytes結果，不隐藏错误。
- 規格沿OUTCOME完整約定；target預設off/blank/kB，disabled invalid零encode，更新全部設定立即失效URL；成功actual bytes/dims/MIME/quality/次數；失敗actual minimum與建議、沒有下載；取消清除仍有既定責任。
- allowed：app/兩語HTML/locales/CSS、focused UI/controller測試、相關產品/技術/驗收/UX-SEO/README/HANDOFF與公開發布說明。專用證據與reviewed publishing copy可用；不動root index／其他工具／首頁／token或deploy，不再委派。
- gate：兩語真產品流程與至少JPEG/WebP原生落盤重讀、相關Node/check/preview及release/verify；保留來源oracle可信443040、哈希明確的native core重用範圍與人工NOT_RUN。最後正常PUBLIC固定commit、逐Gitblob ZIP/manifest，交回寫入權待主代理上線／外驗，不自行交整批完成。

## U09-TARGET-SIZE-GATE-20261013 — 本輪唯一里程碑

- 依完整OUTCOME-UPGRADE-2026-10-13最上方最終產品決策：kB/KiB/bytes精確parser、有限品質候選、12次／30秒、取消500ms真量測與owner隔離。關閉target沿原單次編碼；PNG一次，WebP→PNG停止搜尋。
- 只改該規格列出的target-size core、image-session、focused Node/browser tests與gate交接文件。產品app/HTML/CSS、dimensions/header/output、依賴、GitHub副本、首頁、正式部署與憑證不在此里程碑寫入權內。
- 驗收：原測試＋新增parser/session gate，既有443040組oracle、check/build；真800×600 JPEG/WebP至少2attempt、4000×2000/q99/target1有界失敗、PNG exact邊界、真30秒deadline、取消/晚回覆資源隔離、原EXIF1–8／透明／白底與生命週期。實際codec、明示延遲callback與fake adapter分開記錄。
- 完成只交READY_FOR_PRIMARY_GATE並釋放寫入權；不自行推進UI、不公開spike或部署。專用證據.runs/09-image-resizer-outcome-2026-10-13。Node24／前後完整persistent environment比對；必要native gate失敗交具體測量，不放寬門檻。

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。一次一項；依序完成，驗收失敗停在當項。每項開始讀 [HANDOFF](HANDOFF.md)，結束記錄變更、命令、實際結果、未測與下一項。下列 allowed paths 均以本專案根為準，不授權修改其他專案。

## T00 — 建立可檢查的空骨架

- 前置：依 AGENTS.md 完成本任務所需文件閱讀；確認 Node 24+。不安裝套件。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 建立 ESM/private package 與四命令：dev=`node scripts/serve.mjs`，test=`node --test`，check=`node scripts/check.mjs`，build=`node scripts/build.mjs`。dev 只綁 127.0.0.1:4173／只提供 public；build 只複製 public 至 dist。check 需實作語法／必要檔／外部資源與危險 DOM 檢查，不可永遠成功。先建真實初始畫面，不能放可用功能假按鈕。
- 驗收：本項建立腳本後才執行 `npm test`、`npm run check`、`npm run build`、`npm run dev`；人工確認 loopback 與 noindex，再停止伺服器。dist 只允許 build 產生，不手改。
- 完成：命令存在且有效、未加入 runtime dependency，回寫 HANDOFF；否則停。

## T01 — 圖片格式與瀏覽器能力閘門

- 前置：T00 完成。
- allowed paths：`scripts/serve-fixtures.mjs`、`public/js/core/image-header.mjs`、`test/image-header.test.mjs`、`test/fixtures/image-builders.mjs`、`test/browser-fixtures.html`、`test/browser-fixtures.mjs`、`docs/COMPATIBILITY.md`、`HANDOFF.md`。
- 實作有界 PNG/JPEG 尺寸解析和假圖產生器，查官方格式資料並記錄。建立 fixture server，只綁 127.0.0.1:4174、只供 test/、拒絕路徑穿越／父目錄／目錄清單、不進 build。由合成器頁驗證 createImageBitmap EXIF 1–8、Canvas PNG/JPEG、WebP MIME 探測。將不能保真方向的瀏覽器列不支援，不加入新解碼套件。
- 驗收：`node --test test/image-header.test.mjs`、`npm run check`；建完腳本後執行 `node scripts/serve-fixtures.mjs`，開 `/browser-fixtures.html` 人工 IM-09/10/11/12 記錄能力證據，測後停止 fixture server；這時僅驗 API、不是產品通過。
- 完成：至少一個桌面瀏覽器八方向與 PNG/JPEG 通過，所有 malformed header 測試通過；否則停止本案。回寫 HANDOFF。

## T02 — 純邏輯與工作生命週期

- 前置：T01 完成。
- allowed paths：`public/js/core/dimensions.mjs`、`public/js/core/output.mjs`、`public/js/image-session.mjs`、`test/dimensions.test.mjs`、`test/output.test.mjs`、`test/session.test.mjs`、`HANDOFF.md`。
- 實作 TECHNICAL 函式與可注入 decoder/encoder 的控制器；jobId、取消、URL／bitmap 清理可獨立測試。處理幾何上限、品質、真實 MIME、副檔名。
- 驗收：`npm test`、`npm run check`；IM-01–08、12、14 的 A 部分通過。
- 完成：無實際圖片的單元測試可離線重跑；回寫 HANDOFF。

## T03 — 完整單圖操作

- 前置：T02 完成。
- allowed paths：`public/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/image-session.mjs`、`test/session.test.mjs`、`docs/TEST-RESULTS.md`、`HANDOFF.md`。
- 依 UX 線框接選檔、設定、預覽、編碼、取消與下載。顯示實際結果，不把來源圖偽裝成輸出。以 textContent 顯示檔名，錯誤不洩漏例外。
- 驗收：`npm test`、`npm run check`、`npm run dev` 後人工 IM-09–15、17–20，完成就停止 dev。
- 完成：主要工作鍵盤可操作、晚到結果不覆蓋；回寫 HANDOFF。

## T04 — 說明、SEO 與完整驗收

- 前置：T03 完成。
- allowed paths：`public/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/image-session.mjs`、`test/session.test.mjs`、`docs/TEST-RESULTS.md`、`docs/COMPATIBILITY.md`、`HANDOFF.md`。
- 加靜態說明與 FAQ，保留 noindex、不設虛構 canonical。檢查 Network、清除與尺寸邊界、320px、200%、對比與焦點。
- 驗收：`npm test`、`npm run check`、`npm run build`、`npm run dev`；全 ACCEPTANCE 逐項記錄後停止 dev。其他模組若有失敗，退回該模組任務修復，不能越權擴 allowed paths。
- 完成：全部必要案例通過，未測瀏覽器誠實標記，diff 限允許路徑，HANDOFF 記為「本機實作驗收完成；未發布」。不得將上架當作本項。

## 2026-10-10 入口範圍補充

依 TASK-ENTRY.md，dev/fixture 預設改為 4189/5189；占用可記錄並回退系統分配 loopback 埠。保留既定 T00–T04 前置／驗收，每項完成後繼續。

### T03 補充 — 真實瀏覽器產品回歸 harness

- 前置：T02 通過。
- 額外 allowed paths：scripts/prepare-browser-tests.mjs、test/product-tests.html、test/product-tests.mjs、test/product-fixture/**（script 生成，不手改）。
- 只用合成圖，fixture server 同源載入 public 的測試副本，以產品 DOM 事件驗证方向／alpha／白底／失效／取消／清除／惡意檔名／錯誤／拖放／網路與儲存。生成的 test/product-fixture 副本與合成圖片產物不進 build／公開發布；測試 harness／合成器原始碼是必要離線驗收來源，可列入 reviewed publishing allowlist，絕不作靜態網站資產。
- 真實瀏覽器產物和 mock 的錯誤／延遲分开標記；不能用 harness 替代必要編解碼可行性 gate。

## T05 — 完整雙語及發布候選工具鏈

- 前置：T04 完成。
- allowed paths：public/**、scripts/**、test/**、docs/**、TASKS.md、HANDOFF.md、README.md、project.json、package.json、.gitignore、wrangler.jsonc；dist/** 僅由 build 生成。
- 繁中 index.html／英文 en/index.html、完整動態文案與靜態說明／FAQ、同語首頁、雙向語言切換。
- 預設 preview noindex；明示 release build 只接受候選 https://images.glossquote.com，產生 canonical、hreflang（zh-Hant/en/x-default）、sitemap、robots、404 與 Cloudflare 靜態 headers；準備免費靜態 Worker 設定，不讀憑證／不部署。
- 驗收：npm.cmd test、check、preview build、release build、release 產物驗證；雙語真實瀏覽器功能／320px／200% 記錄；明確人工 NOT_RUN 可保留。
- reviewed publishing copy 只允許本工具必要來源與說明，發布 KYStr/glossquote-labs-image-resizer，驗證 PUBLIC/remote HEAD；本機、公開來源與網站上線分開記錄。
- 完成：docs/RELEASE-CANDIDATE.md 與 HANDOFF READY_FOR_INTEGRATION；不得改共享首頁／DNS／其他工具或正式部署。整合對話另行驗收／部署。

### T03 harness 配套範圍（2026-10-10）

package.json 的 test 改為 node --test test/*.test.mjs，保留全部邏輯測試，避免 Node 把 browser-only 靜態測試副本當 Node 程式執行；不是刪除測試或放寬 gate。T00 owning paths scripts/serve.mjs 只加可注入 CSP 給 fixture 的 frame-src self；產品仍 connect-src none／預設不允許 iframe；T01 scripts/serve-fixtures.mjs 加相同配套。

## GQ-01-REPAIR-20261012 — 精確半像素四捨五入修復

- 前置：核對外部 GQ-01 與固定公開來源 c707845298011f039f6f21c1a0efd0139986e9e6。外部 patch／scripts 只作待審查資料，不直接執行。
- 交付：修復先除後乘造成的精確半像素向下誤差，保留 deriveDimensions API、三模式、1px 下限、不放大、8192/12MP 輸入與4000/8MP 輸出；不改 UI、格式、安全 gate 或依賴。
- allowed paths：public/js/core/dimensions.mjs；test/ 必要回歸；scripts/ 必要離線 oracle；docs/GQ-01-REPAIR-2026-10-12.md、HANDOFF.md、docs/RELEASE-CANDIDATE.md、TASKS.md、發布 manifest；dist/** 僅由既有 build 生成；專用 .runs/image-resizer/gq01-20261012/** 與既有 reviewed publishing copy。
- 驗收：變更前新增八組固定回歸必須復現失敗；修復後原14＋新8全部通過；BigInt 商／餘數 oracle 對width,height 1..64、三模式、全部不放大正整數目標，共443040组零不符；npm.cmd test、npm.cmd run check、npm.cmd run build -- --release --site=https://images.glossquote.com、npm.cmd run verify:release；前後 persistent-environment guard 完整 snapshots 不變。
- 發布：既有 PUBLIC GitHub 的單獨修復 commit、remote HEAD/API SHA/manifest 核對；正式部署、真實瀏覽器 PNG/JPEG/WebP 尺寸與最終外部验收由原主對話負責。既有人工 NOT_RUN 保留；此對話不標全產品 PASS。
- 停止：修復後必要 gate FAIL、他人同時改 owned files、環境漂移、新權限／依賴／費用或同問題兩輪無新證據。只停受影響步驟，不另派代理或推進其他 milestone。

